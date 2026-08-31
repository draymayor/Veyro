import * as bitcoin from "bitcoinjs-lib";
import { BIP32Factory, BIP32Interface } from "bip32";
import { ECPairFactory } from "ecpair";
import * as ecc from "tiny-secp256k1";
import { ChainAdapter, DepositAddress, SweepResult } from "./types";

bitcoin.initEccLib(ecc);
const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

export interface Utxo {
  txid: string;
  vout: number;
  value: number; // satoshis
  script: string; // hex
}

/**
 * Thin abstraction over whatever blockchain data provider actually supplies
 * UTXOs/fee estimates/broadcast for a given UTXO chain - deliberately not
 * hardcoded to one HTTP client here, so BTC/LTC/DOGE can each plug in their
 * real provider (Tatum's UTXO endpoints) without touching signing logic.
 * MUST be implemented and tested against a real testnet before this adapter
 * is used for anything but a dry run.
 */
export interface UtxoProvider {
  getUtxos(address: string): Promise<Utxo[]>;
  getFeeRateSatsPerByte(): Promise<number>;
  broadcastTx(txHex: string): Promise<string>;
  /**
   * Full raw transaction hex for `txid`, needed as a legacy (P2PKH) input's
   * `nonWitnessUtxo` - BIP174 requires the whole previous transaction for
   * non-segwit inputs, not just its output script/value (`witnessUtxo`,
   * which is only valid for segwit inputs and would sign a legacy P2PKH
   * output as if it were witness-programmed, producing an invalid
   * transaction).
   */
  getRawTxHex(txid: string): Promise<string>;
}

export type UtxoAddressType = "p2wpkh" | "p2pkh";

export interface UtxoNetworkParams {
  network: bitcoin.networks.Network;
  /** Whether this chain's transfer() needs a nonstandard SIGHASH (reserved for a future fork-flag chain; none currently active). */
  sighashForkId: boolean;
  /**
   * Address/script type this chain's deposit addresses actually use.
   * Dogecoin does not support SegWit, so it MUST use legacy P2PKH; BTC and
   * LTC use native SegWit P2WPKH.
   */
  addressType: UtxoAddressType;
}

export const BITCOIN_PARAMS: UtxoNetworkParams = {
  network: bitcoin.networks.bitcoin,
  sighashForkId: false,
  addressType: "p2wpkh",
};

export const LITECOIN_PARAMS: UtxoNetworkParams = {
  network: {
    messagePrefix: "\x19Litecoin Signed Message:\n",
    bech32: "ltc",
    bip32: { public: 0x019da462, private: 0x019d9cfe },
    pubKeyHash: 0x30,
    scriptHash: 0x32,
    wif: 0xb0,
  },
  sighashForkId: false,
  addressType: "p2wpkh",
};

// Dogecoin has no native SegWit/bech32 support (see the empty `bech32`
// field below) - its deposit addresses must be legacy P2PKH.
export const DOGECOIN_PARAMS: UtxoNetworkParams = {
  network: {
    messagePrefix: "\x19Dogecoin Signed Message:\n",
    bech32: "", // Dogecoin has no native segwit/bech32 support
    bip32: { public: 0x02facafd, private: 0x02fac398 },
    pubKeyHash: 0x1e,
    scriptHash: 0x16,
    wif: 0x9e,
  },
  sighashForkId: false,
  addressType: "p2pkh",
};

const SIGHASH_FORKID = 0x40;

export class UtxoAdapter implements ChainAdapter {
  constructor(
    private readonly params: UtxoNetworkParams,
    private readonly masterSeedHex: string,
    private readonly provider: UtxoProvider,
  ) {}

  private deriveNode(index: number): BIP32Interface {
    const root = bip32.fromSeed(
      Buffer.from(this.masterSeedHex, "hex"),
      this.params.network,
    );
    return root.derivePath(`m/44'/0'/0'/0/${index}`);
  }

  private addressFor(node: BIP32Interface): string {
    const { address } =
      this.params.addressType === "p2pkh"
        ? bitcoin.payments.p2pkh({
            pubkey: node.publicKey,
            network: this.params.network,
          })
        : bitcoin.payments.p2wpkh({
            pubkey: node.publicKey,
            network: this.params.network,
          });
    if (!address) throw new Error("Failed to derive address");
    return address;
  }

  async getBalance(address: string, _symbol: string): Promise<number> {
    const utxos = await this.provider.getUtxos(address);
    return utxos.reduce((sum, u) => sum + u.value, 0) / 1e8;
  }

  async sweep(
    deposit: DepositAddress,
    _symbol: string,
    toAddress: string,
  ): Promise<SweepResult | null> {
    if (deposit.derivationIndex === null) {
      throw new Error(
        `UTXO sweep requires a derivation index (got null for ${deposit.address})`,
      );
    }

    const node = this.deriveNode(deposit.derivationIndex);
    const utxos = await this.provider.getUtxos(deposit.address);
    if (utxos.length === 0) return null;

    const totalValue = utxos.reduce((sum, u) => sum + u.value, 0);
    const feeRate = await this.provider.getFeeRateSatsPerByte();
    // Rough vbyte estimate for a single-output (sweep-to-consolidation)
    // transaction - conservative, not a byte-exact estimate; verify on
    // testnet. Legacy P2PKH inputs/outputs are full-weight (no witness
    // discount), so they cost roughly double a P2WPKH input/output.
    const [inputVbytes, outputVbytes] =
      this.params.addressType === "p2pkh" ? [148, 34] : [68, 31];
    const estimatedVbytes = utxos.length * inputVbytes + outputVbytes + 10;
    const fee = Math.ceil(estimatedVbytes * feeRate);

    if (totalValue <= fee) return null;
    const sendValue = totalValue - fee;

    const psbt = new bitcoin.Psbt({ network: this.params.network });
    for (const utxo of utxos) {
      if (this.params.addressType === "p2pkh") {
        const rawTxHex = await this.provider.getRawTxHex(utxo.txid);
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          nonWitnessUtxo: Buffer.from(rawTxHex, "hex"),
        });
      } else {
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: {
            script: Buffer.from(utxo.script, "hex"),
            value: utxo.value,
          },
        });
      }
    }
    psbt.addOutput({ address: toAddress, value: sendValue });

    const keyPair = ECPair.fromPrivateKey(node.privateKey!);
    for (let i = 0; i < utxos.length; i++) {
      psbt.signInput(
        i,
        keyPair,
        this.params.sighashForkId
          ? [bitcoin.Transaction.SIGHASH_ALL | SIGHASH_FORKID]
          : undefined,
      );
    }
    psbt.finalizeAllInputs();

    const txHex = psbt.extractTransaction().toHex();
    const txHash = await this.provider.broadcastTx(txHex);

    return {
      txHash,
      amountSwept: sendValue / 1e8,
      feeEstimate: fee / 1e8,
    };
  }
}

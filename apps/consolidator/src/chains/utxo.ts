import * as bitcoin from "bitcoinjs-lib";
import { BIP32Factory, BIP32Interface } from "bip32";
import { ECPairFactory } from "ecpair";
import * as ecc from "tiny-secp256k1";
import { Mnemonic } from "ethers";
import { PayoutAdapter, PayoutResult } from "./types";

bitcoin.initEccLib(ecc);
const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

export interface Utxo {
  txid: string;
  vout: number;
  value: number; // satoshis
  script: string; // hex
}

/** Same shape as apps/sweeper's UtxoProvider - pure data-fetching, chain-agnostic. */
export interface UtxoProvider {
  getUtxos(address: string): Promise<Utxo[]>;
  getFeeRateSatsPerByte(): Promise<number>;
  broadcastTx(txHex: string): Promise<string>;
  getRawTxHex(txid: string): Promise<string>;
}

export type UtxoAddressType = "p2wpkh" | "p2pkh";

export interface UtxoNetworkParams {
  network: bitcoin.networks.Network;
  addressType: UtxoAddressType;
  /**
   * CONFIRMED (2026-09-01) fixed derivation path for this chain's ONE
   * consolidation wallet address, verified against the real address stored
   * in consolidation_wallets by
   * apps/sweeper/scripts/verify-consolidator-derivation.js. A single
   * index (0), never a range - do not re-derive, guess, or "try adjacent
   * indices" (see scripts/gcp/bootstrap-consolidator-iam.sh's header).
   */
  derivationPath: string;
}

export const BITCOIN_PARAMS: UtxoNetworkParams = {
  network: bitcoin.networks.bitcoin,
  addressType: "p2wpkh",
  derivationPath: "m/84'/0'/0'/0/0",
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
  addressType: "p2wpkh",
  derivationPath: "m/84'/2'/0'/0/0",
};

// Dogecoin has no native SegWit/bech32 support - legacy P2PKH only.
export const DOGECOIN_PARAMS: UtxoNetworkParams = {
  network: {
    messagePrefix: "\x19Dogecoin Signed Message:\n",
    bech32: "",
    bip32: { public: 0x02facafd, private: 0x02fac398 },
    pubKeyHash: 0x1e,
    scriptHash: 0x16,
    wif: 0x9e,
  },
  addressType: "p2pkh",
  derivationPath: "m/44'/3'/0'/0/0",
};

// A change output cheaper to include than to ever spend later is folded
// into the fee instead of created - generic heuristic (3x its own future
// spend cost), not a chain-specific dust rule. Verify against each chain's
// actual relay-dust policy on testnet before production use, per
// apps/sweeper/README.md's "Verifying before production" discipline.
const DUST_MULTIPLE = 3;

export class UtxoConsolidatorAdapter implements PayoutAdapter {
  private readonly node: BIP32Interface;
  readonly fromAddress: string;

  constructor(
    private readonly params: UtxoNetworkParams,
    masterSeedMnemonic: string,
    private readonly provider: UtxoProvider,
  ) {
    const seedHex = Mnemonic.fromPhrase(masterSeedMnemonic)
      .computeSeed()
      .slice(2);
    const root = bip32.fromSeed(Buffer.from(seedHex, "hex"), params.network);
    this.node = root.derivePath(params.derivationPath);
    this.fromAddress = this.addressFor(this.node);
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
    if (!address)
      throw new Error("Failed to derive consolidation wallet address");
    return address;
  }

  async payout(
    _symbol: string,
    amount: number,
    toAddress: string,
  ): Promise<PayoutResult> {
    const amountSats = Math.round(amount * 1e8);
    const utxos = await this.provider.getUtxos(this.fromAddress);
    const feeRate = await this.provider.getFeeRateSatsPerByte();

    const [inputVbytes, outputVbytes] =
      this.params.addressType === "p2pkh" ? [148, 34] : [68, 31];

    // Coin selection: accumulate UTXOs (largest fee coverage first isn't
    // required for correctness here, so simple in-order accumulation) until
    // enough is selected to cover amount + fee for that many inputs plus 2
    // outputs (destination + change). Recomputed each iteration since fee
    // grows with input count.
    const selected: Utxo[] = [];
    let selectedSum = 0;
    let fee = 0;
    for (const utxo of utxos) {
      selected.push(utxo);
      selectedSum += utxo.value;
      const vbytes = selected.length * inputVbytes + 2 * outputVbytes + 10;
      fee = Math.ceil(vbytes * feeRate);
      if (selectedSum >= amountSats + fee) break;
    }

    if (selectedSum < amountSats + fee) {
      return {
        ok: false,
        reason: "insufficient_consolidation_balance",
        message: `Consolidation wallet ${this.fromAddress} holds ${selectedSum} sats across ${utxos.length} UTXO(s), needs ${amountSats + fee} (amount ${amountSats} + estimated fee ${fee}) to pay out ${amountSats} sats.`,
        feeEstimate: fee / 1e8,
      };
    }

    const changeVbytesFee = outputVbytes * feeRate;
    let change = selectedSum - amountSats - fee;
    let includeChange = true;
    if (change < DUST_MULTIPLE * changeVbytesFee) {
      // Fold the would-be dust change into the fee instead of creating an
      // output nobody could ever economically spend.
      fee += change;
      change = 0;
      includeChange = false;
    }

    const psbt = new bitcoin.Psbt({ network: this.params.network });
    for (const utxo of selected) {
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

    psbt.addOutput({ address: toAddress, value: amountSats });
    if (includeChange) {
      psbt.addOutput({ address: this.fromAddress, value: change });
    }

    const keyPair = ECPair.fromPrivateKey(this.node.privateKey!);
    for (let i = 0; i < selected.length; i++) {
      psbt.signInput(i, keyPair);
    }
    psbt.finalizeAllInputs();

    const txHex = psbt.extractTransaction().toHex();
    const txHash = await this.provider.broadcastTx(txHex);

    return { ok: true, txHash, feeEstimate: fee / 1e8 };
  }
}

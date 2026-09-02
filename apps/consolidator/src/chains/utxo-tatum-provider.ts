import * as bitcoin from "bitcoinjs-lib";
import { UtxoProvider, Utxo } from "./utxo";

const TATUM_BASE_URL = "https://api.tatum.io/v3";

// bitcoinjs-lib network params, needed only to derive the (deterministic,
// address-fixed) scriptPubKey for witnessUtxo - see getUtxos() below.
// Duplicated from ./utxo's BITCOIN_PARAMS/LITECOIN_PARAMS rather than
// imported, to keep this file's chain knowledge self-contained by Tatum
// chain slug rather than by UtxoNetworkParams.
const NETWORKS: Record<string, bitcoin.networks.Network> = {
  bitcoin: bitcoin.networks.bitcoin,
  litecoin: {
    messagePrefix: "\x19Litecoin Signed Message:\n",
    bech32: "ltc",
    bip32: { public: 0x019da462, private: 0x019d9cfe },
    pubKeyHash: 0x30,
    scriptHash: 0x32,
    wif: 0xb0,
  },
};

// The chain slug Tatum's `/v3/data/utxos` endpoint expects differs from the
// slug used by the other (legacy per-chain) v3 endpoints below - notably
// "doge", not "dogecoin".
const DATA_API_CHAIN: Record<string, string> = {
  bitcoin: "bitcoin",
  litecoin: "litecoin",
  dogecoin: "doge",
};

// `/v3/blockchain/fee/{chain}` takes a ticker (BTC/LTC/DOGE), not the chain
// name used elsewhere in this file - confirmed against Tatum's current fee
// estimation docs.
const FEE_API_CHAIN: Record<string, string> = {
  bitcoin: "BTC",
  litecoin: "LTC",
  dogecoin: "DOGE",
};

// `totalValue` is a required query param on `/v3/data/utxos` ("return UTXOs
// sufficient to cover this total"). Both callers of getUtxos() here (full
// coin-selection accumulation, full-balance sweep) need every UTXO for the
// address, not a partial set, so this is set to Tatum's own maximum
// accepted value (confirmed live: values above this are rejected with
// "totalValue must not be greater than 200000000000") to make the
// "sufficient to cover" set equal to "everything there is". That ceiling
// is many orders of magnitude above any balance a single consolidation
// wallet address will ever realistically hold, so it's still comfortably
// an "everything" request in practice.
const UNREACHABLE_TOTAL_VALUE = 200000000000;

/**
 * Tatum-backed UtxoProvider - identical to apps/sweeper's
 * src/chains/utxo-tatum-provider.ts (this is pure data-fetching, not
 * signing, so duplicating it is just for deployable-independence, not a
 * behavioral change).
 */
export class TatumUtxoProvider implements UtxoProvider {
  constructor(
    private readonly tatumChain: string,
    private readonly apiKey: string,
  ) {}

  private headers() {
    return { "x-api-key": this.apiKey };
  }

  async getUtxos(address: string): Promise<Utxo[]> {
    const dataApiChain = DATA_API_CHAIN[this.tatumChain] ?? this.tatumChain;
    const res = await fetch(
      `${TATUM_BASE_URL}/data/utxos?chain=${dataApiChain}&address=${address}&totalValue=${UNREACHABLE_TOTAL_VALUE}`,
      { headers: this.headers() },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Tatum UTXO fetch failed for ${address}: ${res.status} ${body}`,
      );
    }
    const data = (await res.json()) as Array<{
      txHash: string;
      index: number;
      value: number;
    }>;
    // `/v3/data/utxos` doesn't return a scriptPubKey (unlike the old
    // per-chain UTXO endpoint this replaces). Every UTXO here belongs to
    // the same `address`, so for SegWit chains it's derived once locally
    // instead; legacy (P2PKH) chains never read `.script` (they sign via
    // nonWitnessUtxo from getRawTxHex instead), so an empty string there is
    // harmless.
    const network = NETWORKS[this.tatumChain];
    const script = network
      ? bitcoin.address.toOutputScript(address, network).toString("hex")
      : "";
    return data.map((u) => ({
      txid: u.txHash,
      vout: u.index,
      value: Math.round(u.value * 1e8),
      script,
    }));
  }

  async getFeeRateSatsPerByte(): Promise<number> {
    const feeApiChain = FEE_API_CHAIN[this.tatumChain] ?? this.tatumChain;
    const res = await fetch(`${TATUM_BASE_URL}/blockchain/fee/${feeApiChain}`, {
      headers: this.headers(),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Tatum fee estimate failed: ${res.status} ${body}`);
    }
    const data = (await res.json()) as { fast?: number; medium?: number };
    return data.medium ?? data.fast ?? 10;
  }

  async getRawTxHex(txid: string): Promise<string> {
    const res = await fetch(
      `${TATUM_BASE_URL}/${this.tatumChain}/transaction/${txid}`,
      { headers: this.headers() },
    );
    if (!res.ok) {
      throw new Error(`Tatum raw tx fetch failed for ${txid}: ${res.status}`);
    }
    const data = (await res.json()) as { hex?: string };
    if (!data.hex) {
      throw new Error(`Tatum raw tx response for ${txid} had no hex field`);
    }
    return data.hex;
  }

  async broadcastTx(txHex: string): Promise<string> {
    const res = await fetch(`${TATUM_BASE_URL}/${this.tatumChain}/broadcast`, {
      method: "POST",
      headers: { ...this.headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ txData: txHex }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Tatum broadcast failed: ${res.status} ${body}`);
    }
    const data = (await res.json()) as { txId: string };
    return data.txId;
  }
}

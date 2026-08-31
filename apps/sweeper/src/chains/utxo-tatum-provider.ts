import { UtxoProvider, Utxo } from "./utxo";

const TATUM_BASE_URL = "https://api.tatum.io/v3";

/**
 * Tatum-backed UtxoProvider, following the same thin-fetch-wrapper pattern
 * as apps/api/src/crypto-addresses/tatum.service.ts.
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
    const res = await fetch(
      `${TATUM_BASE_URL}/${this.tatumChain}/utxo/address/${address}`,
      { headers: this.headers() },
    );
    if (!res.ok) {
      throw new Error(`Tatum UTXO fetch failed for ${address}: ${res.status}`);
    }
    const data = (await res.json()) as Array<{
      txHash: string;
      index: number;
      value: number;
      script: string;
    }>;
    return data.map((u) => ({
      txid: u.txHash,
      vout: u.index,
      value: Math.round(u.value * 1e8),
      script: u.script,
    }));
  }

  async getFeeRateSatsPerByte(): Promise<number> {
    const res = await fetch(
      `${TATUM_BASE_URL}/blockchain/fee/${this.tatumChain}`,
      {
        headers: this.headers(),
      },
    );
    if (!res.ok) {
      throw new Error(`Tatum fee estimate failed: ${res.status}`);
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

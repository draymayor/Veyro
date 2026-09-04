import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithTimeout } from '../common/fetch-with-timeout';

const TATUM_BASE_URL = 'https://api.tatum.io/v3';
const REQUEST_TIMEOUT_MS = 10_000;

export interface TransactionLookup {
  found: boolean;
  blockNumber: number | null;
}

/**
 * Read-only chain-data lookups for the confirmation-depth poller and the
 * reorg-reversal check (Piece 3) - never signs or broadcasts anything,
 * same safe-by-construction posture as check-evm-balance.ts. Separate
 * from TatumService (address generation + webhook subscriptions) since
 * this is a genuinely different concern: reading chain state for
 * transactions that already exist, not creating addresses/subscriptions.
 */
@Injectable()
export class TatumChainDataService {
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('TATUM_API_KEY');
  }

  /**
   * Works for both UTXO and account-model chains: Tatum's v3
   * GET /{chain}/transaction/{txId} returns blockNumber for every chain
   * this codebase uses (verified directly for bitcoin and tron; the EVM
   * chains follow the identical documented REST shape). A 404 means the
   * transaction genuinely doesn't exist (found: false) - the actual
   * reorg signal when this was previously found with a blockNumber.
   */
  async getTransaction(
    tatumChain: string,
    txHash: string,
  ): Promise<TransactionLookup> {
    const res = await fetchWithTimeout(
      `${TATUM_BASE_URL}/${tatumChain}/transaction/${txHash}`,
      { headers: { 'x-api-key': this.apiKey } },
      REQUEST_TIMEOUT_MS,
    );

    if (res.status === 404) return { found: false, blockNumber: null };
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(
        `Tatum transaction lookup failed for ${tatumChain} tx ${txHash}: ${res.status} ${body}`,
      );
    }

    const data = (await res.json()) as { blockNumber?: number };
    return { found: true, blockNumber: data.blockNumber ?? null };
  }

  /**
   * UTXO chains only (BTC/LTC/DOGE). Confirmations here come from
   * Tatum's own node via the getblock JSON-RPC method (a real
   * `confirmations` field it computes server-side), not from us manually
   * subtracting block heights - more precise, and avoids an off-by-one
   * class of bug entirely. Verified directly against
   * docs.tatum.io/docs/utxo-get-confirmations-from-a-transaction:
   * transaction -> blockNumber -> block hash -> gateway getblock RPC.
   */
  async getUtxoConfirmations(
    tatumChain: string,
    blockNumber: number,
  ): Promise<number> {
    const blockHashRes = await fetchWithTimeout(
      `${TATUM_BASE_URL}/${tatumChain}/block/hash/${blockNumber}`,
      { headers: { 'x-api-key': this.apiKey } },
      REQUEST_TIMEOUT_MS,
    );
    if (!blockHashRes.ok) {
      const body = await blockHashRes.text().catch(() => '');
      throw new Error(
        `Tatum block-hash lookup failed for ${tatumChain} block ${blockNumber}: ${blockHashRes.status} ${body}`,
      );
    }
    const { hash } = (await blockHashRes.json()) as { hash: string };

    const rpcRes = await fetchWithTimeout(
      `https://${tatumChain}-mainnet.gateway.tatum.io/`,
      {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getblock',
          params: [hash],
        }),
      },
      REQUEST_TIMEOUT_MS,
    );
    if (!rpcRes.ok) {
      const body = await rpcRes.text().catch(() => '');
      throw new Error(
        `Tatum getblock RPC failed for ${tatumChain} block ${blockNumber}: ${rpcRes.status} ${body}`,
      );
    }
    const { result, error } = (await rpcRes.json()) as {
      result?: { confirmations?: number };
      error?: { message?: string };
    };
    if (error || result?.confirmations == null) {
      throw new Error(
        `Tatum getblock RPC returned no confirmations for ${tatumChain} block ${blockNumber}: ${error?.message ?? 'no result'}`,
      );
    }
    return result.confirmations;
  }

  /**
   * Account-model chains (EVM family + TRON): confirmations = current
   * height - tx's own block + 1. GET /{chain}/block/current is confirmed
   * live for ethereum/avalanche/harmony/one; the TRON path specifically
   * (used for a 'count'-rule chain, TRC20) has NOT yet had a live GET
   * made against it in this session - it's inferred from that otherwise
   * consistent pattern, not independently confirmed. Do a real check
   * before trusting this for TRON specifically.
   */
  async getCurrentBlockNumber(tatumChain: string): Promise<number> {
    const res = await fetchWithTimeout(
      `${TATUM_BASE_URL}/${tatumChain}/block/current`,
      { headers: { 'x-api-key': this.apiKey } },
      REQUEST_TIMEOUT_MS,
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(
        `Tatum current-block lookup failed for ${tatumChain}: ${res.status} ${body}`,
      );
    }
    const data = (await res.json()) as unknown;
    const height = typeof data === 'number' ? data : Number(data);
    if (!Number.isFinite(height)) {
      throw new Error(
        `Tatum current-block lookup for ${tatumChain} returned a non-numeric height: ${JSON.stringify(data)}`,
      );
    }
    return height;
  }

  /**
   * Ethereum mainnet ONLY (see confirmation-requirements.ts's
   * ETHEREUM_FINALIZED). Standard Ethereum JSON-RPC 'finalized' block
   * tag via Tatum's EVM gateway - NOT yet confirmed against a real
   * response in this session (flagged in confirmation-requirements.ts
   * too): this needs one live call proving Tatum's gateway actually
   * honors this tag before the finalized-tag credit path is trusted in
   * production, same "confirm, don't assume" standard as everything else
   * tonight.
   */
  async getFinalizedBlockNumber(tatumChain: string): Promise<number> {
    const res = await fetchWithTimeout(
      `https://${tatumChain}-mainnet.gateway.tatum.io/`,
      {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBlockByNumber',
          params: ['finalized', false],
        }),
      },
      REQUEST_TIMEOUT_MS,
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(
        `Tatum finalized-block lookup failed for ${tatumChain}: ${res.status} ${body}`,
      );
    }
    const { result, error } = (await res.json()) as {
      result?: { number?: string };
      error?: { message?: string };
    };
    if (error || !result?.number) {
      throw new Error(
        `Tatum finalized-block lookup for ${tatumChain} returned no block: ${error?.message ?? 'no result'}`,
      );
    }
    return parseInt(result.number, 16);
  }
}

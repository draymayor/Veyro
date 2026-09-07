import type { UtxoChainConfig } from "../chain-config";
import type { AddressMap } from "../address-map";
import type { DetectionSink } from "./types";

const BLOCKCYPHER_BASE = "https://api.blockcypher.com/v1";
const POLL_INTERVAL_MS = 45_000;
// BlockCypher's free tier is GET-only, 3 req/sec / 100 req/hr, no token
// required for mainnet reads (confirmed live 2026-09-07, both the terms and
// the cap re-confirmed against BlockCypher's current docs). Getting full
// decoded inputs/outputs for a tx needs a SEPARATE per-tx request (the
// block endpoint only returns txids, not embedded tx bodies) - fine for
// Litecoin/Dogecoin's real tx/block counts (tens), but Bitcoin mainnet
// regularly has 3,700-7,300+ tx/block (sampled live 2026-09-07, higher than
// earlier estimated), which would blow through the 100/hr cap in a single
// poll cycle if fetched in full. Rather than silently under-detect without
// saying so, this caps how many tx bodies get fetched per poll and logs
// loudly when a block is truncated - a real, load-bearing limitation of the
// free tier for BTC specifically, not fully solved here.
//
// There's a second, larger problem this cap doesn't address: watchUtxo's
// own height-check poll (GET /{chain}/main every POLL_INTERVAL_MS) runs
// unconditionally for all three chains regardless of deposit activity - at
// 80 requests/hr each, that's ~240/hr combined against a shared 100/hr
// budget (BlockCypher's docs don't disambiguate the cap per chain path, and
// there's no per-chain token to separate it by), before a single block or
// tx-detail request happens. This means LTC/DOGE are also at real risk of
// 429s from baseline polling alone, not just BTC from tx volume. If BTC
// deposit volume (or 429s on LTC/DOGE) ever becomes significant, this needs
// either a paid BlockCypher tier or a different/self-hosted provider - not
// yet decided, see apps/block-watcher/README.md.
const MAX_TX_FETCHES_PER_POLL = 90;

interface ChainInfo {
  height: number;
  hash: string;
}

interface BlockSummary {
  txids: string[];
}

interface TxDetail {
  hash: string;
  outputs: Array<{ value: number; addresses?: string[] }>;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BLOCKCYPHER_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`BlockCypher ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Never resolves under normal operation - polls BlockCypher for new block
 * height (block times are 1-10 minutes on these chains, so polling every
 * 45s is effectively equivalent to push), then checks every output of every
 * transaction in each newly-observed block against the address map. See
 * MAX_TX_FETCHES_PER_POLL's comment for the one real known gap (Bitcoin's
 * tx volume vs. the free tier's request budget).
 */
export async function watchUtxo(
  chain: UtxoChainConfig,
  addressMap: AddressMap,
  sink: DetectionSink,
): Promise<void> {
  let lastHeight: number | null = null;

  for (;;) {
    try {
      const info = await getJson<ChainInfo>(`/${chain.blockcypherChain}/main`);
      if (lastHeight === null) {
        lastHeight = info.height;
      } else if (info.height > lastHeight) {
        for (let h = lastHeight + 1; h <= info.height; h++) {
          await processBlockAtHeight(chain, h, addressMap, sink);
        }
        lastHeight = info.height;
      }
    } catch (err) {
      console.error(`[block-watcher] ${chain.network} poll failed:`, err);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

async function processBlockAtHeight(
  chain: UtxoChainConfig,
  height: number,
  addressMap: AddressMap,
  sink: DetectionSink,
): Promise<void> {
  const block = await getJson<BlockSummary>(
    `/${chain.blockcypherChain}/main/blocks/${height}?limit=500`,
  );

  const txids = block.txids ?? [];
  if (txids.length > MAX_TX_FETCHES_PER_POLL) {
    console.warn(
      `[block-watcher] ${chain.network} block ${height} has ${txids.length} tx, ` +
        `only checking the first ${MAX_TX_FETCHES_PER_POLL} this cycle (free-tier budget) - ` +
        "see MAX_TX_FETCHES_PER_POLL comment.",
    );
  }

  for (const txid of txids.slice(0, MAX_TX_FETCHES_PER_POLL)) {
    const tx = await getJson<TxDetail>(
      `/${chain.blockcypherChain}/main/txs/${txid}`,
    );
    for (const output of tx.outputs) {
      for (const address of output.addresses ?? []) {
        const matches = addressMap.lookup(chain.network, address);
        if (!matches || matches.length === 0) continue;
        sink({
          network: chain.network,
          address,
          txHash: tx.hash,
          amount: output.value / 1e8,
          reportedSymbol: chain.nativeSymbol,
        });
      }
    }
  }
}

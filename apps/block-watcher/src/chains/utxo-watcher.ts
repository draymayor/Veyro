import type { UtxoChainConfig } from "../chain-config";
import type { AddressMap } from "../address-map";
import type { DetectionSink } from "./types";
import type { ApiClient } from "../api-client";

const POLL_INTERVAL_MS = 45_000;
const PROVIDER = "alchemy";

/**
 * Bitcoin Core's own RPC methods, proxied by Alchemy - getblockcount,
 * getblockhash, and getblock are all flat 10 CU regardless of verbosity
 * (confirmed against alchemy.com/docs/reference/compute-unit-costs,
 * 2026-09-07), so a poll cycle across all three chains here costs roughly
 * 4,200 CU/hr (~3.1M CU/month) - comfortably inside the 30M/month free
 * tier alongside apps/api's existing (much smaller, webhook-only) Alchemy
 * usage.
 */
async function rpc<T>(
  alchemyNetwork: string,
  apiKey: string,
  method: string,
  params: unknown[],
): Promise<T> {
  const res = await fetch(`https://${alchemyNetwork}.g.alchemy.com/v2/${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) {
    throw new Error(
      `Alchemy ${alchemyNetwork} ${method} failed: HTTP ${res.status}`,
    );
  }
  const body = (await res.json()) as {
    result?: T;
    error?: { code: number; message: string } | null;
  };
  if (body.error) {
    throw new Error(
      `Alchemy ${alchemyNetwork} ${method} failed: ${body.error.code} ${body.error.message}`,
    );
  }
  if (body.result === undefined) {
    throw new Error(`Alchemy ${alchemyNetwork} ${method} returned no result`);
  }
  return body.result;
}

interface DecodedVout {
  value: number;
  scriptPubKey?: {
    // Newer bitcoind versions (confirmed live on Bitcoin mainnet, 2026-09-07)
    // return a single `address` string; older ones (confirmed live on
    // Litecoin mainnet, same date, same Alchemy account) return an
    // `addresses` array instead - both handled below rather than assuming
    // one shape holds across all three chains.
    address?: string;
    addresses?: string[];
  };
}

interface DecodedTx {
  txid: string;
  vout: DecodedVout[];
}

interface DecodedBlock {
  hash: string;
  height: number;
  nTx: number;
  tx: DecodedTx[];
}

/**
 * Never resolves under normal operation - polls Alchemy for the current
 * block height (`getblockcount`), then for each newly-observed height
 * fetches the full block with every transaction already decoded
 * (`getblockhash` + `getblock` verbosity 2) and checks every output
 * against the address map. Unlike the previous BlockCypher-based
 * implementation, this needs no per-transaction follow-up request and no
 * truncation cap: one `getblock` call returns all of a block's
 * transactions (confirmed live against a real 3,712-tx Bitcoin mainnet
 * block, 2026-09-07), with output amounts already in whole coin units (not
 * satoshis - confirmed from the same live response, so no /1e8 conversion
 * is needed here, unlike BlockCypher's satoshi-denominated `value`).
 */
export async function watchUtxo(
  chain: UtxoChainConfig,
  addressMap: AddressMap,
  sink: DetectionSink,
  alchemyApiKey: string,
  apiClient: ApiClient,
): Promise<void> {
  let lastHeight: number | null = null;

  for (;;) {
    try {
      const height = await rpc<number>(
        chain.alchemyNetwork,
        alchemyApiKey,
        "getblockcount",
        [],
      );
      if (lastHeight === null) {
        lastHeight = height;
      } else if (height > lastHeight) {
        for (let h = lastHeight + 1; h <= height; h++) {
          await processBlockAtHeight(chain, h, addressMap, sink, alchemyApiKey);
        }
        lastHeight = height;
      }
      await reportSuccess(apiClient, chain.network);
    } catch (err) {
      console.error(`[block-watcher] ${chain.network} poll failed:`, err);
      await reportFailure(apiClient, chain.network, err);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

async function processBlockAtHeight(
  chain: UtxoChainConfig,
  height: number,
  addressMap: AddressMap,
  sink: DetectionSink,
  alchemyApiKey: string,
): Promise<void> {
  const hash = await rpc<string>(
    chain.alchemyNetwork,
    alchemyApiKey,
    "getblockhash",
    [height],
  );
  const block = await rpc<DecodedBlock>(
    chain.alchemyNetwork,
    alchemyApiKey,
    "getblock",
    [hash, 2],
  );

  for (const tx of block.tx) {
    for (const vout of tx.vout) {
      const addresses = vout.scriptPubKey?.address
        ? [vout.scriptPubKey.address]
        : (vout.scriptPubKey?.addresses ?? []);
      for (const address of addresses) {
        const matches = addressMap.lookup(chain.network, address);
        if (!matches || matches.length === 0) continue;
        sink({
          network: chain.network,
          address,
          txHash: tx.txid,
          amount: vout.value,
          reportedSymbol: chain.nativeSymbol,
        });
      }
    }
  }
}

// Best-effort reporting to apps/api's ProviderHealthService - same posture
// as tron-watcher.ts's reportSuccess/reportFailure: never lets a reporting
// failure escape into the watch loop above, which already has its own real
// failure to handle.
async function reportSuccess(
  apiClient: ApiClient,
  networkCode: string,
): Promise<void> {
  try {
    await apiClient.postProviderHealth({
      networkCode,
      provider: PROVIDER,
      outcome: "success",
    });
  } catch (err) {
    console.error("[block-watcher] provider-health report failed:", err);
  }
}

async function reportFailure(
  apiClient: ApiClient,
  networkCode: string,
  err: unknown,
): Promise<void> {
  try {
    await apiClient.postProviderHealth({
      networkCode,
      provider: PROVIDER,
      outcome: "failure",
      message: err instanceof Error ? err.message : String(err),
    });
  } catch (reportErr) {
    console.error("[block-watcher] provider-health report failed:", reportErr);
  }
}

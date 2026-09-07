import { loadConfig } from "./config";
import { createSupabaseClient } from "./supabase-client";
import { AddressMap } from "./address-map";
import { ApiClient, Detection } from "./api-client";
import { startHealthServer } from "./health-server";
import { EVM_CHAINS, UTXO_CHAINS } from "./chain-config";
import { watchEvmWs } from "./chains/evm-ws-watcher";
import { watchEvmPoll } from "./chains/evm-poll-watcher";
import { watchTron } from "./chains/tron-watcher";
import { watchUtxo } from "./chains/utxo-watcher";

const FLUSH_INTERVAL_MS = 5_000;
// If apps/api is unreachable for a while, detections pile up in the buffer
// rather than being silently dropped - but unboundedly, that's a memory
// leak. This many pending detections (across every chain combined) is far
// beyond anything real traffic should produce between two flush attempts;
// hitting it means something is actually wrong (API down for an extended
// stretch) and the oldest entries get dropped with a loud warning rather
// than the process slowly running out of memory.
const MAX_BUFFERED_DETECTIONS = 5_000;

async function main(): Promise<void> {
  const config = loadConfig();
  startHealthServer(config.port);

  const supabase = createSupabaseClient(
    config.supabaseUrl,
    config.supabaseServiceRoleKey,
  );
  const addressMap = new AddressMap(supabase);
  await addressMap.refresh();
  console.log(
    `[block-watcher] initial address map loaded: ${addressMap.trackedAddressCount} rows`,
  );
  setInterval(() => {
    addressMap.refresh().catch((err: unknown) => {
      console.error("[block-watcher] address map refresh failed:", err);
    });
  }, config.addressMapRefreshMs);

  const apiClient = new ApiClient(
    config.apiBaseUrl,
    config.blockWatcherSharedSecret,
  );
  const buffer: Detection[] = [];
  const sink = (detection: Detection) => {
    if (buffer.length >= MAX_BUFFERED_DETECTIONS) {
      buffer.shift();
      console.warn(
        `[block-watcher] detection buffer at cap (${MAX_BUFFERED_DETECTIONS}), dropping oldest - apps/api may be unreachable.`,
      );
    }
    buffer.push(detection);
  };

  setInterval(() => {
    if (buffer.length === 0) return;
    const batch = buffer.splice(0, buffer.length);
    apiClient.postDetections(batch).catch((err: unknown) => {
      // Re-buffer on failure (subject to the same cap above) rather than
      // dropping - a transient apps/api blip shouldn't lose a real
      // detection, and re-posting an already-recorded one is a harmless
      // no-op thanks to UNIQUE(network, tx_hash, address).
      buffer.unshift(...batch.slice(0, MAX_BUFFERED_DETECTIONS));
      console.error("[block-watcher] failed to post detection batch:", err);
    });
  }, FLUSH_INTERVAL_MS);

  // Every watcher below is a never-resolving loop with its own internal
  // reconnect/retry handling (see each file) - `void ... .catch(...)` here
  // only guards against a genuinely unexpected escape from that loop, which
  // would otherwise be an unhandled rejection. If one chain's watcher does
  // die, every other chain keeps running independently; it's logged loudly
  // since that chain silently loses its only detection path if it's one of
  // the majority with no Tatum/Alchemy coverage.
  for (const chain of EVM_CHAINS) {
    if (chain.detectionMode === "ws") {
      void watchEvmWs(chain, addressMap, sink).catch((err: unknown) => {
        console.error(
          `[block-watcher] FATAL: ${chain.network} WS watcher exited:`,
          err,
        );
      });
    } else {
      const rpcUrl = config.evmRpcUrls[chain.network];
      if (!rpcUrl) {
        console.warn(
          `[block-watcher] no EVM_RPC_URL_* configured for ${chain.network} - this chain has NO detection coverage.`,
        );
        continue;
      }
      void watchEvmPoll(chain, rpcUrl, addressMap, sink).catch(
        (err: unknown) => {
          console.error(
            `[block-watcher] FATAL: ${chain.network} poll watcher exited:`,
            err,
          );
        },
      );
    }
  }

  void watchTron(addressMap, sink).catch((err: unknown) => {
    console.error("[block-watcher] FATAL: TRC20 watcher exited:", err);
  });

  for (const chain of UTXO_CHAINS) {
    void watchUtxo(chain, addressMap, sink).catch((err: unknown) => {
      console.error(
        `[block-watcher] FATAL: ${chain.network} watcher exited:`,
        err,
      );
    });
  }

  console.log(
    `[block-watcher] started - ${EVM_CHAINS.filter((c) => c.detectionMode === "ws").length} WS chains, ` +
      `${EVM_CHAINS.filter((c) => c.detectionMode === "poll-evm").length} poll-evm chains, ` +
      `TRC20, ${UTXO_CHAINS.length} UTXO chains.`,
  );
}

main().catch((err: unknown) => {
  console.error("[block-watcher] fatal startup error:", err);
  process.exit(1);
});

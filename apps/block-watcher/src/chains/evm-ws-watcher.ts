import { ethers } from "ethers";
import type { EvmChainConfig } from "../chain-config";
import type { AddressMap } from "../address-map";
import type { DetectionSink } from "./types";
import { processEvmBlock } from "./evm-shared";

const RECONNECT_DELAY_MS = 5_000;
// If no new block arrives within this window, the socket is assumed dead
// even if no 'error'/'close' event fired (seen in practice with some WS
// gateways that silently stop pushing without closing cleanly) - forces a
// reconnect rather than sitting idle forever. Set well above every EVM
// chain's real block time (~12s worst case among these seven).
const IDLE_TIMEOUT_MS = 120_000;

/**
 * Never resolves under normal operation - holds a persistent WS
 * subscription (eth_subscribe "newHeads" under the hood, via ethers'
 * WebSocketProvider 'block' event) and reconnects on its own after any
 * disconnect or idle timeout, indefinitely. Intended to be started once and
 * left running for the life of the process (see main.ts).
 */
export async function watchEvmWs(
  chain: EvmChainConfig,
  addressMap: AddressMap,
  sink: DetectionSink,
): Promise<void> {
  if (!chain.wsUrl) {
    throw new Error(`watchEvmWs called for ${chain.network} with no wsUrl`);
  }

  for (;;) {
    try {
      await new Promise<void>((_resolve, reject) => {
        const provider = new ethers.WebSocketProvider(chain.wsUrl!);
        let idleTimer: NodeJS.Timeout;

        const fail = (err: unknown) => {
          clearTimeout(idleTimer);
          void provider.destroy().catch(() => undefined);
          reject(err instanceof Error ? err : new Error(String(err)));
        };

        const resetIdleTimer = () => {
          clearTimeout(idleTimer);
          idleTimer = setTimeout(
            () =>
              fail(new Error(`no block received within ${IDLE_TIMEOUT_MS}ms`)),
            IDLE_TIMEOUT_MS,
          );
        };

        resetIdleTimer();
        void provider.on("error", fail);
        void provider.on("block", (blockNumber: number) => {
          resetIdleTimer();
          processEvmBlock(chain, provider, blockNumber, addressMap, sink).catch(
            (err: unknown) =>
              console.error(
                `[block-watcher] ${chain.network} block ${blockNumber} processing failed:`,
                err,
              ),
          );
        });
      });
    } catch (err) {
      console.error(
        `[block-watcher] ${chain.network} WS connection failed, reconnecting in ${RECONNECT_DELAY_MS}ms:`,
        err,
      );
      await new Promise((r) => setTimeout(r, RECONNECT_DELAY_MS));
    }
  }
}

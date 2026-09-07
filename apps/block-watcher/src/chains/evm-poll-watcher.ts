import { ethers } from "ethers";
import type { EvmChainConfig } from "../chain-config";
import type { AddressMap } from "../address-map";
import type { DetectionSink } from "./types";
import { processEvmBlock } from "./evm-shared";

const POLL_INTERVAL_MS = 8_000;

/**
 * For EVM chains with no confirmed free WebSocket provider (see
 * chain-config.ts's doc comment) - polls eth_blockNumber on the chain's own
 * public RPC (EVM_RPC_URL_<network>, same env vars apps/sweeper already
 * reads) and processes every newly-observed block with the same
 * processEvmBlock logic the WS watcher uses. Never resolves under normal
 * operation; logs and keeps polling through any single failed request
 * rather than dying.
 */
export async function watchEvmPoll(
  chain: EvmChainConfig,
  rpcUrl: string,
  addressMap: AddressMap,
  sink: DetectionSink,
): Promise<void> {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  let lastProcessed: number | null = null;

  for (;;) {
    try {
      const latest = await provider.getBlockNumber();
      const from = lastProcessed === null ? latest : lastProcessed + 1;

      for (let blockNumber = from; blockNumber <= latest; blockNumber++) {
        await processEvmBlock(chain, provider, blockNumber, addressMap, sink);
      }
      lastProcessed = latest;
    } catch (err) {
      console.error(`[block-watcher] ${chain.network} poll failed:`, err);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

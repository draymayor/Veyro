import { ethers } from "ethers";
import type { EvmChainConfig } from "../chain-config";
import { TRANSFER_EVENT_TOPIC } from "../chain-config";
import type { AddressMap } from "../address-map";
import type { DetectionSink } from "./types";

// decimals() never changes for a given contract - fetched once, reused for
// the life of the process, one small RPC call per contract instead of one
// per Transfer log seen. Shared across every EVM chain/provider since a
// contract address is only ever meaningful within its own chain anyway (no
// cross-chain collision risk worth a compound key here).
const decimalsCache = new Map<string, number>();

async function getDecimals(
  provider: ethers.Provider,
  contract: string,
): Promise<number> {
  const cached = decimalsCache.get(contract);
  if (cached !== undefined) return cached;
  const token = new ethers.Contract(
    contract,
    ["function decimals() view returns (uint8)"],
    provider,
  );
  const decimals = Number(await (token.decimals() as Promise<bigint | number>));
  decimalsCache.set(contract, decimals);
  return decimals;
}

/**
 * Scans one block for deposits into any tracked address on `chain`, native
 * top-level transfers and ERC20/token Transfer logs alike, reporting every
 * match to `sink`. Shared between the WS watcher (called once per pushed
 * block) and the polling watcher (called once per newly-observed block
 * height) - identical logic either way, only how a new block number is
 * learned about differs between the two.
 */
export async function processEvmBlock(
  chain: EvmChainConfig,
  provider: ethers.Provider,
  blockNumber: number,
  addressMap: AddressMap,
  sink: DetectionSink,
): Promise<void> {
  const contractToSymbol = new Map<string, string>();
  for (const [symbol, contract] of Object.entries(chain.tokenContracts)) {
    contractToSymbol.set(contract.toLowerCase(), symbol);
  }

  const [block, logs] = await Promise.all([
    provider.getBlock(blockNumber, true),
    Object.keys(chain.tokenContracts).length > 0
      ? provider.getLogs({
          fromBlock: blockNumber,
          toBlock: blockNumber,
          topics: [TRANSFER_EVENT_TOPIC],
        })
      : Promise.resolve([]),
  ]);

  // Native-coin transfers: a plain top-level tx with a nonzero value to a
  // tracked address. No tracked deposit address on this platform is a smart
  // contract, so top-level `to` is always exactly "who this tx sent value
  // to" for a simple transfer - never a call routed onward internally.
  if (block) {
    for (const tx of block.prefetchedTransactions) {
      if (tx.value <= 0n || !tx.to) continue;
      const matches = addressMap.lookup(chain.network, tx.to);
      if (!matches || matches.length === 0) continue;
      sink({
        network: chain.network,
        address: tx.to,
        txHash: tx.hash,
        amount: Number(ethers.formatEther(tx.value)),
        reportedSymbol: chain.nativeSymbol,
      });
    }
  }

  // Token transfers: ERC20 Transfer(from, to, value) logs, topics[2] is the
  // recipient (left-padded to 32 bytes - last 20 bytes are the address).
  for (const log of logs) {
    const symbol = contractToSymbol.get(log.address.toLowerCase());
    if (!symbol || log.topics.length < 3) continue;
    const to = "0x" + log.topics[2].slice(-40);
    const matches = addressMap.lookup(chain.network, to);
    if (!matches || matches.length === 0) continue;

    const decimals = await getDecimals(provider, log.address);
    const rawValue = BigInt(log.data);
    sink({
      network: chain.network,
      address: to,
      txHash: log.transactionHash,
      amount: Number(ethers.formatUnits(rawValue, decimals)),
      reportedSymbol: symbol,
    });
  }
}

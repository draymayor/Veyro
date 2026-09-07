import {
  TRON_NATIVE_SYMBOL,
  TRON_NETWORK,
  TRON_USDT_CONTRACT,
} from "../chain-config";
import type { AddressMap } from "../address-map";
import type { DetectionSink } from "./types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { TronWeb } = require("tronweb");

const TRONGRID_BASE = "https://api.trongrid.io";
const POLL_INTERVAL_MS = 3_000; // TRON's real block time is ~3s.
// keccak256("Transfer(address,address,uint256)") without the leading 0x -
// TronGrid's transactionInfo.log[].topics entries come back without the
// prefix, unlike an EVM eth_getLogs response.
const TRANSFER_TOPIC_NO_PREFIX =
  "ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const tronWeb = new TronWeb({ fullHost: TRONGRID_BASE });

interface TronBlock {
  block_header?: { raw_data?: { number?: number } };
  transactions?: Array<{
    txID: string;
    raw_data?: {
      contract?: Array<{
        type?: string;
        parameter?: {
          value?: {
            owner_address?: string;
            to_address?: string;
            amount?: number;
          };
        };
      }>;
    };
  }>;
}

interface TronTransactionInfo {
  id: string;
  log?: Array<{ address: string; topics?: string[]; data?: string }>;
}

async function trongridPost<T>(
  path: string,
  body: unknown,
  apiKey: string,
): Promise<T> {
  const res = await fetch(`${TRONGRID_BASE}${path}`, {
    method: "POST",
    // Confirmed live 2026-09-07: unauthenticated requests are capped at
    // 1 req/sec (TronGrid cut this in 2023), which this watcher's 3s poll
    // interval alone exceeds - a free key (15 req/sec) is required, not
    // optional. See BlockWatcherConfig.tronGridApiKey's doc comment.
    headers: {
      "content-type": "application/json",
      "TRON-PRO-API-KEY": apiKey,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`TronGrid ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/**
 * CONFIRMED (2026-09-07) against a real live capture, not just TronGrid's
 * published docs: a getnowblock/getblockbynum/gettransactioninfobyblocknum
 * round trip against TronGrid mainnet matched every field name/shape this
 * file assumes, byte-for-byte - including a real Transfer event from the
 * official USDT contract (TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t) captured in
 * the sampled block, independently confirmed via triggerconstantcontract.
 * See apps/block-watcher/README.md's "Known open items" section for the
 * detail. No longer an open question; kept here as a record of what was
 * actually checked rather than assumed.
 *
 * Native TRX transfers come from getblockbynum's embedded transactions
 * (contract type "TransferContract", hex addresses converted via TronWeb's
 * address.fromHex). TRC20 transfers come from a separate
 * gettransactioninfobyblocknum call, whose `log` entries mirror an EVM
 * Transfer event (same topic0, hex addresses without a leading 0x) since
 * the TVM's log format was deliberately modeled on the EVM's.
 */
export async function watchTron(
  addressMap: AddressMap,
  sink: DetectionSink,
  apiKey: string,
): Promise<void> {
  let lastProcessed: number | null = null;

  for (;;) {
    try {
      const now = await trongridPost<TronBlock>(
        "/wallet/getnowblock",
        {},
        apiKey,
      );
      const latest = now.block_header?.raw_data?.number;
      if (latest === undefined)
        throw new Error("getnowblock missing block number");

      const from = lastProcessed === null ? latest : lastProcessed + 1;
      for (let num = from; num <= latest; num++) {
        await processBlock(num, addressMap, sink, apiKey);
      }
      lastProcessed = latest;
    } catch (err) {
      console.error("[block-watcher] TRC20 poll failed:", err);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

async function processBlock(
  num: number,
  addressMap: AddressMap,
  sink: DetectionSink,
  apiKey: string,
): Promise<void> {
  const [block, txInfos] = await Promise.all([
    trongridPost<TronBlock>("/wallet/getblockbynum", { num }, apiKey),
    trongridPost<TronTransactionInfo[]>(
      "/wallet/gettransactioninfobyblocknum",
      {
        num,
      },
      apiKey,
    ),
  ]);

  for (const tx of block.transactions ?? []) {
    const contract = tx.raw_data?.contract?.[0];
    if (contract?.type !== "TransferContract") continue;
    const value = contract.parameter?.value;
    const toHex = value?.to_address;
    const amountSun = value?.amount;
    if (!toHex || !amountSun) continue;

    const toAddress = tronWeb.address.fromHex(toHex) as string;
    const matches = addressMap.lookup(TRON_NETWORK, toAddress);
    if (!matches || matches.length === 0) continue;

    sink({
      network: TRON_NETWORK,
      address: toAddress,
      txHash: tx.txID,
      amount: amountSun / 1e6,
      reportedSymbol: TRON_NATIVE_SYMBOL,
    });
  }

  for (const info of Array.isArray(txInfos) ? txInfos : []) {
    for (const log of info.log ?? []) {
      if (!log.topics || log.topics[0] !== TRANSFER_TOPIC_NO_PREFIX) continue;
      if (log.topics.length < 3) continue;
      // TronGrid's log.address is hex WITHOUT the '41' mainnet prefix -
      // prepend it before converting, same as TronWeb's own contract event
      // helpers do internally.
      const contractAddress = tronWeb.address.fromHex(
        "41" + log.address,
      ) as string;
      if (contractAddress !== TRON_USDT_CONTRACT) continue;

      const toHex = "41" + log.topics[2].slice(-40);
      const toAddress = tronWeb.address.fromHex(toHex) as string;
      const matches = addressMap.lookup(TRON_NETWORK, toAddress);
      if (!matches || matches.length === 0) continue;

      const rawValue = BigInt("0x" + (log.data || "0"));
      sink({
        network: TRON_NETWORK,
        address: toAddress,
        txHash: info.id,
        amount: Number(rawValue) / 1e6, // TRC20 USDT uses 6 decimals.
        reportedSymbol: "USDT",
      });
    }
  }
}

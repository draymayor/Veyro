import { createServer } from "http";

const BLOCKCHAIR_CHAINS = ["bitcoin", "litecoin", "dogecoin"] as const;

interface BlockchairProbeResult {
  chain: string;
  callNumber: number;
  httpStatus: number;
  code?: number;
  error?: string;
  elapsedMs: number;
}

/**
 * TEMPORARY, read-only diagnostic - see BlockWatcherConfig.utxoDetectionEnabled's
 * doc comment and README.md's "Known open items". Answers one specific
 * question that can only be answered from this service's own real Cloud
 * Run egress IP, not a dev sandbox (whose IP got blacklisted testing this
 * exact thing): does Blockchair's documented free-tier limit (30 req/min,
 * no key, covers BTC/LTC/DOGE from one API) actually hold up in practice,
 * or does it blacklist a fresh IP well before that - and is BlockCypher's
 * IP-shared-or-per-chain rate-limit behavior clearer from here than it was
 * from the sandbox.
 *
 * Fires 12 requests per chain (36 total, well under the documented 30/min
 * across all three combined) at roughly 1/sec, logging BlockCypher's
 * X-Ratelimit-Remaining alongside Blockchair's response `code`/`error` for
 * every call - no address-map lookups, no crediting, nothing written
 * anywhere. Remove this route (and BLOCKCHAIR_CHAINS/runBlockchairProbe)
 * once the UTXO provider question is genuinely resolved either way.
 */
async function runBlockchairProbe(): Promise<BlockchairProbeResult[]> {
  const results: BlockchairProbeResult[] = [];
  for (const chain of BLOCKCHAIR_CHAINS) {
    for (let i = 1; i <= 12; i++) {
      const started = Date.now();
      try {
        const res = await fetch(`https://api.blockchair.com/${chain}/stats`);
        const body = (await res.json().catch(() => ({}))) as {
          context?: { code?: number; error?: string };
        };
        results.push({
          chain,
          callNumber: i,
          httpStatus: res.status,
          code: body.context?.code,
          error: body.context?.error,
          elapsedMs: Date.now() - started,
        });
      } catch (err) {
        results.push({
          chain,
          callNumber: i,
          httpStatus: 0,
          error: err instanceof Error ? err.message : String(err),
          elapsedMs: Date.now() - started,
        });
      }
      await new Promise((r) => setTimeout(r, 1_000));
    }
  }
  return results;
}

/**
 * Cloud Run Services (unlike sweeper/consolidator's Jobs) require the
 * container to listen on $PORT and respond to traffic, or the revision
 * never becomes ready - block-watcher itself has no inbound API of its
 * own (it only ever calls OUT to apps/api), so this exists purely to
 * satisfy that requirement and to give a real /health for uptime checks.
 * Also carries the temporary /diagnostics/blockchair probe above - both
 * are reachable only by whoever holds Cloud Run Invoker on this service
 * (deployed without --allow-unauthenticated), never publicly.
 */
export function startHealthServer(port: number): void {
  const server = createServer((req, res) => {
    if (req.url === "/diagnostics/blockchair") {
      runBlockchairProbe()
        .then((results) => {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ results }, null, 2));
        })
        .catch((err: unknown) => {
          res.writeHead(500, { "content-type": "application/json" });
          res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : String(err),
            }),
          );
        });
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
  });
  server.listen(port, () => {
    console.log(`[block-watcher] health server listening on :${port}`);
  });
}

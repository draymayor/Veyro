import { createServer } from "http";

/**
 * Cloud Run Services (unlike sweeper/consolidator's Jobs) require the
 * container to listen on $PORT and respond to traffic, or the revision
 * never becomes ready - block-watcher itself has no inbound API of its
 * own (it only ever calls OUT to apps/api), so this exists purely to
 * satisfy that requirement and to give a real /health for uptime checks.
 */
export function startHealthServer(port: number): void {
  const server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
  });
  server.listen(port, () => {
    console.log(`[block-watcher] health server listening on :${port}`);
  });
}

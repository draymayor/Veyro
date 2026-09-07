import type { Detection } from "../api-client";

/** Called by every watcher for each candidate deposit it finds. */
export type DetectionSink = (detection: Detection) => void;

/**
 * A running chain watcher. `start` never resolves under normal operation
 * (it's a persistent WS subscription or an infinite poll loop) - callers
 * should not await it, just let it run and log its own errors. Each
 * implementation is responsible for reconnecting/retrying on its own
 * transient failures rather than letting the whole process die over one
 * dropped connection.
 */
export type ChainWatcher = () => Promise<void>;

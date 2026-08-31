// Shared helper for every outbound call to a third-party API (CoinGecko,
// the FX providers, Resend). Without an explicit timeout, a slow or hung
// upstream response leaves the request open for however long Node's
// default socket timeout allows (effectively unbounded for fetch), which
// means one slow provider can hang a user-facing request instead of
// failing fast into whatever fallback that caller has (cached data, the
// next provider in line, or a clear error).
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Races an arbitrary promise (not a fetch call, so no AbortController to
// hook into) against a timeout. Used for the Resend SDK call, which
// doesn't expose a way to pass our own AbortSignal through.
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

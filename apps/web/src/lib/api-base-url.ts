const API_PREFIX = "/api/v1";

/**
 * NEXT_PUBLIC_API_BASE_URL is configured per-environment (local .env.local
 * includes the /api/v1 prefix, but the production Vercel env var was set
 * without it, which sent every fetch to an unprefixed path and 404'd
 * against the NestJS global prefix). Normalizing here means every caller
 * gets a correctly prefixed base URL regardless of how the raw env var is
 * set in a given environment.
 */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  const withoutTrailingSlash = raw.replace(/\/+$/, "");
  if (withoutTrailingSlash.endsWith(API_PREFIX)) {
    return withoutTrailingSlash;
  }
  return `${withoutTrailingSlash}${API_PREFIX}`;
}

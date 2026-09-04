import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithTimeout } from '../common/fetch-with-timeout';

const TATUM_BASE_URL = 'https://api.tatum.io/v3';
const REQUEST_TIMEOUT_MS = 10_000;

// Confirmed directly against the live Tatum dashboard (2026-09-04): 5
// ADDRESS_TRANSACTION subscriptions total, platform-wide, shared across
// every chain - Tatum's own public docs disagree with each other on this
// number (5 vs 10 depending on the page), so this is the real, checked
// value for this account, not one taken from their docs. Update this if
// the plan ever changes - it drives the admin dashboard's coverage
// indicator (AdminDashboardService), not just a comment.
export const TATUM_WEBHOOK_SUBSCRIPTION_CAP = 5;

/**
 * Thin wrapper around Tatum's REST endpoints (deliberately not the Tatum
 * SDK, following the same fetchWithTimeout pattern already used for
 * CoinGecko/FX - see crypto-price.service.ts): address generation
 * (GET /v3/{chain}/address/{xpub}/{index}, only ever called with an xpub -
 * public, derivation-only, safe to hold in config, the master seeds it's
 * derived from never pass through this service or this process at all, see
 * docs/planning-history.md's Crypto Custody section) and ADDRESS_TRANSACTION
 * webhook subscriptions (POST/DELETE /v3/subscription), for webhook-based
 * deposit detection (docs/context.md's "hybrid model"). Subscription shape
 * verified directly against docs.tatum.io/reference/createsubscription;
 * the real subscription cap on this account was confirmed directly against
 * the live Tatum dashboard (2026-09-04): 5 total, platform-wide, shared
 * across every chain - not a number this codebase should assume from
 * Tatum's own public docs, which disagree with each other on it.
 */
@Injectable()
export class TatumService {
  private readonly logger = new Logger(TatumService.name);
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('TATUM_API_KEY');
  }

  async generateAddressFromXpub(
    tatumChain: string,
    xpub: string,
    index: number,
  ): Promise<string> {
    const res = await fetchWithTimeout(
      `${TATUM_BASE_URL}/${tatumChain}/address/${xpub}/${index}`,
      { headers: { 'x-api-key': this.apiKey } },
      REQUEST_TIMEOUT_MS,
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(
        `Tatum address generation failed for ${tatumChain} index ${index}: ${res.status} ${body}`,
      );
    }

    const data = (await res.json()) as { address?: string };
    if (!data.address) {
      throw new Error(
        `Tatum address generation returned no address for ${tatumChain} index ${index}`,
      );
    }

    return data.address;
  }

  /**
   * Registers an ADDRESS_TRANSACTION webhook subscription for one address,
   * so a confirmed on-chain deposit to it triggers a POST to `webhookUrl`
   * (our /webhooks/tatum receiver). Returns null - never throws - on any
   * failure: the account's 5-slot subscription cap being exhausted is an
   * ordinary, expected outcome (not most addresses will get one), and the
   * caller's fallback is simply "this address stays on the existing
   * manual-admin-check path", not an error condition. The caller logs and
   * moves on either way; address generation itself must never fail because
   * Tatum's subscription slots ran out.
   *
   * `subscriptionChain` is deliberately a different value space from
   * generateAddressFromXpub's `tatumChain` param above (e.g. 'TRON'/'ETH'
   * here vs 'tron'/'ethereum' there) - confirmed live (2026-09-04) that
   * this endpoint's `attr.chain` validates against a totally different
   * enum than /v3/{chain}/address does, despite living under the same
   * /v3 base path. Passing the wrong one 400s every time - see
   * ChainConfig.tatumSubscriptionChain's doc comment for how this was
   * caught (it silently zeroed out webhookCoverage.slotsUsed in
   * production for every chain, not just one).
   */
  async createAddressSubscription(
    subscriptionChain: string,
    address: string,
    webhookUrl: string,
  ): Promise<string | null> {
    try {
      const res = await fetchWithTimeout(
        `${TATUM_BASE_URL}/subscription`,
        {
          method: 'POST',
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'ADDRESS_TRANSACTION',
            attr: { address, chain: subscriptionChain, url: webhookUrl },
          }),
        },
        REQUEST_TIMEOUT_MS,
      );

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.warn(
          `Tatum subscription not created for ${subscriptionChain} address ${address} (falls back to manual admin check): ${res.status} ${body}`,
        );
        return null;
      }

      const data = (await res.json()) as { id?: string };
      return data.id ?? null;
    } catch (err) {
      this.logger.warn(
        `Tatum subscription request failed for ${subscriptionChain} address ${address} (falls back to manual admin check): ${(err as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Frees a subscription slot - one of only 5 total on this account, so
   * this matters. Not currently called by any code path (nothing today
   * ever needs to un-watch an address once assigned), kept ready for a
   * future admin action or address-lifecycle change that would need it.
   * Swallows failure the same way createAddressSubscription does: freeing
   * a slot is a best-effort cleanup, never something that should block or
   * fail the caller's own operation.
   */
  async deleteSubscription(subscriptionId: string): Promise<void> {
    try {
      const res = await fetchWithTimeout(
        `${TATUM_BASE_URL}/subscription/${subscriptionId}`,
        { method: 'DELETE', headers: { 'x-api-key': this.apiKey } },
        REQUEST_TIMEOUT_MS,
      );
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.warn(
          `Tatum subscription ${subscriptionId} delete failed: ${res.status} ${body}`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Tatum subscription ${subscriptionId} delete request failed: ${(err as Error).message}`,
      );
    }
  }
}

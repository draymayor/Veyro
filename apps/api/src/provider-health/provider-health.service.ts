import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';

// 3 consecutive non-rate-limit failures (timeouts, 5xx) before tripping -
// mirrors FxRateService's existing consecutiveFailures counter, just made
// actionable instead of only affecting log severity. A single rate-limit
// response, by contrast, trips immediately regardless of this count (see
// recordFailure): a 429 is authoritative, unlike a timeout that could be
// ordinary network noise.
const FAILURE_THRESHOLD = 3;

const BASE_BACKOFF_MS = 10 * 60 * 1000; // 10 min
const MAX_BACKOFF_MS = 2 * 60 * 60 * 1000; // 2h

// Blockchair's own docs (confirmed 2026-09-07, see health-server.ts's
// diagnostic probe comment and the design doc this implements) state a 429
// bans the offending IP for exactly 1 hour, with repeat offenses risking a
// permanent ban - this is the one provider where the "unknown ceiling,
// reactive trip" strategy is load-bearing rather than a static counter,
// so its backoff starts safely over that documented window rather than
// sharing the generic default.
const BLOCKCHAIR_BAN_BACKOFF_MS = 65 * 60 * 1000;

function computeBackoffMs(
  provider: string,
  rateLimited: boolean,
  priorFailures: number,
): number {
  if (provider === 'blockchair' && rateLimited) {
    return Math.min(
      BLOCKCHAIR_BAN_BACKOFF_MS * 2 ** priorFailures,
      MAX_BACKOFF_MS * 4,
    );
  }
  return Math.min(BASE_BACKOFF_MS * 2 ** priorFailures, MAX_BACKOFF_MS);
}

export interface RecordFailureOptions {
  /** A 429, or any other response the provider itself frames as a rate-limit rejection - trips immediately, bypassing FAILURE_THRESHOLD. */
  rateLimited: boolean;
  message: string;
}

export interface NetworkAvailabilityRow {
  networkCode: string;
  provider: string;
  status: 'available' | 'degraded' | 'unavailable';
  reason: string | null;
  disabledAt: string | null;
  autoRecoveryAt: string | null;
  consecutiveFailures: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
}

/**
 * Tracks per-(network, provider) detection-capacity health in
 * network_availability (docs/planning-history.md's capacity monitoring
 * design, 2026-09-07) and gates whether a network is currently depositable
 * alongside crypto_assets.is_active - see that migration's comment for why
 * the two are deliberately separate. Every outbound call site that matters
 * for deposit DETECTION (not every third-party call in the codebase -
 * CoinGecko/FX feed price display and payout conversion, not detection)
 * reports through recordSuccess/recordFailure; this service never makes an
 * outbound call itself except in its own recovery-probe cron below.
 *
 * Two independent recovery paths close the loop without an admin, per the
 * design: recordSuccess clears an 'unavailable' row the instant ANY real
 * call to that provider/network succeeds (fast path, piggybacks on
 * whatever traffic already exists), and runRecoveryProbes below actively
 * re-checks on a schedule for networks with no other traffic to recover
 * from passively.
 */
@Injectable()
export class ProviderHealthService {
  private readonly logger = new Logger(ProviderHealthService.name);
  // Populated by each provider's own service via registerProbe (Tatum,
  // Alchemy, ...) rather than this service knowing how to ping any given
  // provider itself - keeps "how to cheaply verify this provider is back"
  // local to the service that already knows how to talk to it.
  private readonly probes = new Map<string, () => Promise<boolean>>();

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  registerProbe(provider: string, probe: () => Promise<boolean>): void {
    this.probes.set(provider, probe);
  }

  /**
   * Fail-closed by explicit design decision (2026-09-07): if this table
   * can't be read, the network is treated as NOT available rather than
   * assumed fine. The whole point of this system is preventing deposits
   * into something that can't currently be tracked - a brief false-alarm
   * block on a database hiccup is a much smaller cost than a real deposit
   * landing on a network whose actual detection state is unknown right
   * now.
   */
  async isNetworkAvailable(networkCode: string): Promise<boolean> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('network_availability')
      .select('provider')
      .eq('network_code', networkCode)
      .eq('status', 'unavailable')
      .limit(1);

    if (error) {
      this.logger.error(
        `network_availability read failed for "${networkCode}" - failing closed (treating as unavailable): ${error.message}`,
      );
      return false;
    }

    return (data ?? []).length === 0;
  }

  async listAll(): Promise<NetworkAvailabilityRow[]> {
    const client = this.supabaseService.getClient();
    const { data, error } = await client
      .from('network_availability')
      .select(
        'network_code, provider, status, reason, disabled_at, auto_recovery_at, consecutive_failures, last_success_at, last_failure_at',
      )
      .order('network_code', { ascending: true });

    if (error) {
      this.logger.error(`network_availability list failed: ${error.message}`);
      return [];
    }

    return (data ?? []).map((row) => ({
      networkCode: row.network_code as string,
      provider: row.provider as string,
      status: row.status as NetworkAvailabilityRow['status'],
      reason: (row.reason as string | null) ?? null,
      disabledAt: (row.disabled_at as string | null) ?? null,
      autoRecoveryAt: (row.auto_recovery_at as string | null) ?? null,
      consecutiveFailures: Number(row.consecutive_failures ?? 0),
      lastSuccessAt: (row.last_success_at as string | null) ?? null,
      lastFailureAt: (row.last_failure_at as string | null) ?? null,
    }));
  }

  async recordSuccess(networkCode: string, provider: string): Promise<void> {
    const client = this.supabaseService.getClient();
    const { data: existing } = await client
      .from('network_availability')
      .select('status')
      .eq('network_code', networkCode)
      .eq('provider', provider)
      .maybeSingle();

    const wasUnavailable = existing?.status === 'unavailable';
    const nowIso = new Date().toISOString();

    const { error } = await client.from('network_availability').upsert(
      {
        network_code: networkCode,
        provider,
        status: 'available',
        reason: null,
        disabled_at: null,
        auto_recovery_at: null,
        consecutive_failures: 0,
        last_success_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: 'network_code,provider' },
    );

    if (error) {
      this.logger.error(
        `network_availability upsert (success) failed for ${provider}/${networkCode}: ${error.message}`,
      );
      return;
    }

    if (wasUnavailable) {
      this.logger.log(
        `${provider}/${networkCode} recovered (a real call succeeded).`,
      );
      await this.alertTransition(networkCode, provider, 'available', null);
    }
  }

  async recordFailure(
    networkCode: string,
    provider: string,
    opts: RecordFailureOptions,
  ): Promise<void> {
    const client = this.supabaseService.getClient();
    const { data: existing } = await client
      .from('network_availability')
      .select('status, consecutive_failures')
      .eq('network_code', networkCode)
      .eq('provider', provider)
      .maybeSingle();

    const wasUnavailable = existing?.status === 'unavailable';
    const priorFailures = Number(existing?.consecutive_failures ?? 0);
    const consecutiveFailures = priorFailures + 1;
    const nowIso = new Date().toISOString();

    const shouldTrip =
      opts.rateLimited || consecutiveFailures >= FAILURE_THRESHOLD;

    if (!shouldTrip) {
      const { error } = await client.from('network_availability').upsert(
        {
          network_code: networkCode,
          provider,
          status: existing?.status ?? 'available',
          consecutive_failures: consecutiveFailures,
          last_failure_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: 'network_code,provider' },
      );
      if (error) {
        this.logger.error(
          `network_availability upsert (failure) failed for ${provider}/${networkCode}: ${error.message}`,
        );
      }
      return;
    }

    const reason = opts.rateLimited ? 'rate_limited' : 'consecutive_failures';
    const autoRecoveryAt = new Date(
      Date.now() + computeBackoffMs(provider, opts.rateLimited, priorFailures),
    ).toISOString();

    const { error } = await client.from('network_availability').upsert(
      {
        network_code: networkCode,
        provider,
        status: 'unavailable',
        reason,
        disabled_at: nowIso,
        auto_recovery_at: autoRecoveryAt,
        consecutive_failures: consecutiveFailures,
        last_failure_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: 'network_code,provider' },
    );

    if (error) {
      this.logger.error(
        `network_availability upsert (trip) failed for ${provider}/${networkCode}: ${error.message}`,
      );
      return;
    }

    this.logger.warn(
      `${provider}/${networkCode} tripped to unavailable (${reason}), auto-recovery at ${autoRecoveryAt}: ${opts.message}`,
    );

    if (!wasUnavailable) {
      await this.alertTransition(
        networkCode,
        provider,
        'unavailable',
        opts.message,
      );
    }
  }

  /**
   * Time-based recovery path (the other half of the design's dual
   * recovery strategy) - covers a network with no other traffic to
   * passively recover from via recordSuccess above. Verifies recovery
   * with one real, cheap probe call before reopening the network, rather
   * than assuming the backoff window alone means it's safe; a still-
   * failing probe extends the backoff instead of retrying every tick.
   */
  @Cron('*/1 * * * *')
  async runRecoveryProbes(): Promise<void> {
    const client = this.supabaseService.getClient();
    const { data: due, error } = await client
      .from('network_availability')
      .select('network_code, provider, consecutive_failures')
      .eq('status', 'unavailable')
      .lte('auto_recovery_at', new Date().toISOString());

    if (error) {
      this.logger.error(`Recovery-probe scan failed: ${error.message}`);
      return;
    }

    for (const row of due ?? []) {
      await this.probeOne(
        row.network_code as string,
        row.provider as string,
        Number(row.consecutive_failures ?? 0),
      );
    }
  }

  private async probeOne(
    networkCode: string,
    provider: string,
    priorFailures: number,
  ): Promise<void> {
    const probe = this.probes.get(provider);
    // No probe registered for this provider (e.g. the Blockchair
    // diagnostic below has no safe no-op recovery check yet) - stays
    // tripped until a real successful call elsewhere clears it via
    // recordSuccess, or an admin overrides it directly.
    if (!probe) return;

    let ok: boolean;
    try {
      ok = await probe();
    } catch {
      ok = false;
    }

    if (ok) {
      await this.recordSuccess(networkCode, provider);
      return;
    }

    const nextFailures = priorFailures + 1;
    const autoRecoveryAt = new Date(
      Date.now() + computeBackoffMs(provider, false, nextFailures),
    ).toISOString();

    const { error } = await this.supabaseService
      .getClient()
      .from('network_availability')
      .update({
        auto_recovery_at: autoRecoveryAt,
        consecutive_failures: nextFailures,
        updated_at: new Date().toISOString(),
      })
      .eq('network_code', networkCode)
      .eq('provider', provider);

    if (error) {
      this.logger.error(
        `Recovery-probe backoff extension failed for ${provider}/${networkCode}: ${error.message}`,
      );
    }
  }

  // Debounced to state TRANSITIONS only (never per-failed-request), so a
  // sustained outage sends exactly one "down" email and, later, exactly
  // one "recovered" email rather than an alert storm. Best-effort: an
  // email failure here must never affect the health-tracking write that
  // already succeeded above (NotificationsService.send() throws on
  // failure by design, for user-facing sends where silent failure would
  // be worse - here it's just logged).
  private async alertTransition(
    networkCode: string,
    provider: string,
    status: 'available' | 'unavailable',
    detail: string | null,
  ): Promise<void> {
    try {
      await this.notificationsService.sendProviderHealthAlertEmail({
        networkCode,
        provider,
        status,
        detail,
        occurredAt: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.error(
        `Provider health alert email failed for ${provider}/${networkCode} (${status}): ${(err as Error).message}`,
      );
    }
  }
}

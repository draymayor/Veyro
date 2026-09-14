// notifications.service.ts pulls in .tsx email templates, which this
// repo's Jest config isn't set up to resolve (same pre-existing config gap
// worked around in earn.tiers.spec.ts) - mocked out since these tests only
// assert on how many times sendEarnBonusExpiringSoonEmail was called, never
// real notification-sending.
jest.mock('../notifications/notifications.service', () => ({
  NotificationsService: class {},
}));

// @nestjs/schedule ships an ESM-only dist this repo's Jest config isn't set
// up to transform (same pre-existing config gap as the notifications mock
// above) - stubbed with a no-op decorator since these tests call run()
// directly rather than relying on the actual cron trigger.
jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
}));

import { EarnExpiryWarningService } from './earn-expiry-warning.service';
import type { SupabaseService } from '../supabase/supabase.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { ConfigService } from '@nestjs/config';

// Minimal in-memory fake of the supabase-js query builder covering just
// the operations this service issues (eq/gt/lte/is filters, select, update,
// maybeSingle, and the bare `await` used for the scan query) - same style
// as scout.service.spec.ts's FakeQuery.
type Row = Record<string, unknown>;
type Db = Record<string, Row[]>;

class FakeQuery implements PromiseLike<{ data: unknown; error: null }> {
  private op: 'select' | 'update' = 'select';
  private payload: Row | undefined;
  private filters: Array<['eq' | 'gt' | 'lte' | 'is', string, unknown]> = [];

  constructor(
    private readonly db: Db,
    private readonly table: string,
  ) {}

  select() {
    return this;
  }
  eq(col: string, val: unknown) {
    this.filters.push(['eq', col, val]);
    return this;
  }
  gt(col: string, val: unknown) {
    this.filters.push(['gt', col, val]);
    return this;
  }
  lte(col: string, val: unknown) {
    this.filters.push(['lte', col, val]);
    return this;
  }
  is(col: string, val: unknown) {
    this.filters.push(['is', col, val]);
    return this;
  }
  update(payload: Row) {
    this.op = 'update';
    this.payload = payload;
    return this;
  }

  private matches(row: Row): boolean {
    return this.filters.every(([kind, col, val]) => {
      if (kind === 'eq') return row[col] === val;
      if (kind === 'gt') return (row[col] as string) > (val as string);
      if (kind === 'lte') return (row[col] as string) <= (val as string);
      if (kind === 'is') return (row[col] ?? null) === val;
      return true;
    });
  }

  private execute(): { rows: Row[]; error: null } {
    const table = this.db[this.table] ?? [];
    const matched = table.filter((r) => this.matches(r));
    if (this.op === 'update') {
      matched.forEach((r) => Object.assign(r, this.payload));
    }
    return { rows: matched, error: null };
  }

  maybeSingle() {
    const { rows, error } = this.execute();
    return Promise.resolve({ data: rows[0] ?? null, error });
  }

  then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
    onFulfilled?:
      | ((value: {
          data: unknown;
          error: null;
        }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    const { rows, error } = this.execute();
    return Promise.resolve({ data: rows, error }).then(onFulfilled, onRejected);
  }
}

function makeFakeClient(db: Db) {
  return {
    from: (table: string) => new FakeQuery(db, table),
  };
}

function buildService(db: Db, emailsByUserId: Map<string, string>) {
  const client = makeFakeClient(db);
  const sendEarnBonusExpiringSoonEmail = jest.fn().mockResolvedValue(undefined);
  const supabaseService = {
    getClient: () => client,
    getUserEmailsByIds: jest.fn().mockResolvedValue(emailsByUserId),
  } as unknown as SupabaseService;
  const notificationsService = {
    sendEarnBonusExpiringSoonEmail,
  } as unknown as NotificationsService;
  const configService = {
    get: () => undefined,
  } as unknown as ConfigService;

  const service = new EarnExpiryWarningService(
    supabaseService,
    notificationsService,
    configService,
  );
  return { service, sendEarnBonusExpiringSoonEmail };
}

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

describe('EarnExpiryWarningService', () => {
  it('sends exactly one warning email for a claim artificially set to expire in a few hours', async () => {
    const db: Db = {
      earn_bonus_claims: [
        {
          id: 'claim-1',
          user_id: 'user-1',
          status: 'claimed',
          bonus_amount_usd: 50,
          required_trade_volume_usd: 100,
          expires_at: hoursFromNow(2), // within the 1-day warning window
          expiry_warning_sent_at: null,
        },
      ],
      users: [{ id: 'user-1', display_name: 'Ada' }],
    };
    const { service, sendEarnBonusExpiringSoonEmail } = buildService(
      db,
      new Map([['user-1', 'ada@example.com']]),
    );

    // Run the poller three times in a row, simulating three ticks (or
    // overlapping instances) before the claim ever resolves - the whole
    // point of expiry_warning_sent_at is that this must still fire exactly
    // once, never zero and never more than once.
    await service.run();
    await service.run();
    await service.run();

    expect(sendEarnBonusExpiringSoonEmail).toHaveBeenCalledTimes(1);
    expect(sendEarnBonusExpiringSoonEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ada@example.com',
        name: 'Ada',
        bonusAmount: '50 USDT',
        requiredVolume: '$100',
      }),
    );
    expect(db.earn_bonus_claims[0].expiry_warning_sent_at).toBeTruthy();
  });

  it('does not send a warning for a claim expiring more than a day out', async () => {
    const db: Db = {
      earn_bonus_claims: [
        {
          id: 'claim-2',
          user_id: 'user-2',
          status: 'claimed',
          bonus_amount_usd: 100,
          required_trade_volume_usd: 150,
          expires_at: hoursFromNow(48),
          expiry_warning_sent_at: null,
        },
      ],
      users: [{ id: 'user-2', display_name: 'Grace' }],
    };
    const { service, sendEarnBonusExpiringSoonEmail } = buildService(
      db,
      new Map([['user-2', 'grace@example.com']]),
    );

    await service.run();

    expect(sendEarnBonusExpiringSoonEmail).not.toHaveBeenCalled();
  });

  it('does not re-send once a claim already has expiry_warning_sent_at set', async () => {
    const db: Db = {
      earn_bonus_claims: [
        {
          id: 'claim-3',
          user_id: 'user-3',
          status: 'claimed',
          bonus_amount_usd: 50,
          required_trade_volume_usd: 100,
          expires_at: hoursFromNow(2),
          expiry_warning_sent_at: new Date().toISOString(),
        },
      ],
      users: [{ id: 'user-3', display_name: 'Lin' }],
    };
    const { service, sendEarnBonusExpiringSoonEmail } = buildService(
      db,
      new Map([['user-3', 'lin@example.com']]),
    );

    await service.run();

    expect(sendEarnBonusExpiringSoonEmail).not.toHaveBeenCalled();
  });

  it('does not send a warning for a claim that already unlocked', async () => {
    const db: Db = {
      earn_bonus_claims: [
        {
          id: 'claim-4',
          user_id: 'user-4',
          status: 'unlocked',
          bonus_amount_usd: 50,
          required_trade_volume_usd: 100,
          expires_at: hoursFromNow(2),
          expiry_warning_sent_at: null,
        },
      ],
      users: [{ id: 'user-4', display_name: 'Sam' }],
    };
    const { service, sendEarnBonusExpiringSoonEmail } = buildService(
      db,
      new Map([['user-4', 'sam@example.com']]),
    );

    await service.run();

    expect(sendEarnBonusExpiringSoonEmail).not.toHaveBeenCalled();
  });
});

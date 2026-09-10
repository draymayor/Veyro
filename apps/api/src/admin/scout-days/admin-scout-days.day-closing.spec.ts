// See scout.service.spec.ts for why these two mocks are needed (pre-existing
// Jest config gaps: notifications.service.ts pulls in .tsx email templates,
// @nestjs/schedule ships an ESM-only dist).
jest.mock('../../notifications/notifications.service', () => ({
  NotificationsService: class {},
}));
jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
}));

import { ScoutService } from '../../scout/scout.service';
import { AdminScoutDaysService } from './admin-scout-days.service';
import type { SupabaseService } from '../../supabase/supabase.service';
import type { NotificationsService } from '../../notifications/notifications.service';
import type { WalletService } from '../../wallet/wallet.service';
import type { FxRateService } from '../../fx/fx.service';

// Same minimal in-memory fake supabase-js query builder as
// scout.service.spec.ts (duplicated rather than shared, to keep each spec
// file self-contained) - covers eq/in/lte filters, select-with-count,
// insert, update, maybeSingle/single, and the bare `await` used for
// count-only queries.
type Row = Record<string, unknown>;
type Db = Record<string, Row[]>;

let nextId = 1;
function genId() {
  return `id_${nextId++}`;
}

class FakeQuery implements PromiseLike<{
  data: unknown;
  error: null;
  count?: number;
}> {
  private op: 'select' | 'insert' | 'update' = 'select';
  private payload: Row | Row[] | undefined;
  private filters: Array<['eq' | 'neq' | 'in' | 'lte', string, unknown]> = [];
  private countMode: string | null = null;

  constructor(
    private readonly db: Db,
    private readonly table: string,
  ) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (opts?.count) this.countMode = opts.count;
    return this;
  }
  eq(col: string, val: unknown) {
    this.filters.push(['eq', col, val]);
    return this;
  }
  neq(col: string, val: unknown) {
    this.filters.push(['neq', col, val]);
    return this;
  }
  in(col: string, vals: unknown[]) {
    this.filters.push(['in', col, vals]);
    return this;
  }
  lte(col: string, val: unknown) {
    this.filters.push(['lte', col, val]);
    return this;
  }
  order() {
    return this;
  }
  insert(payload: Row | Row[]) {
    this.op = 'insert';
    this.payload = payload;
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
      if (kind === 'neq') return row[col] !== val;
      if (kind === 'in') return (val as unknown[]).includes(row[col]);
      if (kind === 'lte') return (row[col] as string) <= (val as string);
      return true;
    });
  }

  private defaultsFor(table: string): Row {
    if (table === 'scout_days') {
      return { opened_at: new Date().toISOString(), closed_at: null };
    }
    if (table === 'scout_link_submissions') {
      return { link_status: 'pending', rejection_reason: null };
    }
    return {};
  }

  private execute(): { rows: Row[]; error: null } {
    if (!this.db[this.table]) this.db[this.table] = [];
    const table = this.db[this.table];

    if (this.op === 'insert') {
      const inputs = Array.isArray(this.payload)
        ? this.payload
        : [this.payload!];
      const inserted = inputs.map((r) => {
        const row = { id: genId(), ...this.defaultsFor(this.table), ...r };
        table.push(row);
        return row;
      });
      return { rows: inserted, error: null };
    }

    if (this.op === 'update') {
      const matched = table.filter((r) => this.matches(r));
      matched.forEach((r) => Object.assign(r, this.payload));
      return { rows: matched, error: null };
    }

    return { rows: table.filter((r) => this.matches(r)), error: null };
  }

  maybeSingle() {
    const { rows, error } = this.execute();
    return Promise.resolve({ data: rows[0] ?? null, error });
  }

  single() {
    const { rows, error } = this.execute();
    if (!rows.length) {
      return Promise.resolve({ data: null, error: { message: 'not found' } });
    }
    return Promise.resolve({ data: rows[0], error });
  }

  then<
    TResult1 = { data: unknown; error: null; count?: number },
    TResult2 = never,
  >(
    onFulfilled?:
      | ((value: {
          data: unknown;
          error: null;
          count?: number;
        }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    const { rows, error } = this.execute();
    const result = this.countMode
      ? { data: null, count: rows.length, error }
      : { data: rows, error };
    return Promise.resolve(result).then(onFulfilled, onRejected);
  }
}

function makeFakeClient(db: Db) {
  return {
    from: (table: string) => new FakeQuery(db, table),
  };
}

// Wires ScoutService and AdminScoutDaysService together against one shared
// fake db, exactly as the real app's DI does - so reviewLink's call into
// ScoutService.maybeCloseDay is exercised for real, not stubbed out.
function buildServices(db: Db) {
  const client = makeFakeClient(db);
  const supabaseService = {
    getClient: () => client,
  } as unknown as SupabaseService;
  const scoutNotifications = {} as NotificationsService;
  const scoutService = new ScoutService(supabaseService, scoutNotifications);

  const adminNotifications = {
    sendPushToUser: jest.fn().mockResolvedValue(undefined),
  } as unknown as NotificationsService;
  const walletService = {} as unknown as WalletService;
  const fxRateService = {} as unknown as FxRateService;
  const adminScoutDaysService = new AdminScoutDaysService(
    supabaseService,
    adminNotifications,
    walletService,
    fxRateService,
    scoutService,
  );

  return { scoutService, adminScoutDaysService, client, db };
}

function findDay(db: Db, userId: string) {
  return db.scout_days.find((d) => d.user_id === userId);
}

describe('Scout day closing: real admin review queue flow', () => {
  const ADMIN_ID = 'admin-1';
  const USER_ID = 'user-1';

  beforeEach(() => {
    nextId = 1;
  });

  it('holds the day open through a rejection, and only closes once the replacement is approved and 24h have passed', async () => {
    const db: Db = {
      scout_days: [],
      scout_link_submissions: [],
      notifications: [],
      admin_actions: [],
      platform_settings: [],
    };
    const { scoutService, adminScoutDaysService } = buildServices(db);

    // Open a day and submit 10 links.
    for (let i = 0; i < 10; i++) {
      await scoutService.submitLink(USER_ID, {
        url: `https://example.com/post-${i}`,
      });
    }
    const day = findDay(db, USER_ID)!;
    expect(db.scout_link_submissions).toHaveLength(10);

    // Admin rejects the first link via the real review-queue endpoint logic.
    const links = db.scout_link_submissions.filter(
      (l) => l.scout_day_id === day.id,
    );
    await adminScoutDaysService.reviewLink(
      ADMIN_ID,
      day.id as string,
      links[0].id as string,
      'reject',
      'Not a real post',
    );

    expect(findDay(db, USER_ID)?.status).toBe('in_progress');

    // Admin approves the other 9 originals.
    for (let i = 1; i < 10; i++) {
      await adminScoutDaysService.reviewLink(
        ADMIN_ID,
        day.id as string,
        links[i].id as string,
        'approve',
      );
    }

    // 9 approved, 1 rejected, 0 pending - still short of the 10-approved
    // minimum (and still short on time), so still open.
    expect(findDay(db, USER_ID)?.status).toBe('in_progress');
    const approvedSoFar = db.scout_link_submissions.filter(
      (l) => l.scout_day_id === day.id && l.link_status === 'approved',
    );
    expect(approvedSoFar).toHaveLength(9);

    // Scout submits a replacement for the rejected link.
    await scoutService.submitLink(USER_ID, {
      url: 'https://example.com/replacement',
    });
    expect(findDay(db, USER_ID)?.status).toBe('in_progress');

    // Admin approves the replacement - now 10 approved, 0 pending, but
    // less than 24h has passed since opening, so it must still stay open.
    const replacement = db.scout_link_submissions.find(
      (l) => l.scout_day_id === day.id && l.link_status === 'pending',
    )!;
    await adminScoutDaysService.reviewLink(
      ADMIN_ID,
      day.id as string,
      replacement.id as string,
      'approve',
    );

    expect(findDay(db, USER_ID)?.status).toBe('in_progress');
    const finalApproved = db.scout_link_submissions.filter(
      (l) => l.scout_day_id === day.id && l.link_status === 'approved',
    );
    expect(finalApproved).toHaveLength(10);

    // Now simulate 24h having passed and let the periodic sweep close it -
    // both conditions (10 approved, 0 pending, and time) are finally met.
    (findDay(db, USER_ID) as Row).opened_at = new Date(
      Date.now() - 25 * 60 * 60 * 1000,
    ).toISOString();

    await scoutService.runDueDayClosures();

    const closedDay = findDay(db, USER_ID);
    expect(closedDay?.status).toBe('pending_review');
    expect(closedDay?.closed_at).toBeTruthy();
  });
});

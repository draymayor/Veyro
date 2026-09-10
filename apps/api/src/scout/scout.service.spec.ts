// notifications.service.ts pulls in .tsx email templates, which this
// repo's Jest config isn't set up to resolve (same pre-existing config gap
// worked around in earn.tiers.spec.ts) - mocked out since these tests only
// exercise the scout-day closing logic, never real notification-sending.
jest.mock('../notifications/notifications.service', () => ({
  NotificationsService: class {},
}));

// @nestjs/schedule ships an ESM-only dist that this repo's Jest config
// isn't set up to transform (same class of pre-existing config gap as the
// notifications mock above) - stubbed with a no-op decorator since these
// tests call runDueDayClosures() directly rather than relying on the
// actual cron trigger.
jest.mock('@nestjs/schedule', () => ({
  Cron: () => () => undefined,
}));

import { ScoutService } from './scout.service';
import type { SupabaseService } from '../supabase/supabase.service';
import type { NotificationsService } from '../notifications/notifications.service';

// Minimal in-memory fake of the supabase-js query builder, covering just
// the operations ScoutService actually issues (eq/in/lte filters,
// select-with-count, insert, update, maybeSingle/single, and the bare
// `await` used for count-only queries).
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

function buildService(db: Db) {
  const client = makeFakeClient(db);
  const supabaseService = {
    getClient: () => client,
  } as unknown as SupabaseService;
  const notificationsService = {} as NotificationsService;
  const service = new ScoutService(supabaseService, notificationsService);
  return { service, client };
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

describe('ScoutService day-closing logic', () => {
  beforeEach(() => {
    nextId = 1;
  });

  it('does not close the day after 10 links are submitted quickly - only approval + 24h can close it', async () => {
    const db: Db = {
      scout_days: [],
      scout_link_submissions: [],
      notifications: [],
      platform_settings: [],
    };
    const { service } = buildService(db);
    const userId = 'user-1';

    for (let i = 0; i < 10; i++) {
      await service.submitLink(userId, {
        url: `https://example.com/post-${i}`,
      });
    }

    const day = db.scout_days.find((d) => d.user_id === userId);
    expect(day?.status).toBe('in_progress');
    expect(db.scout_link_submissions).toHaveLength(10);
    expect(
      db.scout_link_submissions.every((l) => l.link_status === 'pending'),
    ).toBe(true);
  });

  it('maybeCloseDay does NOT close the day before 24h even with 10 approved links', async () => {
    const db: Db = {
      scout_days: [],
      scout_link_submissions: [],
      notifications: [],
      platform_settings: [],
    };
    const { service, client } = buildService(db);
    const dayId = genId();
    db.scout_days.push({
      id: dayId,
      user_id: 'user-1',
      status: 'in_progress',
      opened_at: new Date().toISOString(),
    });
    for (let i = 0; i < 10; i++) {
      db.scout_link_submissions.push({
        id: genId(),
        scout_day_id: dayId,
        link_status: 'approved',
      });
    }

    const closed = await service.maybeCloseDay(client as never, dayId);

    expect(closed).toBe(false);
    expect(db.scout_days.find((d) => d.id === dayId)?.status).toBe(
      'in_progress',
    );
  });

  it('maybeCloseDay closes the day once BOTH 10 approved links AND 24h have passed', async () => {
    const db: Db = {
      scout_days: [],
      scout_link_submissions: [],
      notifications: [],
      platform_settings: [],
    };
    const { service, client } = buildService(db);
    const dayId = genId();
    db.scout_days.push({
      id: dayId,
      user_id: 'user-1',
      status: 'in_progress',
      opened_at: hoursAgo(25),
    });
    for (let i = 0; i < 10; i++) {
      db.scout_link_submissions.push({
        id: genId(),
        scout_day_id: dayId,
        link_status: 'approved',
      });
    }

    const closed = await service.maybeCloseDay(client as never, dayId);

    expect(closed).toBe(true);
    const day = db.scout_days.find((d) => d.id === dayId);
    expect(day?.status).toBe('pending_review');
    expect(day?.closed_at).toBeTruthy();
  });

  it('a rejected link does not count toward the minimum and does not close the day, even past 24h', async () => {
    const db: Db = {
      scout_days: [],
      scout_link_submissions: [],
      notifications: [],
      platform_settings: [],
    };
    const { service, client } = buildService(db);
    const dayId = genId();
    db.scout_days.push({
      id: dayId,
      user_id: 'user-1',
      status: 'in_progress',
      opened_at: hoursAgo(30),
    });
    for (let i = 0; i < 9; i++) {
      db.scout_link_submissions.push({
        id: genId(),
        scout_day_id: dayId,
        link_status: 'approved',
      });
    }
    db.scout_link_submissions.push({
      id: genId(),
      scout_day_id: dayId,
      link_status: 'rejected',
    });

    let closed = await service.maybeCloseDay(client as never, dayId);
    expect(closed).toBe(false);
    expect(db.scout_days.find((d) => d.id === dayId)?.status).toBe(
      'in_progress',
    );

    // Scout submits a replacement link and it gets approved, bringing the
    // APPROVED count (not the raw submitted count, which was already 10)
    // to 10.
    db.scout_link_submissions.push({
      id: genId(),
      scout_day_id: dayId,
      link_status: 'approved',
    });

    closed = await service.maybeCloseDay(client as never, dayId);
    expect(closed).toBe(true);
    expect(db.scout_days.find((d) => d.id === dayId)?.status).toBe(
      'pending_review',
    );
  });

  it('maybeCloseDay does NOT close the day while any link is still pending, even with >=10 approved and 24h passed', async () => {
    const db: Db = {
      scout_days: [],
      scout_link_submissions: [],
      notifications: [],
      platform_settings: [],
    };
    const { service, client } = buildService(db);
    const dayId = genId();
    db.scout_days.push({
      id: dayId,
      user_id: 'user-1',
      status: 'in_progress',
      opened_at: hoursAgo(30),
    });
    for (let i = 0; i < 10; i++) {
      db.scout_link_submissions.push({
        id: genId(),
        scout_day_id: dayId,
        link_status: 'approved',
      });
    }
    // An 11th link submitted but not yet reviewed by admin.
    db.scout_link_submissions.push({
      id: genId(),
      scout_day_id: dayId,
      link_status: 'pending',
    });

    const closed = await service.maybeCloseDay(client as never, dayId);

    expect(closed).toBe(false);
    expect(db.scout_days.find((d) => d.id === dayId)?.status).toBe(
      'in_progress',
    );
  });

  it('runDueDayClosures sweeps and closes only in-progress days that are >=24h old and already qualify', async () => {
    const db: Db = {
      scout_days: [],
      scout_link_submissions: [],
      notifications: [],
      platform_settings: [],
    };
    const { service } = buildService(db);

    const dueAndQualified = genId();
    db.scout_days.push({
      id: dueAndQualified,
      user_id: 'user-1',
      status: 'in_progress',
      opened_at: hoursAgo(26),
    });
    for (let i = 0; i < 10; i++) {
      db.scout_link_submissions.push({
        id: genId(),
        scout_day_id: dueAndQualified,
        link_status: 'approved',
      });
    }

    const dueButNotQualified = genId();
    db.scout_days.push({
      id: dueButNotQualified,
      user_id: 'user-2',
      status: 'in_progress',
      opened_at: hoursAgo(26),
    });
    db.scout_link_submissions.push({
      id: genId(),
      scout_day_id: dueButNotQualified,
      link_status: 'approved',
    });

    const notDueYet = genId();
    db.scout_days.push({
      id: notDueYet,
      user_id: 'user-3',
      status: 'in_progress',
      opened_at: hoursAgo(1),
    });
    for (let i = 0; i < 10; i++) {
      db.scout_link_submissions.push({
        id: genId(),
        scout_day_id: notDueYet,
        link_status: 'approved',
      });
    }

    await service.runDueDayClosures();

    expect(db.scout_days.find((d) => d.id === dueAndQualified)?.status).toBe(
      'pending_review',
    );
    expect(db.scout_days.find((d) => d.id === dueButNotQualified)?.status).toBe(
      'in_progress',
    );
    expect(db.scout_days.find((d) => d.id === notDueYet)?.status).toBe(
      'in_progress',
    );
  });
});

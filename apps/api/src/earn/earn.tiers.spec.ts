// notifications.service.ts pulls in .tsx email templates, which this
// repo's Jest config isn't set up to resolve (unrelated pre-existing
// config gap) - mocked out since this test never exercises real
// notification-sending, only the tier-reading logic ahead of it.
jest.mock('../notifications/notifications.service', () => ({
  NotificationsService: class {},
}));

import { EarnService } from './earn.service';

// Regression coverage for the admin-editable Earn tiers
// (platform_settings.earn_tier1_bonus_usd / earn_tier1_required_volume_usd /
// earn_tier2_bonus_usd / earn_tier2_required_volume_usd): getStatus must
// read whatever is currently in platform_settings, live, not a hardcoded
// value - proving the Rate Management edit an admin makes actually reaches
// the Earn page/claim endpoint.

function makeQuery(result: { data: unknown }) {
  const query: Record<string, jest.Mock> = {};
  const chainable = ['select', 'eq', 'in', 'order'];
  for (const method of chainable) {
    query[method] = jest.fn().mockReturnValue(query);
  }
  query.maybeSingle = jest.fn().mockResolvedValue(result);
  // getStatus/getBonusTiers await the query object itself (no terminal
  // call after .in()) - make the query thenable so `await` resolves it.
  (
    query as unknown as { then: PromiseLike<unknown>['then'] }
  ).then = (onFulfilled, onRejected) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  return query;
}

describe('EarnService admin-editable tiers', () => {
  function buildService(settingsRows: { key: string; value: string }[]) {
    const from = jest.fn((table: string) => {
      if (table === 'platform_settings') {
        return makeQuery({ data: settingsRows });
      }
      if (table === 'earn_bonus_claims') {
        return makeQuery({ data: null });
      }
      throw new Error(`Unexpected table in test: ${table}`);
    });

    const supabaseService = { getClient: () => ({ from }) } as any;
    const fxRateService = {} as any;
    const walletService = {} as any;
    const notificationsService = {} as any;
    const configService = {} as any;

    return new EarnService(
      supabaseService,
      fxRateService,
      walletService,
      notificationsService,
      configService,
    );
  }

  it('reads an admin-changed tier value live from platform_settings', async () => {
    const service = buildService([
      { key: 'earn_tier1_bonus_usd', value: '75' },
      { key: 'earn_tier1_required_volume_usd', value: '100' },
      { key: 'earn_tier2_bonus_usd', value: '100' },
      { key: 'earn_tier2_required_volume_usd', value: '150' },
    ]);

    const status = await service.getStatus('user-1');

    expect(status.tiers).toEqual([
      { bonusAmountUsd: 75, requiredTradeVolumeUsd: 100 },
      { bonusAmountUsd: 100, requiredTradeVolumeUsd: 150 },
    ]);
  });

  it('falls back to the original fixed tiers when platform_settings rows are missing', async () => {
    const service = buildService([]);

    const status = await service.getStatus('user-1');

    expect(status.tiers).toEqual([
      { bonusAmountUsd: 50, requiredTradeVolumeUsd: 100 },
      { bonusAmountUsd: 100, requiredTradeVolumeUsd: 150 },
    ]);
  });
});

// provider-health.service.ts pulls in @nestjs/schedule, which this repo's
// Jest config can't transform (unrelated pre-existing ESM issue) - mocked
// out here since this test never exercises real provider-health/tatum
// logic, only the deposit_address_mode short-circuit ahead of it.
jest.mock('../provider-health/provider-health.service', () => ({
  ProviderHealthService: class {},
}));
jest.mock('./tatum.service', () => ({ TatumService: class {} }));
jest.mock('./alchemy.service', () => ({ AlchemyService: class {} }));

import { ConfigService } from '@nestjs/config';
import { CryptoAddressesService } from './crypto-addresses.service';
import { SupabaseService } from '../supabase/supabase.service';
import { TatumService } from './tatum.service';
import { AlchemyService } from './alchemy.service';
import { ProviderHealthService } from '../provider-health/provider-health.service';

// Regression coverage for the deposit_address_mode admin toggle
// (docs/database-schema.md's earn_bonus_claims section / admin-rates
// DEPOSIT_ADDRESS_MODE_SETTING_KEY doc comment): manual mode must return
// the shared crypto_assets.deposit_address without ever touching
// user_crypto_addresses, so that flipping back to automatic leaves no
// lingering per-user row behind.

function makeQuery(result: { data: unknown }) {
  const query: Record<string, jest.Mock> = {};
  const chainable = ['select', 'eq', 'not', 'order', 'limit', 'in'];
  for (const method of chainable) {
    query[method] = jest.fn().mockReturnValue(query);
  }
  query.maybeSingle = jest.fn().mockResolvedValue(result);
  query.single = jest.fn().mockResolvedValue(result);
  return query;
}

describe('CryptoAddressesService deposit_address_mode', () => {
  const asset = {
    is_active: true,
    network_code: 'ethereum',
    deposit_address: '0xFALLBACKADDRESS',
  };

  function buildService(depositAddressModeValue: string | null) {
    const from = jest.fn((table: string) => {
      if (table === 'crypto_assets') return makeQuery({ data: asset });
      if (table === 'platform_settings') {
        return makeQuery({
          data:
            depositAddressModeValue === null
              ? null
              : { value: depositAddressModeValue },
        });
      }
      if (table === 'user_crypto_addresses') {
        // Should never be reached in manual mode.
        return makeQuery({ data: null });
      }
      throw new Error(`Unexpected table in test: ${table}`);
    });

    const supabaseService = {
      getClient: () => ({ from }),
    } as unknown as SupabaseService;
    const configService = { getOrThrow: jest.fn() } as unknown as ConfigService;
    const tatumService = {} as unknown as TatumService;
    const alchemyService = {} as unknown as AlchemyService;
    const providerHealthService = {
      isNetworkAvailable: jest.fn().mockResolvedValue(true),
    } as unknown as ProviderHealthService;

    const service = new CryptoAddressesService(
      supabaseService,
      configService,
      tatumService,
      alchemyService,
      providerHealthService,
    );

    return { service, from };
  }

  it('returns the shared fallback address in manual mode, without reading user_crypto_addresses', async () => {
    const { service, from } = buildService('manual');

    const result = await service.getOrCreateAddress('user-1', 'ETH', 'ERC20');

    expect(result).toEqual({
      address: '0xFALLBACKADDRESS',
      destinationTag: null,
    });
    expect(from).not.toHaveBeenCalledWith('user_crypto_addresses');
  });

  it('falls through to real per-user derivation when mode is automatic (default)', async () => {
    const { service } = buildService('automatic');

    // No xpub configured in this test double, so real derivation throws
    // past the point manual mode would have short-circuited - proves the
    // manual-mode branch was NOT taken.
    await expect(
      service.getOrCreateAddress('user-1', 'ETH', 'ERC20'),
    ).rejects.toBeDefined();
  });

  it('treats a missing platform_settings row as automatic (documented default)', async () => {
    const { service } = buildService(null);

    await expect(
      service.getOrCreateAddress('user-1', 'ETH', 'ERC20'),
    ).rejects.toBeDefined();
  });
});

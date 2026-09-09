import { ConfigService } from '@nestjs/config';
import { CryptoPriceService } from './crypto-price.service';

// Real-behavior coverage for two things reported broken/fixed tonight:
//
// 1. The primary/fallback provider chain (CoinGecko -> CoinPaprika ->
//    CoinMarketCap) actually engages when CoinGecko genuinely fails, and
//    only escalates one step at a time - not a continuous rotation, and
//    never reaches CoinMarketCap while CoinPaprika is still answering.
// 2. The real fix for the "one price refresh secretly costs 18 CoinGecko
//    calls" bug: history (fetchHistory/market_chart, one call per asset)
//    is now cached on its own 1-hour TTL, fully decoupled from the 60s
//    spot-price cache - a second getRates() call after the price cache
//    expires must NOT re-fetch history.
//
// fetch is mocked (no real network calls in a test run), but every
// response shape mocked below was independently confirmed against the
// real live APIs first (see the comments in crypto-price.service.ts) -
// this test proves the fallback/caching LOGIC, not the providers' actual
// uptime.

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function configServiceWith(
  keys: Record<string, string | undefined>,
): ConfigService {
  return {
    get: (key: string) => keys[key],
  } as unknown as ConfigService;
}

describe('CryptoPriceService provider fallback chain', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('falls through to CoinPaprika when CoinGecko fails, without ever calling CoinMarketCap', async () => {
    const calls: string[] = [];
    global.fetch = jest.fn((url: unknown) => {
      const u = String(url);
      calls.push(u);
      if (u.includes('api.coingecko.com')) {
        // Simulates a real 429/quota-exhausted response.
        return Promise.resolve(jsonResponse(429, {}));
      }
      if (u.includes('api.coinpaprika.com')) {
        return Promise.resolve(
          jsonResponse(200, [
            {
              id: 'btc-bitcoin',
              quotes: { USD: { price: 50000, percent_change_24h: 1.5 } },
            },
          ]),
        );
      }
      return Promise.reject(
        new Error(
          `Unexpected fetch to ${u} - CoinMarketCap should never be reached`,
        ),
      );
    });

    const service = new CryptoPriceService(configServiceWith({}));
    const rates = await service.getRates();

    expect(rates.BTC.priceUsd).toBe(50000);
    expect(rates.BTC.change24h).toBe(1.5);
    expect(calls.some((c) => c.includes('api.coingecko.com'))).toBe(true);
    expect(calls.some((c) => c.includes('api.coinpaprika.com'))).toBe(true);
    expect(calls.some((c) => c.includes('coinmarketcap.com'))).toBe(false);
  });

  it('falls through to CoinMarketCap only when both CoinGecko and CoinPaprika fail', async () => {
    const calls: string[] = [];
    global.fetch = jest.fn((url: unknown, init?: RequestInit) => {
      const u = String(url);
      calls.push(u);
      if (u.includes('api.coingecko.com')) {
        return Promise.resolve(jsonResponse(429, {}));
      }
      if (u.includes('api.coinpaprika.com')) {
        return Promise.resolve(jsonResponse(500, {}));
      }
      if (u.includes('pro-api.coinmarketcap.com')) {
        expect(
          (init?.headers as Record<string, string>)['X-CMC_PRO_API_KEY'],
        ).toBe('test-cmc-key');
        return Promise.resolve(
          jsonResponse(200, {
            data: {
              BTC: { quote: { USD: { price: 51000, percent_change_24h: -2 } } },
            },
          }),
        );
      }
      return Promise.reject(new Error(`Unexpected fetch to ${u}`));
    });

    const service = new CryptoPriceService(
      configServiceWith({ COINMARKETCAP_API_KEY: 'test-cmc-key' }),
    );
    const rates = await service.getRates();

    expect(rates.BTC.priceUsd).toBe(51000);
    expect(rates.BTC.change24h).toBe(-2);
    expect(
      calls.filter((c) => c.includes('api.coingecko.com')).length,
    ).toBeGreaterThan(0);
    expect(calls.some((c) => c.includes('api.coinpaprika.com'))).toBe(true);
    expect(calls.some((c) => c.includes('pro-api.coinmarketcap.com'))).toBe(
      true,
    );
  });

  it('serves the last cached rates when every provider fails, rather than throwing', async () => {
    let coingeckoCalls = 0;
    global.fetch = jest.fn((url: unknown) => {
      const u = String(url);
      if (u.includes('api.coingecko.com/api/v3/coins/markets')) {
        coingeckoCalls += 1;
        if (coingeckoCalls === 1) {
          return Promise.resolve(
            jsonResponse(200, [
              {
                id: 'bitcoin',
                current_price: 60000,
                price_change_percentage_24h: 3,
              },
            ]),
          );
        }
        return Promise.resolve(jsonResponse(429, {}));
      }
      if (u.includes('/market_chart')) {
        return Promise.resolve(jsonResponse(200, { prices: [] }));
      }
      if (u.includes('api.coinpaprika.com')) {
        return Promise.resolve(jsonResponse(500, {}));
      }
      return Promise.reject(new Error(`Unexpected fetch to ${u}`));
    });

    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1_000_000);
    const service = new CryptoPriceService(configServiceWith({}));

    const first = await service.getRates();
    expect(first.BTC.priceUsd).toBe(60000);

    // Past the 60s price TTL: forces a refresh attempt, which now fails on
    // every provider (CoinGecko 429, CoinPaprika 500, no CMC key
    // configured at all).
    nowSpy.mockReturnValue(1_000_000 + 61_000);
    const second = await service.getRates();

    expect(second.BTC.priceUsd).toBe(60000); // stale cache served, not a thrown error
  });
});

describe('CryptoPriceService history/price cache decoupling', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not re-fetch history when only the 60s price cache has expired', async () => {
    let marketsCalls = 0;
    let marketChartCalls = 0;

    global.fetch = jest.fn((url: unknown) => {
      const u = String(url);
      if (u.includes('/coins/markets')) {
        marketsCalls += 1;
        return Promise.resolve(
          jsonResponse(200, [
            {
              id: 'bitcoin',
              current_price: 60000,
              price_change_percentage_24h: 1,
            },
          ]),
        );
      }
      if (u.includes('/market_chart')) {
        marketChartCalls += 1;
        return Promise.resolve(jsonResponse(200, { prices: [[0, 100]] }));
      }
      return Promise.reject(new Error(`Unexpected fetch to ${u}`));
    });

    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(2_000_000);
    const service = new CryptoPriceService(configServiceWith({}));

    await service.getRates();
    // 1 markets call + 1 market_chart call per coin (17 coins).
    expect(marketsCalls).toBe(1);
    expect(marketChartCalls).toBe(17);

    // Advance 61s: past the 60s PRICE cache TTL, but nowhere near the 1h
    // HISTORY cache TTL. This is the exact bug scenario reported tonight:
    // a poller refreshing every 60s. Before the fix, this second call
    // would have cost another full 18 CoinGecko requests; now it should
    // cost exactly 1 (the price refresh only).
    nowSpy.mockReturnValue(2_000_000 + 61_000);
    await service.getRates();

    expect(marketsCalls).toBe(2); // price cache expired, refetched
    expect(marketChartCalls).toBe(17); // history cache still fresh, untouched
  });
});

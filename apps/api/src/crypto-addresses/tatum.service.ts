import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithTimeout } from '../common/fetch-with-timeout';

const TATUM_BASE_URL = 'https://api.tatum.io/v3';
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Thin wrapper around Tatum's generateAddressFromXpub REST endpoint
 * (GET /v3/{chain}/address/{xpub}/{index}) - deliberately not the Tatum
 * SDK, since this is the only Tatum call the API needs, following the same
 * fetchWithTimeout pattern already used for CoinGecko/FX (see
 * crypto-price.service.ts). Only ever called with an xpub (public,
 * derivation-only, safe to hold in config) - the master seeds it's derived
 * from never pass through this service or this process at all, see
 * docs/planning-history.md's Crypto Custody section.
 */
@Injectable()
export class TatumService {
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
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithTimeout } from '../../common/fetch-with-timeout';
import { CryptoPriceService } from '../../crypto-price/crypto-price.service';

const TATUM_BASE_URL = 'https://api.tatum.io/v3';
const REQUEST_TIMEOUT_MS = 8_000;

export type NetworkFeeAvailability = 'live' | 'fixed' | 'unavailable';

export interface NetworkFeeRow {
  /** Matches crypto_assets.network / CHAIN_CONFIGS' keys. */
  network: string;
  nativeSymbol: string;
  availability: NetworkFeeAvailability;
  /** Fee for moving the chain's native coin, in that coin's own units. Present only when availability is 'live' or 'fixed'. */
  transferFeeNative?: number;
  transferFeeUsd?: number;
  /** Fee for moving a token on this chain (paid in the native coin, not the token) - only set where it genuinely differs from transferFeeNative (currently just ERC20's USDT/USDC, gasLimit 65_000 vs native's 21_000). */
  tokenTransferFeeNative?: number;
  tokenTransferFeeUsd?: number;
  tokenSymbolsLabel?: string;
  source: string;
  reason?: string;
}

// EVM's gasLimit assumptions, kept identical to apps/sweeper/src/chains/evm.ts
// and apps/consolidator/src/chains/evm.ts (21_000 for a native-coin send,
// 65_000 for an ERC20 token transfer) - this display must show the same
// number those two actually use, not a fresh guess.
const EVM_NATIVE_GAS_LIMIT = 21_000n;
const EVM_TOKEN_GAS_LIMIT = 65_000n;

// TRON has no live fee-estimation call anywhere in this codebase today -
// apps/sweeper/src/chains/tron.ts and apps/consolidator/src/chains/tron.ts
// both use this exact hardcoded bandwidth/energy buffer (1.1 TRX) rather
// than a real live lookup. Shown here as 'fixed', not 'live', for that
// reason - replacing it with a genuine live TRON fee lookup (and wiring
// that into the sweeper/consolidator's actual signing logic, not just this
// display) is tracked as separate follow-up work, not done here.
const TRX_FEE_BUFFER = 1_100_000 / 1e6;

// Confirmed LIVE against Tatum's real GET /v3/blockchain/fee/{chain}
// endpoint (2026-09-05, using the project's real TATUM_API_KEY, not
// assumed from docs): every ticker other than ETH/BTC/LTC/DOGE 400s with
// "chain must be one of the following values: ETH, BTC, LTC, DOGE" -
// tried BSC, MATIC, AVAX, CELO, FLR, FTM, CRO, ETC, KAIA, XDC, and both
// the bare (ARB/OP/BASE) and tatumSubscriptionChain (ETH_ARB/ETH_OP/
// ETH_BASE) forms for the three L2s. This endpoint simply does not cover
// 13 of the 14 EVM networks this platform supports - not a naming/enum
// mismatch to work around (unlike the subscription-chain and
// webhook-chain enums elsewhere in chain-config.ts), a genuine product
// coverage gap. Getting a real live fee for these 13 would mean the same
// direct JSON-RPC gas-price read the sweeper does (ethers +
// EVM_RPC_URL_*), which apps/api doesn't have wired up and wasn't added
// for this display-only feature - so these are shown as 'unavailable'
// rather than guessed at.
const EVM_UNAVAILABLE_REASON =
  "Tatum's fee endpoint only supports ETH, BTC, LTC, DOGE (confirmed live 2026-09-05) - this network isn't covered.";

const EVM_UNAVAILABLE_NETWORKS: Array<{
  network: string;
  nativeSymbol: string;
}> = [
  { network: 'BEP20', nativeSymbol: 'BNB' },
  { network: 'Polygon', nativeSymbol: 'POL' },
  { network: 'Avalanche', nativeSymbol: 'AVAX' },
  { network: 'Celo', nativeSymbol: 'CELO' },
  { network: 'Flare', nativeSymbol: 'FLR' },
  { network: 'Fantom', nativeSymbol: 'FTM' },
  { network: 'Cronos', nativeSymbol: 'CRO' },
  { network: 'Ethereum Classic', nativeSymbol: 'ETC' },
  { network: 'Kaia', nativeSymbol: 'KAIA' },
  { network: 'XDC Network', nativeSymbol: 'XDC' },
  { network: 'Arbitrum', nativeSymbol: 'ETH' },
  { network: 'Optimism', nativeSymbol: 'ETH' },
  { network: 'Base', nativeSymbol: 'ETH' },
];

interface TatumUtxoFeeResponse {
  fast?: number;
  medium?: number;
  slow?: number;
}

interface TatumEvmFeeResponse {
  fast?: number;
  medium?: number;
  slow?: number;
  baseFee?: number;
}

/**
 * Live network-fee display for Rate Management's Platform Settings area -
 * read-only, never admin-editable, since these are real external network
 * costs Veyro doesn't control. One number per chain represents BOTH what a
 * user withdrawal currently costs to send and what a sweep currently costs
 * to consolidate - the same real on-chain cost, just triggered by two
 * different internal events (see apps/sweeper and apps/consolidator).
 *
 * Deliberately reuses, rather than re-derives, the exact fee sources
 * already proven live tonight:
 *  - BTC/LTC/DOGE: the same Tatum GET /v3/blockchain/fee/{chain} endpoint
 *    and sats/byte formula apps/sweeper/src/chains/utxo-tatum-provider.ts
 *    and utxo.ts already use (confirmed live: satoshis per byte).
 *  - EVM (ETH only - see EVM_UNAVAILABLE_NETWORKS above): the same
 *    endpoint, confirmed live to return gas price in wei (matching
 *    ethers.js's feeData.gasPrice convention, the same unit the sweeper's
 *    direct RPC read uses), combined with the same 21_000/65_000 gasLimit
 *    constants EvmAdapter.sweepToken/sweepNative use.
 *  - TRX: the same fixed buffer apps/sweeper/apps/consolidator's tron.ts
 *    files use today (see TRX_FEE_BUFFER above) - honestly labeled
 *    'fixed', not 'live', since no live TRON fee call exists yet anywhere
 *    in this codebase.
 *  - USD conversion: apps/api's own existing CryptoPriceService (already
 *    injected elsewhere in this same admin/rates module), the same
 *    CoinGecko-backed live price source AdminRatesService's crypto-margin
 *    section already uses - not a new price lookup.
 */
@Injectable()
export class NetworkFeesService {
  private readonly logger = new Logger(NetworkFeesService.name);
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly cryptoPriceService: CryptoPriceService,
  ) {
    this.apiKey = this.configService.getOrThrow<string>('TATUM_API_KEY');
  }

  async getNetworkFees(): Promise<{ asOf: string; fees: NetworkFeeRow[] }> {
    const prices = await this.cryptoPriceService.getRates();

    const [bitcoin, litecoin, dogecoin, erc20] = await Promise.all([
      this.getUtxoFeeRow('Bitcoin', 'BTC', 'p2wpkh', prices.BTC?.priceUsd),
      this.getUtxoFeeRow('Litecoin', 'LTC', 'p2wpkh', prices.LTC?.priceUsd),
      this.getUtxoFeeRow('Dogecoin', 'DOGE', 'p2pkh', prices.DOGE?.priceUsd),
      this.getEvmFeeRow(prices.ETH?.priceUsd),
    ]);

    const trc20: NetworkFeeRow = {
      network: 'TRC20',
      nativeSymbol: 'TRX',
      availability: 'fixed',
      transferFeeNative: TRX_FEE_BUFFER,
      transferFeeUsd: prices.TRX?.priceUsd
        ? TRX_FEE_BUFFER * prices.TRX.priceUsd
        : undefined,
      source:
        'Fixed bandwidth/energy buffer (apps/sweeper & apps/consolidator tron.ts) - no live TRON fee call exists yet.',
      reason:
        'TRON has no live fee-estimation call in this codebase today. Tracked as separate follow-up work to add one (Tatum account-resource/energy-price endpoints) and wire it into actual signing, not just this display.',
    };

    const unavailable: NetworkFeeRow[] = EVM_UNAVAILABLE_NETWORKS.map(
      ({ network, nativeSymbol }) => ({
        network,
        nativeSymbol,
        availability: 'unavailable',
        source: 'Tatum GET /v3/blockchain/fee/{chain}',
        reason: EVM_UNAVAILABLE_REASON,
      }),
    );

    return {
      asOf: new Date().toISOString(),
      fees: [bitcoin, litecoin, dogecoin, trc20, erc20, ...unavailable],
    };
  }

  // Mirrors apps/sweeper/src/chains/utxo.ts's real-sweep vbyte formula
  // exactly (estimatedVbytes = inputs*inputVbytes + outputVbytes + 10),
  // evaluated for a single representative input/output (a real address's
  // actual UTXO count varies; this shows the per-input marginal cost the
  // same way withdrawal/sweep sizing already reasons about it) - same
  // p2wpkh/p2pkh vbyte constants, same feeRate fallback chain
  // (medium ?? fast ?? 10).
  private async getUtxoFeeRow(
    network: string,
    nativeSymbol: string,
    addressType: 'p2wpkh' | 'p2pkh',
    usdPrice: number | undefined,
  ): Promise<NetworkFeeRow> {
    const source = `Tatum GET /v3/blockchain/fee/${nativeSymbol}`;
    try {
      const res = await fetchWithTimeout(
        `${TATUM_BASE_URL}/blockchain/fee/${nativeSymbol}`,
        { headers: { 'x-api-key': this.apiKey } },
        REQUEST_TIMEOUT_MS,
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as TatumUtxoFeeResponse;
      const feeRateSatsPerByte = data.medium ?? data.fast ?? 10;

      const [inputVbytes, outputVbytes] =
        addressType === 'p2pkh' ? [148, 34] : [68, 31];
      const estimatedVbytes = 1 * inputVbytes + outputVbytes + 10;
      const feeSats = Math.ceil(estimatedVbytes * feeRateSatsPerByte);
      const feeNative = feeSats / 1e8;

      return {
        network,
        nativeSymbol,
        availability: 'live',
        transferFeeNative: feeNative,
        transferFeeUsd: usdPrice ? feeNative * usdPrice : undefined,
        source,
      };
    } catch (err) {
      this.logger.error(
        `Network fee lookup failed for ${network}: ${(err as Error).message}`,
      );
      return {
        network,
        nativeSymbol,
        availability: 'unavailable',
        source,
        reason: `Live lookup failed: ${(err as Error).message}`,
      };
    }
  }

  // ERC20/Ethereum mainnet only - the one EVM network Tatum's fee endpoint
  // actually covers (see EVM_UNAVAILABLE_NETWORKS above). Confirmed live
  // (2026-09-05) the response's fee values are gas price in wei, the same
  // unit ethers.js's feeData.gasPrice uses - so `gasLimit * gasPriceWei`
  // here is the identical formula EvmAdapter.sweepNative/sweepToken run,
  // just against Tatum's REST endpoint instead of a direct RPC call (this
  // app has no ethers dependency or EVM_RPC_URL_* config, deliberately not
  // added just for a read-only display).
  private async getEvmFeeRow(
    usdPrice: number | undefined,
  ): Promise<NetworkFeeRow> {
    const network = 'ERC20';
    const nativeSymbol = 'ETH';
    const source = 'Tatum GET /v3/blockchain/fee/ETH';
    try {
      const res = await fetchWithTimeout(
        `${TATUM_BASE_URL}/blockchain/fee/ETH`,
        { headers: { 'x-api-key': this.apiKey } },
        REQUEST_TIMEOUT_MS,
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as TatumEvmFeeResponse;
      const gasPriceWei = BigInt(
        Math.round(data.medium ?? data.fast ?? data.baseFee ?? 0),
      );

      const nativeFeeWei = EVM_NATIVE_GAS_LIMIT * gasPriceWei;
      const tokenFeeWei = EVM_TOKEN_GAS_LIMIT * gasPriceWei;
      const transferFeeNative = Number(nativeFeeWei) / 1e18;
      const tokenTransferFeeNative = Number(tokenFeeWei) / 1e18;

      return {
        network,
        nativeSymbol,
        availability: 'live',
        transferFeeNative,
        transferFeeUsd: usdPrice ? transferFeeNative * usdPrice : undefined,
        tokenTransferFeeNative,
        tokenTransferFeeUsd: usdPrice
          ? tokenTransferFeeNative * usdPrice
          : undefined,
        tokenSymbolsLabel: 'USDT/USDC',
        source,
      };
    } catch (err) {
      this.logger.error(
        `Network fee lookup failed for ${network}: ${(err as Error).message}`,
      );
      return {
        network,
        nativeSymbol,
        availability: 'unavailable',
        source,
        reason: `Live lookup failed: ${(err as Error).message}`,
      };
    }
  }
}

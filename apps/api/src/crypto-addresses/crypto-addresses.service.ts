import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { TatumService } from './tatum.service';
import { CHAIN_CONFIGS, ChainConfig } from './chain-config';

// Every network key sharing a given addressGroup (e.g. every EVM chain
// shares 'evm-shared') - precomputed once so reuse/index-allocation queries
// can match "any network in my group" instead of one exact network string.
const NETWORKS_BY_ADDRESS_GROUP: Record<string, string[]> = {};
for (const [network, config] of Object.entries(CHAIN_CONFIGS)) {
  const group = config.addressGroup ?? network;
  (NETWORKS_BY_ADDRESS_GROUP[group] ??= []).push(network);
}

export interface CryptoDepositAddress {
  address: string;
  destinationTag: string | null;
}

// XRPL destination tags are an unsigned 32-bit integer.
const MAX_DESTINATION_TAG = 4_294_967_295;
const MAX_INSERT_ATTEMPTS = 5;

// Sentinel telling a create*Address loop "this specific conflict is yours
// to resolve by retrying with a fresh value" - see insertOrReturnExisting.
const RETRY = Symbol('retry');

type Client = ReturnType<SupabaseService['getClient']>;

/**
 * Get-or-create per-user crypto deposit addresses (docs/database-schema.md's
 * user_crypto_addresses, docs/product-rules.md rule 16). Generated lazily,
 * the first time a user needs one (Deposit Crypto / Sell Crypto for that
 * asset) - never pre-generated for every user upfront.
 */
@Injectable()
export class CryptoAddressesService {
  private readonly logger = new Logger(CryptoAddressesService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
    private readonly tatumService: TatumService,
  ) {}

  // `displayNetwork` is crypto_assets.network's user-facing display string
  // (e.g. "Ethereum (ERC20)", "Polygon PoS") - what the frontend shows and
  // sends. It is NOT used for chain derivation or stored in
  // user_crypto_addresses: crypto_assets.network_code is resolved from it
  // first, and that internal identifier (matching CHAIN_CONFIGS' keys) is
  // what everything downstream - derivation, address reuse, and
  // user_crypto_addresses.network, which the sweeper also reads - actually
  // uses. See docs/planning-history.md's Sweeper section for why the two
  // were split apart.
  async getOrCreateAddress(
    userId: string,
    symbol: string,
    displayNetwork: string,
  ): Promise<CryptoDepositAddress> {
    const client = this.supabaseService.getClient();

    const { data: asset } = await client
      .from('crypto_assets')
      .select('is_active, network_code')
      .eq('symbol', symbol)
      .eq('network', displayNetwork)
      .maybeSingle();

    if (!asset?.is_active) {
      throw new BadRequestException('That asset/network is not supported.');
    }

    const networkCode = asset.network_code as string;
    const chainConfig = CHAIN_CONFIGS[networkCode];
    if (!chainConfig) {
      throw new BadRequestException('Unsupported asset/network.');
    }

    const { data: existing } = await client
      .from('user_crypto_addresses')
      .select('address, destination_tag')
      .eq('user_id', userId)
      .eq('symbol', symbol)
      .eq('network', networkCode)
      .maybeSingle();

    if (existing) {
      return {
        address: existing.address as string,
        destinationTag: (existing.destination_tag as string | null) ?? null,
      };
    }

    return chainConfig.derivationStyle === 'shared-tag'
      ? this.createSharedTagAddress(
          client,
          userId,
          symbol,
          networkCode,
          chainConfig,
        )
      : this.createDerivedAddress(
          client,
          userId,
          symbol,
          networkCode,
          chainConfig,
        );
  }

  // BTC/LTC/DOGE/TRON/EVM: derive from the chain's master xpub via
  // Tatum. A user who already has an address anywhere in this chain's
  // addressGroup (e.g. an Arbitrum address from a prior USDT deposit, which
  // is the identical address on every other EVM network) gets that same
  // address back, instead of burning a second derivation index - and a
  // second on-chain address to eventually sweep - on the same person.
  private async createDerivedAddress(
    client: Client,
    userId: string,
    symbol: string,
    network: string,
    chainConfig: ChainConfig,
  ): Promise<CryptoDepositAddress> {
    const addressGroup = chainConfig.addressGroup ?? network;
    const groupNetworks = NETWORKS_BY_ADDRESS_GROUP[addressGroup];

    const { data: sameChainRow } = await client
      .from('user_crypto_addresses')
      .select('address, derivation_index')
      .eq('user_id', userId)
      .in('network', groupNetworks)
      .not('derivation_index', 'is', null)
      .limit(1)
      .maybeSingle();

    // Fast path: this user already has an address anywhere in this
    // addressGroup - every symbol on a shared network (ETH+USDT+POL+USDC
    // all on ERC20, TRX+USDT on TRC20, BNB+USDT on BEP20, ...) legitimately
    // reuses the SAME address+index, so a second/third/fourth symbol row
    // here is expected, not a conflict - see insertOrReturnExisting.
    if (sameChainRow) {
      const result = await this.insertOrReturnExisting(
        client,
        userId,
        symbol,
        network,
        {
          address: sameChainRow.address as string,
          derivationIndex: sameChainRow.derivation_index as number,
        },
      );
      // Same physical address as an existing row for this user - webhook
      // coverage (or lack of it) was already decided when that first row
      // was created. Just propagate it, never a fresh Tatum call here.
      await this.ensureWebhookSubscription(
        client,
        result.address,
        chainConfig.tatumSubscriptionChain,
      );
      return result;
    }

    const xpub = this.configService.getOrThrow<string>(chainConfig.configKey);
    const index = await this.reserveDerivationIndex(
      client,
      userId,
      addressGroup,
    );
    const address = await this.tatumService.generateAddressFromXpub(
      chainConfig.tatumChain!,
      xpub,
      index,
    );

    const result = await this.insertOrReturnExisting(
      client,
      userId,
      symbol,
      network,
      { address, derivationIndex: index },
    );
    // A genuinely new physical address (or - on the losing side of a rare
    // concurrent-insert race for this exact user/symbol/network - one a
    // parallel request just created). Either way this is the first point
    // this address could need webhook coverage registered.
    await this.ensureWebhookSubscription(
      client,
      result.address,
      chainConfig.tatumSubscriptionChain,
    );
    return result;
  }

  // Registers Tatum webhook coverage for one physical deposit address, at
  // most once ever - never per-symbol. Multiple user_crypto_addresses rows
  // can share one address (every symbol on a shared EVM network), so this
  // first checks whether ANY row for this exact address already carries a
  // tatum_subscription_id and, if so, returns immediately: another symbol
  // on the same address (or a concurrent request for the same brand-new
  // address) already handled it, or already tried and there's nothing new
  // to do. Only reaches the real Tatum call when no row for this address
  // has a subscription id yet.
  //
  // This is intentionally not perfectly race-free against two truly
  // simultaneous first-time requests for the same brand-new address (both
  // could see "no subscription yet" and both call Tatum) - but Tatum's own
  // API enforces at most one active ADDRESS_TRANSACTION subscription per
  // address, so the loser's create call fails harmlessly (caught,
  // logged, treated as "not covered by this call") rather than wasting a
  // second one of the account's 5 real slots.
  private async ensureWebhookSubscription(
    client: Client,
    address: string,
    tatumSubscriptionChain: string | undefined,
  ): Promise<void> {
    // No valid Tatum ADDRESS_TRANSACTION `attr.chain` value exists for this
    // chain (e.g. Ethereum Classic, XDC Network) - a genuine product gap,
    // not a bug, so this address stays on the manual-check path
    // permanently, without ever making a Tatum call for it.
    if (!tatumSubscriptionChain) return;

    const { data: covered } = await client
      .from('user_crypto_addresses')
      .select('tatum_subscription_id')
      .eq('address', address)
      .not('tatum_subscription_id', 'is', null)
      .limit(1)
      .maybeSingle();

    if (covered) return;

    const webhookUrl =
      this.configService.getOrThrow<string>('TATUM_WEBHOOK_URL');
    const subscriptionId = await this.tatumService.createAddressSubscription(
      tatumSubscriptionChain,
      address,
      webhookUrl,
    );
    if (!subscriptionId) return; // cap exhausted or request failed - stays on the manual-check path, logged inside TatumService already

    const { error } = await client
      .from('user_crypto_addresses')
      .update({ tatum_subscription_id: subscriptionId })
      .eq('address', address);

    if (error) {
      // The subscription is real and live on Tatum's side even though we
      // failed to record it - it will fire against an address we can no
      // longer identify as "covered" from this table, so the webhook
      // receiver's own address lookup (by raw address value, not by this
      // flag) still credits correctly; only the admin-facing coverage
      // indicator undercounts until this is investigated.
      this.logger.error(
        `Tatum subscription ${subscriptionId} created for ${address} but saving tatum_subscription_id failed: ${error.message}`,
      );
    }
  }

  // Gets this user's already-reserved derivation index for this address
  // group, or atomically reserves a fresh one.
  // user_derivation_index_reservations (one row per (user, addressGroup))
  // is what actually enforces "no two DIFFERENT users ever share a
  // derivation index within an address group" now - decoupled from
  // user_crypto_addresses, which legitimately holds MULTIPLE rows (one
  // per symbol) at that same shared index for a single user. The old
  // approach enforced that invariant with a unique index directly on
  // user_crypto_addresses(network, derivation_index), which had no way to
  // distinguish "a different user took this index" (a real conflict) from
  // "this same user's second symbol on this network" (expected, safe) -
  // it rejected both identically, which is the bug this replaces.
  private async reserveDerivationIndex(
    client: Client,
    userId: string,
    addressGroup: string,
  ): Promise<number> {
    const { data: existing } = await client
      .from('user_derivation_index_reservations')
      .select('derivation_index')
      .eq('user_id', userId)
      .eq('address_group', addressGroup)
      .maybeSingle();

    if (existing) return existing.derivation_index as number;

    for (let attempt = 0; attempt < MAX_INSERT_ATTEMPTS; attempt++) {
      const { data: maxRow } = await client
        .from('user_derivation_index_reservations')
        .select('derivation_index')
        .eq('address_group', addressGroup)
        .order('derivation_index', { ascending: false })
        .limit(1)
        .maybeSingle();
      const index = maxRow ? (maxRow.derivation_index as number) + 1 : 0;

      const { data, error } = await client
        .from('user_derivation_index_reservations')
        .insert({
          user_id: userId,
          address_group: addressGroup,
          derivation_index: index,
        })
        .select('derivation_index')
        .single();

      if (!error && data) return data.derivation_index as number;
      if (!this.isUniqueViolation(error)) throw error;

      // PK (user_id, address_group) conflict: a concurrent request for
      // THIS SAME user already reserved an index - use theirs.
      const { data: wonByConcurrentRequest } = await client
        .from('user_derivation_index_reservations')
        .select('derivation_index')
        .eq('user_id', userId)
        .eq('address_group', addressGroup)
        .maybeSingle();
      if (wonByConcurrentRequest) {
        return wonByConcurrentRequest.derivation_index as number;
      }

      // Otherwise: (address_group, derivation_index) conflict - a
      // DIFFERENT user took this global index first. Retry with a fresh
      // one (attempt < MAX_INSERT_ATTEMPTS - 1 falls through to the loop).
    }

    throw new Error(
      `Could not reserve a derivation index for address group ${addressGroup} after ${MAX_INSERT_ATTEMPTS} attempts.`,
    );
  }

  // Shared-address chains only (none currently active - kept generic for a
  // future chain, see chain-config.ts): no derivation, every user shares
  // the same platform address, distinguished by a freshly allocated
  // destination_tag.
  private async createSharedTagAddress(
    client: Client,
    userId: string,
    symbol: string,
    network: string,
    chainConfig: ChainConfig,
  ): Promise<CryptoDepositAddress> {
    const sharedAddress = this.configService.getOrThrow<string>(
      chainConfig.configKey,
    );

    for (let attempt = 0; attempt < MAX_INSERT_ATTEMPTS; attempt++) {
      const destinationTag = String(
        1 + Math.floor(Math.random() * MAX_DESTINATION_TAG),
      );

      const result = await this.insertOrReturnExisting(
        client,
        userId,
        symbol,
        network,
        { address: sharedAddress, destinationTag },
        // A destination_tag collision is genuinely resolved by rolling a
        // fresh one - vanishingly unlikely at this scale, but not the same
        // user/symbol/network race insertOrReturnExisting itself resolves.
        'user_crypto_addresses_destination_tag_unique',
      );
      if (result !== RETRY) return result;
    }

    throw new Error(
      `Could not allocate a destination tag for ${symbol}/${network} after ${MAX_INSERT_ATTEMPTS} attempts.`,
    );
  }

  // Inserts a user_crypto_addresses row, or - if a concurrent request for
  // this exact user/symbol/network won the race first - returns THAT row
  // instead of failing. The (user_id, symbol, network) unique constraint
  // exists specifically to make this race safe (migration
  // 20260826154238's comment says so explicitly), but only if the losing
  // request actually falls back to reading the winner's row instead of
  // surfacing the raw constraint violation - which neither call site here
  // used to do: one had no try/catch at all, the other retried with a new
  // derivation index that could never resolve a user/symbol/network
  // conflict, burning its whole retry budget on live Tatum calls before
  // erroring outright. That was the real cause of the reported slowness
  // and intermittent failures, not a missing read-cache (the read path in
  // getOrCreateAddress already served repeat requests from this table
  // correctly - the bug was only ever in these write paths' race handling).
  //
  // `retryableConstraint`, when given, names a DIFFERENT unique constraint
  // the caller itself can resolve by retrying with a fresh value (a
  // different user racing for the same global derivation index, or a
  // destination_tag collision) - only a violation of THAT named constraint
  // returns the RETRY sentinel; a user/symbol/network conflict always
  // resolves right here regardless of which call site hit it.
  private async insertOrReturnExisting(
    client: Client,
    userId: string,
    symbol: string,
    network: string,
    values: {
      address: string;
      derivationIndex?: number;
      destinationTag?: string;
    },
  ): Promise<CryptoDepositAddress>;
  private async insertOrReturnExisting(
    client: Client,
    userId: string,
    symbol: string,
    network: string,
    values: {
      address: string;
      derivationIndex?: number;
      destinationTag?: string;
    },
    retryableConstraint: string,
  ): Promise<CryptoDepositAddress | typeof RETRY>;
  private async insertOrReturnExisting(
    client: Client,
    userId: string,
    symbol: string,
    network: string,
    values: {
      address: string;
      derivationIndex?: number;
      destinationTag?: string;
    },
    retryableConstraint?: string,
  ): Promise<CryptoDepositAddress | typeof RETRY> {
    try {
      return await this.insertRow(client, userId, symbol, network, values);
    } catch (err) {
      if (!this.isUniqueViolation(err)) throw err;

      if (retryableConstraint && this.isConstraint(err, retryableConstraint)) {
        return RETRY;
      }

      const { data: wonByConcurrentRequest } = await client
        .from('user_crypto_addresses')
        .select('address, destination_tag')
        .eq('user_id', userId)
        .eq('symbol', symbol)
        .eq('network', network)
        .maybeSingle();

      if (!wonByConcurrentRequest) throw err;

      return {
        address: wonByConcurrentRequest.address as string,
        destinationTag:
          (wonByConcurrentRequest.destination_tag as string | null) ?? null,
      };
    }
  }

  private async insertRow(
    client: Client,
    userId: string,
    symbol: string,
    network: string,
    values: {
      address: string;
      derivationIndex?: number;
      destinationTag?: string;
    },
  ): Promise<CryptoDepositAddress> {
    const { data, error } = await client
      .from('user_crypto_addresses')
      .insert({
        user_id: userId,
        symbol,
        network,
        address: values.address,
        derivation_index: values.derivationIndex ?? null,
        destination_tag: values.destinationTag ?? null,
      })
      .select('address, destination_tag')
      .single();

    if (error || !data) {
      throw error ?? new Error('Could not save the generated address.');
    }

    return {
      address: data.address as string,
      destinationTag: (data.destination_tag as string | null) ?? null,
    };
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      (err as { code?: string }).code === '23505'
    );
  }

  // Postgres names the violated constraint in the error message (Postgrest
  // doesn't surface it as a separate field), e.g. `duplicate key value
  // violates unique constraint "user_crypto_addresses_..._key"` - matching
  // against that text is how insertOrReturnExisting tells "a different
  // user took the derivation index I read" apart from "this exact
  // user/symbol/network already exists", which need different handling.
  private isConstraint(err: unknown, constraintName: string): boolean {
    const message =
      typeof err === 'object' && err !== null
        ? ((err as { message?: string }).message ?? '')
        : '';
    return message.includes(constraintName);
  }
}

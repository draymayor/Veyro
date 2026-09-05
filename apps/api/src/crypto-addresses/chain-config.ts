export type DerivationStyle = 'xpub-index' | 'shared-tag';

export interface ChainConfig {
  derivationStyle: DerivationStyle;
  /** Tatum's REST chain path segment (xpub-index chains only). */
  tatumChain?: string;
  /** Env var holding the master xpub (xpub-index) or the shared address (shared-tag). */
  configKey: string;
  /**
   * Chains that share an addressGroup derive from the same master xpub and
   * therefore produce the IDENTICAL address at a given derivation index -
   * true of every EVM-compatible chain, since they all use the same secp256k1
   * address derivation (see docs/planning-history.md's Crypto Custody
   * section: "a single private key produces the identical address across
   * every EVM-compatible chain, that's inherent to the technology"). Address
   * reuse/index-allocation in CryptoAddressesService groups by this instead
   * of by raw network name, so a user gets the same deposit address across
   * every network in the group and indices aren't wasted deriving what is
   * provably the same address twice. Defaults to the config's own key
   * (chainKey) when omitted, i.e. one address group per chain.
   */
  addressGroup?: string;
  /**
   * Which of the sweeper's two schedules this chain's deposit addresses are
   * swept on (docs/planning-history.md's Sweeper section): UTXO chains run
   * on a 12h cadence, everything else (EVM chains, plus the account-model
   * chain TRX which behaves operationally like EVM - fast finality, low
   * fees, no unspent-output consolidation needed) on 6h.
   */
  sweepGroup: 'utxo' | 'evm';
  /**
   * The `attr.chain` value Tatum's POST /v3/subscription (ADDRESS_TRANSACTION)
   * endpoint actually accepts - confirmed live (2026-09-04) to be a
   * COMPLETELY DIFFERENT naming scheme from `tatumChain` above (which is
   * only for /v3/{chain}/address and /v3/{chain}/transaction - e.g. 'tron',
   * 'ethereum'). Passing `tatumChain` here 400s every time with "attr.chain
   * must be one of the following values: ... TRON ... ETH ...", which is
   * exactly what silently made webhookCoverage.slotsUsed stay 0 in
   * production - not because no one had deposited, but because every
   * subscription-creation call had been failing since this feature shipped.
   * Omitted entirely (undefined) for a chain Tatum's ADDRESS_TRANSACTION
   * product doesn't support at all (verified against the full enum
   * Tatum returned, not assumed) - those chains stay permanently on the
   * manual-admin-check path by design, not by bug.
   */
  tatumSubscriptionChain?: string;
  /**
   * The value Tatum's real ADDRESS_TRANSACTION webhook payload puts in its
   * own `chain` field - a THIRD distinct naming scheme from both
   * `tatumChain` and `tatumSubscriptionChain` above. Confirmed live
   * (2026-09-04) via `POST /v3/subscription` then `GET
   * /v3/subscription/{id}` per chain (create, read back the normalized
   * `chain` value, delete - no real funds needed) rather than assumed
   * from `tatumSubscriptionChain` + "-mainnet": several genuinely don't
   * follow that pattern (avalanche-mainnet not avax-mainnet,
   * cronos-mainnet not cro-mainnet, litecoin-mainnet not
   * litecoin-core-mainnet, arbitrum-one-mainnet not arb-one-mainnet).
   * TatumWebhookService's chain-code reverse lookup is keyed from this
   * field, not `tatumChain` - using `tatumChain` here (as the original
   * version of this webhook receiver did) made every real inbound TRON
   * webhook silently no-op on "unrecognized chain", since a real payload
   * carries 'tron-mainnet', never bare 'tron'.
   */
  webhookChain?: string;
  /**
   * The `network` value Alchemy's Address Activity webhook uses, both to
   * create/target a webhook via their Notify API and in the `event.network`
   * field of every real delivery (confirmed against
   * docs.alchemy.com/docs/reference/address-activity-webhook's literal
   * example payload, 2026-09-05) - a single, consistent enum, unlike
   * Tatum's three-different-naming-schemes situation above. Only set for
   * the EVM chains actually activated with Alchemy today (Ethereum,
   * Polygon, BSC, Arbitrum, Base): Alchemy's free tier is a hard 5-webhooks-
   * total cap and each Address Activity webhook covers exactly ONE
   * network (no multi-chain pipeline exists - confirmed against
   * webhook-types docs), so 5 webhooks means 5 of Veyro's 14 EVM chains,
   * not all of them. The remaining EVM chains (and BTC/LTC/DOGE) stay on
   * the manual-admin-check path exactly as before; activating one later is
   * adding a value here plus its webhook id/signing key to config, not a
   * rearchitecture - see AlchemyWebhookModule.
   *
   * PRECEDENCE: where both this and `tatumSubscriptionChain` are set on
   * the same chain (true of all 5 chains below - the Tatum values were
   * never removed, since they remain valid data), `alchemyNetwork` wins:
   * CryptoAddressesService.ensureWebhookCoverage checks this field FIRST,
   * so Tatum's own 5 ADDRESS_TRANSACTION slots are never spent on a chain
   * Alchemy already covers, leaving all 5 free for TRON (its only real
   * consumer) exactly as before Alchemy was added. This is a deliberate,
   * explicit dispatch, not an implicit fallthrough - see that method.
   */
  alchemyNetwork?: string;
}

const EVM_ADDRESS_GROUP = 'evm-shared';

// Keyed by crypto_assets.network, which is the same string as the
// frontend's CryptoNetwork.label (apps/web/src/lib/crypto/data.ts,
// crypto-withdraw-form.tsx). One entry per CHAIN, not per symbol: a chain
// entry covers every symbol that lives on it (ERC20 covers ETH, USDT-ERC20
// and USDC-ERC20; BEP20 covers BNB, USDT-BEP20 etc), since tokens on a given
// chain share its address space. CryptoAddressesService reuses an existing
// address for a user across symbols (and, for EVM, across every network
// sharing an addressGroup) rather than deriving a fresh one each time.
export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  // --- UTXO chains: one dedicated master xpub each, swept every 12h ---
  Bitcoin: {
    derivationStyle: 'xpub-index',
    tatumChain: 'bitcoin',
    configKey: 'TATUM_BTC_XPUB',
    sweepGroup: 'utxo',
    tatumSubscriptionChain: 'BTC',
    webhookChain: 'bitcoin-mainnet',
  },
  Litecoin: {
    derivationStyle: 'xpub-index',
    tatumChain: 'litecoin',
    configKey: 'TATUM_LTC_XPUB',
    sweepGroup: 'utxo',
    tatumSubscriptionChain: 'LTC',
    // NOT 'litecoin-core-mainnet' despite that being the string in the
    // subscription-creation validation enum - confirmed live this is
    // what the account's `chain` field actually normalizes to.
    webhookChain: 'litecoin-mainnet',
  },
  Dogecoin: {
    derivationStyle: 'xpub-index',
    tatumChain: 'dogecoin',
    configKey: 'TATUM_DOGE_XPUB',
    sweepGroup: 'utxo',
    tatumSubscriptionChain: 'DOGE',
    webhookChain: 'dogecoin-mainnet',
  },

  // --- EVM chains: ALL of these share one master xpub (TATUM_EVM_XPUB) and
  // one addressGroup, swept every 6h. Arbitrum/Optimism/Base are additional
  // network options under ETH/USDT/USDC, not separate top-level coins. ---
  ERC20: {
    derivationStyle: 'xpub-index',
    tatumChain: 'ethereum',
    configKey: 'TATUM_EVM_XPUB',
    addressGroup: EVM_ADDRESS_GROUP,
    sweepGroup: 'evm',
    tatumSubscriptionChain: 'ETH',
    webhookChain: 'ethereum-mainnet',
    alchemyNetwork: 'ETH_MAINNET',
  },
  BEP20: {
    derivationStyle: 'xpub-index',
    tatumChain: 'bsc',
    configKey: 'TATUM_EVM_XPUB',
    addressGroup: EVM_ADDRESS_GROUP,
    sweepGroup: 'evm',
    tatumSubscriptionChain: 'BSC',
    webhookChain: 'bsc-mainnet',
    // Alchemy's own enum is BNB_MAINNET, not BSC_MAINNET - confirmed
    // against their published Network enum (2026-09-05).
    alchemyNetwork: 'BNB_MAINNET',
  },
  Polygon: {
    derivationStyle: 'xpub-index',
    tatumChain: 'polygon',
    configKey: 'TATUM_EVM_XPUB',
    addressGroup: EVM_ADDRESS_GROUP,
    sweepGroup: 'evm',
    tatumSubscriptionChain: 'MATIC',
    webhookChain: 'polygon-mainnet',
    alchemyNetwork: 'MATIC_MAINNET',
  },
  Avalanche: {
    derivationStyle: 'xpub-index',
    tatumChain: 'avalanche-c',
    configKey: 'TATUM_EVM_XPUB',
    addressGroup: EVM_ADDRESS_GROUP,
    sweepGroup: 'evm',
    tatumSubscriptionChain: 'AVAX',
    // NOT 'avax-mainnet' despite that being the subscription-creation
    // enum string - confirmed live the real normalized value is this.
    webhookChain: 'avalanche-mainnet',
  },
  Celo: {
    derivationStyle: 'xpub-index',
    tatumChain: 'celo',
    configKey: 'TATUM_EVM_XPUB',
    addressGroup: EVM_ADDRESS_GROUP,
    sweepGroup: 'evm',
    tatumSubscriptionChain: 'CELO',
    webhookChain: 'celo-mainnet',
  },
  Flare: {
    derivationStyle: 'xpub-index',
    tatumChain: 'flare',
    configKey: 'TATUM_EVM_XPUB',
    addressGroup: EVM_ADDRESS_GROUP,
    sweepGroup: 'evm',
    tatumSubscriptionChain: 'FLR',
    webhookChain: 'flare-mainnet',
  },
  Fantom: {
    derivationStyle: 'xpub-index',
    tatumChain: 'fantom',
    configKey: 'TATUM_EVM_XPUB',
    addressGroup: EVM_ADDRESS_GROUP,
    sweepGroup: 'evm',
    tatumSubscriptionChain: 'FTM',
    webhookChain: 'fantom-mainnet',
  },
  Cronos: {
    derivationStyle: 'xpub-index',
    tatumChain: 'cronos',
    configKey: 'TATUM_EVM_XPUB',
    addressGroup: EVM_ADDRESS_GROUP,
    sweepGroup: 'evm',
    tatumSubscriptionChain: 'CRO',
    // NOT 'cro-mainnet' despite that being the subscription-creation
    // enum string - confirmed live the real normalized value is this.
    webhookChain: 'cronos-mainnet',
  },
  'Ethereum Classic': {
    derivationStyle: 'xpub-index',
    tatumChain: 'ethereum-classic',
    configKey: 'TATUM_EVM_XPUB',
    addressGroup: EVM_ADDRESS_GROUP,
    sweepGroup: 'evm',
    // No ETC value anywhere in Tatum's ADDRESS_TRANSACTION `attr.chain`
    // enum (verified against the full list returned live) - not
    // supported by this Tatum product at all, so left undefined rather
    // than guessing a value that would just 400 the same way 'tron' did.
  },
  Kaia: {
    derivationStyle: 'xpub-index',
    tatumChain: 'kaia',
    configKey: 'TATUM_EVM_XPUB',
    addressGroup: EVM_ADDRESS_GROUP,
    sweepGroup: 'evm',
    tatumSubscriptionChain: 'KAIA',
    webhookChain: 'kaia-mainnet',
  },
  'XDC Network': {
    derivationStyle: 'xpub-index',
    tatumChain: 'xdc',
    configKey: 'TATUM_EVM_XPUB',
    addressGroup: EVM_ADDRESS_GROUP,
    sweepGroup: 'evm',
    // Same as Ethereum Classic above: no XDC value in Tatum's
    // ADDRESS_TRANSACTION enum, not supported by this product.
  },
  Arbitrum: {
    derivationStyle: 'xpub-index',
    // Tatum's v3 REST chain segment for Arbitrum is 'arb', NOT 'arbitrum-one'
    // - the latter 404s. Verified directly against the live API 2026-08-31;
    // 'arb' returns the same address as 'ethereum'/'optimism'/'base' at a
    // given index, as expected for a shared EVM address space.
    tatumChain: 'arb',
    configKey: 'TATUM_EVM_XPUB',
    addressGroup: EVM_ADDRESS_GROUP,
    sweepGroup: 'evm',
    tatumSubscriptionChain: 'ETH_ARB',
    // NOT 'arb-one-mainnet' despite that being the subscription-creation
    // enum string - confirmed live the real normalized value is this.
    webhookChain: 'arbitrum-one-mainnet',
    alchemyNetwork: 'ARB_MAINNET',
  },
  Optimism: {
    derivationStyle: 'xpub-index',
    tatumChain: 'optimism',
    configKey: 'TATUM_EVM_XPUB',
    addressGroup: EVM_ADDRESS_GROUP,
    sweepGroup: 'evm',
    tatumSubscriptionChain: 'ETH_OP',
    webhookChain: 'optimism-mainnet',
    // Not one of the 5 chains activated with Alchemy yet (see
    // alchemyNetwork's doc comment) - stays on the manual-check path.
  },
  Base: {
    derivationStyle: 'xpub-index',
    tatumChain: 'base',
    configKey: 'TATUM_EVM_XPUB',
    addressGroup: EVM_ADDRESS_GROUP,
    sweepGroup: 'evm',
    tatumSubscriptionChain: 'ETH_BASE',
    webhookChain: 'base-mainnet',
    alchemyNetwork: 'BASE_MAINNET',
  },

  // --- TRON: its own master xpub, covers TRX and USDT-TRC20. USDC-TRC20
  // was dropped (docs/planning-history.md's Sweeper section): Circle
  // discontinued USDC on TRON in 2024/2025, and the hardcoded contract
  // this codebase pointed at turned out to be a deprecated "USD Coin Old"
  // token per Tronscan, not current USDC - USDC stays supported on
  // ERC20/Arbitrum/Optimism/Base, unaffected. ---
  TRC20: {
    derivationStyle: 'xpub-index',
    tatumChain: 'tron',
    configKey: 'TATUM_TRON_XPUB',
    sweepGroup: 'evm',
    tatumSubscriptionChain: 'TRON',
    webhookChain: 'tron-mainnet',
  },

  // --- Shared-address, non-HD chains: no derivation, every user shares one
  // platform address, distinguished by a destination_tag/memo (see
  // user_crypto_addresses.destination_tag). No chain currently uses this -
  // XRP and Stellar, the two that did, were dropped (docs/planning-history.md's
  // Sweeper section) for a materially different trust model (Tatum
  // generates their keys server-side, not locally, and they need their own
  // wallet-provider packages) - the mechanism is kept generic and ready for
  // a future shared-address chain that doesn't have that problem.
};

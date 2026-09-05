-- Replaces the static sweep_min_threshold_erc20_token amount with a live,
-- fee-relative rule for ERC20-style stablecoin sweeps (USDT/USDC on
-- ERC20/BEP20/Arbitrum/Optimism/Base - every network keyed to this setting
-- in apps/sweeper/src/coins.ts).
--
-- Found tonight: the static amount was seeded at $25
-- (20260826230218_sweeper_tables.sql) but had drifted to 0.001 in
-- production - genuinely too low to filter anything. Retuning it to
-- another fixed number doesn't actually fix the underlying problem: the
-- token balance is a stablecoin (~1 USD/unit) but the real cost of
-- sweeping it is gas, paid in the chain's native currency (ETH or BNB
-- depending on network), and that native gas price swings by an order of
-- magnitude with network congestion. A flat USD-shaped number goes stale
-- the moment gas conditions change in either direction.
--
-- sweep_fee_multiple_erc20_token replaces it: "sweep only if the token
-- balance's USD value exceeds N times the live-estimated fee's USD
-- value", evaluated at sweep time inside EvmAdapter.sweepToken (using the
-- same feeData.gasPrice lookup + gasLimit=65_000 the sweep itself already
-- computes, converted to USD via apps/sweeper/src/price-feed.ts's
-- CoinGecko lookup for the chain's native coin) rather than compared
-- against a stale pre-fetched number before any fee is even known.
--
-- Default of 5: reconstructs the original team-approved $25 "worth
-- sweeping" judgment under calm gas conditions (65_000 gas * ~10-20 gwei
-- * ~$3,000/ETH ~= $4-5 fee, so 5x ~= $20-25), while scaling correctly
-- the other direction - a 150 gwei congestion spike (~$30 fee) raises the
-- effective bar to ~$150, correctly holding back small deposits exactly
-- when sweeping them would no longer be economical. Admin-retunable
-- without a redeploy, same as the setting it replaces.
--
-- The old sweep_min_threshold_erc20_token row is removed rather than left
-- in place: apps/sweeper/src/coins.ts no longer points any symbol at it,
-- so a stale row would only invite an admin to edit a number that quietly
-- does nothing.
delete from public.platform_settings
where key = 'sweep_min_threshold_erc20_token';

insert into public.platform_settings (key, value)
values ('sweep_fee_multiple_erc20_token', '5')
on conflict (key) do nothing;

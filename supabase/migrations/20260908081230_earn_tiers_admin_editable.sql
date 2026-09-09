-- Earn bonus tiers become admin-editable platform_settings (Rate Management
-- Platform Settings section, same pattern as referral_bonus_usd) instead of
-- the fixed $50/$100 values baked into earn_bonus_claims' original CHECK
-- constraints. Relax those constraints to "any positive amount" so a claim
-- recorded against an admin-changed tier value doesn't get rejected by the
-- old fixed-set check.
alter table public.earn_bonus_claims
  drop constraint if exists earn_bonus_claims_bonus_amount_usd_check,
  drop constraint if exists earn_bonus_claims_required_trade_volume_usd_check;

alter table public.earn_bonus_claims
  add constraint earn_bonus_claims_bonus_amount_usd_check
    check (bonus_amount_usd > 0),
  add constraint earn_bonus_claims_required_trade_volume_usd_check
    check (required_trade_volume_usd > 0);

insert into public.platform_settings (key, value) values
  ('earn_tier1_bonus_usd', '50'),
  ('earn_tier1_required_volume_usd', '100'),
  ('earn_tier2_bonus_usd', '100'),
  ('earn_tier2_required_volume_usd', '150')
on conflict (key) do nothing;

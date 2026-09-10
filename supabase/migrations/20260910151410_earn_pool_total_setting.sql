-- Admin-tunable total size of the Earn bonus pool (docs/database-schema.md's
-- earn_bonus_claims section calls this the "$50,000 pool"), same
-- platform_settings pattern as the earn tier amounts. The Earn page reads
-- this live to show remaining pool balance (total minus bonuses already
-- paid out), rather than hardcoding $50,000 in the frontend.
insert into public.platform_settings (key, value) values
  ('earn_pool_total_usd', '50000')
on conflict (key) do nothing;

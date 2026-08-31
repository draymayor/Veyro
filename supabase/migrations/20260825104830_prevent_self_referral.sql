-- Defense-in-depth guard against a referrer_id = referred_id row. The
-- signup-time attribution paths (handle_new_user() in
-- 20260824160228_referral_attribution.sql, and AuthService.bootstrapOAuth
-- for Google signups) already check referrer_id <> new_user_id before
-- attempting the insert, so this constraint should never actually fire in
-- normal operation. It exists so a future write path that skips that check
-- fails loudly with a constraint violation instead of silently creating a
-- self-referral row. Multi-account abuse (the same person referring a
-- second account they also control) is a different problem and is not
-- addressed here.
alter table public.referrals
  add constraint referrals_no_self_referral check (referrer_id != referred_id);

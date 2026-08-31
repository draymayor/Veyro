-- The two preceding migrations (restore_users_column_grants,
-- relock_withdrawal_pin_columns) used the syntax
-- `grant priv1, priv2, priv3 (col_list) on t to role`, which Postgres
-- parses as: only the LAST privilege before the parens is column-scoped;
-- the earlier ones in the list are granted TABLE-WIDE. That silently
-- granted table-wide SELECT/INSERT to anon/authenticated (exposing the
-- withdrawal_pin_* columns again), then the "relock" revoke used the same
-- broken pattern and wiped SELECT/INSERT/UPDATE from every column on the
-- table, including the ones that were supposed to stay accessible. Each
-- privilege needs its own column list.

revoke select, insert on public.users from anon, authenticated;

grant select (id, country, currency, kyc_status, account_status, referral_code, referred_by,
              created_at, email_verified_at, profile_image_url, withdrawal_pin_set_at, display_name)
  on public.users to anon, authenticated;
grant insert (id, country, currency, kyc_status, account_status, referral_code, referred_by,
              created_at, email_verified_at, profile_image_url, withdrawal_pin_set_at, display_name)
  on public.users to anon, authenticated;
grant update (id, country, currency, kyc_status, account_status, referral_code, referred_by,
              created_at, email_verified_at, profile_image_url, withdrawal_pin_set_at, display_name)
  on public.users to anon, authenticated;

revoke select (withdrawal_pin_hash, withdrawal_pin_failed_attempts, withdrawal_pin_locked_until) on public.users from anon, authenticated;
revoke insert (withdrawal_pin_hash, withdrawal_pin_failed_attempts, withdrawal_pin_locked_until) on public.users from anon, authenticated;
revoke update (withdrawal_pin_hash, withdrawal_pin_failed_attempts, withdrawal_pin_locked_until) on public.users from anon, authenticated;
revoke references (withdrawal_pin_hash, withdrawal_pin_failed_attempts, withdrawal_pin_locked_until) on public.users from anon, authenticated;

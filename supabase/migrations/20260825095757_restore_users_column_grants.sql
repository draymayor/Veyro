-- public.users had zero SELECT/INSERT/UPDATE for anon/authenticated
-- (only DELETE/REFERENCES/TRIGGER/TRUNCATE), discovered while debugging a
-- redirect loop between /home and /verify-email: AppLayout's RLS-scoped
-- profile read was silently returning nothing, so it always treated the
-- user as unverified regardless of actual status. grant_role_privileges.sql
-- originally granted this table-wide; something outside any tracked
-- migration revoked it since.
--
-- NOTE: this statement has a real bug, corrected by
-- 20260825100636_fix_users_column_grant_syntax.sql. In Postgres,
-- `grant priv1, priv2, priv3 (col_list) on t to role` only applies the
-- column list to the LAST privilege before the parens; priv1 and priv2
-- above (select, insert) were actually granted TABLE-WIDE, silently
-- re-exposing the withdrawal_pin_* columns this was never meant to touch.
-- Kept here unmodified because it's what actually ran; do not copy this
-- pattern elsewhere.

grant select, insert, update
  (id, country, currency, kyc_status, account_status, referral_code, referred_by,
   created_at, email_verified_at, profile_image_url, withdrawal_pin_set_at, display_name)
  on public.users
  to anon, authenticated;

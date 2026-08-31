-- NOTE: this statement has the same column-list-scoping bug as
-- 20260825095757_restore_users_column_grants.sql, corrected by
-- 20260825100636_fix_users_column_grant_syntax.sql. `revoke select,
-- insert, update, references (col_list) ...` only column-scopes
-- REFERENCES (the last privilege before the parens); select/insert/update
-- here were actually revoked TABLE-WIDE, which wiped every other
-- column's access too (undoing the migration right before this one).
-- Kept here unmodified because it's what actually ran; do not copy this
-- pattern elsewhere.

revoke select, insert, update, references
  (withdrawal_pin_hash, withdrawal_pin_failed_attempts, withdrawal_pin_locked_until)
  on public.users
  from anon, authenticated;

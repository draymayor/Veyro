revoke select, insert, update, references
  (withdrawal_pin_hash, withdrawal_pin_failed_attempts, withdrawal_pin_locked_until)
  on public.users
  from anon, authenticated;

-- All reads/writes to these three columns now go exclusively through
-- the backend (service_role), which already has full grants from the
-- earlier grant_role_privileges migration. This closes both the
-- information leak (SELECT) and, more seriously, the ability for a
-- logged-in user to directly reset their own lockout state via a
-- client-side update call, bypassing the 5-attempt lockout entirely.

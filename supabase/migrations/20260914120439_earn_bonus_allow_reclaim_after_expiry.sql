
-- Replace the "exactly one claim ever" constraint with "at most one ACTIVE
-- claim at a time". A user whose claim has expired (status = 'expired')
-- must be able to claim again, exactly like a first-time user - the real
-- invariant this program needs is that a user can never hold two
-- concurrent claimed/unlocked rows (which would let them double-dip on
-- the pool), not that they can only ever claim once in their lifetime.
alter table public.earn_bonus_claims
  drop constraint earn_bonus_claims_user_id_key;

-- Partial unique index: blocks a second row while the existing one is
-- still 'claimed' or 'unlocked' (i.e. not yet resolved to 'paid' or
-- 'expired'), but allows a fresh row once the prior one lands in either
-- terminal state. earn.service.ts's insert in claim() already relies on a
-- 23505 unique_violation to turn a race into a ConflictException - this
-- keeps that error path working, just scoped to "already has an active
-- claim" instead of "has ever claimed".
create unique index earn_bonus_claims_one_active_per_user
  on public.earn_bonus_claims (user_id)
  where status in ('claimed', 'unlocked');

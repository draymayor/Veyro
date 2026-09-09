-- Migration drift repair, found during reconciliation (2026-09-09):
-- 20260908181329_support_fix_dangling_policy_and_trigger.sql (already
-- merged to main) created reopen_thread_on_new_message() but never
-- actually rewired the reopen-on-new-message trigger to it. The fix only
-- ever reached this database because the missing DDL was run directly
-- against it, out of band, never captured in migration history - so a
-- fresh environment applying only the merged migration files would still
-- have the old trigger wired to the old, user_id-scoped function (which
-- incorrectly reopens every resolved ticket a user has, not just the one
-- a new message belongs to).
--
-- Written with IF EXISTS guards specifically because this database
-- already has the fix applied out of band (verified live, 2026-09-09:
-- on_support_message_reopen already calls reopen_thread_on_new_message(),
-- and the old trigger/function are already gone here) - this must safely
-- no-op on this database while still correctly repairing any other
-- environment that only ever ran the merged migration files as-is.
drop trigger if exists reopen_support_thread_on_user_message on public.support_messages;

drop function if exists public.reopen_support_thread_on_user_message();

create or replace trigger on_support_message_reopen
  after insert on public.support_messages
  for each row
  execute function public.reopen_thread_on_new_message();

-- Same hardening the original function had (20260824000139) - a trigger
-- function can't be invoked directly via SQL anyway, but keep the posture
-- consistent rather than silently dropping it on replacement.
revoke execute on function public.reopen_thread_on_new_message() from anon, authenticated;

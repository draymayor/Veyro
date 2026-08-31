-- Support Inbox (docs/admin-guide.md): admin needs live Realtime updates
-- on support_threads/support_messages for whichever thread they have open,
-- the same postgres_changes subscription pattern the consumer Support page
-- already uses. Realtime enforces RLS against the subscribing session's
-- own JWT, so without a read policy an admin's browser client would never
-- receive change events for another user's thread, only the RLS-scoped
-- rows it already has via the "select own" policies.
--
-- All writes for admin replies stay backend-only (service role, which
-- bypasses RLS): support_messages has no INSERT policy permitting
-- sender = 'admin' from any client role, only "insert own as user", so a
-- client session can never write an admin-sender row no matter who is
-- signed in. These are read-only additions.
create policy "support_threads admin select" on public.support_threads
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.is_admin
    )
  );

create policy "support_messages admin select" on public.support_messages
  for select using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.is_admin
    )
  );

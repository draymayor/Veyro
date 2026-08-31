-- Adds a lightweight per-user "ticket" wrapper around the existing
-- support_messages thread (docs/context.md: support page redesigned to
-- open with a short issue form and show a status chip, while staying a
-- single ongoing conversation per user rather than multiple discrete
-- tickets). One row per user, created the moment they submit their first
-- message.
create table public.support_threads (
  user_id uuid primary key references public.users(id) on delete cascade,
  category text not null check (category in ('trades', 'wallet', 'account', 'referrals', 'other')),
  subject text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_threads enable row level security;

grant select, insert, update, delete on public.support_threads to anon, authenticated;
grant all on public.support_threads to service_role;

-- Read/open/update own thread only. Update is used both by the user
-- (marking their own thread resolved) and by the reopen trigger below
-- (which runs as the row owner via RLS since it fires from a client-side
-- insert, not a privileged context).
create policy "support_threads select own" on public.support_threads
  for select using (auth.uid() = user_id);
create policy "support_threads insert own" on public.support_threads
  for insert with check (auth.uid() = user_id);
create policy "support_threads update own" on public.support_threads
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- A resolved thread should reopen itself the moment the user sends
-- another message, rather than relying on the client to remember to flip
-- the status back, the same reasoning docs/database-schema.md gives for
-- keeping wallet_transactions and other ledgers backend-enforced rather
-- than client-trusted.
create function public.reopen_support_thread_on_user_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sender = 'user' then
    update public.support_threads
    set status = 'open', updated_at = now()
    where user_id = new.user_id and status <> 'open';
  end if;
  return new;
end;
$$;

create trigger reopen_support_thread_on_user_message
  after insert on public.support_messages
  for each row
  execute function public.reopen_support_thread_on_user_message();

-- Same hardening as the rls_auto_enable() precedent in
-- 0002_rls_policies.sql: this only needs to run as a trigger side effect,
-- never as a directly callable function from a client role.
revoke execute on function public.reopen_support_thread_on_user_message() from anon, authenticated;

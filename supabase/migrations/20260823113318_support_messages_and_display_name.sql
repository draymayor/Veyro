-- One continuous live-chat thread per user with Veyro's admin team
-- (docs/database-schema.md, docs/context.md; no ticket/subject system in
-- V1). Admin replies are written by the backend via service role, which
-- bypasses RLS entirely, so the client-facing policies only ever need to
-- allow a user to act on their own thread.
create table public.support_messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  sender text not null check (sender in ('user', 'admin')),
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index on public.support_messages (user_id, created_at);

alter table public.support_messages enable row level security;

-- Base table-level GRANT, required alongside RLS per docs/supabase-setup.md
-- (RLS filters rows once a role is already allowed to touch the table; it
-- doesn't substitute for the underlying GRANT).
grant select, insert, update, delete on public.support_messages to anon, authenticated;
grant all on public.support_messages to service_role;

-- Read own thread only.
create policy "support_messages select own" on public.support_messages
  for select using (auth.uid() = user_id);

-- Insert into own thread only, and only ever as sender = 'user'. This is
-- what actually prevents a client from ever writing an 'admin' row, no
-- amount of client-side trust required.
create policy "support_messages insert own as user" on public.support_messages
  for insert with check (auth.uid() = user_id and sender = 'user');

-- Update own thread only (used to set read_at when the user views admin
-- replies). Same row-ownership check on both sides so a user can't
-- reassign a message to another user_id via the update.
create policy "support_messages update own" on public.support_messages
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Enable Realtime so the client can subscribe to live admin replies
-- (docs/database-schema.md) instead of polling.
alter publication supabase_realtime add table public.support_messages;

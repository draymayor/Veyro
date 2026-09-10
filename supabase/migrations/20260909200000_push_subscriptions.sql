-- Web Push subscriptions (docs/context.md's PWA/push notifications), one
-- row per browser/device a user has granted notification permission on.
-- Same posture as notifications: only the backend (service role) ever
-- writes here, via the authenticated subscribe/unsubscribe endpoints.

create table public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions select own" on public.push_subscriptions
  for select using (auth.uid() = user_id);

-- No insert/update/delete policies for clients: subscriptions are only
-- ever written by the backend (service role) via the authenticated
-- subscribe/unsubscribe endpoints, same posture as notifications.

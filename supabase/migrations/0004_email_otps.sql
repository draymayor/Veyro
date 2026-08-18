-- Email OTP verification (first-time email/password signups only; Google
-- OAuth accounts are pre-verified by Google and skip this table entirely).
create table public.email_otps (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade,
  email text not null,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index on public.email_otps (email);
create index on public.email_otps (user_id);

-- No RLS policies: service-role/backend-only, same pattern as admin_actions.
alter table public.email_otps enable row level security;

-- Tracks whether the account has completed OTP verification. Null for an
-- email/password signup until the code is confirmed; set immediately for
-- Google OAuth accounts, which never go through this table at all.
alter table public.users add column email_verified_at timestamptz;

-- Populates public.users from auth.users on signup so country (and the
-- currency it determines, per product-rules.md #13) is available right
-- away. The web client passes both as user metadata at signUp() time.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, country, currency)
  values (new.id, new.raw_user_meta_data->>'country', new.raw_user_meta_data->>'currency')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

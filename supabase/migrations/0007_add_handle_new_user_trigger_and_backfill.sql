-- Add missing email_verified_at column
alter table public.users
  add column if not exists email_verified_at timestamptz;

-- Trigger function: sync auth.users -> public.users on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, referral_code, created_at)
  values (
    new.id,
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: create public.users rows for any existing auth.users
-- missing one (includes the real user who signed up while this was broken)
insert into public.users (id, referral_code, created_at)
select
  au.id,
  substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  au.created_at
from auth.users au
left join public.users pu on pu.id = au.id
where pu.id is null;

-- 0007's handle_new_user() only set id/referral_code/created_at, silently
-- leaving country and currency null on every signup. That breaks
-- product-rules.md rule #13 ("wallet currency set at signup based on
-- selected country") — the signup form collects country specifically to
-- set this. Fixes the trigger to copy both from auth.users'
-- raw_user_meta_data (set by the client at signUp() time), and backfills
-- the users who signed up while this was broken.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, country, currency, referral_code, created_at)
  values (
    new.id,
    new.raw_user_meta_data->>'country',
    new.raw_user_meta_data->>'currency',
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

update public.users pu
set country = au.raw_user_meta_data->>'country',
    currency = au.raw_user_meta_data->>'currency'
from auth.users au
where au.id = pu.id
  and pu.country is null
  and au.raw_user_meta_data->>'country' is not null;

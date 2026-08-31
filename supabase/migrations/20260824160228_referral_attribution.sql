-- Referral attribution was never actually wired: users.referred_by was
-- always left null and no row was ever inserted into public.referrals, so
-- every referral count in the product was necessarily frontend placeholder
-- data (apps/web/src/lib/dashboard/placeholder-data.ts). This closes that
-- gap for email/password signup, the referring code travels in
-- raw_user_meta_data (set by the client's signUp() call, the same
-- mechanism 0008 already uses for country/currency), resolved here to the
-- referrer's user id and recorded both on the new user's own row and as a
-- referrals row.
--
-- Google OAuth signup does not go through this path (signInWithOAuth has no
-- equivalent metadata hook before the account is created), so a referral
-- code in the URL is not yet attributed for OAuth signups. That is a known
-- gap, not silently pretended to be solved here.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  referrer_id uuid;
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

  if new.raw_user_meta_data->>'referred_by_code' is not null then
    select id into referrer_id
    from public.users
    where referral_code = new.raw_user_meta_data->>'referred_by_code';

    if referrer_id is not null and referrer_id <> new.id then
      update public.users set referred_by = referrer_id where id = new.id;

      insert into public.referrals (referrer_id, referred_id)
      values (referrer_id, new.id);
    end if;
  end if;

  return new;
end;
$$;

insert into public.platform_settings (key, value) values
  ('crypto_withdrawals_require_approval', 'false')
on conflict (key) do nothing;

alter table public.users
  add column if not exists withdrawals_suspended boolean not null default false;

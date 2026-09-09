
insert into public.platform_settings (key, value) values
  ('deposit_address_mode', 'automatic')
on conflict (key) do nothing;

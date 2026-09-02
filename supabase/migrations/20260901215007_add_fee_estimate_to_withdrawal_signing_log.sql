
alter table public.withdrawal_signing_log
  add column if not exists fee_estimate numeric;

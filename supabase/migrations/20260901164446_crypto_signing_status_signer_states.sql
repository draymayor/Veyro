
alter table public.withdrawals
  drop constraint withdrawals_crypto_signing_status_check;

alter table public.withdrawals
  add constraint withdrawals_crypto_signing_status_check
  check (crypto_signing_status = any (array['awaiting_approval', 'ready_to_sign', 'signing', 'signed', 'sign_failed']));

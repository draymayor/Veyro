alter table public.withdrawals
  add column crypto_signing_status text
    check (crypto_signing_status in ('awaiting_approval', 'ready_to_sign'));

comment on column public.withdrawals.crypto_signing_status is
  'Only meaningful for method=''crypto'' withdrawals that have reached status=''processing''. NULL until then (or for non-crypto methods). ''awaiting_approval'' = signing_mode was ''manual'' when this withdrawal reached processing, needs an explicit admin approve-for-signing action. ''ready_to_sign'' = approved (or signing_mode was ''automatic''), queued for a signer that does not exist yet.';

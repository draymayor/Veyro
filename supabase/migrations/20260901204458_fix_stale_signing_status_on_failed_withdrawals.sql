
update public.withdrawals
set crypto_signing_status = 'sign_failed'
where status = 'failed' and crypto_signing_status = 'ready_to_sign';

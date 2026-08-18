-- Adds purpose to email_otps so password-reset codes and signup-verification
-- codes are fully isolated: a code issued for one purpose can never satisfy
-- a lookup for the other, even for the same user/email.
alter table public.email_otps
  add column purpose text not null default 'signup_verification';

alter table public.email_otps
  add constraint email_otps_purpose_check
  check (purpose in ('signup_verification', 'password_reset'));

create index on public.email_otps (user_id, purpose);

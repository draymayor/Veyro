-- Multi-account, country-conditional bank transfer payout details
-- (docs/product-rules.md rule 19). bank_details varies in shape by country
-- (account number vs. IBAN vs. sort code, etc.), so it stays jsonb rather
-- than a fixed set of columns, and a user may save more than one account
-- with exactly one marked default.
create table public.user_bank_accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  country text not null,
  bank_details jsonb not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.user_bank_accounts (user_id);

-- No RLS policies: service-role/backend-only, same pattern as email_otps
-- and backup_codes. All reads and writes go through the API so the
-- per-country field validation (product-rules.md rule 19) lives in one
-- place rather than being trusted from the client.
alter table public.user_bank_accounts enable row level security;

-- Reconciles local migration files with what is actually live (see
-- 20260826230218_sweeper_tables.sql and 20260830212843_deactivate_dropped_coins.sql
-- for earlier instances of this same pattern). This change was applied
-- directly against the database and recorded under this version/name; this
-- file's content is the verbatim statements pulled from
-- supabase_migrations.schema_migrations for this version.
--
-- Tracks per-user, per-address-group derivation index reservations so
-- concurrent deposit-address generation can't collide on the same index
-- within a group, and drops the now-redundant unique constraints that
-- scoped uniqueness incorrectly.

create table public.user_derivation_index_reservations (
  user_id uuid not null references public.users(id) on delete cascade,
  address_group text not null,
  derivation_index integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, address_group),
  unique (address_group, derivation_index)
);

alter table public.user_derivation_index_reservations enable row level security;

drop index if exists public.user_crypto_addresses_network_derivation_index_unique;

alter table public.user_crypto_addresses
  drop constraint if exists user_crypto_addresses_user_symbol_network_key;

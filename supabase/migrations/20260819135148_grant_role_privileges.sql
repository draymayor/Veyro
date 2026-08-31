-- Grant base table privileges. RLS policies alone are insufficient —
-- Postgres requires the base GRANT before RLS policies can even apply.
-- This was missing since project creation because every prior migration
-- used raw SQL rather than Supabase's dashboard table editor (which
-- auto-grants these).

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- Ensure this applies to any tables created in the future too
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;

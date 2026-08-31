alter table public.users
  add column if not exists is_admin boolean not null default false;

-- Checked server-side by the backend on admin routes/endpoints (per
-- supabase-setup.md's guidance: role claim or checked server-role,
-- never trust a client-side check alone). No client write access to
-- this column, admin status can only ever be set via direct database
-- action or a backend-only admin-granting endpoint later.

update public.users
set is_admin = true
where id = (select id from auth.users where email = 'ogunnubimayowa@gmail.com');

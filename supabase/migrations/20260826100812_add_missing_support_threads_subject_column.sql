-- support_threads was created live without the subject column that
-- 20260824000139_support_threads.sql's create table statement specifies
-- and that the consumer Support page's ticket flow already depends on
-- (support-chat.tsx inserts a subject on open, support_threads select *
-- reads it back). Same class of drift docs/database-schema.md already
-- warns about for handle_new_user: the migration file existing locally
-- does not mean the live database matches it. Table is empty (0 rows), so
-- adding it not null needs no backfill or default.
alter table public.support_threads add column subject text not null;

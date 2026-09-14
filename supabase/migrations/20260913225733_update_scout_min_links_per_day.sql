
-- Raises the Scout program's minimum links-per-day requirement from its
-- original seed value (careers_scout_program.sql) of 10 to 24.
update public.platform_settings
set value = '24'
where key = 'scout_min_links_per_day';

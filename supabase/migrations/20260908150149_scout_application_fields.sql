-- Part E of the Careers/Scout program: the applied scout_applications
-- table only carries status/review bookkeeping, not the actual
-- application form fields (full name, per-platform handles, free-text
-- answers). Added here as structured columns (platforms as jsonb array
-- of {platform, handle}, not one text blob) so the admin review queue
-- can render one row per platform with its handle.
alter table scout_applications
  add column full_name text,
  add column platforms jsonb not null default '[]'::jsonb,
  add column other_platform text,
  add column other_handle text,
  add column motivation text,
  add column can_commit boolean,
  add column commitment_note text;

comment on column scout_applications.platforms is
  'Array of {platform: text, handle: text} for each checked platform (excludes "Other", see other_platform/other_handle).';

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage RLS: unlike card-images/receipts/deposit-proofs, avatars are a
-- public bucket (docs/supabase-setup.md) since they're shown to other
-- users on Leaderboard rows and Referrals activity. Read is open to
-- everyone; write/update/delete are owner-only via folder path
-- ({user_id}/avatar), so read and write need separate policies rather
-- than the single "for all" policy the private buckets use.
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars owner insert" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars owner update" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars owner delete" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

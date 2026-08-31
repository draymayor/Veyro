insert into storage.buckets (id, name, public)
values
  ('card-images', 'card-images', false),
  ('receipts', 'receipts', false),
  ('deposit-proofs', 'deposit-proofs', false)
on conflict (id) do nothing;

-- Storage RLS: users can read/upload only their own files (path convention: {user_id}/{trade_id}/{filename})
create policy "card-images owner access" on storage.objects
  for all using (bucket_id = 'card-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'card-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "receipts owner access" on storage.objects
  for all using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "deposit-proofs owner access" on storage.objects
  for all using (bucket_id = 'deposit-proofs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'deposit-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

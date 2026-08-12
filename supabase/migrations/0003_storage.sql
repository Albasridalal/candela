-- ============================================================================
-- Storage buckets
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Avatars: publicly readable (staff profile images shown in UI), only
-- authenticated users may upload/update/delete.
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_auth_write" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "avatars_auth_update" on storage.objects
  for update using (bucket_id = 'avatars' and auth.role() = 'authenticated');

-- Receipts: private, authenticated read/write only (expense attachments).
create policy "receipts_auth_read" on storage.objects
  for select using (bucket_id = 'receipts' and auth.role() = 'authenticated');

create policy "receipts_auth_write" on storage.objects
  for insert with check (bucket_id = 'receipts' and auth.role() = 'authenticated');

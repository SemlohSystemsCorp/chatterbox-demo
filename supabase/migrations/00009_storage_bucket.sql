-- ============================================================
-- Storage bucket for file attachments
--
-- Creates a public "attachments" bucket. Files are stored
-- under {user_id}/{timestamp}-{random}.{ext}.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', true, 10485760) -- 10 MB
on conflict (id) do nothing;

-- Allow authenticated users to upload
create policy "Authenticated users can upload"
  on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and auth.role() = 'authenticated'
  );

-- Public read access
create policy "Public read access"
  on storage.objects for select
  using (bucket_id = 'attachments');

-- Users can delete their own uploads
create policy "Users can delete own uploads"
  on storage.objects for delete
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Creators can read own profile photos" on storage.objects;
drop policy if exists "Creators can upload own profile photos" on storage.objects;
drop policy if exists "Creators can update own profile photos" on storage.objects;
drop policy if exists "Creators can delete own profile photos" on storage.objects;

create policy "Creators can read own profile photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'creator-profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and cardinality(storage.foldername(name)) = 1
  and storage.filename(name) ~ '^profile-photo\.(jpg|jpeg|png|webp)$'
);

create policy "Creators can upload own profile photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'creator-profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and cardinality(storage.foldername(name)) = 1
  and storage.filename(name) ~ '^profile-photo\.(jpg|jpeg|png|webp)$'
);

create policy "Creators can update own profile photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'creator-profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and cardinality(storage.foldername(name)) = 1
  and storage.filename(name) ~ '^profile-photo\.(jpg|jpeg|png|webp)$'
)
with check (
  bucket_id = 'creator-profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and cardinality(storage.foldername(name)) = 1
  and storage.filename(name) ~ '^profile-photo\.(jpg|jpeg|png|webp)$'
);

create policy "Creators can delete own profile photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'creator-profile-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and cardinality(storage.foldername(name)) = 1
  and storage.filename(name) ~ '^profile-photo\.(jpg|jpeg|png|webp)$'
);

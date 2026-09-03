create table if not exists public.creator_identity (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null unique references public.creators(id) on delete cascade,
  profile_photo_url text,
  display_name text,
  username text,
  bio text,
  languages text[] not null default '{}',
  creator_type text,
  creator_type_other text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_identity_creator_type_check check (creator_type is null or creator_type in ('content_creator', 'influencer', 'ugc_creator', 'digital_creator', 'other'))
);

create index if not exists idx_creator_identity_creator_id on public.creator_identity (creator_id);

create trigger set_creator_identity_updated_at
before update on public.creator_identity
for each row
execute procedure public.handle_updated_at();

alter table public.creator_identity enable row level security;

create policy "Creators can view own identity"
on public.creator_identity
for select
using (exists (
  select 1 from public.creators
  where public.creators.id = creator_identity.creator_id
    and public.creators.auth_user_id = auth.uid()
));

create policy "Creators can insert own identity"
on public.creator_identity
for insert
with check (exists (
  select 1 from public.creators
  where public.creators.id = creator_identity.creator_id
    and public.creators.auth_user_id = auth.uid()
));

create policy "Creators can update own identity"
on public.creator_identity
for update
using (exists (
  select 1 from public.creators
  where public.creators.id = creator_identity.creator_id
    and public.creators.auth_user_id = auth.uid()
))
with check (exists (
  select 1 from public.creators
  where public.creators.id = creator_identity.creator_id
    and public.creators.auth_user_id = auth.uid()
));

create policy "Creators can delete own identity"
on public.creator_identity
for delete
using (exists (
  select 1 from public.creators
  where public.creators.id = creator_identity.creator_id
    and public.creators.auth_user_id = auth.uid()
));

revoke all on public.creator_identity from anon, authenticated;
grant select, insert, delete on public.creator_identity to authenticated;
grant update (
  profile_photo_url,
  display_name,
  username,
  bio,
  languages,
  creator_type,
  creator_type_other
) on public.creator_identity to authenticated;

insert into storage.buckets (id, name, public)
values ('creator-profile-photos', 'creator-profile-photos', false)
on conflict (id) do nothing;

create policy "Creators can read own profile photos"
on storage.objects
for select
to authenticated
using (bucket_id = 'creator-profile-photos' and (storage.foldername(name))[1] = (select auth.uid()::text) and cardinality(storage.foldername(name)) = 2 and (storage.foldername(name))[2] ~ '^profile-photo\.(jpg|jpeg|png|webp)$');

create policy "Creators can upload own profile photos"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'creator-profile-photos' and (storage.foldername(name))[1] = (select auth.uid()::text) and cardinality(storage.foldername(name)) = 2 and (storage.foldername(name))[2] ~ '^profile-photo\.(jpg|jpeg|png|webp)$');

create policy "Creators can update own profile photos"
on storage.objects
for update
to authenticated
using (bucket_id = 'creator-profile-photos' and (storage.foldername(name))[1] = (select auth.uid()::text) and cardinality(storage.foldername(name)) = 2 and (storage.foldername(name))[2] ~ '^profile-photo\.(jpg|jpeg|png|webp)$')
with check (bucket_id = 'creator-profile-photos' and (storage.foldername(name))[1] = (select auth.uid()::text) and cardinality(storage.foldername(name)) = 2 and (storage.foldername(name))[2] ~ '^profile-photo\.(jpg|jpeg|png|webp)$');

create policy "Creators can delete own profile photos"
on storage.objects
for delete
to authenticated
using (bucket_id = 'creator-profile-photos' and (storage.foldername(name))[1] = (select auth.uid()::text) and cardinality(storage.foldername(name)) = 2 and (storage.foldername(name))[2] ~ '^profile-photo\.(jpg|jpeg|png|webp)$');

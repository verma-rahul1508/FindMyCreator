create or replace function public.text_array_has_no_blank_elements(input_values text[])
returns boolean
language sql
immutable
as $$
  select not exists (
    select 1
    from unnest(input_values) as value
    where nullif(btrim(value), '') is null
  );
$$;

create table if not exists public.creator_content_profile (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null unique references public.creators(id) on delete cascade,
  primary_niche text not null,
  primary_niche_other text,
  other_niches text[] not null default '{}',
  other_niches_other text,
  content_formats text[] not null default '{}',
  content_formats_other text,
  content_styles text[] not null default '{}',
  content_styles_other text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_content_profile_primary_niche_required check (nullif(btrim(primary_niche), '') is not null),
  constraint creator_content_profile_other_niches_limit check (cardinality(other_niches) <= 5),
  constraint creator_content_profile_content_formats_required check (cardinality(content_formats) >= 1),
  constraint creator_content_profile_content_formats_no_blank_elements check (public.text_array_has_no_blank_elements(content_formats)),
  constraint creator_content_profile_content_styles_required check (cardinality(content_styles) >= 1),
  constraint creator_content_profile_content_styles_no_blank_elements check (public.text_array_has_no_blank_elements(content_styles)),
  constraint creator_content_profile_primary_other_required check (primary_niche <> 'Other' or nullif(btrim(primary_niche_other), '') is not null),
  constraint creator_content_profile_other_niche_other_required check (not ('Other' = any(other_niches)) or nullif(btrim(other_niches_other), '') is not null),
  constraint creator_content_profile_format_other_required check (not ('Other' = any(content_formats)) or nullif(btrim(content_formats_other), '') is not null),
  constraint creator_content_profile_style_other_required check (not ('Other' = any(content_styles)) or nullif(btrim(content_styles_other), '') is not null)
);

create trigger set_creator_content_profile_updated_at
before update on public.creator_content_profile
for each row
execute procedure public.handle_updated_at();

alter table public.creator_content_profile enable row level security;

create policy "Creators can view own content profile"
on public.creator_content_profile
for select
using (exists (
  select 1 from public.creators
  where public.creators.id = creator_content_profile.creator_id
    and public.creators.auth_user_id = auth.uid()
));

create policy "Creators can insert own content profile"
on public.creator_content_profile
for insert
with check (exists (
  select 1 from public.creators
  where public.creators.id = creator_content_profile.creator_id
    and public.creators.auth_user_id = auth.uid()
));

create policy "Creators can update own content profile"
on public.creator_content_profile
for update
using (exists (
  select 1 from public.creators
  where public.creators.id = creator_content_profile.creator_id
    and public.creators.auth_user_id = auth.uid()
))
with check (exists (
  select 1 from public.creators
  where public.creators.id = creator_content_profile.creator_id
    and public.creators.auth_user_id = auth.uid()
));

create policy "Creators can delete own content profile"
on public.creator_content_profile
for delete
using (exists (
  select 1 from public.creators
  where public.creators.id = creator_content_profile.creator_id
    and public.creators.auth_user_id = auth.uid()
));

revoke all on public.creator_content_profile from anon, authenticated;
grant select, insert, delete on public.creator_content_profile to authenticated;
grant update (
  primary_niche,
  primary_niche_other,
  other_niches,
  other_niches_other,
  content_formats,
  content_formats_other,
  content_styles,
  content_styles_other
) on public.creator_content_profile to authenticated;

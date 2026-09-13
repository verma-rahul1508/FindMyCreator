-- Extend the Admin creator-management data without changing the established
-- admin_list_creators RPC used by Dashboard and Reports.
create or replace function public.admin_list_creators_with_contact(
  p_search text default null, p_status text default null, p_city text default null,
  p_primary_niche text default null, p_creator_type text default null, p_platform text default null,
  p_min_followers bigint default null, p_max_followers bigint default null,
  p_min_completion integer default null, p_max_completion integer default null,
  p_joined_after timestamptz default null, p_joined_before timestamptz default null,
  p_sort text default 'recent', p_limit integer default 25, p_offset integer default 0
)
returns table (
  creator_id uuid, profile_photo_url text, display_name text, username text, full_name text,
  phone_number text, current_city text, primary_niche text, primary_niche_other text,
  creator_type text, platforms jsonb, status text, created_at timestamptz,
  completed_sections integer, total_required_sections integer, total_count bigint
)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select
    listed.creator_id,
    listed.profile_photo_url,
    listed.display_name,
    listed.username,
    listed.full_name,
    creator.phone_number,
    listed.current_city,
    listed.primary_niche,
    listed.primary_niche_other,
    listed.creator_type,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'platform', platform_profile.platform,
          'audience_count', platform_profile.audience_count,
          'is_primary', platform_profile.is_primary,
          'profile_url', nullif(btrim(platform_profile.profile_url), '')
        )
        order by platform_profile.is_primary desc, platform_profile.platform
      )
      from public.creator_social_platforms platform_profile
      where platform_profile.creator_id = listed.creator_id
    ), '[]'::jsonb),
    listed.status,
    listed.created_at,
    listed.completed_sections,
    listed.total_required_sections,
    listed.total_count
  from public.admin_list_creators(
    p_search, p_status, p_city, p_primary_niche, p_creator_type, p_platform,
    p_min_followers, p_max_followers, p_min_completion, p_max_completion,
    p_joined_after, p_joined_before, p_sort, p_limit, p_offset
  ) listed
  join public.creators creator on creator.id = listed.creator_id;
$$;

revoke all on function public.admin_list_creators_with_contact(text,text,text,text,text,text,bigint,bigint,integer,integer,timestamptz,timestamptz,text,integer,integer) from public, anon, authenticated;
grant execute on function public.admin_list_creators_with_contact(text,text,text,text,text,text,bigint,bigint,integer,integer,timestamptz,timestamptz,text,integer,integer) to authenticated;

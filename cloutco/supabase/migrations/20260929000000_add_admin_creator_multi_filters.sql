-- Multi-select filtering for the Admin Creator list. Selected values within a
-- filter are ORed; each populated filter group is ANDed with the others.

create or replace function public.admin_list_creators_with_contact_multi(
  p_search text default null,
  p_statuses text[] default null,
  p_cities text[] default null,
  p_primary_niches text[] default null,
  p_creator_types text[] default null,
  p_platforms text[] default null,
  p_follower_ranges text[] default null,
  p_completion_values integer[] default null,
  p_joined_periods text[] default null,
  p_sort text default 'recent',
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  creator_id uuid, profile_photo_url text, display_name text, username text, full_name text,
  phone_number text, current_city text, primary_niche text, primary_niche_other text,
  creator_type text, platforms jsonb, status text, created_at timestamptz,
  completed_sections integer, total_required_sections integer, last_30_days_views bigint,
  total_count bigint
)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
declare
  v_search text := nullif(btrim(p_search), '');
  v_statuses text[] := array(select distinct lower(btrim(value)) from unnest(coalesce(p_statuses, '{}'::text[])) value where nullif(btrim(value), '') is not null);
  v_cities text[] := array(select distinct lower(btrim(value)) from unnest(coalesce(p_cities, '{}'::text[])) value where nullif(btrim(value), '') is not null);
  v_niches text[] := array(select distinct lower(btrim(value)) from unnest(coalesce(p_primary_niches, '{}'::text[])) value where nullif(btrim(value), '') is not null);
  v_creator_types text[] := array(select distinct lower(btrim(value)) from unnest(coalesce(p_creator_types, '{}'::text[])) value where nullif(btrim(value), '') is not null);
  v_platforms text[] := array(select distinct lower(btrim(value)) from unnest(coalesce(p_platforms, '{}'::text[])) value where nullif(btrim(value), '') is not null);
  v_follower_ranges text[] := array(select distinct lower(btrim(value)) from unnest(coalesce(p_follower_ranges, '{}'::text[])) value where nullif(btrim(value), '') is not null);
  v_completion_values integer[] := array(select distinct value from unnest(coalesce(p_completion_values, '{}'::integer[])) value);
  v_joined_periods text[] := array(select distinct lower(btrim(value)) from unnest(coalesce(p_joined_periods, '{}'::text[])) value where nullif(btrim(value), '') is not null);
  v_sort text := coalesce(nullif(lower(btrim(p_sort)), ''), 'recent');
  v_limit integer := coalesce(p_limit, 25);
  v_offset integer := coalesce(p_offset, 0);
begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  if exists (select 1 from unnest(v_statuses) value where value not in ('pending', 'active', 'rejected')) then raise exception 'Invalid creator status filter'; end if;
  if exists (select 1 from unnest(v_platforms) value where value not in ('instagram', 'facebook', 'youtube')) then raise exception 'Invalid platform filter'; end if;
  if exists (select 1 from unnest(v_follower_ranges) value where value not in ('0-1k', '1k-10k', '10k-50k', '50k-100k', '100k-500k', '500k-1m', '1m-plus')) then raise exception 'Invalid follower range'; end if;
  if exists (select 1 from unnest(v_completion_values) value where value not between 0 and 4) then raise exception 'Invalid completion range'; end if;
  if exists (select 1 from unnest(v_joined_periods) value where value not in ('today', '7-days', '30-days', '90-days')) then raise exception 'Invalid joined date filter'; end if;
  if v_sort not in ('recent', 'oldest', 'name_asc', 'name_desc', 'followers_desc', 'followers_asc', 'completion_desc', 'completion_asc') then raise exception 'Invalid creator sort'; end if;
  if v_limit < 1 or v_limit > 1000 then raise exception 'Limit must be between 1 and 1000'; end if;
  if v_offset < 0 then raise exception 'Offset cannot be negative'; end if;

  return query
  with creator_rows as (
    select creator.id as creator_id, identity_profile.profile_photo_url, identity_profile.display_name, identity_profile.username,
      creator.full_name, creator.email, creator.phone_number, creator.current_city,
      content_profile.primary_niche, content_profile.primary_niche_other, identity_profile.creator_type,
      coalesce(platform_summary.platforms, '[]'::jsonb) as platforms, creator.status, creator.created_at,
      coalesce(platform_summary.max_audience_count, 0) as max_audience_count,
      lower(coalesce(nullif(btrim(identity_profile.display_name), ''), creator.full_name)) as sort_name,
      public.admin_creator_completed_sections(creator.id) as completed_sections
    from public.creators creator
    left join public.creator_identity identity_profile on identity_profile.creator_id = creator.id
    left join public.creator_content_profile content_profile on content_profile.creator_id = creator.id
    left join lateral (
      select jsonb_agg(jsonb_build_object('platform', platform_profile.platform, 'audience_count', platform_profile.audience_count, 'is_primary', platform_profile.is_primary, 'profile_url', nullif(btrim(platform_profile.profile_url), '')) order by platform_profile.is_primary desc, platform_profile.platform) as platforms,
        max(platform_profile.audience_count) as max_audience_count
      from public.creator_social_platforms platform_profile
      where platform_profile.creator_id = creator.id
    ) platform_summary on true
  ), filtered as (
    select row.*
    from creator_rows row
    where (v_search is null or row.full_name ilike '%' || v_search || '%' or row.display_name ilike '%' || v_search || '%' or row.username ilike '%' || v_search || '%' or row.email ilike '%' || v_search || '%' or row.phone_number ilike '%' || v_search || '%')
      and (cardinality(v_statuses) = 0 or row.status = any(v_statuses))
      and (cardinality(v_cities) = 0 or lower(btrim(row.current_city)) = any(v_cities))
      and (cardinality(v_niches) = 0 or lower(btrim(row.primary_niche)) = any(v_niches) or (lower(btrim(row.primary_niche)) = 'other' and lower(btrim(row.primary_niche_other)) = any(v_niches)))
      and (cardinality(v_creator_types) = 0 or lower(btrim(row.creator_type)) = any(v_creator_types))
      and (cardinality(v_platforms) = 0 or exists (select 1 from public.creator_social_platforms platform_filter where platform_filter.creator_id = row.creator_id and platform_filter.platform = any(v_platforms)))
      and (cardinality(v_follower_ranges) = 0 or exists (
        select 1 from unnest(v_follower_ranges) range_filter(value)
        where case range_filter.value
          when '0-1k' then row.max_audience_count between 0 and 1000
          when '1k-10k' then row.max_audience_count between 1000 and 10000
          when '10k-50k' then row.max_audience_count between 10000 and 50000
          when '50k-100k' then row.max_audience_count between 50000 and 100000
          when '100k-500k' then row.max_audience_count between 100000 and 500000
          when '500k-1m' then row.max_audience_count between 500000 and 1000000
          when '1m-plus' then row.max_audience_count >= 1000000
        end
      ))
      and (cardinality(v_completion_values) = 0 or row.completed_sections = any(v_completion_values))
      and (cardinality(v_joined_periods) = 0 or exists (
        select 1 from unnest(v_joined_periods) joined_filter(value)
        where case joined_filter.value
          when 'today' then row.created_at >= date_trunc('day', now())
          when '7-days' then row.created_at >= now() - interval '7 days'
          when '30-days' then row.created_at >= now() - interval '30 days'
          when '90-days' then row.created_at >= now() - interval '90 days'
        end
      ))
  )
  select row.creator_id, row.profile_photo_url, row.display_name, row.username, row.full_name,
    row.phone_number, row.current_city, row.primary_niche, row.primary_niche_other, row.creator_type, row.platforms,
    row.status, row.created_at, row.completed_sections, 4::integer,
    case primary_platform.platform
      when 'instagram' then (select analytics.views_all_content from public.creator_social_analytics_snapshots snapshot join public.creator_instagram_analytics analytics on analytics.snapshot_id = snapshot.id where snapshot.social_platform_id = primary_platform.id and snapshot.platform = 'instagram' and snapshot.is_current order by snapshot.updated_at desc limit 1)
      when 'facebook' then (select analytics.views_total from public.creator_social_analytics_snapshots snapshot join public.creator_facebook_analytics analytics on analytics.snapshot_id = snapshot.id where snapshot.social_platform_id = primary_platform.id and snapshot.platform = 'facebook' and snapshot.is_current order by snapshot.updated_at desc limit 1)
      when 'youtube' then (select analytics.views from public.creator_youtube_analytics analytics where analytics.social_platform_id = primary_platform.id)
      else null
    end,
    count(*) over()
  from filtered row
  left join lateral (
    select platform_profile.id, platform_profile.platform
    from public.creator_social_platforms platform_profile
    where platform_profile.creator_id = row.creator_id and platform_profile.is_primary
    limit 1
  ) primary_platform on true
  order by case when v_sort = 'recent' then row.created_at end desc,
    case when v_sort = 'oldest' then row.created_at end asc,
    case when v_sort = 'name_asc' then row.sort_name end asc,
    case when v_sort = 'name_desc' then row.sort_name end desc,
    case when v_sort = 'followers_desc' then row.max_audience_count end desc,
    case when v_sort = 'followers_asc' then row.max_audience_count end asc,
    case when v_sort = 'completion_desc' then row.completed_sections end desc,
    case when v_sort = 'completion_asc' then row.completed_sections end asc,
    row.creator_id
  limit v_limit offset v_offset;
end;
$$;

revoke all on function public.admin_list_creators_with_contact_multi(text,text[],text[],text[],text[],text[],text[],integer[],text[],text,integer,integer) from public, anon, authenticated;
grant execute on function public.admin_list_creators_with_contact_multi(text,text[],text[],text[],text[],text[],text[],integer[],text[],text,integer,integer) to authenticated;

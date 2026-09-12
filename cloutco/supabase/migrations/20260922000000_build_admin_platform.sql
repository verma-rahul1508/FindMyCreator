-- Admin platform: secure creator review, canonical four-section completion,
-- operational summaries, and audit history. This is intentionally forward-only.

create table if not exists public.admin_creator_status_history (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  changed_by uuid not null references auth.users(id) on delete restrict,
  previous_status text not null check (previous_status in ('pending', 'active', 'rejected')),
  new_status text not null check (new_status in ('pending', 'active', 'rejected')),
  reason text,
  created_at timestamptz not null default now(),
  constraint admin_creator_status_history_changed_status_check check (previous_status <> new_status)
);

create index if not exists admin_creator_status_history_creator_created_at_idx
  on public.admin_creator_status_history(creator_id, created_at desc);
create index if not exists admin_creator_status_history_changed_by_idx
  on public.admin_creator_status_history(changed_by);

alter table public.admin_creator_status_history enable row level security;
revoke all on public.admin_creator_status_history from public, anon, authenticated;

create policy "Active admins can read creator status history"
on public.admin_creator_status_history for select to authenticated
using (public.is_admin());

create policy "Active admins can insert creator status history"
on public.admin_creator_status_history for insert to authenticated
with check (public.is_admin() and changed_by = auth.uid());

-- This function is deliberately admin-only. It centralises the completion
-- definition used by every Admin RPC without changing creator-facing behaviour.
create or replace function public.admin_creator_completed_sections(p_creator_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_completed integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.creators creator
    where creator.id = p_creator_id
      and nullif(btrim(creator.full_name), '') is not null
      and nullif(btrim(creator.email), '') is not null
      and nullif(btrim(creator.phone_number), '') is not null
      and nullif(btrim(creator.current_city), '') is not null
      and creator.date_of_birth is not null
      and nullif(btrim(creator.gender), '') is not null
  ) then v_completed := v_completed + 1; end if;

  if exists (
    select 1 from public.creator_identity identity_profile
    where identity_profile.creator_id = p_creator_id
      and nullif(btrim(identity_profile.display_name), '') is not null
      and nullif(btrim(identity_profile.bio), '') is not null
      and nullif(btrim(identity_profile.creator_type), '') is not null
  ) then v_completed := v_completed + 1; end if;

  if exists (
    select 1 from public.creator_content_profile content_profile
    where content_profile.creator_id = p_creator_id
      and nullif(btrim(content_profile.primary_niche), '') is not null
      and cardinality(content_profile.content_formats) > 0
      and cardinality(content_profile.content_styles) > 0
      and not exists (select 1 from unnest(content_profile.content_formats) value where nullif(btrim(value), '') is null)
      and not exists (select 1 from unnest(content_profile.content_styles) value where nullif(btrim(value), '') is null)
      and (content_profile.primary_niche <> 'Other' or nullif(btrim(content_profile.primary_niche_other), '') is not null)
      and not exists (select 1 from unnest(coalesce(content_profile.other_niches, '{}'::text[])) value where nullif(btrim(value), '') is null)
      and (not ('Other' = any(coalesce(content_profile.other_niches, '{}'::text[]))) or nullif(btrim(content_profile.other_niches_other), '') is not null)
      and (not ('Other' = any(content_profile.content_formats)) or nullif(btrim(content_profile.content_formats_other), '') is not null)
      and (not ('Other' = any(content_profile.content_styles)) or nullif(btrim(content_profile.content_styles_other), '') is not null)
  ) then v_completed := v_completed + 1; end if;

  if exists (
    select 1
    from public.creator_social_platforms platform_profile
    where platform_profile.creator_id = p_creator_id and platform_profile.is_primary
      and not exists (
        select 1 from public.creator_social_platforms invalid_platform
        where invalid_platform.creator_id = p_creator_id
          and (invalid_platform.profile_url !~* '^https?://' or invalid_platform.audience_count < 0)
      )
      and exists (select 1 from public.creator_social_platforms any_platform where any_platform.creator_id = p_creator_id)
      and (
        (platform_profile.platform = 'youtube' and exists (
          select 1 from public.creator_youtube_analytics analytics
          where analytics.social_platform_id = platform_profile.id
            and analytics.views >= 0 and analytics.likes >= 0 and analytics.shares >= 0
            and nullif(btrim(analytics.top_country), '') is not null
        ))
        or (platform_profile.platform = 'instagram' and exists (
          select 1 from public.creator_social_analytics_snapshots snapshot
          join public.creator_instagram_analytics analytics on analytics.snapshot_id = snapshot.id
          where snapshot.social_platform_id = platform_profile.id and snapshot.platform = 'instagram' and snapshot.is_current
            and analytics.views_all_content >= 0 and analytics.net_followers >= 0
            and analytics.interactions >= 0 and analytics.viewers_total >= 0 and analytics.profile_visits >= 0
            and analytics.women_percentage between 0 and 100 and analytics.men_percentage between 0 and 100
            and (select count(*) from public.creator_instagram_top_age_ranges selection where selection.snapshot_id = snapshot.id) between 1 and 2
            and (select count(*) from public.creator_instagram_top_locations selection where selection.snapshot_id = snapshot.id) between 1 and 5
        ))
        or (platform_profile.platform = 'facebook' and exists (
          select 1 from public.creator_social_analytics_snapshots snapshot
          join public.creator_facebook_analytics analytics on analytics.snapshot_id = snapshot.id
          where snapshot.social_platform_id = platform_profile.id and snapshot.platform = 'facebook' and snapshot.is_current
            and analytics.views_total >= 0 and analytics.viewers >= 0 and analytics.engagement_total >= 0 and analytics.net_followers >= 0
            and analytics.women_percentage between 0 and 100 and analytics.men_percentage between 0 and 100
            and (select count(*) from public.creator_facebook_top_age_groups selection where selection.snapshot_id = snapshot.id) = 1
            and (select count(*) from public.creator_facebook_top_locations selection where selection.snapshot_id = snapshot.id) between 1 and 5
        ))
      )
  ) then v_completed := v_completed + 1; end if;

  return v_completed;
end;
$$;

create or replace function public.admin_list_creators(
  p_search text default null, p_status text default null, p_city text default null,
  p_primary_niche text default null, p_creator_type text default null, p_platform text default null,
  p_min_followers bigint default null, p_max_followers bigint default null,
  p_min_completion integer default null, p_max_completion integer default null,
  p_joined_after timestamptz default null, p_joined_before timestamptz default null,
  p_sort text default 'recent', p_limit integer default 25, p_offset integer default 0
)
returns table (
  creator_id uuid, profile_photo_url text, display_name text, username text, full_name text,
  current_city text, primary_niche text, primary_niche_other text,
  creator_type text, platforms jsonb, status text, created_at timestamptz,
  completed_sections integer, total_required_sections integer, total_count bigint
)
language plpgsql stable security definer set search_path = pg_catalog, public
as $$
declare
  v_search text := nullif(btrim(p_search), '');
  v_status text := nullif(lower(btrim(p_status)), '');
  v_city text := nullif(lower(btrim(p_city)), '');
  v_niche text := nullif(lower(btrim(p_primary_niche)), '');
  v_type text := nullif(lower(btrim(p_creator_type)), '');
  v_platform text := nullif(lower(btrim(p_platform)), '');
  v_sort text := coalesce(nullif(lower(btrim(p_sort)), ''), 'recent');
  v_limit integer := coalesce(p_limit, 25);
  v_offset integer := coalesce(p_offset, 0);
begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  if v_status is not null and v_status not in ('pending', 'active', 'rejected') then raise exception 'Invalid creator status filter'; end if;
  if v_platform is not null and v_platform not in ('instagram', 'facebook', 'youtube') then raise exception 'Invalid platform filter'; end if;
  if p_min_followers is not null and p_min_followers < 0 or p_max_followers is not null and p_max_followers < 0 or p_min_followers is not null and p_max_followers is not null and p_min_followers > p_max_followers then raise exception 'Invalid follower range'; end if;
  if p_min_completion is not null and p_min_completion not between 0 and 4 or p_max_completion is not null and p_max_completion not between 0 and 4 or p_min_completion is not null and p_max_completion is not null and p_min_completion > p_max_completion then raise exception 'Invalid completion range'; end if;
  if p_joined_after is not null and p_joined_before is not null and p_joined_after > p_joined_before then raise exception 'Invalid joined date range'; end if;
  if v_sort not in ('recent','oldest','name_asc','name_desc','followers_desc','followers_asc','completion_desc','completion_asc') then raise exception 'Invalid creator sort'; end if;
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
      select jsonb_agg(jsonb_build_object('platform', platform_profile.platform, 'audience_count', platform_profile.audience_count, 'is_primary', platform_profile.is_primary) order by platform_profile.is_primary desc, platform_profile.platform) as platforms,
        max(platform_profile.audience_count) as max_audience_count
      from public.creator_social_platforms platform_profile where platform_profile.creator_id = creator.id
    ) platform_summary on true
  ), filtered as (
    select row.* from creator_rows row where
      (v_search is null or row.full_name ilike '%' || v_search || '%' or row.display_name ilike '%' || v_search || '%' or row.username ilike '%' || v_search || '%' or row.email ilike '%' || v_search || '%' or row.phone_number ilike '%' || v_search || '%')
      and (v_status is null or row.status = v_status)
      and (v_city is null or lower(btrim(row.current_city)) = v_city)
      and (v_niche is null or lower(btrim(row.primary_niche)) = v_niche or (lower(btrim(row.primary_niche)) = 'other' and lower(btrim(row.primary_niche_other)) = v_niche))
      and (v_type is null or lower(btrim(row.creator_type)) = v_type)
      and (v_platform is null or exists (select 1 from public.creator_social_platforms platform_filter where platform_filter.creator_id = row.creator_id and platform_filter.platform = v_platform))
      and (p_min_followers is null or row.max_audience_count >= p_min_followers)
      and (p_max_followers is null or row.max_audience_count <= p_max_followers)
      and (p_min_completion is null or row.completed_sections >= p_min_completion)
      and (p_max_completion is null or row.completed_sections <= p_max_completion)
      and (p_joined_after is null or row.created_at >= p_joined_after)
      and (p_joined_before is null or row.created_at <= p_joined_before)
  )
  select row.creator_id, row.profile_photo_url, row.display_name, row.username, row.full_name,
    row.current_city, row.primary_niche, row.primary_niche_other, row.creator_type, row.platforms, row.status, row.created_at,
    row.completed_sections, 4::integer, count(*) over()
  from filtered row
  order by case when v_sort = 'recent' then row.created_at end desc,
    case when v_sort = 'oldest' then row.created_at end asc,
    case when v_sort = 'name_asc' then row.sort_name end asc,
    case when v_sort = 'name_desc' then row.sort_name end desc,
    case when v_sort = 'followers_desc' then row.max_audience_count end desc,
    case when v_sort = 'followers_asc' then row.max_audience_count end asc,
    case when v_sort = 'completion_desc' then row.completed_sections end desc,
    case when v_sort = 'completion_asc' then row.completed_sections end asc, row.creator_id
  limit v_limit offset v_offset;
end;
$$;

create or replace function public.admin_creator_status_counts()
returns table (total_count bigint, pending_count bigint, active_count bigint, rejected_count bigint)
language plpgsql stable security definer set search_path = pg_catalog, public
as $$ begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  return query select count(*), count(*) filter (where status = 'pending'), count(*) filter (where status = 'active'), count(*) filter (where status = 'rejected') from public.creators;
end; $$;

create or replace function public.admin_creator_filter_options()
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public
as $$ begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  return jsonb_build_object(
    'cities', coalesce((select jsonb_agg(city order by city) from (select distinct nullif(btrim(current_city), '') as city from public.creators) values_ where city is not null), '[]'::jsonb),
    'niches', coalesce((select jsonb_agg(niche order by niche) from (select distinct nullif(btrim(primary_niche), '') as niche from public.creator_content_profile) values_ where niche is not null), '[]'::jsonb),
    'creatorTypes', coalesce((select jsonb_agg(creator_type order by creator_type) from (select distinct nullif(btrim(creator_type), '') as creator_type from public.creator_identity) values_ where creator_type is not null), '[]'::jsonb)
  );
end; $$;

create or replace function public.admin_dashboard()
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public
as $$ begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  return (
    with completion as (select creator.id, public.admin_creator_completed_sections(creator.id) as completed_sections from public.creators creator),
    recent as (
      select jsonb_agg(jsonb_build_object('creatorId', row.creator_id, 'displayName', coalesce(row.display_name, row.full_name), 'city', row.current_city, 'primaryNiche', case when row.primary_niche = 'Other' then coalesce(row.primary_niche_other, 'Other') else row.primary_niche end, 'platforms', row.platforms, 'status', row.status, 'createdAt', row.created_at, 'completedSections', row.completed_sections) order by row.created_at desc) as items
      from public.admin_list_creators(null,null,null,null,null,null,null,null,null,null,null,null,'recent',8,0) row
    )
    select jsonb_build_object(
      'creators', jsonb_build_object('total', count(*), 'pending', count(*) filter (where creator.status = 'pending'), 'active', count(*) filter (where creator.status = 'active'), 'rejected', count(*) filter (where creator.status = 'rejected')),
      'completion', jsonb_build_object('average', coalesce(round(avg(completion.completed_sections)::numeric / 4 * 100), 0), 'completed', count(*) filter (where completion.completed_sections = 4), 'incomplete', count(*) filter (where completion.completed_sections < 4)),
      'platforms', jsonb_build_object('instagram', (select count(distinct creator_id) from public.creator_social_platforms where platform = 'instagram'), 'facebook', (select count(distinct creator_id) from public.creator_social_platforms where platform = 'facebook'), 'youtube', (select count(distinct creator_id) from public.creator_social_platforms where platform = 'youtube')),
      'recentCreators', coalesce((select items from recent), '[]'::jsonb)
    ) from public.creators creator join completion on completion.id = creator.id
  );
end; $$;

create or replace function public.admin_creator_detail(p_creator_id uuid)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public
as $$
declare v_result jsonb;
begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  select jsonb_build_object(
    'creatorId', creator.id, 'publicIdentifier', creator.public_profile_id, 'status', creator.status, 'createdAt', creator.created_at,
    'basic', jsonb_build_object('fullName', creator.full_name, 'email', creator.email, 'phoneNumber', creator.phone_number, 'city', creator.current_city, 'dateOfBirth', creator.date_of_birth, 'gender', creator.gender, 'more', creator.more),
    'identity', jsonb_build_object('profilePhotoUrl', identity_profile.profile_photo_url, 'displayName', identity_profile.display_name, 'bio', identity_profile.bio, 'languages', coalesce(to_jsonb(identity_profile.languages), '[]'::jsonb), 'creatorType', identity_profile.creator_type, 'creatorTypeOther', identity_profile.creator_type_other),
    'content', jsonb_build_object('primaryNiche', content_profile.primary_niche, 'primaryNicheOther', content_profile.primary_niche_other, 'otherNiches', coalesce(to_jsonb(content_profile.other_niches), '[]'::jsonb), 'formats', coalesce(to_jsonb(content_profile.content_formats), '[]'::jsonb), 'formatsOther', content_profile.content_formats_other, 'styles', coalesce(to_jsonb(content_profile.content_styles), '[]'::jsonb), 'stylesOther', content_profile.content_styles_other),
    'platforms', coalesce((select jsonb_agg(jsonb_build_object(
      'id', platform_profile.id, 'platform', platform_profile.platform, 'profileUrl', platform_profile.profile_url, 'username', platform_profile.username, 'audienceCount', platform_profile.audience_count, 'isPrimary', platform_profile.is_primary,
      'youtubeAnalytics', case when platform_profile.platform = 'youtube' then (select jsonb_build_object('views', analytics.views, 'likes', analytics.likes, 'shares', analytics.shares, 'topCountry', analytics.top_country) from public.creator_youtube_analytics analytics where analytics.social_platform_id = platform_profile.id) else null end,
      'instagramAnalytics', case when platform_profile.platform = 'instagram' then (select jsonb_build_object('views', analytics.views_all_content, 'netFollowers', analytics.net_followers, 'interactions', analytics.interactions, 'viewersTotal', analytics.viewers_total, 'profileVisits', analytics.profile_visits, 'womenPercentage', analytics.women_percentage, 'menPercentage', analytics.men_percentage, 'topAgeRanges', coalesce((select jsonb_agg(selection.age_range order by selection.display_order) from public.creator_instagram_top_age_ranges selection where selection.snapshot_id = snapshot.id), '[]'::jsonb), 'topCities', coalesce((select jsonb_agg(location.location_name order by location.display_order) from public.creator_instagram_top_locations location where location.snapshot_id = snapshot.id), '[]'::jsonb)) from public.creator_social_analytics_snapshots snapshot join public.creator_instagram_analytics analytics on analytics.snapshot_id = snapshot.id where snapshot.social_platform_id = platform_profile.id and snapshot.is_current order by snapshot.updated_at desc limit 1) else null end,
      'facebookAnalytics', case when platform_profile.platform = 'facebook' then (select jsonb_build_object('views', analytics.views_total, 'viewers', analytics.viewers, 'engagement', analytics.engagement_total, 'netFollowers', analytics.net_followers, 'womenPercentage', analytics.women_percentage, 'menPercentage', analytics.men_percentage, 'topAgeGroup', (select selection.age_group from public.creator_facebook_top_age_groups selection where selection.snapshot_id = snapshot.id limit 1), 'topCities', coalesce((select jsonb_agg(location.location_name order by location.display_order) from public.creator_facebook_top_locations location where location.snapshot_id = snapshot.id), '[]'::jsonb)) from public.creator_social_analytics_snapshots snapshot join public.creator_facebook_analytics analytics on analytics.snapshot_id = snapshot.id where snapshot.social_platform_id = platform_profile.id and snapshot.is_current order by snapshot.updated_at desc limit 1) else null end
    ) order by platform_profile.is_primary desc, platform_profile.platform) from public.creator_social_platforms platform_profile where platform_profile.creator_id = creator.id), '[]'::jsonb),
    'completion', jsonb_build_object('completedSections', public.admin_creator_completed_sections(creator.id), 'totalRequiredSections', 4),
    'statusHistory', coalesce((select jsonb_agg(jsonb_build_object('id', history.id, 'previousStatus', history.previous_status, 'newStatus', history.new_status, 'reason', history.reason, 'createdAt', history.created_at) order by history.created_at desc) from public.admin_creator_status_history history where history.creator_id = creator.id), '[]'::jsonb)
  ) into v_result from public.creators creator
  left join public.creator_identity identity_profile on identity_profile.creator_id = creator.id
  left join public.creator_content_profile content_profile on content_profile.creator_id = creator.id
  where creator.id = p_creator_id;
  if v_result is null then raise exception 'Creator not found' using errcode = 'P0002'; end if;
  return v_result;
end; $$;

create or replace function public.admin_update_creator_status(p_creator_id uuid, p_new_status text, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $$
declare v_previous text; v_next text := lower(btrim(p_new_status)); v_reason text := nullif(btrim(p_reason), '');
begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  if v_next not in ('pending', 'active', 'rejected') then raise exception 'Invalid creator status'; end if;
  select status into v_previous from public.creators where id = p_creator_id for update;
  if v_previous is null then raise exception 'Creator not found' using errcode = 'P0002'; end if;
  if v_previous = v_next then return jsonb_build_object('status', v_previous, 'unchanged', true); end if;
  update public.creators set status = v_next where id = p_creator_id;
  insert into public.admin_creator_status_history(creator_id, changed_by, previous_status, new_status, reason) values (p_creator_id, auth.uid(), v_previous, v_next, v_reason);
  return jsonb_build_object('status', v_next, 'previousStatus', v_previous, 'unchanged', false);
end; $$;

create or replace function public.admin_analytics()
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public
as $$ begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  return jsonb_build_object(
    'growth', coalesce((select jsonb_agg(jsonb_build_object('date', day, 'count', count) order by day) from (select created_at::date as day, count(*)::integer as count from public.creators group by created_at::date) rows), '[]'::jsonb),
    'statuses', jsonb_build_object('pending', (select count(*) from public.creators where status = 'pending'), 'active', (select count(*) from public.creators where status = 'active'), 'rejected', (select count(*) from public.creators where status = 'rejected')),
    'platforms', coalesce((select jsonb_agg(jsonb_build_object('label', platform, 'count', count) order by count desc) from (select platform, count(distinct creator_id)::integer as count from public.creator_social_platforms group by platform) rows), '[]'::jsonb),
    'primaryPlatforms', coalesce((select jsonb_agg(jsonb_build_object('label', platform, 'count', count) order by count desc) from (select platform, count(*)::integer as count from public.creator_social_platforms where is_primary group by platform) rows), '[]'::jsonb),
    'niches', coalesce((select jsonb_agg(jsonb_build_object('label', niche, 'count', count) order by count desc, niche) from (select coalesce(nullif(btrim(primary_niche), ''), 'Unspecified') as niche, count(*)::integer as count from public.creator_content_profile group by 1 order by count desc limit 10) rows), '[]'::jsonb),
    'cities', coalesce((select jsonb_agg(jsonb_build_object('label', city, 'count', count) order by count desc, city) from (select coalesce(nullif(btrim(current_city), ''), 'Unspecified') as city, count(*)::integer as count from public.creators group by 1 order by count desc limit 10) rows), '[]'::jsonb),
    'creatorTypes', coalesce((select jsonb_agg(jsonb_build_object('label', creator_type, 'count', count) order by count desc, creator_type) from (select coalesce(nullif(btrim(creator_type), ''), 'Unspecified') as creator_type, count(*)::integer as count from public.creator_identity group by 1) rows), '[]'::jsonb),
    'completion', jsonb_build_object('average', coalesce((select round(avg(public.admin_creator_completed_sections(id))::numeric / 4 * 100) from public.creators), 0), 'completed', (select count(*) from public.creators where public.admin_creator_completed_sections(id) = 4), 'incomplete', (select count(*) from public.creators where public.admin_creator_completed_sections(id) < 4))
  );
end; $$;

revoke all on function public.admin_creator_completed_sections(uuid) from public, anon, authenticated;
revoke all on function public.admin_list_creators(text,text,text,text,text,text,bigint,bigint,integer,integer,timestamptz,timestamptz,text,integer,integer) from public, anon, authenticated;
revoke all on function public.admin_creator_status_counts() from public, anon, authenticated;
revoke all on function public.admin_creator_filter_options() from public, anon, authenticated;
revoke all on function public.admin_dashboard() from public, anon, authenticated;
revoke all on function public.admin_creator_detail(uuid) from public, anon, authenticated;
revoke all on function public.admin_update_creator_status(uuid,text,text) from public, anon, authenticated;
revoke all on function public.admin_analytics() from public, anon, authenticated;
grant execute on function public.admin_creator_completed_sections(uuid), public.admin_list_creators(text,text,text,text,text,text,bigint,bigint,integer,integer,timestamptz,timestamptz,text,integer,integer), public.admin_creator_status_counts(), public.admin_creator_filter_options(), public.admin_dashboard(), public.admin_creator_detail(uuid), public.admin_update_creator_status(uuid,text,text), public.admin_analytics() to authenticated;

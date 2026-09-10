create or replace function public.admin_list_creators(
  p_search text default null,
  p_status text default null,
  p_city text default null,
  p_primary_niche text default null,
  p_creator_type text default null,
  p_platform text default null,
  p_min_followers bigint default null,
  p_max_followers bigint default null,
  p_min_completion integer default null,
  p_max_completion integer default null,
  p_joined_after timestamptz default null,
  p_joined_before timestamptz default null,
  p_sort text default 'recent',
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  creator_id uuid,
  profile_photo_url text,
  display_name text,
  username text,
  full_name text,
  current_city text,
  primary_niche text,
  primary_niche_other text,
  creator_type text,
  platforms jsonb,
  status text,
  created_at timestamptz,
  completed_sections integer,
  total_required_sections integer,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_search text := nullif(btrim(p_search), '');
  v_status text := nullif(lower(btrim(p_status)), '');
  v_city text := nullif(lower(btrim(p_city)), '');
  v_primary_niche text := nullif(lower(btrim(p_primary_niche)), '');
  v_creator_type text := nullif(lower(btrim(p_creator_type)), '');
  v_platform text := nullif(lower(btrim(p_platform)), '');
  v_sort text := coalesce(nullif(lower(btrim(p_sort)), ''), 'recent');
  v_limit integer := coalesce(p_limit, 25);
  v_offset integer := coalesce(p_offset, 0);
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;

  if v_status is not null and v_status not in ('pending', 'active', 'rejected') then
    raise exception 'Invalid creator status filter';
  end if;

  if v_platform is not null and v_platform not in ('instagram', 'facebook', 'youtube') then
    raise exception 'Invalid platform filter';
  end if;

  if v_min_followers is not null and v_min_followers < 0
    or v_max_followers is not null and v_max_followers < 0
    or v_min_followers is not null and v_max_followers is not null and v_min_followers > v_max_followers then
    raise exception 'Invalid follower range';
  end if;

  if v_min_completion is not null and v_min_completion not between 0 and 5
    or v_max_completion is not null and v_max_completion not between 0 and 5
    or v_min_completion is not null and v_max_completion is not null and v_min_completion > v_max_completion then
    raise exception 'Invalid completion range';
  end if;

  if p_joined_after is not null and p_joined_before is not null and p_joined_after > p_joined_before then
    raise exception 'Invalid joined date range';
  end if;

  if v_sort not in (
    'recent',
    'oldest',
    'name_asc',
    'name_desc',
    'followers_desc',
    'followers_asc',
    'completion_desc',
    'completion_asc'
  ) then
    raise exception 'Invalid creator sort';
  end if;

  if v_limit < 1 or v_limit > 100 then
    raise exception 'Limit must be between 1 and 100';
  end if;

  if v_offset < 0 then
    raise exception 'Offset cannot be negative';
  end if;

  return query
  with creator_rows as (
    select
      creator.id as creator_id,
      identity_profile.profile_photo_url,
      identity_profile.display_name,
      identity_profile.username,
      creator.full_name,
      creator.current_city,
      content_profile.primary_niche,
      content_profile.primary_niche_other,
      identity_profile.creator_type,
      coalesce(platform_summary.platforms, '[]'::jsonb) as platforms,
      creator.status,
      creator.created_at,
      coalesce(platform_summary.max_audience_count, 0) as max_audience_count,
      lower(coalesce(nullif(btrim(identity_profile.display_name), ''), creator.full_name)) as sort_name,
      (
        case when (
          nullif(btrim(creator.full_name), '') is not null
          and nullif(btrim(creator.email), '') is not null
          and nullif(btrim(creator.phone_number), '') is not null
          and nullif(btrim(creator.current_city), '') is not null
          and creator.date_of_birth is not null
          and nullif(btrim(creator.gender), '') is not null
        ) then 1 else 0 end
        + case when (
          identity_profile.creator_id is not null
          and nullif(btrim(identity_profile.display_name), '') is not null
          and nullif(btrim(identity_profile.bio), '') is not null
          and nullif(btrim(identity_profile.creator_type), '') is not null
        ) then 1 else 0 end
        + case when (
          content_profile.creator_id is not null
          and nullif(btrim(content_profile.primary_niche), '') is not null
          and cardinality(content_profile.content_formats) > 0
          and cardinality(content_profile.content_styles) > 0
          and not exists (
            select 1
            from unnest(content_profile.content_formats) as content_format(value)
            where nullif(btrim(content_format.value), '') is null
          )
          and not exists (
            select 1
            from unnest(content_profile.content_styles) as content_style(value)
            where nullif(btrim(content_style.value), '') is null
          )
          and (
            content_profile.primary_niche <> 'Other'
            or nullif(btrim(content_profile.primary_niche_other), '') is not null
          )
          and not exists (
            select 1
            from unnest(coalesce(content_profile.other_niches, '{}'::text[])) as other_niche(value)
            where nullif(btrim(other_niche.value), '') is null
          )
          and (
            not ('Other' = any(coalesce(content_profile.other_niches, '{}'::text[])))
            or nullif(btrim(content_profile.other_niches_other), '') is not null
          )
          and (
            not ('Other' = any(content_profile.content_formats))
            or nullif(btrim(content_profile.content_formats_other), '') is not null
          )
          and (
            not ('Other' = any(content_profile.content_styles))
            or nullif(btrim(content_profile.content_styles_other), '') is not null
          )
        ) then 1 else 0 end
        + case when (
          not exists (
            select 1
            from public.creator_social_platforms platform_profile
            where platform_profile.creator_id = creator.id
              and (
                platform_profile.profile_url !~* '^https?://'
                or platform_profile.audience_count < 0
              )
          )
          and exists (
            select 1
            from public.creator_social_platforms platform_profile
            where platform_profile.creator_id = creator.id
          )
          and exists (
            select 1
            from public.creator_social_platforms platform_profile
            where platform_profile.creator_id = creator.id
              and platform_profile.is_primary
              and (
                (
                  platform_profile.platform = 'youtube'
                  and exists (
                    select 1
                    from public.creator_youtube_analytics analytics
                    where analytics.social_platform_id = platform_profile.id
                      and analytics.views >= 0
                      and analytics.likes >= 0
                      and analytics.shares >= 0
                      and nullif(btrim(analytics.top_country), '') is not null
                  )
                )
                or (
                  platform_profile.platform = 'instagram'
                  and exists (
                    select 1
                    from public.creator_social_analytics_snapshots snapshot
                    join public.creator_instagram_analytics analytics on analytics.snapshot_id = snapshot.id
                    where snapshot.social_platform_id = platform_profile.id
                      and snapshot.platform = 'instagram'
                      and snapshot.is_current
                      and analytics.views_all_content >= 0
                      and analytics.overview_followers_percentage between 0 and 100
                      and analytics.overview_non_followers_percentage between 0 and 100
                      and analytics.net_followers >= 0
                      and analytics.interactions >= 0
                      and analytics.viewers_total >= 0
                      and analytics.posts_views >= 0
                      and analytics.reels_views >= 0
                      and analytics.stories_views >= 0
                      and analytics.live_videos_views >= 0
                      and analytics.all_interactions >= 0
                      and analytics.posts_interactions >= 0
                      and analytics.reels_interactions >= 0
                      and analytics.stories_interactions >= 0
                      and analytics.live_videos_interactions >= 0
                      and analytics.profile_visits >= 0
                      and analytics.bio_link_taps >= 0
                      and analytics.business_address_taps >= 0
                      and analytics.audience_followers >= 0
                      and analytics.follower_growth >= 0
                  )
                )
                or (
                  platform_profile.platform = 'facebook'
                  and exists (
                    select 1
                    from public.creator_social_analytics_snapshots snapshot
                    join public.creator_facebook_analytics analytics on analytics.snapshot_id = snapshot.id
                    where snapshot.social_platform_id = platform_profile.id
                      and snapshot.platform = 'facebook'
                      and snapshot.is_current
                      and analytics.views_total >= 0
                      and analytics.viewers >= 0
                      and analytics.engagement_total >= 0
                      and analytics.new_conversations >= 0
                      and analytics.net_followers >= 0
                  )
                )
              )
          )
        ) then 1 else 0 end
        + case when exists (
          select 1
          from public.creator_portfolio_items portfolio_item
          where portfolio_item.creator_id = creator.id
            and nullif(btrim(portfolio_item.content_url), '') is not null
            and nullif(btrim(portfolio_item.platform), '') is not null
            and nullif(btrim(portfolio_item.content_type), '') is not null
            and (
              portfolio_item.content_type <> 'Other'
              or nullif(btrim(portfolio_item.content_type_other), '') is not null
            )
            and (
              portfolio_item.category is distinct from 'Other'
              or nullif(btrim(portfolio_item.category_other), '') is not null
            )
        ) then 1 else 0 end
      )::integer as completed_sections
    from public.creators creator
    left join public.creator_identity identity_profile on identity_profile.creator_id = creator.id
    left join public.creator_content_profile content_profile on content_profile.creator_id = creator.id
    left join lateral (
      select
        jsonb_agg(
          jsonb_build_object(
            'platform', platform_profile.platform,
            'audience_count', platform_profile.audience_count,
            'is_primary', platform_profile.is_primary
          )
          order by platform_profile.is_primary desc, platform_profile.platform asc
        ) as platforms,
        max(platform_profile.audience_count) as max_audience_count
      from public.creator_social_platforms platform_profile
      where platform_profile.creator_id = creator.id
    ) as platform_summary on true
  ),
  filtered_creators as (
    select creator_row.*
    from creator_rows creator_row
    where (
      v_search is null
      or creator_row.full_name ilike '%' || v_search || '%'
      or creator_row.display_name ilike '%' || v_search || '%'
      or creator_row.username ilike '%' || v_search || '%'
      or exists (
        select 1
        from public.creators creator_search
        where creator_search.id = creator_row.creator_id
          and (
            creator_search.email ilike '%' || v_search || '%'
            or creator_search.phone_number ilike '%' || v_search || '%'
          )
      )
    )
    and (v_status is null or creator_row.status = v_status)
    and (v_city is null or lower(btrim(creator_row.current_city)) = v_city)
    and (
      v_primary_niche is null
      or lower(btrim(creator_row.primary_niche)) = v_primary_niche
      or (
        lower(btrim(creator_row.primary_niche)) = 'other'
        and lower(btrim(creator_row.primary_niche_other)) = v_primary_niche
      )
    )
    and (v_creator_type is null or lower(btrim(creator_row.creator_type)) = v_creator_type)
    and (
      v_platform is null
      or exists (
        select 1
        from public.creator_social_platforms platform_filter
        where platform_filter.creator_id = creator_row.creator_id
          and platform_filter.platform = v_platform
      )
    )
    and (
      (v_min_followers is null and v_max_followers is null)
      or exists (
        select 1
        from public.creator_social_platforms follower_filter
        where follower_filter.creator_id = creator_row.creator_id
          and (v_min_followers is null or follower_filter.audience_count >= v_min_followers)
          and (v_max_followers is null or follower_filter.audience_count <= v_max_followers)
      )
    )
    and (v_min_completion is null or creator_row.completed_sections >= v_min_completion)
    and (v_max_completion is null or creator_row.completed_sections <= v_max_completion)
    and (p_joined_after is null or creator_row.created_at >= p_joined_after)
    and (p_joined_before is null or creator_row.created_at <= p_joined_before)
  )
  select
    filtered_creator.creator_id,
    filtered_creator.profile_photo_url,
    filtered_creator.display_name,
    filtered_creator.username,
    filtered_creator.full_name,
    filtered_creator.current_city,
    filtered_creator.primary_niche,
    filtered_creator.primary_niche_other,
    filtered_creator.creator_type,
    filtered_creator.platforms,
    filtered_creator.status,
    filtered_creator.created_at,
    filtered_creator.completed_sections,
    5::integer as total_required_sections,
    count(*) over() as total_count
  from filtered_creators filtered_creator
  order by
    case when v_sort = 'recent' then filtered_creator.created_at end desc,
    case when v_sort = 'oldest' then filtered_creator.created_at end asc,
    case when v_sort = 'name_asc' then filtered_creator.sort_name end asc,
    case when v_sort = 'name_desc' then filtered_creator.sort_name end desc,
    case when v_sort = 'followers_desc' then filtered_creator.max_audience_count end desc,
    case when v_sort = 'followers_asc' then filtered_creator.max_audience_count end asc,
    case when v_sort = 'completion_desc' then filtered_creator.completed_sections end desc,
    case when v_sort = 'completion_asc' then filtered_creator.completed_sections end asc,
    filtered_creator.creator_id asc
  limit v_limit
  offset v_offset;
end;
$$;

create or replace function public.admin_creator_status_counts()
returns table (
  total_count bigint,
  pending_count bigint,
  active_count bigint,
  rejected_count bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;

  return query
  select
    count(*) as total_count,
    count(*) filter (where creator.status = 'pending') as pending_count,
    count(*) filter (where creator.status = 'active') as active_count,
    count(*) filter (where creator.status = 'rejected') as rejected_count
  from public.creators creator;
end;
$$;

revoke all on function public.admin_list_creators(
  text, text, text, text, text, text, bigint, bigint, integer, integer,
  timestamptz, timestamptz, text, integer, integer
) from public, anon, authenticated;
grant execute on function public.admin_list_creators(
  text, text, text, text, text, text, bigint, bigint, integer, integer,
  timestamptz, timestamptz, text, integer, integer
) to authenticated;

revoke all on function public.admin_creator_status_counts() from public, anon, authenticated;
grant execute on function public.admin_creator_status_counts() to authenticated;

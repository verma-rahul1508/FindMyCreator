-- Keep the Admin Creator report on the existing admin-only list RPC and make
-- the primary-platform invariant enforceable independently of the client UI.

drop function if exists public.admin_list_creators_with_contact(
  text, text, text, text, text, text, bigint, bigint, integer, integer,
  timestamptz, timestamptz, text, integer, integer
);

create function public.admin_list_creators_with_contact(
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
  completed_sections integer, total_required_sections integer, last_30_days_views bigint,
  total_count bigint
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
    case primary_platform.platform
      when 'instagram' then (
        select analytics.views_all_content
        from public.creator_social_analytics_snapshots snapshot
        join public.creator_instagram_analytics analytics on analytics.snapshot_id = snapshot.id
        where snapshot.social_platform_id = primary_platform.id
          and snapshot.platform = 'instagram'
          and snapshot.is_current
        order by snapshot.updated_at desc
        limit 1
      )
      when 'facebook' then (
        select analytics.views_total
        from public.creator_social_analytics_snapshots snapshot
        join public.creator_facebook_analytics analytics on analytics.snapshot_id = snapshot.id
        where snapshot.social_platform_id = primary_platform.id
          and snapshot.platform = 'facebook'
          and snapshot.is_current
        order by snapshot.updated_at desc
        limit 1
      )
      when 'youtube' then (
        select analytics.views
        from public.creator_youtube_analytics analytics
        where analytics.social_platform_id = primary_platform.id
      )
      else null
    end,
    listed.total_count
  from public.admin_list_creators(
    p_search, p_status, p_city, p_primary_niche, p_creator_type, p_platform,
    p_min_followers, p_max_followers, p_min_completion, p_max_completion,
    p_joined_after, p_joined_before, p_sort, p_limit, p_offset
  ) listed
  join public.creators creator on creator.id = listed.creator_id
  left join lateral (
    select platform_profile.id, platform_profile.platform
    from public.creator_social_platforms platform_profile
    where platform_profile.creator_id = listed.creator_id
      and platform_profile.is_primary
    limit 1
  ) primary_platform on true;
$$;

revoke all on function public.admin_list_creators_with_contact(text,text,text,text,text,text,bigint,bigint,integer,integer,timestamptz,timestamptz,text,integer,integer) from public, anon, authenticated;
grant execute on function public.admin_list_creators_with_contact(text,text,text,text,text,text,bigint,bigint,integer,integer,timestamptz,timestamptz,text,integer,integer) to authenticated;

create or replace function public.save_creator_social_platforms(p_accounts jsonb)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_creator_id uuid;
  v_account jsonb;
  v_platform text;
  v_platform_id uuid;
  v_snapshot_id uuid;
  v_insights jsonb;
begin
  if jsonb_typeof(p_accounts) <> 'array' then
    raise exception 'Invalid social platform payload';
  end if;

  if jsonb_array_length(p_accounts) > 0 and (
    select count(*)
    from jsonb_array_elements(p_accounts) account(value)
    where coalesce((account.value->>'isPrimary')::boolean, false)
  ) <> 1 then
    raise exception 'Please select at least one primary platform before continuing.';
  end if;

  select id into v_creator_id
  from public.creators
  where auth_user_id = auth.uid();

  if v_creator_id is null then
    raise exception 'Creator profile not found';
  end if;

  update public.creator_social_platforms
  set is_primary = false
  where creator_id = v_creator_id
    and is_primary;

  for v_account in select value from jsonb_array_elements(p_accounts) loop
    v_platform := lower(v_account->>'platform');
    if v_platform not in ('instagram', 'facebook', 'youtube') then
      raise exception 'Unsupported platform';
    end if;

    insert into public.creator_social_platforms (
      creator_id, platform, profile_url, username, audience_count, is_primary
    )
    values (
      v_creator_id,
      v_platform,
      nullif(btrim(coalesce(v_account->>'profileUrl', '')), ''),
      nullif(btrim(coalesce(v_account->>'username', '')), ''),
      case when coalesce(v_account->>'audienceCount', '') ~ '^[0-9]+$' then (v_account->>'audienceCount')::bigint else null end,
      coalesce((v_account->>'isPrimary')::boolean, false)
    )
    on conflict (creator_id, platform) do update set
      profile_url = coalesce(excluded.profile_url, creator_social_platforms.profile_url),
      username = coalesce(excluded.username, creator_social_platforms.username),
      audience_count = coalesce(excluded.audience_count, creator_social_platforms.audience_count),
      is_primary = excluded.is_primary
    returning id into v_platform_id;

    if v_platform = 'youtube' then
      v_insights := v_account->'youtubeInsights';
      if jsonb_typeof(v_insights) = 'object' then
        insert into public.creator_youtube_analytics (social_platform_id, views, likes, shares, top_country)
        values (
          v_platform_id,
          case when coalesce(v_insights->>'views', '') ~ '^[0-9]+$' then (v_insights->>'views')::bigint end,
          case when coalesce(v_insights->>'likes', '') ~ '^[0-9]+$' then (v_insights->>'likes')::bigint end,
          case when coalesce(v_insights->>'shares', '') ~ '^[0-9]+$' then (v_insights->>'shares')::bigint end,
          nullif(btrim(coalesce(v_insights->>'topCountry', '')), '')
        )
        on conflict (social_platform_id) do update set
          views = coalesce(excluded.views, creator_youtube_analytics.views),
          likes = coalesce(excluded.likes, creator_youtube_analytics.likes),
          shares = coalesce(excluded.shares, creator_youtube_analytics.shares),
          top_country = coalesce(excluded.top_country, creator_youtube_analytics.top_country);
      end if;
      continue;
    end if;

    v_insights := case when v_platform = 'instagram' then v_account->'instagramInsights' else v_account->'facebookInsights' end;
    if jsonb_typeof(v_insights) <> 'object' then
      continue;
    end if;

    insert into public.creator_social_analytics_snapshots (social_platform_id, platform, period_days, is_current)
    values (v_platform_id, v_platform, case when v_platform = 'facebook' then 28 else 30 end, true)
    on conflict (social_platform_id, period_days) where is_current do update
    set updated_at = now()
    returning id into v_snapshot_id;

    if v_platform = 'instagram' then
      insert into public.creator_instagram_analytics (
        snapshot_id, views_all_content, net_followers, interactions, viewers_total,
        profile_visits, women_percentage, men_percentage
      )
      values (
        v_snapshot_id,
        case when coalesce(v_insights#>>'{overview,views}', '') ~ '^[0-9]+$' then (v_insights#>>'{overview,views}')::bigint end,
        case when coalesce(v_insights#>>'{overview,netFollowers}', '') ~ '^[0-9]+$' then (v_insights#>>'{overview,netFollowers}')::bigint end,
        case when coalesce(v_insights#>>'{overview,interactions}', '') ~ '^[0-9]+$' then (v_insights#>>'{overview,interactions}')::bigint end,
        case when coalesce(v_insights#>>'{overview,viewersTotal}', '') ~ '^[0-9]+$' then (v_insights#>>'{overview,viewersTotal}')::bigint end,
        case when coalesce(v_insights#>>'{overview,profileVisits}', '') ~ '^[0-9]+$' then (v_insights#>>'{overview,profileVisits}')::bigint end,
        case when coalesce(v_insights#>>'{audience,women}', '') ~ '^[0-9]+(\.[0-9]+)?$' then (v_insights#>>'{audience,women}')::numeric end,
        case when coalesce(v_insights#>>'{audience,men}', '') ~ '^[0-9]+(\.[0-9]+)?$' then (v_insights#>>'{audience,men}')::numeric end
      )
      on conflict (snapshot_id) do update set
        views_all_content = coalesce(excluded.views_all_content, creator_instagram_analytics.views_all_content),
        net_followers = coalesce(excluded.net_followers, creator_instagram_analytics.net_followers),
        interactions = coalesce(excluded.interactions, creator_instagram_analytics.interactions),
        viewers_total = coalesce(excluded.viewers_total, creator_instagram_analytics.viewers_total),
        profile_visits = coalesce(excluded.profile_visits, creator_instagram_analytics.profile_visits),
        women_percentage = coalesce(excluded.women_percentage, creator_instagram_analytics.women_percentage),
        men_percentage = coalesce(excluded.men_percentage, creator_instagram_analytics.men_percentage);

      if jsonb_typeof(v_insights#>'{audience,topAgeRanges}') = 'array'
        and jsonb_array_length(v_insights#>'{audience,topAgeRanges}') between 1 and 2
        and not exists (select 1 from jsonb_array_elements_text(v_insights#>'{audience,topAgeRanges}') value where nullif(btrim(value), '') is null)
        and (select count(distinct lower(btrim(value))) from jsonb_array_elements_text(v_insights#>'{audience,topAgeRanges}') value) = jsonb_array_length(v_insights#>'{audience,topAgeRanges}') then
        delete from public.creator_instagram_top_age_ranges where snapshot_id = v_snapshot_id;
        insert into public.creator_instagram_top_age_ranges (snapshot_id, age_range, display_order)
        select v_snapshot_id, btrim(value), ord::integer
        from jsonb_array_elements_text(v_insights#>'{audience,topAgeRanges}') with ordinality as ranges(value, ord);
      end if;

      if jsonb_typeof(v_insights#>'{audience,topCities}') = 'array'
        and jsonb_array_length(v_insights#>'{audience,topCities}') between 1 and 5
        and not exists (select 1 from jsonb_array_elements_text(v_insights#>'{audience,topCities}') value where nullif(btrim(value), '') is null)
        and (select count(distinct lower(btrim(value))) from jsonb_array_elements_text(v_insights#>'{audience,topCities}') value) = jsonb_array_length(v_insights#>'{audience,topCities}') then
        delete from public.creator_instagram_top_locations where snapshot_id = v_snapshot_id;
        insert into public.creator_instagram_top_locations (snapshot_id, location_name, display_order)
        select v_snapshot_id, btrim(value), ord::integer
        from jsonb_array_elements_text(v_insights#>'{audience,topCities}') with ordinality as locations(value, ord);
      end if;
    else
      insert into public.creator_facebook_analytics (
        snapshot_id, views_total, viewers, engagement_total, net_followers, women_percentage, men_percentage
      )
      values (
        v_snapshot_id,
        case when coalesce(v_insights#>>'{overview,viewsTotal}', '') ~ '^[0-9]+$' then (v_insights#>>'{overview,viewsTotal}')::bigint end,
        case when coalesce(v_insights#>>'{overview,viewers}', '') ~ '^[0-9]+$' then (v_insights#>>'{overview,viewers}')::bigint end,
        case when coalesce(v_insights#>>'{engagement,total}', '') ~ '^[0-9]+$' then (v_insights#>>'{engagement,total}')::bigint end,
        case when coalesce(v_insights#>>'{audience,netFollowers}', '') ~ '^[0-9]+$' then (v_insights#>>'{audience,netFollowers}')::bigint end,
        case when coalesce(v_insights#>>'{audience,women}', '') ~ '^[0-9]+(\.[0-9]+)?$' then (v_insights#>>'{audience,women}')::numeric end,
        case when coalesce(v_insights#>>'{audience,men}', '') ~ '^[0-9]+(\.[0-9]+)?$' then (v_insights#>>'{audience,men}')::numeric end
      )
      on conflict (snapshot_id) do update set
        views_total = coalesce(excluded.views_total, creator_facebook_analytics.views_total),
        viewers = coalesce(excluded.viewers, creator_facebook_analytics.viewers),
        engagement_total = coalesce(excluded.engagement_total, creator_facebook_analytics.engagement_total),
        net_followers = coalesce(excluded.net_followers, creator_facebook_analytics.net_followers),
        women_percentage = coalesce(excluded.women_percentage, creator_facebook_analytics.women_percentage),
        men_percentage = coalesce(excluded.men_percentage, creator_facebook_analytics.men_percentage);

      if coalesce(v_insights#>>'{audience,topAgeGroup}', '') in ('18–24', '25–34', '35–44', 'Other') then
        delete from public.creator_facebook_top_age_groups where snapshot_id = v_snapshot_id;
        insert into public.creator_facebook_top_age_groups (snapshot_id, age_group)
        values (v_snapshot_id, btrim(v_insights#>>'{audience,topAgeGroup}'));
      end if;

      if jsonb_typeof(v_insights#>'{audience,topCities}') = 'array'
        and jsonb_array_length(v_insights#>'{audience,topCities}') between 1 and 5
        and not exists (select 1 from jsonb_array_elements_text(v_insights#>'{audience,topCities}') value where nullif(btrim(value), '') is null)
        and (select count(distinct lower(btrim(value))) from jsonb_array_elements_text(v_insights#>'{audience,topCities}') value) = jsonb_array_length(v_insights#>'{audience,topCities}') then
        delete from public.creator_facebook_top_locations where snapshot_id = v_snapshot_id;
        insert into public.creator_facebook_top_locations (snapshot_id, location_name, display_order)
        select v_snapshot_id, btrim(value), ord::integer
        from jsonb_array_elements_text(v_insights#>'{audience,topCities}') with ordinality as locations(value, ord);
      end if;
    end if;
  end loop;

  delete from public.creator_social_platforms platform_profile
  where platform_profile.creator_id = v_creator_id
    and not exists (
      select 1 from jsonb_array_elements(p_accounts) account
      where lower(account->>'platform') = platform_profile.platform
    );
end;
$$;

revoke all on function public.save_creator_social_platforms(jsonb) from public, anon, authenticated;
grant execute on function public.save_creator_social_platforms(jsonb) to authenticated;

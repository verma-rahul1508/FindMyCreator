alter table public.creator_social_platforms
  alter column profile_url drop not null,
  alter column audience_count drop not null;

alter table public.creator_youtube_analytics
  alter column views drop not null,
  alter column likes drop not null,
  alter column shares drop not null,
  alter column top_country drop not null;

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
      creator_id,
      platform,
      profile_url,
      username,
      audience_count,
      is_primary
    )
    values (
      v_creator_id,
      v_platform,
      nullif(btrim(coalesce(v_account->>'profileUrl', '')), ''),
      nullif(btrim(coalesce(v_account->>'username', '')), ''),
      case
        when coalesce(v_account->>'audienceCount', '') ~ '^[0-9]+$'
          then (v_account->>'audienceCount')::bigint
        else null
      end,
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
        insert into public.creator_youtube_analytics (
          social_platform_id,
          views,
          likes,
          shares,
          top_country
        )
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

    v_insights := case
      when v_platform = 'instagram' then v_account->'instagramInsights'
      else v_account->'facebookInsights'
    end;
    if jsonb_typeof(v_insights) <> 'object' then
      continue;
    end if;

    insert into public.creator_social_analytics_snapshots (
      social_platform_id,
      platform,
      period_days,
      is_current
    )
    values (
      v_platform_id,
      v_platform,
      case when v_platform = 'facebook' then 28 else 30 end,
      true
    )
    on conflict (social_platform_id, period_days) where is_current do update
    set updated_at = now()
    returning id into v_snapshot_id;

    if v_platform = 'instagram' then
      insert into public.creator_instagram_analytics (
        snapshot_id,
        views_all_content,
        net_followers,
        interactions,
        viewers_total,
        profile_visits,
        women_percentage,
        men_percentage
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
        and not exists (
          select 1
          from jsonb_array_elements_text(v_insights#>'{audience,topAgeRanges}') value
          where nullif(btrim(value), '') is null
        )
        and (
          select count(distinct lower(btrim(value)))
          from jsonb_array_elements_text(v_insights#>'{audience,topAgeRanges}') value
        ) = jsonb_array_length(v_insights#>'{audience,topAgeRanges}') then
        delete from public.creator_instagram_top_age_ranges
        where snapshot_id = v_snapshot_id;
        insert into public.creator_instagram_top_age_ranges (snapshot_id, age_range, display_order)
        select v_snapshot_id, btrim(value), ord::integer
        from jsonb_array_elements_text(v_insights#>'{audience,topAgeRanges}') with ordinality as ranges(value, ord);
      end if;

      if jsonb_typeof(v_insights#>'{audience,topCities}') = 'array'
        and jsonb_array_length(v_insights#>'{audience,topCities}') between 1 and 5
        and not exists (
          select 1
          from jsonb_array_elements_text(v_insights#>'{audience,topCities}') value
          where nullif(btrim(value), '') is null
        )
        and (
          select count(distinct lower(btrim(value)))
          from jsonb_array_elements_text(v_insights#>'{audience,topCities}') value
        ) = jsonb_array_length(v_insights#>'{audience,topCities}') then
        delete from public.creator_instagram_top_locations
        where snapshot_id = v_snapshot_id;
        insert into public.creator_instagram_top_locations (snapshot_id, location_name, display_order)
        select v_snapshot_id, btrim(value), ord::integer
        from jsonb_array_elements_text(v_insights#>'{audience,topCities}') with ordinality as locations(value, ord);
      end if;
    else
      insert into public.creator_facebook_analytics (
        snapshot_id,
        views_total,
        viewers,
        engagement_total,
        net_followers,
        women_percentage,
        men_percentage
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
        delete from public.creator_facebook_top_age_groups
        where snapshot_id = v_snapshot_id;
        insert into public.creator_facebook_top_age_groups (snapshot_id, age_group)
        values (v_snapshot_id, btrim(v_insights#>>'{audience,topAgeGroup}'));
      end if;

      if jsonb_typeof(v_insights#>'{audience,topCities}') = 'array'
        and jsonb_array_length(v_insights#>'{audience,topCities}') between 1 and 5
        and not exists (
          select 1
          from jsonb_array_elements_text(v_insights#>'{audience,topCities}') value
          where nullif(btrim(value), '') is null
        )
        and (
          select count(distinct lower(btrim(value)))
          from jsonb_array_elements_text(v_insights#>'{audience,topCities}') value
        ) = jsonb_array_length(v_insights#>'{audience,topCities}') then
        delete from public.creator_facebook_top_locations
        where snapshot_id = v_snapshot_id;
        insert into public.creator_facebook_top_locations (snapshot_id, location_name, display_order)
        select v_snapshot_id, btrim(value), ord::integer
        from jsonb_array_elements_text(v_insights#>'{audience,topCities}') with ordinality as locations(value, ord);
      end if;
    end if;
  end loop;

  delete from public.creator_social_platforms platform_profile
  where platform_profile.creator_id = v_creator_id
    and not exists (
      select 1
      from jsonb_array_elements(p_accounts) account
      where lower(account->>'platform') = platform_profile.platform
    );
end;
$$;

revoke all on function public.save_creator_social_platforms(jsonb) from public, anon, authenticated;
grant execute on function public.save_creator_social_platforms(jsonb) to authenticated;

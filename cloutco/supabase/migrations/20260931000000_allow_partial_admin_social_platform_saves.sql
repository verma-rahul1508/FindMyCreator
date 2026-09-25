-- Keep incomplete social-platform cards in the admin onboarding draft. A row in
-- creator_social_platforms is only created once it has the required profile URL.

create or replace function public.admin_save_onboarding_social(p_creator_id uuid, p_accounts jsonb)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_account jsonb;
  v_platform text;
  v_profile_url text;
  v_platform_id uuid;
  v_snapshot_id uuid;
  v_insights jsonb;
  v_primary_count integer;
begin
  if jsonb_typeof(p_accounts) <> 'array' then
    raise exception 'Invalid social platform payload';
  end if;

  if jsonb_array_length(p_accounts) = 0 then
    delete from public.creator_social_platforms
    where creator_id = p_creator_id;
    return;
  end if;

  select count(*)
  into v_primary_count
  from jsonb_array_elements(p_accounts) account(value)
  where nullif(btrim(coalesce(account.value->>'profileUrl', '')), '') is not null
    and coalesce((account.value->>'isPrimary')::boolean, false);

  if v_primary_count > 1 then
    raise exception 'Select exactly one primary platform';
  end if;

  if v_primary_count = 1 then
    update public.creator_social_platforms
    set is_primary = false
    where creator_id = p_creator_id
      and is_primary;
  end if;

  for v_account in select value from jsonb_array_elements(p_accounts) loop
    v_profile_url := nullif(btrim(coalesce(v_account->>'profileUrl', '')), '');

    -- Incomplete cards remain in admin_creator_onboarding_drafts until their
    -- required URL is available, rather than violating the table constraint.
    if v_profile_url is null then
      continue;
    end if;

    v_platform := lower(coalesce(v_account->>'platform', ''));
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
      p_creator_id,
      v_platform,
      v_profile_url,
      nullif(btrim(coalesce(v_account->>'username', '')), ''),
      case
        when coalesce(v_account->>'audienceCount', '') ~ '^[0-9]+$'
          then (v_account->>'audienceCount')::bigint
      end,
      case
        when v_primary_count = 1 then coalesce((v_account->>'isPrimary')::boolean, false)
        else false
      end
    )
    on conflict (creator_id, platform) do update set
      profile_url = excluded.profile_url,
      username = excluded.username,
      audience_count = excluded.audience_count,
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
          views = excluded.views,
          likes = excluded.likes,
          shares = excluded.shares,
          top_country = excluded.top_country;
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
        views_all_content = excluded.views_all_content,
        net_followers = excluded.net_followers,
        interactions = excluded.interactions,
        viewers_total = excluded.viewers_total,
        profile_visits = excluded.profile_visits,
        women_percentage = excluded.women_percentage,
        men_percentage = excluded.men_percentage;

      if jsonb_typeof(v_insights#>'{audience,topAgeRanges}') = 'array'
        and jsonb_array_length(v_insights#>'{audience,topAgeRanges}') between 1 and 2
        and not exists (
          select 1
          from jsonb_array_elements_text(v_insights#>'{audience,topAgeRanges}') value
          where nullif(btrim(value), '') is null
        ) then
        delete from public.creator_instagram_top_age_ranges
        where snapshot_id = v_snapshot_id;
        insert into public.creator_instagram_top_age_ranges (snapshot_id, age_range, display_order)
        select v_snapshot_id, btrim(value), ord::integer
        from jsonb_array_elements_text(v_insights#>'{audience,topAgeRanges}') with ordinality as values_(value, ord);
      end if;

      if jsonb_typeof(v_insights#>'{audience,topCities}') = 'array'
        and jsonb_array_length(v_insights#>'{audience,topCities}') between 1 and 5
        and not exists (
          select 1
          from jsonb_array_elements_text(v_insights#>'{audience,topCities}') value
          where nullif(btrim(value), '') is null
        ) then
        delete from public.creator_instagram_top_locations
        where snapshot_id = v_snapshot_id;
        insert into public.creator_instagram_top_locations (snapshot_id, location_name, display_order)
        select v_snapshot_id, btrim(value), ord::integer
        from jsonb_array_elements_text(v_insights#>'{audience,topCities}') with ordinality as values_(value, ord);
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
        views_total = excluded.views_total,
        viewers = excluded.viewers,
        engagement_total = excluded.engagement_total,
        net_followers = excluded.net_followers,
        women_percentage = excluded.women_percentage,
        men_percentage = excluded.men_percentage;

      if coalesce(v_insights#>>'{audience,topAgeGroup}', '') in ('18â€“24', '25â€“34', '35â€“44', 'Other') then
        delete from public.creator_facebook_top_age_groups
        where snapshot_id = v_snapshot_id;
        insert into public.creator_facebook_top_age_groups (snapshot_id, age_group)
        values (v_snapshot_id, v_insights#>>'{audience,topAgeGroup}');
      end if;

      if jsonb_typeof(v_insights#>'{audience,topCities}') = 'array'
        and jsonb_array_length(v_insights#>'{audience,topCities}') between 1 and 5
        and not exists (
          select 1
          from jsonb_array_elements_text(v_insights#>'{audience,topCities}') value
          where nullif(btrim(value), '') is null
        ) then
        delete from public.creator_facebook_top_locations
        where snapshot_id = v_snapshot_id;
        insert into public.creator_facebook_top_locations (snapshot_id, location_name, display_order)
        select v_snapshot_id, btrim(value), ord::integer
        from jsonb_array_elements_text(v_insights#>'{audience,topCities}') with ordinality as values_(value, ord);
      end if;
    end if;
  end loop;

  delete from public.creator_social_platforms platform_profile
  where platform_profile.creator_id = p_creator_id
    and not exists (
      select 1
      from jsonb_array_elements(p_accounts) account
      where lower(account->>'platform') = platform_profile.platform
    );
end;
$$;

revoke all on function public.admin_save_onboarding_social(uuid, jsonb) from public, anon, authenticated;

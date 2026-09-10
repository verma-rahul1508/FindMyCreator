create table public.creator_facebook_top_age_groups (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.creator_facebook_analytics(snapshot_id) on delete cascade,
  age_group text not null,
  created_at timestamptz not null default now(),
  constraint creator_facebook_top_age_groups_snapshot_key unique (snapshot_id),
  constraint creator_facebook_top_age_groups_age_group_check
    check (age_group in ('18–24', '25–34', '35–44', 'Other'))
);

create table public.creator_facebook_top_locations (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.creator_facebook_analytics(snapshot_id) on delete cascade,
  location_name text not null,
  display_order integer not null,
  created_at timestamptz not null default now(),
  constraint creator_facebook_top_locations_snapshot_location_name_key unique (snapshot_id, location_name),
  constraint creator_facebook_top_locations_display_order_check check (display_order between 1 and 5),
  constraint creator_facebook_top_locations_location_name_check check (nullif(btrim(location_name), '') is not null)
);

create index creator_facebook_top_age_groups_snapshot_id_idx
  on public.creator_facebook_top_age_groups(snapshot_id);

create index creator_facebook_top_locations_snapshot_id_idx
  on public.creator_facebook_top_locations(snapshot_id);

create unique index creator_facebook_top_locations_snapshot_name_ci_key
  on public.creator_facebook_top_locations(snapshot_id, lower(location_name));

alter table public.creator_facebook_top_age_groups enable row level security;
alter table public.creator_facebook_top_locations enable row level security;

create policy "Creators can manage own Facebook top age group"
on public.creator_facebook_top_age_groups
for all to authenticated
using (exists (
  select 1
  from public.creator_facebook_analytics analytics
  join public.creator_social_analytics_snapshots snapshot on snapshot.id = analytics.snapshot_id
  join public.creator_social_platforms platform_profile on platform_profile.id = snapshot.social_platform_id
  join public.creators creator on creator.id = platform_profile.creator_id
  where analytics.snapshot_id = creator_facebook_top_age_groups.snapshot_id
    and snapshot.platform = 'facebook'
    and creator.auth_user_id = auth.uid()
))
with check (exists (
  select 1
  from public.creator_facebook_analytics analytics
  join public.creator_social_analytics_snapshots snapshot on snapshot.id = analytics.snapshot_id
  join public.creator_social_platforms platform_profile on platform_profile.id = snapshot.social_platform_id
  join public.creators creator on creator.id = platform_profile.creator_id
  where analytics.snapshot_id = creator_facebook_top_age_groups.snapshot_id
    and snapshot.platform = 'facebook'
    and creator.auth_user_id = auth.uid()
));

create policy "Creators can manage own Facebook top locations"
on public.creator_facebook_top_locations
for all to authenticated
using (exists (
  select 1
  from public.creator_facebook_analytics analytics
  join public.creator_social_analytics_snapshots snapshot on snapshot.id = analytics.snapshot_id
  join public.creator_social_platforms platform_profile on platform_profile.id = snapshot.social_platform_id
  join public.creators creator on creator.id = platform_profile.creator_id
  where analytics.snapshot_id = creator_facebook_top_locations.snapshot_id
    and snapshot.platform = 'facebook'
    and creator.auth_user_id = auth.uid()
))
with check (exists (
  select 1
  from public.creator_facebook_analytics analytics
  join public.creator_social_analytics_snapshots snapshot on snapshot.id = analytics.snapshot_id
  join public.creator_social_platforms platform_profile on platform_profile.id = snapshot.social_platform_id
  join public.creators creator on creator.id = platform_profile.creator_id
  where analytics.snapshot_id = creator_facebook_top_locations.snapshot_id
    and snapshot.platform = 'facebook'
    and creator.auth_user_id = auth.uid()
));

revoke all on public.creator_facebook_top_age_groups from public, anon, authenticated;
revoke all on public.creator_facebook_top_locations from public, anon, authenticated;
grant select, insert, update, delete on public.creator_facebook_top_age_groups to authenticated;
grant select, insert, update, delete on public.creator_facebook_top_locations to authenticated;

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

    insert into public.creator_social_platforms (creator_id, platform, profile_url, username, audience_count, is_primary)
    values (
      v_creator_id,
      v_platform,
      btrim(v_account->>'profileUrl'),
      nullif(btrim(v_account->>'username'), ''),
      (v_account->>'audienceCount')::bigint,
      coalesce((v_account->>'isPrimary')::boolean, false)
    )
    on conflict (creator_id, platform) do update set
      profile_url = excluded.profile_url,
      username = excluded.username,
      audience_count = excluded.audience_count,
      is_primary = excluded.is_primary
    returning id into v_platform_id;

    if v_platform = 'youtube' then
      if coalesce((v_account->>'isPrimary')::boolean, false) then
        v_insights := v_account->'youtubeInsights';
        if v_insights is null
          or coalesce(v_insights->>'views', '') !~ '^[0-9]+$'
          or coalesce(v_insights->>'likes', '') !~ '^[0-9]+$'
          or coalesce(v_insights->>'shares', '') !~ '^[0-9]+$'
          or nullif(btrim(v_insights->>'topCountry'), '') is null then
          raise exception 'Primary YouTube insights are required';
        end if;

        insert into public.creator_youtube_analytics (social_platform_id, views, likes, shares, top_country)
        values (
          v_platform_id,
          (v_insights->>'views')::bigint,
          (v_insights->>'likes')::bigint,
          (v_insights->>'shares')::bigint,
          btrim(v_insights->>'topCountry')
        )
        on conflict (social_platform_id) do update set
          views = excluded.views,
          likes = excluded.likes,
          shares = excluded.shares,
          top_country = excluded.top_country;
      end if;
      continue;
    end if;

    if not coalesce((v_account->>'isPrimary')::boolean, false) then
      continue;
    end if;

    v_insights := case
      when v_platform = 'instagram' then v_account->'instagramInsights'
      else v_account->'facebookInsights'
    end;

    if v_insights is null then
      raise exception 'Primary platform analytics are required';
    end if;

    if v_platform = 'instagram' and (
      coalesce(v_insights#>>'{overview,views}', '') !~ '^[0-9]+$'
      or coalesce(v_insights#>>'{overview,netFollowers}', '') !~ '^[0-9]+$'
      or coalesce(v_insights#>>'{overview,interactions}', '') !~ '^[0-9]+$'
      or coalesce(v_insights#>>'{overview,viewersTotal}', '') !~ '^[0-9]+$'
      or coalesce(v_insights#>>'{overview,profileVisits}', '') !~ '^[0-9]+$'
      or coalesce(v_insights#>>'{audience,women}', '') !~ '^[0-9]+(\.[0-9]+)?$'
      or coalesce(v_insights#>>'{audience,men}', '') !~ '^[0-9]+(\.[0-9]+)?$'
      or case when coalesce(v_insights#>>'{audience,women}', '') ~ '^[0-9]+(\.[0-9]+)?$' then (v_insights#>>'{audience,women}')::numeric not between 0 and 100 else true end
      or case when coalesce(v_insights#>>'{audience,men}', '') ~ '^[0-9]+(\.[0-9]+)?$' then (v_insights#>>'{audience,men}')::numeric not between 0 and 100 else true end
      or case when jsonb_typeof(v_insights#>'{audience,topAgeRanges}') = 'array' then jsonb_array_length(v_insights#>'{audience,topAgeRanges}') not between 1 and 2 else true end
      or case when jsonb_typeof(v_insights#>'{audience,topCities}') = 'array' then jsonb_array_length(v_insights#>'{audience,topCities}') not between 1 and 5 else true end
      or case when jsonb_typeof(v_insights#>'{audience,topAgeRanges}') = 'array' then exists (select 1 from jsonb_array_elements_text(v_insights#>'{audience,topAgeRanges}') value where nullif(btrim(value), '') is null) else true end
      or case when jsonb_typeof(v_insights#>'{audience,topCities}') = 'array' then exists (select 1 from jsonb_array_elements_text(v_insights#>'{audience,topCities}') value where nullif(btrim(value), '') is null) else true end
      or case when jsonb_typeof(v_insights#>'{audience,topAgeRanges}') = 'array' then (select count(distinct lower(btrim(value))) from jsonb_array_elements_text(v_insights#>'{audience,topAgeRanges}') value) <> jsonb_array_length(v_insights#>'{audience,topAgeRanges}') else true end
      or case when jsonb_typeof(v_insights#>'{audience,topCities}') = 'array' then (select count(distinct lower(btrim(value))) from jsonb_array_elements_text(v_insights#>'{audience,topCities}') value) <> jsonb_array_length(v_insights#>'{audience,topCities}') else true end
    ) then
      raise exception 'Primary Instagram insights are required';
    end if;

    if v_platform = 'facebook' and (
      coalesce(v_insights#>>'{overview,viewsTotal}', '') !~ '^[0-9]+$'
      or coalesce(v_insights#>>'{overview,viewers}', '') !~ '^[0-9]+$'
      or coalesce(v_insights#>>'{engagement,total}', '') !~ '^[0-9]+$'
      or coalesce(v_insights#>>'{audience,netFollowers}', '') !~ '^[0-9]+$'
      or coalesce(v_insights#>>'{audience,women}', '') !~ '^[0-9]+(\.[0-9]+)?$'
      or coalesce(v_insights#>>'{audience,men}', '') !~ '^[0-9]+(\.[0-9]+)?$'
      or case when coalesce(v_insights#>>'{audience,women}', '') ~ '^[0-9]+(\.[0-9]+)?$' then (v_insights#>>'{audience,women}')::numeric not between 0 and 100 else true end
      or case when coalesce(v_insights#>>'{audience,men}', '') ~ '^[0-9]+(\.[0-9]+)?$' then (v_insights#>>'{audience,men}')::numeric not between 0 and 100 else true end
      or coalesce(v_insights#>>'{audience,topAgeGroup}', '') not in ('18–24', '25–34', '35–44', 'Other')
      or case when jsonb_typeof(v_insights#>'{audience,topCities}') = 'array' then jsonb_array_length(v_insights#>'{audience,topCities}') not between 1 and 5 else true end
      or case when jsonb_typeof(v_insights#>'{audience,topCities}') = 'array' then exists (select 1 from jsonb_array_elements_text(v_insights#>'{audience,topCities}') value where nullif(btrim(value), '') is null) else true end
      or case when jsonb_typeof(v_insights#>'{audience,topCities}') = 'array' then (select count(distinct lower(btrim(value))) from jsonb_array_elements_text(v_insights#>'{audience,topCities}') value) <> jsonb_array_length(v_insights#>'{audience,topCities}') else true end
    ) then
      raise exception 'Primary Facebook insights are required';
    end if;

    insert into public.creator_social_analytics_snapshots (social_platform_id, platform, period_days, is_current)
    values (
      v_platform_id,
      v_platform,
      case when v_platform = 'facebook' then 28 else (v_insights->>'period')::smallint end,
      true
    )
    on conflict (social_platform_id, period_days) where is_current do update set updated_at = now()
    returning id into v_snapshot_id;

    if v_platform = 'instagram' then
      insert into public.creator_instagram_analytics (
        snapshot_id, views_all_content, net_followers, interactions, viewers_total, profile_visits, women_percentage, men_percentage
      ) values (
        v_snapshot_id,
        (v_insights#>>'{overview,views}')::bigint,
        (v_insights#>>'{overview,netFollowers}')::bigint,
        (v_insights#>>'{overview,interactions}')::bigint,
        (v_insights#>>'{overview,viewersTotal}')::bigint,
        (v_insights#>>'{overview,profileVisits}')::bigint,
        (v_insights#>>'{audience,women}')::numeric,
        (v_insights#>>'{audience,men}')::numeric
      ) on conflict (snapshot_id) do update set
        views_all_content = excluded.views_all_content,
        net_followers = excluded.net_followers,
        interactions = excluded.interactions,
        viewers_total = excluded.viewers_total,
        profile_visits = excluded.profile_visits,
        women_percentage = excluded.women_percentage,
        men_percentage = excluded.men_percentage;

      delete from public.creator_instagram_top_age_ranges where snapshot_id = v_snapshot_id;
      insert into public.creator_instagram_top_age_ranges (snapshot_id, age_range, display_order)
      select v_snapshot_id, btrim(value), ord::integer
      from jsonb_array_elements_text(v_insights#>'{audience,topAgeRanges}') with ordinality as ranges(value, ord);

      delete from public.creator_instagram_top_locations where snapshot_id = v_snapshot_id;
      insert into public.creator_instagram_top_locations (snapshot_id, location_name, display_order)
      select v_snapshot_id, btrim(value), ord::integer
      from jsonb_array_elements_text(v_insights#>'{audience,topCities}') with ordinality as locations(value, ord);
    else
      insert into public.creator_facebook_analytics (
        snapshot_id, views_total, viewers, engagement_total, net_followers, women_percentage, men_percentage
      ) values (
        v_snapshot_id,
        (v_insights#>>'{overview,viewsTotal}')::bigint,
        (v_insights#>>'{overview,viewers}')::bigint,
        (v_insights#>>'{engagement,total}')::bigint,
        (v_insights#>>'{audience,netFollowers}')::bigint,
        (v_insights#>>'{audience,women}')::numeric,
        (v_insights#>>'{audience,men}')::numeric
      ) on conflict (snapshot_id) do update set
        views_total = excluded.views_total,
        viewers = excluded.viewers,
        engagement_total = excluded.engagement_total,
        net_followers = excluded.net_followers,
        women_percentage = excluded.women_percentage,
        men_percentage = excluded.men_percentage;

      delete from public.creator_facebook_top_age_groups where snapshot_id = v_snapshot_id;
      insert into public.creator_facebook_top_age_groups (snapshot_id, age_group)
      values (v_snapshot_id, btrim(v_insights#>>'{audience,topAgeGroup}'));

      delete from public.creator_facebook_top_locations where snapshot_id = v_snapshot_id;
      insert into public.creator_facebook_top_locations (snapshot_id, location_name, display_order)
      select v_snapshot_id, btrim(value), ord::integer
      from jsonb_array_elements_text(v_insights#>'{audience,topCities}') with ordinality as locations(value, ord);
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

create or replace function public.complete_creator_profile()
returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_creator public.creators%rowtype;
  v_completed_at timestamptz;
begin
  select *
  into v_creator
  from public.creators
  where auth_user_id = auth.uid()
  for update;

  if v_creator.id is null then
    raise exception 'Creator profile not found';
  end if;

  if v_creator.profile_completed_at is not null then
    return v_creator.profile_completed_at;
  end if;

  if not (
    nullif(btrim(v_creator.full_name), '') is not null
    and nullif(btrim(v_creator.email), '') is not null
    and nullif(btrim(v_creator.phone_number), '') is not null
    and nullif(btrim(v_creator.current_city), '') is not null
    and v_creator.date_of_birth is not null
    and nullif(btrim(v_creator.gender), '') is not null
  ) then
    raise exception 'Basic Information is incomplete';
  end if;

  if not exists (
    select 1
    from public.creator_identity identity_profile
    where identity_profile.creator_id = v_creator.id
      and nullif(btrim(identity_profile.display_name), '') is not null
      and nullif(btrim(identity_profile.bio), '') is not null
      and nullif(btrim(identity_profile.creator_type), '') is not null
  ) then
    raise exception 'Creator Identity is incomplete';
  end if;

  if not exists (
    select 1
    from public.creator_content_profile content_profile
    where content_profile.creator_id = v_creator.id
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
  ) then
    raise exception 'Content & Niche is incomplete';
  end if;

  if exists (
    select 1
    from public.creator_social_platforms platform_profile
    where platform_profile.creator_id = v_creator.id
      and (
        platform_profile.profile_url !~* '^https?://'
        or platform_profile.audience_count < 0
      )
  ) or not exists (
    select 1
    from public.creator_social_platforms platform_profile
    where platform_profile.creator_id = v_creator.id
      and platform_profile.is_primary
  ) or not exists (
    select 1
    from public.creator_social_platforms platform_profile
    where platform_profile.creator_id = v_creator.id
  ) then
    raise exception 'Social Platforms is incomplete';
  end if;

  if not exists (
    select 1
    from public.creator_social_platforms platform_profile
    where platform_profile.creator_id = v_creator.id
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
              and analytics.net_followers >= 0
              and analytics.interactions >= 0
              and analytics.viewers_total >= 0
              and analytics.profile_visits >= 0
              and analytics.women_percentage between 0 and 100
              and analytics.men_percentage between 0 and 100
              and exists (
                select 1
                from public.creator_instagram_top_age_ranges top_age_range
                where top_age_range.snapshot_id = snapshot.id
              )
              and exists (
                select 1
                from public.creator_instagram_top_locations top_location
                where top_location.snapshot_id = snapshot.id
              )
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
              and analytics.net_followers >= 0
              and analytics.women_percentage between 0 and 100
              and analytics.men_percentage between 0 and 100
              and 1 = (
                select count(*)
                from public.creator_facebook_top_age_groups top_age_group
                where top_age_group.snapshot_id = snapshot.id
              )
              and (
                select count(*)
                from public.creator_facebook_top_locations top_location
                where top_location.snapshot_id = snapshot.id
              ) between 1 and 5
          )
        )
      )
  ) then
    raise exception 'Social Platforms analytics are incomplete';
  end if;

  if not exists (
    select 1
    from public.creator_portfolio_items portfolio_item
    where portfolio_item.creator_id = v_creator.id
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
  ) then
    raise exception 'Portfolio is incomplete';
  end if;

  update public.creators
  set profile_completed_at = now()
  where id = v_creator.id
  returning profile_completed_at into v_completed_at;

  return v_completed_at;
end;
$$;

revoke all on function public.complete_creator_profile() from public, anon, authenticated;
grant execute on function public.complete_creator_profile() to authenticated;

create table if not exists public.creator_youtube_analytics (
  social_platform_id uuid not null,
  platform text not null default 'youtube' check (platform = 'youtube'),
  views bigint not null check (views >= 0),
  likes bigint not null check (likes >= 0),
  shares bigint not null check (shares >= 0),
  top_country text not null check (nullif(btrim(top_country), '') is not null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (social_platform_id),
  constraint creator_youtube_analytics_platform_fk
    foreign key (social_platform_id, platform)
    references public.creator_social_platforms(id, platform) on delete cascade
);

create trigger set_creator_youtube_analytics_updated_at
before update on public.creator_youtube_analytics
for each row
execute procedure public.handle_updated_at();

alter table public.creator_youtube_analytics enable row level security;

create policy "Creators can manage own YouTube analytics"
on public.creator_youtube_analytics
for all
to authenticated
using (exists (
  select 1
  from public.creator_social_platforms platform_profile
  join public.creators creator on creator.id = platform_profile.creator_id
  where platform_profile.id = creator_youtube_analytics.social_platform_id
    and creator.auth_user_id = auth.uid()
))
with check (exists (
  select 1
  from public.creator_social_platforms platform_profile
  join public.creators creator on creator.id = platform_profile.creator_id
  where platform_profile.id = creator_youtube_analytics.social_platform_id
    and creator.auth_user_id = auth.uid()
));

revoke all on public.creator_youtube_analytics from anon, authenticated;
grant select, insert, update, delete on public.creator_youtube_analytics to authenticated;

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
  if jsonb_typeof(p_accounts) <> 'array' then raise exception 'Invalid social platform payload'; end if;
  select id into v_creator_id from public.creators where auth_user_id = auth.uid();
  if v_creator_id is null then raise exception 'Creator profile not found'; end if;

  update public.creator_social_platforms set is_primary = false where creator_id = v_creator_id and is_primary;

  for v_account in select value from jsonb_array_elements(p_accounts) loop
    v_platform := lower(v_account->>'platform');
    if v_platform not in ('instagram', 'facebook', 'youtube') then raise exception 'Unsupported platform'; end if;
    insert into public.creator_social_platforms (creator_id, platform, profile_url, username, audience_count, is_primary)
    values (v_creator_id, v_platform, btrim(v_account->>'profileUrl'), nullif(btrim(v_account->>'username'), ''), (v_account->>'audienceCount')::bigint, coalesce((v_account->>'isPrimary')::boolean, false))
    on conflict (creator_id, platform) do update set profile_url = excluded.profile_url, username = excluded.username, audience_count = excluded.audience_count, is_primary = excluded.is_primary
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

    if not coalesce((v_account->>'isPrimary')::boolean, false) then continue; end if;
    v_insights := case when v_platform = 'instagram' then v_account->'instagramInsights' else v_account->'facebookInsights' end;
    if v_insights is null then raise exception 'Primary platform analytics are required'; end if;
    insert into public.creator_social_analytics_snapshots (social_platform_id, platform, period_days, is_current)
    values (v_platform_id, v_platform, (v_insights->>'period')::smallint, true)
    on conflict (social_platform_id, period_days) where is_current do update set updated_at = now()
    returning id into v_snapshot_id;

    if v_platform = 'instagram' then
      insert into public.creator_instagram_analytics (
        snapshot_id, views_all_content, overview_followers_percentage, overview_non_followers_percentage, net_followers, interactions, viewers_total, posts_views, reels_views, stories_views, live_videos_views, all_interactions, posts_interactions, reels_interactions, stories_interactions, live_videos_interactions, profile_visits, bio_link_taps, business_address_taps, audience_followers, follower_growth, women_percentage, men_percentage
      ) values (
        v_snapshot_id, nullif(v_insights#>>'{overview,views}','')::bigint, nullif(v_insights#>>'{overview,followersPercent}','')::numeric, nullif(v_insights#>>'{overview,nonFollowersPercent}','')::numeric, nullif(v_insights#>>'{overview,netFollowers}','')::bigint, nullif(v_insights#>>'{overview,interactions}','')::bigint, nullif(v_insights#>>'{overview,viewersTotal}','')::bigint, nullif(v_insights#>>'{overview,postsViews}','')::bigint, nullif(v_insights#>>'{overview,reelsViews}','')::bigint, nullif(v_insights#>>'{overview,storiesViews}','')::bigint, nullif(v_insights#>>'{overview,liveVideosViews}','')::bigint, nullif(v_insights#>>'{overview,allInteractions}','')::bigint, nullif(v_insights#>>'{overview,postsInteractions}','')::bigint, nullif(v_insights#>>'{overview,reelsInteractions}','')::bigint, nullif(v_insights#>>'{overview,storiesInteractions}','')::bigint, nullif(v_insights#>>'{overview,liveVideosInteractions}','')::bigint, nullif(v_insights#>>'{overview,profileVisits}','')::bigint, nullif(v_insights#>>'{overview,bioLinkTaps}','')::bigint, nullif(v_insights#>>'{overview,businessAddressTaps}','')::bigint, nullif(v_insights#>>'{audience,followers}','')::bigint, nullif(v_insights#>>'{audience,followerGrowth}','')::bigint, nullif(v_insights#>>'{audience,women}','')::numeric, nullif(v_insights#>>'{audience,men}','')::numeric
      ) on conflict (snapshot_id) do update set
        views_all_content=excluded.views_all_content, overview_followers_percentage=excluded.overview_followers_percentage, overview_non_followers_percentage=excluded.overview_non_followers_percentage, net_followers=excluded.net_followers, interactions=excluded.interactions, viewers_total=excluded.viewers_total, posts_views=excluded.posts_views, reels_views=excluded.reels_views, stories_views=excluded.stories_views, live_videos_views=excluded.live_videos_views, all_interactions=excluded.all_interactions, posts_interactions=excluded.posts_interactions, reels_interactions=excluded.reels_interactions, stories_interactions=excluded.stories_interactions, live_videos_interactions=excluded.live_videos_interactions, profile_visits=excluded.profile_visits, bio_link_taps=excluded.bio_link_taps, business_address_taps=excluded.business_address_taps, audience_followers=excluded.audience_followers, follower_growth=excluded.follower_growth, women_percentage=excluded.women_percentage, men_percentage=excluded.men_percentage;
      delete from public.creator_social_audience_age_ranges where snapshot_id=v_snapshot_id;
      insert into public.creator_social_audience_age_ranges(snapshot_id,range_label,percentage,sort_order)
      select v_snapshot_id, key, value::numeric, ord::smallint from jsonb_each_text(coalesce(v_insights#>'{audience,ages}','{}'::jsonb)) with ordinality as a(key,value,ord) where btrim(value) <> '';
    else
      insert into public.creator_facebook_analytics (snapshot_id,views_total,viewers,view_type_views,view_type_three_second_views,view_type_one_minute_views,overview_viewer_followers_percentage,overview_viewer_non_followers_percentage,engagement_total,engagement_viewer_followers_percentage,engagement_viewer_non_followers_percentage,new_conversations,net_followers,women_percentage,men_percentage)
      values (v_snapshot_id,nullif(v_insights#>>'{overview,viewsTotal}','')::bigint,nullif(v_insights#>>'{overview,viewers}','')::bigint,nullif(v_insights#>>'{overview,viewType,views}','')::bigint,nullif(v_insights#>>'{overview,viewType,threeSecondViews}','')::bigint,nullif(v_insights#>>'{overview,viewType,oneMinuteViews}','')::bigint,nullif(v_insights#>>'{overview,viewerType,followers}','')::numeric,nullif(v_insights#>>'{overview,viewerType,nonFollowers}','')::numeric,nullif(v_insights#>>'{engagement,total}','')::bigint,nullif(v_insights#>>'{engagement,viewerType,followers}','')::numeric,nullif(v_insights#>>'{engagement,viewerType,nonFollowers}','')::numeric,nullif(v_insights#>>'{engagement,newConversations}','')::bigint,nullif(v_insights#>>'{audience,netFollowers}','')::bigint,nullif(v_insights#>>'{audience,women}','')::numeric,nullif(v_insights#>>'{audience,men}','')::numeric)
      on conflict (snapshot_id) do update set views_total=excluded.views_total,viewers=excluded.viewers,view_type_views=excluded.view_type_views,view_type_three_second_views=excluded.view_type_three_second_views,view_type_one_minute_views=excluded.view_type_one_minute_views,overview_viewer_followers_percentage=excluded.overview_viewer_followers_percentage,overview_viewer_non_followers_percentage=excluded.overview_viewer_non_followers_percentage,engagement_total=excluded.engagement_total,engagement_viewer_followers_percentage=excluded.engagement_viewer_followers_percentage,engagement_viewer_non_followers_percentage=excluded.engagement_viewer_non_followers_percentage,new_conversations=excluded.new_conversations,net_followers=excluded.net_followers,women_percentage=excluded.women_percentage,men_percentage=excluded.men_percentage;
      delete from public.creator_social_audience_age_ranges where snapshot_id=v_snapshot_id;
      insert into public.creator_social_audience_age_ranges(snapshot_id,range_label,percentage,sort_order)
      select v_snapshot_id, item->>'name', (item->>'value')::numeric, ord::smallint from jsonb_array_elements(coalesce(v_insights#>'{audience,ageGroups}','[]'::jsonb)) with ordinality as x(item,ord) where btrim(item->>'name')<>'' and btrim(item->>'value')<>'';
      delete from public.creator_facebook_analytics_breakdowns where snapshot_id=v_snapshot_id;
      insert into public.creator_facebook_analytics_breakdowns (snapshot_id,breakdown_kind,label,count_value,percentage_value,sort_order)
      select v_snapshot_id, kind, label, count_value, percentage_value, sort_order
      from (
        select 'view_media_type'::text kind, item->>'mediaType' label, null::bigint count_value, (item->>'percentage')::numeric percentage_value, ord::smallint sort_order
        from jsonb_array_elements(coalesce(v_insights#>'{overview,mediaTypes}','[]'::jsonb)) with ordinality x(item,ord)
        where btrim(item->>'mediaType') <> '' and btrim(item->>'percentage') <> ''
        union all
        select 'engagement_media_type', item->>'mediaType', (item->>'count')::bigint, null::numeric, ord::smallint
        from jsonb_array_elements(coalesce(v_insights#>'{engagement,mediaTypes}','[]'::jsonb)) with ordinality x(item,ord)
        where btrim(item->>'mediaType') <> '' and btrim(item->>'count') <> ''
        union all
        select 'interaction_type', item->>'name', (item->>'value')::bigint, null::numeric, ord::smallint
        from jsonb_array_elements(coalesce(v_insights#>'{engagement,interactionTypes}','[]'::jsonb)) with ordinality x(item,ord)
        where btrim(item->>'name') <> '' and btrim(item->>'value') <> ''
        union all
        select 'traffic', item->>'name', null::bigint, (item->>'value')::numeric, ord::smallint
        from jsonb_array_elements(coalesce(v_insights->'traffic','[]'::jsonb)) with ordinality x(item,ord)
        where btrim(item->>'name') <> '' and btrim(item->>'value') <> ''
        union all
        select 'source', item->>'name', null::bigint, (item->>'value')::numeric, ord::smallint
        from jsonb_array_elements(coalesce(v_insights->'source','[]'::jsonb)) with ordinality x(item,ord)
        where btrim(item->>'name') <> '' and btrim(item->>'value') <> ''
      ) rows;
    end if;
    delete from public.creator_social_audience_locations where snapshot_id=v_snapshot_id;
    insert into public.creator_social_audience_locations(snapshot_id,location_kind,location_name,percentage,sort_order)
    select v_snapshot_id, kind, item->>'name', (item->>'percentage')::numeric, ord::smallint from (select 'country'::text kind, item, ord from jsonb_array_elements(coalesce(v_insights#>'{audience,locations,countries}','[]'::jsonb)) with ordinality x(item,ord) union all select 'city', item, ord from jsonb_array_elements(coalesce(v_insights#>'{audience,locations,cities}','[]'::jsonb)) with ordinality x(item,ord)) q where btrim(item->>'name')<>'' and btrim(item->>'percentage')<>'';
  end loop;
  delete from public.creator_social_platforms p where p.creator_id=v_creator_id and not exists (select 1 from jsonb_array_elements(p_accounts) a where lower(a->>'platform')=p.platform);
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

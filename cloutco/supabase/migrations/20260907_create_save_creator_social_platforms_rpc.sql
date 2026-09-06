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

    if not coalesce((v_account->>'isPrimary')::boolean, false) or v_platform = 'youtube' then continue; end if;
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

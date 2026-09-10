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

  update public.creators
  set profile_completed_at = now()
  where id = v_creator.id
  returning profile_completed_at into v_completed_at;

  return v_completed_at;
end;
$$;

revoke all on function public.complete_creator_profile() from public, anon, authenticated;
grant execute on function public.complete_creator_profile() to authenticated;

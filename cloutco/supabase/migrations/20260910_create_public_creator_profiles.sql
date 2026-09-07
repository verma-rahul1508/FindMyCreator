create extension if not exists "pgcrypto";

alter table public.creators
  add column if not exists public_profile_id uuid;

update public.creators
set public_profile_id = gen_random_uuid()
where public_profile_id is null;

alter table public.creators
  alter column public_profile_id set default gen_random_uuid(),
  alter column public_profile_id set not null;

create unique index if not exists uq_creators_public_profile_id
  on public.creators (public_profile_id);

create or replace function public.get_public_creator_profile(p_public_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_profile jsonb;
begin
  select jsonb_strip_nulls(jsonb_build_object(
    'displayName', nullif(btrim(identity_profile.display_name), ''),
    'username', nullif(btrim(identity_profile.username), ''),
    'bio', nullif(btrim(identity_profile.bio), ''),
    'languages', coalesce(to_jsonb(identity_profile.languages), '[]'::jsonb),
    'creatorType', case
      when identity_profile.creator_type = 'other' then nullif(btrim(identity_profile.creator_type_other), '')
      else nullif(btrim(identity_profile.creator_type), '')
    end,
    'city', nullif(btrim(creator.current_city), ''),
    'content', jsonb_strip_nulls(jsonb_build_object(
      'primaryNiche', case
        when content_profile.primary_niche = 'Other' then nullif(btrim(content_profile.primary_niche_other), '')
        else nullif(btrim(content_profile.primary_niche), '')
      end,
      'otherNiches', coalesce(to_jsonb(content_profile.other_niches), '[]'::jsonb),
      'contentFormats', coalesce(to_jsonb(content_profile.content_formats), '[]'::jsonb),
      'contentStyles', coalesce(to_jsonb(content_profile.content_styles), '[]'::jsonb)
    )),
    'socialAccounts', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'platform', platform_profile.platform,
        'profileUrl', nullif(btrim(platform_profile.profile_url), ''),
        'username', nullif(btrim(platform_profile.username), ''),
        'audienceCount', platform_profile.audience_count,
        'isPrimary', platform_profile.is_primary,
        'insights', case platform_profile.platform
          when 'instagram' then jsonb_strip_nulls(jsonb_build_object(
            'periodDays', snapshot.period_days,
            'views', instagram_analytics.views_all_content,
            'interactions', instagram_analytics.interactions,
            'netFollowers', instagram_analytics.net_followers,
            'followerGrowth', instagram_analytics.follower_growth,
            'womenPercentage', instagram_analytics.women_percentage,
            'menPercentage', instagram_analytics.men_percentage,
            'ageRanges', coalesce((
              select jsonb_agg(jsonb_build_object('label', age_range.range_label, 'percentage', age_range.percentage) order by age_range.sort_order)
              from public.creator_social_audience_age_ranges age_range
              where age_range.snapshot_id = snapshot.id
            ), '[]'::jsonb),
            'countries', coalesce((
              select jsonb_agg(jsonb_build_object('name', location.location_name, 'percentage', location.percentage) order by location.sort_order)
              from public.creator_social_audience_locations location
              where location.snapshot_id = snapshot.id and location.location_kind = 'country'
            ), '[]'::jsonb),
            'cities', coalesce((
              select jsonb_agg(jsonb_build_object('name', location.location_name, 'percentage', location.percentage) order by location.sort_order)
              from public.creator_social_audience_locations location
              where location.snapshot_id = snapshot.id and location.location_kind = 'city'
            ), '[]'::jsonb)
          ))
          when 'facebook' then jsonb_strip_nulls(jsonb_build_object(
            'periodDays', snapshot.period_days,
            'views', facebook_analytics.views_total,
            'interactions', facebook_analytics.engagement_total,
            'netFollowers', facebook_analytics.net_followers,
            'womenPercentage', facebook_analytics.women_percentage,
            'menPercentage', facebook_analytics.men_percentage,
            'ageRanges', coalesce((
              select jsonb_agg(jsonb_build_object('label', age_range.range_label, 'percentage', age_range.percentage) order by age_range.sort_order)
              from public.creator_social_audience_age_ranges age_range
              where age_range.snapshot_id = snapshot.id
            ), '[]'::jsonb),
            'countries', coalesce((
              select jsonb_agg(jsonb_build_object('name', location.location_name, 'percentage', location.percentage) order by location.sort_order)
              from public.creator_social_audience_locations location
              where location.snapshot_id = snapshot.id and location.location_kind = 'country'
            ), '[]'::jsonb),
            'cities', coalesce((
              select jsonb_agg(jsonb_build_object('name', location.location_name, 'percentage', location.percentage) order by location.sort_order)
              from public.creator_social_audience_locations location
              where location.snapshot_id = snapshot.id and location.location_kind = 'city'
            ), '[]'::jsonb)
          ))
          else null
        end
      )) order by platform_profile.is_primary desc, platform_profile.platform
      )
      from public.creator_social_platforms platform_profile
      left join lateral (
        select social_snapshot.id, social_snapshot.period_days
        from public.creator_social_analytics_snapshots social_snapshot
        where social_snapshot.social_platform_id = platform_profile.id
          and social_snapshot.is_current
        order by social_snapshot.updated_at desc
        limit 1
      ) snapshot on true
      left join public.creator_instagram_analytics instagram_analytics on instagram_analytics.snapshot_id = snapshot.id
      left join public.creator_facebook_analytics facebook_analytics on facebook_analytics.snapshot_id = snapshot.id
      where platform_profile.creator_id = creator.id
    ), '[]'::jsonb),
    'portfolioItems', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'contentUrl', portfolio_item.content_url,
        'platform', portfolio_item.platform,
        'contentType', portfolio_item.content_type,
        'title', portfolio_item.title,
        'description', portfolio_item.description,
        'thumbnailUrl', portfolio_item.thumbnail_url
      )) order by portfolio_item.sort_order)
      from public.creator_portfolio_items portfolio_item
      where portfolio_item.creator_id = creator.id
    ), '[]'::jsonb)
  ))
  into v_profile
  from public.creators creator
  left join public.creator_identity identity_profile on identity_profile.creator_id = creator.id
  left join public.creator_content_profile content_profile on content_profile.creator_id = creator.id
  where creator.public_profile_id = p_public_profile_id;

  return v_profile;
end;
$$;

revoke all on function public.get_public_creator_profile(uuid) from public, anon, authenticated;
grant execute on function public.get_public_creator_profile(uuid) to anon, authenticated;

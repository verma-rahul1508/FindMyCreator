-- Canonical, itemised completion states for the Admin experience.
create or replace function public.admin_creator_section_completion(p_creator_id uuid)
returns table (section_key text, completed boolean)
language plpgsql stable security definer set search_path = pg_catalog, public
as $$
declare v_basic boolean; v_identity boolean; v_content boolean; v_social boolean;
begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  select exists (select 1 from public.creators creator where creator.id = p_creator_id and nullif(btrim(creator.full_name), '') is not null and nullif(btrim(creator.email), '') is not null and nullif(btrim(creator.phone_number), '') is not null and nullif(btrim(creator.current_city), '') is not null and creator.date_of_birth is not null and nullif(btrim(creator.gender), '') is not null) into v_basic;
  select exists (select 1 from public.creator_identity identity_profile where identity_profile.creator_id = p_creator_id and nullif(btrim(identity_profile.display_name), '') is not null and nullif(btrim(identity_profile.bio), '') is not null and nullif(btrim(identity_profile.creator_type), '') is not null) into v_identity;
  select exists (select 1 from public.creator_content_profile content_profile where content_profile.creator_id = p_creator_id and nullif(btrim(content_profile.primary_niche), '') is not null and cardinality(content_profile.content_formats) > 0 and cardinality(content_profile.content_styles) > 0 and not exists (select 1 from unnest(content_profile.content_formats) value where nullif(btrim(value), '') is null) and not exists (select 1 from unnest(content_profile.content_styles) value where nullif(btrim(value), '') is null) and (content_profile.primary_niche <> 'Other' or nullif(btrim(content_profile.primary_niche_other), '') is not null) and not exists (select 1 from unnest(coalesce(content_profile.other_niches, '{}'::text[])) value where nullif(btrim(value), '') is null) and (not ('Other' = any(coalesce(content_profile.other_niches, '{}'::text[]))) or nullif(btrim(content_profile.other_niches_other), '') is not null) and (not ('Other' = any(content_profile.content_formats)) or nullif(btrim(content_profile.content_formats_other), '') is not null) and (not ('Other' = any(content_profile.content_styles)) or nullif(btrim(content_profile.content_styles_other), '') is not null)) into v_content;
  select exists (
    select 1 from public.creator_social_platforms platform_profile where platform_profile.creator_id = p_creator_id and platform_profile.is_primary
      and not exists (select 1 from public.creator_social_platforms invalid_platform where invalid_platform.creator_id = p_creator_id and (invalid_platform.profile_url !~* '^https?://' or invalid_platform.audience_count < 0))
      and (
        (platform_profile.platform = 'youtube' and exists (select 1 from public.creator_youtube_analytics analytics where analytics.social_platform_id = platform_profile.id and analytics.views >= 0 and analytics.likes >= 0 and analytics.shares >= 0 and nullif(btrim(analytics.top_country), '') is not null))
        or (platform_profile.platform = 'instagram' and exists (select 1 from public.creator_social_analytics_snapshots snapshot join public.creator_instagram_analytics analytics on analytics.snapshot_id = snapshot.id where snapshot.social_platform_id = platform_profile.id and snapshot.platform = 'instagram' and snapshot.is_current and analytics.views_all_content >= 0 and analytics.net_followers >= 0 and analytics.interactions >= 0 and analytics.viewers_total >= 0 and analytics.profile_visits >= 0 and analytics.women_percentage between 0 and 100 and analytics.men_percentage between 0 and 100 and (select count(*) from public.creator_instagram_top_age_ranges selection where selection.snapshot_id = snapshot.id) between 1 and 2 and (select count(*) from public.creator_instagram_top_locations selection where selection.snapshot_id = snapshot.id) between 1 and 5))
        or (platform_profile.platform = 'facebook' and exists (select 1 from public.creator_social_analytics_snapshots snapshot join public.creator_facebook_analytics analytics on analytics.snapshot_id = snapshot.id where snapshot.social_platform_id = platform_profile.id and snapshot.platform = 'facebook' and snapshot.is_current and analytics.views_total >= 0 and analytics.viewers >= 0 and analytics.engagement_total >= 0 and analytics.net_followers >= 0 and analytics.women_percentage between 0 and 100 and analytics.men_percentage between 0 and 100 and (select count(*) from public.creator_facebook_top_age_groups selection where selection.snapshot_id = snapshot.id) = 1 and (select count(*) from public.creator_facebook_top_locations selection where selection.snapshot_id = snapshot.id) between 1 and 5))
      )
  ) into v_social;
  return query values ('basic-information', v_basic), ('creator-identity', v_identity), ('content-and-niche', v_content), ('social-platforms', v_social);
end; $$;

create or replace function public.admin_creator_completed_sections(p_creator_id uuid)
returns integer language plpgsql stable security definer set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  return (select count(*)::integer from public.admin_creator_section_completion(p_creator_id) where completed);
end; $$;

create or replace function public.admin_completion_by_section()
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  return coalesce((select jsonb_object_agg(section_key, completed_count) from (
    select progress.section_key, count(*) filter (where progress.completed)::integer as completed_count
    from public.creators creator cross join lateral public.admin_creator_section_completion(creator.id) progress
    group by progress.section_key
  ) rows), '{}'::jsonb);
end; $$;

revoke all on function public.admin_creator_section_completion(uuid) from public, anon, authenticated;
revoke all on function public.admin_creator_completed_sections(uuid) from public, anon, authenticated;
revoke all on function public.admin_completion_by_section() from public, anon, authenticated;
grant execute on function public.admin_creator_section_completion(uuid), public.admin_creator_completed_sections(uuid), public.admin_completion_by_section() to authenticated;

alter table public.brands
  add column if not exists proposal_plan text not null default 'premium_service' check (proposal_plan = 'premium_service'),
  add column if not exists proposal_starting_investment numeric(14,2) not null default 25000 check (proposal_starting_investment >= 0),
  add column if not exists proposal_token uuid,
  add column if not exists proposal_sent_at timestamptz;

update public.brands
set proposal_token = gen_random_uuid()
where proposal_token is null;

alter table public.brands
  alter column proposal_token set not null;

create unique index if not exists brands_proposal_token_key on public.brands(proposal_token);

alter table public.brand_audit_log
  drop constraint if exists brand_audit_log_action_check;

alter table public.brand_audit_log
  add constraint brand_audit_log_action_check check (action in (
    'brand_created', 'brand_updated', 'status_changed', 'service_added', 'service_updated',
    'service_removed', 'final_price_changed', 'proposal_sent'
  ));

create or replace function public.get_brand_proposal(p_proposal_token uuid)
returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
declare
  v_proposal jsonb;
begin
  select jsonb_build_object(
    'proposalToken', brand.proposal_token,
    'brandName', brand.brand_name,
    'businessCategory', brand.business_category,
    'planLevel', 'Premium Service',
    'startingInvestment', brand.proposal_starting_investment,
    'totalInvestment', coalesce((
      select sum(service.final_price)
      from public.brand_services service
      where service.brand_id = brand.id
        and service.service_type = 'creator_collaboration'
    ), 0),
    'creators', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', service.creator_id,
        'name', coalesce(nullif(btrim(identity_profile.display_name), ''), nullif(btrim(service.creator_name), ''), creator.full_name),
        'platform', social_profile.platform,
        'profileUrl', social_profile.profile_url,
        'publicIdentifier', creator.public_profile_id,
        'followers', social_profile.audience_count,
        'views', social_profile.views,
        'niche', case
          when content_profile.primary_niche = 'Other' then nullif(btrim(content_profile.primary_niche_other), '')
          else nullif(btrim(content_profile.primary_niche), '')
        end,
        'deliverable', coalesce(nullif(btrim(service.deliverable_type), ''), 'Instagram Reel'),
        'quantity', coalesce(service.quantity, 1),
        'creativeConcept', nullif(btrim(service.production_notes), '')
      )) order by service.service_order)
      from public.brand_services service
      join public.creators creator on creator.id = service.creator_id
      left join public.creator_identity identity_profile on identity_profile.creator_id = creator.id
      left join public.creator_content_profile content_profile on content_profile.creator_id = creator.id
      left join lateral (
        select platform_profile.platform,
          nullif(btrim(platform_profile.profile_url), '') as profile_url,
          platform_profile.audience_count,
          case platform_profile.platform
            when 'instagram' then instagram_analytics.views_all_content
            when 'facebook' then facebook_analytics.views_total
            when 'youtube' then youtube_analytics.views
            else null
          end as views
        from public.creator_social_platforms platform_profile
        left join lateral (
          select snapshot.id
          from public.creator_social_analytics_snapshots snapshot
          where snapshot.social_platform_id = platform_profile.id
            and snapshot.is_current
          order by snapshot.updated_at desc
          limit 1
        ) current_snapshot on true
        left join public.creator_instagram_analytics instagram_analytics on instagram_analytics.snapshot_id = current_snapshot.id
        left join public.creator_facebook_analytics facebook_analytics on facebook_analytics.snapshot_id = current_snapshot.id
        left join public.creator_youtube_analytics youtube_analytics on youtube_analytics.social_platform_id = platform_profile.id
        where platform_profile.creator_id = creator.id
          and (service.platform is null or platform_profile.platform = service.platform)
        order by platform_profile.is_primary desc, platform_profile.platform
        limit 1
      ) social_profile on true
      where service.brand_id = brand.id
        and service.service_type = 'creator_collaboration'
        and service.creator_id is not null
    ), '[]'::jsonb)
  )
  into v_proposal
  from public.brands brand
  where brand.proposal_token = p_proposal_token;

  if v_proposal is null then
    raise exception 'Proposal not found' using errcode = 'P0002';
  end if;

  return v_proposal;
end;
$$;

create or replace function public.admin_brand_proposal_detail(p_brand_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
declare
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;

  select public.get_brand_proposal(brand.proposal_token) || jsonb_build_object(
    'recipientEmail', brand.email,
    'contactPerson', brand.contact_person,
    'sentAt', brand.proposal_sent_at
  )
  into v_result
  from public.brands brand
  where brand.id = p_brand_id;

  if v_result is null then
    raise exception 'Brand not found' using errcode = 'P0002';
  end if;

  return v_result;
end;
$$;

revoke all on function public.get_brand_proposal(uuid), public.admin_brand_proposal_detail(uuid) from public, anon, authenticated;
grant execute on function public.get_brand_proposal(uuid) to anon, authenticated;
grant execute on function public.admin_brand_proposal_detail(uuid) to authenticated;

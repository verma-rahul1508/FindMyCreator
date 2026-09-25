alter table public.brand_services
  drop constraint if exists brand_services_service_type_check;

alter table public.brand_services
  add constraint brand_services_service_type_check check (service_type in (
    'creator_collaboration', 'shoot', 'editing', 'meta_ads', 'google_ads', 'street_marketing'
  ));

create or replace function public.admin_save_brand(p_brand jsonb, p_services jsonb default '[]'::jsonb, p_submit boolean default false)
returns uuid
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_brand_id uuid;
  v_brand_exists boolean := false;
  v_previous_status text;
  v_old_total numeric := 0;
  v_new_total numeric := 0;
  v_service jsonb;
  v_service_id uuid;
  v_creator_id uuid;
  v_service_type text;
  v_final_price numeric;
  v_seen_ids uuid[] := '{}'::uuid[];
  v_status text := coalesce(nullif(lower(btrim(p_brand->>'status')), ''), 'draft');
begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  if jsonb_typeof(p_brand) <> 'object' or jsonb_typeof(p_services) <> 'array' then raise exception 'Invalid brand payload'; end if;
  if v_status not in ('draft', 'active', 'completed', 'archived') then raise exception 'Invalid brand status'; end if;
  if p_submit and (
    nullif(btrim(p_brand->>'brandName'), '') is null or nullif(btrim(p_brand->>'contactPerson'), '') is null
    or nullif(btrim(p_brand->>'phoneNumber'), '') is null or nullif(btrim(p_brand->>'email'), '') is null
    or nullif(btrim(p_brand->>'city'), '') is null or nullif(btrim(p_brand->>'businessCategory'), '') is null
    or btrim(p_brand->>'email') !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    or length(regexp_replace(coalesce(p_brand->>'phoneNumber', ''), '[^0-9+]', '', 'g')) not between 7 and 20
  ) then raise exception 'Complete the required brand fields with valid contact details'; end if;

  if nullif(btrim(p_brand->>'id'), '') is not null then
    v_brand_id := (p_brand->>'id')::uuid;
    select true, status, coalesce((select sum(final_price) from public.brand_services where brand_id = v_brand_id), 0)
      into v_brand_exists, v_previous_status, v_old_total from public.brands where id = v_brand_id for update;
    if not v_brand_exists then raise exception 'Brand not found' using errcode = 'P0002'; end if;
    update public.brands set
      brand_name = nullif(btrim(p_brand->>'brandName'), ''), contact_person = nullif(btrim(p_brand->>'contactPerson'), ''),
      phone_number = nullif(btrim(p_brand->>'phoneNumber'), ''), email = nullif(btrim(p_brand->>'email'), ''),
      city = nullif(btrim(p_brand->>'city'), ''), business_category = nullif(btrim(p_brand->>'businessCategory'), ''),
      website = nullif(btrim(p_brand->>'website'), ''), instagram = nullif(btrim(p_brand->>'instagram'), ''),
      business_address = nullif(btrim(p_brand->>'businessAddress'), ''), gstin = nullif(btrim(p_brand->>'gstin'), ''),
      internal_notes = nullif(btrim(p_brand->>'internalNotes'), ''), status = v_status
    where id = v_brand_id;
    insert into public.brand_audit_log(brand_id, action, changed_by) values (v_brand_id, 'brand_updated', auth.uid());
    if v_previous_status is distinct from v_status then
      insert into public.brand_audit_log(brand_id, action, changed_by, details) values (v_brand_id, 'status_changed', auth.uid(), jsonb_build_object('from', v_previous_status, 'to', v_status));
    end if;
  else
    insert into public.brands(brand_name, contact_person, phone_number, email, city, business_category, website, instagram, business_address, gstin, internal_notes, status)
    values (nullif(btrim(p_brand->>'brandName'), ''), nullif(btrim(p_brand->>'contactPerson'), ''), nullif(btrim(p_brand->>'phoneNumber'), ''), nullif(btrim(p_brand->>'email'), ''), nullif(btrim(p_brand->>'city'), ''), nullif(btrim(p_brand->>'businessCategory'), ''), nullif(btrim(p_brand->>'website'), ''), nullif(btrim(p_brand->>'instagram'), ''), nullif(btrim(p_brand->>'businessAddress'), ''), nullif(btrim(p_brand->>'gstin'), ''), nullif(btrim(p_brand->>'internalNotes'), ''), v_status)
    returning id into v_brand_id;
    insert into public.brand_audit_log(brand_id, action, changed_by) values (v_brand_id, 'brand_created', auth.uid());
  end if;

  for v_service in select value from jsonb_array_elements(p_services) loop
    v_service_type := lower(coalesce(v_service->>'serviceType', ''));
    if v_service_type not in ('creator_collaboration', 'shoot', 'editing', 'meta_ads', 'google_ads', 'street_marketing') then raise exception 'Invalid service type'; end if;
    if coalesce(v_service->>'finalPrice', '') !~ '^[0-9]+(\.[0-9]{1,2})?$' then raise exception 'Each service requires a valid final price'; end if;
    v_final_price := (v_service->>'finalPrice')::numeric;
    if v_final_price < 0 then raise exception 'Final price cannot be negative'; end if;
    if v_service_type in ('meta_ads', 'google_ads') and (coalesce(v_service->>'dailyAdBudget', '') !~ '^[0-9]+(\.[0-9]{1,2})?$' or coalesce(v_service->>'numberOfDays', '') !~ '^[0-9]+$' or (v_service->>'numberOfDays')::integer < 1) then raise exception 'Advertising services require a daily budget and number of days'; end if;
    v_creator_id := nullif(btrim(v_service->>'creatorId'), '')::uuid;
    if v_creator_id is not null and not exists (select 1 from public.creators where id = v_creator_id) then raise exception 'Selected creator no longer exists'; end if;
    if nullif(btrim(v_service->>'id'), '') is not null then
      v_service_id := (v_service->>'id')::uuid;
      if not exists (select 1 from public.brand_services where id = v_service_id and brand_id = v_brand_id) then raise exception 'Service not found'; end if;
      update public.brand_services set
        service_type = v_service_type, service_order = coalesce((v_service->>'serviceOrder')::integer, 1), creator_id = v_creator_id,
        creator_name = nullif(btrim(v_service->>'creatorName'), ''), platform = nullif(lower(btrim(v_service->>'platform')), ''),
        deliverable_type = nullif(btrim(v_service->>'deliverableType'), ''), quantity = nullif(v_service->>'quantity', '')::integer,
        creator_fee = nullif(v_service->>'creatorFee', '')::numeric, shoot_type = nullif(btrim(v_service->>'shootType'), ''),
        shoot_date = nullif(v_service->>'shootDate', '')::date, location = nullif(btrim(v_service->>'location'), ''),
        duration_hours = nullif(v_service->>'durationHours', '')::numeric, deliverables = nullif(btrim(v_service->>'deliverables'), ''),
        production_notes = nullif(btrim(v_service->>'productionNotes'), ''), editing_type = nullif(btrim(v_service->>'editingType'), ''),
        turnaround_time = nullif(btrim(v_service->>'turnaroundTime'), ''), number_of_revisions = nullif(v_service->>'numberOfRevisions', '')::integer,
        reference_notes = nullif(btrim(v_service->>'referenceNotes'), ''), campaign_objective = nullif(btrim(v_service->>'campaignObjective'), ''),
        daily_ad_budget = nullif(v_service->>'dailyAdBudget', '')::numeric, number_of_days = nullif(v_service->>'numberOfDays', '')::integer,
        ad_spend = case when v_service_type in ('meta_ads', 'google_ads') then coalesce(nullif(v_service->>'dailyAdBudget', '')::numeric, 0) * coalesce(nullif(v_service->>'numberOfDays', '')::integer, 0) else null end,
        management_fee = nullif(v_service->>'managementFee', '')::numeric, final_price = v_final_price
      where id = v_service_id;
      insert into public.brand_audit_log(brand_id, service_id, action, changed_by) values (v_brand_id, v_service_id, 'service_updated', auth.uid());
    else
      insert into public.brand_services(brand_id, service_type, service_order, creator_id, creator_name, platform, deliverable_type, quantity, creator_fee, shoot_type, shoot_date, location, duration_hours, deliverables, production_notes, editing_type, turnaround_time, number_of_revisions, reference_notes, campaign_objective, daily_ad_budget, number_of_days, ad_spend, management_fee, final_price)
      values (v_brand_id, v_service_type, coalesce((v_service->>'serviceOrder')::integer, 1), v_creator_id, nullif(btrim(v_service->>'creatorName'), ''), nullif(lower(btrim(v_service->>'platform')), ''), nullif(btrim(v_service->>'deliverableType'), ''), nullif(v_service->>'quantity', '')::integer, nullif(v_service->>'creatorFee', '')::numeric, nullif(btrim(v_service->>'shootType'), ''), nullif(v_service->>'shootDate', '')::date, nullif(btrim(v_service->>'location'), ''), nullif(v_service->>'durationHours', '')::numeric, nullif(btrim(v_service->>'deliverables'), ''), nullif(btrim(v_service->>'productionNotes'), ''), nullif(btrim(v_service->>'editingType'), ''), nullif(btrim(v_service->>'turnaroundTime'), ''), nullif(v_service->>'numberOfRevisions', '')::integer, nullif(btrim(v_service->>'referenceNotes'), ''), nullif(btrim(v_service->>'campaignObjective'), ''), nullif(v_service->>'dailyAdBudget', '')::numeric, nullif(v_service->>'numberOfDays', '')::integer, case when v_service_type in ('meta_ads', 'google_ads') then coalesce(nullif(v_service->>'dailyAdBudget', '')::numeric, 0) * coalesce(nullif(v_service->>'numberOfDays', '')::integer, 0) else null end, nullif(v_service->>'managementFee', '')::numeric, v_final_price)
      returning id into v_service_id;
      insert into public.brand_audit_log(brand_id, service_id, action, changed_by) values (v_brand_id, v_service_id, 'service_added', auth.uid());
    end if;
    v_seen_ids := array_append(v_seen_ids, v_service_id);
  end loop;

  insert into public.brand_audit_log(brand_id, action, changed_by, details)
  select v_brand_id, 'service_removed', auth.uid(), jsonb_build_object('serviceType', service_type)
  from public.brand_services where brand_id = v_brand_id and not (id = any(v_seen_ids));
  delete from public.brand_services where brand_id = v_brand_id and not (id = any(v_seen_ids));
  select coalesce(sum(final_price), 0) into v_new_total from public.brand_services where brand_id = v_brand_id;
  if v_old_total is distinct from v_new_total then
    insert into public.brand_audit_log(brand_id, action, changed_by, details) values (v_brand_id, 'final_price_changed', auth.uid(), jsonb_build_object('from', v_old_total, 'to', v_new_total));
  end if;
  return v_brand_id;
end;
$$;

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
    'startingInvestment', coalesce((
      select min(service.final_price)
      from public.brand_services service
      where service.brand_id = brand.id
        and service.service_type = 'creator_collaboration'
        and service.creator_id is not null
    ), brand.proposal_starting_investment),
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
        'niche', case when content_profile.primary_niche = 'Other' then nullif(btrim(content_profile.primary_niche_other), '') else nullif(btrim(content_profile.primary_niche), '') end,
        'deliverable', coalesce(nullif(btrim(service.deliverable_type), ''), 'Instagram Reel'),
        'quantity', coalesce(service.quantity, 1),
        'creativeConcept', nullif(btrim(service.production_notes), '')
      )) order by service.service_order)
      from public.brand_services service
      join public.creators creator on creator.id = service.creator_id
      left join public.creator_identity identity_profile on identity_profile.creator_id = creator.id
      left join public.creator_content_profile content_profile on content_profile.creator_id = creator.id
      left join lateral (
        select platform_profile.platform, nullif(btrim(platform_profile.profile_url), '') as profile_url, platform_profile.audience_count,
          case platform_profile.platform when 'instagram' then instagram_analytics.views_all_content when 'facebook' then facebook_analytics.views_total when 'youtube' then youtube_analytics.views else null end as views
        from public.creator_social_platforms platform_profile
        left join lateral (select snapshot.id from public.creator_social_analytics_snapshots snapshot where snapshot.social_platform_id = platform_profile.id and snapshot.is_current order by snapshot.updated_at desc limit 1) current_snapshot on true
        left join public.creator_instagram_analytics instagram_analytics on instagram_analytics.snapshot_id = current_snapshot.id
        left join public.creator_facebook_analytics facebook_analytics on facebook_analytics.snapshot_id = current_snapshot.id
        left join public.creator_youtube_analytics youtube_analytics on youtube_analytics.social_platform_id = platform_profile.id
        where platform_profile.creator_id = creator.id and (service.platform is null or platform_profile.platform = service.platform)
        order by platform_profile.is_primary desc, platform_profile.platform limit 1
      ) social_profile on true
      where service.brand_id = brand.id and service.service_type = 'creator_collaboration' and service.creator_id is not null
    ), '[]'::jsonb),
    'additionalServices', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', service.id,
        'serviceType', service.service_type,
        'title', case service.service_type when 'street_marketing' then 'Street Marketing' when 'meta_ads' then 'Meta Ads' when 'google_ads' then 'Google Ads' when 'shoot' then 'Shoot' when 'editing' then 'Editing' else 'Additional Service' end,
        'description', coalesce(nullif(btrim(service.campaign_objective), ''), nullif(btrim(service.deliverables), ''), nullif(btrim(service.production_notes), ''), nullif(btrim(service.reference_notes), '')),
        'budget', service.final_price
      )) order by service.service_order)
      from public.brand_services service
      where service.brand_id = brand.id and service.service_type <> 'creator_collaboration'
    ), '[]'::jsonb)
  ) into v_proposal
  from public.brands brand
  where brand.proposal_token = p_proposal_token;

  if v_proposal is null then raise exception 'Proposal not found' using errcode = 'P0002'; end if;
  return v_proposal;
end;
$$;

revoke all on function public.admin_save_brand(jsonb, jsonb, boolean), public.get_brand_proposal(uuid) from public, anon, authenticated;
grant execute on function public.admin_save_brand(jsonb, jsonb, boolean) to authenticated;
grant execute on function public.get_brand_proposal(uuid) to anon, authenticated;

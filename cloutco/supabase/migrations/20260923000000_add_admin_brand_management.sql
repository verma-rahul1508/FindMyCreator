create table public.brands (
  id uuid primary key default gen_random_uuid(),
  brand_name text,
  contact_person text,
  phone_number text,
  email text,
  city text,
  business_category text,
  website text,
  instagram text,
  business_address text,
  gstin text,
  internal_notes text,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brand_services (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  service_type text not null check (service_type in ('creator_collaboration', 'shoot', 'editing', 'meta_ads', 'google_ads')),
  service_order integer not null check (service_order > 0),
  creator_id uuid references public.creators(id) on delete set null,
  creator_name text,
  platform text check (platform is null or platform in ('instagram', 'facebook', 'youtube')),
  deliverable_type text,
  quantity integer check (quantity is null or quantity > 0),
  creator_fee numeric(14,2) check (creator_fee is null or creator_fee >= 0),
  shoot_type text,
  shoot_date date,
  location text,
  duration_hours numeric(7,2) check (duration_hours is null or duration_hours >= 0),
  deliverables text,
  production_notes text,
  editing_type text,
  turnaround_time text,
  number_of_revisions integer check (number_of_revisions is null or number_of_revisions >= 0),
  reference_notes text,
  campaign_objective text,
  daily_ad_budget numeric(14,2) check (daily_ad_budget is null or daily_ad_budget >= 0),
  number_of_days integer check (number_of_days is null or number_of_days > 0),
  ad_spend numeric(14,2) check (ad_spend is null or ad_spend >= 0),
  management_fee numeric(14,2) check (management_fee is null or management_fee >= 0),
  final_price numeric(14,2) not null check (final_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brand_services_brand_order_key unique (brand_id, service_order)
);

create table public.brand_audit_log (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  service_id uuid references public.brand_services(id) on delete set null,
  action text not null check (action in ('brand_created', 'brand_updated', 'status_changed', 'service_added', 'service_updated', 'service_removed', 'final_price_changed')),
  changed_by uuid not null references auth.users(id) on delete restrict,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index brands_status_created_at_idx on public.brands(status, created_at desc);
create index brands_city_idx on public.brands(lower(city));
create index brands_category_idx on public.brands(lower(business_category));
create index brand_services_brand_order_idx on public.brand_services(brand_id, service_order);
create index brand_services_creator_id_idx on public.brand_services(creator_id) where creator_id is not null;
create index brand_audit_log_brand_created_at_idx on public.brand_audit_log(brand_id, created_at desc);

create or replace function public.set_brand_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger brands_set_updated_at before update on public.brands
for each row execute function public.set_brand_updated_at();

create trigger brand_services_set_updated_at before update on public.brand_services
for each row execute function public.set_brand_updated_at();

alter table public.brands enable row level security;
alter table public.brand_services enable row level security;
alter table public.brand_audit_log enable row level security;

create policy "Active admins can manage brands" on public.brands
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Active admins can manage brand services" on public.brand_services
for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Active admins can read brand audit history" on public.brand_audit_log
for select to authenticated using (public.is_admin());

create or replace function public.admin_brand_filter_options()
returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  return jsonb_build_object(
    'cities', coalesce((select jsonb_agg(value order by value) from (select distinct nullif(btrim(city), '') as value from public.brands) options where value is not null), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(value order by value) from (select distinct nullif(btrim(business_category), '') as value from public.brands) options where value is not null), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_list_brands(
  p_search text default null,
  p_status text default null,
  p_city text default null,
  p_category text default null,
  p_sort text default 'recent',
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  brand_id uuid, brand_name text, contact_person text, phone_number text, email text, city text,
  business_category text, service_count bigint, final_price numeric, status text, created_at timestamptz,
  total_count bigint
)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
declare
  v_search text := nullif(btrim(p_search), '');
  v_status text := nullif(lower(btrim(p_status)), '');
  v_city text := nullif(lower(btrim(p_city)), '');
  v_category text := nullif(lower(btrim(p_category)), '');
  v_sort text := coalesce(nullif(lower(btrim(p_sort)), ''), 'recent');
begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  if v_status is not null and v_status not in ('draft', 'active', 'completed', 'archived') then raise exception 'Invalid brand status'; end if;
  if v_sort not in ('recent', 'oldest', 'name_asc', 'name_desc', 'price_desc', 'price_asc') then raise exception 'Invalid brand sort'; end if;
  if coalesce(p_limit, 25) not between 1 and 100 then raise exception 'Limit must be between 1 and 100'; end if;
  if coalesce(p_offset, 0) < 0 then raise exception 'Offset cannot be negative'; end if;

  return query
  with rows as (
    select brand.id, brand.brand_name, brand.contact_person, brand.phone_number, brand.email, brand.city,
      brand.business_category, brand.status, brand.created_at,
      coalesce(service_summary.service_count, 0)::bigint as service_count,
      coalesce(service_summary.final_price, 0)::numeric as final_price
    from public.brands brand
    left join lateral (
      select count(*)::bigint as service_count, coalesce(sum(service.final_price), 0)::numeric as final_price
      from public.brand_services service where service.brand_id = brand.id
    ) service_summary on true
  ), filtered as (
    select * from rows where
      (v_search is null or brand_name ilike '%' || v_search || '%' or contact_person ilike '%' || v_search || '%' or email ilike '%' || v_search || '%' or phone_number ilike '%' || v_search || '%')
      and (v_status is null or status = v_status)
      and (v_city is null or lower(btrim(city)) = v_city)
      and (v_category is null or lower(btrim(business_category)) = v_category)
  )
  select id, brand_name, contact_person, phone_number, email, city, business_category, service_count, final_price, status, created_at, count(*) over()
  from filtered
  order by
    case when v_sort = 'recent' then created_at end desc,
    case when v_sort = 'oldest' then created_at end asc,
    case when v_sort = 'name_asc' then lower(coalesce(brand_name, '')) end asc,
    case when v_sort = 'name_desc' then lower(coalesce(brand_name, '')) end desc,
    case when v_sort = 'price_desc' then final_price end desc,
    case when v_sort = 'price_asc' then final_price end asc,
    id
  limit coalesce(p_limit, 25) offset coalesce(p_offset, 0);
end;
$$;

create or replace function public.admin_search_creators(p_search text default null, p_limit integer default 10)
returns table (creator_id uuid, creator_name text, username text, primary_platform text)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
declare v_search text := nullif(btrim(p_search), '');
begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  if coalesce(p_limit, 10) not between 1 and 25 then raise exception 'Limit must be between 1 and 25'; end if;
  return query
  select creator.id, coalesce(nullif(btrim(identity_profile.display_name), ''), creator.full_name), identity_profile.username,
    primary_platform.platform
  from public.creators creator
  left join public.creator_identity identity_profile on identity_profile.creator_id = creator.id
  left join lateral (
    select platform_profile.platform from public.creator_social_platforms platform_profile
    where platform_profile.creator_id = creator.id order by platform_profile.is_primary desc, platform_profile.platform limit 1
  ) primary_platform on true
  where v_search is null
    or creator.id::text ilike '%' || v_search || '%'
    or creator.full_name ilike '%' || v_search || '%'
    or identity_profile.display_name ilike '%' || v_search || '%'
    or identity_profile.username ilike '%' || v_search || '%'
    or exists (select 1 from public.creator_social_platforms platform_profile where platform_profile.creator_id = creator.id and platform_profile.platform ilike '%' || v_search || '%')
  order by lower(coalesce(nullif(btrim(identity_profile.display_name), ''), creator.full_name)), creator.id
  limit coalesce(p_limit, 10);
end;
$$;

create or replace function public.admin_brand_detail(p_brand_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
declare v_result jsonb;
begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  select jsonb_build_object(
    'id', brand.id, 'brandName', brand.brand_name, 'contactPerson', brand.contact_person,
    'phoneNumber', brand.phone_number, 'email', brand.email, 'city', brand.city,
    'businessCategory', brand.business_category, 'website', brand.website, 'instagram', brand.instagram,
    'businessAddress', brand.business_address, 'gstin', brand.gstin, 'internalNotes', brand.internal_notes,
    'status', brand.status, 'createdAt', brand.created_at, 'updatedAt', brand.updated_at,
    'services', coalesce((select jsonb_agg(jsonb_build_object(
      'id', service.id, 'serviceType', service.service_type, 'serviceOrder', service.service_order,
      'creatorId', service.creator_id, 'creatorName', service.creator_name, 'platform', service.platform,
      'deliverableType', service.deliverable_type, 'quantity', service.quantity, 'creatorFee', service.creator_fee,
      'shootType', service.shoot_type, 'shootDate', service.shoot_date, 'location', service.location,
      'durationHours', service.duration_hours, 'deliverables', service.deliverables, 'productionNotes', service.production_notes,
      'editingType', service.editing_type, 'turnaroundTime', service.turnaround_time, 'numberOfRevisions', service.number_of_revisions,
      'referenceNotes', service.reference_notes, 'campaignObjective', service.campaign_objective, 'dailyAdBudget', service.daily_ad_budget,
      'numberOfDays', service.number_of_days, 'adSpend', service.ad_spend, 'managementFee', service.management_fee,
      'finalPrice', service.final_price, 'createdAt', service.created_at, 'updatedAt', service.updated_at
    ) order by service.service_order) from public.brand_services service where service.brand_id = brand.id), '[]'::jsonb),
    'audit', coalesce((select jsonb_agg(jsonb_build_object('id', audit.id, 'action', audit.action, 'details', audit.details, 'createdAt', audit.created_at) order by audit.created_at desc) from public.brand_audit_log audit where audit.brand_id = brand.id), '[]'::jsonb),
    'finalPrice', coalesce((select sum(service.final_price) from public.brand_services service where service.brand_id = brand.id), 0)
  ) into v_result from public.brands brand where brand.id = p_brand_id;
  if v_result is null then raise exception 'Brand not found' using errcode = 'P0002'; end if;
  return v_result;
end;
$$;

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
    if v_service_type not in ('creator_collaboration', 'shoot', 'editing', 'meta_ads', 'google_ads') then raise exception 'Invalid service type'; end if;
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

revoke all on table public.brands, public.brand_services, public.brand_audit_log from public, anon, authenticated;
grant select, insert, update, delete on table public.brands, public.brand_services to authenticated;
grant select on table public.brand_audit_log to authenticated;
revoke all on function public.admin_brand_filter_options(), public.admin_list_brands(text,text,text,text,text,integer,integer), public.admin_search_creators(text,integer), public.admin_brand_detail(uuid), public.admin_save_brand(jsonb,jsonb,boolean) from public, anon, authenticated;
grant execute on function public.admin_brand_filter_options(), public.admin_list_brands(text,text,text,text,text,integer,integer), public.admin_search_creators(text,integer), public.admin_brand_detail(uuid), public.admin_save_brand(jsonb,jsonb,boolean) to authenticated;

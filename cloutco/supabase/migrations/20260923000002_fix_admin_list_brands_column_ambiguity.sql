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
    select row.* from rows row where
      (v_search is null or row.brand_name ilike '%' || v_search || '%' or row.contact_person ilike '%' || v_search || '%' or row.email ilike '%' || v_search || '%' or row.phone_number ilike '%' || v_search || '%')
      and (v_status is null or row.status = v_status)
      and (v_city is null or lower(btrim(row.city)) = v_city)
      and (v_category is null or lower(btrim(row.business_category)) = v_category)
  )
  select filtered.id, filtered.brand_name, filtered.contact_person, filtered.phone_number, filtered.email,
    filtered.city, filtered.business_category, filtered.service_count, filtered.final_price,
    filtered.status, filtered.created_at, count(*) over()
  from filtered
  order by
    case when v_sort = 'recent' then filtered.created_at end desc,
    case when v_sort = 'oldest' then filtered.created_at end asc,
    case when v_sort = 'name_asc' then lower(coalesce(filtered.brand_name, '')) end asc,
    case when v_sort = 'name_desc' then lower(coalesce(filtered.brand_name, '')) end desc,
    case when v_sort = 'price_desc' then filtered.final_price end desc,
    case when v_sort = 'price_asc' then filtered.final_price end asc,
    filtered.id
  limit coalesce(p_limit, 25) offset coalesce(p_offset, 0);
end;
$$;

revoke all on function public.admin_list_brands(text,text,text,text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.admin_list_brands(text,text,text,text,text,integer,integer) to authenticated;

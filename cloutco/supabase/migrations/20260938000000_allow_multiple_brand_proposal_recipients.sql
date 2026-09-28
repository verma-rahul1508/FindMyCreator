create or replace function public.normalize_brand_recipient_emails(p_emails text)
returns text
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  v_part text;
  v_recipients text[] := '{}'::text[];
begin
  if nullif(btrim(p_emails), '') is null then
    return null;
  end if;

  for v_part in
    select lower(btrim(value))
    from regexp_split_to_table(p_emails, ';') as value
  loop
    if v_part = '' or v_part !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
      return null;
    end if;
    if not v_part = any(v_recipients) then
      v_recipients := array_append(v_recipients, v_part);
    end if;
  end loop;

  return nullif(array_to_string(v_recipients, '; '), '');
end;
$$;

alter function public.admin_save_brand(jsonb, jsonb, boolean)
  rename to admin_save_brand_single_recipient;

create function public.admin_save_brand(p_brand jsonb, p_services jsonb default '[]'::jsonb, p_submit boolean default false)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_recipients text;
  v_brand_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_brand) <> 'object' or jsonb_typeof(p_services) <> 'array' then
    raise exception 'Invalid brand payload';
  end if;

  if p_submit then
    v_recipients := public.normalize_brand_recipient_emails(p_brand->>'email');
    if v_recipients is null then
      raise exception 'Complete the required brand fields with valid contact details';
    end if;
    p_brand := jsonb_set(p_brand, '{email}', to_jsonb(split_part(v_recipients, ';', 1)), true);
  end if;

  select public.admin_save_brand_single_recipient(p_brand, p_services, p_submit)
    into v_brand_id;

  if v_recipients is not null then
    update public.brands
    set email = v_recipients
    where id = v_brand_id;
  end if;

  return v_brand_id;
end;
$$;

revoke all on function public.normalize_brand_recipient_emails(text), public.admin_save_brand_single_recipient(jsonb, jsonb, boolean) from public, anon, authenticated;
revoke all on function public.admin_save_brand(jsonb, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.admin_save_brand(jsonb, jsonb, boolean) to authenticated;

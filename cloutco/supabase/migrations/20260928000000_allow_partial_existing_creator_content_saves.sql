-- Existing creators can be edited progressively from the Admin onboarding form.
-- Only a complete Content & Niche section is written to its constrained table;
-- the full in-progress form remains in the private admin draft.

create or replace function public.admin_get_creator_profile_for_edit(p_creator_id uuid)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  return (
    select jsonb_build_object(
      'basic', to_jsonb(c),
      'identity', coalesce(to_jsonb(i), '{}'::jsonb),
      'content', coalesce(to_jsonb(cp), '{}'::jsonb),
      'draftPayload', draft.payload
    )
    from public.creators c
    left join public.creator_identity i on i.creator_id = c.id
    left join public.creator_content_profile cp on cp.creator_id = c.id
    left join public.admin_creator_onboarding_drafts draft on draft.creator_id = c.id
    where c.id = p_creator_id
  );
end $$;

create or replace function public.admin_update_creator_profile(p_creator_id uuid, p_payload jsonb)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_basic public.creators%rowtype;
  v_identity public.creator_identity%rowtype;
  v_content public.creator_content_profile%rowtype;
begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  if jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'Invalid profile'; end if;
  select * into v_basic from public.creators where id = p_creator_id for update;
  if not found then raise exception 'Creator not found'; end if;
  select * into v_identity from public.creator_identity where creator_id = p_creator_id for update;
  select * into v_content from public.creator_content_profile where creator_id = p_creator_id for update;
  if jsonb_typeof(p_payload->'basic') is distinct from 'object' then raise exception 'Invalid basic section'; end if;
  if jsonb_typeof(p_payload->'identity') is distinct from 'object' then raise exception 'Invalid identity section'; end if;
  if jsonb_typeof(p_payload->'content') is distinct from 'object' then raise exception 'Invalid content section'; end if;
  v_basic := jsonb_populate_record(v_basic, p_payload->'basic');
  v_identity := jsonb_populate_record(v_identity, p_payload->'identity');
  v_content := jsonb_populate_record(v_content, p_payload->'content');
  if nullif(btrim(v_basic.full_name), '') is null then raise exception 'Full name is required'; end if;

  update public.creators set full_name = v_basic.full_name, phone_number = v_basic.phone_number,
    current_city = v_basic.current_city, date_of_birth = v_basic.date_of_birth,
    gender = v_basic.gender, more = v_basic.more where id = p_creator_id;
  insert into public.creator_identity (creator_id, display_name, bio, languages, creator_type, creator_type_other)
  values (p_creator_id, v_identity.display_name, v_identity.bio, coalesce(v_identity.languages, '{}'::text[]), v_identity.creator_type, v_identity.creator_type_other)
  on conflict (creator_id) do update set display_name = excluded.display_name, bio = excluded.bio,
    languages = excluded.languages, creator_type = excluded.creator_type, creator_type_other = excluded.creator_type_other;

  if nullif(btrim(v_content.primary_niche), '') is not null
    and cardinality(coalesce(v_content.content_formats, '{}'::text[])) > 0
    and cardinality(coalesce(v_content.content_styles, '{}'::text[])) > 0
    and (v_content.primary_niche <> 'Other' or nullif(btrim(v_content.primary_niche_other), '') is not null)
    and (not ('Other' = any(coalesce(v_content.other_niches, '{}'::text[]))) or nullif(btrim(v_content.other_niches_other), '') is not null)
    and (not ('Other' = any(v_content.content_formats)) or nullif(btrim(v_content.content_formats_other), '') is not null)
    and (not ('Other' = any(v_content.content_styles)) or nullif(btrim(v_content.content_styles_other), '') is not null) then
    insert into public.creator_content_profile (creator_id, primary_niche, primary_niche_other, other_niches, other_niches_other, content_formats, content_formats_other, content_styles, content_styles_other)
    values (p_creator_id, v_content.primary_niche, v_content.primary_niche_other, coalesce(v_content.other_niches, '{}'::text[]), v_content.other_niches_other, coalesce(v_content.content_formats, '{}'::text[]), v_content.content_formats_other, coalesce(v_content.content_styles, '{}'::text[]), v_content.content_styles_other)
    on conflict (creator_id) do update set primary_niche = excluded.primary_niche, primary_niche_other = excluded.primary_niche_other,
      other_niches = excluded.other_niches, other_niches_other = excluded.other_niches_other,
      content_formats = excluded.content_formats, content_formats_other = excluded.content_formats_other,
      content_styles = excluded.content_styles, content_styles_other = excluded.content_styles_other;
  end if;
end $$;

create or replace function public.admin_save_existing_creator(p_creator_id uuid, p_payload jsonb, p_update_social boolean default false)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_email text;
begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  if jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'Invalid profile'; end if;
  v_email := lower(nullif(btrim(p_payload#>>'{basic,email}'), ''));
  if v_email is null or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email address'; end if;
  perform public.admin_update_creator_profile(p_creator_id, jsonb_build_object(
    'basic', jsonb_build_object('full_name', nullif(p_payload#>>'{basic,fullName}',''), 'phone_number', nullif(p_payload#>>'{basic,phoneNumber}',''), 'current_city', nullif(p_payload#>>'{basic,currentCity}',''), 'date_of_birth', nullif(p_payload#>>'{basic,dateOfBirth}',''), 'gender', nullif(p_payload#>>'{basic,gender}',''), 'more', nullif(p_payload#>>'{basic,more}','')),
    'identity', jsonb_build_object('display_name', nullif(p_payload#>>'{identity,displayName}',''), 'bio', nullif(p_payload#>>'{identity,bio}',''), 'languages', coalesce(p_payload#>'{identity,languages}','[]'::jsonb), 'creator_type', nullif(p_payload#>>'{identity,creatorType}',''), 'creator_type_other', nullif(p_payload#>>'{identity,creatorTypeOther}','')),
    'content', jsonb_build_object('primary_niche', nullif(p_payload#>>'{content,primaryNiche}',''), 'primary_niche_other', nullif(p_payload#>>'{content,primaryNicheOther}',''), 'other_niches', coalesce(p_payload#>'{content,otherNiches}','[]'::jsonb), 'other_niches_other', nullif(p_payload#>>'{content,otherNichesOther}',''), 'content_formats', coalesce(p_payload#>'{content,contentFormats}','[]'::jsonb), 'content_formats_other', nullif(p_payload#>>'{content,contentFormatsOther}',''), 'content_styles', coalesce(p_payload#>'{content,contentStyles}','[]'::jsonb), 'content_styles_other', nullif(p_payload#>>'{content,contentStylesOther}',''))
  ));
  update public.creators set email = v_email where id = p_creator_id;
  if p_update_social then
    if jsonb_typeof(p_payload->'socialAccounts') is distinct from 'array' then raise exception 'Invalid social accounts'; end if;
    perform public.admin_save_onboarding_social(p_creator_id, p_payload->'socialAccounts');
  end if;
  insert into public.admin_creator_onboarding_drafts (creator_id, created_by, payload)
  values (p_creator_id, auth.uid(), p_payload)
  on conflict (creator_id) do update set payload = excluded.payload;
  return jsonb_build_object('creatorId', p_creator_id);
end $$;

do $$
begin
  -- The helper may be absent on databases where the earlier edit migration was
  -- recorded after a partial manual deployment. Revoke it only when present.
  if to_regprocedure('public.admin_update_creator_profile(uuid,jsonb)') is not null then
    execute 'revoke all on function public.admin_update_creator_profile(uuid,jsonb) from public, anon, authenticated';
  end if;
end
$$;

revoke all on function public.admin_get_creator_profile_for_edit(uuid), public.admin_save_existing_creator(uuid,jsonb,boolean) from public, anon, authenticated;
grant execute on function public.admin_get_creator_profile_for_edit(uuid), public.admin_save_existing_creator(uuid,jsonb,boolean) to authenticated;

-- Admin operators can create a pending creator as soon as they have a name.
-- Remaining basic details stay nullable until collected and do not satisfy
-- the existing profile-completion predicates.

alter table public.creators
  alter column email drop not null,
  alter column phone_number drop not null,
  alter column current_city drop not null,
  alter column date_of_birth drop not null,
  alter column gender drop not null;

create or replace function public.admin_save_creator_onboarding(p_draft_id uuid, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_draft public.admin_creator_onboarding_drafts%rowtype;
  v_creator_id uuid;
  v_basic jsonb := coalesce(p_payload->'basic', '{}'::jsonb);
  v_identity jsonb := coalesce(p_payload->'identity', '{}'::jsonb);
  v_content jsonb := coalesce(p_payload->'content', '{}'::jsonb);
  v_full_name text := nullif(btrim(coalesce(v_basic->>'fullName', '')), '');
  v_email text := nullif(lower(btrim(coalesce(v_basic->>'email', ''))), '');
  v_phone text := nullif(btrim(coalesce(v_basic->>'phoneNumber', '')), '');
  v_city text := nullif(btrim(coalesce(v_basic->>'currentCity', '')), '');
  v_dob text := nullif(btrim(coalesce(v_basic->>'dateOfBirth', '')), '');
  v_gender text := nullif(btrim(coalesce(v_basic->>'gender', '')), '');
  v_languages text[];
  v_other_niches text[];
  v_formats text[];
  v_styles text[];
begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  if jsonb_typeof(p_payload) <> 'object' then raise exception 'Invalid onboarding payload'; end if;

  if p_draft_id is null then
    insert into public.admin_creator_onboarding_drafts (created_by, payload)
    values (auth.uid(), p_payload)
    returning * into v_draft;
  else
    select * into v_draft from public.admin_creator_onboarding_drafts where id = p_draft_id for update;
    if v_draft.id is null then raise exception 'Onboarding draft not found'; end if;
    update public.admin_creator_onboarding_drafts set payload = p_payload where id = v_draft.id returning * into v_draft;
  end if;

  v_creator_id := v_draft.creator_id;
  if v_email is not null and v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address';
  end if;

  if v_creator_id is null and v_full_name is not null then
    insert into public.creators (full_name, email, phone_number, current_city, date_of_birth, gender, more)
    values (v_full_name, v_email, v_phone, v_city, case when v_dob is null then null else public.safe_iso_date(v_dob) end, v_gender, nullif(btrim(coalesce(v_basic->>'more', '')), ''))
    returning id into v_creator_id;
    update public.admin_creator_onboarding_drafts set creator_id = v_creator_id where id = v_draft.id;
  elsif v_creator_id is not null then
    update public.creators
    set full_name = coalesce(v_full_name, full_name),
      email = v_email,
      phone_number = v_phone,
      current_city = v_city,
      date_of_birth = case when v_dob is null then null else public.safe_iso_date(v_dob) end,
      gender = v_gender,
      more = nullif(btrim(coalesce(v_basic->>'more', '')), '')
    where id = v_creator_id;
  end if;

  if v_creator_id is not null then
    select coalesce(array_agg(btrim(value)) filter (where nullif(btrim(value), '') is not null), '{}'::text[])
    into v_languages from jsonb_array_elements_text(coalesce(v_identity->'languages', '[]'::jsonb)) value;
    insert into public.creator_identity (creator_id, display_name, bio, languages, creator_type, creator_type_other)
    values (v_creator_id, nullif(btrim(coalesce(v_identity->>'displayName', '')), ''), nullif(btrim(coalesce(v_identity->>'bio', '')), ''), v_languages, nullif(btrim(coalesce(v_identity->>'creatorType', '')), ''), case when v_identity->>'creatorType' = 'other' then nullif(btrim(coalesce(v_identity->>'creatorTypeOther', '')), '') end)
    on conflict (creator_id) do update set display_name = excluded.display_name, bio = excluded.bio, languages = excluded.languages, creator_type = excluded.creator_type, creator_type_other = excluded.creator_type_other;

    select coalesce(array_agg(btrim(value)) filter (where nullif(btrim(value), '') is not null), '{}'::text[])
    into v_other_niches from jsonb_array_elements_text(coalesce(v_content->'otherNiches', '[]'::jsonb)) value;
    select coalesce(array_agg(btrim(value)) filter (where nullif(btrim(value), '') is not null), '{}'::text[])
    into v_formats from jsonb_array_elements_text(coalesce(v_content->'contentFormats', '[]'::jsonb)) value;
    select coalesce(array_agg(btrim(value)) filter (where nullif(btrim(value), '') is not null), '{}'::text[])
    into v_styles from jsonb_array_elements_text(coalesce(v_content->'contentStyles', '[]'::jsonb)) value;

    if nullif(btrim(coalesce(v_content->>'primaryNiche', '')), '') is not null
      and cardinality(v_formats) > 0
      and cardinality(v_styles) > 0
      and (v_content->>'primaryNiche' <> 'Other' or nullif(btrim(coalesce(v_content->>'primaryNicheOther', '')), '') is not null)
      and (not ('Other' = any(v_other_niches)) or nullif(btrim(coalesce(v_content->>'otherNichesOther', '')), '') is not null)
      and (not ('Other' = any(v_formats)) or nullif(btrim(coalesce(v_content->>'contentFormatsOther', '')), '') is not null)
      and (not ('Other' = any(v_styles)) or nullif(btrim(coalesce(v_content->>'contentStylesOther', '')), '') is not null) then
      insert into public.creator_content_profile (creator_id, primary_niche, primary_niche_other, other_niches, other_niches_other, content_formats, content_formats_other, content_styles, content_styles_other)
      values (v_creator_id, btrim(v_content->>'primaryNiche'), nullif(btrim(coalesce(v_content->>'primaryNicheOther', '')), ''), v_other_niches, nullif(btrim(coalesce(v_content->>'otherNichesOther', '')), ''), v_formats, nullif(btrim(coalesce(v_content->>'contentFormatsOther', '')), ''), v_styles, nullif(btrim(coalesce(v_content->>'contentStylesOther', '')), ''))
      on conflict (creator_id) do update set primary_niche = excluded.primary_niche, primary_niche_other = excluded.primary_niche_other, other_niches = excluded.other_niches, other_niches_other = excluded.other_niches_other, content_formats = excluded.content_formats, content_formats_other = excluded.content_formats_other, content_styles = excluded.content_styles, content_styles_other = excluded.content_styles_other;
    end if;

    if jsonb_typeof(coalesce(p_payload->'socialAccounts', '[]'::jsonb)) = 'array' then
      perform public.admin_save_onboarding_social(v_creator_id, coalesce(p_payload->'socialAccounts', '[]'::jsonb));
    end if;
  end if;

  return jsonb_build_object('draftId', v_draft.id, 'creatorId', v_creator_id);
end;
$$;

revoke all on function public.admin_save_creator_onboarding(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.admin_save_creator_onboarding(uuid, jsonb) to authenticated;

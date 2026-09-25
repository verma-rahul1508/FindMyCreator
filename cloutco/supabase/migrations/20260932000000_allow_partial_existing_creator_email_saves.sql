-- An administrator can continue a name-only onboarding record from the normal
-- edit route. Email remains unique when supplied, but is not required to save
-- an incomplete creator profile.

create or replace function public.admin_save_existing_creator(
  p_creator_id uuid,
  p_payload jsonb,
  p_update_social boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_email text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'Invalid profile';
  end if;

  v_email := lower(nullif(btrim(p_payload#>>'{basic,email}'), ''));
  if v_email is not null and v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address';
  end if;

  if v_email is not null and exists (
    select 1
    from public.creators creator
    where lower(creator.email) = v_email
      and creator.id <> p_creator_id
  ) then
    raise exception 'Another creator already uses this email. Open that creator profile to edit it instead.'
      using errcode = '23505';
  end if;

  perform public.admin_update_creator_profile(p_creator_id, jsonb_build_object(
    'basic', jsonb_build_object(
      'full_name', nullif(p_payload#>>'{basic,fullName}', ''),
      'phone_number', nullif(p_payload#>>'{basic,phoneNumber}', ''),
      'current_city', nullif(p_payload#>>'{basic,currentCity}', ''),
      'date_of_birth', nullif(p_payload#>>'{basic,dateOfBirth}', ''),
      'gender', nullif(p_payload#>>'{basic,gender}', ''),
      'more', nullif(p_payload#>>'{basic,more}', '')
    ),
    'identity', jsonb_build_object(
      'display_name', nullif(p_payload#>>'{identity,displayName}', ''),
      'bio', nullif(p_payload#>>'{identity,bio}', ''),
      'languages', coalesce(p_payload#>'{identity,languages}', '[]'::jsonb),
      'creator_type', nullif(p_payload#>>'{identity,creatorType}', ''),
      'creator_type_other', nullif(p_payload#>>'{identity,creatorTypeOther}', '')
    ),
    'content', jsonb_build_object(
      'primary_niche', nullif(p_payload#>>'{content,primaryNiche}', ''),
      'primary_niche_other', nullif(p_payload#>>'{content,primaryNicheOther}', ''),
      'other_niches', coalesce(p_payload#>'{content,otherNiches}', '[]'::jsonb),
      'other_niches_other', nullif(p_payload#>>'{content,otherNichesOther}', ''),
      'content_formats', coalesce(p_payload#>'{content,contentFormats}', '[]'::jsonb),
      'content_formats_other', nullif(p_payload#>>'{content,contentFormatsOther}', ''),
      'content_styles', coalesce(p_payload#>'{content,contentStyles}', '[]'::jsonb),
      'content_styles_other', nullif(p_payload#>>'{content,contentStylesOther}', '')
    )
  ));

  update public.creators
  set email = v_email
  where id = p_creator_id;

  if p_update_social then
    if jsonb_typeof(p_payload->'socialAccounts') is distinct from 'array' then
      raise exception 'Invalid social accounts';
    end if;
    perform public.admin_save_onboarding_social(p_creator_id, p_payload->'socialAccounts');
  end if;

  insert into public.admin_creator_onboarding_drafts (creator_id, created_by, payload)
  values (p_creator_id, auth.uid(), p_payload)
  on conflict (creator_id) do update set payload = excluded.payload;

  return jsonb_build_object('creatorId', p_creator_id);
end;
$$;

revoke all on function public.admin_save_existing_creator(uuid, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.admin_save_existing_creator(uuid, jsonb, boolean) to authenticated;

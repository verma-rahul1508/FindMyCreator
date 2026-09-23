-- Existing-profile editing is independent of onboarding drafts.
create or replace function public.admin_get_creator_profile_for_edit(p_creator_id uuid)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode='42501'; end if;
  return (select jsonb_build_object('basic', to_jsonb(c), 'identity', coalesce(to_jsonb(i), '{}'::jsonb), 'content', coalesce(to_jsonb(cp), '{}'::jsonb))
    from public.creators c left join public.creator_identity i on i.creator_id=c.id
    left join public.creator_content_profile cp on cp.creator_id=c.id where c.id=p_creator_id);
end $$;

create or replace function public.admin_update_creator_profile(p_creator_id uuid, p_payload jsonb)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_basic public.creators%rowtype;
  v_identity public.creator_identity%rowtype;
  v_content public.creator_content_profile%rowtype;
begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode='42501'; end if;
  if jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'Invalid profile'; end if;
  select * into v_basic from public.creators where id=p_creator_id for update;
  if not found then raise exception 'Creator not found'; end if;
  select * into v_identity from public.creator_identity where creator_id=p_creator_id for update;
  select * into v_content from public.creator_content_profile where creator_id=p_creator_id for update;
  if jsonb_typeof(p_payload->'basic') is distinct from 'object' then raise exception 'Invalid basic section'; end if;
  v_basic := jsonb_populate_record(v_basic, p_payload->'basic');
  if jsonb_typeof(p_payload->'identity') is distinct from 'object' then raise exception 'Invalid identity section'; end if;
  v_identity := jsonb_populate_record(v_identity, p_payload->'identity');
  if jsonb_typeof(p_payload->'content') is distinct from 'object' then raise exception 'Invalid content section'; end if;
  v_content := jsonb_populate_record(v_content, p_payload->'content');
  if nullif(btrim(v_basic.full_name),'') is null then raise exception 'Full name is required'; end if;
  update public.creators set full_name=v_basic.full_name, phone_number=v_basic.phone_number, current_city=v_basic.current_city, date_of_birth=v_basic.date_of_birth, gender=v_basic.gender, more=v_basic.more where id=p_creator_id;
  insert into public.creator_identity (creator_id, display_name, bio, languages, creator_type, creator_type_other)
  values (p_creator_id, v_identity.display_name, v_identity.bio, coalesce(v_identity.languages, '{}'::text[]), v_identity.creator_type, v_identity.creator_type_other)
  on conflict (creator_id) do update set display_name=excluded.display_name, bio=excluded.bio, languages=excluded.languages, creator_type=excluded.creator_type, creator_type_other=excluded.creator_type_other;
  if v_content.primary_niche is not null or v_content.id is not null
    or cardinality(v_content.other_niches) > 0 or cardinality(v_content.content_formats) > 0
    or cardinality(v_content.content_styles) > 0 or v_content.primary_niche_other is not null
    or v_content.other_niches_other is not null or v_content.content_formats_other is not null
    or v_content.content_styles_other is not null then
  insert into public.creator_content_profile (creator_id, primary_niche, primary_niche_other, other_niches, other_niches_other, content_formats, content_formats_other, content_styles, content_styles_other)
  values (p_creator_id, v_content.primary_niche, v_content.primary_niche_other, coalesce(v_content.other_niches, '{}'::text[]), v_content.other_niches_other, coalesce(v_content.content_formats, '{}'::text[]), v_content.content_formats_other, coalesce(v_content.content_styles, '{}'::text[]), v_content.content_styles_other)
  on conflict (creator_id) do update set primary_niche=excluded.primary_niche, primary_niche_other=excluded.primary_niche_other, other_niches=excluded.other_niches, other_niches_other=excluded.other_niches_other, content_formats=excluded.content_formats, content_formats_other=excluded.content_formats_other, content_styles=excluded.content_styles, content_styles_other=excluded.content_styles_other;
  end if;
end $$;

revoke all on function public.admin_get_creator_profile_for_edit(uuid), public.admin_update_creator_profile(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.admin_get_creator_profile_for_edit(uuid), public.admin_update_creator_profile(uuid,jsonb) to authenticated;

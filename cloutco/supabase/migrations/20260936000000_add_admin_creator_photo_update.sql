create or replace function public.admin_set_creator_profile_photo(p_creator_id uuid, p_photo_path text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_photo_path text := nullif(btrim(p_photo_path), '');
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.creators where id = p_creator_id) then
    raise exception 'Creator not found' using errcode = 'P0002';
  end if;

  if v_photo_path is null or v_photo_path !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/profile-photo\.(jpg|jpeg|png|webp)$' then
    raise exception 'Invalid profile photo path' using errcode = '22023';
  end if;

  insert into public.creator_identity (creator_id, profile_photo_url)
  values (p_creator_id, v_photo_path)
  on conflict (creator_id) do update
  set profile_photo_url = excluded.profile_photo_url;
end;
$$;

revoke all on function public.admin_set_creator_profile_photo(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_set_creator_profile_photo(uuid, text) to authenticated;

grant select (id, public_profile_id)
on table public.creators
to service_role;

grant select (creator_id, profile_photo_url)
on table public.creator_identity
to service_role;

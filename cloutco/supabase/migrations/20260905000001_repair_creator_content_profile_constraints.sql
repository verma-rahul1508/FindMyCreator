do $$
begin
  if pg_catalog.to_regprocedure('public.text_array_has_no_blank_elements(text[])') is null then
    execute $sql$
      create function public.text_array_has_no_blank_elements(input_values text[])
      returns boolean
      language sql
      immutable
      as $function$
        select not exists (
          select 1
          from unnest(input_values) as array_element
          where nullif(btrim(array_element), '') is null
        );
      $function$
    $sql$;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.creator_content_profile'::regclass
      and conname = 'creator_content_profile_primary_niche_required'
  ) then
    alter table public.creator_content_profile
      add constraint creator_content_profile_primary_niche_required
      check (nullif(btrim(primary_niche), '') is not null);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.creator_content_profile'::regclass
      and conname = 'creator_content_profile_content_formats_no_blank_elements'
  ) then
    alter table public.creator_content_profile
      add constraint creator_content_profile_content_formats_no_blank_elements
      check (public.text_array_has_no_blank_elements(content_formats));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.creator_content_profile'::regclass
      and conname = 'creator_content_profile_content_styles_no_blank_elements'
  ) then
    alter table public.creator_content_profile
      add constraint creator_content_profile_content_styles_no_blank_elements
      check (public.text_array_has_no_blank_elements(content_styles));
  end if;
end;
$$;

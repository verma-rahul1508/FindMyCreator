-- Admin-only manual creator onboarding. Drafts allow an operator to save a phone
-- conversation progressively without creating an Auth account or exposing data.

alter table public.creators alter column auth_user_id drop not null;

create table public.admin_creator_onboarding_drafts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid unique references public.creators(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_admin_creator_onboarding_drafts_updated_at
before update on public.admin_creator_onboarding_drafts
for each row execute procedure public.handle_updated_at();

alter table public.admin_creator_onboarding_drafts enable row level security;
revoke all on public.admin_creator_onboarding_drafts from public, anon, authenticated;

create or replace function public.admin_save_onboarding_social(p_creator_id uuid, p_accounts jsonb)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_account jsonb; v_platform text; v_platform_id uuid; v_snapshot_id uuid; v_insights jsonb;
begin
  if jsonb_typeof(p_accounts) <> 'array' then raise exception 'Invalid social platform payload'; end if;
  if jsonb_array_length(p_accounts) > 0 and (select count(*) from jsonb_array_elements(p_accounts) account(value) where coalesce((account.value->>'isPrimary')::boolean, false)) <> 1 then
    raise exception 'Select exactly one primary platform';
  end if;
  update public.creator_social_platforms set is_primary = false where creator_id = p_creator_id and is_primary;
  for v_account in select value from jsonb_array_elements(p_accounts) loop
    v_platform := lower(coalesce(v_account->>'platform', ''));
    if v_platform not in ('instagram', 'facebook', 'youtube') then raise exception 'Unsupported platform'; end if;
    insert into public.creator_social_platforms (creator_id, platform, profile_url, username, audience_count, is_primary)
    values (p_creator_id, v_platform, nullif(btrim(coalesce(v_account->>'profileUrl', '')), ''), nullif(btrim(coalesce(v_account->>'username', '')), ''), case when coalesce(v_account->>'audienceCount', '') ~ '^[0-9]+$' then (v_account->>'audienceCount')::bigint end, coalesce((v_account->>'isPrimary')::boolean, false))
    on conflict (creator_id, platform) do update set profile_url = excluded.profile_url, username = excluded.username, audience_count = excluded.audience_count, is_primary = excluded.is_primary
    returning id into v_platform_id;

    if v_platform = 'youtube' then
      v_insights := v_account->'youtubeInsights';
      if jsonb_typeof(v_insights) = 'object' then
        insert into public.creator_youtube_analytics (social_platform_id, views, likes, shares, top_country)
        values (v_platform_id, case when coalesce(v_insights->>'views','') ~ '^[0-9]+$' then (v_insights->>'views')::bigint end, case when coalesce(v_insights->>'likes','') ~ '^[0-9]+$' then (v_insights->>'likes')::bigint end, case when coalesce(v_insights->>'shares','') ~ '^[0-9]+$' then (v_insights->>'shares')::bigint end, nullif(btrim(coalesce(v_insights->>'topCountry','')), ''))
        on conflict (social_platform_id) do update set views = excluded.views, likes = excluded.likes, shares = excluded.shares, top_country = excluded.top_country;
      end if;
      continue;
    end if;
    v_insights := case when v_platform = 'instagram' then v_account->'instagramInsights' else v_account->'facebookInsights' end;
    if jsonb_typeof(v_insights) <> 'object' then continue; end if;
    insert into public.creator_social_analytics_snapshots (social_platform_id, platform, period_days, is_current)
    values (v_platform_id, v_platform, case when v_platform = 'facebook' then 28 else 30 end, true)
    on conflict (social_platform_id, period_days) where is_current do update set updated_at = now() returning id into v_snapshot_id;
    if v_platform = 'instagram' then
      insert into public.creator_instagram_analytics (snapshot_id, views_all_content, net_followers, interactions, viewers_total, profile_visits, women_percentage, men_percentage)
      values (v_snapshot_id, case when coalesce(v_insights#>>'{overview,views}','') ~ '^[0-9]+$' then (v_insights#>>'{overview,views}')::bigint end, case when coalesce(v_insights#>>'{overview,netFollowers}','') ~ '^[0-9]+$' then (v_insights#>>'{overview,netFollowers}')::bigint end, case when coalesce(v_insights#>>'{overview,interactions}','') ~ '^[0-9]+$' then (v_insights#>>'{overview,interactions}')::bigint end, case when coalesce(v_insights#>>'{overview,viewersTotal}','') ~ '^[0-9]+$' then (v_insights#>>'{overview,viewersTotal}')::bigint end, case when coalesce(v_insights#>>'{overview,profileVisits}','') ~ '^[0-9]+$' then (v_insights#>>'{overview,profileVisits}')::bigint end, case when coalesce(v_insights#>>'{audience,women}','') ~ '^[0-9]+(\.[0-9]+)?$' then (v_insights#>>'{audience,women}')::numeric end, case when coalesce(v_insights#>>'{audience,men}','') ~ '^[0-9]+(\.[0-9]+)?$' then (v_insights#>>'{audience,men}')::numeric end)
      on conflict (snapshot_id) do update set views_all_content=excluded.views_all_content, net_followers=excluded.net_followers, interactions=excluded.interactions, viewers_total=excluded.viewers_total, profile_visits=excluded.profile_visits, women_percentage=excluded.women_percentage, men_percentage=excluded.men_percentage;
      if jsonb_typeof(v_insights#>'{audience,topAgeRanges}') = 'array' and jsonb_array_length(v_insights#>'{audience,topAgeRanges}') between 1 and 2 and not exists (select 1 from jsonb_array_elements_text(v_insights#>'{audience,topAgeRanges}') value where nullif(btrim(value),'') is null) then
        delete from public.creator_instagram_top_age_ranges where snapshot_id=v_snapshot_id;
        insert into public.creator_instagram_top_age_ranges (snapshot_id, age_range, display_order) select v_snapshot_id,btrim(value),ord::integer from jsonb_array_elements_text(v_insights#>'{audience,topAgeRanges}') with ordinality as values_(value,ord);
      end if;
      if jsonb_typeof(v_insights#>'{audience,topCities}') = 'array' and jsonb_array_length(v_insights#>'{audience,topCities}') between 1 and 5 and not exists (select 1 from jsonb_array_elements_text(v_insights#>'{audience,topCities}') value where nullif(btrim(value),'') is null) then
        delete from public.creator_instagram_top_locations where snapshot_id=v_snapshot_id;
        insert into public.creator_instagram_top_locations (snapshot_id, location_name, display_order) select v_snapshot_id,btrim(value),ord::integer from jsonb_array_elements_text(v_insights#>'{audience,topCities}') with ordinality as values_(value,ord);
      end if;
    else
      insert into public.creator_facebook_analytics (snapshot_id, views_total, viewers, engagement_total, net_followers, women_percentage, men_percentage)
      values (v_snapshot_id, case when coalesce(v_insights#>>'{overview,viewsTotal}','') ~ '^[0-9]+$' then (v_insights#>>'{overview,viewsTotal}')::bigint end, case when coalesce(v_insights#>>'{overview,viewers}','') ~ '^[0-9]+$' then (v_insights#>>'{overview,viewers}')::bigint end, case when coalesce(v_insights#>>'{engagement,total}','') ~ '^[0-9]+$' then (v_insights#>>'{engagement,total}')::bigint end, case when coalesce(v_insights#>>'{audience,netFollowers}','') ~ '^[0-9]+$' then (v_insights#>>'{audience,netFollowers}')::bigint end, case when coalesce(v_insights#>>'{audience,women}','') ~ '^[0-9]+(\.[0-9]+)?$' then (v_insights#>>'{audience,women}')::numeric end, case when coalesce(v_insights#>>'{audience,men}','') ~ '^[0-9]+(\.[0-9]+)?$' then (v_insights#>>'{audience,men}')::numeric end)
      on conflict (snapshot_id) do update set views_total=excluded.views_total, viewers=excluded.viewers, engagement_total=excluded.engagement_total, net_followers=excluded.net_followers, women_percentage=excluded.women_percentage, men_percentage=excluded.men_percentage;
      if coalesce(v_insights#>>'{audience,topAgeGroup}','') in ('18–24','25–34','35–44','Other') then
        delete from public.creator_facebook_top_age_groups where snapshot_id=v_snapshot_id;
        insert into public.creator_facebook_top_age_groups (snapshot_id, age_group) values (v_snapshot_id, v_insights#>>'{audience,topAgeGroup}');
      end if;
      if jsonb_typeof(v_insights#>'{audience,topCities}') = 'array' and jsonb_array_length(v_insights#>'{audience,topCities}') between 1 and 5 and not exists (select 1 from jsonb_array_elements_text(v_insights#>'{audience,topCities}') value where nullif(btrim(value),'') is null) then
        delete from public.creator_facebook_top_locations where snapshot_id=v_snapshot_id;
        insert into public.creator_facebook_top_locations (snapshot_id, location_name, display_order) select v_snapshot_id,btrim(value),ord::integer from jsonb_array_elements_text(v_insights#>'{audience,topCities}') with ordinality as values_(value,ord);
      end if;
    end if;
  end loop;
  delete from public.creator_social_platforms p where p.creator_id=p_creator_id and not exists (select 1 from jsonb_array_elements(p_accounts) account where lower(account->>'platform')=p.platform);
end $$;

create or replace function public.admin_save_creator_onboarding(p_draft_id uuid, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_draft public.admin_creator_onboarding_drafts%rowtype; v_creator_id uuid; v_basic jsonb := coalesce(p_payload->'basic','{}'::jsonb); v_identity jsonb := coalesce(p_payload->'identity','{}'::jsonb); v_content jsonb := coalesce(p_payload->'content','{}'::jsonb); v_full_name text := nullif(btrim(coalesce(v_basic->>'fullName','')), ''); v_email text := nullif(lower(btrim(coalesce(v_basic->>'email',''))), ''); v_phone text := nullif(btrim(coalesce(v_basic->>'phoneNumber','')), ''); v_city text := nullif(btrim(coalesce(v_basic->>'currentCity','')), ''); v_dob text := nullif(btrim(coalesce(v_basic->>'dateOfBirth','')), ''); v_gender text := nullif(btrim(coalesce(v_basic->>'gender','')), ''); v_languages text[]; v_other_niches text[]; v_formats text[]; v_styles text[];
begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode='42501'; end if;
  if jsonb_typeof(p_payload) <> 'object' then raise exception 'Invalid onboarding payload'; end if;
  if p_draft_id is null then insert into public.admin_creator_onboarding_drafts (created_by,payload) values (auth.uid(),p_payload) returning * into v_draft; else select * into v_draft from public.admin_creator_onboarding_drafts where id=p_draft_id for update; if v_draft.id is null then raise exception 'Onboarding draft not found'; end if; update public.admin_creator_onboarding_drafts set payload=p_payload where id=v_draft.id returning * into v_draft; end if;
  v_creator_id := v_draft.creator_id;
  if v_creator_id is null and v_full_name is not null and v_email is not null and v_phone is not null and v_city is not null and v_dob is not null and v_gender is not null then
    if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email address before creating the creator'; end if;
    insert into public.creators (full_name,email,phone_number,current_city,date_of_birth,gender,more) values (v_full_name,v_email,v_phone,v_city,public.safe_iso_date(v_dob),v_gender,nullif(btrim(coalesce(v_basic->>'more','')),'')) returning id into v_creator_id;
    update public.admin_creator_onboarding_drafts set creator_id=v_creator_id where id=v_draft.id;
  elsif v_creator_id is not null and v_full_name is not null and v_email is not null and v_phone is not null and v_city is not null and v_dob is not null and v_gender is not null then
    update public.creators set full_name=v_full_name,email=v_email,phone_number=v_phone,current_city=v_city,date_of_birth=public.safe_iso_date(v_dob),gender=v_gender,more=nullif(btrim(coalesce(v_basic->>'more','')),'') where id=v_creator_id;
  end if;
  if v_creator_id is not null then
    select coalesce(array_agg(btrim(value)) filter (where nullif(btrim(value),'') is not null),'{}'::text[]) into v_languages from jsonb_array_elements_text(coalesce(v_identity->'languages','[]'::jsonb)) value;
    insert into public.creator_identity (creator_id,display_name,bio,languages,creator_type,creator_type_other) values (v_creator_id,nullif(btrim(coalesce(v_identity->>'displayName','')),''),nullif(btrim(coalesce(v_identity->>'bio','')),''),v_languages,nullif(btrim(coalesce(v_identity->>'creatorType','')),''),case when v_identity->>'creatorType'='other' then nullif(btrim(coalesce(v_identity->>'creatorTypeOther','')),'') end) on conflict (creator_id) do update set display_name=excluded.display_name,bio=excluded.bio,languages=excluded.languages,creator_type=excluded.creator_type,creator_type_other=excluded.creator_type_other;
    select coalesce(array_agg(btrim(value)) filter (where nullif(btrim(value),'') is not null),'{}'::text[]) into v_other_niches from jsonb_array_elements_text(coalesce(v_content->'otherNiches','[]'::jsonb)) value;
    select coalesce(array_agg(btrim(value)) filter (where nullif(btrim(value),'') is not null),'{}'::text[]) into v_formats from jsonb_array_elements_text(coalesce(v_content->'contentFormats','[]'::jsonb)) value;
    select coalesce(array_agg(btrim(value)) filter (where nullif(btrim(value),'') is not null),'{}'::text[]) into v_styles from jsonb_array_elements_text(coalesce(v_content->'contentStyles','[]'::jsonb)) value;
    if nullif(btrim(coalesce(v_content->>'primaryNiche','')),'') is not null and cardinality(v_formats)>0 and cardinality(v_styles)>0 and (v_content->>'primaryNiche' <> 'Other' or nullif(btrim(coalesce(v_content->>'primaryNicheOther','')),'') is not null) and (not ('Other'=any(v_other_niches)) or nullif(btrim(coalesce(v_content->>'otherNichesOther','')),'') is not null) and (not ('Other'=any(v_formats)) or nullif(btrim(coalesce(v_content->>'contentFormatsOther','')),'') is not null) and (not ('Other'=any(v_styles)) or nullif(btrim(coalesce(v_content->>'contentStylesOther','')),'') is not null) then
      insert into public.creator_content_profile (creator_id,primary_niche,primary_niche_other,other_niches,other_niches_other,content_formats,content_formats_other,content_styles,content_styles_other) values (v_creator_id,btrim(v_content->>'primaryNiche'),nullif(btrim(coalesce(v_content->>'primaryNicheOther','')),''),v_other_niches,nullif(btrim(coalesce(v_content->>'otherNichesOther','')),''),v_formats,nullif(btrim(coalesce(v_content->>'contentFormatsOther','')),''),v_styles,nullif(btrim(coalesce(v_content->>'contentStylesOther','')),'')) on conflict (creator_id) do update set primary_niche=excluded.primary_niche,primary_niche_other=excluded.primary_niche_other,other_niches=excluded.other_niches,other_niches_other=excluded.other_niches_other,content_formats=excluded.content_formats,content_formats_other=excluded.content_formats_other,content_styles=excluded.content_styles,content_styles_other=excluded.content_styles_other;
    end if;
    if jsonb_typeof(coalesce(p_payload->'socialAccounts','[]'::jsonb))='array' then perform public.admin_save_onboarding_social(v_creator_id,coalesce(p_payload->'socialAccounts','[]'::jsonb)); end if;
  end if;
  return jsonb_build_object('draftId',v_draft.id,'creatorId',v_creator_id);
end $$;

create or replace function public.admin_get_creator_onboarding(p_draft_id uuid)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode='42501'; end if;
  return (select jsonb_build_object('draftId',id,'creatorId',creator_id,'payload',payload) from public.admin_creator_onboarding_drafts where id=p_draft_id);
end $$;

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare creator_dob date; v_creator_id uuid;
begin
  select id into v_creator_id from public.creators where lower(email)=lower(new.email) and auth_user_id is null for update;
  if v_creator_id is not null then update public.creators set auth_user_id=new.id where id=v_creator_id; return new; end if;
  creator_dob := public.safe_iso_date(new.raw_user_meta_data->>'date_of_birth');
  insert into public.creators (auth_user_id,full_name,email,phone_number,current_city,date_of_birth,gender,more,status) values (new.id,coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),''),new.email,coalesce(nullif(trim(new.raw_user_meta_data->>'phone_number'),''),''),coalesce(nullif(trim(new.raw_user_meta_data->>'current_city'),''),''),creator_dob,coalesce(nullif(trim(new.raw_user_meta_data->>'gender'),''),''),nullif(trim(new.raw_user_meta_data->>'more'),''),'pending') on conflict (auth_user_id) do nothing;
  return new;
end $$;

revoke all on function public.admin_save_onboarding_social(uuid,jsonb), public.admin_save_creator_onboarding(uuid,jsonb), public.admin_get_creator_onboarding(uuid) from public, anon, authenticated;
grant execute on function public.admin_save_creator_onboarding(uuid,jsonb), public.admin_get_creator_onboarding(uuid) to authenticated;

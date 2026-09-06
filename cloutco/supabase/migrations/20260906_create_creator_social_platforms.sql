create table if not exists public.creator_social_platforms (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'facebook', 'youtube')),
  profile_url text not null check (nullif(btrim(profile_url), '') is not null),
  username text,
  audience_count bigint not null check (audience_count >= 0),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (creator_id, platform),
  unique (id, platform)
);

create unique index if not exists uq_creator_social_platforms_one_primary
  on public.creator_social_platforms (creator_id) where is_primary;

create table if not exists public.creator_social_analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  social_platform_id uuid not null,
  platform text not null,
  period_days smallint not null check (period_days > 0),
  period_start date,
  period_end date,
  is_current boolean not null default true,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_social_analytics_snapshots_platform_fk
    foreign key (social_platform_id, platform)
    references public.creator_social_platforms(id, platform) on delete cascade,
  constraint creator_social_analytics_snapshots_period_dates_check check (
    (period_start is null and period_end is null)
    or (period_start is not null and period_end is not null and period_end >= period_start)
  ),
  unique (id, platform)
);

create unique index if not exists uq_creator_social_snapshots_current_period
  on public.creator_social_analytics_snapshots (social_platform_id, period_days) where is_current;

create table if not exists public.creator_instagram_analytics (
  snapshot_id uuid primary key,
  platform text not null default 'instagram' check (platform = 'instagram'),
  views_all_content bigint check (views_all_content >= 0),
  overview_followers_percentage numeric check (overview_followers_percentage between 0 and 100),
  overview_non_followers_percentage numeric check (overview_non_followers_percentage between 0 and 100),
  net_followers bigint check (net_followers >= 0),
  interactions bigint check (interactions >= 0),
  viewers_total bigint check (viewers_total >= 0),
  posts_views bigint check (posts_views >= 0),
  reels_views bigint check (reels_views >= 0),
  stories_views bigint check (stories_views >= 0),
  live_videos_views bigint check (live_videos_views >= 0),
  all_interactions bigint check (all_interactions >= 0),
  posts_interactions bigint check (posts_interactions >= 0),
  reels_interactions bigint check (reels_interactions >= 0),
  stories_interactions bigint check (stories_interactions >= 0),
  live_videos_interactions bigint check (live_videos_interactions >= 0),
  profile_visits bigint check (profile_visits >= 0),
  bio_link_taps bigint check (bio_link_taps >= 0),
  business_address_taps bigint check (business_address_taps >= 0),
  audience_followers bigint check (audience_followers >= 0),
  follower_growth bigint check (follower_growth >= 0),
  women_percentage numeric check (women_percentage between 0 and 100),
  men_percentage numeric check (men_percentage between 0 and 100),
  constraint creator_instagram_analytics_snapshot_fk foreign key (snapshot_id, platform)
    references public.creator_social_analytics_snapshots(id, platform) on delete cascade
);

create table if not exists public.creator_facebook_analytics (
  snapshot_id uuid primary key,
  platform text not null default 'facebook' check (platform = 'facebook'),
  views_total bigint check (views_total >= 0),
  viewers bigint check (viewers >= 0),
  view_type_views bigint check (view_type_views >= 0),
  view_type_three_second_views bigint check (view_type_three_second_views >= 0),
  view_type_one_minute_views bigint check (view_type_one_minute_views >= 0),
  overview_viewer_followers_percentage numeric check (overview_viewer_followers_percentage between 0 and 100),
  overview_viewer_non_followers_percentage numeric check (overview_viewer_non_followers_percentage between 0 and 100),
  engagement_total bigint check (engagement_total >= 0),
  engagement_viewer_followers_percentage numeric check (engagement_viewer_followers_percentage between 0 and 100),
  engagement_viewer_non_followers_percentage numeric check (engagement_viewer_non_followers_percentage between 0 and 100),
  new_conversations bigint check (new_conversations >= 0),
  net_followers bigint check (net_followers >= 0),
  women_percentage numeric check (women_percentage between 0 and 100),
  men_percentage numeric check (men_percentage between 0 and 100),
  constraint creator_facebook_analytics_snapshot_fk foreign key (snapshot_id, platform)
    references public.creator_social_analytics_snapshots(id, platform) on delete cascade
);

create table if not exists public.creator_social_audience_age_ranges (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.creator_social_analytics_snapshots(id) on delete cascade,
  range_label text not null check (nullif(btrim(range_label), '') is not null),
  percentage numeric not null check (percentage between 0 and 100),
  sort_order smallint not null
);
create unique index if not exists uq_creator_social_age_ranges_label_ci
  on public.creator_social_audience_age_ranges (snapshot_id, lower(range_label));

create table if not exists public.creator_social_audience_locations (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.creator_social_analytics_snapshots(id) on delete cascade,
  location_kind text not null check (location_kind in ('country', 'city')),
  location_name text not null check (nullif(btrim(location_name), '') is not null),
  percentage numeric not null check (percentage between 0 and 100),
  sort_order smallint not null
);
create unique index if not exists uq_creator_social_locations_name_ci
  on public.creator_social_audience_locations (snapshot_id, location_kind, lower(location_name));

create table if not exists public.creator_facebook_analytics_breakdowns (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.creator_facebook_analytics(snapshot_id) on delete cascade,
  breakdown_kind text not null check (breakdown_kind in ('view_media_type', 'engagement_media_type', 'interaction_type', 'traffic', 'source')),
  label text not null check (nullif(btrim(label), '') is not null),
  count_value bigint check (count_value >= 0),
  percentage_value numeric check (percentage_value between 0 and 100),
  sort_order smallint not null,
  constraint creator_facebook_analytics_breakdowns_value_kind_check check (
    (breakdown_kind in ('view_media_type', 'traffic', 'source') and percentage_value is not null and count_value is null)
    or (breakdown_kind in ('engagement_media_type', 'interaction_type') and count_value is not null and percentage_value is null)
  )
);
create unique index if not exists uq_creator_facebook_breakdowns_label_ci
  on public.creator_facebook_analytics_breakdowns (snapshot_id, breakdown_kind, lower(label));

do $$
declare table_name text;
begin
  foreach table_name in array array['creator_social_platforms', 'creator_social_analytics_snapshots'] loop
    if not exists (select 1 from pg_catalog.pg_trigger where tgrelid = format('public.%I', table_name)::regclass and tgname = 'set_' || table_name || '_updated_at' and not tgisinternal) then
      execute format('create trigger %I before update on public.%I for each row execute procedure public.handle_updated_at()', 'set_' || table_name || '_updated_at', table_name);
    end if;
  end loop;
end;
$$;

alter table public.creator_social_platforms enable row level security;
alter table public.creator_social_analytics_snapshots enable row level security;
alter table public.creator_instagram_analytics enable row level security;
alter table public.creator_facebook_analytics enable row level security;
alter table public.creator_social_audience_age_ranges enable row level security;
alter table public.creator_social_audience_locations enable row level security;
alter table public.creator_facebook_analytics_breakdowns enable row level security;

do $$
declare policy_table text; policy_name text;
begin
  foreach policy_table in array array['creator_social_platforms', 'creator_social_analytics_snapshots', 'creator_instagram_analytics', 'creator_facebook_analytics', 'creator_social_audience_age_ranges', 'creator_social_audience_locations', 'creator_facebook_analytics_breakdowns'] loop
    policy_name := 'own_' || policy_table;
    if not exists (select 1 from pg_catalog.pg_policies where schemaname = 'public' and tablename = policy_table and policyname = policy_name) then
      execute format(
        'create policy %I on public.%I for all to authenticated using (%s) with check (%s)',
        policy_name,
        policy_table,
        case policy_table
          when 'creator_social_platforms' then 'exists (select 1 from public.creators c where c.id = creator_social_platforms.creator_id and c.auth_user_id = auth.uid())'
          when 'creator_social_analytics_snapshots' then 'exists (select 1 from public.creator_social_platforms p join public.creators c on c.id = p.creator_id where p.id = creator_social_analytics_snapshots.social_platform_id and c.auth_user_id = auth.uid())'
          when 'creator_instagram_analytics' then 'exists (select 1 from public.creator_social_analytics_snapshots s join public.creator_social_platforms p on p.id = s.social_platform_id join public.creators c on c.id = p.creator_id where s.id = creator_instagram_analytics.snapshot_id and c.auth_user_id = auth.uid())'
          when 'creator_facebook_analytics' then 'exists (select 1 from public.creator_social_analytics_snapshots s join public.creator_social_platforms p on p.id = s.social_platform_id join public.creators c on c.id = p.creator_id where s.id = creator_facebook_analytics.snapshot_id and c.auth_user_id = auth.uid())'
          when 'creator_social_audience_age_ranges' then 'exists (select 1 from public.creator_social_analytics_snapshots s join public.creator_social_platforms p on p.id = s.social_platform_id join public.creators c on c.id = p.creator_id where s.id = creator_social_audience_age_ranges.snapshot_id and c.auth_user_id = auth.uid())'
          when 'creator_social_audience_locations' then 'exists (select 1 from public.creator_social_analytics_snapshots s join public.creator_social_platforms p on p.id = s.social_platform_id join public.creators c on c.id = p.creator_id where s.id = creator_social_audience_locations.snapshot_id and c.auth_user_id = auth.uid())'
          else 'exists (select 1 from public.creator_facebook_analytics f join public.creator_social_analytics_snapshots s on s.id = f.snapshot_id join public.creator_social_platforms p on p.id = s.social_platform_id join public.creators c on c.id = p.creator_id where f.snapshot_id = creator_facebook_analytics_breakdowns.snapshot_id and c.auth_user_id = auth.uid())'
        end,
        case policy_table
          when 'creator_social_platforms' then 'exists (select 1 from public.creators c where c.id = creator_social_platforms.creator_id and c.auth_user_id = auth.uid())'
          when 'creator_social_analytics_snapshots' then 'exists (select 1 from public.creator_social_platforms p join public.creators c on c.id = p.creator_id where p.id = creator_social_analytics_snapshots.social_platform_id and c.auth_user_id = auth.uid())'
          when 'creator_instagram_analytics' then 'exists (select 1 from public.creator_social_analytics_snapshots s join public.creator_social_platforms p on p.id = s.social_platform_id join public.creators c on c.id = p.creator_id where s.id = creator_instagram_analytics.snapshot_id and c.auth_user_id = auth.uid())'
          when 'creator_facebook_analytics' then 'exists (select 1 from public.creator_social_analytics_snapshots s join public.creator_social_platforms p on p.id = s.social_platform_id join public.creators c on c.id = p.creator_id where s.id = creator_facebook_analytics.snapshot_id and c.auth_user_id = auth.uid())'
          when 'creator_social_audience_age_ranges' then 'exists (select 1 from public.creator_social_analytics_snapshots s join public.creator_social_platforms p on p.id = s.social_platform_id join public.creators c on c.id = p.creator_id where s.id = creator_social_audience_age_ranges.snapshot_id and c.auth_user_id = auth.uid())'
          when 'creator_social_audience_locations' then 'exists (select 1 from public.creator_social_analytics_snapshots s join public.creator_social_platforms p on p.id = s.social_platform_id join public.creators c on c.id = p.creator_id where s.id = creator_social_audience_locations.snapshot_id and c.auth_user_id = auth.uid())'
          else 'exists (select 1 from public.creator_facebook_analytics f join public.creator_social_analytics_snapshots s on s.id = f.snapshot_id join public.creator_social_platforms p on p.id = s.social_platform_id join public.creators c on c.id = p.creator_id where f.snapshot_id = creator_facebook_analytics_breakdowns.snapshot_id and c.auth_user_id = auth.uid())'
        end
      );
    end if;
  end loop;
end;
$$;

revoke all on public.creator_social_platforms, public.creator_social_analytics_snapshots, public.creator_instagram_analytics, public.creator_facebook_analytics, public.creator_social_audience_age_ranges, public.creator_social_audience_locations, public.creator_facebook_analytics_breakdowns from anon, authenticated;
grant select, insert, update, delete on public.creator_social_platforms, public.creator_social_analytics_snapshots, public.creator_instagram_analytics, public.creator_facebook_analytics, public.creator_social_audience_age_ranges, public.creator_social_audience_locations, public.creator_facebook_analytics_breakdowns to authenticated;

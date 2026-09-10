-- Selection-only audience fields retain the existing age-range and location
-- records while making their former percentage attributes optional.
alter table public.creator_social_audience_age_ranges
  alter column percentage drop not null;

alter table public.creator_social_audience_locations
  alter column percentage drop not null;

-- Facebook did not previously retain the approved Profile Visits metric.
alter table public.creator_facebook_analytics
  add column if not exists profile_visits bigint check (profile_visits >= 0);

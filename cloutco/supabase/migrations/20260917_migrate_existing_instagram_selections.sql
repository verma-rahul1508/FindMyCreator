with age_selections (snapshot_id, age_range, display_order) as (
  values
    ('6e755e7d-4fd1-4d2f-a537-69b68d2e3c0c'::uuid, '18–24', 1),
    ('6e755e7d-4fd1-4d2f-a537-69b68d2e3c0c'::uuid, '55–64', 2),
    ('8e9c2fe5-1122-4eff-bd14-d4fc128735b7'::uuid, '18–24', 1),
    ('8e9c2fe5-1122-4eff-bd14-d4fc128735b7'::uuid, '13–17', 2),
    ('aa64df97-83b8-46c6-bffa-dd7b6ff168f9'::uuid, '18–24', 1),
    ('aa64df97-83b8-46c6-bffa-dd7b6ff168f9'::uuid, '25–34', 2),
    ('e7107ba8-a48b-461f-9b56-6d2d575fb4b9'::uuid, '18–24', 1),
    ('e7107ba8-a48b-461f-9b56-6d2d575fb4b9'::uuid, '25–34', 2),
    ('ea2f0e1e-25de-4be6-a7f5-2a557c2da252'::uuid, '25–34', 1),
    ('ea2f0e1e-25de-4be6-a7f5-2a557c2da252'::uuid, '18–24', 2)
)
insert into public.creator_instagram_top_age_ranges (snapshot_id, age_range, display_order)
select selection.snapshot_id, selection.age_range, selection.display_order
from age_selections selection
join public.creator_social_analytics_snapshots snapshot on snapshot.id = selection.snapshot_id
join public.creator_instagram_analytics analytics on analytics.snapshot_id = snapshot.id
where snapshot.platform = 'instagram'
  and not exists (
    select 1
    from public.creator_instagram_top_age_ranges existing_selection
    where existing_selection.snapshot_id = selection.snapshot_id
  )
on conflict (snapshot_id, age_range) do nothing;

with location_selections (snapshot_id, location_name, display_order) as (
  values
    ('6e755e7d-4fd1-4d2f-a537-69b68d2e3c0c'::uuid, 'Pune', 1),
    ('6e755e7d-4fd1-4d2f-a537-69b68d2e3c0c'::uuid, 'Mumbai', 2),
    ('6e755e7d-4fd1-4d2f-a537-69b68d2e3c0c'::uuid, 'Nagpur', 3),
    ('6e755e7d-4fd1-4d2f-a537-69b68d2e3c0c'::uuid, 'Nashik', 4),
    ('e7107ba8-a48b-461f-9b56-6d2d575fb4b9'::uuid, 'Delhi', 1),
    ('e7107ba8-a48b-461f-9b56-6d2d575fb4b9'::uuid, 'Mumbai', 2),
    ('e7107ba8-a48b-461f-9b56-6d2d575fb4b9'::uuid, 'Bangalore Rural', 3),
    ('e7107ba8-a48b-461f-9b56-6d2d575fb4b9'::uuid, 'Kolkata', 4),
    ('ea2f0e1e-25de-4be6-a7f5-2a557c2da252'::uuid, 'Agra', 1),
    ('ea2f0e1e-25de-4be6-a7f5-2a557c2da252'::uuid, 'Jaipur', 2),
    ('ea2f0e1e-25de-4be6-a7f5-2a557c2da252'::uuid, 'Delhi', 3),
    ('ea2f0e1e-25de-4be6-a7f5-2a557c2da252'::uuid, 'Lucknow', 4),
    ('ea2f0e1e-25de-4be6-a7f5-2a557c2da252'::uuid, 'Noida', 5)
)
insert into public.creator_instagram_top_locations (snapshot_id, location_name, display_order)
select selection.snapshot_id, selection.location_name, selection.display_order
from location_selections selection
join public.creator_social_analytics_snapshots snapshot on snapshot.id = selection.snapshot_id
join public.creator_instagram_analytics analytics on analytics.snapshot_id = snapshot.id
where snapshot.platform = 'instagram'
  and not exists (
    select 1
    from public.creator_instagram_top_locations existing_selection
    where existing_selection.snapshot_id = selection.snapshot_id
  )
on conflict (snapshot_id, location_name) do nothing;

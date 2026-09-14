create or replace function public.keep_single_current_social_snapshot()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if new.is_current then
    update public.creator_social_analytics_snapshots snapshot
    set is_current = false
    where snapshot.social_platform_id = new.social_platform_id
      and snapshot.platform = new.platform
      and snapshot.is_current
      and snapshot.period_days <> new.period_days
      and snapshot.id <> new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists keep_single_current_social_snapshot
  on public.creator_social_analytics_snapshots;

create trigger keep_single_current_social_snapshot
before insert or update of is_current, period_days, social_platform_id, platform
on public.creator_social_analytics_snapshots
for each row
when (new.is_current)
execute function public.keep_single_current_social_snapshot();

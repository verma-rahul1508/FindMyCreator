create extension if not exists "pgcrypto";

create table if not exists public.creators (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone_number text not null,
  current_city text not null,
  date_of_birth date not null,
  gender text not null,
  more text,
  status text not null default 'pending' check (status in ('pending','active','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_creators_auth_user_id on public.creators (auth_user_id);
create index if not exists idx_creators_email on public.creators (email);
create index if not exists idx_creators_status on public.creators (status);

create or replace function public.safe_iso_date(raw_value text)
returns date as $$
begin
  if raw_value is null or trim(raw_value) = '' then
    raise exception 'date_of_birth is required and cannot be empty';
  end if;

  if raw_value !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'date_of_birth must be in YYYY-MM-DD format';
  end if;

  return raw_value::date;
  exception
    when invalid_datetime_format or datetime_field_overflow or invalid_text_representation then
  raise exception 'date_of_birth is not a valid date';
end;
$$ language plpgsql immutable;

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.prevent_creator_status_change()
returns trigger as $$
begin
  if old.status is distinct from new.status and auth.uid() = old.auth_user_id then
    new.status = old.status;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger set_creators_updated_at
before update on public.creators
for each row
execute procedure public.handle_updated_at();

create trigger prevent_status_update_on_creator_self_service
before update on public.creators
for each row
when (old.status is distinct from new.status)
execute procedure public.prevent_creator_status_change();

create or replace function public.handle_new_auth_user()
returns trigger as $$
declare
  creator_dob date;
begin
  creator_dob := public.safe_iso_date(new.raw_user_meta_data->>'date_of_birth');

  insert into public.creators (
    auth_user_id,
    full_name,
    email,
    phone_number,
    current_city,
    date_of_birth,
    gender,
    more,
    status
  )
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), ''),
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data->>'phone_number'), ''), ''),
    coalesce(nullif(trim(new.raw_user_meta_data->>'current_city'), ''), ''),
    creator_dob,
    coalesce(nullif(trim(new.raw_user_meta_data->>'gender'), ''), ''),
    nullif(trim(new.raw_user_meta_data->>'more'), ''),
    'pending'
  )
  on conflict (auth_user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = '';

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_auth_user();

alter table public.creators enable row level security;

create policy "Creators can view own profile"
on public.creators
for select
using (auth.uid() = auth_user_id);

create policy "Creators can update own profile"
on public.creators
for update
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

create policy "Creators can delete own profile"
on public.creators
for delete
using (auth.uid() = auth_user_id);

revoke all on public.creators from anon, authenticated;

grant select, delete on public.creators to authenticated;
grant update (
  full_name,
  email,
  phone_number,
  current_city,
  date_of_birth,
  gender,
  more
) on public.creators to authenticated;

revoke execute on function public.safe_iso_date(text) from anon, authenticated;
revoke execute on function public.handle_updated_at() from anon, authenticated;
revoke execute on function public.prevent_creator_status_change() from anon, authenticated;
revoke execute on function public.handle_new_auth_user() from anon, authenticated;

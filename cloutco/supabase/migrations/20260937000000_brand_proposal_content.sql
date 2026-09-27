create table if not exists public.brand_proposal_content (
  brand_id uuid primary key references public.brands(id) on delete cascade,
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.brand_proposal_content enable row level security;
revoke all on public.brand_proposal_content from public, anon, authenticated;

create or replace function public.get_brand_proposal_content(p_proposal_token uuid)
returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
declare
  v_content jsonb;
begin
  select coalesce(proposal_content.content, '{}'::jsonb)
    into v_content
  from public.brands brand
  left join public.brand_proposal_content proposal_content on proposal_content.brand_id = brand.id
  where brand.proposal_token = p_proposal_token;

  if v_content is null then raise exception 'Proposal not found' using errcode = 'P0002'; end if;
  return v_content;
end;
$$;

create or replace function public.admin_save_brand_proposal_content(p_brand_id uuid, p_content jsonb)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then raise exception 'Administrator access is required' using errcode = '42501'; end if;
  if jsonb_typeof(p_content) is distinct from 'object' or octet_length(p_content::text) > 50000 then
    raise exception 'Invalid proposal content';
  end if;
  if not exists (select 1 from public.brands where id = p_brand_id) then
    raise exception 'Brand not found' using errcode = 'P0002';
  end if;

  insert into public.brand_proposal_content (brand_id, content, updated_at)
  values (p_brand_id, p_content, now())
  on conflict (brand_id) do update set content = excluded.content, updated_at = excluded.updated_at;
  return p_content;
end;
$$;

revoke all on function public.get_brand_proposal_content(uuid), public.admin_save_brand_proposal_content(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.get_brand_proposal_content(uuid) to anon, authenticated;
grant execute on function public.admin_save_brand_proposal_content(uuid, jsonb) to authenticated;

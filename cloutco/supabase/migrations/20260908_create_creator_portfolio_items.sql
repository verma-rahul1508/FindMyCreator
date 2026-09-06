create table if not exists public.creator_portfolio_items (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators(id) on delete cascade,
  sort_order smallint not null,
  content_url text not null,
  canonical_url text,
  platform text not null,
  content_type text not null,
  content_type_other text,
  category text,
  category_other text,
  title text,
  description text,
  thumbnail_url text,
  content_id text,
  embed_url text,
  author_name text,
  author_url text,
  views bigint,
  likes bigint,
  comments bigint,
  metrics_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_portfolio_items_sort_order_check check (sort_order between 1 and 10),
  constraint creator_portfolio_items_content_url_required check (nullif(btrim(content_url), '') is not null),
  constraint creator_portfolio_items_platform_required check (nullif(btrim(platform), '') is not null),
  constraint creator_portfolio_items_content_type_required check (nullif(btrim(content_type), '') is not null),
  constraint creator_portfolio_items_content_type_other_required check (content_type <> 'Other' or nullif(btrim(content_type_other), '') is not null),
  constraint creator_portfolio_items_category_other_required check (category is distinct from 'Other' or nullif(btrim(category_other), '') is not null),
  constraint creator_portfolio_items_title_length check (char_length(title) <= 80),
  constraint creator_portfolio_items_description_length check (char_length(description) <= 200),
  constraint creator_portfolio_items_views_nonnegative check (views is null or views >= 0),
  constraint creator_portfolio_items_likes_nonnegative check (likes is null or likes >= 0),
  constraint creator_portfolio_items_comments_nonnegative check (comments is null or comments >= 0),
  constraint creator_portfolio_items_metrics_source_check check (metrics_source is null or metrics_source in ('creator', 'platform')),
  unique (creator_id, sort_order)
);

create unique index if not exists uq_creator_portfolio_items_canonical_url_ci
  on public.creator_portfolio_items (creator_id, lower(regexp_replace(btrim(canonical_url), '/+$', '')))
  where nullif(btrim(canonical_url), '') is not null;

create unique index if not exists uq_creator_portfolio_items_content_identity_ci
  on public.creator_portfolio_items (creator_id, lower(btrim(platform)), lower(btrim(content_id)))
  where nullif(btrim(content_id), '') is not null;

create trigger set_creator_portfolio_items_updated_at
before update on public.creator_portfolio_items
for each row
execute procedure public.handle_updated_at();

alter table public.creator_portfolio_items enable row level security;

create policy "Creators can view own portfolio items"
on public.creator_portfolio_items
for select
using (exists (
  select 1 from public.creators
  where public.creators.id = creator_portfolio_items.creator_id
    and public.creators.auth_user_id = auth.uid()
));

create policy "Creators can insert own portfolio items"
on public.creator_portfolio_items
for insert
with check (exists (
  select 1 from public.creators
  where public.creators.id = creator_portfolio_items.creator_id
    and public.creators.auth_user_id = auth.uid()
));

create policy "Creators can update own portfolio items"
on public.creator_portfolio_items
for update
using (exists (
  select 1 from public.creators
  where public.creators.id = creator_portfolio_items.creator_id
    and public.creators.auth_user_id = auth.uid()
))
with check (exists (
  select 1 from public.creators
  where public.creators.id = creator_portfolio_items.creator_id
    and public.creators.auth_user_id = auth.uid()
));

create policy "Creators can delete own portfolio items"
on public.creator_portfolio_items
for delete
using (exists (
  select 1 from public.creators
  where public.creators.id = creator_portfolio_items.creator_id
    and public.creators.auth_user_id = auth.uid()
));

revoke all on public.creator_portfolio_items from anon, authenticated;
grant select, insert, delete on public.creator_portfolio_items to authenticated;
grant update (
  sort_order,
  content_url,
  canonical_url,
  platform,
  content_type,
  content_type_other,
  category,
  category_other,
  title,
  description,
  thumbnail_url,
  content_id,
  embed_url,
  author_name,
  author_url,
  views,
  likes,
  comments,
  metrics_source
) on public.creator_portfolio_items to authenticated;

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { AdminCreatorListRow, AdminCreatorStatusCounts } from '@/lib/admin-creator-types';
import { getSupabaseClient } from '@/lib/supabase/client';

type StatusFilter = '' | 'pending' | 'active' | 'rejected';
type SortOption = 'recent' | 'oldest' | 'name_asc' | 'name_desc' | 'followers_desc' | 'followers_asc' | 'completion_desc' | 'completion_asc';
type FollowerRange = 'any' | '0-1k' | '1k-10k' | '10k-50k' | '50k-100k' | '100k-500k' | '500k-1m' | '1m-plus';
type CompletionFilter = 'all' | '4' | '3' | '2' | '1' | '0';
type JoinedFilter = 'any' | 'today' | '7-days' | '30-days' | '90-days';

const PAGE_SIZES = [25, 50, 100] as const;

const STATUS_META: Record<Exclude<StatusFilter, ''>, { label: string; countKey: keyof AdminCreatorStatusCounts; className: string }> = {
  pending: { label: 'Pending Review', countKey: 'pending_count', className: 'border-[#e8d8a8] bg-[#fffaf0] text-[#80611b]' },
  active: { label: 'Approved', countKey: 'active_count', className: 'border-[#cce8da] bg-[#f3fbf6] text-[#26754b]' },
  rejected: { label: 'Rejected', countKey: 'rejected_count', className: 'border-[#f0cfd2] bg-[#fff6f6] text-[#a44852]' },
};

const NICHE_OPTIONS = [
  'Beauty', 'Fashion', 'Food & Beverage', 'Travel', 'Lifestyle', 'Fitness', 'Health & Wellness', 'Technology', 'Gaming', 'Finance', 'Business', 'Education', 'Parenting & Family', 'Entertainment', 'Comedy', 'Music', 'Art & Design', 'Photography', 'Automotive', 'Sports', 'Home & Interiors', 'Pets', 'Culture', 'DIY & Crafts', 'Other',
];

const CREATOR_TYPE_OPTIONS = [
  { value: 'content_creator', label: 'Content Creator' },
  { value: 'influencer', label: 'Influencer' },
  { value: 'ugc_creator', label: 'UGC Creator' },
  { value: 'digital_creator', label: 'Digital Creator' },
  { value: 'other', label: 'Other' },
];

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube' },
];

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'recent', label: 'Recently joined' },
  { value: 'oldest', label: 'Oldest joined' },
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'name_desc', label: 'Name Z-A' },
  { value: 'followers_desc', label: 'Followers highest' },
  { value: 'followers_asc', label: 'Followers lowest' },
  { value: 'completion_desc', label: 'Completion highest' },
  { value: 'completion_asc', label: 'Completion lowest' },
];

function numericValue(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAudience(value: number | string) {
  const audience = numericValue(value);
  if (audience >= 1_000_000) return `${(audience / 1_000_000).toFixed(audience >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (audience >= 1_000) return `${(audience / 1_000).toFixed(audience >= 10_000 ? 0 : 1).replace(/\.0$/, '')}K`;
  return new Intl.NumberFormat('en-US').format(audience);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'CC';
}

function creatorTypeLabel(value: string | null) {
  return CREATOR_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? 'Creator';
}

function platformShortLabel(platform: string) {
  return platform === 'instagram' ? 'IG' : platform === 'facebook' ? 'FB' : 'YT';
}

function displayNiche(creator: AdminCreatorListRow) {
  return creator.primary_niche === 'Other' && creator.primary_niche_other ? creator.primary_niche_other : creator.primary_niche || '—';
}

function followerBounds(range: FollowerRange): { min: number | null; max: number | null } {
  switch (range) {
    case '0-1k': return { min: 0, max: 1_000 };
    case '1k-10k': return { min: 1_000, max: 10_000 };
    case '10k-50k': return { min: 10_000, max: 50_000 };
    case '50k-100k': return { min: 50_000, max: 100_000 };
    case '100k-500k': return { min: 100_000, max: 500_000 };
    case '500k-1m': return { min: 500_000, max: 1_000_000 };
    case '1m-plus': return { min: 1_000_000, max: null };
    default: return { min: null, max: null };
  }
}

function joinedAfter(filter: JoinedFilter) {
  if (filter === 'any') return null;
  const date = new Date();
  if (filter === 'today') date.setHours(0, 0, 0, 0);
  if (filter === '7-days') date.setDate(date.getDate() - 7);
  if (filter === '30-days') date.setDate(date.getDate() - 30);
  if (filter === '90-days') date.setDate(date.getDate() - 90);
  return date.toISOString();
}

function StatusBadge({ status }: { status: Exclude<StatusFilter, ''> }) {
  const meta = STATUS_META[status];
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>;
}

type FilterControlsProps = {
  cities: string[];
  status: StatusFilter;
  city: string;
  niche: string;
  creatorType: string;
  platform: string;
  followers: FollowerRange;
  completion: CompletionFilter;
  joined: JoinedFilter;
  onStatusChange: (value: StatusFilter) => void;
  onCityChange: (value: string) => void;
  onNicheChange: (value: string) => void;
  onCreatorTypeChange: (value: string) => void;
  onPlatformChange: (value: string) => void;
  onFollowersChange: (value: FollowerRange) => void;
  onCompletionChange: (value: CompletionFilter) => void;
  onJoinedChange: (value: JoinedFilter) => void;
};

function FilterControls(props: FilterControlsProps) {
  const selectClassName = 'mt-1.5 min-h-11 w-full rounded-lg border border-[#e3e1e9] bg-white px-3 text-sm text-[#30333a] outline-none transition focus:border-[#9c7df0] focus:ring-2 focus:ring-[#ede7ff]';

  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <label className="text-xs font-semibold text-[#575e6b]">Status
      <select value={props.status} onChange={(event) => props.onStatusChange(event.target.value as StatusFilter)} className={selectClassName}>
        <option value="">All</option><option value="pending">Pending</option><option value="active">Active</option><option value="rejected">Rejected</option>
      </select>
    </label>
    <label className="text-xs font-semibold text-[#575e6b]">City
      <select value={props.city} onChange={(event) => props.onCityChange(event.target.value)} className={selectClassName}>
        <option value="">All cities</option>
        {props.city && !props.cities.includes(props.city) && <option value={props.city}>{props.city}</option>}
        {props.cities.map((city) => <option key={city} value={city}>{city}</option>)}
      </select>
    </label>
    <label className="text-xs font-semibold text-[#575e6b]">Primary niche
      <select value={props.niche} onChange={(event) => props.onNicheChange(event.target.value)} className={selectClassName}>
        <option value="">All niches</option>{NICHE_OPTIONS.map((niche) => <option key={niche} value={niche}>{niche}</option>)}
      </select>
    </label>
    <label className="text-xs font-semibold text-[#575e6b]">Creator type
      <select value={props.creatorType} onChange={(event) => props.onCreatorTypeChange(event.target.value)} className={selectClassName}>
        <option value="">All creator types</option>{CREATOR_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
    <label className="text-xs font-semibold text-[#575e6b]">Platform
      <select value={props.platform} onChange={(event) => props.onPlatformChange(event.target.value)} className={selectClassName}>
        <option value="">All platforms</option>{PLATFORM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
    <label className="text-xs font-semibold text-[#575e6b]">Followers
      <select value={props.followers} onChange={(event) => props.onFollowersChange(event.target.value as FollowerRange)} className={selectClassName}>
        <option value="any">Any</option><option value="0-1k">0–1K</option><option value="1k-10k">1K–10K</option><option value="10k-50k">10K–50K</option><option value="50k-100k">50K–100K</option><option value="100k-500k">100K–500K</option><option value="500k-1m">500K–1M</option><option value="1m-plus">1M+</option>
      </select>
    </label>
    <label className="text-xs font-semibold text-[#575e6b]">Profile completion
      <select value={props.completion} onChange={(event) => props.onCompletionChange(event.target.value as CompletionFilter)} className={selectClassName}>
        <option value="all">All</option><option value="4">4/4</option><option value="3">3/4</option><option value="2">2/4</option><option value="1">1/4</option><option value="0">0/4</option>
      </select>
    </label>
    <label className="text-xs font-semibold text-[#575e6b]">Joined
      <select value={props.joined} onChange={(event) => props.onJoinedChange(event.target.value as JoinedFilter)} className={selectClassName}>
        <option value="any">Any time</option><option value="today">Today</option><option value="7-days">Last 7 days</option><option value="30-days">Last 30 days</option><option value="90-days">Last 90 days</option>
      </select>
    </label>
  </div>;
}

function CreatorSkeleton() {
  return <div className="space-y-3" aria-label="Loading creators">
    {[0, 1, 2, 3, 4].map((index) => <div key={index} className="h-20 animate-pulse rounded-xl border border-[#eceaf0] bg-[#faf9fc]" />)}
  </div>;
}

export default function AdminCreatorsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedStatus = searchParams.get('status');
  const status: StatusFilter = requestedStatus === 'pending' || requestedStatus === 'active' || requestedStatus === 'rejected' ? requestedStatus : '';
  const [rows, setRows] = useState<AdminCreatorListRow[]>([]);
  const [counts, setCounts] = useState<AdminCreatorStatusCounts | null>(null);
  const [filterCities, setFilterCities] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [city, setCity] = useState('');
  const [niche, setNiche] = useState('');
  const [creatorType, setCreatorType] = useState('');
  const [platform, setPlatform] = useState('');
  const [followers, setFollowers] = useState<FollowerRange>('any');
  const [completion, setCompletion] = useState<CompletionFilter>('all');
  const [joined, setJoined] = useState<JoinedFilter>('any');
  const [sort, setSort] = useState<SortOption>('recent');
  const [sortTouched, setSortTouched] = useState(false);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(25);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState(false);
  const [countsError, setCountsError] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const effectiveSort: SortOption = status === 'pending' && !sortTouched ? 'oldest' : sort;
  const bounds = useMemo(() => followerBounds(followers), [followers]);
  const joinedAfterValue = useMemo(() => joinedAfter(joined), [joined]);
  const availableCities = useMemo(() => filterCities.length ? filterCities : [...new Set(rows.map((creator) => creator.current_city.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [filterCities, rows]);
  const totalCount = numericValue(rows[0]?.total_count);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasActiveFilters = Boolean(searchValue.trim() || status || city || niche || creatorType || platform || followers !== 'any' || completion !== 'all' || joined !== 'any');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchValue.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [searchValue]);

  useEffect(() => {
    let active = true;
    const loadCounts = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        if (active) setCountsError(true);
        return;
      }

      const { data, error } = await supabase.rpc('admin_creator_status_counts');
      if (!active) return;
      if (error || !Array.isArray(data) || !data[0]) {
        setCountsError(true);
        return;
      }
      setCounts(data[0] as AdminCreatorStatusCounts);
      setCountsError(false);
    };

    void loadCounts();
    return () => { active = false; };
  }, [refreshKey]);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    void supabase.rpc('admin_creator_filter_options').then(({ data, error }) => {
      if (!active || error || !data || typeof data !== 'object') return;
      const cities = (data as { cities?: unknown }).cities;
      if (Array.isArray(cities)) setFilterCities(cities.filter((value): value is string => typeof value === 'string'));
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const loadCreators = async () => {
      setLoading(true);
      const supabase = getSupabaseClient();
      if (!supabase) {
        if (active) {
          setListError(true);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase.rpc('admin_list_creators', {
        p_search: debouncedSearch || null,
        p_status: status || null,
        p_city: city || null,
        p_primary_niche: niche || null,
        p_creator_type: creatorType || null,
        p_platform: platform || null,
        p_min_followers: bounds.min,
        p_max_followers: bounds.max,
        p_min_completion: completion === 'all' ? null : Number(completion),
        p_max_completion: completion === 'all' ? null : Number(completion),
        p_joined_after: joinedAfterValue,
        p_joined_before: null,
        p_sort: effectiveSort,
        p_limit: pageSize,
        p_offset: (page - 1) * pageSize,
      });

      if (!active) return;
      if (error || !Array.isArray(data)) {
        if (process.env.NODE_ENV === 'development' && error) {
          console.error('Admin creator list RPC failed.', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
        }
        setListError(true);
        setRows([]);
      } else {
        setRows(data as AdminCreatorListRow[]);
        setListError(false);
      }
      setLoading(false);
    };

    void loadCreators();
    return () => { active = false; };
  }, [bounds.max, bounds.min, city, completion, creatorType, debouncedSearch, effectiveSort, joinedAfterValue, niche, page, pageSize, platform, refreshKey, status]);

  const updateStatus = useCallback((nextStatus: StatusFilter) => {
    setPage(1);
    router.replace(nextStatus ? `${pathname}?status=${nextStatus}` : pathname);
  }, [pathname, router]);

  const resetPage = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    setPage(1);
  };

  const clearAll = () => {
    setSearchValue('');
    setDebouncedSearch('');
    setCity('');
    setNiche('');
    setCreatorType('');
    setPlatform('');
    setFollowers('any');
    setCompletion('all');
    setJoined('any');
    setSort('recent');
    setSortTouched(false);
    setPage(1);
    router.replace(pathname);
  };

  const filterProps: FilterControlsProps = {
    cities: availableCities,
    status,
    city,
    niche,
    creatorType,
    platform,
    followers,
    completion,
    joined,
    onStatusChange: updateStatus,
    onCityChange: (value) => resetPage(setCity, value),
    onNicheChange: (value) => resetPage(setNiche, value),
    onCreatorTypeChange: (value) => resetPage(setCreatorType, value),
    onPlatformChange: (value) => resetPage(setPlatform, value),
    onFollowersChange: (value) => resetPage(setFollowers, value),
    onCompletionChange: (value) => resetPage(setCompletion, value),
    onJoinedChange: (value) => resetPage(setJoined, value),
  };

  const statusCards: Array<{ key: StatusFilter; label: string; count: number }> = [
    { key: '', label: 'All', count: numericValue(counts?.total_count) },
    { key: 'pending', label: 'Pending Review', count: numericValue(counts?.pending_count) },
    { key: 'active', label: 'Approved', count: numericValue(counts?.active_count) },
    { key: 'rejected', label: 'Rejected', count: numericValue(counts?.rejected_count) },
  ];

  return <section className="mx-auto w-full max-w-[1480px] px-5 py-9 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7C3AED]">Creator management</p>
    <h1 className="mt-3 text-[2.15rem] font-semibold tracking-[-0.06em] text-[#151518] sm:text-[2.7rem]">Creator Management</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#626a7a] sm:text-base">Review, search and manage the CloutCo creator network.</p>

    <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {statusCards.map((card) => {
        const selected = status === card.key;
        return <button key={card.label} type="button" onClick={() => updateStatus(card.key)} className={`rounded-2xl border px-4 py-4 text-left transition ${selected ? 'border-[#9b7bed] bg-[#f5f1ff] shadow-[0_8px_20px_rgba(92,55,184,0.08)]' : 'border-[#e8e7eb] bg-white hover:border-[#cec6df]'}`}>
          <span className="text-sm font-medium text-[#626a7a]">{card.label}</span>
          <span className="mt-2 block text-2xl font-semibold tracking-[-0.05em] text-[#1c1d21]">{counts ? new Intl.NumberFormat('en-US').format(card.count) : '—'}</span>
        </button>;
      })}
    </div>

    <section className="mt-7 rounded-2xl border border-[#e8e7eb] bg-white p-4 shadow-[0_10px_30px_rgba(33,24,54,0.035)] sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search creators</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-[#7a8190] stroke-[1.8]"><circle cx="10.8" cy="10.8" r="5.7" /><path d="m15.2 15.2 4 4" /></svg>
          <input value={searchValue} onChange={(event) => { setSearchValue(event.target.value); setPage(1); }} placeholder="Search creators by name, username, email or phone..." className="min-h-12 w-full rounded-xl border border-[#e3e1e9] bg-[#fffefe] py-3 pl-10 pr-4 text-sm text-[#24252a] outline-none transition placeholder:text-[#969ba5] focus:border-[#9c7df0] focus:ring-2 focus:ring-[#ede7ff]" />
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setFiltersOpen(true)} className="min-h-12 rounded-xl border border-[#dedbe5] px-4 text-sm font-medium text-[#343640] transition hover:bg-[#faf8ff] md:hidden">Filters</button>
          <label className="flex min-h-12 items-center gap-2 rounded-xl border border-[#dedbe5] px-3 text-sm text-[#555b67]">
            <span className="hidden sm:inline">Sort</span>
            <select value={effectiveSort} onChange={(event) => { setSort(event.target.value as SortOption); setSortTouched(true); setPage(1); }} className="max-w-[180px] bg-transparent text-sm font-medium text-[#30323a] outline-none">
              {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-5 hidden border-t border-[#efedf2] pt-5 md:block"><FilterControls {...filterProps} /></div>

      {hasActiveFilters && <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#efedf2] pt-4">
        {status && <span className="rounded-full bg-[#f1ebff] px-3 py-1 text-xs font-semibold text-[#6330dc]">{STATUS_META[status].label}</span>}
        {searchValue.trim() && <span className="rounded-full bg-[#f7f5fa] px-3 py-1 text-xs text-[#575e6b]">Search: {searchValue.trim()}</span>}
        {city && <span className="rounded-full bg-[#f7f5fa] px-3 py-1 text-xs text-[#575e6b]">{city}</span>}
        {niche && <span className="rounded-full bg-[#f7f5fa] px-3 py-1 text-xs text-[#575e6b]">{niche}</span>}
        {creatorType && <span className="rounded-full bg-[#f7f5fa] px-3 py-1 text-xs text-[#575e6b]">{creatorTypeLabel(creatorType)}</span>}
        {platform && <span className="rounded-full bg-[#f7f5fa] px-3 py-1 text-xs text-[#575e6b]">{PLATFORM_OPTIONS.find((option) => option.value === platform)?.label}</span>}
        {followers !== 'any' && <span className="rounded-full bg-[#f7f5fa] px-3 py-1 text-xs text-[#575e6b]">Followers: {followers.replace('-', '–').replace('k', 'K').replace('m', 'M')}</span>}
        {completion !== 'all' && <span className="rounded-full bg-[#f7f5fa] px-3 py-1 text-xs text-[#575e6b]">{completion}/4 complete</span>}
        {joined !== 'any' && <span className="rounded-full bg-[#f7f5fa] px-3 py-1 text-xs text-[#575e6b]">{joined === 'today' ? 'Today' : `Last ${joined.replace('-days', '')} days`}</span>}
        <button type="button" onClick={clearAll} className="ml-1 text-xs font-semibold text-[#6330dc] hover:text-[#4f24bc]">Clear all</button>
      </div>}
    </section>

    {(listError || countsError) ? <section className="mt-6 rounded-2xl border border-[#f0d7da] bg-[#fff8f8] px-5 py-6 text-center"><p className="text-sm font-medium text-[#8f3d47]">Unable to load creators right now.</p><button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="mt-3 text-sm font-semibold text-[#6330dc]">Try again</button></section> : loading ? <section className="mt-6"><CreatorSkeleton /></section> : <>
      <section className="mt-6 hidden overflow-hidden rounded-2xl border border-[#e8e7eb] bg-white shadow-[0_10px_30px_rgba(33,24,54,0.035)] lg:block">
        <div className="grid grid-cols-[minmax(230px,1.6fr)_minmax(100px,.65fr)_minmax(100px,.7fr)_minmax(130px,.85fr)_minmax(130px,.85fr)_80px_100px_110px_84px] gap-4 border-b border-[#ebe9ef] bg-[#fcfbfd] px-5 py-3 text-[0.67rem] font-bold uppercase tracking-[0.12em] text-[#7b8190]">
          <span>Creator</span><span>Location</span><span>Niche</span><span>Platforms</span><span>Audience</span><span>Profile</span><span>Status</span><span>Joined</span><span>Action</span>
        </div>
        {rows.map((creator) => <div key={creator.creator_id} className="grid grid-cols-[minmax(230px,1.6fr)_minmax(100px,.65fr)_minmax(100px,.7fr)_minmax(130px,.85fr)_minmax(130px,.85fr)_80px_100px_110px_84px] items-center gap-4 border-b border-[#f0eef3] px-5 py-4 last:border-b-0">
          <div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eee8ff] text-xs font-bold text-[#6330dc]">{initials(creator.display_name || creator.full_name)}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#25262b]">{creator.display_name || creator.full_name}</p><p className="truncate text-xs text-[#747b89]">{creatorTypeLabel(creator.creator_type)}{creator.username ? ` · @${creator.username}` : ''}</p></div></div>
          <p className="truncate text-sm text-[#555b67]">{creator.current_city || '—'}</p><p className="truncate text-sm text-[#555b67]">{displayNiche(creator)}</p>
          <div className="flex flex-wrap gap-1">{creator.platforms.map((item) => <span key={item.platform} className="rounded-md bg-[#f5f3f8] px-1.5 py-1 text-[0.65rem] font-bold text-[#5e6470]">{platformShortLabel(item.platform)}</span>)}</div>
          <p className="text-xs leading-5 text-[#555b67]">{creator.platforms.map((item) => `${platformShortLabel(item.platform)} ${formatAudience(item.audience_count)}`).join(' · ') || '—'}</p>
          <p className="text-sm font-medium text-[#3d414a]">{creator.completed_sections} / {creator.total_required_sections}</p><StatusBadge status={creator.status} /><p className="text-sm text-[#555b67]">{formatDate(creator.created_at)}</p><Link href={`/admin/creators/${creator.creator_id}`} className="text-left text-sm font-semibold text-[#6330dc]">Review →</Link>
        </div>)}
      </section>

      <section className="mt-6 space-y-3 lg:hidden">
        {rows.map((creator) => <article key={creator.creator_id} className="rounded-2xl border border-[#e8e7eb] bg-white p-4 shadow-[0_8px_20px_rgba(33,24,54,0.03)]"><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#eee8ff] text-xs font-bold text-[#6330dc]">{initials(creator.display_name || creator.full_name)}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#25262b]">{creator.display_name || creator.full_name}</p><p className="mt-0.5 truncate text-xs text-[#747b89]">{creatorTypeLabel(creator.creator_type)}{creator.username ? ` · @${creator.username}` : ''}</p></div><StatusBadge status={creator.status} /></div><div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs"><p><span className="block font-medium text-[#8a909b]">Location</span><span className="mt-1 block text-[#4f5561]">{creator.current_city || '—'}</span></p><p><span className="block font-medium text-[#8a909b]">Niche</span><span className="mt-1 block truncate text-[#4f5561]">{displayNiche(creator)}</span></p><p><span className="block font-medium text-[#8a909b]">Audience</span><span className="mt-1 block text-[#4f5561]">{creator.platforms.map((item) => `${platformShortLabel(item.platform)} ${formatAudience(item.audience_count)}`).join(' · ') || '—'}</span></p><p><span className="block font-medium text-[#8a909b]">Profile</span><span className="mt-1 block text-[#4f5561]">{creator.completed_sections} / {creator.total_required_sections}</span></p></div><div className="mt-4 flex items-center justify-between border-t border-[#f0eef3] pt-3"><div className="flex gap-1">{creator.platforms.map((item) => <span key={item.platform} className="rounded-md bg-[#f5f3f8] px-1.5 py-1 text-[0.65rem] font-bold text-[#5e6470]">{platformShortLabel(item.platform)}</span>)}</div><Link href={`/admin/creators/${creator.creator_id}`} className="text-sm font-semibold text-[#6330dc]">Review →</Link></div></article>)}
      </section>

      {!rows.length && <section className="mt-6 rounded-2xl border border-dashed border-[#dcd8e4] bg-white px-5 py-14 text-center"><p className="text-base font-semibold text-[#33353c]">{hasActiveFilters ? 'No creators match your current filters.' : 'No creators found.'}</p>{hasActiveFilters && <button type="button" onClick={clearAll} className="mt-3 text-sm font-semibold text-[#6330dc]">Clear filters</button>}</section>}

      {rows.length > 0 && <div className="mt-5 flex flex-col gap-3 border-t border-[#e8e7eb] pt-5 sm:flex-row sm:items-center sm:justify-between"><label className="text-sm text-[#626a7a]">Rows <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number]); setPage(1); }} className="ml-2 rounded-lg border border-[#dedbe5] bg-white px-2 py-1.5 text-sm font-medium text-[#343640]">{PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select></label><div className="flex items-center gap-3"><button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="min-h-10 rounded-lg border border-[#dedbe5] px-3 text-sm font-medium text-[#505662] disabled:cursor-not-allowed disabled:opacity-45">Previous</button><p className="text-sm text-[#626a7a]">Page {page} of {totalPages}</p><button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="min-h-10 rounded-lg border border-[#dedbe5] px-3 text-sm font-medium text-[#505662] disabled:cursor-not-allowed disabled:opacity-45">Next</button></div></div>}
    </>}

    {filtersOpen && <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Creator filters"><button type="button" aria-label="Close filters" onClick={() => setFiltersOpen(false)} className="absolute inset-0 bg-[#151518]/30" /><section className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-[0_-16px_40px_rgba(45,35,75,0.16)]"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-[#222329]">Filters</h2><button type="button" onClick={() => setFiltersOpen(false)} className="rounded-lg px-2 py-1 text-sm font-semibold text-[#6330dc]">Done</button></div><div className="mt-4"><FilterControls {...filterProps} /></div>{hasActiveFilters && <button type="button" onClick={clearAll} className="mt-5 text-sm font-semibold text-[#6330dc]">Clear all</button>}</section></div>}
  </section>;
}

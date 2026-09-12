'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminStatusBadge, type AdminStatus } from '@/components/admin-status-badge';
import { getSupabaseClient } from '@/lib/supabase/client';

type RecentCreator = { creatorId: string; displayName: string; city: string | null; primaryNiche: string | null; platforms: Array<{ platform: string }>; status: AdminStatus; createdAt: string; completedSections: number };
type DashboardData = { creators: { total: number; pending: number; active: number; rejected: number }; completion: { average: number; completed: number; incomplete: number }; platforms: { instagram: number; facebook: number; youtube: number }; recentCreators: RecentCreator[] };

const number = (value: unknown) => Number(value || 0).toLocaleString('en-US');
const date = (value: string) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseClient();
    if (!supabase) { void Promise.resolve().then(() => { if (active) setError(true); }); return; }
    void supabase.rpc('admin_dashboard').then(({ data: result, error: rpcError }) => {
      if (!active) return;
      if (rpcError || !result) setError(true);
      else { setData(result as DashboardData); setError(false); }
    });
    return () => { active = false; };
  }, [refreshKey]);

  if (error) return <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8"><h1 className="text-3xl font-semibold tracking-[-0.05em]">Admin Dashboard</h1><div className="mt-8 rounded-2xl border border-[#f0cfd2] bg-white p-7"><p className="font-semibold">We could not load the dashboard.</p><button type="button" onClick={() => { setError(false); setRefreshKey((value) => value + 1); }} className="mt-4 rounded-lg bg-[#151518] px-4 py-2 text-sm font-medium text-white">Retry</button></div></section>;

  const creatorCards = data ? [
    ['Total Creators', data.creators.total, 'All creator profiles'], ['Pending Review', data.creators.pending, 'Awaiting an admin decision'], ['Approved', data.creators.active, 'Active creators'], ['Rejected', data.creators.rejected, 'Rejected profiles'],
  ] : [];

  return <section className="mx-auto w-full max-w-6xl px-5 py-9 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7C3AED]">CloutCo administration</p>
    <div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-[2.15rem] font-semibold tracking-[-0.06em] text-[#151518] sm:text-[2.7rem]">Admin Dashboard</h1><p className="mt-3 text-sm leading-6 text-[#626a7a] sm:text-base">A live view of creator onboarding and review activity.</p></div><Link href="/admin/creators?status=pending" className="inline-flex min-h-11 items-center rounded-lg bg-[#151518] px-4 text-sm font-semibold text-white">Review Pending Creators →</Link></div>
    {!data ? <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1,2,3,4].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl border border-[#e8e7eb] bg-white" />)}</div> : <>
      <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{creatorCards.map(([label, value, description]) => <div key={String(label)} className="rounded-2xl border border-[#e8e7eb] bg-white p-5 shadow-[0_10px_30px_rgba(33,24,54,0.035)]"><p className="text-sm font-medium text-[#626a7a]">{label}</p><p className="mt-3 text-3xl font-semibold tracking-[-0.05em]">{number(value)}</p><p className="mt-2 text-xs text-[#838996]">{description}</p></div>)}</div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-[#e8e7eb] bg-white p-6"><h2 className="text-lg font-semibold tracking-[-0.04em]">Profile completion</h2><p className="mt-1 text-sm text-[#697080]">The canonical four creator profile sections.</p><p className="mt-6 text-4xl font-semibold tracking-[-0.06em]">{number(data.completion.average)}%</p><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><p className="rounded-xl bg-[#f7f5fb] p-3"><span className="block text-xs text-[#747b89]">Completed</span><strong className="mt-1 block">{number(data.completion.completed)}</strong></p><p className="rounded-xl bg-[#f7f5fb] p-3"><span className="block text-xs text-[#747b89]">Incomplete</span><strong className="mt-1 block">{number(data.completion.incomplete)}</strong></p></div></section>
      <section className="rounded-2xl border border-[#e8e7eb] bg-white p-6"><h2 className="text-lg font-semibold tracking-[-0.04em]">Connected platforms</h2><p className="mt-1 text-sm text-[#697080]">Creators with each connected platform.</p><div className="mt-6 grid grid-cols-3 gap-3 text-center text-sm">{Object.entries(data.platforms).map(([platform, count]) => <div key={platform} className="rounded-xl bg-[#f7f5fb] px-2 py-4"><strong className="block text-xl">{number(count)}</strong><span className="mt-1 block capitalize text-[#697080]">{platform}</span></div>)}</div></section></div>
      <section className="mt-6 rounded-2xl border border-[#e8e7eb] bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-semibold tracking-[-0.04em]">Recent creators</h2><p className="mt-1 text-sm text-[#697080]">Newest creator profiles in the network.</p></div><Link href="/admin/creators" className="text-sm font-semibold text-[#6330dc]">View all →</Link></div>{data.recentCreators.length ? <div className="mt-5 space-y-3">{data.recentCreators.map((creator) => <Link key={creator.creatorId} href={`/admin/creators/${creator.creatorId}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#efedf2] px-4 py-3 transition hover:border-[#cfc6e3] hover:bg-[#fdfcff]"><div><p className="font-semibold text-[#25262b]">{creator.displayName}</p><p className="mt-1 text-xs text-[#747b89]">{creator.city || 'No city'} · {creator.primaryNiche || 'No niche'} · {creator.platforms.map((platform) => platform.platform).join(', ') || 'No platforms'}</p></div><div className="flex items-center gap-4 text-xs text-[#747b89]"><span>{creator.completedSections}/4 complete</span><AdminStatusBadge status={creator.status}/><span>{date(creator.createdAt)}</span></div></Link>)}</div> : <p className="mt-6 rounded-xl bg-[#faf9fc] p-5 text-sm text-[#697080]">No creators have joined yet.</p>}</section>
    </>}
  </section>;
}

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminCreatorPhoto } from '@/components/admin-creator-photo';
import { AdminStatusBadge, type AdminStatus } from '@/components/admin-status-badge';
import { getSupabaseClient } from '@/lib/supabase/client';

type Analytics = Record<string, string | number | string[] | null>;
type Platform = { id: string; platform: string; profileUrl: string | null; username: string | null; audienceCount: number | null; isPrimary: boolean; instagramAnalytics: Analytics | null; facebookAnalytics: Analytics | null; youtubeAnalytics: Analytics | null };
type Detail = { creatorId: string; publicIdentifier: string | null; status: AdminStatus; createdAt: string; basic: Record<string, string | null>; identity: { displayName: string | null; bio: string | null; languages: string[]; creatorType: string | null; creatorTypeOther: string | null }; content: { primaryNiche: string | null; primaryNicheOther: string | null; otherNiches: string[]; formats: string[]; styles: string[] }; platforms: Platform[]; completion: { completedSections: number; totalRequiredSections: number }; statusHistory: Array<{ id: string; previousStatus: AdminStatus; newStatus: AdminStatus; reason: string | null; createdAt: string }> };

const formatNumber = (value: unknown) => value === null || value === undefined ? '—' : new Intl.NumberFormat('en-US').format(Number(value));
const pretty = (value: string) => value.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
const date = (value: string) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));

function Field({ label, value }: { label: string; value: unknown }) { const display = Array.isArray(value) ? value.join(', ') : value || '—'; return <div><dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[#858b97]">{label}</dt><dd className="mt-1 text-sm leading-6 text-[#353842]">{String(display)}</dd></div>; }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-[#e8e7eb] bg-white p-5 shadow-[0_8px_22px_rgba(33,24,54,0.03)] sm:p-6"><h2 className="text-lg font-semibold tracking-[-0.04em] text-[#1e1f24]">{title}</h2><div className="mt-5">{children}</div></section>; }

function AnalyticsBlock({ title, values }: { title: string; values: Analytics | null }) {
  if (!values) return null;
  const entries = Object.entries(values).filter(([key]) => !['topAgeRanges', 'topCities', 'topAgeGroup'].includes(key));
  return <div className="mt-4 rounded-xl border border-[#eeeaf3] bg-[#fdfcff] p-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7458ca]">{title}</p><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{entries.map(([key, value]) => <Field key={key} label={pretty(key)} value={typeof value === 'number' ? formatNumber(value) : value} />)}</div>{Array.isArray(values.topAgeRanges) && <Field label="Top Age Ranges" value={values.topAgeRanges}/>} {values.topAgeGroup && <Field label="Top Age Group" value={values.topAgeGroup}/>} {Array.isArray(values.topCities) && <div className="mt-3"><Field label="Top Cities / Towns" value={values.topCities}/></div>}</div>;
}

export default function AdminCreatorDetailPage() {
  const params = useParams<{ creatorId: string }>();
  const creatorId = params.creatorId;
  const [detail, setDetail] = useState<Detail | null>(null);
  const [sectionStates, setSectionStates] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [requestedStatus, setRequestedStatus] = useState<AdminStatus | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    const supabase = getSupabaseClient();
    if (!supabase) { setError('Supabase is not configured.'); return; }
    setError('');
    void Promise.all([
      supabase.rpc('admin_creator_detail', { p_creator_id: creatorId }),
      supabase.rpc('admin_creator_section_completion', { p_creator_id: creatorId }),
    ]).then(([detailResult, sectionsResult]) => {
      if (detailResult.error || !detailResult.data || sectionsResult.error || !Array.isArray(sectionsResult.data)) setError('We could not load this creator profile.');
      else {
        setDetail(detailResult.data as Detail);
        setSectionStates(Object.fromEntries((sectionsResult.data as Array<{ section_key: string; completed: boolean }>).map((section) => [section.section_key, section.completed])));
      }
    });
  };
  useEffect(() => { void Promise.resolve().then(load); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creatorId]);

  const submitStatus = async () => {
    if (!requestedStatus) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setSaving(true); setError('');
    const { error: rpcError } = await supabase.rpc('admin_update_creator_status', { p_creator_id: creatorId, p_new_status: requestedStatus, p_reason: reason || null });
    setSaving(false);
    if (rpcError) { setError('We could not update the creator status.'); return; }
    setRequestedStatus(null); setReason(''); load();
  };

  if (error && !detail) return <section className="mx-auto max-w-5xl px-5 py-10"><p className="text-sm text-[#9a3f4a]">{error}</p><button type="button" onClick={load} className="mt-4 rounded-lg bg-[#151518] px-4 py-2 text-sm text-white">Retry</button></section>;
  if (!detail) return <section className="mx-auto max-w-5xl px-5 py-10"><div className="h-60 animate-pulse rounded-2xl border border-[#e8e7eb] bg-white" /></section>;
  const title = detail.identity.displayName || detail.basic.fullName || 'Creator';
  const action = detail.status === 'active' ? 'rejected' : 'active';

  return <section className="mx-auto w-full max-w-6xl px-5 py-9 sm:px-8 sm:py-12 lg:px-10"><Link href="/admin/creators" className="text-sm font-semibold text-[#6330dc]">← Back to Creators</Link>
    <header className="mt-5 rounded-2xl border border-[#e8e7eb] bg-white p-5 shadow-[0_10px_30px_rgba(33,24,54,0.035)] sm:flex sm:items-start sm:justify-between sm:p-7"><div className="flex gap-4"><AdminCreatorPhoto creatorId={detail.creatorId} name={title} className="h-20 w-20 rounded-2xl"/><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-semibold tracking-[-0.06em]">{title}</h1><AdminStatusBadge status={detail.status}/></div><p className="mt-2 text-sm text-[#646b78]">{detail.basic.fullName} · {detail.basic.city || 'No city'} · {detail.identity.creatorType || 'Creator'}</p><p className="mt-2 text-sm text-[#646b78]">Joined {date(detail.createdAt)} · {detail.completion.completedSections}/{detail.completion.totalRequiredSections} sections complete</p></div></div><div className="mt-5 flex flex-wrap gap-2 sm:mt-0">{detail.publicIdentifier && <Link href={`/creator/${detail.publicIdentifier}`} target="_blank" className="inline-flex min-h-10 items-center rounded-lg border border-[#dedbe5] px-3 text-sm font-semibold">View Public Profile</Link>}<button type="button" onClick={() => setRequestedStatus(action)} className="min-h-10 rounded-lg bg-[#151518] px-3 text-sm font-semibold text-white">{action === 'active' ? 'Approve' : 'Reject'}</button></div></header>
    {detail.status === 'pending' && <div className="mt-5 rounded-xl border border-[#e8d8a8] bg-[#fffaf0] px-5 py-4 text-sm text-[#705820]"><strong>Profile pending review.</strong> Review the information below, then approve or reject this creator.</div>}
    {error && <p className="mt-4 rounded-xl bg-[#fff5f5] px-4 py-3 text-sm text-[#9a3f4a]">{error}</p>}
    <div className="mt-6 grid gap-6 lg:grid-cols-2"><Section title="Basic Information"><dl className="grid gap-4 sm:grid-cols-2">{Object.entries(detail.basic).map(([key, value]) => <Field key={key} label={pretty(key)} value={value}/>)}</dl></Section><Section title="Creator Identity"><dl className="grid gap-4 sm:grid-cols-2"><Field label="Display Name" value={detail.identity.displayName}/><Field label="Creator Type" value={detail.identity.creatorTypeOther || detail.identity.creatorType}/><Field label="Languages" value={detail.identity.languages}/><Field label="Bio" value={detail.identity.bio}/></dl></Section>
    <Section title="Content & Niche"><dl className="grid gap-4 sm:grid-cols-2"><Field label="Primary Niche" value={detail.content.primaryNicheOther || detail.content.primaryNiche}/><Field label="Other Niches" value={detail.content.otherNiches}/><Field label="Formats" value={detail.content.formats}/><Field label="Content Styles" value={detail.content.styles}/></dl></Section><Section title="Profile Completion"><div className="grid gap-3 sm:grid-cols-2">{[['Basic Information','basic-information'],['Creator Identity','creator-identity'],['Content & Niche','content-and-niche'],['Social Platforms','social-platforms']].map(([label, key]) => <div key={key} className="rounded-xl bg-[#f8f6fb] p-3 text-sm"><span className="font-medium">{label}</span><span className="mt-1 block text-xs text-[#707784]">{sectionStates[key] ? 'Complete' : 'Incomplete'}</span></div>)}</div><p className="mt-4 text-sm text-[#626a7a]">{detail.completion.completedSections * 25}% overall completion. Portfolio is not part of this model.</p></Section></div>
    <Section title="Social Platforms"><div className="space-y-4">{detail.platforms.length ? detail.platforms.map((platform) => <div key={platform.id} className="rounded-xl border border-[#ece9f1] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold capitalize">{platform.platform} {platform.isPrimary && <span className="ml-2 rounded-full bg-[#f0eaff] px-2 py-1 text-xs text-[#6330dc]">Primary</span>}</p><p className="mt-1 break-all text-sm text-[#626a7a]">{platform.profileUrl || 'No profile URL'}{platform.username ? ` · @${platform.username}` : ''}</p></div><p className="text-sm font-semibold">{formatNumber(platform.audienceCount)} followers</p></div><AnalyticsBlock title="Instagram Analytics" values={platform.instagramAnalytics}/><AnalyticsBlock title="Facebook Analytics" values={platform.facebookAnalytics}/><AnalyticsBlock title="YouTube Analytics" values={platform.youtubeAnalytics}/></div>) : <p className="text-sm text-[#697080]">No connected platforms.</p>}</div></Section>
    <Section title="Status History">{detail.statusHistory.length ? <div className="space-y-3">{detail.statusHistory.map((entry) => <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0eef3] pb-3 text-sm last:border-0"><p><span className="capitalize">{entry.previousStatus}</span> → <span className="capitalize">{entry.newStatus}</span>{entry.reason ? ` · ${entry.reason}` : ''}</p><span className="text-[#747b89]">{date(entry.createdAt)}</span></div>)}</div> : <p className="text-sm text-[#697080]">No status changes have been recorded.</p>}</Section>
    {requestedStatus && <div className="fixed inset-0 z-50 grid place-items-center bg-[#151518]/35 p-5" role="dialog" aria-modal="true" aria-label="Confirm status change"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-semibold">Confirm status change</h2><p className="mt-2 text-sm text-[#626a7a]">Change this creator to <strong className="capitalize">{requestedStatus === 'active' ? 'Approved' : requestedStatus}</strong>?</p><label className="mt-5 block text-sm font-medium">Reason <span className="font-normal text-[#747b89]">(optional)</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-[#dedbe5] p-3 text-sm outline-none focus:border-[#9c7df0]" /></label><div className="mt-5 flex justify-end gap-3"><button type="button" disabled={saving} onClick={() => setRequestedStatus(null)} className="min-h-10 px-3 text-sm font-semibold">Cancel</button><button type="button" disabled={saving} onClick={() => void submitStatus()} className="min-h-10 rounded-lg bg-[#151518] px-4 text-sm font-semibold text-white">{saving ? 'Saving…' : 'Confirm change'}</button></div></div></div>}
  </section>;
}

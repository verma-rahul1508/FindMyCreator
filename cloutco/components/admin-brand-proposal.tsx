'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { formatCurrency, normalizeAdminBrandProposal, type AdminBrandProposal } from '@/lib/brand-proposal-types';

export function AdminBrandProposal({ brandId }: { brandId: string }) {
  const [proposal, setProposal] = useState<AdminBrandProposal | null>(null);
  const [error, setError] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState('');
  const shareUrl = useMemo(() => proposal && typeof window !== 'undefined' ? `${window.location.origin}/proposal/${proposal.proposalToken}` : '', [proposal]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) { if (active) setError('Admin connection is unavailable.'); return; }
      const { data, error: rpcError } = await supabase.rpc('admin_brand_proposal_detail', { p_brand_id: brandId });
      const detail = rpcError ? null : normalizeAdminBrandProposal(data);
      if (!active) return;
      if (!detail) setError('We could not prepare this proposal.');
      else setProposal(detail);
    };
    void load();
    return () => { active = false; };
  }, [brandId]);

  const copyLink = async () => {
    if (!shareUrl) return;
    try { await navigator.clipboard.writeText(shareUrl); setCopyState('copied'); } catch { setError('We could not copy the proposal link.'); }
  };

  const sendProposal = async () => {
    if (!proposal || sending) return;
    setSending(true); setSendMessage(''); setError('');
    try {
      const supabase = getSupabaseClient();
      const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Your administrator session has expired. Please sign in again.');
      const response = await fetch(`/api/admin/brands/${encodeURIComponent(brandId)}/proposal/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const body = await response.json().catch(() => null) as { error?: unknown; ok?: unknown } | null;
      if (!response.ok || body?.ok !== true) throw new Error(typeof body?.error === 'string' ? body.error : 'We could not send this proposal.');
      setSendMessage(`Proposal sent to ${proposal.recipientEmail}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'We could not send this proposal.'); }
    finally { setSending(false); }
  };

  if (!proposal && !error) return <section className="mx-auto max-w-5xl px-5 py-10"><div className="h-80 animate-pulse rounded-2xl border border-[#e8e7eb] bg-white" /></section>;
  if (!proposal) return <section className="mx-auto max-w-5xl px-5 py-10"><p role="alert" className="rounded-xl border border-[#f1d4d7] bg-[#fff8f8] px-4 py-3 text-sm text-[#99404b]">{error}</p></section>;

  return <section className="mx-auto w-full max-w-5xl px-5 py-9 sm:px-8 sm:py-12"><header className="border-b border-[#e8e7eb] pb-7"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7c3aed]">Client proposal</p><h1 className="mt-3 text-[2.15rem] font-semibold tracking-[-0.06em] text-[#151518] sm:text-[2.7rem]">{proposal.brandName || 'Brand'} proposal</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#626a7a]">Premium Service · {proposal.creators.length} mapped creator{proposal.creators.length === 1 ? '' : 's'} · {formatCurrency(proposal.totalInvestment)} current roster investment</p></header>
    {error && <p role="alert" className="mt-5 rounded-xl border border-[#f1d4d7] bg-[#fff8f8] px-4 py-3 text-sm text-[#99404b]">{error}</p>}{sendMessage && <p className="mt-5 rounded-xl border border-[#cae8d7] bg-[#f4fbf7] px-4 py-3 text-sm text-[#28734b]">{sendMessage}</p>}
    <section className="mt-7 rounded-2xl border border-[#e8e2da] bg-[#fffaf4] p-5 sm:p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-semibold tracking-[-0.04em] text-[#25262b]">Share-ready proposal</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#626a7a]">The client view contains the selected creator roster, live saved insights, Reel directions, campaign investment and WhatsApp Sales contact.</p></div><a href={shareUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#151518] px-5 text-sm font-semibold text-white">Open proposal</a></div><div className="mt-6 flex flex-col gap-3 border-t border-[#e8dfd6] pt-5 sm:flex-row"><button type="button" onClick={() => void copyLink()} className="min-h-11 rounded-lg border border-[#dcd8e4] px-5 text-sm font-semibold text-[#4d5260]">{copyState === 'copied' ? 'Link copied' : 'Copy proposal link'}</button><button type="button" onClick={() => void sendProposal()} disabled={sending || !proposal.recipientEmail} className="min-h-11 rounded-lg bg-[#6330dc] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55">{sending ? 'Sending…' : `Email proposal${proposal.recipientEmail ? '' : ' unavailable'}`}</button></div>{proposal.recipientEmail ? <p className="mt-3 text-xs text-[#717887]">The complete proposal will be sent to {proposal.recipientEmail}.</p> : <p className="mt-3 text-xs text-[#99404b]">Add a valid brand email before sending the proposal.</p>}</section>
    <Link href={`/admin/brands/${brandId}`} className="mt-7 inline-flex text-sm font-semibold text-[#6330dc]">← Back to Brand Details</Link>
  </section>;
}

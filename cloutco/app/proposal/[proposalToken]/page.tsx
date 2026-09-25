'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BrandProposalDocument } from '@/components/brand-proposal';
import { normalizeBrandProposal, type BrandProposal } from '@/lib/brand-proposal-types';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function BrandProposalPage() {
  const { proposalToken } = useParams<{ proposalToken: string }>();
  const [proposal, setProposal] = useState<BrandProposal | null>(null);
  const [state, setState] = useState<'loading' | 'missing'>('loading');

  useEffect(() => {
    let active = true;
    const load = async () => {
      const supabase = getSupabaseClient({ detectSessionInUrl: false });
      if (!supabase || !proposalToken) { if (active) setState('missing'); return; }
      const { data, error } = await supabase.rpc('get_brand_proposal', { p_proposal_token: proposalToken });
      const next = error ? null : normalizeBrandProposal(data);
      if (!active) return;
      if (!next) setState('missing');
      else { setProposal(next); setState('loading'); }
    };
    void load();
    return () => { active = false; };
  }, [proposalToken]);

  if (proposal) return <BrandProposalDocument proposal={proposal} />;
  if (state === 'missing') return <main className="grid min-h-screen place-items-center bg-[#f8f2e9] px-5"><section className="max-w-md border border-[#e6ddd2] bg-[#fffdf9] p-7 text-center"><img src="/brand/cloutco-logo.svg" alt="CloutCo" className="mx-auto w-28" /><h1 className="mt-7 text-2xl font-semibold tracking-[-0.05em]">This proposal is unavailable</h1><p className="mt-3 text-sm leading-6 text-[#69636c]">Please contact CloutCo if you need a new proposal link.</p><a href="mailto:connect@cloutco.in" className="mt-6 inline-flex text-sm font-semibold text-[#6330dc] underline underline-offset-4">connect@cloutco.in</a></section></main>;
  return <main className="min-h-screen bg-[#f8f2e9] px-5 py-10"><div className="mx-auto h-96 max-w-5xl animate-pulse border border-[#e6ddd2] bg-[#fffdf9]" /></main>;
}

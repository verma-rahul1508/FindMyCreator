'use client';

import { useEffect, useState } from 'react';
import { resolveBrandProposalContent } from '@/lib/brand-proposal-content';
import type { BrandProposal, BrandProposalAdditionalService, BrandProposalCreator } from '@/lib/brand-proposal-types';
import { formatCompactNumber, formatCurrency, initials } from '@/lib/brand-proposal-types';
import { getSupabaseClient } from '@/lib/supabase/client';
import { ProposalCommercials, ProposalDeliveryPlan, ProposalNextSteps } from '@/components/brand-proposal-operations';
import { ProposalCover, ProposalStrategy } from '@/components/brand-proposal-story';

const OPTIONAL_SERVICES: BrandProposalAdditionalService[] = [
  { id: 'performance-marketing', serviceType: 'performance_marketing', title: 'Performance Marketing', description: 'Extend selected creator stories through an agreed media plan and measurement approach.', budget: null },
  { id: 'street-marketing', serviceType: 'street_marketing', title: 'Street Marketing', description: 'Explore physical activations in priority markets where they support the campaign idea.', budget: null },
];

function CreatorPhoto({ creator }: { creator: BrandProposalCreator }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!creator.publicIdentifier) return;
    let active = true;
    void fetch(`/api/creator/${encodeURIComponent(creator.publicIdentifier)}/photo`, { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() as Promise<{ url?: unknown }> : null)
      .then((data) => { if (active && typeof data?.url === 'string') setUrl(data.url); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [creator.publicIdentifier]);
  return <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#eee5ff] text-sm font-bold text-[#6330dc]">{url ? <img src={url} alt={`${creator.name} profile`} className="h-full w-full object-cover" /> : initials(creator.name)}</div>;
}

function CreatorFitDetails({ creator }: { creator: BrandProposalCreator }) {
  const [profileCity, setProfileCity] = useState<string | null>(null);
  const [audienceCity, setAudienceCity] = useState<string | null>(null);
  useEffect(() => {
    if (!creator.publicIdentifier) return;
    let active = true;
    const load = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data, error } = await supabase.rpc('get_public_creator_profile', { p_public_profile_id: creator.publicIdentifier });
      if (!active || error || !data || typeof data !== 'object') return;
      const profile = data as { city?: unknown; socialAccounts?: Array<{ platform?: unknown; insights?: { topCity?: unknown } }> };
      const account = profile.socialAccounts?.find((item) => item.platform === creator.platform);
      setProfileCity(typeof profile.city === 'string' && profile.city.trim() ? profile.city.trim() : null);
      setAudienceCity(typeof account?.insights?.topCity === 'string' && account.insights.topCity.trim() ? account.insights.topCity.trim() : null);
    };
    void load();
    return () => { active = false; };
  }, [creator.platform, creator.publicIdentifier]);
  return <p className="mt-2 text-xs leading-5 text-[#77717a]">Profile city: {profileCity || 'to verify'}{creator.niche ? ` · Niche: ${creator.niche}` : ''}{audienceCity ? ` · Reported top audience city: ${audienceCity}` : ''}</p>;
}

function profileLabel(platform: BrandProposalCreator['platform']) {
  return platform === 'instagram' ? 'Instagram profile' : platform === 'facebook' ? 'Facebook profile' : platform === 'youtube' ? 'YouTube profile' : 'Creator profile';
}

export function BrandProposalDocument({ proposal }: { proposal: BrandProposal }) {
  const brandName = proposal.brandName || 'Your Brand';
  const content = resolveBrandProposalContent(brandName, proposal.proposalToken, proposal.proposalContent);
  const plannedDeliverables = proposal.creators.reduce((total, creator) => total + Math.max(0, Number(creator.quantity) || 0), 0);
  const additionalServices = proposal.additionalServices.length ? proposal.additionalServices : OPTIONAL_SERVICES;
  const whatsappMessage = encodeURIComponent(`Hello CloutCo, I would like to review the ${brandName} creator programme and itemised estimate.`);
  const services = [
    ['Creator selection', `Identify creators for ${brandName}’s priority audiences, check fit and present a shortlist for approval.`],
    ['Campaign coordination', 'Agree deliverables and timelines, manage creator communication and coordinate products or visits.'],
    ['Brand alignment', `Turn ${brandName}’s goals and approved messaging into clear creator briefs and content directions.`],
    ['Instagram feed direction', 'Plan a cohesive sequence of creator stories with covers, caption themes and useful calls to action.'],
    ['Delivery oversight', 'Track drafts, feedback, approvals and publishing so agreed assets are delivered on time.'],
    ['Reporting', 'Share content and performance results, audience response and recommendations for the next wave.'],
  ];

  return <main className="min-h-screen bg-[#f8f2e9] px-4 py-7 text-[#161318] sm:px-8 sm:py-10 lg:px-12">
    <article className="mx-auto w-full max-w-5xl border border-[#e6ddd2] bg-[#fffdf9] px-5 py-7 shadow-[0_18px_55px_rgba(66,45,29,0.07)] sm:px-9 sm:py-10 lg:px-12">
      <ProposalCover brandName={brandName} content={content} />
      <header className="flex items-start justify-between gap-6 border-b border-[#e8dfd6] pb-8"><div><img src="/brand/cloutco-logo.svg" alt="CloutCo" className="h-auto w-32" /><p className="mt-2 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[#77717a]">People × Content × Growth</p></div><div className="text-right"><p className="text-[0.68rem] font-bold uppercase tracking-[0.17em] text-[#6330dc]">{proposal.planLevel}</p><span className="mt-3 block h-px w-10 bg-[#6330dc]" /></div></header>

      <section className="py-10 sm:py-14"><p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[#6a6670]">Campaign proposal for</p><h2 className="mt-3 text-4xl font-semibold tracking-[-0.065em] text-[#171318] sm:text-6xl">{brandName}</h2><p className="mt-5 text-xl tracking-[-0.04em] text-[#4a4650] sm:text-2xl">Creator collaboration, planned with care.</p><div className="mt-7 max-w-4xl border-l-4 border-[#6330dc] bg-[#f3ecff] px-5 py-6 sm:px-8 sm:py-7"><p className="text-xl font-medium leading-8 tracking-[-0.025em] text-[#302244] sm:text-2xl sm:leading-9"><strong className="font-bold text-[#5422c3]">Creator collaboration</strong> is the heart of this proposal. {content.openingStatement}</p></div></section>

      <ProposalStrategy brandName={brandName} content={content} />

      <section className="border-y border-[#e8dfd6] py-10 sm:py-12"><p className="text-[0.68rem] font-bold uppercase tracking-[0.17em] text-[#6330dc]">We are offering</p><h2 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.055em] sm:text-4xl">Creator Collaboration + End-to-End Creator Management</h2><p className="mt-4 max-w-3xl text-base leading-7 text-[#625d66]">CloutCo will run the creator programme from the first shortlist through the final report.</p><div className="mt-7 grid gap-3 sm:grid-cols-2">{services.map(([title, description]) => <div key={title} className="border border-[#e4dcd4] bg-white p-5 sm:p-6"><h3 className="text-xl font-semibold tracking-[-0.04em] text-[#22192d]">{title}</h3><p className="mt-3 text-sm leading-6 text-[#625d66]">{description}</p></div>)}</div></section>

      <section className="py-8"><div className="flex flex-col gap-3 border-b border-[#e8dfd6] pb-5 sm:flex-row sm:items-end sm:justify-between"><h2 className="text-3xl font-semibold tracking-[-0.055em]">Proposed creator shortlist</h2><p className="max-w-sm text-sm leading-6 text-[#69636c]">Candidate creators and content directions for {brandName}’s review; final selection follows an audience, availability and fee check.</p></div>
        <div className="divide-y divide-[#ebe3da]">{proposal.creators.map((creator, index) => <article key={`${creator.id}-${index}`} className="grid gap-4 py-5 sm:grid-cols-[minmax(190px,1.35fr)_120px_145px_minmax(200px,1.25fr)] sm:items-center sm:gap-5"><div className="flex min-w-0 items-center gap-3"><CreatorPhoto creator={creator} /><div className="min-w-0"><h3 className="truncate text-base font-semibold">{creator.name}</h3>{creator.profileUrl ? <a href={creator.profileUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-medium text-[#6330dc] underline decoration-[#cdbdff] underline-offset-4">View {profileLabel(creator.platform)}</a> : <p className="mt-1 text-sm text-[#77717a]">{creator.platform || 'Creator'}</p>}</div></div><dl><dt className="text-[0.64rem] font-bold uppercase tracking-[0.14em] text-[#827a84]">Followers</dt><dd className="mt-1 text-base font-semibold">{formatCompactNumber(creator.followers)}</dd></dl><dl><dt className="text-[0.64rem] font-bold uppercase tracking-[0.14em] text-[#827a84]">Reported views</dt><dd className="mt-1 text-base font-semibold">{formatCompactNumber(creator.views)}</dd></dl><div><p className="text-sm font-semibold">{creator.quantity} {creator.deliverable}</p><p className="mt-1 text-sm leading-5 text-[#69636c]">{creator.creativeConcept || `Creative direction to be agreed with ${brandName}.`}</p><CreatorFitDetails creator={creator} /></div></article>)}</div>
        <div className="border-t border-[#ebe3da] py-5 text-sm leading-6 text-[#625d66]"><p className="font-semibold text-[#302244]">Verification before {brandName} approves the roster</p><p className="mt-1">CloutCo will confirm each creator’s audience location, demographics, recent engagement, availability, fee and brand fit. Profile figures are shown for shortlisting; their capture dates and source screenshots must be checked before booking. The shortlist is not a confirmed commitment from any creator.</p></div>
        {!proposal.creators.length && <p className="py-10 text-center text-sm text-[#69636c]">The creator roster will be shared by the CloutCo team.</p>}
      </section>

      <ProposalDeliveryPlan brandName={brandName} plannedDeliverables={plannedDeliverables} />
      <ProposalCommercials proposal={proposal} content={content} plannedDeliverables={plannedDeliverables} />

      <section className="py-9"><p className="text-[0.68rem] font-bold uppercase tracking-[0.17em] text-[#6330dc]">Optional extensions</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.055em]">Possible next phase</h2><p className="mt-3 max-w-2xl text-base leading-7 text-[#625d66]">Additional services are separate options. They will be scoped and priced only if {brandName} chooses to add them to the creator programme.</p><div className="mt-6 grid gap-4 md:grid-cols-2">{additionalServices.map((service) => <article key={service.id} className="border border-[#e4dcd4] bg-white p-5"><div className="flex items-start justify-between gap-4"><h3 className="text-xl font-semibold tracking-[-0.04em]">{service.title}</h3><span className="shrink-0 rounded-full bg-[#f1ebff] px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[#6330dc]">{service.budget === null ? 'Available on request' : 'Proposed'}</span></div><p className="mt-3 text-sm leading-6 text-[#625d66]">{service.description || 'CloutCo will tailor this service to the campaign objectives.'}</p><p className="mt-5 border-t border-[#ede7e1] pt-4 text-sm font-semibold">{service.budget === null ? 'Price and deliverables to be agreed separately' : `Indicative budget: ${formatCurrency(service.budget)}`}</p></article>)}</div></section>

      <ProposalNextSteps brandName={brandName} />
      <footer className="flex flex-col gap-6 border-t border-[#e8dfd6] pt-8 sm:flex-row sm:items-end sm:justify-between"><div><img src="/brand/cloutco-logo.svg" alt="CloutCo" className="h-auto w-28" /><p className="mt-3 text-sm text-[#69636c]">Ganga Serio, Kharadi, Pune<br /><a href="mailto:connect@cloutco.in" className="underline underline-offset-4">connect@cloutco.in</a> · +91 84840 82402</p></div><a href={`https://wa.me/918484082402?text=${whatsappMessage}`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#6330dc] px-5 text-sm font-semibold text-white transition hover:bg-[#5124bd]">Discuss scope and estimate</a></footer>
    </article>
  </main>;
}

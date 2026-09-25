'use client';

import { useEffect, useState } from 'react';
import type { BrandProposal, BrandProposalAdditionalService, BrandProposalCreator } from '@/lib/brand-proposal-types';
import { formatCompactNumber, formatCurrency, initials } from '@/lib/brand-proposal-types';

function ProposalCreatorPhoto({ creator }: { creator: BrandProposalCreator }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!creator.publicIdentifier) return;
    let active = true;
    void fetch(`/api/creator/${encodeURIComponent(creator.publicIdentifier)}/photo`, { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() as Promise<{ url?: unknown }> : null)
      .then((data) => {
        if (active && typeof data?.url === 'string') setUrl(data.url);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [creator.publicIdentifier]);

  return <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#eee5ff] text-sm font-bold text-[#6330dc]">
    {url ? <img src={url} alt={`${creator.name} profile`} className="h-full w-full object-cover" /> : initials(creator.name)}
  </div>;
}

function profileLabel(platform: BrandProposalCreator['platform']) {
  return platform === 'instagram' ? 'Instagram profile' : platform === 'facebook' ? 'Facebook profile' : platform === 'youtube' ? 'YouTube profile' : 'Creator profile';
}

const AVAILABLE_ON_REQUEST_SERVICES: BrandProposalAdditionalService[] = [
  {
    id: 'performance-marketing',
    serviceType: 'performance_marketing',
    title: 'Performance Marketing',
    description: 'Turn creator attention into measurable growth through audience strategy, media execution and ongoing optimisation.',
    budget: null,
  },
  {
    id: 'street-marketing',
    serviceType: 'street_marketing',
    title: 'Street Marketing',
    description: 'Bring your brand into everyday life with boards, physical street media, mall activations and society placements across key markets.',
    budget: null,
  },
];

export function BrandProposalDocument({ proposal }: { proposal: BrandProposal }) {
  const whatsappMessage = encodeURIComponent(`Hello CloutCo, I would like to discuss the ${proposal.brandName || 'creator collaboration'} proposal.`);
  const additionalServices = proposal.additionalServices.length ? proposal.additionalServices : AVAILABLE_ON_REQUEST_SERVICES;

  return <main className="min-h-screen bg-[#f8f2e9] px-4 py-7 text-[#161318] sm:px-8 sm:py-10 lg:px-12">
    <article className="mx-auto w-full max-w-5xl border border-[#e6ddd2] bg-[#fffdf9] px-5 py-7 shadow-[0_18px_55px_rgba(66,45,29,0.07)] sm:px-9 sm:py-10 lg:px-12">
      <header className="flex items-start justify-between gap-6 border-b border-[#e8dfd6] pb-8">
        <div><img src="/brand/cloutco-logo.svg" alt="CloutCo" className="h-auto w-32" /><p className="mt-2 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[#77717a]">People × Content × Growth</p></div>
        <div className="text-right"><p className="text-[0.68rem] font-bold uppercase tracking-[0.17em] text-[#6330dc]">{proposal.planLevel}</p><span className="mt-3 block h-px w-10 bg-[#6330dc]" /></div>
      </header>

      <section className="max-w-3xl py-10 sm:py-14"><p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[#6a6670]">Campaign proposal for</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.065em] text-[#171318] sm:text-6xl">{proposal.brandName || 'Your Brand'}</h1><p className="mt-5 text-xl tracking-[-0.04em] text-[#4a4650] sm:text-2xl">Creator collaboration, planned with care.</p><p className="mt-5 max-w-2xl text-sm leading-7 text-[#615b66] sm:text-base">CloutCo manages creator collaborations and brand-marketing needs end to end. This PAN-India proposal brings together a selected creator roster, original content ideas, and a clear path to expand reach beyond social.</p></section>

      <section className="border-y border-[#e8dfd6] py-7"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[0.68rem] font-bold uppercase tracking-[0.17em] text-[#6330dc]">We are offering</p><h2 className="mt-2 max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.055em] sm:text-4xl">Creator Collaboration + Creator Management</h2></div><p className="max-w-md text-base leading-7 text-[#69636c] sm:text-lg">Creator selection, campaign coordination, brand alignment, delivery oversight and reporting—managed by CloutCo.</p></div></section>

      <section className="py-8"><div className="flex flex-col gap-3 border-b border-[#e8dfd6] pb-5 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-3xl font-semibold tracking-[-0.055em]">Shortlisted Creators Profile</h2></div><p className="max-w-sm text-sm leading-6 text-[#69636c]">Each creator receives a distinct original Reel direction, refined with your final brief.</p></div>
        <div className="divide-y divide-[#ebe3da]">{proposal.creators.map((creator) => <article key={creator.id} className="grid gap-4 py-5 sm:grid-cols-[minmax(190px,1.35fr)_120px_145px_minmax(200px,1.25fr)] sm:items-center sm:gap-5"><div className="flex min-w-0 items-center gap-3"><ProposalCreatorPhoto creator={creator} /><div className="min-w-0"><h3 className="truncate text-base font-semibold">{creator.name}</h3>{creator.profileUrl ? <a href={creator.profileUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-medium text-[#6330dc] underline decoration-[#cdbdff] underline-offset-4">View {profileLabel(creator.platform)}</a> : <p className="mt-1 text-sm text-[#77717a]">{creator.platform || 'Creator'}</p>}</div></div><dl><dt className="text-[0.64rem] font-bold uppercase tracking-[0.14em] text-[#827a84]">Followers</dt><dd className="mt-1 text-base font-semibold">{formatCompactNumber(creator.followers)}</dd></dl><dl><dt className="text-[0.64rem] font-bold uppercase tracking-[0.14em] text-[#827a84]">Last 30 days views</dt><dd className="mt-1 text-base font-semibold">{formatCompactNumber(creator.views)}</dd></dl><div><p className="text-sm font-semibold">{creator.quantity} {creator.deliverable}</p>{creator.creativeConcept && <p className="mt-1 text-sm leading-5 text-[#69636c]">{creator.creativeConcept}</p>}</div></article>)}</div>
        {!proposal.creators.length && <p className="py-10 text-center text-sm text-[#69636c]">The creator roster will be shared by the CloutCo team.</p>}
      </section>

      <section className="grid gap-6 border-y border-[#e8dfd6] bg-[#f3ecff] px-5 py-6 sm:grid-cols-[1.35fr_0.8fr] sm:px-7 sm:py-8"><div><p className="text-[0.68rem] font-bold uppercase tracking-[0.17em] text-[#6330dc]">Campaign investment</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.05em]">Starting from {formatCurrency(proposal.startingInvestment)}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#625c69]">Final pricing may vary based on the selected creators and campaign scope. Contact Sales for a complete campaign estimate.</p></div><div className="border-t border-[#d8caef] pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0"><p className="text-sm font-semibold">What’s included</p><ul className="mt-3 space-y-2 text-sm leading-5 text-[#625c69]"><li className="flex gap-2"><span className="text-[#6330dc]">•</span><span>Creator coordination and communication</span></li><li className="flex gap-2"><span className="text-[#6330dc]">•</span><span>Brand brief alignment</span></li><li className="flex gap-2"><span className="text-[#6330dc]">•</span><span>Original Reel delivery oversight</span></li><li className="flex gap-2"><span className="text-[#6330dc]">•</span><span>Campaign reporting by CloutCo</span></li></ul></div></section>

      <section className="py-9"><p className="text-[0.68rem] font-bold uppercase tracking-[0.17em] text-[#6330dc]">Advantage+ Plan</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.055em]">We also offer</h2><p className="mt-3 max-w-2xl text-base leading-7 text-[#625d66]">Get additional services to amplify campaign visibility and create impact beyond creator content.</p><div className="mt-6 grid gap-4 md:grid-cols-2">{additionalServices.map((service) => <article key={service.id} className="border border-[#e4dcd4] bg-white p-5"><div className="flex items-start justify-between gap-4"><h3 className="text-xl font-semibold tracking-[-0.04em]">{service.title}</h3><span className="shrink-0 rounded-full bg-[#f1ebff] px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[#6330dc]">{service.budget === null ? 'Available on request' : 'Included'}</span></div><p className="mt-3 text-sm leading-6 text-[#625d66]">{service.description || 'A CloutCo specialist will tailor this service to your campaign objectives.'}</p><p className="mt-5 border-t border-[#ede7e1] pt-4 text-sm font-semibold">{service.budget === null ? service.serviceType === 'performance_marketing' ? '10% of daily media budget' : 'PAN-India planning' : `Campaign budget: ${formatCurrency(service.budget)}`}<span className="font-normal text-[#69636c]">{service.budget === null ? service.serviceType === 'performance_marketing' ? ' as management fee' : ' with local activation support' : ''}</span></p></article>)}</div></section>

      <footer className="flex flex-col gap-6 border-t border-[#e8dfd6] pt-8 sm:flex-row sm:items-end sm:justify-between"><div><img src="/brand/cloutco-logo.svg" alt="CloutCo" className="h-auto w-28" /><p className="mt-3 text-sm text-[#69636c]">Ganga Serio, Kharadi, Pune<br /><a href="mailto:connect@cloutco.in" className="underline underline-offset-4">connect@cloutco.in</a> · +91 84840 82402</p></div><a href={`https://wa.me/918484082402?text=${whatsappMessage}`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#6330dc] px-5 text-sm font-semibold text-white transition hover:bg-[#5124bd]">WhatsApp Sales</a></footer>
    </article>
  </main>;
}

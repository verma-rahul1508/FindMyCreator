import type { BrandProposalContent } from '@/lib/brand-proposal-content';
import type { BrandProposal, BrandProposalAdditionalService } from '@/lib/brand-proposal-types';
import { formatCurrency } from '@/lib/brand-proposal-types';

type Step = { label: string; title: string; actions: string[] };

function StepList({ steps, numbered = false }: { steps: Step[]; numbered?: boolean }) {
  const headingClass = numbered ? 'text-2xl font-semibold tracking-[-0.045em] sm:text-3xl' : 'text-xl font-semibold tracking-[-0.04em] sm:text-2xl';
  const listClass = numbered ? 'mt-5 space-y-4 text-base leading-7 text-[#625d66] sm:text-lg sm:leading-8' : 'mt-4 space-y-3 text-sm leading-6 text-[#625d66] sm:text-base sm:leading-7';
  return <div className="mt-7 space-y-4">{steps.map(({ label, title, actions }) => <article key={label} className="border border-[#e4dcd4] bg-white p-6 sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6"><span className={`${numbered ? 'flex h-11 w-11 items-center justify-center rounded-full' : 'inline-flex w-fit px-4 py-2 sm:min-w-32 sm:justify-center'} shrink-0 bg-[#f3ecff] text-sm font-bold text-[#6330dc]`}>{label}</span><div><h3 className={headingClass}>{title}</h3><ul className={listClass}>{actions.map((action) => <li key={action} className="flex gap-3"><span aria-hidden="true" className={`${numbered ? 'mt-2.5' : 'mt-2'} h-1.5 w-1.5 shrink-0 rounded-full bg-[#8b5cf6]`} /><span>{action}</span></li>)}</ul></div></div></article>)}</div>;
}

export function ProposalActivationJourney({ brandName, additionalServices }: { brandName: string; additionalServices: BrandProposalAdditionalService[] }) {
  const streetMarketing = additionalServices.find((service) => service.serviceType === 'street_marketing');
  if (!streetMarketing) return null;
  const budget = Number(streetMarketing.budget);
  const budgetLine = Number.isFinite(budget) && budget > 0
    ? `The proposed Street Marketing scope is budgeted at ${formatCurrency(budget)} and will be finalised once markets, formats and permissions are agreed.`
    : 'Street Marketing is included as an additional option; markets, formats and budget will be agreed before any media is booked.';
  const steps = [
    { label: '01', title: 'Creator story', detail: `Shortlisted creators publish approved stories that introduce ${brandName} in a clear, human way.` },
    { label: '02', title: 'Physical discovery', detail: 'Selected boards, street media, malls or societies extend the campaign in priority markets, where the final plan supports the idea.' },
    { label: '03', title: 'A clear response route', detail: 'A QR code, tracked link or WhatsApp route can take interested people to the agreed brand action.' },
    { label: '04', title: 'Read and refine', detail: 'Content delivery, available response signals and media activity are reviewed together to inform the next wave.' },
  ];
  return <section className="border-t border-[#e8dfd6] py-10 sm:py-12">
    <p className="text-[0.68rem] font-bold uppercase tracking-[0.17em] text-[#6330dc]">PAN-India activation</p>
    <div className="mt-2 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-end"><div><h2 className="text-3xl font-semibold tracking-[-0.055em] sm:text-4xl">From creator attention to real-world discovery</h2><p className="mt-4 max-w-3xl text-base leading-7 text-[#625d66] sm:text-lg sm:leading-8">Creator collaboration leads the campaign. Street Marketing can extend the same message through physical media in agreed priority markets, with one clear route for audiences to respond.</p></div><p className="border-l-2 border-[#b69af0] pl-4 text-sm leading-6 text-[#69636c] sm:text-base sm:leading-7">{budgetLine}</p></div>
    <div className="mt-7 grid gap-3 sm:grid-cols-2">{steps.map(({ label, title, detail }) => <article key={label} className="border border-[#e4dcd4] bg-white p-5 sm:p-6"><p className="text-[0.68rem] font-bold tracking-[0.17em] text-[#6330dc]">{label}</p><h3 className="mt-3 text-xl font-semibold tracking-[-0.04em] sm:text-2xl">{title}</h3><p className="mt-3 text-sm leading-6 text-[#625d66] sm:text-base sm:leading-7">{detail}</p></article>)}</div>
    <p className="mt-4 text-xs leading-5 text-[#77717a]">Physical media placements, QR destinations, tracking and response targets are subject to final scope, availability, local permissions and approved measurement setup.</p>
  </section>;
}

export function ProposalDeliveryPlan({ brandName, plannedDeliverables }: { brandName: string; plannedDeliverables: number }) {
  const execution: Step[] = [
    { label: '01', title: 'Plan and select', actions: [
      `Confirm priority markets, products, campaign themes, goals and creator criteria with ${brandName}.`,
      'Screen creators for audience and brand fit, then share a recommended shortlist.',
      `Get ${brandName}’s approval on the final creator roster before bookings begin.`,
    ] },
    { label: '02', title: 'Brief and coordinate', actions: [
      'Agree creator fees, deliverables, timelines and content usage rights.',
      'Coordinate products, samples or location visits with each creator as needed.',
      'Prepare creator briefs, cover direction and captions using approved brand claims.',
    ] },
    { label: '03', title: 'Review and publish', actions: [
      `Collect drafts, consolidate feedback and manage revisions through ${brandName}’s approval.`,
      'Check final content, required disclosures, captions and publishing details.',
      'Track each agreed post as it goes live and confirm completed deliverables.',
    ] },
    { label: '04', title: 'Measure and improve', actions: [
      'Maintain a live tracker of creators, deliverables, dates and campaign status.',
      'Report content performance and audience response against the agreed measures.',
      `Review what worked with ${brandName} and recommend the next creator wave.`,
    ] },
  ];
  const timeline: Step[] = [
    { label: 'Weeks 1–2', title: 'Set the foundation', actions: [
      `Confirm priority markets, focus products, budget and success measures with ${brandName}.`,
      'Finalise the shortlist, Instagram direction, briefs, deliverables and approval process.',
    ] },
    { label: 'Weeks 3–6', title: 'Launch the first creator wave', actions: [
      'Coordinate products or visits and guide creators through content production.',
      `Review and approve content with ${brandName}, then publish the first wave.`,
    ] },
    { label: 'Weeks 7–10', title: 'Review and refine', actions: [
      'Review early performance, audience response and available enquiry signals.',
      'Recommend the next creator wave and content direction; proceed only after its scope is approved.',
    ] },
    { label: 'Weeks 11–12', title: 'Report and plan ahead', actions: [
      'Share consolidated results and the status of all agreed deliverables.',
      `Present recommendations for an ongoing creator programme with ${brandName}.`,
    ] },
  ];
  const reporting = [
    { title: 'Content delivered', details: ['Track each agreed creator post, format, publication date and live link.', 'Confirm completed deliverables against the approved plan.'] },
    { title: 'Reach and engagement', details: ['Report available views or reach, engagement, saves and shares for each creator’s content.', 'Summarise audience response and the themes that attracted interest.'] },
    { title: 'Website and enquiry response', details: ['Where tracking is available, review website visits, enquiries, appointments or location visits.', `Review sales attributed through agreed links or codes when ${brandName} can share that data.`] },
    { title: 'Monthly review and recommendations', details: [`Review results with ${brandName} each month against agreed measures.`, 'Identify creators and themes worth repeating or improving.'] },
  ];

  return <>
    <section className="border-t border-[#e8dfd6] py-10 sm:py-12"><p className="text-[0.68rem] font-bold uppercase tracking-[0.17em] text-[#6330dc]">End-to-end management</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.055em] sm:text-4xl">Step-by-step execution plan</h2><p className="mt-4 max-w-3xl text-base leading-7 text-[#625d66] sm:text-lg sm:leading-8">CloutCo manages the work from planning to the final report, with {brandName} approving the key decisions and content.</p><StepList steps={execution} numbered /></section>
    <section className="border-t border-[#e8dfd6] py-10 sm:py-12"><p className="text-[0.68rem] font-bold uppercase tracking-[0.17em] text-[#6330dc]">Proposed first 90 days</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.055em] sm:text-4xl">A measured launch</h2><StepList steps={timeline} /></section>
    <section className="border-t border-[#e8dfd6] py-10 sm:py-12"><p className="text-[0.68rem] font-bold uppercase tracking-[0.17em] text-[#6330dc]">Measurement</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.055em] sm:text-4xl">What success will be measured against</h2><div className="mt-6 grid gap-3 border border-[#e0d4f6] bg-[#f8f4ff] p-5 sm:grid-cols-3 sm:p-7"><div><p className="text-2xl font-semibold tracking-[-0.05em] text-[#5422c3]">{plannedDeliverables}</p><p className="mt-1 text-sm leading-6 text-[#514b56] sm:text-base sm:leading-7">proposed creator {plannedDeliverables === 1 ? 'deliverable' : 'deliverables'}, subject to booking and final budget</p></div><div><p className="text-2xl font-semibold tracking-[-0.05em] text-[#5422c3]">100%</p><p className="mt-1 text-sm leading-6 text-[#514b56] sm:text-base sm:leading-7">of published content checked for brand approval, agreed claims and disclosure</p></div><div><p className="text-2xl font-semibold tracking-[-0.05em] text-[#5422c3]">Monthly</p><p className="mt-1 text-sm leading-6 text-[#514b56] sm:text-base sm:leading-7">results review with recommendations for the next wave</p></div></div><p className="mt-4 text-sm leading-6 text-[#69636c] sm:text-base sm:leading-7">Reach and enquiry targets will be agreed after creator insights, pilot markets and current baselines are confirmed. Agreed links, codes or enquiry routes should be ready before publishing.</p><div className="mt-7 space-y-4">{reporting.map(({ title, details }) => <article key={title} className="border border-[#e4dcd4] bg-white p-6 sm:p-8"><h3 className="text-xl font-semibold tracking-[-0.04em] sm:text-2xl">{title}</h3><ul className="mt-4 space-y-3 text-sm leading-6 text-[#625d66] sm:text-base sm:leading-7">{details.map((detail) => <li key={detail} className="flex gap-3"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8b5cf6]" /><span>{detail}</span></li>)}</ul></article>)}</div></section>
  </>;
}

export function ProposalCommercials({ proposal, content, plannedDeliverables }: { proposal: BrandProposal; content: BrandProposalContent; plannedDeliverables: number }) {
  const brandName = proposal.brandName || 'the brand';
  const startingPrice = Number(proposal.startingInvestment) > 0 ? `Starting from ${formatCurrency(proposal.startingInvestment)}` : 'Starting price to be confirmed';
  const feeScope = content.managementIncludedInStartingPrice === true
    ? `It includes the creator fee and CloutCo management for ${content.baseDeliverable}.`
    : content.managementIncludedInStartingPrice === false
      ? `It covers the creator fee for ${content.baseDeliverable}; CloutCo management is quoted separately.`
      : `The itemised quote will confirm whether CloutCo management is included in the rate for ${content.baseDeliverable}.`;
  return <section className="border-y border-[#e8dfd6] py-10 sm:py-12">
    <p className="text-[0.68rem] font-bold uppercase tracking-[0.17em] text-[#6330dc]">Commercial scope</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.055em] sm:text-4xl">Start with one creator. Build the right programme.</h2>
    <div className="mt-7 grid gap-4 md:grid-cols-2">
      <div className="bg-[#f3ecff] p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6330dc]">Creator collaboration starting price</p><h3 className="mt-3 text-3xl font-semibold tracking-[-0.055em] text-[#23172d]">{startingPrice}</h3><p className="mt-4 text-sm leading-6 text-[#625c69] sm:text-base sm:leading-7">This is the lowest-priced individual creator option in the current shortlist. {feeScope} Other creator rates vary; this is not the price of the full 90-day programme.</p></div>
      <div className="border border-[#e4dcd4] bg-white p-6 sm:p-8"><h3 className="text-xl font-semibold tracking-[-0.04em] sm:text-2xl">What a booked collaboration covers</h3><ul className="mt-4 space-y-2 text-sm leading-6 text-[#625d66] sm:text-base sm:leading-7"><li>• {content.baseDeliverable} on the selected creator’s account</li><li>• Creator fit check, brand brief and scheduling</li><li>• Draft coordination, {brandName} approval and publishing check</li><li>• Live link and a post-campaign performance summary</li></ul>{content.managementIncludedInStartingPrice === false && <p className="mt-4 border-t border-[#ede7e1] pt-3 text-sm leading-6 text-[#625d66]">CloutCo’s management work above is scoped and priced separately from the creator starting fee.</p>}</div>
    </div>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <div className="border border-[#e4dcd4] bg-white p-6 sm:p-8"><h3 className="text-xl font-semibold tracking-[-0.04em] sm:text-2xl">Proposed 90-day pilot</h3><p className="mt-3 text-sm leading-6 text-[#625d66] sm:text-base sm:leading-7">The current shortlist proposes {plannedDeliverables} creator {plannedDeliverables === 1 ? 'deliverable' : 'deliverables'} for the first phase. {brandName} can review the early results before approving an additional creator wave. The final roster, timing and budget for any later work will be agreed before bookings.</p></div>
      <div className="border border-[#e4dcd4] bg-white p-6 sm:p-8"><h3 className="text-xl font-semibold tracking-[-0.04em] sm:text-2xl">What the itemised quote will show</h3><ul className="mt-4 space-y-2 text-sm leading-6 text-[#625d66] sm:text-base sm:leading-7"><li>• Creator fee and CloutCo management breakdown for each collaboration</li><li>• Product, shipping, travel, production and paid media costs, if needed</li><li>• Review rounds, posting dates, content usage rights and any paid-use permissions</li><li>• Taxes, payment milestones, cancellation and rescheduling terms</li></ul></div>
    </div>
    <p className="mt-5 border-l-2 border-[#b69af0] pl-4 text-sm leading-6 text-[#69636c]">CloutCo will share the final 90-day estimate as separate line items. No creator is booked until {brandName} approves the scope, fees and terms.</p>
  </section>;
}

export function ProposalNextSteps({ brandName }: { brandName: string }) {
  const items = [
    { title: `${brandName} confirms`, detail: 'Pilot markets, focus products, budget range, approved claims, logistics and an approvals owner.' },
    { title: 'CloutCo validates', detail: 'Creator audience fit, current insights, availability, fees, deliverables and a practical tracking route.' },
    { title: 'Both teams approve', detail: 'The itemised estimate, final roster, pilot calendar, usage rights and launch date before any booking.' },
  ];
  return <section className="border-t border-[#e8dfd6] py-10"><p className="text-[0.68rem] font-bold uppercase tracking-[0.17em] text-[#6330dc]">Decision and next steps</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.055em] sm:text-4xl">Agree the pilot, then book creators</h2><div className="mt-6 grid gap-4 sm:grid-cols-3">{items.map(({ title, detail }) => <div key={title} className="border border-[#e4dcd4] bg-white p-5"><h3 className="text-xl font-semibold tracking-[-0.04em] sm:text-2xl">{title}</h3><p className="mt-3 text-sm leading-6 text-[#625d66] sm:text-base sm:leading-7">{detail}</p></div>)}</div></section>;
}

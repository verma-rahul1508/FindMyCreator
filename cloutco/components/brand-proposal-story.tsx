import type { BrandProposalContent } from '@/lib/brand-proposal-content';

export function ProposalCover({ brandName, content }: { brandName: string; content: BrandProposalContent }) {
  return <section aria-label={`${brandName} proposal cover`} className="relative isolate -mx-5 -mt-7 overflow-hidden bg-[#24131f] text-white sm:-mx-9 sm:-mt-10 lg:-mx-12 print:break-after-page">
    {content.coverImageUrl ? <img src={content.coverImageUrl} alt={`${brandName} proposal concept`} className="absolute inset-0 h-full w-full object-cover object-[64%_center] sm:object-center" /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,#795586_0%,#38233e_35%,#1b0b18_75%)]" />}
    <div className="absolute inset-0 bg-gradient-to-t from-[#1b0b18] via-[#1b0b18]/65 to-[#1b0b18]/20 sm:bg-gradient-to-r sm:from-[#1b0b18] sm:via-[#1b0b18]/85 sm:to-transparent" />
    <div className="relative flex min-h-[660px] flex-col justify-between px-6 py-8 sm:min-h-[720px] sm:px-10 sm:py-10 lg:px-12">
      <div className="flex items-start justify-between gap-4 border-b border-white/25 pb-5"><p className="text-base font-bold tracking-[-0.05em] sm:text-xl">Clout<span className="text-[#bea7ff]">Co</span></p><p className="text-right text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white/80">Campaign proposal<br />For {brandName}</p></div>
      <div className="max-w-[540px] pb-5"><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#d9c6ff]">{content.coverEyebrow}</p><h1 className="mt-5 text-6xl font-semibold leading-[0.95] tracking-[-0.075em] sm:text-8xl">{brandName}</h1><p className="mt-7 max-w-md whitespace-pre-line text-2xl font-medium leading-tight tracking-[-0.04em] sm:text-4xl">{content.coverTagline}</p><p className="mt-6 max-w-sm text-sm leading-6 text-white/85 sm:text-base sm:leading-7">{content.coverDescription}</p><div className="mt-9 h-px w-20 bg-[#c6adff]" /><p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">Presented by CloutCo</p></div>
      {content.coverImageUrl && content.coverImageDisclaimer && <p className="absolute bottom-10 right-10 hidden max-w-[360px] text-right text-[0.6rem] uppercase tracking-[0.14em] text-white/65 sm:block">{content.coverImageDisclaimer}</p>}
    </div>
  </section>;
}

const TILE_COLORS = ['bg-[#dac6c0]', 'bg-[#e9e0d4]', 'bg-[#a895ae]', 'bg-[#b89499]', 'bg-[#47314c]', 'bg-[#d3c3b2]', 'bg-[#ad98aa]', 'bg-[#c59d91]', 'bg-[#7c687f]'];

export function ProposalStrategy({ brandName, content }: { brandName: string; content: BrandProposalContent }) {
  const previewLabels = [
    content.storyCards[0].title, 'The detail', content.storyCards[2].title,
    content.storyCards[1].title, brandName, 'The experience',
    'Behind the scenes', 'The reveal', 'Explore more',
  ];

  return <section className="border-t border-[#e8dfd6] py-10 sm:py-12">
    <div className="overflow-hidden bg-[#21142b] px-6 py-8 text-white sm:px-9 sm:py-10">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#cbb4ff]">Why this campaign works</p>
      <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.055em] sm:text-4xl">{content.viewHeadline}</h2>
      <p className="mt-5 max-w-3xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8">{content.viewBody}</p>
      <div className="mt-8 border-l-4 border-[#c6adff] bg-white/10 px-5 py-5 sm:px-6">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d9c6ff]">How we position {brandName}</p>
        <p className="mt-2 max-w-4xl text-lg font-semibold leading-7 tracking-[-0.02em] text-white sm:text-xl sm:leading-8">{content.positioningGoal}</p>
      </div>
    </div>

    <p className="mt-12 text-[0.68rem] font-bold uppercase tracking-[0.17em] text-[#6330dc]">The opportunity</p>
    <h2 className="mt-2 text-3xl font-semibold tracking-[-0.055em] sm:text-4xl">{content.opportunityHeadline}</h2>
    <div className="mt-6 border border-[#e4dcd4] bg-[#fffaf3] p-5 sm:p-7"><p className="max-w-4xl text-base leading-8 text-[#514b56] sm:text-lg">{content.opportunityBody}</p></div>
    <div className="mt-4 grid gap-4 md:grid-cols-3">{content.storyCards.map(({ title, description }) => <div key={title} className="border border-[#e4dcd4] bg-white p-5 sm:p-6"><h3 className="text-xl font-semibold tracking-[-0.04em] sm:text-2xl">{title}</h3><p className="mt-3 text-sm leading-6 text-[#69636c] sm:text-base sm:leading-7">{description}</p></div>)}</div>

    <div className="mt-12 border-t border-[#e8dfd6] pt-10">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.17em] text-[#6330dc]">Showcase proposal · Instagram</p>
      <h3 className="mt-2 text-3xl font-semibold tracking-[-0.055em] sm:text-4xl">{content.showcaseTitle}</h3>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[#625d66] sm:text-lg sm:leading-8">{content.showcaseBody}</p>
      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
        <div className="bg-white p-1.5 shadow-[0_12px_35px_rgba(66,45,29,0.08)] sm:p-2">
          {content.showcaseImageUrl ? <img src={content.showcaseImageUrl} alt={`Illustrative nine-tile Instagram feed for ${brandName}`} className="block h-auto w-full" /> : <div className="grid grid-cols-3 gap-1.5">{previewLabels.map((label, index) => <div key={`${index}-${label}`} className={`flex aspect-square items-end p-2 text-xs font-semibold leading-tight ${TILE_COLORS[index]} ${index === 4 || index === 8 ? 'text-white' : 'text-[#2c202c]'} sm:p-4 sm:text-base`}>{label}</div>)}</div>}
        </div>
        <div className="space-y-4 text-sm leading-6 text-[#625d66]">{content.showcasePoints.map(({ title, description }) => <p key={title}><strong className="block text-base text-[#241b29]">{title}</strong>{description}</p>)}<p className="border-t border-[#e4dcd4] pt-4 text-xs leading-5">{content.showcaseImageDisclaimer ? `${content.showcaseImageDisclaimer} ` : 'Illustrative layout. '}Final visuals, post mix and any content beyond the agreed creator deliverables require {brandName}’s approval.</p></div>
      </div>
    </div>
    <p className="mt-8 border-l-2 border-[#b69af0] pl-4 text-sm leading-6 text-[#69636c]">Priority markets, focus products, access needs and measurable targets will be agreed with {brandName} before launch.</p>
  </section>;
}

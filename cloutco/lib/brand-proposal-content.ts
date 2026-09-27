export type ProposalCard = { title: string; description: string };

export type BrandProposalContent = {
  coverEyebrow: string;
  coverTagline: string;
  coverDescription: string;
  coverImageUrl: string;
  coverImageDisclaimer: string;
  openingStatement: string;
  viewHeadline: string;
  viewBody: string;
  positioningGoal: string;
  opportunityHeadline: string;
  opportunityBody: string;
  storyCards: ProposalCard[];
  showcaseTitle: string;
  showcaseBody: string;
  showcaseImageUrl: string;
  showcaseImageDisclaimer: string;
  showcasePoints: ProposalCard[];
  baseDeliverable: string;
  managementIncludedInStartingPrice: boolean | null;
};

export const KEEMTI_PROPOSAL_TOKEN = '7633e6eb-8e77-42e1-8aa5-7588451aeea2';

function validImageUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const url = value.trim();
  return (url.startsWith('/') && !url.startsWith('//')) || /^https:\/\//i.test(url) ? url : '';
}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function cards(value: unknown, fallback: ProposalCard[]): ProposalCard[] {
  if (!Array.isArray(value)) return fallback;
  const result = value.slice(0, 3).map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const source = item as Record<string, unknown>;
    const title = typeof source.title === 'string' ? source.title.trim() : '';
    const description = typeof source.description === 'string' ? source.description.trim() : '';
    return title && description ? { title, description } : null;
  }).filter((item): item is ProposalCard => item !== null);
  return result.length === 3 ? result : fallback;
}

export function defaultBrandProposalContent(brandName: string): BrandProposalContent {
  const brand = brandName || 'your brand';
  return {
    coverEyebrow: 'Creator collaboration',
    coverTagline: 'Real stories. Meaningful connections.',
    coverDescription: `A creator-led campaign to show how ${brand} fits into the lives of the people you want to reach.`,
    coverImageUrl: '',
    coverImageDisclaimer: '',
    openingStatement: `CloutCo will pair ${brand} with creators who can tell clear, relevant stories about the brand. We will manage each collaboration from creator selection and briefing through content delivery and reporting.`,
    viewHeadline: `Make ${brand} part of the moments that matter.`,
    viewBody: `People connect with stories they recognise. We will show why customers choose ${brand}, how they experience it and what they share with others. Creators will make those stories feel natural to their audiences, with a clear reason to explore the brand.`,
    positioningGoal: `Build a recognisable reason for people to remember and choose ${brand}.`,
    opportunityHeadline: 'Turn attention into meaningful discovery',
    opportunityBody: `Creators can help ${brand} reach relevant audiences through real use, personal recommendations and distinctive content. We will agree on the audience, priority markets and actions to measure before launch.`,
    storyCards: [
      { title: 'A personal reason', description: `A creator shows why ${brand} matters to them and makes the story relatable.` },
      { title: 'A shared experience', description: 'A story about choosing, sharing or recommending something with another person.' },
      { title: 'A closer look', description: 'Show the product or experience clearly and give interested viewers a useful next step.' },
    ],
    showcaseTitle: `A recognisable world for ${brand}`,
    showcaseBody: 'A consistent Instagram layout can connect creator stories, product details and useful brand information. Covers and captions will help each post feel part of one campaign.',
    showcaseImageUrl: '',
    showcaseImageDisclaimer: '',
    showcasePoints: [
      { title: 'People lead', description: 'Creators and real reactions make the feed feel personal.' },
      { title: 'The brand supports', description: 'Product or service details give each story a clear reason to believe.' },
      { title: 'Every post guides', description: 'Captions and calls to action help viewers take the next step.' },
    ],
    baseDeliverable: 'one agreed creator deliverable',
    managementIncludedInStartingPrice: null,
  };
}

function keemtiContent(): BrandProposalContent {
  return {
    coverEyebrow: 'Creator collaboration × lab-grown diamonds',
    coverTagline: 'Real stories.\nRemarkable moments.',
    coverDescription: 'A creator-led campaign for Keemti’s lab-grown diamond jewellery, from everyday self-expression to milestones worth marking.',
    coverImageUrl: '/brand/keemti-creator-cover.png',
    coverImageDisclaimer: 'Concept image · not Keemti products or shortlisted creators',
    openingStatement: 'CloutCo will pair Keemti with creators who capture precious Keemti moments: choosing a piece for yourself, sharing a milestone with someone, and discovering jewellery in store. We will manage each collaboration from creator selection and briefing to content delivery and reporting.',
    viewHeadline: 'Make every moment Keemti.',
    viewBody: 'Keemti means precious. We will show what that means in real life: someone buying jewellery to celebrate a personal win, two people choosing a gift together, or the joy of finding the right piece in store. Creators will capture the people and feelings behind each choice. The goal is simple: when a moment feels worth celebrating, Keemti comes to mind.',
    positioningGoal: 'Keemti becomes a destination for moments worth remembering, with its lab-grown diamond jewellery woven naturally into those stories.',
    opportunityHeadline: 'Capture the moment, from choice to celebration',
    opportunityBody: 'Keemti’s stores give this idea a real setting. With Keemti’s approval and customer consent, creators can follow a personal or shared journey: arriving with a reason to celebrate, exploring and trying on pieces, choosing one, then living with that memory beyond the store. The result is a repeatable story format that connects emotion, product discovery and a clear next step for local audiences.',
    storyCards: [
      { title: 'The personal moment', description: 'One person marks a first, an achievement or a choice made for themselves. The Reel follows their reason, selection and reveal.' },
      { title: 'The shared moment', description: 'A pair chooses or gifts a piece together. We capture the exchange, the reaction and the meaning behind it.' },
      { title: 'The store moment', description: 'A creator brings viewers into an approved Keemti store visit, from discovery and try-on to a trackable store or collection invitation.' },
    ],
    showcaseTitle: 'A feed built around Keemti moments',
    showcaseBody: 'CloutCo proposes a calm, consistent Instagram layout that alternates people, store experiences and jewellery details. Reels carry the stories; covers, captions and supporting posts make the profile feel like one recognisable Keemti world.',
    showcaseImageUrl: '/brand/keemti-instagram-moments-grid.png',
    showcaseImageDisclaimer: 'AI-generated concept imagery. These are not Keemti products, stores, customers or shortlisted creators.',
    showcasePoints: [
      { title: 'People lead', description: 'Faces and authentic reactions make the feed feel personal.' },
      { title: 'Product supports', description: 'Close-ups and approved product facts give each story a clear jewellery connection.' },
      { title: 'Stores invite', description: 'Location cues and calls to action guide viewers toward a collection, visit or appointment.' },
    ],
    baseDeliverable: 'one original Instagram Reel',
    managementIncludedInStartingPrice: true,
  };
}

export function resolveBrandProposalContent(brandName: string, token: string, value?: unknown): BrandProposalContent {
  const fallback = token === KEEMTI_PROPOSAL_TOKEN ? keemtiContent() : defaultBrandProposalContent(brandName);
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    coverEyebrow: text(source.coverEyebrow, fallback.coverEyebrow),
    coverTagline: text(source.coverTagline, fallback.coverTagline),
    coverDescription: text(source.coverDescription, fallback.coverDescription),
    coverImageUrl: source.coverImageUrl === '' ? '' : validImageUrl(source.coverImageUrl) || fallback.coverImageUrl,
    coverImageDisclaimer: text(source.coverImageDisclaimer, fallback.coverImageDisclaimer),
    openingStatement: text(source.openingStatement, fallback.openingStatement),
    viewHeadline: text(source.viewHeadline, fallback.viewHeadline),
    viewBody: text(source.viewBody, fallback.viewBody),
    positioningGoal: text(source.positioningGoal, fallback.positioningGoal),
    opportunityHeadline: text(source.opportunityHeadline, fallback.opportunityHeadline),
    opportunityBody: text(source.opportunityBody, fallback.opportunityBody),
    storyCards: cards(source.storyCards, fallback.storyCards),
    showcaseTitle: text(source.showcaseTitle, fallback.showcaseTitle),
    showcaseBody: text(source.showcaseBody, fallback.showcaseBody),
    showcaseImageUrl: source.showcaseImageUrl === '' ? '' : validImageUrl(source.showcaseImageUrl) || fallback.showcaseImageUrl,
    showcaseImageDisclaimer: text(source.showcaseImageDisclaimer, fallback.showcaseImageDisclaimer),
    showcasePoints: cards(source.showcasePoints, fallback.showcasePoints),
    baseDeliverable: text(source.baseDeliverable, fallback.baseDeliverable),
    managementIncludedInStartingPrice: typeof source.managementIncludedInStartingPrice === 'boolean' ? source.managementIncludedInStartingPrice : fallback.managementIncludedInStartingPrice,
  };
}

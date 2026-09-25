export type BrandProposalCreator = {
  id: string;
  name: string;
  platform: 'instagram' | 'facebook' | 'youtube' | null;
  profileUrl: string | null;
  publicIdentifier: string | null;
  followers: number | string | null;
  views: number | string | null;
  niche: string | null;
  deliverable: string;
  quantity: number | string;
  creativeConcept: string | null;
};

export type BrandProposalAdditionalService = {
  id: string;
  serviceType: string;
  title: string;
  description: string | null;
  budget: number | string | null;
};

export type BrandProposal = {
  proposalToken: string;
  brandName: string | null;
  businessCategory: string | null;
  planLevel: string;
  startingInvestment: number | string;
  totalInvestment: number | string;
  creators: BrandProposalCreator[];
  additionalServices: BrandProposalAdditionalService[];
};

export type AdminBrandProposal = BrandProposal & {
  recipientEmail: string | null;
  contactPerson: string | null;
  sentAt: string | null;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {};
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numeric(value: unknown): number | string | null {
  return typeof value === 'number' || typeof value === 'string' ? value : null;
}

function creator(value: unknown): BrandProposalCreator | null {
  const source = asRecord(value);
  const id = text(source.id);
  const name = text(source.name);
  if (!id || !name) return null;
  const platform = source.platform === 'instagram' || source.platform === 'facebook' || source.platform === 'youtube' ? source.platform : null;
  return {
    id,
    name,
    platform,
    profileUrl: text(source.profileUrl),
    publicIdentifier: text(source.publicIdentifier),
    followers: numeric(source.followers),
    views: numeric(source.views),
    niche: text(source.niche),
    deliverable: text(source.deliverable) ?? 'Creator content',
    quantity: numeric(source.quantity) ?? 1,
    creativeConcept: text(source.creativeConcept),
  };
}

function additionalService(value: unknown): BrandProposalAdditionalService | null {
  const source = asRecord(value);
  const id = text(source.id);
  const title = text(source.title);
  if (!id || !title) return null;
  return {
    id,
    serviceType: text(source.serviceType) ?? 'additional_service',
    title,
    description: text(source.description),
    budget: numeric(source.budget),
  };
}

export function normalizeBrandProposal(value: unknown): BrandProposal | null {
  const source = asRecord(value);
  const proposalToken = text(source.proposalToken);
  if (!proposalToken) return null;
  return {
    proposalToken,
    brandName: text(source.brandName),
    businessCategory: text(source.businessCategory),
    planLevel: text(source.planLevel) ?? 'Premium Service',
    startingInvestment: numeric(source.startingInvestment) ?? 25000,
    totalInvestment: numeric(source.totalInvestment) ?? 0,
    creators: Array.isArray(source.creators) ? source.creators.map(creator).filter((item): item is BrandProposalCreator => item !== null) : [],
    additionalServices: Array.isArray(source.additionalServices) ? source.additionalServices.map(additionalService).filter((item): item is BrandProposalAdditionalService => item !== null) : [],
  };
}

export function normalizeAdminBrandProposal(value: unknown): AdminBrandProposal | null {
  const proposal = normalizeBrandProposal(value);
  if (!proposal) return null;
  const source = asRecord(value);
  return { ...proposal, recipientEmail: text(source.recipientEmail), contactPerson: text(source.contactPerson), sentAt: text(source.sentAt) };
}

export function formatCompactNumber(value: number | string | null | undefined) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return '—';
  if (number >= 1_000_000) {
    const millions = Math.round((number / 1_000_000) * 10) / 10;
    return `${millions % 1 === 0 ? millions.toFixed(0) : millions}M`;
  }
  if (number >= 1_000) return `${Math.round(number / 1_000)}K`;
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(number);
}

export function formatCurrency(value: number | string | null | undefined) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(number);
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'C';
}

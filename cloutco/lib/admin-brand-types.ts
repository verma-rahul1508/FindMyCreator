export type BrandStatus = 'draft' | 'active' | 'completed' | 'archived';
export type BrandServiceType = 'creator_collaboration' | 'shoot' | 'editing' | 'meta_ads' | 'google_ads';

export type BrandListRow = {
  brand_id: string;
  brand_name: string | null;
  contact_person: string | null;
  phone_number: string | null;
  email: string | null;
  city: string | null;
  business_category: string | null;
  service_count: number | string;
  final_price: number | string;
  status: BrandStatus;
  created_at: string;
  total_count: number | string;
};

export type BrandService = {
  id?: string;
  serviceType: BrandServiceType;
  serviceOrder: number;
  creatorId: string;
  creatorName: string;
  platform: '' | 'instagram' | 'facebook' | 'youtube';
  deliverableType: string;
  quantity: string;
  creatorFee: string;
  shootType: string;
  shootDate: string;
  location: string;
  durationHours: string;
  deliverables: string;
  productionNotes: string;
  editingType: string;
  turnaroundTime: string;
  numberOfRevisions: string;
  referenceNotes: string;
  campaignObjective: string;
  dailyAdBudget: string;
  numberOfDays: string;
  adSpend: string;
  managementFee: string;
  finalPrice: string;
};

export type BrandFormData = {
  id?: string;
  brandName: string;
  contactPerson: string;
  phoneNumber: string;
  email: string;
  city: string;
  businessCategory: string;
  website: string;
  instagram: string;
  businessAddress: string;
  gstin: string;
  internalNotes: string;
  status: BrandStatus;
};

export type BrandDetail = BrandFormData & {
  id: string;
  createdAt: string;
  updatedAt: string;
  finalPrice: number | string;
  services: Array<BrandService & { id: string; createdAt: string; updatedAt: string }>;
  audit: Array<{ id: string; action: string; details: Record<string, unknown>; createdAt: string }>;
};

export type CreatorSearchResult = {
  creator_id: string;
  creator_name: string;
  username: string | null;
  primary_platform: string | null;
};

export const BRAND_STATUS_LABELS: Record<BrandStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
};

export const SERVICE_LABELS: Record<BrandServiceType, string> = {
  creator_collaboration: 'Creator Collaboration',
  shoot: 'Shoot',
  editing: 'Editing',
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
};

export function createEmptyService(serviceType: BrandServiceType, serviceOrder: number): BrandService {
  return {
    serviceType, serviceOrder, creatorId: '', creatorName: '', platform: '', deliverableType: '', quantity: '', creatorFee: '',
    shootType: '', shootDate: '', location: '', durationHours: '', deliverables: '', productionNotes: '', editingType: '',
    turnaroundTime: '', numberOfRevisions: '', referenceNotes: '', campaignObjective: '', dailyAdBudget: '', numberOfDays: '',
    adSpend: '', managementFee: '', finalPrice: '',
  };
}

export function createEmptyBrand(): BrandFormData {
  return {
    brandName: '', contactPerson: '', phoneNumber: '', email: '', city: '', businessCategory: '', website: '', instagram: '',
    businessAddress: '', gstin: '', internalNotes: '', status: 'draft',
  };
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {};
}

/** Converts database values to the string representation required by controlled inputs. */
function editorValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function editorStatus(value: unknown): BrandStatus {
  return value === 'active' || value === 'completed' || value === 'archived' || value === 'draft' ? value : 'draft';
}

function editorServiceType(value: unknown): BrandServiceType {
  return value === 'shoot' || value === 'editing' || value === 'meta_ads' || value === 'google_ads' || value === 'creator_collaboration' ? value : 'creator_collaboration';
}

function editorPlatform(value: unknown): BrandService['platform'] {
  return value === 'instagram' || value === 'facebook' || value === 'youtube' ? value : '';
}

function editorService(value: unknown, index: number): BrandService {
  const source = asRecord(value);
  const serviceType = editorServiceType(source.serviceType);
  const serviceOrder = Number(source.serviceOrder);
  const base = createEmptyService(serviceType, Number.isInteger(serviceOrder) && serviceOrder > 0 ? serviceOrder : index + 1);

  return {
    ...base,
    id: editorValue(source.id) || undefined,
    creatorId: editorValue(source.creatorId),
    creatorName: editorValue(source.creatorName),
    platform: editorPlatform(source.platform),
    deliverableType: editorValue(source.deliverableType),
    quantity: editorValue(source.quantity),
    creatorFee: editorValue(source.creatorFee),
    shootType: editorValue(source.shootType),
    shootDate: editorValue(source.shootDate),
    location: editorValue(source.location),
    durationHours: editorValue(source.durationHours),
    deliverables: editorValue(source.deliverables),
    productionNotes: editorValue(source.productionNotes),
    editingType: editorValue(source.editingType),
    turnaroundTime: editorValue(source.turnaroundTime),
    numberOfRevisions: editorValue(source.numberOfRevisions),
    referenceNotes: editorValue(source.referenceNotes),
    campaignObjective: editorValue(source.campaignObjective),
    dailyAdBudget: editorValue(source.dailyAdBudget),
    numberOfDays: editorValue(source.numberOfDays),
    adSpend: editorValue(source.adSpend),
    managementFee: editorValue(source.managementFee),
    finalPrice: editorValue(source.finalPrice),
  };
}

/** The only database-response-to-editor-state boundary for brand forms. */
export function normalizeBrandForEditor(value: unknown): { brand: BrandFormData; services: BrandService[] } {
  const source = asRecord(value);
  const rawServices = Array.isArray(source.services) ? source.services : [];

  return {
    brand: {
      id: editorValue(source.id) || undefined,
      brandName: editorValue(source.brandName),
      contactPerson: editorValue(source.contactPerson),
      phoneNumber: editorValue(source.phoneNumber),
      email: editorValue(source.email),
      city: editorValue(source.city),
      businessCategory: editorValue(source.businessCategory),
      website: editorValue(source.website),
      instagram: editorValue(source.instagram),
      businessAddress: editorValue(source.businessAddress),
      gstin: editorValue(source.gstin),
      internalNotes: editorValue(source.internalNotes),
      status: editorStatus(source.status),
    },
    services: rawServices.map(editorService),
  };
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function nullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

function nullableInteger(value: string): number | null {
  const number = nullableNumber(value);
  return number !== null && Number.isInteger(number) ? number : null;
}

/** Converts controlled editor strings into the nullable numeric/text values accepted by the save RPC. */
export function createBrandSavePayload(brand: BrandFormData, services: BrandService[]) {
  return {
    brand: {
      id: brand.id ?? null,
      brandName: nullableText(brand.brandName),
      contactPerson: nullableText(brand.contactPerson),
      phoneNumber: nullableText(brand.phoneNumber),
      email: nullableText(brand.email),
      city: nullableText(brand.city),
      businessCategory: nullableText(brand.businessCategory),
      website: nullableText(brand.website),
      instagram: nullableText(brand.instagram),
      businessAddress: nullableText(brand.businessAddress),
      gstin: nullableText(brand.gstin),
      internalNotes: nullableText(brand.internalNotes),
      status: brand.status,
    },
    services: services.map((service) => ({
      id: service.id ?? null,
      serviceType: service.serviceType,
      serviceOrder: service.serviceOrder,
      creatorId: nullableText(service.creatorId),
      creatorName: nullableText(service.creatorName),
      platform: nullableText(service.platform),
      deliverableType: nullableText(service.deliverableType),
      quantity: nullableInteger(service.quantity),
      creatorFee: nullableNumber(service.creatorFee),
      shootType: nullableText(service.shootType),
      shootDate: nullableText(service.shootDate),
      location: nullableText(service.location),
      durationHours: nullableNumber(service.durationHours),
      deliverables: nullableText(service.deliverables),
      productionNotes: nullableText(service.productionNotes),
      editingType: nullableText(service.editingType),
      turnaroundTime: nullableText(service.turnaroundTime),
      numberOfRevisions: nullableInteger(service.numberOfRevisions),
      referenceNotes: nullableText(service.referenceNotes),
      campaignObjective: nullableText(service.campaignObjective),
      dailyAdBudget: nullableNumber(service.dailyAdBudget),
      numberOfDays: nullableInteger(service.numberOfDays),
      adSpend: nullableNumber(service.adSpend),
      managementFee: nullableNumber(service.managementFee),
      finalPrice: nullableNumber(service.finalPrice),
    })),
  };
}

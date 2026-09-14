'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  createBrandSavePayload,
  createEmptyBrand,
  createEmptyService,
  normalizeBrandForEditor,
  SERVICE_LABELS,
  type BrandDetail,
  type BrandFormData,
  type BrandService,
  type BrandServiceType,
  type CreatorSearchResult,
} from '@/lib/admin-brand-types';

const INPUT_CLASS = 'mt-1.5 min-h-11 w-full rounded-lg border border-[#e3e1e9] bg-white px-3 text-sm text-[#30333a] outline-none transition placeholder:text-[#9a9eaa] focus:border-[#9c7df0] focus:ring-2 focus:ring-[#ede7ff]';
const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-24 py-3`;
const SERVICE_TYPES = Object.keys(SERVICE_LABELS) as BrandServiceType[];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function decimalValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function isNonNegativeNumber(value: string) {
  return value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
}

function isPositiveInteger(value: string) {
  return value.trim() !== '' && Number.isInteger(Number(value)) && Number(value) >= 1;
}

function labelForInstance(service: BrandService, services: BrandService[]) {
  const number = services.filter((item) => item.serviceType === service.serviceType && item.serviceOrder <= service.serviceOrder).length;
  return `${SERVICE_LABELS[service.serviceType]} #${number}`;
}

function DetailInput({ label, value, onChange, type = 'text', required = false, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return <label className="block text-xs font-semibold text-[#575e6b]">{label}{required && <span className="text-[#a44852]"> *</span>}
    <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={INPUT_CLASS} />
  </label>;
}

function DetailTextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block text-xs font-semibold text-[#575e6b]">{label}
    <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={TEXTAREA_CLASS} />
  </label>;
}

function CreatorSelector({ service, update }: { service: BrandService; update: (patch: Partial<BrandService>) => void }) {
  const [query, setQuery] = useState(service.creatorName || service.creatorId);
  const [results, setResults] = useState<CreatorSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const resultsId = useId();

  useEffect(() => {
    const term = query.trim();
    if (!isSearchOpen || term.length < 2) return;
    let active = true;
    const timer = window.setTimeout(() => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      setLoading(true);
      void supabase.rpc('admin_search_creators', { p_search: term, p_limit: 8 }).then(({ data, error }) => {
        if (!active) return;
        setLoading(false);
        setResults(!error && Array.isArray(data) ? data as CreatorSearchResult[] : []);
      });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isSearchOpen, query]);

  const shouldShowResults = isSearchOpen && query.trim().length >= 2 && (loading || results.length > 0);

  return <div className="relative" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsSearchOpen(false);
  }}>
    <label className="block text-xs font-semibold text-[#575e6b]">Creator name
      <input
        type="text"
        value={service.creatorName}
        onFocus={() => setIsSearchOpen(true)}
        onChange={(event) => {
          const value = event.target.value;
          update({ creatorName: value, creatorId: '' });
          setQuery(value);
          setResults([]);
          setIsSearchOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsSearchOpen(false);
        }}
        placeholder="Search a CloutCo creator or enter a name"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={resultsId}
        aria-expanded={shouldShowResults}
        className={INPUT_CLASS}
      />
    </label>
    <p className="mt-1 text-xs leading-5 text-[#838996]">Select a creator to retain their ID, or save a manually entered collaboration without linking one.</p>
    {shouldShowResults && <div id={resultsId} role="listbox" className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-[#e3e1e9] bg-white p-1 shadow-lg">
      {loading ? <p className="px-3 py-2 text-xs text-[#697080]">Searching creators…</p> : results.map((creator) => <button key={creator.creator_id} type="button" role="option" aria-selected={service.creatorId === creator.creator_id} onMouseDown={(event) => event.preventDefault()} onClick={() => { update({ creatorId: creator.creator_id, creatorName: creator.creator_name, platform: creator.primary_platform === 'instagram' || creator.primary_platform === 'facebook' || creator.primary_platform === 'youtube' ? creator.primary_platform : '' }); setQuery(creator.creator_name); setResults([]); setIsSearchOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-[#f8f6fb]">
        <span className="block text-sm font-semibold text-[#30333a]">{creator.creator_name}</span><span className="block truncate text-xs text-[#727987]">{creator.creator_id}{creator.primary_platform ? ` · ${creator.primary_platform}` : ''}</span>
      </button>)}
    </div>}
    {service.creatorId && <p className="mt-2 rounded-lg bg-[#f5f1ff] px-3 py-2 text-xs font-medium text-[#6330dc]">Linked creator ID: {service.creatorId}</p>}
  </div>;
}

function ServiceFields({ service, update }: { service: BrandService; update: (patch: Partial<BrandService>) => void }) {
  const setAdBudget = (key: 'dailyAdBudget' | 'numberOfDays', value: string) => {
    const next = { ...service, [key]: value };
    update({ [key]: value, adSpend: String(decimalValue(next.dailyAdBudget) * decimalValue(next.numberOfDays)) });
  };
  const finalPrice = <DetailInput label="Final Price to Brand" required type="number" value={service.finalPrice} onChange={(value) => update({ finalPrice: value })} placeholder="0" />;

  if (service.serviceType === 'creator_collaboration') return <div className="grid gap-4 sm:grid-cols-2">
    <CreatorSelector service={service} update={update} />
    <DetailInput label="Creator ID" value={service.creatorId} onChange={(value) => update({ creatorId: value })} placeholder="Optional linked UUID" />
    <label className="text-xs font-semibold text-[#575e6b]">Platform<select value={service.platform} onChange={(event) => update({ platform: event.target.value as BrandService['platform'] })} className={INPUT_CLASS}><option value="">Select platform</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="youtube">YouTube</option></select></label>
    <DetailInput label="Deliverable / Content Type" value={service.deliverableType} onChange={(value) => update({ deliverableType: value })} placeholder="Reel, post, story…" />
    <DetailInput label="Quantity" type="number" value={service.quantity} onChange={(value) => update({ quantity: value })} placeholder="1" />
    <DetailInput label="Creator Fee" type="number" value={service.creatorFee} onChange={(value) => update({ creatorFee: value })} placeholder="0" />
    {finalPrice}
  </div>;

  if (service.serviceType === 'shoot') return <div className="grid gap-4 sm:grid-cols-2">
    <DetailInput label="Shoot Type" value={service.shootType} onChange={(value) => update({ shootType: value })} placeholder="Product, lifestyle…" />
    <DetailInput label="Shoot Date" type="date" value={service.shootDate} onChange={(value) => update({ shootDate: value })} />
    <DetailInput label="Location" value={service.location} onChange={(value) => update({ location: value })} />
    <DetailInput label="Duration / Hours" type="number" value={service.durationHours} onChange={(value) => update({ durationHours: value })} />
    <DetailInput label="Deliverables" value={service.deliverables} onChange={(value) => update({ deliverables: value })} placeholder="Photos, videos…" />
    <DetailInput label="Quantity" type="number" value={service.quantity} onChange={(value) => update({ quantity: value })} />
    {finalPrice}<DetailTextArea label="Production Notes" value={service.productionNotes} onChange={(value) => update({ productionNotes: value })} />
  </div>;

  if (service.serviceType === 'editing') return <div className="grid gap-4 sm:grid-cols-2">
    <DetailInput label="Editing Type" value={service.editingType} onChange={(value) => update({ editingType: value })} placeholder="Video, photo…" />
    <DetailInput label="Deliverables" value={service.deliverables} onChange={(value) => update({ deliverables: value })} />
    <DetailInput label="Quantity" type="number" value={service.quantity} onChange={(value) => update({ quantity: value })} />
    <DetailInput label="Turnaround Time" value={service.turnaroundTime} onChange={(value) => update({ turnaroundTime: value })} placeholder="e.g. 3 business days" />
    <DetailInput label="Number of Revisions" type="number" value={service.numberOfRevisions} onChange={(value) => update({ numberOfRevisions: value })} />
    {finalPrice}<DetailTextArea label="Reference / Notes" value={service.referenceNotes} onChange={(value) => update({ referenceNotes: value })} />
  </div>;

  return <div className="grid gap-4 sm:grid-cols-2">
    <DetailInput label="Campaign Objective" value={service.campaignObjective} onChange={(value) => update({ campaignObjective: value })} placeholder="Awareness, leads…" />
    <DetailInput label="Daily Ad Budget" required type="number" value={service.dailyAdBudget} onChange={(value) => setAdBudget('dailyAdBudget', value)} placeholder="0" />
    <DetailInput label="Number of Days" required type="number" value={service.numberOfDays} onChange={(value) => setAdBudget('numberOfDays', value)} placeholder="1" />
    <label className="block text-xs font-semibold text-[#575e6b]">Ad Spend / Final Budget<input readOnly value={service.adSpend ? formatCurrency(decimalValue(service.adSpend)) : 'Calculated from daily budget × days'} className={`${INPUT_CLASS} cursor-not-allowed bg-[#f8f7fa] text-[#59606d]`} /></label>
    <DetailInput label="CloutCo Management Fee" type="number" value={service.managementFee} onChange={(value) => update({ managementFee: value })} placeholder="0" />
    {finalPrice}
    <p className="sm:col-span-2 text-xs leading-5 text-[#727987]">Ad spend and Final Price to Brand are intentionally separate. The calculated ad spend never overwrites the final price.</p>
  </div>;
}

function ServiceCard({ service, services, onUpdate, onRemove, onDuplicate }: { service: BrandService; services: BrandService[]; onUpdate: (patch: Partial<BrandService>) => void; onRemove: () => void; onDuplicate: () => void }) {
  return <article className="rounded-2xl border border-[#e5e1ed] bg-white p-4 shadow-[0_8px_22px_rgba(33,24,54,0.03)] sm:p-5">
    <div className="flex flex-col gap-3 border-b border-[#efedf2] pb-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7c3aed]">Service</p><h3 className="mt-1 text-lg font-semibold tracking-[-0.04em] text-[#25262b]">{labelForInstance(service, services)}</h3></div><div className="flex gap-2"><button type="button" onClick={onDuplicate} className="min-h-10 rounded-lg border border-[#dedbe5] px-3 text-sm font-medium text-[#505662] hover:bg-[#faf8ff]">Duplicate</button><button type="button" onClick={onRemove} className="min-h-10 rounded-lg border border-[#efd2d5] px-3 text-sm font-medium text-[#9a3f4a] hover:bg-[#fff7f7]">Remove</button></div></div>
    <div className="mt-5"><ServiceFields service={service} update={onUpdate} /></div>
  </article>;
}

export function AdminBrandEditor({ initialDetail }: { initialDetail?: BrandDetail }) {
  const router = useRouter();
  const [brand, setBrand] = useState<BrandFormData>(() => initialDetail ? normalizeBrandForEditor(initialDetail).brand : createEmptyBrand());
  const [services, setServices] = useState<BrandService[]>(() => initialDetail ? normalizeBrandForEditor(initialDetail).services : []);
  const [saving, setSaving] = useState<'draft' | 'continue' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const finalPrice = useMemo(() => services.reduce((total, service) => total + decimalValue(service.finalPrice), 0), [services]);
  const patchBrand = (key: keyof BrandFormData, value: string) => setBrand((current) => ({ ...current, [key]: value }));
  const resequence = (items: BrandService[]) => items.map((service, index) => ({ ...service, serviceOrder: index + 1 }));
  const addService = (serviceType: BrandServiceType) => setServices((current) => [...current, createEmptyService(serviceType, current.length + 1)]);
  const removeService = (index: number) => setServices((current) => resequence(current.filter((_, itemIndex) => itemIndex !== index)));
  const updateService = (index: number, patch: Partial<BrandService>) => setServices((current) => current.map((service, itemIndex) => itemIndex === index ? { ...service, ...patch } : service));
  const duplicateService = (service: BrandService) => setServices((current) => [...current, createEmptyService(service.serviceType, current.length + 1)]);

  const validate = (submit: boolean) => {
    if (submit) {
      if (!brand.brandName.trim() || !brand.contactPerson.trim() || !brand.phoneNumber.trim() || !brand.email.trim() || !brand.city.trim() || !brand.businessCategory.trim()) return 'Complete all required Brand Details fields.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(brand.email.trim())) return 'Enter a valid email address.';
      if (brand.phoneNumber.replace(/[^0-9+]/g, '').length < 7) return 'Enter a valid phone number.';
    }
    for (const service of services) {
      const serviceLabel = labelForInstance(service, services);
      if (!service.finalPrice.trim()) return `${serviceLabel}: Final Price to Brand is required.`;
      if (!isNonNegativeNumber(service.finalPrice)) return `${serviceLabel}: Final Price to Brand must be a non-negative number.`;
      if (service.serviceType === 'meta_ads' || service.serviceType === 'google_ads') {
        if (!service.dailyAdBudget.trim()) return `${serviceLabel}: Daily Ad Budget is required.`;
        if (!isNonNegativeNumber(service.dailyAdBudget)) return `${serviceLabel}: Daily Ad Budget must be a non-negative number.`;
        if (!service.numberOfDays.trim()) return `${serviceLabel}: Number of Days is required.`;
        if (!isPositiveInteger(service.numberOfDays)) return `${serviceLabel}: Number of Days must be a whole number of at least 1.`;
      }
    }
    return '';
  };

  const save = async (submit: boolean) => {
    const validationMessage = validate(submit);
    if (validationMessage) { setError(validationMessage); return; }
    const supabase = getSupabaseClient();
    if (!supabase) { setError('Admin connection is unavailable. Please try again.'); return; }
    setError(''); setSuccess(''); setSaving(submit ? 'continue' : 'draft');
    const payload = createBrandSavePayload(brand, services);
    const { data, error: rpcError } = await supabase.rpc('admin_save_brand', { p_brand: payload.brand, p_services: payload.services, p_submit: submit });
    setSaving(null);
    if (rpcError || typeof data !== 'string') { setError('We could not save this brand. Check the details and try again.'); return; }
    setBrand((current) => ({ ...current, id: data }));
    if (submit) router.push(`/admin/brands/${data}`);
    else { setSuccess('Draft saved.'); router.replace(`/admin/brands/${data}`); }
  };

  return <section className="mx-auto w-full max-w-6xl px-5 py-9 sm:px-8 sm:py-12 lg:px-10">
    <header className="flex flex-col gap-5 border-b border-[#e8e7eb] pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7C3AED]">Brand onboarding</p><h1 className="mt-3 text-[2.15rem] font-semibold tracking-[-0.06em] text-[#151518] sm:text-[2.7rem]">{brand.id ? 'Brand Details' : 'Add Brand'}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#626a7a]">Create a brand record, configure each service independently, and review the live final price.</p></div><div className="rounded-xl border border-[#e7e1f1] bg-[#faf8ff] px-4 py-3"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7657ca]">Final Price for Brand</p><p className="mt-1 text-2xl font-semibold tracking-[-0.05em] text-[#26222d]">{formatCurrency(finalPrice)}</p></div></header>
    {error && <p role="alert" className="mt-5 rounded-xl border border-[#f1d4d7] bg-[#fff8f8] px-4 py-3 text-sm text-[#99404b]">{error}</p>}{success && <p className="mt-5 rounded-xl border border-[#cae8d7] bg-[#f4fbf7] px-4 py-3 text-sm text-[#28734b]">{success}</p>}
    <section className="mt-7 rounded-2xl border border-[#e8e7eb] bg-white p-5 shadow-[0_8px_22px_rgba(33,24,54,0.03)] sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7c3aed]">Section 1</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[#25262b]">Brand Details</h2></div><label className="text-xs font-semibold text-[#575e6b]">Status<select value={brand.status} onChange={(event) => patchBrand('status', event.target.value)} className={`${INPUT_CLASS} mt-0`}><option value="draft">Draft</option><option value="active">Active</option><option value="completed">Completed</option><option value="archived">Archived</option></select></label></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><DetailInput label="Brand / Business Name" required value={brand.brandName} onChange={(value) => patchBrand('brandName', value)} /><DetailInput label="Contact Person" required value={brand.contactPerson} onChange={(value) => patchBrand('contactPerson', value)} /><DetailInput label="Phone Number" required value={brand.phoneNumber} onChange={(value) => patchBrand('phoneNumber', value)} type="tel" /><DetailInput label="Email" required value={brand.email} onChange={(value) => patchBrand('email', value)} type="email" /><DetailInput label="City" required value={brand.city} onChange={(value) => patchBrand('city', value)} /><DetailInput label="Business Category" required value={brand.businessCategory} onChange={(value) => patchBrand('businessCategory', value)} /><DetailInput label="Website" value={brand.website} onChange={(value) => patchBrand('website', value)} placeholder="https://" /><DetailInput label="Instagram" value={brand.instagram} onChange={(value) => patchBrand('instagram', value)} placeholder="@brand" /><DetailInput label="GSTIN" value={brand.gstin} onChange={(value) => patchBrand('gstin', value)} /><div className="sm:col-span-2"><DetailTextArea label="Business Address" value={brand.businessAddress} onChange={(value) => patchBrand('businessAddress', value)} /></div><div className="sm:col-span-2 lg:col-span-1"><DetailTextArea label="Internal Notes" value={brand.internalNotes} onChange={(value) => patchBrand('internalNotes', value)} /></div></div>
    </section>
    <section className="mt-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7c3aed]">Section 2</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[#25262b]">Services</h2><p className="mt-2 text-sm text-[#697080]">Add any number of independently priced service instances.</p></div><div className="flex flex-wrap gap-2">{SERVICE_TYPES.map((type) => <button key={type} type="button" onClick={() => addService(type)} className="min-h-10 rounded-lg border border-[#dcd4ef] bg-white px-3 text-sm font-semibold text-[#6330dc] hover:bg-[#f7f4ff]">+ Add {SERVICE_LABELS[type]}</button>)}</div></div>
      <div className="mt-5 space-y-4">{services.map((service, index) => <ServiceCard key={service.id ?? `${service.serviceType}-${service.serviceOrder}`} service={service} services={services} onUpdate={(patch) => updateService(index, patch)} onRemove={() => removeService(index)} onDuplicate={() => duplicateService(service)} />)}{!services.length && <div className="rounded-2xl border border-dashed border-[#dcd8e4] bg-white px-5 py-12 text-center text-sm text-[#697080]">No services added yet. A brand can be saved without services.</div>}</div>
    </section>
    <div className="sticky bottom-0 mt-8 flex flex-col gap-3 border-t border-[#e8e7eb] bg-[#fffdfc]/95 py-5 backdrop-blur sm:flex-row sm:items-center sm:justify-end"><p className="mr-auto text-sm text-[#697080]">{services.length} service{services.length === 1 ? '' : 's'} · <span className="font-semibold text-[#30333a]">{formatCurrency(finalPrice)}</span></p><button type="button" disabled={saving !== null} onClick={() => void save(false)} className="min-h-11 rounded-lg border border-[#dcd8e4] px-5 text-sm font-semibold text-[#4d5260] disabled:cursor-not-allowed disabled:opacity-60">{saving === 'draft' ? 'Saving…' : 'Save Draft'}</button><button type="button" disabled={saving !== null} onClick={() => void save(true)} className="min-h-11 rounded-lg bg-[#151518] px-5 text-sm font-semibold text-white transition hover:bg-[#2d2f35] disabled:cursor-not-allowed disabled:opacity-60">{saving === 'continue' ? 'Saving…' : 'Save & Continue'}</button></div>
  </section>;
}

export function AdminBrandDetail({ brandId }: { brandId: string }) {
  const [detail, setDetail] = useState<BrandDetail | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) { if (active) setError(true); return; }
      const { data, error: rpcError } = await supabase.rpc('admin_brand_detail', { p_brand_id: brandId });
      if (!active) return;
      if (rpcError || !data) setError(true);
      else setDetail(data as BrandDetail);
    };
    void load();
    return () => { active = false; };
  }, [brandId]);
  if (error) return <section className="mx-auto max-w-6xl px-5 py-10"><p className="rounded-xl border border-[#f1d4d7] bg-[#fff8f8] px-4 py-3 text-sm text-[#99404b]">We could not load this brand.</p></section>;
  if (!detail) return <section className="mx-auto max-w-6xl px-5 py-10"><div className="h-72 animate-pulse rounded-2xl border border-[#e8e7eb] bg-white" /></section>;
  return <AdminBrandEditor initialDetail={detail} />;
}

'use client';

import { useState } from 'react';
import { resolveBrandProposalContent, type BrandProposalContent, type ProposalCard } from '@/lib/brand-proposal-content';
import { getSupabaseClient } from '@/lib/supabase/client';

type TextKey = { [K in keyof BrandProposalContent]: BrandProposalContent[K] extends string ? K : never }[keyof BrandProposalContent];

const fields: { title: string; items: { key: TextKey; label: string; long?: boolean }[] }[] = [
  { title: 'Cover and introduction', items: [
    { key: 'coverEyebrow', label: 'Cover eyebrow' }, { key: 'coverTagline', label: 'Cover headline' },
    { key: 'coverDescription', label: 'Cover description', long: true }, { key: 'coverImageUrl', label: 'Cover image URL' },
    { key: 'coverImageDisclaimer', label: 'Cover image note' }, { key: 'openingStatement', label: 'Opening offer statement', long: true },
  ] },
  { title: 'CloutCo view and opportunity', items: [
    { key: 'viewHeadline', label: 'Positioning headline' }, { key: 'viewBody', label: 'CloutCo view', long: true },
    { key: 'positioningGoal', label: 'Positioning goal', long: true }, { key: 'opportunityHeadline', label: 'Opportunity headline' },
    { key: 'opportunityBody', label: 'Opportunity', long: true },
  ] },
  { title: 'Instagram showcase', items: [
    { key: 'showcaseTitle', label: 'Showcase headline' }, { key: 'showcaseBody', label: 'Showcase description', long: true },
    { key: 'showcaseImageUrl', label: 'Nine-tile image URL' }, { key: 'showcaseImageDisclaimer', label: 'Showcase image note' },
  ] },
];

export function AdminBrandProposalContent({ brandId, brandName, token, initialContent, editingAvailable }: { brandId: string; brandName: string; token: string; initialContent: unknown; editingAvailable: boolean }) {
  const [content, setContent] = useState<BrandProposalContent>(() => resolveBrandProposalContent(brandName, token, initialContent));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const update = (key: TextKey, value: string) => { setContent((current) => ({ ...current, [key]: value })); setMessage(''); };
  const updateCard = (group: 'storyCards' | 'showcasePoints', index: number, key: keyof ProposalCard, value: string) => {
    setContent((current) => ({ ...current, [group]: current[group].map((card, cardIndex) => cardIndex === index ? { ...card, [key]: value } : card) }));
    setMessage('');
  };
  const save = async () => {
    if (!editingAvailable) { setError('Proposal editing is unavailable until the proposal-content database migration is applied.'); return; }
    const supabase = getSupabaseClient();
    if (!supabase) { setError('Admin connection is unavailable.'); return; }
    if ([...content.storyCards, ...content.showcasePoints].some((card) => !card.title.trim() || !card.description.trim())) { setError('Complete every story and showcase card before saving.'); return; }
    setSaving(true); setError(''); setMessage('');
    const { error: saveError } = await supabase.rpc('admin_save_brand_proposal_content', { p_brand_id: brandId, p_content: content });
    setSaving(false);
    if (saveError) setError(saveError.message);
    else setMessage('Proposal content saved. The client link now shows these details.');
  };
  const inputClass = 'mt-1 block w-full rounded-lg border border-[#dcd8e4] bg-white px-3 py-2 text-sm text-[#25262b] focus:border-[#6330dc] focus:outline-none';

  return <section className="mt-7 rounded-2xl border border-[#e8e2da] bg-white p-5 sm:p-7">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-xl font-semibold tracking-[-0.04em]">Proposal content</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#626a7a]">The layout, delivery plan and reporting stay consistent across brands. Edit the story, visual direction and starting option for this client.</p></div><button type="button" onClick={() => void save()} disabled={saving || !editingAvailable} className="min-h-11 rounded-lg bg-[#6330dc] px-5 text-sm font-semibold text-white disabled:opacity-55">{saving ? 'Saving…' : 'Save proposal content'}</button></div>
    {!editingAvailable && <p role="status" className="mt-4 rounded-lg bg-[#fff8ed] px-4 py-3 text-sm text-[#865a16]">Proposal content editing will be available after the database migration is applied.</p>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-[#fff3f3] px-4 py-3 text-sm text-[#99404b]">{error}</p>}{message && <p role="status" className="mt-4 rounded-lg bg-[#f4fbf7] px-4 py-3 text-sm text-[#28734b]">{message}</p>}
    {fields.map((group) => <fieldset key={group.title} className="mt-7 border-t border-[#ece7e3] pt-6"><legend className="sr-only">{group.title}</legend><h3 className="text-base font-semibold">{group.title}</h3><div className="mt-4 grid gap-4 sm:grid-cols-2">{group.items.map(({ key, label, long }) => <label key={key} className={`block text-sm font-medium text-[#4d5260] ${long ? 'sm:col-span-2' : ''}`}>{label}{long ? <textarea value={content[key]} onChange={(event) => update(key, event.target.value)} rows={3} className={inputClass} /> : <input value={content[key]} onChange={(event) => update(key, event.target.value)} className={inputClass} />}</label>)}</div></fieldset>)}
    {(['storyCards', 'showcasePoints'] as const).map((group) => <fieldset key={group} className="mt-7 border-t border-[#ece7e3] pt-6"><legend className="sr-only">{group === 'storyCards' ? 'Opportunity stories' : 'Showcase points'}</legend><h3 className="text-base font-semibold">{group === 'storyCards' ? 'Opportunity stories' : 'Showcase points'}</h3><div className="mt-4 grid gap-4 md:grid-cols-3">{content[group].map((card, index) => <div key={`${group}-${index}`} className="rounded-lg border border-[#ece7e3] p-4"><label className="block text-sm font-medium">Heading<input value={card.title} onChange={(event) => updateCard(group, index, 'title', event.target.value)} className={inputClass} /></label><label className="mt-3 block text-sm font-medium">Details<textarea value={card.description} onChange={(event) => updateCard(group, index, 'description', event.target.value)} rows={4} className={inputClass} /></label></div>)}</div></fieldset>)}
    <fieldset className="mt-7 border-t border-[#ece7e3] pt-6"><legend className="sr-only">Starting price scope</legend><h3 className="text-base font-semibold">Starting price scope</h3><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Base deliverable<input value={content.baseDeliverable} onChange={(event) => setContent((current) => ({ ...current, baseDeliverable: event.target.value }))} className={inputClass} /></label><label className="block text-sm font-medium">CloutCo management fee<select value={content.managementIncludedInStartingPrice === null ? 'pending' : String(content.managementIncludedInStartingPrice)} onChange={(event) => setContent((current) => ({ ...current, managementIncludedInStartingPrice: event.target.value === 'pending' ? null : event.target.value === 'true' }))} className={inputClass}><option value="pending">To be confirmed</option><option value="true">Included in starting price</option><option value="false">Quoted separately</option></select></label></div></fieldset>
    <button type="button" onClick={() => void save()} disabled={saving || !editingAvailable} className="mt-7 min-h-11 rounded-lg bg-[#6330dc] px-5 text-sm font-semibold text-white disabled:opacity-55">{saving ? 'Saving…' : 'Save proposal content'}</button>
  </section>;
}

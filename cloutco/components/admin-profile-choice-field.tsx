'use client';

import { useState } from 'react';
import { creatorTypes, languages, niches, formats, styles } from '@/lib/profile-form-options';
import { SelectTile } from '@/components/profile-select-tile';

export function AdminProfileChoiceField({ field, value, primaryNiche, onChange }: { field: string; value: string; primaryNiche: string; onChange: (value: string) => void }) {
  const [search, setSearch] = useState('');
  const selected = value.split('\n').filter(Boolean);
  const toggle = (option: string) => onChange((selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]).join('\n'));
  if (field === 'creator_type') return <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{creatorTypes.map(([key, label, description]) => <button key={key} type="button" aria-pressed={value === key} onClick={() => onChange(key)} className={`min-h-[118px] rounded-xl border p-4 text-left transition ${value === key ? 'border-[#7440f4] bg-[#f8f3ff] ring-1 ring-[#7440f4]' : 'border-[#e1e2e9] bg-white hover:border-[#cbbcf1]'}`}><span className="block text-sm font-semibold">{label}</span><span className="mt-2 block text-xs font-normal text-[#626a7a]">{description}</span></button>)}</div>;
  const options = field === 'languages' ? languages : field === 'content_formats' ? formats : field === 'content_styles' ? styles : niches;
  const limit = field === 'other_niches' || field === 'content_styles' ? 5 : undefined;
  const visible = [...new Set([...options, ...selected])].filter((option) => option.toLowerCase().includes(search.toLowerCase()) && (field !== 'other_niches' || option !== primaryNiche));
  return <div className="mt-3 space-y-3">
    {(field === 'languages' || field === 'other_niches') && <div className="flex flex-wrap gap-2">{selected.map((option) => <button key={option} type="button" aria-label={`Remove ${option}`} onClick={() => toggle(option)} className="rounded-full bg-[#f1eaff] px-3 py-1.5 text-xs text-[#6330dc]">{option} ×</button>)}</div>}
    {['languages', 'primary_niche', 'other_niches'].includes(field) && <input aria-label={field === 'languages' ? 'Search languages' : 'Search niches'} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={field === 'languages' ? 'Search and select languages…' : 'Search niches…'} className="min-h-11 w-full rounded-xl border border-[#dfe1e8] px-3 text-sm font-normal outline-none focus:border-[#8a62e5]" />}
    {limit && <p className="text-xs font-normal text-[#626a7a]">Select up to {limit} ({selected.length}/{limit} selected)</p>}
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{visible.map((option) => <SelectTile key={option} label={option} selected={selected.includes(option)} onClick={() => { if (field === 'primary_niche') onChange(option); else if (!limit || selected.includes(option) || selected.length < limit) toggle(option); }} />)}</div>
    {!visible.length && <p className="text-sm font-normal text-[#626a7a]">No matching options.</p>}
  </div>;
}

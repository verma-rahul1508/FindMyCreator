'use client';

import { useEffect, useMemo, useState } from 'react';

const AGE_RANGES = ['13–17', '18–24', '25–34', '35–44', '45–54', '55–64', '65+'];

type City = { value: string; detail?: string };

function NumberField({ label, value, onChange, percent = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  percent?: boolean;
}) {
  return <label className="block">
    <span className="text-sm font-semibold text-[#292532]">{label} <span className="text-[#6a35df]">*</span></span>
    <div className="relative mt-2">
      <input value={value} inputMode="decimal" onChange={(event) => onChange(event.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))} placeholder="Enter value" className="min-h-11 w-full rounded-lg border border-[#dfe1e8] bg-white px-3.5 pr-9 text-sm outline-none focus:border-[#8760df]" />
      {percent && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#747b89]">%</span>}
    </div>
  </label>;
}

function CityPicker({ selected, onChange }: { selected: string[]; onChange: (cities: string[]) => void }) {
  const [value, setValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [cities, setCities] = useState<City[] | null>(null);

  useEffect(() => {
    if (!isOpen || cities) return;
    void import('country-state-city').then(({ City, State }) => {
      const states = new Map((State.getStatesOfCountry('IN') || []).map((state) => [state.isoCode, state.name]));
      setCities((City.getCitiesOfCountry('IN') || []).map((city) => ({ value: city.name, detail: states.get(city.stateCode) || city.stateCode || 'India' })));
    });
  }, [cities, isOpen]);

  const options = useMemo(() => {
    const query = value.trim().toLocaleLowerCase('en-IN');
    if (!query || !cities) return [];
    return cities
      .filter((city) => `${city.value} ${city.detail || ''}`.toLocaleLowerCase('en-IN').includes(query))
      .filter((city) => !selected.some((name) => name.toLocaleLowerCase('en-IN') === city.value.toLocaleLowerCase('en-IN')))
      .slice(0, 8);
  }, [cities, selected, value]);

  const add = (city: string) => {
    const name = city.trim();
    if (!name || selected.length >= 5 || selected.some((item) => item.toLocaleLowerCase('en-IN') === name.toLocaleLowerCase('en-IN'))) return;
    onChange([...selected, name]);
    setValue('');
    setIsOpen(false);
  };

  return <div>
    <div className="flex flex-wrap gap-2">{selected.map((city) => <span key={city} className="inline-flex items-center gap-1.5 rounded-full bg-[#f0eaff] px-3 py-1.5 text-sm font-medium text-[#5124b9]">{city}<button type="button" onClick={() => onChange(selected.filter((item) => item !== city))} aria-label={`Remove ${city}`} className="text-[#5124b9] hover:opacity-60">×</button></span>)}</div>
    {selected.length < 5 && <div className="relative mt-2"><input value={value} onFocus={() => setIsOpen(true)} onBlur={() => window.setTimeout(() => setIsOpen(false), 150)} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); add(value); } }} placeholder="Search or add a city / town" autoComplete="off" className="min-h-11 w-full rounded-lg border border-[#dfe1e8] px-3.5 text-sm outline-none focus:border-[#8760df]" />{isOpen && value.trim() && <div className="absolute left-0 top-full z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-[#ded7eb] bg-white p-1 shadow-[0_10px_24px_rgba(54,38,90,0.14)]">{options.length ? options.map((city) => <button key={`${city.value}-${city.detail || ''}`} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => add(city.value)} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#f5f1ff]"><span className="block font-medium">{city.value}</span>{city.detail && <span className="block text-xs text-[#71798a]">{city.detail}</span>}</button>) : <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => add(value)} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#f5f1ff]">Add “{value.trim()}”</button>}</div>}</div>}
    <p className="mt-2 text-xs text-[#747b89]">Select up to 5 cities or towns.</p>
  </div>;
}

type InstagramEditorAccount = {
  id: string;
  profileUrl: string;
  username: string;
  audienceCount: string;
  isPrimary: boolean;
  instagramInsights?: {
    overview: Record<string, string>;
    audience: { women: string; men: string; topAgeRanges: string[]; topCities: string[] };
  };
};

type InstagramEditorProps = {
  account: InstagramEditorAccount;
  errors: Record<string, string>;
  // This component is intentionally structurally compatible with the social page's full account type.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (changes: any) => void;
  onPrimaryToggle: (checked: boolean) => void;
  onRemoveRequest: () => void;
};

export function InstagramAnalyticsEditor({ account, errors, onChange, onPrimaryToggle, onRemoveRequest }: InstagramEditorProps) {
  const insights = account.instagramInsights ?? { overview: { views: '', netFollowers: '', interactions: '', viewersTotal: '', profileVisits: '' }, audience: { women: '', men: '', topAgeRanges: [], topCities: [] } };
  const [expanded, setExpanded] = useState(true);
  const updateOverview = (key: string, value: string) => onChange({ instagramInsights: { ...insights, overview: { ...insights.overview, [key]: value } } });
  const updateAudience = (key: string, value: string[]) => onChange({ instagramInsights: { ...insights, audience: { ...insights.audience, [key]: value } } });
  const topAgeRanges: string[] = insights.audience.topAgeRanges || [];

  return <section className="rounded-2xl border border-[#e1dcef] bg-[#fcfbff] shadow-[0_8px_22px_rgba(70,45,120,0.035)]">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ece8f2] p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#c6328b] text-sm font-bold text-white">◎</span><div><div className="flex items-center gap-2"><h2 className="text-lg font-semibold">Instagram</h2>{account.isPrimary && <span className="rounded-full bg-[#eee7ff] px-2 py-0.5 text-xs font-semibold text-[#6331d9]">Primary</span>}</div><p className="text-sm text-[#687082]">Add your profile and current Instagram insights.</p></div></div><button type="button" onClick={() => setExpanded(!expanded)} className="text-sm font-semibold text-[#6331d9]">{expanded ? 'Collapse' : 'Expand'}</button></div>
    {expanded && <div className="space-y-7 p-5 sm:p-6">
      <div className="grid gap-4 md:grid-cols-2"><label className="block"><span className="text-sm font-semibold">Profile URL <span className="text-[#6a35df]">*</span></span><input value={account.profileUrl} onChange={(event) => onChange({ profileUrl: event.target.value })} placeholder="https://instagram.com/username" className="mt-2 min-h-11 w-full rounded-lg border border-[#dfe1e8] px-3.5 text-sm outline-none focus:border-[#8760df]" /></label><label className="block"><span className="text-sm font-semibold">Username</span><input value={account.username} onChange={(event) => onChange({ username: event.target.value })} placeholder="@username" className="mt-2 min-h-11 w-full rounded-lg border border-[#dfe1e8] px-3.5 text-sm outline-none focus:border-[#8760df]" /></label><NumberField label="Followers" value={account.audienceCount} onChange={(audienceCount) => onChange({ audienceCount })} /></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[#ece8f2] py-4"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={account.isPrimary} onChange={(event) => onPrimaryToggle(event.target.checked)} className="h-4 w-4 accent-[#6a35df]" />Primary platform</label><button type="button" onClick={onRemoveRequest} className="text-sm font-semibold text-[#b22836]">Remove</button></div>
      {account.isPrimary && <><section><h3 className="text-base font-semibold">Overview</h3><p className="mt-1 text-sm text-[#677082]">Important: Open your Instagram profile in the app → tap Professional Dashboard → open Insights. Enter data for the last 30 days in the form below.</p><div className="mt-4 grid gap-4 sm:grid-cols-3"><NumberField label="Views" value={insights.overview.views} onChange={(value) => updateOverview('views', value)} /><NumberField label="Net Followers" value={insights.overview.netFollowers} onChange={(value) => updateOverview('netFollowers', value)} /><NumberField label="Interactions" value={insights.overview.interactions} onChange={(value) => updateOverview('interactions', value)} /></div></section><section><h3 className="text-base font-semibold">Viewers</h3><div className="mt-4 max-w-sm"><NumberField label="Viewers (Total)" value={insights.overview.viewersTotal} onChange={(value) => updateOverview('viewersTotal', value)} /></div></section><section><h3 className="text-base font-semibold">Profile Activity</h3><div className="mt-4 max-w-sm"><NumberField label="Profile Visits" value={insights.overview.profileVisits} onChange={(value) => updateOverview('profileVisits', value)} /></div></section><section><h3 className="text-base font-semibold">Audience</h3><div className="mt-4 grid gap-4 sm:grid-cols-2"><NumberField label="Women" percent value={insights.audience.women} onChange={(value) => onChange({ instagramInsights: { ...insights, audience: { ...insights.audience, women: value } } })} /><NumberField label="Men" percent value={insights.audience.men} onChange={(value) => onChange({ instagramInsights: { ...insights, audience: { ...insights.audience, men: value } } })} /></div><div className="mt-5"><p className="text-sm font-semibold">Top Age Ranges <span className="text-[#6a35df]">*</span></p><div className="mt-2 flex flex-wrap gap-2">{AGE_RANGES.map((range) => { const selected = topAgeRanges.includes(range); return <button key={range} type="button" onClick={() => updateAudience('topAgeRanges', selected ? topAgeRanges.filter((item) => item !== range) : topAgeRanges.length < 2 ? [...topAgeRanges, range] : topAgeRanges)} className={`rounded-full border px-3 py-1.5 text-sm font-medium ${selected ? 'border-[#6a35df] bg-[#f0eaff] text-[#5124b9]' : 'border-[#dfe1e8] bg-white text-[#555b68]'}`}>{range}</button>; })}</div><p className="mt-2 text-xs text-[#747b89]">Select 1–2 age ranges.</p></div><div className="mt-5"><p className="text-sm font-semibold">Top Cities/Towns <span className="text-[#6a35df]">*</span></p><div className="mt-2"><CityPicker selected={insights.audience.topCities || []} onChange={(cities) => updateAudience('topCities', cities)} /></div></div></section></>}
      <p role="alert" className="text-sm font-medium text-[#b22836]">{errors[`${account.id}-url`] || errors[`${account.id}-count`] || errors[`${account.id}-instagram`]}</p>
    </div>}
  </section>;
}

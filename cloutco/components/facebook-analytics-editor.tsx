'use client';

import { useEffect, useMemo, useState } from 'react';

const AGE_GROUPS = ['18–24', '25–34', '35–44', 'Other'] as const;

type City = { value: string; detail?: string };

type FacebookInsights = {
  period: '7' | '28' | '90';
  overview: { viewsTotal: string; viewers: string };
  engagement: { total: string };
  audience: { netFollowers: string; women: string; men: string; topAgeGroup?: string; topCities?: string[] };
};

type FacebookEditorAccount = {
  id: string;
  profileUrl: string;
  username: string;
  audienceCount: string;
  isPrimary: boolean;
  facebookInsights?: FacebookInsights;
};

type FacebookAnalyticsEditorProps = {
  account: FacebookEditorAccount;
  errors: Record<string, string>;
  onChange: (changes: Partial<FacebookEditorAccount>) => void;
  onPrimaryToggle: (checked: boolean) => void;
  onRemoveRequest: () => void;
};

function NumberField({ label, value, onChange, required = true, percent = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  percent?: boolean;
}) {
  return <label className="block">
    <span className="text-sm font-semibold text-[#292532]">{label}{required && <span className="text-[#6a35df]"> *</span>}</span>
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
    void import('country-state-city')
      .then(({ City, State }) => {
        const states = new Map((State.getStatesOfCountry('IN') || []).map((state) => [state.isoCode, state.name]));
        setCities((City.getCitiesOfCountry('IN') || []).map((city) => ({ value: city.name, detail: states.get(city.stateCode) || city.stateCode || 'India' })));
      })
      .catch(() => setCities([]));
  }, []);

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
    {selected.length < 5 && <div className="relative mt-2"><input value={value} onFocus={() => setIsOpen(true)} onBlur={() => window.setTimeout(() => setIsOpen(false), 150)} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); add(value); } }} placeholder="Search or add a city / town" autoComplete="off" className="min-h-11 w-full rounded-lg border border-[#dfe1e8] px-3.5 text-sm outline-none focus:border-[#8760df]" />{isOpen && value.trim() && <div className="absolute left-0 top-full z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-[#ded7eb] bg-white p-1 shadow-[0_10px_24px_rgba(54,38,90,0.14)]">{cities === null ? <p className="px-3 py-2 text-sm text-[#71798a]">Loading city suggestions…</p> : options.length ? options.map((city) => <button key={`${city.value}-${city.detail || ''}`} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => add(city.value)} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#f5f1ff]"><span className="block font-medium">{city.value}</span>{city.detail && <span className="block text-xs text-[#71798a]">{city.detail}</span>}</button>) : <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => add(value)} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#f5f1ff]">Add “{value.trim()}”</button>}</div>}</div>}
    <p className="mt-2 text-xs text-[#747b89]">Select 1–5 cities or towns.</p>
  </div>;
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[#e7e4ec] bg-white p-5 shadow-[0_5px_18px_rgba(50,40,80,0.025)] sm:p-6"><div className="flex gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f0eaff] text-sm font-semibold text-[#6430dc]">{number}</span><h2 className="pt-2 text-lg font-semibold tracking-[-0.03em]">{title}</h2></div><div className="mt-6">{children}</div></section>;
}

export function FacebookAnalyticsEditor({ account, errors, onChange, onPrimaryToggle, onRemoveRequest }: FacebookAnalyticsEditorProps) {
  const insights = account.facebookInsights || { period: '28' as const, overview: { viewsTotal: '', viewers: '' }, engagement: { total: '' }, audience: { netFollowers: '', women: '', men: '', topAgeGroup: '', topCities: [] } };
  const topAgeGroup = insights.audience.topAgeGroup || '';
  const topCities = insights.audience.topCities || [];
  const [expanded, setExpanded] = useState(true);
  const updateInsights = (changes: Partial<FacebookInsights>) => onChange({ facebookInsights: { ...insights, ...changes } });
  const updateOverview = (changes: Partial<FacebookInsights['overview']>) => updateInsights({ overview: { ...insights.overview, ...changes } });
  const updateEngagement = (changes: Partial<FacebookInsights['engagement']>) => updateInsights({ engagement: { ...insights.engagement, ...changes } });
  const updateAudience = (changes: Partial<FacebookInsights['audience']>) => updateInsights({ audience: { ...insights.audience, ...changes } });

  return <section className="rounded-2xl border border-[#e2dff0] bg-[#fcfbff] p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece9f2] pb-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#1877f2] text-lg font-bold text-white">f</span><div><div className="flex items-center gap-2"><h2 className="text-lg font-semibold">Facebook</h2>{account.isPrimary && <span className="rounded-full bg-[#f0eaff] px-2 py-0.5 text-[0.62rem] font-semibold tracking-[0.08em] text-[#6330dc]">PRIMARY</span>}</div><p className="mt-0.5 text-sm text-[#697183]">Add your Facebook profile and analytics.</p></div></div><div className="flex items-center gap-1"><button type="button" onClick={onRemoveRequest} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-[#a83a46] hover:bg-[#fff1f2]">Remove</button><button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} aria-label={`${expanded ? 'Collapse' : 'Expand'} Facebook form`} className="grid h-9 w-9 place-items-center rounded-lg text-[#625b72] hover:bg-[#f4f0fb]"><svg viewBox="0 0 24 24" aria-hidden="true" className={`h-4 w-4 fill-none stroke-current stroke-2 transition-transform ${expanded ? 'rotate-180' : ''}`}><path d="m7 9 5 5 5-5" /></svg></button></div></div>{expanded && <div className="space-y-4 pt-5"><Section number="1" title="Profile information"><div className="grid gap-4 sm:grid-cols-3"><label><span className="text-sm font-semibold">Profile URL <span className="text-[#6a35df]">*</span></span><input value={account.profileUrl} onChange={(event) => onChange({ profileUrl: event.target.value })} placeholder="https://www.facebook.com/yourpage" className="mt-2 min-h-11 w-full rounded-xl border border-[#dfe1e8] px-3.5 text-sm outline-none focus:border-[#8760df]" /><p role="alert" className="mt-3 text-sm font-medium text-[#b22836]">{errors[`${account.id}-url`]}</p></label><label><span className="text-sm font-semibold">Username / Handle</span><input value={account.username} onChange={(event) => onChange({ username: event.target.value })} placeholder="@yourhandle" className="mt-2 min-h-11 w-full rounded-xl border border-[#dfe1e8] px-3.5 text-sm outline-none focus:border-[#8760df]" /></label><div><NumberField label="Followers" value={account.audienceCount} onChange={(audienceCount) => onChange({ audienceCount })} /><p role="alert" className="mt-3 text-sm font-medium text-[#b22836]">{errors[`${account.id}-count`]}</p></div></div><label className="mt-5 flex cursor-pointer items-center gap-3"><input type="checkbox" checked={account.isPrimary} onChange={(event) => onPrimaryToggle(event.target.checked)} className="h-4 w-4 rounded accent-[#6731dc]" /><span className="text-sm font-medium">This is my primary platform</span></label></Section>{account.isPrimary && <><Section number="2" title="Overview / Insights"><div className="rounded-xl border border-[#d9c8f4] bg-[#f6f0ff] p-4 text-sm leading-6 text-[#332a42]"><strong>Important:</strong> Open your Facebook Page in the app → open Professional Dashboard → tap Insights. Enter data for the last 28 days in the form below.</div><div className="mt-5 grid gap-4 sm:grid-cols-2"><NumberField label="Views" value={insights.overview.viewsTotal} onChange={(viewsTotal) => updateOverview({ viewsTotal })} /><NumberField label="Viewers" value={insights.overview.viewers} onChange={(viewers) => updateOverview({ viewers })} /></div></Section><Section number="3" title="Engagement"><div className="max-w-sm"><NumberField label="Engagement" value={insights.engagement.total} onChange={(total) => updateEngagement({ total })} /></div></Section><Section number="4" title="Audience"><div className="max-w-sm"><NumberField label="Net Followers" value={insights.audience.netFollowers} onChange={(netFollowers) => updateAudience({ netFollowers })} /></div><div className="mt-7"><h3 className="text-base font-semibold">Gender</h3><div className="mt-4 grid gap-4 sm:grid-cols-2"><NumberField label="Women" percent value={insights.audience.women} onChange={(women) => updateAudience({ women })} /><NumberField label="Men" percent value={insights.audience.men} onChange={(men) => updateAudience({ men })} /></div></div><div className="mt-7"><h3 className="text-base font-semibold">Age Group <span className="text-[#6a35df]">*</span></h3><div className="mt-3 flex flex-wrap gap-2">{AGE_GROUPS.map((ageGroup) => { const selected = topAgeGroup === ageGroup; return <button key={ageGroup} type="button" onClick={() => updateAudience({ topAgeGroup: selected ? '' : ageGroup })} className={`rounded-full border px-3 py-1.5 text-sm font-medium ${selected ? 'border-[#6a35df] bg-[#f0eaff] text-[#5124b9]' : 'border-[#dfe1e8] bg-white text-[#555b68]'}`}>{ageGroup}</button>; })}</div><p className="mt-2 text-xs text-[#747b89]">Select exactly one age group.</p></div><div className="mt-7"><h3 className="text-base font-semibold">Location <span className="text-[#6a35df]">*</span></h3><p className="mt-1 text-sm text-[#687082]">Add cities or towns only.</p><div className="mt-3"><CityPicker selected={topCities} onChange={(topCities) => updateAudience({ topCities })} /></div></div></Section></>}<p role="alert" className="text-sm font-medium text-[#b22836]">{errors[`${account.id}-facebook`]}</p></div>}</section>;
}

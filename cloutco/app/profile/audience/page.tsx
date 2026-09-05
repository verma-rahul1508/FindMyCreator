'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

type Platform = 'Instagram' | 'YouTube' | 'Facebook' | 'TikTok' | 'Snapchat' | 'LinkedIn' | 'Pinterest' | 'X' | 'Other';
type SocialAccount = { id: string; platform: Platform; platformName?: string };
type Location = { id: string; name: string; percentage: string; city?: string; state?: string; stateCode?: string; country?: string; countryCode?: string };
type LocationOption = { id: string; city: string; state: string; stateCode: string; country: string; countryCode: string; name: string };
type AgeGroup = '13–17' | '18–24' | '25–34' | '35–44' | '45–54' | '55–64' | '65+';
type AudienceDataset = { locations: Location[]; ages: Record<AgeGroup, string>; genders: Record<'Women' | 'Men', string> };
type AudienceDraft = Record<string, AudienceDataset>;
type Errors = Record<string, string>;

const socialStorageKey = 'cloutco-social-platforms-draft';
const audienceStorageKey = 'cloutco-audience-draft';
const ageGroups: AgeGroup[] = ['13–17', '18–24', '25–34', '35–44', '45–54', '55–64', '65+'];
const createDataset = (): AudienceDataset => ({
  locations: [],
  ages: { '13–17': '', '18–24': '', '25–34': '', '35–44': '', '45–54': '', '55–64': '', '65+': '' },
  genders: { Women: '', Men: '' },
});

type IconName = 'home' | 'user' | 'message' | 'settings' | 'bell' | 'check' | 'search' | 'plus' | 'close' | 'lightbulb' | 'location' | 'users' | 'chart' | 'arrow';
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3.5 10 8.5-7 8.5 7" /><path d="M5.5 9v10h13V9M9.5 19v-5h5v5" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 20c.5-3.4 2.8-5 7-5s6.5 1.6 7 5" /></>,
    message: <><path d="M5 6.5h14v9H9l-4 3v-12Z" /><path d="M8 10h8M8 13h5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19 13.2a7.6 7.6 0 0 0 0-2.4l2-1.5-2-3.4-2.4 1a8 8 0 0 0-2-1.2L14.3 3h-4.6l-.4 2.7a8 8 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 2.4l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 2 1.2l.4 2.7h4.6l.4-2.7a8 8 0 0 0 2-1.2l2.4 1 2-3.4-2-1.5Z" /></>,
    bell: <><path d="M6.5 16.5h11l-1.2-1.8V10a4.3 4.3 0 0 0-8.6 0v4.7l-1.2 1.8Z" /><path d="M10 19h4" /></>,
    check: <><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    search: <><circle cx="10.5" cy="10.5" r="5" /><path d="m14.2 14.2 4 4" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    lightbulb: <><path d="M9 18h6M10 21h4" /><path d="M8.2 15.6C6.8 14.4 6 12.7 6 11a6 6 0 1 1 12 0c0 1.7-.8 3.4-2.2 4.6-.6.5-.8 1.1-.8 1.8H9c0-.7-.2-1.3-.8-1.8Z" /></>,
    location: <><path d="M19 10c0 5-7 10-7 10S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.3" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20c.5-3.5 2.4-5.5 5.5-5.5s5 2 5.5 5.5" /><path d="M16.5 5.5a2.7 2.7 0 0 1 0 5.3M16 14.7c2.5.2 4 1.9 4.5 4.3" /></>,
    chart: <><path d="M4 19V5M4 19h16" /><path d="m7 15 3.6-4 3 2.2L20 6" /></>,
    arrow: <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.65]">{paths[name]}</svg>;
}

function PlatformGlyph({ platform }: { platform: Platform }) {
  if (platform === 'Instagram') return <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#c6328b] text-white"><svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="3.6" /><circle cx="17.4" cy="6.8" r=".8" className="fill-current stroke-none" /></svg></span>;
  if (platform === 'YouTube') return <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#ef2323] text-white"><svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M21 8.2a2.7 2.7 0 0 0-1.9-1.9C17.4 5.8 12 5.8 12 5.8s-5.4 0-7.1.5A2.7 2.7 0 0 0 3 8.2 28 28 0 0 0 2.5 12c0 1.3.2 2.6.5 3.8a2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.1.5 7.1.5s5.4 0 7.1-.5a2.7 2.7 0 0 0 1.9-1.9c.3-1.2.5-2.5.5-3.8s-.2-2.6-.5-3.8Z" /><path d="m10 15.2 5-3.2-5-3.2v6.4Z" className="fill-white" /></svg></span>;
  return <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#6a35df] text-xs font-bold text-white">{platform === 'Other' ? '+' : platform.slice(0, 1)}</span>;
}

function ProgressCard() {
  const steps = [['Basic Information', 'Personal details', 'done'], ['Creator Identity', 'Your creator persona', 'done'], ['Content & Niche', 'What you create', 'done'], ['Social Platforms', 'Where you create', 'done'], ['Audience', 'Your audience insights', 'current'], ['Portfolio', 'Showcase your work', ''], ['Performance', 'Optional', '']];
  return <aside className="order-2 rounded-2xl border border-[#e8e7eb] bg-white p-5 shadow-[0_7px_20px_rgba(50,40,80,0.03)] xl:order-1 xl:sticky xl:top-5"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Complete your profile</h2><span className="text-xs text-[#596177]">5 of 7</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ececf1]"><span className="block h-full w-[71%] rounded-full bg-[#7034e8]" /></div><ol className="mt-5 space-y-1.5">{steps.map(([title, subtitle, state], index) => <li key={title} className={`flex items-center gap-3 rounded-xl px-2 py-2 ${state === 'current' ? 'bg-[#f3efff]' : ''}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${state === 'done' ? 'bg-[#57b8ae] text-white' : state === 'current' ? 'bg-[#6731dc] text-white shadow-[0_5px_12px_rgba(103,49,220,0.22)]' : 'border border-[#ccd1dd] bg-white text-[#495162]'}`}>{state === 'done' ? '✓' : index + 1}</span><span><strong className="block text-xs font-medium">{title}</strong><small className="block text-[0.66rem] text-[#677082]">{subtitle}</small></span></li>)}</ol></aside>;
}

function StepHeading({ value, title, children }: { value: string; title: string; children: ReactNode }) {
  return <div className="flex gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f0eaff] text-sm font-semibold text-[#6430dc] shadow-[0_5px_14px_rgba(99,48,220,0.08)]">{value}</span><div><h2 className="text-base font-semibold">{title}</h2><p className="mt-1 text-sm leading-5 text-[#677082]">{children}</p></div></div>;
}

function Total({ label, value, error }: { label: string; value: number; error?: string }) {
  return <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#eceaf1] pt-4"><p className="text-sm font-medium text-[#353944]">{label}: <span className="text-[#6731dc]">{formatPercent(value)}%</span></p>{error && <p role="alert" className="text-sm font-medium text-[#b22836]">{error}</p>}</div>;
}

const numberValue = (value: string) => value.trim() === '' ? 0 : Number(value);
const isValidPercentage = (value: string) => Number.isFinite(numberValue(value)) && numberValue(value) >= 0 && numberValue(value) <= 100;
const totalValues = (values: string[]) => values.reduce((sum, value) => sum + numberValue(value), 0);
const formatPercent = (value: number) => Number.isInteger(value) ? value.toString() : value.toFixed(1).replace(/\.0$/, '');

export default function AudiencePage() {
  const router = useRouter();
  const [profileName, setProfileName] = useState('Creator');
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [drafts, setDrafts] = useState<AudienceDraft>({});
  const [locationSearch, setLocationSearch] = useState('');
  const [indiaLocations, setIndiaLocations] = useState<LocationOption[] | null>(null);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) { router.replace('/signin'); return; }
    void supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/signin'); return; }
      const name = data.user.user_metadata?.full_name || data.user.email?.split('@')[0];
      if (name) setProfileName(name);
      try {
        const savedAccounts = JSON.parse(window.sessionStorage.getItem(socialStorageKey) || '[]') as SocialAccount[];
        if (Array.isArray(savedAccounts)) {
          const usable = savedAccounts.filter((account) => account?.id && account?.platform);
          setAccounts(usable);
          setSelectedId(usable[0]?.id || '');
        }
        const savedDrafts = JSON.parse(window.sessionStorage.getItem(audienceStorageKey) || '{}') as AudienceDraft;
        if (savedDrafts && typeof savedDrafts === 'object' && !Array.isArray(savedDrafts)) setDrafts(savedDrafts);
      } catch { window.sessionStorage.removeItem(audienceStorageKey); }
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    if (!locationSearch.trim() || indiaLocations) return;
    let cancelled = false;
    setLocationsLoading(true);
    void import('country-state-city').then(({ City, State }) => {
      if (cancelled) return;
      const states = new Map((State.getStatesOfCountry('IN') || []).map((state) => [state.isoCode, state.name]));
      const locations = (City.getCitiesOfCountry('IN') || []).map((city) => {
        const state = states.get(city.stateCode) || city.stateCode;
        return {
          id: `IN:${city.stateCode}:${city.name.toLocaleLowerCase('en-IN')}`,
          city: city.name,
          state,
          stateCode: city.stateCode,
          country: 'India',
          countryCode: 'IN',
          name: `${city.name}, ${state}, India`,
        };
      });
      setIndiaLocations(locations);
      setLocationsLoading(false);
    }).catch(() => {
      if (!cancelled) setLocationsLoading(false);
    });
    return () => { cancelled = true; };
  }, [indiaLocations, locationSearch]);

  const selectedAccount = accounts.find((account) => account.id === selectedId);
  const current = selectedId ? drafts[selectedId] || createDataset() : createDataset();
  const locationTotal = totalValues(current.locations.map((location) => location.percentage));
  const ageTotal = totalValues(ageGroups.map((group) => current.ages[group]));
  const genderTotal = totalValues(Object.values(current.genders));
  const initials = profileName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const suggestions = useMemo(() => {
    const query = locationSearch.trim().toLocaleLowerCase('en-IN');
    if (!query || !indiaLocations) return [];
    const score = (location: LocationOption) => {
      const city = location.city.toLocaleLowerCase('en-IN');
      const state = location.state.toLocaleLowerCase('en-IN');
      if (city === query) return 0;
      if (city.startsWith(query)) return 1;
      if (state === query) return 2;
      if (state.startsWith(query)) return 3;
      return 4;
    };
    return indiaLocations
      .filter((location) => !current.locations.some((item) => item.id === location.id) && `${location.city} ${location.state} India`.toLocaleLowerCase('en-IN').includes(query))
      .sort((left, right) => score(left) - score(right) || left.city.localeCompare(right.city, 'en-IN'))
      .slice(0, 10);
  }, [current.locations, indiaLocations, locationSearch]);

  const updateCurrent = (update: (dataset: AudienceDataset) => AudienceDataset) => {
    if (!selectedId) return;
    setDrafts((existing) => ({ ...existing, [selectedId]: update(existing[selectedId] || createDataset()) }));
  };
  const addLocation = (location: LocationOption) => {
    if (!selectedId || current.locations.length >= 10 || current.locations.some((item) => item.id === location.id)) return;
    updateCurrent((dataset) => ({ ...dataset, locations: [...dataset.locations, { ...location, percentage: '' }] }));
    setLocationSearch('');
    setErrors((existing) => ({ ...existing, locations: '' }));
  };
  const setPercentage = (section: 'location' | 'age' | 'gender', key: string, value: string) => {
    const clean = value.replace(/[^0-9.]/g, '');
    if (section === 'location') updateCurrent((dataset) => ({ ...dataset, locations: dataset.locations.map((location) => location.id === key ? { ...location, percentage: clean } : location) }));
    if (section === 'age') updateCurrent((dataset) => ({ ...dataset, ages: { ...dataset.ages, [key]: clean } }));
    if (section === 'gender') updateCurrent((dataset) => ({ ...dataset, genders: { ...dataset.genders, [key]: clean } }));
    setErrors((existing) => ({ ...existing, [section]: '' }));
  };
  const removeLocation = (id: string) => updateCurrent((dataset) => ({ ...dataset, locations: dataset.locations.filter((location) => location.id !== id) }));
  const locationError = !current.locations.every((location) => isValidPercentage(location.percentage)) || locationTotal > 100 ? 'Location percentages cannot exceed 100%.' : '';
  const ageError = !ageGroups.every((group) => isValidPercentage(current.ages[group])) || ageTotal > 100 ? 'Age percentages cannot exceed 100%.' : ageTotal !== 100 ? 'Age percentages must total 100%.' : '';
  const genderError = !Object.values(current.genders).every(isValidPercentage) || genderTotal > 100 ? 'Gender percentages cannot exceed 100%.' : genderTotal !== 100 ? 'Gender percentages must total 100%.' : '';
  const persist = () => window.sessionStorage.setItem(audienceStorageKey, JSON.stringify(drafts));
  const validate = () => {
    const next: Errors = {};
    if (!selectedId) next.source = 'Select a social platform to add audience information.';
    if (!current.locations.length) next.locations = 'Add at least one audience location.';
    if (locationError) next.location = locationError;
    if (ageError) next.age = ageError;
    if (genderError) next.gender = genderError;
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const saveAndExit = () => { persist(); router.push('/profile'); };
  const saveAndContinue = () => {
    setNotice('');
    if (!validate()) { setNotice('Please complete the audience information before continuing.'); return; }
    persist();
    window.sessionStorage.setItem('cloutco-audience-complete', 'true');
    router.push('/profile/portfolio');
  };

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#fbfaff] text-sm text-[#5b6272]">Loading your audience details...</main>;

  return <main className="min-h-screen bg-[#fbfaff] text-[#17171b]"><header className="flex h-[76px] items-center justify-between border-b border-[#e8e7eb] bg-white px-5 sm:px-8 lg:px-10"><Link href="/" className="text-[1.45rem] font-semibold tracking-[-0.08em] text-black sm:text-[1.7rem]">CloutCo</Link><div className="flex items-center gap-4 sm:gap-6"><button type="button" aria-label="Notifications" className="text-[#4e5667]"><Icon name="bell" /></button><span className="hidden h-8 w-px bg-[#e7e7eb] sm:block" /><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#eee8ff] text-xs font-semibold text-[#6330dc]">{initials}</span><span className="hidden text-sm font-medium sm:block">{profileName}</span><span className="hidden text-[#626a7a] sm:block">⌄</span></div></div></header><div className="mx-auto flex max-w-[1600px]"><aside className="hidden w-[205px] shrink-0 border-r border-[#e8e7eb] bg-white px-5 py-7 lg:block"><nav className="space-y-1.5" aria-label="Creator navigation"><Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#343946] hover:bg-[#faf8ff]"><Icon name="home" />Dashboard</Link><Link href="/profile" className="flex items-center gap-3 rounded-xl bg-[#f1ebff] px-3 py-3 text-sm font-medium text-[#6330dc]"><Icon name="user" />My Profile</Link><a href="#messages" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#343946] hover:bg-[#faf8ff]"><Icon name="message" />Messages</a><a href="#settings" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#343946] hover:bg-[#faf8ff]"><Icon name="settings" />Settings</a></nav><div className="mt-32 rounded-2xl border border-[#e8e0fa] bg-[#fbf9ff] p-4"><p className="text-base font-semibold leading-5">Create<br />Collaborate<br />Grow <span className="text-[#6932e8]">↗</span></p><p className="mt-4 text-xs leading-5 text-[#60697a]">Your creator profile, all in one place.</p></div></aside><div className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12"><div className="grid gap-6 xl:grid-cols-[250px_minmax(0,1fr)_260px] xl:items-start"><ProgressCard /><section className="order-1 min-w-0 rounded-2xl border border-[#e8e7eb] bg-white p-5 shadow-[0_7px_20px_rgba(50,40,80,0.03)] sm:p-8 xl:order-2"><p className="text-xs font-bold tracking-[0.14em] text-[#6a35df]">AUDIENCE</p><h1 className="mt-2 text-[2.1rem] font-semibold tracking-[-0.06em] sm:text-[2.75rem]">Who watches your content?</h1><p className="mt-3 max-w-2xl text-base leading-7 text-[#5e6678]">Help brands understand your audience by sharing where they are, their age, and gender distribution.</p><form onSubmit={(event) => { event.preventDefault(); saveAndContinue(); }} className="mt-8 space-y-5"><section className="rounded-2xl border border-[#e8e7eb] p-5 sm:p-6"><StepHeading value="01" title="Audience data source">Choose the social platform this audience data belongs to.</StepHeading>{accounts.length ? <><div className="mt-5 grid gap-2 sm:grid-cols-2">{accounts.map((account) => <button key={account.id} type="button" onClick={() => { setSelectedId(account.id); setErrors((existing) => ({ ...existing, source: '' })); }} className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 text-left text-sm font-semibold transition ${selectedId === account.id ? 'border-[#8d68e9] bg-[#f4efff] text-[#5f2ed0] ring-1 ring-[#d9c9ff]' : 'border-[#e0e1e8] hover:border-[#cbbcf1]'}`}><PlatformGlyph platform={account.platform} /><span>{account.platform === 'Other' ? account.platformName || 'Other platform' : account.platform}</span></button>)}</div><p className="mt-4 text-xs text-[#707787]">Creator provided <span aria-hidden="true">·</span> Last updated: Today</p><div className="mt-4 flex gap-3 rounded-xl bg-[#f2edff] p-4 text-sm leading-6 text-[#5f5876]"><span className="mt-0.5 text-[#6731dc]"><Icon name="lightbulb" /></span><p>Audience data is specific to the platform you select. You can add audience data from other platforms later.</p></div></> : <div className="mt-5 rounded-xl border border-dashed border-[#d7caef] bg-[#fbf9ff] p-5"><p className="text-sm font-semibold">Add a social platform first</p><p className="mt-1 text-sm leading-6 text-[#677082]">Your saved social platforms will appear here so you can add their audience data.</p><Link href="/profile/social" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#6330dc]">Go to Social Platforms <Icon name="arrow" /></Link></div>} {errors.source && <p role="alert" className="mt-3 text-sm font-medium text-[#b22836]">{errors.source}</p>}</section><section className="rounded-2xl border border-[#e8e7eb] p-5 sm:p-6"><StepHeading value="02" title="Where is your audience?">Add up to 10 locations where your audience is based.</StepHeading><p className="mt-4 text-sm font-medium text-[#5d6575]">{current.locations.length} of 10 locations</p><div className="relative mt-3"><label className="flex min-h-12 items-center gap-3 rounded-xl border border-[#dfe1e8] px-4 focus-within:border-[#8a62e5]"><span className="text-[#545d6e]"><Icon name="search" /></span><input value={locationSearch} onChange={(event) => setLocationSearch(event.target.value)} placeholder="Search city, state or country" disabled={!selectedId || current.locations.length >= 10} className="min-w-0 flex-1 bg-transparent text-sm outline-none disabled:cursor-not-allowed" /></label>{locationSearch.trim() && selectedId && current.locations.length < 10 && <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-[#e2dff0] bg-white p-1 shadow-lg">{locationsLoading ? <p className="px-3 py-2.5 text-sm text-[#677082]">Loading Indian cities and towns...</p> : suggestions.length ? suggestions.map((location) => <button key={location.id} type="button" onClick={() => addLocation(location)} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[#f6f2ff]">{location.name}</button>) : <p className="px-3 py-2.5 text-sm text-[#677082]">No matching Indian city or town found.</p>}</div>}</div>{current.locations.length > 0 && <div className="mt-4 space-y-2">{current.locations.map((location) => <div key={location.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e8e7eb] bg-[#fdfdfe] px-3 py-2.5 sm:flex-nowrap"><span className="text-[#6a35df]"><Icon name="location" /></span><span className="min-w-0 flex-1 text-sm font-medium">{location.name}</span><label className="flex min-h-10 w-28 items-center rounded-lg border border-[#dfe1e8] bg-white px-2"><input aria-label={`${location.name} percentage`} type="text" inputMode="decimal" value={location.percentage} onChange={(event) => setPercentage('location', location.id, event.target.value)} placeholder="0" className="min-w-0 flex-1 text-right text-sm outline-none" /><span className="pl-1 text-xs text-[#697183]">% of views</span></label><button type="button" aria-label={`Remove ${location.name}`} onClick={() => removeLocation(location.id)} className="grid h-9 w-9 place-items-center rounded-lg text-[#8a5260] hover:bg-[#fff1f2] hover:text-[#b22836]"><Icon name="close" /></button></div>)}</div>}<Total label="Total" value={locationTotal} error={errors.location || locationError} />{errors.locations && <p role="alert" className="mt-3 text-sm font-medium text-[#b22836]">{errors.locations}</p>}</section><section className="rounded-2xl border border-[#e8e7eb] p-5 sm:p-6"><StepHeading value="03" title="Age">Share the age distribution of your audience.</StepHeading><div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{ageGroups.map((group) => <label key={group} className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-[#e0e1e8] px-3"><span className="text-sm font-medium">{group}</span><span className="flex items-center"><input aria-label={`${group} age percentage`} type="text" inputMode="decimal" value={current.ages[group]} onChange={(event) => setPercentage('age', group, event.target.value)} placeholder="0" className="w-10 text-right text-sm outline-none" /><span className="text-xs text-[#697183]">%</span></span></label>)}</div><Total label="Total" value={ageTotal} error={errors.age || ageError} /></section><section className="rounded-2xl border border-[#e8e7eb] p-5 sm:p-6"><StepHeading value="04" title="Gender">Share the gender distribution of your audience.</StepHeading><div className="mt-5 grid gap-3 sm:grid-cols-2">{(['Women', 'Men'] as const).map((gender) => <label key={gender} className="flex min-h-12 items-center justify-between rounded-xl border border-[#e0e1e8] px-4"><span className="flex items-center gap-2 text-sm font-medium"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#f0eaff] text-[#6731dc]"><Icon name="users" /></span>{gender}</span><span className="flex items-center"><input aria-label={`${gender} percentage`} type="text" inputMode="decimal" value={current.genders[gender]} onChange={(event) => setPercentage('gender', gender, event.target.value)} placeholder="0" className="w-12 text-right text-sm outline-none" /><span className="text-xs text-[#697183]">%</span></span></label>)}</div><Total label="Total" value={genderTotal} error={errors.gender || genderError} /></section>{notice && <p role="alert" className="rounded-lg border border-[#f1d1d1] bg-[#fff7f7] px-3 py-2.5 text-sm text-[#a12c2c]">{notice}</p>}<div className="flex flex-col-reverse gap-2 border-t border-[#efeff2] pt-6 sm:flex-row sm:justify-end"><button type="button" onClick={saveAndExit} className="min-h-12 rounded-xl border border-[#d9dce3] px-6 text-sm font-medium text-[#30333b]">Save &amp; Exit</button><button type="submit" className="min-h-12 rounded-xl bg-[#6731dc] px-7 text-sm font-medium text-white shadow-[0_8px_18px_rgba(99,48,220,0.18)]">Save &amp; Continue <span className="ml-1">→</span></button></div></form></section><aside className="order-3 space-y-4 xl:sticky xl:top-5"><section className="rounded-2xl bg-[#f0eaff] p-6"><span className="grid h-10 w-10 place-items-center rounded-full bg-white/55 text-[#6530dc]"><Icon name="lightbulb" /></span><h2 className="mt-4 text-base font-semibold">Where can I find this information?</h2><p className="mt-2 text-sm leading-6 text-[#5d5875]">You can find your audience information in your platform’s Audience or Insights section.</p><p className="mt-3 text-sm leading-6 font-medium text-[#5d5875]">Use the audience data from the platform selected above.</p></section><section className="rounded-2xl border border-[#e6e0f4] bg-white p-6"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#f0eaff] text-[#6530dc]"><Icon name="chart" /></span><h2 className="mt-4 text-base font-semibold">Keep in mind</h2><p className="mt-2 text-sm leading-6 text-[#5d5875]">Audience data can vary between platforms. Add each platform separately when you have the information available.</p></section></aside></div></div></div></main>;
}

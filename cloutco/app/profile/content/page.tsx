'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

const niches = ['Beauty', 'Fashion', 'Food & Beverage', 'Travel', 'Lifestyle', 'Fitness', 'Health & Wellness', 'Technology', 'Gaming', 'Finance', 'Business', 'Education', 'Parenting & Family', 'Entertainment', 'Comedy', 'Music', 'Art & Design', 'Photography', 'Automotive', 'Sports', 'Home & Interiors', 'Pets', 'Culture', 'DIY & Crafts', 'Other'];
const formats = ['Reels / Short Videos', 'Long-form Videos', 'Stories', 'Photos', 'Carousels', 'Tutorials / How-to', 'Reviews', 'Vlogs', 'UGC', 'Livestreams', 'Podcasts', 'Written Content', 'Other'];
const styles = ['Educational', 'Entertaining', 'Informative', 'Inspirational', 'Storytelling', 'Conversational', 'Tutorial / How-to', 'Review-focused', 'Promotional', 'Trend-driven', 'Cinematic', 'Relatable', 'Experimental', 'Other'];

type FormState = { primary: string; primaryOther: string; otherNiches: string[]; otherNichesOther: string; contentFormats: string[]; contentFormatsOther: string; contentStyles: string[]; contentStylesOther: string };
const emptyState: FormState = { primary: '', primaryOther: '', otherNiches: [], otherNichesOther: '', contentFormats: [], contentFormatsOther: '', contentStyles: [], contentStylesOther: '' };
type Creator = { id: string; full_name: string };
type ContentProfile = { primary_niche: string; primary_niche_other: string | null; other_niches: string[] | null; other_niches_other: string | null; content_formats: string[] | null; content_formats_other: string | null; content_styles: string[] | null; content_styles_other: string | null };

type IconName = 'home' | 'user' | 'message' | 'settings' | 'bell' | 'check' | 'search' | 'plus' | 'spark' | 'arrow' | 'content' | 'lightbulb';
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
    spark: <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" />,
    arrow: <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>,
    content: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    lightbulb: <><path d="M9 18h6M10 21h4" /><path d="M8.2 15.6C6.8 14.4 6 12.7 6 11a6 6 0 1 1 12 0c0 1.7-.8 3.4-2.2 4.6-.6.5-.8 1.1-.8 1.8H9c0-.7-.2-1.3-.8-1.8Z" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.65]">{paths[name]}</svg>;
}

function StepBadge({ value }: { value: string }) { return <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f0eaff] text-sm font-semibold text-[#6430dc] shadow-[0_5px_14px_rgba(99,48,220,0.08)]">{value}</span>; }
function FieldError({ children }: { children?: string }) { return children ? <p role="alert" className="mt-3 text-sm font-medium text-[#b22836]">{children}</p> : null; }

function SelectTile({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`flex min-h-11 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6b30e8] ${selected ? 'border-[#8d68e9] bg-[#f4efff] text-[#6030d6] ring-1 ring-[#d9c9ff]' : 'border-[#e1e2e9] bg-white text-[#282d38] hover:border-[#cbbcf1] hover:bg-[#fcfbff]'}`}><span className={`h-1.5 w-1.5 rounded-full ${selected ? 'bg-[#6b30e8]' : 'bg-[#b7bdc8]'}`} />{label}</button>;
}

export default function ContentAndNichePage() {
  const router = useRouter();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [values, setValues] = useState<FormState>(emptyState);
  const [contentProfileExists, setContentProfileExists] = useState(false);
  const [search, setSearch] = useState('');
  const [nichePickerOpen, setNichePickerOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [profileName, setProfileName] = useState('Creator');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadContentProfile = async () => {
    setLoading(true); setLoadError('');
    const supabase = getSupabaseClient();
    if (!supabase) { router.replace('/signin'); return; }
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.replace('/signin'); return; }
    const { data: creatorData, error: creatorError } = await supabase.from('creators').select('id, full_name').eq('auth_user_id', userData.user.id).maybeSingle();
    if (creatorError || !creatorData) { setLoadError('Your creator profile could not be found.'); setLoading(false); return; }
    const { data: contentData, error: contentError } = await supabase.from('creator_content_profile').select('primary_niche, primary_niche_other, other_niches, other_niches_other, content_formats, content_formats_other, content_styles, content_styles_other').eq('creator_id', creatorData.id).maybeSingle();
    if (contentError) { setLoadError('Your content profile could not be loaded. Please try again.'); setLoading(false); return; }
    setCreator(creatorData as Creator);
    setProfileName(creatorData.full_name || userData.user.user_metadata?.full_name || userData.user.email?.split('@')[0] || 'Creator');
    setContentProfileExists(Boolean(contentData));
    setValues(contentData ? { primary: contentData.primary_niche, primaryOther: contentData.primary_niche_other || '', otherNiches: contentData.other_niches ?? [], otherNichesOther: contentData.other_niches_other || '', contentFormats: contentData.content_formats ?? [], contentFormatsOther: contentData.content_formats_other || '', contentStyles: contentData.content_styles ?? [], contentStylesOther: contentData.content_styles_other || '' } : emptyState);
    setLoading(false);
  };

  useEffect(() => { void loadContentProfile(); }, []);

  const update = (next: Partial<FormState>) => setValues((current) => ({ ...current, ...next }));
  const filteredNiches = useMemo(() => niches.filter((niche) => niche.toLowerCase().includes(search.trim().toLowerCase())), [search]);
  const initials = profileName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  const choosePrimary = (primary: string) => {
    const next = { ...values, primary, primaryOther: primary === 'Other' ? values.primaryOther : '', otherNiches: values.otherNiches.filter((niche) => niche !== primary), otherNichesOther: primary === 'Other' ? '' : values.otherNichesOther };
    setValues(next); setErrors((current) => ({ ...current, primary: '', primaryOther: '' }));
  };
  const toggleOtherNiche = (niche: string) => {
    if (values.otherNiches.includes(niche)) { update({ otherNiches: values.otherNiches.filter((item) => item !== niche), otherNichesOther: niche === 'Other' ? '' : values.otherNichesOther }); return; }
    if (values.otherNiches.length >= 5) { setErrors((current) => ({ ...current, otherNiches: 'You can add up to 5 other niches.' })); return; }
    update({ otherNiches: [...values.otherNiches, niche] }); setErrors((current) => ({ ...current, otherNiches: '' }));
  };
  const toggleMulti = (key: 'contentFormats' | 'contentStyles', otherKey: 'contentFormatsOther' | 'contentStylesOther', item: string, maximum?: number) => {
    const selected = values[key];
    if (selected.includes(item)) { update({ [key]: selected.filter((value) => value !== item), [otherKey]: item === 'Other' ? '' : values[otherKey] }); return; }
    if (maximum && selected.length >= maximum) { setErrors((current) => ({ ...current, [key]: `Choose up to ${maximum} options.` })); return; }
    update({ [key]: [...selected, item] }); setErrors((current) => ({ ...current, [key]: '' }));
  };
  const validate = () => {
    const next: Record<string, string> = {};
    if (!values.primary) next.primary = 'Choose your primary niche.';
    if (values.primary === 'Other' && !values.primaryOther.trim()) next.primaryOther = 'Tell us your primary niche.';
    if (!values.contentFormats.length) next.contentFormats = 'Select at least one content format.';
    if (values.contentFormats.includes('Other') && !values.contentFormatsOther.trim()) next.contentFormatsOther = 'Tell us more about this format.';
    if (!values.contentStyles.length) next.contentStyles = 'Select at least one content style.';
    if (values.contentStyles.includes('Other') && !values.contentStylesOther.trim()) next.contentStylesOther = 'Tell us more about this style.';
    if (values.otherNiches.includes('Other') && !values.otherNichesOther.trim()) next.otherNichesOther = 'Tell us more about this niche.';
    setErrors(next); return Object.keys(next).length === 0;
  };
  const save = async (continueToNext: boolean) => {
    setNotice('');
    if (!validate()) { setNotice('Please complete the highlighted fields to continue.'); return; }
    const supabase = getSupabaseClient();
    if (!supabase || !creator) return;
    setSaving(true);
    const payload = { creator_id: creator.id, primary_niche: values.primary, primary_niche_other: values.primary === 'Other' ? values.primaryOther.trim() : null, other_niches: values.otherNiches, other_niches_other: values.otherNiches.includes('Other') ? values.otherNichesOther.trim() : null, content_formats: values.contentFormats, content_formats_other: values.contentFormats.includes('Other') ? values.contentFormatsOther.trim() : null, content_styles: values.contentStyles, content_styles_other: values.contentStyles.includes('Other') ? values.contentStylesOther.trim() : null };
    const result = contentProfileExists
      ? await supabase.from('creator_content_profile').update({ primary_niche: payload.primary_niche, primary_niche_other: payload.primary_niche_other, other_niches: payload.other_niches, other_niches_other: payload.other_niches_other, content_formats: payload.content_formats, content_formats_other: payload.content_formats_other, content_styles: payload.content_styles, content_styles_other: payload.content_styles_other }).eq('creator_id', creator.id).select('primary_niche, primary_niche_other, other_niches, other_niches_other, content_formats, content_formats_other, content_styles, content_styles_other').single()
      : await supabase.from('creator_content_profile').insert(payload).select('primary_niche, primary_niche_other, other_niches, other_niches_other, content_formats, content_formats_other, content_styles, content_styles_other').single();
    const { data, error } = result;
    if (error || !data) { setNotice('We could not save your content profile. Please try again.'); setSaving(false); return; }
    setValues({ primary: data.primary_niche, primaryOther: data.primary_niche_other || '', otherNiches: data.other_niches ?? [], otherNichesOther: data.other_niches_other || '', contentFormats: data.content_formats ?? [], contentFormatsOther: data.content_formats_other || '', contentStyles: data.content_styles ?? [], contentStylesOther: data.content_styles_other || '' });
    setContentProfileExists(true); setSaving(false);
    if (continueToNext) router.push('/profile/social'); else router.push('/profile');
  };
  const saveAndContinue = () => { void save(true); };
  const saveAndExit = () => { void save(false); };

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#fbfaff] text-sm text-[#5b6272]">Loading your content profile...</main>;
  if (loadError || !creator) return <main className="grid min-h-screen place-items-center bg-[#fbfaff] px-6 text-center"><div className="max-w-md rounded-2xl border border-[#e8e4f1] bg-white p-8 shadow-[0_12px_30px_rgba(70,48,112,0.05)]"><h1 className="text-2xl font-semibold tracking-[-0.05em] text-black">We couldn&apos;t load this page</h1><p className="mt-3 text-sm leading-6 text-[#626a7a]">{loadError || 'Your creator profile could not be found.'}</p><button type="button" onClick={() => void loadContentProfile()} className="mt-6 rounded-lg bg-black px-5 py-3 text-sm font-medium text-white">Try again</button></div></main>;

  return <main className="min-h-screen bg-[#fbfaff] text-[#17171b]"><header className="flex h-[76px] items-center justify-between border-b border-[#e8e7eb] bg-white px-5 sm:px-8 lg:px-10"><Link href="/" className="text-[1.45rem] font-semibold tracking-[-0.08em] text-black sm:text-[1.7rem]">CloutCo</Link><div className="flex items-center gap-4 sm:gap-6"><button type="button" aria-label="Notifications" className="text-[#4e5667]"><Icon name="bell" /></button><span className="hidden h-8 w-px bg-[#e7e7eb] sm:block" /><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#eee8ff] text-xs font-semibold text-[#6330dc]">{initials}</span><span className="hidden text-sm font-medium sm:block">{profileName}</span><span className="hidden text-[#626a7a] sm:block">⌄</span></div></div></header><div className="mx-auto flex max-w-[1600px]"><aside className="hidden w-[205px] shrink-0 border-r border-[#e8e7eb] bg-white px-5 py-7 lg:block"><nav className="space-y-1.5" aria-label="Creator navigation"><Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#343946] hover:bg-[#faf8ff]"><Icon name="home" />Dashboard</Link><Link href="/profile" className="flex items-center gap-3 rounded-xl bg-[#f1ebff] px-3 py-3 text-sm font-medium text-[#6330dc]"><Icon name="user" />My Profile</Link><a href="#messages" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#343946] hover:bg-[#faf8ff]"><Icon name="message" />Messages</a><a href="#settings" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#343946] hover:bg-[#faf8ff]"><Icon name="settings" />Settings</a></nav><div className="mt-32 rounded-2xl border border-[#e8e0fa] bg-[#fbf9ff] p-4"><p className="text-base font-semibold leading-5">Create<br />Collaborate<br />Grow <span className="text-[#6932e8]">↗</span></p><p className="mt-4 text-xs leading-5 text-[#60697a]">The trusted marketplace for brands and creators.</p></div></aside><div className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12 lg:py-8"><div className="grid gap-6 xl:grid-cols-[250px_minmax(0,1fr)_260px] xl:items-start"><aside className="order-2 rounded-2xl border border-[#e8e7eb] bg-white p-5 shadow-[0_7px_20px_rgba(50,40,80,0.03)] xl:order-1 xl:sticky xl:top-5"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Complete your profile</h2><span className="text-xs text-[#596177]">3 of 5</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ececf1]"><span className="block h-full w-[60%] rounded-full bg-[#7034e8]" /></div><ol className="mt-4 space-y-1.5">{[['Basic Information', 'Personal details', 'done'], ['Creator Identity', 'Your creator persona', 'done'], ['Content & Niche', 'What you create', 'current'], ['Social Platforms', 'Link your accounts', ''], ['Portfolio', 'Showcase your work', '']].map(([title, subtitle, state], index) => <li key={title} className={`flex items-center gap-3 rounded-xl px-2 py-2 ${state === 'current' ? 'bg-[#f3efff]' : ''}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${state === 'done' ? 'bg-[#57b8ae] text-white' : state === 'current' ? 'bg-[#6731dc] text-white shadow-[0_5px_12px_rgba(103,49,220,0.22)]' : 'border border-[#ccd1dd] bg-white text-[#495162]'}`}>{state === 'done' ? '✓' : index + 1}</span><span><strong className="block text-xs font-medium">{title}</strong><small className="block text-[0.66rem] text-[#677082]">{subtitle}</small></span></li>)}</ol></aside><section className="order-1 rounded-2xl border border-[#e8e7eb] bg-white p-6 shadow-[0_7px_20px_rgba(50,40,80,0.03)] sm:p-8 xl:order-2"><p className="text-xs font-bold tracking-[0.14em] text-[#6a35df]">CONTENT &amp; NICHE</p><h1 className="mt-2 text-[2.25rem] font-semibold tracking-[-0.06em] sm:text-[2.75rem]">Tell us what you create</h1><p className="mt-3 text-base leading-7 text-[#5e6678]">Help brands understand your content, niche, and creative style.</p><form onSubmit={(event) => { event.preventDefault(); saveAndContinue(); }} className="mt-8 space-y-5"><section className="rounded-2xl border border-[#e8e7eb] p-5 sm:p-6"><div className="flex gap-4"><StepBadge value="01" /><div><h2 className="text-base font-semibold">Primary Niche <span className="text-[#6a35df]">*</span></h2><p className="mt-1 text-sm leading-5 text-[#677082]">Choose the category that best represents the content you create most often.</p></div></div><label className="mt-5 flex min-h-12 items-center gap-3 rounded-xl border border-[#e0e1e8] px-4 py-3 focus-within:border-[#8a62e5]"><span className="text-[#4c5567]"><Icon name="search" /></span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search niches..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label><div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">{filteredNiches.map((niche) => <SelectTile key={niche} label={niche} selected={values.primary === niche} onClick={() => choosePrimary(niche)} />)}</div>{values.primary === 'Other' && <div className="mt-3"><label htmlFor="primary-other" className="text-xs font-medium">Tell us your niche <span className="text-[#6a35df]">*</span></label><input id="primary-other" value={values.primaryOther} maxLength={50} onChange={(event) => update({ primaryOther: event.target.value })} placeholder="e.g. Street Interviews, ASMR, Spirituality, BookTok..." className="mt-1.5 w-full rounded-lg border border-[#dfe1e8] px-3 py-2.5 text-xs outline-none focus:border-[#8a62e5]" /><FieldError>{errors.primaryOther}</FieldError></div>}<FieldError>{errors.primary}</FieldError></section><section className="rounded-2xl border border-[#e8e7eb] p-5 sm:p-6"><div className="flex gap-4"><StepBadge value="02" /><div><h2 className="text-base font-semibold">Other Niches</h2><p className="mt-1 text-sm leading-5 text-[#677082]">Add other categories you regularly create content about (up to 5).</p></div></div><div className="mt-4 flex flex-wrap gap-2.5">{values.otherNiches.map((niche) => <button key={niche} type="button" onClick={() => toggleOtherNiche(niche)} className="rounded-xl bg-[#f0eaff] px-3.5 py-2.5 text-sm font-medium text-[#6230d6]">{niche} <span aria-hidden="true">×</span></button>)}<button type="button" onClick={() => setNichePickerOpen((open) => !open)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#dfe1e8] px-3.5 py-2.5 text-sm font-medium hover:border-[#cbbcf1]"><Icon name="plus" />Add niche</button></div>{nichePickerOpen && <div className="mt-3 grid gap-1.5 rounded-xl bg-[#fbfaff] p-3 sm:grid-cols-2">{niches.filter((niche) => niche !== values.primary).map((niche) => <SelectTile key={niche} label={niche} selected={values.otherNiches.includes(niche)} onClick={() => toggleOtherNiche(niche)} />)}</div>}{values.otherNiches.includes('Other') && <div className="mt-3"><label htmlFor="other-niches-other" className="text-xs font-medium">Tell us more about this niche</label><input id="other-niches-other" value={values.otherNichesOther} maxLength={50} onChange={(event) => update({ otherNichesOther: event.target.value })} placeholder="e.g. Book Reviews" className="mt-1.5 w-full rounded-lg border border-[#dfe1e8] px-3 py-2.5 text-xs outline-none focus:border-[#8a62e5]" /><FieldError>{errors.otherNichesOther}</FieldError></div>}<FieldError>{errors.otherNiches}</FieldError></section><section className="rounded-2xl border border-[#e8e7eb] p-5 sm:p-6"><div className="flex gap-4"><StepBadge value="03" /><div><h2 className="text-base font-semibold">Content Formats <span className="text-[#6a35df]">*</span></h2><p className="mt-1 text-sm leading-5 text-[#677082]">What types of content do you create?</p></div></div><div className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">{formats.map((format) => <SelectTile key={format} label={format} selected={values.contentFormats.includes(format)} onClick={() => toggleMulti('contentFormats', 'contentFormatsOther', format)} />)}</div>{values.contentFormats.includes('Other') && <div className="mt-3"><label htmlFor="formats-other" className="text-xs font-medium">Tell us more <span className="text-[#6a35df]">*</span></label><input id="formats-other" value={values.contentFormatsOther} maxLength={50} onChange={(event) => update({ contentFormatsOther: event.target.value })} placeholder="Describe the other format" className="mt-1.5 w-full rounded-lg border border-[#dfe1e8] px-3 py-2.5 text-xs outline-none focus:border-[#8a62e5]" /><FieldError>{errors.contentFormatsOther}</FieldError></div>}<FieldError>{errors.contentFormats}</FieldError></section><section className="rounded-2xl border border-[#e8e7eb] p-5 sm:p-6"><div className="flex gap-4"><StepBadge value="04" /><div><h2 className="text-base font-semibold">Content Style <span className="text-[#6a35df]">*</span></h2><p className="mt-1 text-sm leading-5 text-[#677082]">How would you describe the way you create content? (Select up to 5)</p></div></div><div className="mt-3 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">{styles.map((style) => <SelectTile key={style} label={style} selected={values.contentStyles.includes(style)} onClick={() => toggleMulti('contentStyles', 'contentStylesOther', style, 5)} />)}</div>{values.contentStyles.includes('Other') && <div className="mt-3"><label htmlFor="styles-other" className="text-xs font-medium">Tell us more <span className="text-[#6a35df]">*</span></label><input id="styles-other" value={values.contentStylesOther} maxLength={50} onChange={(event) => update({ contentStylesOther: event.target.value })} placeholder="Describe the other style" className="mt-1.5 w-full rounded-lg border border-[#dfe1e8] px-3 py-2.5 text-xs outline-none focus:border-[#8a62e5]" /><FieldError>{errors.contentStylesOther}</FieldError></div>}<FieldError>{errors.contentStyles}</FieldError></section>{notice && <p role="alert" className="rounded-lg border border-[#f1d1d1] bg-[#fff7f7] px-3 py-2.5 text-xs text-[#a12c2c]">{notice}</p>}<div className="flex flex-col-reverse gap-2 border-t border-[#efeff2] pt-6 sm:flex-row sm:justify-end"><button type="button" onClick={saveAndExit} disabled={saving} className="min-h-12 rounded-xl border border-[#d9dce3] px-6 text-sm font-medium text-[#30333b] disabled:cursor-not-allowed disabled:opacity-60">Save &amp; Exit</button><button type="submit" disabled={saving} className="min-h-12 rounded-xl bg-[#6731dc] px-7 text-sm font-medium text-white shadow-[0_8px_18px_rgba(99,48,220,0.18)]">Save &amp; Continue <span className="ml-1">→</span></button></div></form></section><aside className="order-3 rounded-2xl bg-[#f0eaff] p-6 xl:sticky xl:top-5"><span className="grid h-10 w-10 place-items-center rounded-full bg-white/55 text-[#6530dc]"><Icon name="lightbulb" /></span><h2 className="mt-4 text-base font-semibold">Not sure what to choose?</h2><p className="mt-2 text-sm leading-6 text-[#5d5875]">Think about the type of content you create most consistently, rather than a one-off post.</p></aside></div></div></div></main>;
}

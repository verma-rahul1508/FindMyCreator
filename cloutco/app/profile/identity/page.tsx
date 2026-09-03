'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getNextProfileRoute } from '@/lib/profile-sections';

type Creator = { id: string; full_name: string; email: string };
type Identity = { profile_photo_url: string | null; display_name: string | null; username: string | null; bio: string | null; languages: string[]; creator_type: string | null; creator_type_other: string | null };

type IconName = 'home' | 'user' | 'message' | 'settings' | 'bell' | 'upload' | 'camera' | 'check' | 'arrow' | 'chevron';
const languages = ['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Spanish', 'French'];
const creatorTypes = [
  ['content_creator', 'Content Creator', 'Create content for an audience'],
  ['influencer', 'Influencer', 'Build community through your voice'],
  ['ugc_creator', 'UGC Creator', 'Create authentic brand content'],
  ['digital_creator', 'Digital Creator', 'Make digital-first experiences'],
  ['other', 'Other', 'A creator type of your own'],
] as const;
const emptyIdentity: Identity = { profile_photo_url: null, display_name: '', username: '', bio: '', languages: [], creator_type: '', creator_type_other: '' };

function Icon({ name }: { name: IconName }) {
  const paths = {
    home: <><path d="m3.5 10 8.5-7 8.5 7" /><path d="M5.5 9v10h13V9M9.5 19v-5h5v5" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 20c.5-3.4 2.8-5 7-5s6.5 1.6 7 5" /></>,
    message: <><path d="M5 6.5h14v9H9l-4 3v-12Z" /><path d="M8 10h8M8 13h5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19 13.2a7.6 7.6 0 0 0 0-2.4l-2-1.5 2-3.4-2.4-1a8 8 0 0 0-2-1.2L14.3 3h-4.6l-.4 2.7a8 8 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.5 2 1.5a7.6 7.6 0 0 0 0 2.4l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 2 1.2l.4 2.7h4.6l.4-2.7a8 8 0 0 0 2-1.2l2.4 1 2.4-1 2-3.4-2-1.5Z" /></>,
    bell: <><path d="M6.5 16.5h11l-1.2-1.8V10a4.3 4.3 0 0 0-8.6 0v4.7l-1.2 1.8Z" /><path d="M10 19h4" /></>,
    upload: <><path d="M12 16V5M8 9l4-4 4 4" /><path d="M5 14v4h14v-4" /></>,
    camera: <><path d="M4 8h4l1.5-2h5L16 8h4v11H4V8Z" /><circle cx="12" cy="13.5" r="3" /></>,
    check: <><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    arrow: <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>,
    chevron: <path d="m9 5 7 7-7 7" />,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.65]">{paths[name]}</svg>;
}

function LoadingState() { return <main className="grid min-h-screen place-items-center bg-[#fbfaff] text-sm text-[#5b6272]">Loading your creator identity...</main>; }
function ErrorState({ message, retry }: { message: string; retry: () => void }) { return <main className="grid min-h-screen place-items-center bg-[#fbfaff] px-6 text-center"><div className="max-w-md rounded-2xl border border-[#e8e4f1] bg-white p-8 shadow-[0_12px_30px_rgba(70,48,112,0.05)]"><h1 className="text-2xl font-semibold tracking-[-0.05em] text-black">We couldn&apos;t load this page</h1><p className="mt-3 text-sm leading-6 text-[#626a7a]">{message}</p><button type="button" onClick={retry} className="mt-6 rounded-lg bg-black px-5 py-3 text-sm font-medium text-white">Try again</button></div></main>; }

export default function CreatorIdentityPage() {
  const router = useRouter();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [values, setValues] = useState<Identity>(emptyIdentity);
  const [identityExists, setIdentityExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [languageSearch, setLanguageSearch] = useState('');
  const [languagesOpen, setLanguagesOpen] = useState(false);

  const loadIdentity = async () => {
    setLoading(true); setLoadError('');
    const supabase = getSupabaseClient();
    if (!supabase) { router.replace('/signin'); return; }
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.replace('/signin'); return; }
    const { data: creatorData, error: creatorError } = await supabase.from('creators').select('id, full_name, email').eq('auth_user_id', userData.user.id).maybeSingle();
    if (creatorError || !creatorData) { setLoadError('Your creator profile could not be found.'); setLoading(false); return; }
    const { data: identityData, error: identityError } = await supabase.from('creator_identity').select('profile_photo_url, display_name, username, bio, languages, creator_type, creator_type_other').eq('creator_id', creatorData.id).maybeSingle();
    if (identityError) { setLoadError('Your identity information could not be loaded.'); setLoading(false); return; }
    setCreator(creatorData as Creator); setIdentityExists(Boolean(identityData)); setValues(identityData ? { ...emptyIdentity, ...identityData, languages: identityData.languages ?? [] } : { ...emptyIdentity, display_name: creatorData.full_name });
    if (identityData?.profile_photo_url) {
      const { data: signed } = await supabase.storage.from('creator-profile-photos').createSignedUrl(identityData.profile_photo_url, 3600);
      if (signed?.signedUrl) setPhotoPreview(signed.signedUrl);
    }
    setLoading(false);
  };

  useEffect(() => { void loadIdentity(); }, []);
  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && !target.closest('section.relative')) setLanguagesOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLanguagesOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);
  const update = (field: keyof Identity, value: string | string[] | null) => setValues((current) => ({ ...current, [field]: value }));
  const selectPhoto = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setSaveError('Choose a JPG, JPEG, PNG, or WebP image.'); return; } if (file.size > 5 * 1024 * 1024) { setSaveError('Your profile photo must be 5 MB or smaller.'); return; } setSaveError(''); setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)); };
  const toggleLanguage = (language: string) => { update('languages', values.languages.includes(language) ? values.languages.filter((item) => item !== language) : [...values.languages, language]); setLanguagesOpen(false); };
  const save = async (continueToNext: boolean) => {
    setValidationError(''); setSaveError('');
    const displayName = values.display_name?.trim() ?? ''; const bio = values.bio?.trim() ?? '';
    if (!displayName || displayName.length > 50) { setValidationError('Enter a creator name up to 50 characters.'); return; }
    if (!bio || bio.length > 250) { setValidationError('Enter a bio up to 250 characters.'); return; }
    if (!values.creator_type) { setValidationError('Choose the creator type that best describes you.'); return; }
    const supabase = getSupabaseClient(); if (!supabase || !creator) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser(); if (!userData.user) { router.replace('/signin'); return; }
    let profilePhotoPath = values.profile_photo_url;
    if (photoFile) {
      const extension = photoFile.type === 'image/png' ? 'png' : photoFile.type === 'image/webp' ? 'webp' : 'jpg';
      profilePhotoPath = `${userData.user.id}/profile-photo.${extension}`;
      const { error: uploadError } = await supabase.storage.from('creator-profile-photos').upload(profilePhotoPath, photoFile, { upsert: true, contentType: photoFile.type });
      if (uploadError) { console.error('Profile photo upload failed', uploadError); setSaveError('We could not upload your profile photo. Please try again.'); setSaving(false); return; }
    }
    const payload = { creator_id: creator.id, profile_photo_url: profilePhotoPath || null, display_name: displayName, username: values.username?.trim().replace(/^@+/, '') || null, bio, languages: values.languages, creator_type: values.creator_type, creator_type_other: values.creator_type === 'other' ? values.creator_type_other?.trim() || null : null };
    const savedIdentity = identityExists
      ? await supabase.from('creator_identity').update({ profile_photo_url: payload.profile_photo_url, display_name: payload.display_name, username: payload.username, bio: payload.bio, languages: payload.languages, creator_type: payload.creator_type, creator_type_other: payload.creator_type_other }).eq('creator_id', creator.id).select('profile_photo_url, display_name, username, bio, languages, creator_type, creator_type_other').single()
      : await supabase.from('creator_identity').insert(payload).select('profile_photo_url, display_name, username, bio, languages, creator_type, creator_type_other').single();
    const { data, error } = savedIdentity;
    if (error || !data) { setSaveError('We could not save your creator identity. Please try again.'); setSaving(false); return; }
    setValues({ ...emptyIdentity, ...data, languages: data.languages ?? [] }); setIdentityExists(true); setPhotoFile(null); setSaving(false);
    if (continueToNext) router.push(getNextProfileRoute({ 'Basic Information': true, 'Creator Identity': true })); else router.push('/profile');
  };

  if (loading) return <LoadingState />;
  if (loadError || !creator) return <ErrorState message={loadError || 'Your creator profile could not be found.'} retry={() => void loadIdentity()} />;
  const initials = (values.display_name || creator.full_name).split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const filteredLanguages = languages.filter((language) => language.toLowerCase().includes(languageSearch.toLowerCase()));

  return <main className="min-h-screen bg-[#fbfaff] text-[#151518]"><header className="flex h-[78px] items-center justify-between border-b border-[#e8e7eb] bg-white px-5 sm:px-8 lg:px-10"><Link href="/" className="text-[1.5rem] font-semibold tracking-[-0.08em] text-black sm:text-[1.8rem]">CLOUTCO<span className="text-[#6330dc]">.</span></Link><div className="flex items-center gap-4 sm:gap-6"><button type="button" className="text-[#525966]" aria-label="Notifications"><Icon name="bell" /></button><details className="group relative"><summary className="flex cursor-pointer list-none items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#eee8ff] text-sm font-semibold text-[#6330dc]">{initials}</span><span className="hidden text-left sm:block"><strong className="block max-w-[160px] truncate text-sm font-semibold">{values.display_name || creator.full_name}</strong><span className="block text-xs text-[#707787]">Creator</span></span><span className="hidden text-[#656c7a] sm:block">⌄</span></summary><div className="absolute right-0 top-12 z-20 w-44 rounded-xl border border-[#e3e1e9] bg-white p-2 shadow-[0_12px_30px_rgba(45,35,75,0.12)]"><button type="button" onClick={() => void getSupabaseClient()?.auth.signOut().then(() => router.replace('/signin'))} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f7f4ff]">Sign out</button></div></details></div></header><div className="mx-auto flex max-w-[1600px]"><aside className="hidden w-[230px] shrink-0 border-r border-[#e8e7eb] bg-white px-5 py-8 lg:block"><nav className="space-y-2" aria-label="Creator navigation"><Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-[#424754] hover:bg-[#faf8ff]"><Icon name="home" />Dashboard</Link><Link href="/profile" className="flex items-center gap-3 rounded-xl bg-[#f1ebff] px-4 py-3.5 text-sm font-medium text-[#6330dc]"><Icon name="user" />My Profile</Link><a href="#next-steps" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-[#424754] hover:bg-[#faf8ff]"><Icon name="message" />Messages</a><a href="#status" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-[#424754] hover:bg-[#faf8ff]"><Icon name="settings" />Settings</a></nav><div className="mt-32 rounded-2xl border border-[#e8e0fa] bg-[#fbf9ff] p-5"><div className="grid h-9 w-9 place-items-center rounded-full border border-[#d9c8ff] text-[#6330dc]"><Icon name="check" /></div><h2 className="mt-5 text-sm font-semibold">Complete your profile</h2><p className="mt-2 text-xs leading-5 text-[#626a7a]">Build your professional creator profile on CloutCo.</p><p className="mt-4 flex items-center gap-2 text-xs font-medium text-[#34363d]"><span className="text-[#13a34a]"><Icon name="check" /></span>Basic information complete</p><p className="mt-2 flex items-center gap-2 text-xs font-medium text-[#34363d]"><span className="text-[#7440f4]"><Icon name="user" /></span>Creator identity in progress</p><p className="mt-1 text-xs text-[#777e8d]">Next: Content &amp; Niche</p></div></aside><div className="min-w-0 flex-1 px-5 py-9 sm:px-8 lg:px-12 lg:py-11"><section className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7440f4]">Creator Identity</p><h1 className="mt-4 text-[2.5rem] font-semibold tracking-[-0.065em] sm:text-[3rem]">Tell us who you are</h1><p className="mt-3 max-w-[530px] text-sm leading-6 text-[#5d6575]">Build your professional creator identity so brands can understand who you are and what you create.</p></div><div className="hidden items-center gap-3 pr-10 md:flex" aria-hidden="true"><div className="relative h-[92px] w-[150px] rotate-[-6deg] rounded-xl border border-[#d9cdf7] bg-[#fbf9ff] p-4"><span className="block h-7 w-7 rounded-full bg-[#8a61e8]" /><span className="absolute left-14 top-5 h-2 w-16 rounded-full bg-[#d5c5fa]" /><span className="absolute left-14 top-10 h-2 w-20 rounded-full bg-[#e4dbfa]" /></div><span className="grid h-12 w-12 place-items-center rounded-full bg-[#7440f4] text-2xl text-white">✓</span></div></section><form onSubmit={(event) => { event.preventDefault(); void save(true); }} className="mt-10 rounded-2xl border border-[#e8e7eb] bg-white p-5 shadow-[0_8px_28px_rgba(50,40,80,0.035)] sm:p-8"><div className="space-y-8"><section className="border-b border-[#f0eff2] pb-8"><h2 className="text-sm font-semibold">1. Profile Photo</h2><p className="mt-2 max-w-[430px] text-xs leading-5 text-[#626a7a]">Add a clear photo of yourself. This helps brands recognize and connect with you.</p><div className="mt-5 flex flex-col items-start gap-5 sm:flex-row sm:items-center"><div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-[#f0eaff] bg-[#f4efff] text-2xl font-semibold text-[#7440f4]">{photoPreview ? <img src={photoPreview} alt="Profile preview" className="h-full w-full object-cover" /> : initials}</div><label className="flex min-h-[108px] flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#bda4ff] bg-[#fcfaff] px-5 text-center hover:bg-[#f8f3ff]"><Icon name="upload" /><strong className="mt-2 text-sm font-medium">Upload photo</strong><span className="mt-1 text-xs text-[#777e8d]">JPG, JPEG, PNG, WebP · Max 5 MB</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} className="sr-only" /></label></div></section><section><label htmlFor="display-name" className="text-sm font-semibold">2. Creator Name <span className="text-[#7440f4]">*</span></label><p className="mt-2 text-xs text-[#626a7a]">The name you want brands to see on your creator profile.</p><div className="mt-3 flex items-center gap-3 rounded-lg border border-[#dfe1e8] px-3.5 py-3 focus-within:border-[#8760df]"><input id="display-name" value={values.display_name ?? ''} maxLength={50} onChange={(event) => update('display_name', event.target.value)} placeholder="Enter your display name" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /><span className="text-xs text-[#858b98]">{values.display_name?.length ?? 0}/50</span></div></section><section><label htmlFor="username" className="text-sm font-semibold">3. Username / Handle</label><p className="mt-2 text-xs text-[#626a7a]">Your unique handle (optional).</p><div className="mt-3 flex items-center rounded-lg border border-[#dfe1e8] px-3.5 py-3 focus-within:border-[#8760df]"><span className="mr-2 text-sm text-[#858b98]">@</span><input id="username" value={values.username ?? ''} maxLength={30} onChange={(event) => update('username', event.target.value)} placeholder="yourhandle" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /><span className="text-xs text-[#858b98]">{values.username?.replace(/^@+/, '').length ?? 0}/30</span></div><p className="mt-2 text-xs text-[#777e8d]">The @ symbol is not stored in your handle.</p></section><section><label htmlFor="bio" className="text-sm font-semibold">4. Bio <span className="text-[#7440f4]">*</span></label><p className="mt-2 text-xs text-[#626a7a]">Tell brands a little about your personality, content and what makes you different.</p><div className="mt-3 rounded-lg border border-[#dfe1e8] px-3.5 py-3 focus-within:border-[#8760df]"><textarea id="bio" value={values.bio ?? ''} maxLength={250} onChange={(event) => update('bio', event.target.value)} placeholder="Write a short bio about yourself..." rows={4} className="w-full resize-none bg-transparent text-sm outline-none" /><p className="text-right text-xs text-[#858b98]">{values.bio?.length ?? 0}/250</p></div></section><section className="relative"><label className="text-sm font-semibold">5. Languages</label><p className="mt-2 text-xs text-[#626a7a]">Select the languages you speak.</p><div className="mt-3 flex min-h-[46px] flex-wrap items-center gap-2 rounded-lg border border-[#dfe1e8] px-3 py-2"><div className="flex flex-wrap gap-1.5">{values.languages.map((language) => <button type="button" key={language} onClick={() => toggleLanguage(language)} className="rounded-full bg-[#f1eaff] px-2.5 py-1 text-xs text-[#6330dc]">{language} ×</button>)}</div><input value={languageSearch} onFocus={() => setLanguagesOpen(true)} onChange={(event) => { setLanguageSearch(event.target.value); setLanguagesOpen(true); }} placeholder="Search and select languages..." className="min-w-[170px] flex-1 bg-transparent text-sm outline-none" /></div>{languagesOpen && <div className="absolute left-0 right-0 top-[86px] z-10 max-h-44 overflow-auto rounded-lg border border-[#e3e0eb] bg-white p-2 shadow-lg">{filteredLanguages.map((language) => <button type="button" key={language} onClick={() => { toggleLanguage(language); setLanguageSearch(''); }} className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-[#f7f4ff]">{language}</button>)}</div>}</section><section><label className="text-sm font-semibold">6. Creator Type <span className="text-[#7440f4]">*</span></label><p className="mt-2 text-xs text-[#626a7a]">What type of creator best describes you?</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{creatorTypes.map(([value, label, description]) => <button type="button" key={value} onClick={() => { update('creator_type', value); if (value !== 'other') update('creator_type_other', null); }} className={`min-h-[118px] rounded-xl border p-4 text-left transition ${values.creator_type === value ? 'border-[#7440f4] bg-[#f8f3ff] ring-2 ring-[#eee5ff]' : 'border-[#e4e3e9] hover:border-[#cfc1ed]'}`}><span className="grid h-8 w-8 place-items-center rounded-full bg-[#f1eaff] text-[#7440f4]"><Icon name="user" /></span><strong className="mt-3 block text-xs">{label}</strong><span className="mt-1 block text-[0.68rem] leading-4 text-[#777e8d]">{description}</span></button>)}</div>{values.creator_type === 'other' && <div className="mt-4"><label htmlFor="creator-type-other" className="text-sm font-medium">Tell us more (optional)</label><p className="mt-1 text-xs text-[#626a7a]">Help brands understand your specific creator type.</p><input id="creator-type-other" value={values.creator_type_other ?? ''} maxLength={50} onChange={(event) => update('creator_type_other', event.target.value)} placeholder="e.g. Educator, Podcaster, Animator, etc." className="mt-2 w-full rounded-lg border border-[#dfe1e8] px-3.5 py-3 text-sm outline-none focus:border-[#8760df]" /></div>}</section></div>{(validationError || saveError) && <p className="mt-7 rounded-lg border border-[#f1d1d1] bg-[#fff7f7] px-3.5 py-3 text-sm text-[#a12c2c]" role="alert">{validationError || saveError}</p>}<div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#f0eff2] pt-6 sm:flex-row sm:justify-end"><button type="button" onClick={() => void save(false)} disabled={saving} className="min-h-11 rounded-lg border border-[#d9dce3] px-6 text-sm font-medium text-[#30333b]">{saving ? 'Saving...' : 'Save & Exit'}</button><button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-[#6330dc] px-7 text-sm font-medium text-white shadow-[0_8px_18px_rgba(99,48,220,0.18)]">{saving ? 'Saving...' : 'Save & Continue'} <span className="ml-2">→</span></button></div></form><p className="mt-5 text-center text-xs text-[#777e8d]">Your information is secure and visible only to you.</p></div></div></main>;
}

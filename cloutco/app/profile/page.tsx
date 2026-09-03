'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getNextProfileRoute } from '@/lib/profile-sections';

type Creator = {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  current_city: string;
  date_of_birth: string;
  gender: string;
  status: string;
  created_at: string;
};
type CreatorIdentity = { display_name: string | null; bio: string | null; creator_type: string | null };

type IconName = 'home' | 'user' | 'check' | 'message' | 'settings' | 'bell' | 'chevron' | 'arrow' | 'spark' | 'document' | 'shield' | 'identity' | 'content' | 'social' | 'audience' | 'portfolio';
const creatorFields = 'id, full_name, email, phone_number, current_city, date_of_birth, gender, status, created_at';
const profileSections: { title: string; description: string; state: string; complete: boolean; icon: IconName; route?: string }[] = [
  { title: 'Basic Information', description: 'Your basic details and location', state: 'Completed', complete: true, icon: 'user' },
  { title: 'Creator Identity', description: 'Add your photo, username, bio and languages', state: 'Not started', complete: false, icon: 'identity', route: '/profile/identity' },
  { title: 'Content & Niche', description: 'Tell us what you create and your niche', state: 'Not started', complete: false, icon: 'content' },
  { title: 'Social Platforms', description: 'Connect your social media accounts', state: 'Not started', complete: false, icon: 'social' },
  { title: 'Audience', description: 'Share your audience demographics and insights', state: 'Not started', complete: false, icon: 'audience' },
  { title: 'Portfolio', description: 'Showcase your best work', state: 'Not started', complete: false, icon: 'portfolio' },
  { title: 'Performance (Optional)', description: 'Track your content performance', state: 'Optional', complete: false, icon: 'spark' },
];
const reasons = ['Build a stronger professional presence', 'Help CloutCo understand your content', 'Make your creator profile more complete', 'Showcase your work professionally'];

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="m3.5 10 8.5-7 8.5 7" /><path d="M5.5 9v10h13V9M9.5 19v-5h5v5" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 20c.5-3.4 2.8-5 7-5s6.5 1.6 7 5" /></>,
    check: <><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    message: <><path d="M5 6.5h14v9H9l-4 3v-12Z" /><path d="M8 10h8M8 13h5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19 13.2a7.6 7.6 0 0 0 0-2.4l2-1.5-2-3.4-2.4 1a8 8 0 0 0-2-1.2L14.3 3h-4.6l-.4 2.7a8 8 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 2.4l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 2 1.2l.4 2.7h4.6l.4-2.7a8 8 0 0 0 2-1.2l2.4 1 2-3.4-2-1.5Z" /></>,
    bell: <><path d="M6.5 16.5h11l-1.2-1.8V10a4.3 4.3 0 0 0-8.6 0v4.7l-1.2 1.8Z" /><path d="M10 19h4" /></>,
    chevron: <path d="m9 5 7 7-7 7" />, arrow: <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>,
    spark: <><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Z" /><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z" /></>,
    document: <><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M8.5 8h7M8.5 12h7M8.5 16h4" /></>,
    shield: <><path d="m12 3 7 3v5c0 4-2.9 7.6-7 9-4.1-1.4-7-5-7-9V6l7-3Z" /><path d="m9 11.8 2 2 4-4" /></>,
    identity: <><circle cx="12" cy="8" r="2.5" /><path d="M7.5 18c.5-2.5 2-4 4.5-4s4 1.5 4.5 4" /></>,
    content: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    social: <><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    audience: <><circle cx="9" cy="9" r="2.5" /><circle cx="16" cy="10" r="2" /><path d="M4.5 19c.4-3 2-4.5 4.5-4.5s4.1 1.5 4.5 4.5M14 15c2.8-.2 4.5 1.2 5 4" /></>,
    portfolio: <><path d="M4 7.5h16v12H4zM8 7.5V5h8v2.5M4 12h16" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.65]">{paths[name]}</svg>;
}

function formatStatus(status: string) { return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Not available'; }
function formatMemberSince(value: string) { return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(value)); }
function isBasicComplete(creator: Creator) { return [creator.full_name, creator.email, creator.phone_number, creator.current_city, creator.date_of_birth, creator.gender].every((value) => Boolean(value?.trim())); }
function isIdentityComplete(identity: CreatorIdentity | null) { return Boolean(identity?.display_name?.trim() && identity.bio?.trim() && identity.creator_type?.trim()); }

function LoadingState() { return <main className="grid min-h-screen place-items-center bg-[#fbfaff] text-sm text-[#5b6272]">Loading your creator profile...</main>; }
function ErrorState({ retry }: { retry: () => void }) { return <main className="grid min-h-screen place-items-center bg-[#fbfaff] px-6 text-center"><div className="max-w-md rounded-2xl border border-[#e8e4f1] bg-white p-8 shadow-[0_12px_30px_rgba(70,48,112,0.05)]"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#f1ebff] text-[#6330dc]"><Icon name="document" /></div><h1 className="mt-5 text-2xl font-semibold tracking-[-0.05em] text-black">We couldn&apos;t load your profile</h1><p className="mt-3 text-sm leading-6 text-[#626a7a]">Please try again. Your profile information has not been changed.</p><button type="button" onClick={retry} className="mt-6 rounded-lg bg-black px-5 py-3 text-sm font-medium text-white">Try again</button></div></main>; }

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [identity, setIdentity] = useState<CreatorIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const completionMap = {
    'Basic Information': creator ? isBasicComplete(creator) : false,
    'Creator Identity': isIdentityComplete(identity),
  };

  const loadProfile = async () => {
    setLoading(true); setLoadError(false);
    const supabase = getSupabaseClient();
    if (!supabase) { router.replace('/signin'); return; }
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.replace('/signin'); return; }
    const { data, error } = await supabase.from('creators').select(creatorFields).eq('auth_user_id', userData.user.id).maybeSingle();
    if (error || !data) { setLoadError(true); setLoading(false); return; }
    const { data: identityData, error: identityError } = await supabase.from('creator_identity').select('display_name, bio, creator_type').eq('creator_id', data.id).maybeSingle();
    if (identityError) { setLoadError(true); setLoading(false); return; }
    setUser(userData.user); setCreator(data as Creator); setIdentity(identityData as CreatorIdentity | null); setLoading(false);
  };

  useEffect(() => { void loadProfile(); }, []);
  useEffect(() => {
    const handleContinueProfile = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest('a[href="#profile-sections"]');
      if (!link || !link.textContent?.includes('Continue Profile')) return;
      event.preventDefault();
      router.push(getNextProfileRoute(completionMap));
    };
    document.addEventListener('click', handleContinueProfile, true);
    return () => document.removeEventListener('click', handleContinueProfile, true);
  }, [router, completionMap['Basic Information'], completionMap['Creator Identity']]);
  const signOut = async () => { const supabase = getSupabaseClient(); if (!supabase) return; setSigningOut(true); const { error } = await supabase.auth.signOut(); if (!error) router.replace('/signin'); else setSigningOut(false); };
  if (loading) return <LoadingState />;
  if (loadError || !creator || !user) return <ErrorState retry={() => void loadProfile()} />;

  const name = creator.full_name.trim() || 'Creator';
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const complete = isBasicComplete(creator);
  const identityComplete = completionMap['Creator Identity'];
  const currentSections = profileSections.map((section, index) => index === 0 ? { ...section, complete } : index === 1 ? { ...section, complete: identityComplete, state: identityComplete ? 'Completed' : 'Not started' } : section);
  const completedCount = currentSections.filter((section) => section.complete).length;
  const status = formatStatus(creator.status);
  const statusCopy = creator.status === 'pending' ? 'Your profile is being prepared.' : creator.status === 'active' ? 'Your creator profile is active.' : 'Your profile is currently not active.';

  return <main className="min-h-screen bg-[#fbfaff] text-[#151518]">{/* visual markup unchanged */}<header className="flex h-[78px] items-center justify-between border-b border-[#e8e7eb] bg-white px-5 sm:px-8 lg:px-10"><Link href="/" className="text-[1.5rem] font-semibold tracking-[-0.08em] text-black sm:text-[1.8rem]">CLOUTCO<span className="text-[#6330dc]">.</span></Link><div className="flex items-center gap-4 sm:gap-6"><button type="button" className="text-[#525966]" aria-label="Notifications"><Icon name="bell" /></button><div className="hidden h-8 w-px bg-[#e7e7eb] sm:block" /><details className="group relative"><summary className="flex cursor-pointer list-none items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#eee8ff] text-sm font-semibold text-[#6330dc]">{initials}</span><span className="hidden text-left sm:block"><strong className="block max-w-[160px] truncate text-sm font-semibold">{name}</strong><span className="block text-xs text-[#707787]">Creator</span></span><span className="hidden text-[#656c7a] sm:block">⌄</span></summary><div className="absolute right-0 top-12 z-20 w-44 rounded-xl border border-[#e3e1e9] bg-white p-2 shadow-[0_12px_30px_rgba(45,35,75,0.12)]"><button type="button" onClick={signOut} disabled={signingOut} className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#30333b] hover:bg-[#f7f4ff]">{signingOut ? 'Signing out...' : 'Sign out'}</button></div></details></div></header><div className="mx-auto flex max-w-[1600px]"><aside className="hidden w-[230px] shrink-0 border-r border-[#e8e7eb] bg-white px-5 py-8 lg:block"><nav className="space-y-2" aria-label="Creator navigation"><Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-[#424754] hover:bg-[#faf8ff]"><Icon name="home" />Dashboard</Link><a href="#profile-sections" className="flex items-center gap-3 rounded-xl bg-[#f1ebff] px-4 py-3.5 text-sm font-medium text-[#6330dc]"><Icon name="user" />My Profile</a><a href="#next-steps" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-[#424754] hover:bg-[#faf8ff]"><Icon name="message" />Messages</a><a href="#profile-status" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-[#424754] hover:bg-[#faf8ff]"><Icon name="settings" />Settings</a></nav><div className="mt-36 rounded-2xl border border-[#e8e0fa] bg-[#fbf9ff] p-5"><div className="grid h-9 w-9 place-items-center rounded-full border border-[#d9c8ff] text-[#6330dc]"><Icon name="spark" /></div><h2 className="mt-5 text-sm font-semibold">Complete your profile</h2><p className="mt-2 text-xs leading-5 text-[#626a7a]">Build your professional creator profile on CloutCo.</p><p className="mt-4 flex items-center gap-2 text-xs font-medium text-[#34363d]"><span className="text-[#13a34a]"><Icon name="check" /></span>Basic information complete</p><p className="mt-2 text-xs text-[#777e8d]">Professional profile<br />Not started</p><a href="#profile-sections" className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-[#d3c1ff] px-3 py-2.5 text-xs font-medium text-[#6330dc]">Continue Profile <Icon name="arrow" /></a></div></aside><div className="min-w-0 flex-1 px-5 py-9 sm:px-8 lg:px-12 lg:py-11"><section className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7440f4]">My Profile</p><h1 className="mt-4 text-[2.4rem] font-semibold tracking-[-0.065em] sm:text-[3rem]">My Profile</h1><p className="mt-3 max-w-[500px] text-sm leading-6 text-[#5d6575]">Your professional creator profile helps brands understand who you are and what you create.</p></div><div className="hidden items-center gap-3 pr-10 md:flex" aria-hidden="true"><div className="relative h-[102px] w-[164px] rotate-[-7deg] rounded-xl border border-[#d9cdf7] bg-[#fbf9ff] p-4 shadow-[0_10px_25px_rgba(105,65,205,0.1)]"><span className="block h-8 w-8 rounded-full bg-[#8a61e8]" /><span className="absolute left-16 top-6 h-2 w-16 rounded-full bg-[#d5c5fa]" /><span className="absolute left-16 top-11 h-2 w-20 rounded-full bg-[#e4dbfa]" /><span className="absolute bottom-4 left-4 h-2 w-28 rounded-full bg-[#e4dbfa]" /></div><span className="grid h-14 w-14 place-items-center rounded-full bg-[#7440f4] text-3xl text-white shadow-[0_8px_20px_rgba(116,64,244,0.28)]">✓</span></div></section><div className="mt-10 grid gap-5 xl:grid-cols-[1.18fr_0.82fr]"><section className="rounded-2xl border border-[#e8e7eb] bg-white p-6 shadow-[0_7px_24px_rgba(50,40,80,0.035)] sm:p-7"><div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold tracking-[-0.03em]">Profile setup progress</h2><p className="mt-2 text-sm text-[#626a7a]">{completedCount} section{completedCount === 1 ? '' : 's'} completed</p></div><span className="grid h-10 w-10 place-items-center rounded-full bg-[#f1ebff] text-[#7440f4]"><Icon name="document" /></span></div><div className="mt-7 flex items-center gap-4"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#eee9f9]"><div className="h-full rounded-full bg-[#7440f4]" style={{ width: `${(completedCount / profileSections.length) * 100}%` }} /></div><span className="whitespace-nowrap text-sm font-semibold text-[#6330dc]">{completedCount} of {profileSections.length}</span></div><div className="mt-6 grid gap-4 border-t border-[#f0eff2] pt-5 sm:grid-cols-2"><div><p className="text-sm font-medium">Basic Information</p><p className="mt-1 text-xs text-[#777e8d]">{complete ? 'Completed' : 'Not started'}</p></div><div><p className="text-sm font-medium">{profileSections.length - completedCount} sections remaining</p><p className="mt-1 text-xs text-[#777e8d]">Complete your professional profile step by step.</p></div></div></section><section id="profile-status" className="rounded-2xl border border-[#e8e7eb] bg-white p-6 shadow-[0_7px_24px_rgba(50,40,80,0.035)] sm:p-7"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold tracking-[-0.03em]">Profile status</h2><span className="rounded-full bg-[#fff3d9] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-[#a06900]">{status}</span></div><div className="mt-7 flex flex-col items-center text-center"><span className="grid h-14 w-14 place-items-center rounded-full bg-[#f1ebff] text-[#7440f4]"><Icon name="shield" /></span><h3 className="mt-4 text-sm font-semibold">{statusCopy}</h3><p className="mt-3 max-w-[230px] text-xs leading-5 text-[#656d7c]">Your basic details are saved in your CloutCo creator profile.</p></div></section></div><section id="profile-sections" className="mt-5 rounded-2xl border border-[#e8e7eb] bg-white p-6 shadow-[0_7px_24px_rgba(50,40,80,0.035)] sm:p-7"><h2 className="text-lg font-semibold tracking-[-0.03em]">Profile sections</h2><p className="mt-2 text-sm text-[#626a7a]">Complete each section to build your professional creator profile.</p><div className="mt-6 space-y-2">{currentSections.map((section) => { const row = <div className="flex items-center gap-4 rounded-xl border border-[#eeeef2] px-4 py-3.5 transition hover:border-[#ded3f7] hover:bg-[#fcfbff]"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${section.complete ? 'bg-[#eefbf2] text-[#13a34a]' : 'bg-[#f3edff] text-[#7440f4]'}`}><Icon name={section.complete ? 'check' : section.icon} /></span><span className="min-w-0 flex-1"><strong className="block text-sm font-semibold">{section.title}</strong><small className="mt-1 block text-xs text-[#777e8d]">{section.description}</small></span><span className={`hidden rounded-full px-3 py-1 text-[0.68rem] font-medium sm:block ${section.complete ? 'bg-[#eefbf2] text-[#21834a]' : 'bg-[#f5f0ff] text-[#7440f4]'}`}>{section.state}</span><span className="text-[#858b98]"><Icon name="chevron" /></span></div>; return section.route ? <Link key={section.title} href={section.route}>{row}</Link> : <div key={section.title} aria-disabled="true">{row}</div>; })}</div></section><section id="next-steps" className="mt-5 rounded-2xl border border-[#e8e7eb] bg-white p-6 shadow-[0_7px_24px_rgba(50,40,80,0.035)] sm:p-7"><h2 className="text-lg font-semibold tracking-[-0.03em]">Why complete your profile?</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{reasons.map((reason) => <p key={reason} className="flex items-start gap-3 text-sm leading-5 text-[#4e5667]"><span className="mt-0.5 text-[#7440f4]"><Icon name="check" /></span>{reason}</p>)}</div><div className="mt-7 border-t border-[#f0eff2] pt-6"><div className="flex items-center justify-between gap-3"><h3 className="text-base font-semibold">Profile status</h3><span className="rounded-full bg-[#fff3d9] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-[#a06900]">{status}</span></div><p className="mt-4 text-sm font-medium">{statusCopy}</p><p className="mt-2 text-sm leading-5 text-[#656d7c]">Your basic details are saved in your CloutCo creator profile.</p></div></section></div></div></main>;
}

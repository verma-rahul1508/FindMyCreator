'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import { loadCreatorProfileProgress, type CreatorProfileProgress } from '@/lib/profile-progress';

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

const creatorFields = 'id, full_name, email, phone_number, current_city, date_of_birth, gender, status, created_at';

function Icon({ name }: { name: 'home' | 'user' | 'message' | 'settings' | 'bell' | 'arrow' | 'check' }) {
  const paths = {
    home: <><path d="m3.5 10 8.5-7 8.5 7" /><path d="M5.5 9v10h13V9M9.5 19v-5h5v5" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 20c.5-3.4 2.8-5 7-5s6.5 1.6 7 5" /></>,
    message: <><path d="M5 6.5h14v9H9l-4 3v-12Z" /><path d="M8 10h8M8 13h5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19 13.2a7.6 7.6 0 0 0 0-2.4l-2-1.5 2-3.4-2.4-1a8 8 0 0 0-2-1.2L14.3 3h-4.6l-.4 2.7a8 8 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 2.4l-2 1.5 2.4 3.4 2.4-1a8 8 0 0 0 2 1.2l.4 2.7h4.6l.4-2.7a8 8 0 0 0 2-1.2l2.4 1 2.4-1 2-3.4-2-1.5Z" /></>,
    bell: <><path d="M6.5 16.5h11l-1.2-1.8V10a4.3 4.3 0 0 0-8.6 0v4.7l-1.2 1.8Z" /><path d="M10 19h4" /></>,
    arrow: <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>,
    check: <><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
  };

  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.65]">{paths[name]}</svg>;
}

function ErrorState({ retry }: { retry: () => void }) {
  return <main className="grid min-h-screen place-items-center bg-[#fbfaff] px-6 text-center"><div className="max-w-md rounded-2xl border border-[#e8e4f1] bg-white p-8"><h1 className="text-2xl font-semibold tracking-[-0.05em] text-black">We couldn&apos;t load your profile</h1><p className="mt-3 text-sm leading-6 text-[#626a7a]">Please try again. Your profile information has not been changed.</p><button type="button" onClick={retry} className="mt-6 rounded-lg bg-black px-5 py-3 text-sm font-medium text-white">Try again</button></div></main>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [progress, setProgress] = useState<CreatorProfileProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    setLoadError(false);

    const supabase = getSupabaseClient();
    if (!supabase) {
      router.replace('/signin');
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.replace('/signin');
      return;
    }

    try {
      const [{ data: creatorData, error: creatorError }, progressData] = await Promise.all([
        supabase.from('creators').select(creatorFields).eq('auth_user_id', userData.user.id).maybeSingle(),
        loadCreatorProfileProgress(),
      ]);

      if (creatorError || !creatorData) throw creatorError || new Error('Creator profile not found.');

      setUser(userData.user);
      setCreator(creatorData as Creator);
      setProgress(progressData);
      setLoading(false);
    } catch {
      setLoadError(true);
      setLoading(false);
    }
  };

  useEffect(() => { void loadProfile(); }, []);

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (!error) router.replace('/signin');
    else setSigningOut(false);
  };

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#fbfaff] text-sm text-[#5b6272]">Loading your creator profile...</main>;
  if (loadError || !creator || !user || !progress) return <ErrorState retry={() => void loadProfile()} />;

  const name = creator.full_name.trim() || 'Creator';
  const firstName = name.split(/\s+/)[0];
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const progressByKey = new Map(progress.sections.map((section) => [section.key, section]));
  const basicInformation = progressByKey.get('basic-information');
  const creatorIdentity = progressByKey.get('creator-identity');
  const nextSection = progress.firstIncompleteRequiredSection;
  const nextProfileRoute = nextSection?.route ?? '/profile';
  const remainingRequiredSections = progress.sections.filter((section) => section.required && !section.completed);
  const progressPercent = (progress.completedCount / progress.requiredCount) * 100;
  const isProfileComplete = progress.allRequiredComplete;
  const status = creator.status ? creator.status.charAt(0).toUpperCase() + creator.status.slice(1) : 'Not available';

  return <main className="min-h-screen bg-[#fbfaff] text-[#151518]">
    <header className="flex h-[78px] items-center justify-between border-b border-[#e8e7eb] bg-white px-5 sm:px-8 lg:px-10">
      <Link href="/" className="text-[1.5rem] font-semibold tracking-[-0.08em] text-black sm:text-[1.8rem]">CLOUTCO<span className="text-[#6330dc]">.</span></Link>
      <div className="flex items-center gap-4 sm:gap-6"><button type="button" className="text-[#525966]" aria-label="Notifications"><Icon name="bell" /></button><details className="group relative"><summary className="flex cursor-pointer list-none items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#eee8ff] text-sm font-semibold text-[#6330dc]">{initials}</span><span className="hidden text-left sm:block"><strong className="block max-w-[160px] truncate text-sm font-semibold">{name}</strong><span className="block text-xs text-[#707787]">Creator</span></span><span className="hidden text-[#656c7a] sm:block">⌄</span></summary><div className="absolute right-0 top-12 z-20 w-44 rounded-xl border border-[#e3e1e9] bg-white p-2 shadow-lg"><button type="button" onClick={signOut} disabled={signingOut} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f7f4ff]">{signingOut ? 'Signing out...' : 'Sign out'}</button></div></details></div>
    </header>

    <div className="mx-auto flex max-w-[1600px]">
      <aside className="hidden w-[230px] shrink-0 border-r border-[#e8e7eb] bg-white px-5 py-8 lg:block">
        <nav className="space-y-2" aria-label="Creator navigation"><a href="#top" className="flex items-center gap-3 rounded-xl bg-[#f1ebff] px-4 py-3.5 text-sm font-medium text-[#6330dc]"><Icon name="home" />Dashboard</a><Link href="/profile" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-[#424754] hover:bg-[#faf8ff]"><Icon name="user" />My Profile</Link><a href="#next-steps" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-[#424754] hover:bg-[#faf8ff]"><Icon name="message" />Messages</a><a href="#account" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-[#424754] hover:bg-[#faf8ff]"><Icon name="settings" />Settings</a></nav>
        <div className="mt-36 rounded-2xl border border-[#e8e0fa] bg-[#fbf9ff] p-5"><div className="grid h-9 w-9 place-items-center rounded-full border border-[#d9c8ff] text-[#6330dc]"><Icon name="check" /></div><h2 className="mt-5 text-sm font-semibold">Complete your profile</h2><p className="mt-2 text-xs leading-5 text-[#626a7a]">Build your professional presence on CloutCo.</p><p className="mt-4 text-xs font-medium text-[#34363d]">{progress.completedCount} of {progress.requiredCount} sections completed</p><p className="mt-1 text-xs text-[#777e8d]">{nextSection ? `Next: ${nextSection.title}` : 'Required sections complete'}</p>{nextSection ? <Link href={nextProfileRoute} className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-[#d3c1ff] px-3 py-2.5 text-xs font-medium text-[#6330dc]">Continue Profile <Icon name="arrow" /></Link> : <span className="mt-5 flex items-center justify-center rounded-lg border border-[#e2ddec] px-3 py-2.5 text-xs font-medium text-[#777e8d]">Required sections complete</span>}</div>
      </aside>

      <div id="top" className="min-w-0 flex-1 px-5 py-9 sm:px-8 lg:px-12 lg:py-11">
        <section className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7440f4]">Creator onboarding</p><h1 className="mt-4 text-[2rem] font-semibold tracking-[-0.06em] sm:text-[2.5rem]">Welcome back, {firstName}! <span aria-hidden="true">👋</span></h1><p className="mt-3 max-w-[500px] text-sm leading-6 text-[#5d6575]">Complete your creator profile to build your professional presence on CloutCo.</p></div><div className="hidden items-center gap-3 pr-10 md:flex" aria-hidden="true"><div className="relative h-[102px] w-[164px] rotate-[-7deg] rounded-xl border border-[#d9cdf7] bg-[#fbf9ff] p-4"><span className="block h-8 w-8 rounded-full bg-[#8a61e8]" /></div><span className="grid h-14 w-14 place-items-center rounded-full bg-[#7440f4] text-3xl text-white">✓</span></div></section>

        <div className="mt-10 grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
          <section id="setup" className="rounded-2xl border border-[#e8e7eb] bg-white p-6 shadow-[0_7px_24px_rgba(50,40,80,0.035)] sm:p-7"><h2 className="text-lg font-semibold tracking-[-0.03em]">Profile setup</h2><p className="mt-2 text-sm text-[#626a7a]">{basicInformation?.completed ? 'Basic information complete' : 'Basic information needs attention'}</p><div className="mt-7 flex items-center gap-4"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#eee9f9]"><div className={`h-full rounded-full ${isProfileComplete ? 'bg-[#13a34a]' : 'bg-[#7440f4]'}`} style={{ width: `${progressPercent}%` }} /></div><span className="whitespace-nowrap text-sm font-semibold text-[#6330dc]">{progress.completedCount} of {progress.requiredCount}</span></div><p className="mt-5 text-sm text-[#656d7c]">Creator Identity <span className="mx-1 text-[#b8b3c2]">·</span> <span className="font-medium text-[#31343b]">{creatorIdentity?.completed ? 'Completed' : 'Not started'}</span></p>{nextSection ? <Link href={nextProfileRoute} className="mt-7 flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-[#0d0f11] text-sm font-medium text-white">Continue Profile <Icon name="arrow" /></Link> : <span className="mt-7 flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-[#eaebee] text-sm font-medium text-[#737987]">Required sections complete</span>}</section>
          <section className="rounded-2xl border border-[#e8e7eb] bg-white p-6 shadow-[0_7px_24px_rgba(50,40,80,0.035)] sm:p-7"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold tracking-[-0.03em]">Profile status</h2><span className="rounded-full bg-[#fff3d9] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-[#a06900]">{status}</span></div><div className="mt-7 flex flex-col items-center text-center"><span className="grid h-14 w-14 place-items-center rounded-full bg-[#f1ebff] text-[#7440f4]"><Icon name="check" /></span><h3 className="mt-4 text-sm font-semibold">{creator.status === 'pending' ? 'Your profile is being prepared.' : 'Your creator profile is active.'}</h3><p className="mt-3 max-w-[230px] text-xs leading-5 text-[#656d7c]">Your basic details are saved in your CloutCo creator profile.</p></div></section>
        </div>

        <section id="profile" className="mt-5 rounded-2xl border border-[#e8e7eb] bg-white p-6 shadow-[0_7px_24px_rgba(50,40,80,0.035)] sm:p-7"><h2 className="text-lg font-semibold tracking-[-0.03em]">Your creator profile</h2><div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"><div><span className="text-xs text-[#747b89]">Name</span><p className="mt-1 truncate text-sm font-medium">{name}</p></div><div><span className="text-xs text-[#747b89]">Location</span><p className="mt-1 truncate text-sm font-medium">{creator.current_city || 'Not added yet'}</p></div><div><span className="text-xs text-[#747b89]">Member since</span><p className="mt-1 text-sm font-medium">{new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(new Date(creator.created_at))}</p></div><div><span className="text-xs text-[#747b89]">Profile status</span><p className="mt-1 text-sm font-medium">{status}</p></div></div><div className="mt-6 grid gap-6 border-t border-[#f0eff2] pt-6 sm:grid-cols-2"><div><span className="text-xs text-[#747b89]">Email</span><p className="mt-1 truncate text-sm font-medium">{creator.email || user.email || 'Not added yet'}</p></div><div><span className="text-xs text-[#747b89]">Gender</span><p className="mt-1 text-sm font-medium">{creator.gender || 'Not added yet'}</p></div></div></section>

        <section id="account" className="mt-5 rounded-2xl border border-[#e8e7eb] bg-white p-6 shadow-[0_7px_24px_rgba(50,40,80,0.035)] sm:p-7"><h2 className="text-lg font-semibold tracking-[-0.03em]">Profile sections</h2><div className="mt-5 space-y-1">{progress.sections.map((section) => <div key={section.key} className={`flex items-center gap-3 rounded-lg px-1 py-3 ${section.completed ? 'bg-[#faf8ff]' : ''}`}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${section.completed ? 'bg-[#eefbf2] text-[#13a34a]' : 'bg-[#f3edff] text-[#7440f4]'}`}><Icon name={section.completed ? 'check' : 'user'} /></span><span><strong className="block text-xs font-medium">{section.title}{section.required ? '' : ' (Optional)'}</strong><small className="text-[0.68rem] text-[#777e8d]">{section.completed ? 'Completed' : section.required ? 'Not started' : 'Optional / Not started'}</small></span></div>)}</div></section>

        <section id="next-steps" className="mt-5 rounded-2xl border border-[#e8e7eb] bg-white p-6 shadow-[0_7px_24px_rgba(50,40,80,0.035)] sm:p-7"><h2 className="text-lg font-semibold tracking-[-0.03em]">Next steps to complete your profile</h2><p className="mt-2 text-sm text-[#626a7a]">Build your professional creator profile step by step.</p><div className="mt-6 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{remainingRequiredSections.length ? remainingRequiredSections.map((section) => <div key={section.key} className="flex min-h-[76px] items-center gap-3 rounded-xl bg-[#fbf9ff] px-4 py-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f1eaff] text-[#7440f4]"><Icon name="user" /></span><span><strong className="block text-sm font-medium">Complete {section.title}</strong><small className="mt-1 block text-xs leading-4 text-[#777e8d]">Not started</small></span></div>) : <p className="text-sm text-[#656d7c]">All required profile sections are complete.</p>}</div></section>
      </div>
    </div>
  </main>;
}

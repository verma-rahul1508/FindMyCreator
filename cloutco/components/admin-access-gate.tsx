'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AuthAwareLogo } from '@/components/auth-aware-logo';
import { getSupabaseClient } from '@/lib/supabase/client';

type AccessState = 'checking' | 'forbidden';

function DashboardIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.7]"><rect x="4" y="4" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" /></svg>;
}

function CreatorsIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.7]"><circle cx="9" cy="8" r="3" /><path d="M3.8 19c.5-3.1 2.3-4.8 5.2-4.8s4.7 1.7 5.2 4.8M16.5 5.5c2.1 0 3.7 1.5 3.7 3.6 0 1.6-.9 2.8-2.3 3.4M17.2 14.4c1.9.3 3.1 1.8 3.4 4.1" /></svg>;
}

function AnalyticsIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.7]"><path d="M4 19.5V5.5M4 19.5h16" /><path d="m7.5 15.5 3.2-3.2 2.7 1.8 4.1-5" /><path d="M15.8 9.1h1.9V11" /></svg>;
}

function ReportsIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.7]"><path d="M6.5 3.5h8l3 3v14h-11v-17Z" /><path d="M14.5 3.5v4h4M9 12h6M9 15.5h6" /></svg>;
}

function MenuIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]"><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

function SignOutIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.7]"><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" /></svg>;
}

function AdminNavigation({ email, onSignOut, onNavigate }: { email: string | null; onSignOut: () => void; onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navigationItemClassName = (active: boolean) => `flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition ${active ? 'bg-[#f1ebff] font-semibold text-[#6330dc]' : 'font-medium text-[#515764] hover:bg-[#f8f6fb] hover:text-[#26282e]'}`;
  const creatorsActive = pathname.startsWith('/admin/creators');
  const pendingReviewActive = searchParams.get('status') === 'pending';
  const allCreatorsActive = creatorsActive && !searchParams.get('status');

  return <div className="flex h-full flex-col">
    <div className="border-b border-[#e8e7eb] px-5 py-6">
      <AuthAwareLogo ariaLabel="CloutCo home" />
      <p className="mt-3 text-[0.67rem] font-bold uppercase tracking-[0.18em] text-[#7C3AED]">Admin</p>
    </div>

    <nav className="space-y-1 px-3 py-5" aria-label="Admin navigation">
      <Link href="/admin" onClick={onNavigate} className={navigationItemClassName(pathname === '/admin')}><DashboardIcon />Dashboard</Link>
      <div className="pt-1">
        <Link href="/admin/creators" onClick={onNavigate} className={navigationItemClassName(creatorsActive)}><CreatorsIcon />Creators</Link>
        <div className="ml-8 mt-1 space-y-1 border-l border-[#e7e2ef] pl-3">
          <Link href="/admin/creators" onClick={onNavigate} className={`block rounded-lg px-2 py-2 text-xs transition ${allCreatorsActive ? 'font-semibold text-[#6330dc]' : 'text-[#697080] hover:bg-[#f8f6fb] hover:text-[#32343a]'}`}>All Creators</Link>
          <Link href="/admin/creators?status=pending" onClick={onNavigate} className={`block rounded-lg px-2 py-2 text-xs transition ${pendingReviewActive ? 'font-semibold text-[#6330dc]' : 'text-[#697080] hover:bg-[#f8f6fb] hover:text-[#32343a]'}`}>Pending Review</Link>
        </div>
      </div>
      <Link href="/admin/analytics" onClick={onNavigate} className={navigationItemClassName(pathname === '/admin/analytics')}><AnalyticsIcon />Analytics</Link>
      <Link href="/admin/reports" onClick={onNavigate} className={navigationItemClassName(pathname === '/admin/reports')}><ReportsIcon />Reports</Link>
    </nav>

    <div className="mt-auto border-t border-[#e8e7eb] p-4">
      <div className="rounded-xl bg-[#faf8ff] px-3.5 py-3">
        <p className="text-xs font-semibold text-[#24252a]">Admin</p>
        <p className="mt-1 truncate text-xs text-[#697080]">{email ?? 'Authenticated administrator'}</p>
      </div>
      <button type="button" onClick={onSignOut} className="mt-3 flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-medium text-[#454b57] transition hover:bg-[#f8f6fb] hover:text-[#151518]"><SignOutIcon />Sign Out</button>
    </div>
  </div>;
}

export function AdminShell({ email, children }: { email: string | null; children: ReactNode }) {
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const router = useRouter();

  const signOut = async () => {
    const supabase = getSupabaseClient();
    await supabase?.auth.signOut();
    await fetch('/api/admin/session', { method: 'DELETE', cache: 'no-store' });
    router.replace('/signin');
    router.refresh();
  };

  return <main className="min-h-screen bg-[#fffdfc] text-[#151518]">
    <div className="mx-auto flex min-h-screen max-w-[1600px]">
      <aside className="hidden w-[264px] shrink-0 border-r border-[#e8e7eb] bg-white lg:block">
        <AdminNavigation email={email} onSignOut={() => void signOut()} />
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex h-[76px] items-center justify-between border-b border-[#e8e7eb] bg-white px-5 sm:px-8 lg:px-10">
          <div className="lg:hidden"><AuthAwareLogo ariaLabel="CloutCo home" /></div>
          <p className="hidden text-xs font-bold uppercase tracking-[0.18em] text-[#7C3AED] lg:block">Admin workspace</p>
          <button type="button" aria-label="Open admin navigation" aria-expanded={mobileNavigationOpen} onClick={() => setMobileNavigationOpen(true)} className="grid h-10 w-10 place-items-center rounded-full border border-[#e3e1e9] text-[#525966] transition hover:bg-[#f7f4ff] lg:hidden"><MenuIcon /></button>
          <p className="hidden max-w-[280px] truncate text-sm text-[#697080] sm:block lg:hidden">{email ?? 'Admin'}</p>
        </header>
        {children}
      </div>
    </div>

    {mobileNavigationOpen && <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
      <button type="button" aria-label="Close admin navigation" onClick={() => setMobileNavigationOpen(false)} className="absolute inset-0 bg-[#151518]/30" />
      <aside className="relative h-full w-[calc(100vw-2rem)] max-w-xs bg-white shadow-[12px_0_32px_rgba(45,35,75,0.18)]">
        <button type="button" aria-label="Close admin navigation" onClick={() => setMobileNavigationOpen(false)} className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full border border-[#e3e1e9] text-[#525966]"><CloseIcon /></button>
        <AdminNavigation email={email} onSignOut={() => void signOut()} onNavigate={() => setMobileNavigationOpen(false)} />
      </aside>
    </div>}
  </main>;
}

export function AdminSessionBootstrap() {
  const router = useRouter();
  const [accessState, setAccessState] = useState<AccessState>('checking');

  useEffect(() => {
    let active = true;

    const verifyAccess = async () => {
      const supabase = getSupabaseClient();
      const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        router.replace('/signin');
        return;
      }

      try {
        const response = await fetch('/api/admin/session', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });

        if (!active) return;

        if (response.status === 401) {
          router.replace('/signin');
          return;
        }

        if (!response.ok) {
          setAccessState('forbidden');
          return;
        }

        window.location.reload();
      } catch {
        if (active) setAccessState('forbidden');
      }
    };

    void verifyAccess();

    return () => { active = false; };
  }, [router]);

  if (accessState === 'checking') {
    return <main className="grid min-h-screen place-items-center bg-[#fffdfc] px-6 text-center"><p className="text-sm text-[#697080]">Verifying administrator access...</p></main>;
  }

  if (accessState === 'forbidden') {
    return <main className="grid min-h-screen place-items-center bg-[#fffdfc] px-6 text-center"><section className="max-w-md rounded-2xl border border-[#e8e7eb] bg-white p-8 shadow-[0_12px_35px_rgba(33,24,54,0.06)]"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7C3AED]">Access restricted</p><h1 className="mt-4 text-2xl font-semibold tracking-[-0.05em] text-[#151518]">Administrator access is required.</h1><p className="mt-3 text-sm leading-6 text-[#697080]">This account is not authorized to view the CloutCo admin workspace.</p><Link href="/dashboard" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#151518] px-5 text-sm font-medium text-white transition hover:bg-[#2a2b2f]">Return to Dashboard</Link></section></main>;
  }

  return null;
}

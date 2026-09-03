'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      router.replace('/signin');
      return;
    }

    let isMounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) return;
      if (!data.user) {
        router.replace('/signin');
      } else {
        setUser(data.user);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setIsSigningOut(true);
    await supabase.auth.signOut();
    router.replace('/signin');
  };

  if (isLoading) {
    return <main className="grid min-h-screen place-items-center bg-[#fffdfc] text-sm text-[#586071]">Loading your account...</main>;
  }

  return (
    <main className="min-h-screen bg-[#fffdfc] px-6 py-8 sm:px-10">
      <div className="mx-auto flex max-w-5xl items-center justify-between border-b border-[#e4e5e9] pb-6">
        <Link href="/" className="text-[1.5rem] font-semibold tracking-[-0.08em] text-black">CLOUTCO<span className="text-[#6330dc]">.</span></Link>
        <button type="button" onClick={handleSignOut} disabled={isSigningOut} className="rounded-full border border-[#d9dce3] px-4 py-2 text-sm font-medium text-[#292a2e] transition hover:border-[#6330dc] hover:text-[#6330dc] disabled:opacity-60">{isSigningOut ? 'Signing out...' : 'Sign out'}</button>
      </div>
      <section className="mx-auto max-w-5xl py-20">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#6330dc]">Creator dashboard</p>
        <h1 className="mt-5 text-5xl font-semibold tracking-[-0.07em] text-black sm:text-7xl">You&apos;re signed in.</h1>
        <p className="mt-6 text-base text-[#586071]">{user?.email}</p>
      </section>
    </main>
  );
}
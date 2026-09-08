'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type MouseEvent } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

type AuthAwareLogoProps = {
  className?: string;
  ariaLabel?: string;
};

export function AuthAwareLogo({ className, ariaLabel }: AuthAwareLogoProps) {
  const router = useRouter();
  const [isResolvingDestination, setIsResolvingDestination] = useState(false);

  const navigateToCurrentUserHome = async (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();

    if (isResolvingDestination) return;

    setIsResolvingDestination(true);

    try {
      const supabase = getSupabaseClient();
      const { data, error } = supabase ? await supabase.auth.getUser() : { data: { user: null }, error: null };

      router.push(!error && data.user ? '/dashboard' : '/');
    } catch {
      router.push('/');
    } finally {
      setIsResolvingDestination(false);
    }
  };

  return (
    <Link
      href="/"
      onClick={(event) => void navigateToCurrentUserHome(event)}
      className={`inline-flex shrink-0 items-center transition-opacity hover:opacity-75 ${className ?? ''}`}
      aria-label={ariaLabel}
      aria-busy={isResolvingDestination || undefined}
    >
      <span className="inline-flex items-baseline font-sans text-[19px] font-bold leading-none tracking-[-0.045em] sm:text-[20px]">
        <span className="text-[#0F172A]">Clout</span>
        <span className="text-[#7C3AED]">Co</span>
      </span>
    </Link>
  );
}

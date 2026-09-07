'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type MouseEvent, type ReactNode } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

type AuthAwareLogoProps = {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
};

export function AuthAwareLogo({ children, className, ariaLabel }: AuthAwareLogoProps) {
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
      className={className}
      aria-label={ariaLabel}
      aria-busy={isResolvingDestination || undefined}
    >
      {children}
    </Link>
  );
}

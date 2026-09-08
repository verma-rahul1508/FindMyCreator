'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';

type HeaderIdentity = {
  name: string;
  initials: string;
  photoUrl: string;
};

type AuthenticatedCreatorHeaderIdentityProps = {
  variant: 'menu' | 'compact';
  menuShadowClassName?: string;
};

const initialIdentity: HeaderIdentity = {
  name: '',
  initials: '',
  photoUrl: '',
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function AuthenticatedCreatorHeaderIdentity({ variant, menuShadowClassName = 'shadow-[0_12px_30px_rgba(45,35,75,0.12)]' }: AuthenticatedCreatorHeaderIdentityProps) {
  const router = useRouter();
  const [identity, setIdentity] = useState<HeaderIdentity>(initialIdentity);
  const [isLoading, setIsLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadIdentity = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) return;

        const { data: creator, error: creatorError } = await supabase
          .from('creators')
          .select('id, full_name')
          .eq('auth_user_id', userData.user.id)
          .maybeSingle();

        if (creatorError || !creator || cancelled) return;

        const { data: creatorIdentity, error: identityError } = await supabase
          .from('creator_identity')
          .select('display_name, profile_photo_url')
          .eq('creator_id', creator.id)
          .maybeSingle();

        if (identityError || cancelled) return;

        const name = creatorIdentity?.display_name?.trim() || creator.full_name?.trim() || '';
        let photoUrl = '';

        if (creatorIdentity?.profile_photo_url) {
          const { data: signedUrl } = await supabase.storage
            .from('creator-profile-photos')
            .createSignedUrl(creatorIdentity.profile_photo_url, 3600);
          photoUrl = signedUrl?.signedUrl ?? '';
        }

        if (!cancelled) {
          setIdentity({ name, initials: getInitials(name), photoUrl });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadIdentity();

    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = async () => {
    setSigningOut(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setSigningOut(false);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      setSigningOut(false);
      return;
    }

    router.replace('/signin');
  };

  const avatar = (
    <span className={`grid place-items-center overflow-hidden rounded-full bg-[#eee8ff] font-semibold text-[#6330dc] ${variant === 'menu' ? 'h-10 w-10 text-sm' : 'h-9 w-9 text-xs'}`}>
      {identity.photoUrl ? <img src={identity.photoUrl} alt="Profile photo" className="h-full w-full object-cover" /> : identity.initials}
    </span>
  );

  const name = isLoading ? <span aria-label="Loading creator name" className="block h-3 w-28 animate-pulse rounded-full bg-[#eee8ff]" /> : identity.name || '—';
  const arrow = <span aria-hidden="true" className={`hidden h-10 w-4 shrink-0 place-items-center ${variant === 'menu' ? 'text-[#656c7a]' : 'text-[#626a7a]'} sm:grid`}>⌄</span>;

  if (variant === 'compact') {
    return <div className="flex items-center gap-3">{avatar}<span className="hidden text-sm font-medium sm:block">{name}</span>{arrow}</div>;
  }

  return <details className="group relative"><summary className="flex cursor-pointer list-none items-center gap-3">{avatar}<span className="hidden min-w-0 text-left sm:block">{isLoading ? name : <strong className="block max-w-[160px] truncate text-sm font-semibold">{name}</strong>}<span className="block text-xs text-[#707787]">Creator</span></span>{arrow}</summary><div className={`absolute right-0 top-12 z-20 w-44 rounded-xl border border-[#e3e1e9] bg-white p-2 ${menuShadowClassName}`}><Link href="/profile" className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[#30333b] hover:bg-[#f7f4ff]">View Profile</Link><button type="button" onClick={() => void signOut()} disabled={signingOut} className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#30333b] hover:bg-[#f7f4ff]">{signingOut ? 'Signing out...' : 'Sign out'}</button></div></details>;
}

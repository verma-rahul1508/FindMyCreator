'use client';

import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

export function AdminCreatorPhoto({ creatorId, name, photoUrl, className = 'h-12 w-12 rounded-xl' }: { creatorId: string; name: string; photoUrl?: string | null; className?: string }) {
  const [loadedUrl, setUrl] = useState<string | null>(null);
  const url = photoUrl === undefined ? loadedUrl : photoUrl;
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CC';

  useEffect(() => {
    // Supplying null also disables the individual lookup while a batch loads.
    if (photoUrl !== undefined) return;
    let active = true;
    const loadPhoto = async () => {
      const supabase = getSupabaseClient();
      const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return null;

      const response = await fetch(`/api/admin/creators/${creatorId}/photo`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.ok ? response.json() as Promise<{ url?: string }> : null;
    };

    void loadPhoto()
      .then((result) => { if (active) setUrl(result?.url || null); })
      .catch(() => { if (active) setUrl(null); });
    return () => { active = false; };
  }, [creatorId, photoUrl]);

  if (!url) return <span aria-label={`${name} profile photo`} className={`grid shrink-0 place-items-center overflow-hidden bg-[#eee8ff] text-xs font-bold text-[#6330dc] ${className}`}>{initials}</span>;
  // Signed URLs are short-lived and intentionally bypass image optimization.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} loading="lazy" decoding="async" alt={`${name} profile photo`} className={`shrink-0 object-cover ${className}`} />;
}

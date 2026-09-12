'use client';

import { useEffect, useState } from 'react';

export function AdminCreatorPhoto({ creatorId, name, className = 'h-12 w-12' }: { creatorId: string; name: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CC';

  useEffect(() => {
    let active = true;
    void fetch(`/api/admin/creators/${creatorId}/photo`, { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() as Promise<{ url?: string }> : null)
      .then((result) => { if (active) setUrl(result?.url || null); })
      .catch(() => { if (active) setUrl(null); });
    return () => { active = false; };
  }, [creatorId]);

  if (!url) return <span aria-label={`${name} profile photo`} className={`grid shrink-0 place-items-center overflow-hidden rounded-xl bg-[#eee8ff] text-xs font-bold text-[#6330dc] ${className}`}>{initials}</span>;
  // Signed URLs are short-lived and intentionally bypass image optimization.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={`${name} profile photo`} className={`shrink-0 rounded-xl object-cover ${className}`} />;
}

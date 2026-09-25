'use client';

import { useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { validateCreatorProfilePhoto } from '@/lib/creator-profile-photo';

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CC';
}

export function AdminCreatorPhotoUploader({ creatorId, name }: { creatorId: string; name: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const loadPhoto = async () => {
      setIsLoading(true);
      const supabase = getSupabaseClient();
      const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Please sign in again before managing this photo.');
      const response = await fetch(`/api/admin/creators/${creatorId}/photo`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('We could not load this profile photo.');
      const data = await response.json() as { url?: string };
      return data.url || null;
    };

    void loadPhoto()
      .then((url) => { if (active) setPhotoUrl(url); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'We could not load this profile photo.'); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [creatorId]);

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const validationError = validateCreatorProfilePhoto(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const supabase = getSupabaseClient();
    const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setError('Please sign in again before managing this photo.');
      return;
    }

    setIsUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`/api/admin/creators/${creatorId}/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      const data = await response.json().catch(() => null) as { url?: string; error?: string } | null;
      if (!response.ok || !data?.url) throw new Error(data?.error || 'We could not upload this profile photo.');
      setPhotoUrl(data.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not upload this profile photo.');
    } finally {
      setIsUploading(false);
    }
  };

  return <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-[#e8e7eb] bg-[#fcfbff] p-4">
    <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#eee8ff] text-lg font-bold text-[#6330dc]">
      {photoUrl
        // Signed URLs are short-lived and intentionally bypass image optimization.
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={photoUrl} alt={`${name || 'Creator'} profile photo`} className="h-full w-full object-cover" />
        : initials(name)}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-[#2b3242]">Profile photo</p>
      <p className="mt-1 text-xs leading-5 text-[#697080]">Upload a JPG, PNG, or WebP image up to 5 MB. This approved image can appear in the creator card and client proposal.</p>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event)} className="sr-only" />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={isLoading || isUploading} className="mt-3 min-h-10 rounded-lg border border-[#dedbe5] bg-white px-3 text-sm font-semibold text-[#5630ae] disabled:cursor-wait disabled:opacity-60">{isUploading ? 'Uploading…' : photoUrl ? 'Replace photo' : 'Upload photo'}</button>
      {error && <p role="alert" className="mt-2 text-xs font-medium text-[#b13d3d]">{error}</p>}
    </div>
  </div>;
}

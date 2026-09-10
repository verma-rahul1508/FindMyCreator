'use client';

import { useRef, useState } from 'react';
import { updateCreatorProfilePhoto, validateCreatorProfilePhoto } from '@/lib/creator-profile-photo';
import { getSupabaseClient } from '@/lib/supabase/client';

type ProfilePhotoEditorProps = {
  creatorId: string;
  photoUrl: string;
  initials: string;
  alt: string;
  className: string;
  imageClassName?: string;
  fallbackClassName?: string;
  onPhotoUpdated: (photoUrl: string) => void;
};

export function ProfilePhotoEditor({
  creatorId,
  photoUrl,
  initials,
  alt,
  className,
  imageClassName = 'h-full w-full object-cover object-center',
  fallbackClassName = 'grid h-full w-full place-items-center',
  onPhotoUpdated,
}: ProfilePhotoEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const choosePhoto = () => inputRef.current?.click();

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const validationError = validateCreatorProfilePhoto(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setUploadError('Please sign in again before updating your photo.');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    try {
      const updatedPhotoUrl = await updateCreatorProfilePhoto({ supabase, creatorId, file });
      onPhotoUpdated(updatedPhotoUrl);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'We could not update your profile photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return <div className={`group relative ${className}`}>
    {photoUrl ? <img src={photoUrl} alt={alt} className={imageClassName} /> : <div className={fallbackClassName}>{initials}</div>}
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handlePhotoChange(event)} className="sr-only" />
    <button type="button" onClick={choosePhoto} disabled={isUploading} aria-label="Edit profile photo" className="absolute inset-0 z-10 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6330dc] disabled:cursor-wait">
      <span className="absolute bottom-3 right-3 rounded-full border border-white/70 bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#5630ae] shadow-[0_5px_14px_rgba(45,30,80,0.18)] transition group-hover:bg-white group-focus-within:bg-white">{isUploading ? 'Uploading…' : 'Edit'}</span>
    </button>
    {uploadError && <p role="alert" className="absolute left-3 top-3 z-20 max-w-[calc(100%-1.5rem)] rounded-lg bg-[#241b35]/90 px-2.5 py-1.5 text-xs font-medium leading-4 text-white shadow-sm">{uploadError}</p>}
  </div>;
}

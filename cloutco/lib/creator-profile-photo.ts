import type { SupabaseClient } from '@supabase/supabase-js';

const profilePhotoBucket = 'creator-profile-photos';
const maxProfilePhotoSize = 5 * 1024 * 1024;
const profilePhotoTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validateCreatorProfilePhoto(file: File) {
  if (!profilePhotoTypes.has(file.type)) {
    return 'Choose a JPG, JPEG, PNG, or WebP image.';
  }

  if (file.size > maxProfilePhotoSize) {
    return 'Your profile photo must be 5 MB or smaller.';
  }

  return '';
}

function profilePhotoExtension(file: File) {
  return file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
}

function isCurrentUserPhotoPath(path: string, userId: string) {
  return path === `${userId}/profile-photo.jpg`
    || path === `${userId}/profile-photo.jpeg`
    || path === `${userId}/profile-photo.png`
    || path === `${userId}/profile-photo.webp`;
}

export async function updateCreatorProfilePhoto({
  supabase,
  creatorId,
  file,
}: {
  supabase: SupabaseClient;
  creatorId: string;
  file: File;
}) {
  const validationError = validateCreatorProfilePhoto(file);
  if (validationError) throw new Error(validationError);

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error('Please sign in again before updating your photo.');
  }

  const { data: identity, error: identityError } = await supabase
    .from('creator_identity')
    .select('profile_photo_url')
    .eq('creator_id', creatorId)
    .maybeSingle();

  if (identityError) throw new Error('We could not prepare your profile photo update. Please try again.');

  const photoPath = `${userData.user.id}/profile-photo.${profilePhotoExtension(file)}`;
  const previousPhotoPath = identity?.profile_photo_url?.trim() || '';
  let previousPhoto: Blob | null = null;

  if (previousPhotoPath === photoPath) {
    const { data, error } = await supabase.storage.from(profilePhotoBucket).download(photoPath);
    if (error || !data) {
      throw new Error('We could not prepare your current profile photo. Please try again.');
    }
    previousPhoto = data;
  }

  const { error: uploadError } = await supabase.storage
    .from(profilePhotoBucket)
    .upload(photoPath, file, { upsert: true, contentType: file.type });

  if (uploadError) throw new Error('We could not upload your profile photo. Please try again.');

  const { error: saveError } = identity
    ? await supabase
      .from('creator_identity')
      .update({ profile_photo_url: photoPath })
      .eq('creator_id', creatorId)
    : await supabase
      .from('creator_identity')
      .insert({ creator_id: creatorId, profile_photo_url: photoPath });

  if (saveError) {
    if (previousPhoto) {
      await supabase.storage
        .from(profilePhotoBucket)
        .upload(photoPath, previousPhoto, { upsert: true, contentType: previousPhoto.type || file.type });
    } else {
      await supabase.storage.from(profilePhotoBucket).remove([photoPath]);
    }

    throw new Error('We could not save your profile photo. Please try again.');
  }

  if (previousPhotoPath && previousPhotoPath !== photoPath && isCurrentUserPhotoPath(previousPhotoPath, userData.user.id)) {
    await supabase.storage.from(profilePhotoBucket).remove([previousPhotoPath]);
  }

  const { data: signedUrl, error: signedUrlError } = await supabase.storage
    .from(profilePhotoBucket)
    .createSignedUrl(photoPath, 3600);

  if (signedUrlError || !signedUrl?.signedUrl) {
    throw new Error('Your photo was saved, but we could not refresh it. Please reload the page.');
  }

  return `${signedUrl.signedUrl}&v=${Date.now()}`;
}

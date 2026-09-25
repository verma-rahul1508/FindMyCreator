import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, getActiveAdminForAccessToken } from '@/lib/admin-auth';
import { validateCreatorProfilePhoto } from '@/lib/creator-profile-photo';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const profilePhotoPathPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/profile-photo\.(jpg|jpeg|png|webp)$/i;
const profilePhotoBucket = 'creator-profile-photos';
const privateHeaders = { 'Cache-Control': 'private, no-store' };

function denied() {
  return NextResponse.json({ error: 'Administrator access is required.' }, { status: 403, headers: privateHeaders });
}

function photoExtension(file: File) {
  return file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
}

async function getAdminAccessToken(request: Request) {
  const bearerToken = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return bearerToken || (await cookies()).get(ADMIN_SESSION_COOKIE)?.value || null;
}

function adminClient(supabaseUrl: string, publishableKey: string, accessToken: string) {
  return createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

async function getPhotoPath(supabaseUrl: string, publishableKey: string, accessToken: string, creatorId: string) {
  const { data, error } = await adminClient(supabaseUrl, publishableKey, accessToken)
    .rpc('admin_creator_detail', { p_creator_id: creatorId });
  if (error || !data) return null;
  const identity = (data as { identity?: { profilePhotoUrl?: unknown } }).identity;
  return typeof identity?.profilePhotoUrl === 'string' ? identity.profilePhotoUrl.trim() : '';
}

export async function GET(request: Request, { params }: { params: Promise<{ creatorId: string }> }) {
  const { creatorId } = await params;
  const accessToken = await getAdminAccessToken(request);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!uuidPattern.test(creatorId) || !accessToken || !(await getActiveAdminForAccessToken(accessToken))) return denied();
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) return new NextResponse(null, { status: 404, headers: privateHeaders });

  const photoPath = await getPhotoPath(supabaseUrl, publishableKey, accessToken, creatorId);
  if (!photoPath || !profilePhotoPathPattern.test(photoPath)) return new NextResponse(null, { status: 404, headers: privateHeaders });

  const storage = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: signedUrl, error: signedUrlError } = await storage.storage.from(profilePhotoBucket).createSignedUrl(photoPath, 300);
  if (signedUrlError || !signedUrl?.signedUrl) return new NextResponse(null, { status: 404, headers: privateHeaders });

  return NextResponse.json({ url: signedUrl.signedUrl }, { headers: privateHeaders });
}

export async function POST(request: Request, { params }: { params: Promise<{ creatorId: string }> }) {
  const { creatorId } = await params;
  const accessToken = await getAdminAccessToken(request);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!uuidPattern.test(creatorId) || !accessToken || !(await getActiveAdminForAccessToken(accessToken))) return denied();
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) return NextResponse.json({ error: 'Profile photo upload is not configured.' }, { status: 503, headers: privateHeaders });

  let file: File;
  try {
    const formData = await request.formData();
    const candidate = formData.get('file');
    if (!(candidate instanceof File)) throw new Error('Choose an image file to upload.');
    file = candidate;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Choose an image file to upload.' }, { status: 400, headers: privateHeaders });
  }

  const validationError = validateCreatorProfilePhoto(file);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 422, headers: privateHeaders });

  const existingPhotoPath = await getPhotoPath(supabaseUrl, publishableKey, accessToken, creatorId);
  if (existingPhotoPath === null) return NextResponse.json({ error: 'Creator not found.' }, { status: 404, headers: privateHeaders });

  const photoPath = `${creatorId}/profile-photo.${photoExtension(file)}`;
  const storage = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: uploadError } = await storage.storage
    .from(profilePhotoBucket)
    .upload(photoPath, file, { upsert: true, contentType: file.type });
  if (uploadError) return NextResponse.json({ error: 'We could not upload this profile photo.' }, { status: 502, headers: privateHeaders });

  const { error: saveError } = await adminClient(supabaseUrl, publishableKey, accessToken)
    .rpc('admin_set_creator_profile_photo', { p_creator_id: creatorId, p_photo_path: photoPath });
  if (saveError) {
    if (existingPhotoPath !== photoPath) await storage.storage.from(profilePhotoBucket).remove([photoPath]);
    return NextResponse.json({ error: 'We could not save this profile photo.' }, { status: 500, headers: privateHeaders });
  }

  if (existingPhotoPath && existingPhotoPath !== photoPath && profilePhotoPathPattern.test(existingPhotoPath)) {
    await storage.storage.from(profilePhotoBucket).remove([existingPhotoPath]);
  }

  const { data: signedUrl, error: signedUrlError } = await storage.storage.from(profilePhotoBucket).createSignedUrl(photoPath, 300);
  if (signedUrlError || !signedUrl?.signedUrl) return NextResponse.json({ error: 'Photo saved, but we could not refresh it. Please reload the page.' }, { status: 500, headers: privateHeaders });

  return NextResponse.json({ url: `${signedUrl.signedUrl}&v=${Date.now()}` }, { headers: privateHeaders });
}

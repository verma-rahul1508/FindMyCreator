import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, getActiveAdminForAccessToken } from '@/lib/admin-auth';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const photoPathPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/profile-photo\.(jpg|jpeg|png|webp)$/i;
const headers = { 'Cache-Control': 'private, no-store' };

export async function POST(request: Request) {
  const bearerToken = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const accessToken = bearerToken || (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!accessToken || !(await getActiveAdminForAccessToken(accessToken))) {
    return NextResponse.json({ error: 'Administrator access is required.' }, { status: 403, headers });
  }
  const body = await request.json().catch(() => null);
  const ids: unknown = body?.creatorIds;
  if (!Array.isArray(ids) || ids.length > 100 || !ids.every((id) => typeof id === 'string' && uuidPattern.test(id))) {
    return NextResponse.json({ error: 'Provide up to 100 valid creator IDs.' }, { status: 400, headers });
  }
  if (!ids.length) return NextResponse.json({ urls: {} }, { headers });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ error: 'Photo storage is unavailable.' }, { status: 503, headers });
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.from('creator_identity').select('creator_id, profile_photo_url').in('creator_id', [...new Set(ids)]);
  if (error) return NextResponse.json({ error: 'Unable to load photos.' }, { status: 500, headers });
  const photos = (data || []).map((identity) => ({ id: identity.creator_id, path: identity.profile_photo_url?.trim() || '' }))
    .filter((photo) => photoPathPattern.test(photo.path));
  if (!photos.length) return NextResponse.json({ urls: {} }, { headers });
  const { data: signed, error: signingError } = await supabase.storage.from('creator-profile-photos')
    .createSignedUrls([...new Set<string>(photos.map((photo) => photo.path))], 300);
  if (signingError) return NextResponse.json({ error: 'Unable to load photos.' }, { status: 500, headers });
  const byPath = new Map((signed || []).filter((photo) => !photo.error && photo.signedUrl).map((photo) => [photo.path, photo.signedUrl]));
  const urls = Object.fromEntries(photos.filter((photo) => byPath.has(photo.path)).map((photo) => [photo.id, byPath.get(photo.path)]));
  return NextResponse.json({ urls }, { headers });
}

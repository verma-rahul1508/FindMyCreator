import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, getActiveAdminForAccessToken } from '@/lib/admin-auth';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const profilePhotoPathPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/profile-photo\.(jpg|jpeg|png|webp)$/i;

function denied() {
  return NextResponse.json({ error: 'Administrator access is required.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ creatorId: string }> }) {
  const { creatorId } = await params;
  const accessToken = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!uuidPattern.test(creatorId) || !accessToken || !(await getActiveAdminForAccessToken(accessToken))) return denied();
  if (!supabaseUrl || !serviceRoleKey) return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: identity, error } = await supabase.from('creator_identity').select('profile_photo_url').eq('creator_id', creatorId).maybeSingle();
  const photoPath = identity?.profile_photo_url?.trim() || '';
  if (error || !profilePhotoPathPattern.test(photoPath)) return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });

  const { data: signedUrl, error: signedUrlError } = await supabase.storage.from('creator-profile-photos').createSignedUrl(photoPath, 300);
  if (signedUrlError || !signedUrl?.signedUrl) return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });

  return NextResponse.json({ url: signedUrl.signedUrl }, { headers: { 'Cache-Control': 'private, no-store' } });
}

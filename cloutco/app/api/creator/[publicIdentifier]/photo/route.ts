import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const publicIdentifierPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const profilePhotoPathPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/profile-photo\.(jpg|jpeg|png|webp)$/i;

const notFound = () => new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });

export async function GET(_request: Request, { params }: { params: Promise<{ publicIdentifier: string }> }) {
  const { publicIdentifier } = await params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!publicIdentifierPattern.test(publicIdentifier) || !supabaseUrl || !serviceRoleKey) return notFound();

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: creator, error: creatorError } = await supabase
    .from('creators')
    .select('id')
    .eq('public_profile_id', publicIdentifier)
    .maybeSingle();

  if (creatorError || !creator) return notFound();

  const { data: identity, error: identityError } = await supabase
    .from('creator_identity')
    .select('profile_photo_url')
    .eq('creator_id', creator.id)
    .maybeSingle();
  const photoPath = identity?.profile_photo_url?.trim() || '';

  if (identityError || !profilePhotoPathPattern.test(photoPath)) return notFound();

  const { data: signedUrl, error: signedUrlError } = await supabase.storage
    .from('creator-profile-photos')
    .createSignedUrl(photoPath, 300);

  if (signedUrlError || !signedUrl?.signedUrl) return notFound();

  return NextResponse.json(
    { url: signedUrl.signedUrl },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

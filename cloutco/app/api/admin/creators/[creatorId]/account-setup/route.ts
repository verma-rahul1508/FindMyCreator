import { randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getActiveAdminForAccessToken } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ creatorId: string }> }) {
  const { creatorId } = await params;
  const accessToken = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!accessToken || !uuidPattern.test(creatorId) || !(await getActiveAdminForAccessToken(accessToken))) return NextResponse.json({ error: 'Administrator access is required.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ error: 'Account setup is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: creator, error: creatorError } = await supabase.from('creators').select('id, email, auth_user_id').eq('id', creatorId).maybeSingle();
  if (creatorError || !creator?.email) return NextResponse.json({ error: 'Creator account details could not be found.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });

  if (!creator.auth_user_id) {
    const { error: createError } = await supabase.auth.admin.createUser({ email: creator.email, email_confirm: true, password: randomBytes(32).toString('base64url') });
    if (createError) return NextResponse.json({ error: 'We could not create this creator account. Check that the email address is not already in use.' }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
  }

  const redirectTo = `${new URL(request.url).origin}/reset-password`;
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(creator.email, { redirectTo });
  if (resetError) return NextResponse.json({ error: 'We could not send the password setup link.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}

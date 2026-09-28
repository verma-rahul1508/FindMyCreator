import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, getActiveAdminForAccessToken } from '@/lib/admin-auth';
import { normalizeAdminBrandProposal } from '@/lib/brand-proposal-types';
import { proposalEmail } from '@/lib/brand-proposal-email';
import { isValidEmail, parseBrandEmailRecipients } from '@/lib/brand-email-recipients';

export const runtime = 'nodejs';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const privateHeaders = { 'Cache-Control': 'private, no-store' };

function smtpConfig() {
  const host = process.env.CONTACT_SMTP_HOST?.trim();
  const port = Number(process.env.CONTACT_SMTP_PORT);
  const user = process.env.CONTACT_SMTP_USER?.trim();
  const password = process.env.CONTACT_SMTP_PASSWORD;
  if (!host || !Number.isInteger(port) || port < 1 || port > 65_535 || !isValidEmail(user) || !password) return null;
  return { host, port, user, password };
}

export async function POST(request: Request, { params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const bearerToken = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const accessToken = bearerToken || (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!accessToken || !uuidPattern.test(brandId) || !(await getActiveAdminForAccessToken(accessToken))) return NextResponse.json({ error: 'Administrator access is required.' }, { status: 403, headers: privateHeaders });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const smtp = smtpConfig();
  if (!supabaseUrl || !supabasePublishableKey || !smtp) return NextResponse.json({ error: 'Proposal email delivery is not configured.' }, { status: 503, headers: privateHeaders });

  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data, error: proposalError } = await supabase.rpc('admin_brand_proposal_detail', { p_brand_id: brandId });
  const proposal = proposalError ? null : normalizeAdminBrandProposal(data);
  const recipients = parseBrandEmailRecipients(proposal?.recipientEmail);
  if (!proposal) return NextResponse.json({ error: 'We could not prepare this proposal.' }, { status: 500, headers: privateHeaders });
  if (!recipients.valid) return NextResponse.json({ error: 'Enter one or more valid Brand emails separated by semicolons before sending the proposal.' }, { status: 422, headers: privateHeaders });

  const contentResult = await supabase.rpc('get_brand_proposal_content', { p_proposal_token: proposal.proposalToken });
  const proposalUrl = `${new URL(request.url).origin}/proposal/${proposal.proposalToken}`;
  const mail = proposalEmail({ ...proposal, proposalContent: contentResult.error ? null : contentResult.data }, proposalUrl);
  try {
    const transporter = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, auth: { user: smtp.user, pass: smtp.password } });
    await transporter.sendMail({ to: recipients.recipients, from: `CloutCo <${smtp.user}>`, replyTo: 'connect@cloutco.in', subject: `Your CloutCo Creator Collaboration Proposal - ${proposal.brandName || 'Campaign'}`, text: mail.text, html: mail.html });
  } catch (error) {
    const smtpError = error as { code?: unknown; command?: unknown; responseCode?: unknown };
    console.error('Proposal email delivery failed.', {
      code: typeof smtpError.code === 'string' ? smtpError.code : undefined,
      command: typeof smtpError.command === 'string' ? smtpError.command : undefined,
      responseCode: typeof smtpError.responseCode === 'number' ? smtpError.responseCode : undefined,
    });
    return NextResponse.json({ error: 'We could not send this proposal. Please try again.' }, { status: 502, headers: privateHeaders });
  }

  const { error: recordError } = await supabase.rpc('admin_record_brand_proposal_sent', { p_brand_id: brandId });
  if (recordError) console.error('Proposal email audit recording failed.', { code: recordError.code, message: recordError.message });
  return NextResponse.json({ ok: true }, { headers: privateHeaders });
}

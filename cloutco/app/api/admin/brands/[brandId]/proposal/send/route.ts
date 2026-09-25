import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, getActiveAdminForAccessToken } from '@/lib/admin-auth';
import { formatCurrency, normalizeAdminBrandProposal, type BrandProposal } from '@/lib/brand-proposal-types';

export const runtime = 'nodejs';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const privateHeaders = { 'Cache-Control': 'private, no-store' };

function escapeHtml(value: string | null | undefined) {
  return (value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character);
}

function smtpConfig() {
  const host = process.env.CONTACT_SMTP_HOST?.trim();
  const port = Number(process.env.CONTACT_SMTP_PORT);
  const user = process.env.CONTACT_SMTP_USER?.trim();
  const password = process.env.CONTACT_SMTP_PASSWORD;
  if (!host || !Number.isInteger(port) || port < 1 || port > 65_535 || !emailPattern.test(user || '') || !password) return null;
  return { host, port, user, password };
}

function proposalEmail(proposal: BrandProposal, proposalUrl: string) {
  const creatorRows = proposal.creators.map((creator) => `<tr><td style="padding:14px 0;border-bottom:1px solid #e9e0d7"><strong>${escapeHtml(creator.name)}</strong><br><span style="color:#6a6270">${escapeHtml(`${creator.quantity} ${creator.deliverable}`)}</span></td><td style="padding:14px 0;border-bottom:1px solid #e9e0d7;text-align:right;color:#6a6270">${escapeHtml(creator.creativeConcept ?? 'Original creator-led concept')}</td></tr>`).join('');
  const serviceRows = proposal.additionalServices.map((service) => `<tr><td style="padding:12px 0;border-bottom:1px solid #e9e0d7"><strong>${escapeHtml(service.title)}</strong><br><span style="color:#6a6270">${escapeHtml(service.description ?? 'Tailored to your campaign objectives.')}</span></td><td style="padding:12px 0;border-bottom:1px solid #e9e0d7;text-align:right;color:#6a6270">${escapeHtml(service.budget === null ? 'Available on request' : `Campaign budget ${formatCurrency(service.budget)}`)}</td></tr>`).join('');
  const serviceText = proposal.additionalServices.length
    ? `Additional services included:\n${proposal.additionalServices.map((service) => `${service.title}${service.budget === null ? '' : ` - Campaign budget ${formatCurrency(service.budget)}`}`).join('\n')}`
    : 'Additional services available on request: Performance Marketing (10% of daily media budget as management fee) and Street Marketing.';
  const greeting = proposal.brandName ? `Hello ${escapeHtml(proposal.brandName)} team,` : 'Hello,';
  const serviceHtml = serviceRows || '<p style="margin:0;color:#615b66;font-size:14px;line-height:1.6"><strong>Performance Marketing:</strong> 10% of daily media budget as management fee.<br><strong>Street Marketing:</strong> boards, physical street media, malls and society activations across key markets.</p>';
  return {
    text: `${proposal.brandName || 'CloutCo'} proposal\n\nCloutCo has prepared a Premium Service creator-collaboration proposal for your PAN-India campaign.\n\nOpen the complete proposal: ${proposalUrl}\n\nStarting investment: ${formatCurrency(proposal.startingInvestment)}\n\n${serviceText}\n\nContact CloutCo: connect@cloutco.in | +91 84840 82402`,
    html: `<!doctype html><html><body style="margin:0;background:#f8f2e9;color:#171318;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;background:#fffdf9;border:1px solid #e6ddd2"><tr><td style="padding:34px"><div style="font-size:28px;font-weight:800;letter-spacing:-1px">Clout<span style="color:#6330dc">Co</span></div><p style="margin:4px 0 0;color:#756d77;font-size:11px;letter-spacing:1.5px">PEOPLE &times; CONTENT &times; GROWTH</p><div style="border-top:1px solid #e8dfd6;margin:28px 0"></div><p style="margin:0;color:#6330dc;font-size:11px;font-weight:700;letter-spacing:1.5px">PREMIUM SERVICE &middot; CAMPAIGN PROPOSAL</p><h1 style="margin:12px 0 0;font-size:32px;line-height:1.1;letter-spacing:-1px">${greeting}</h1><p style="margin:20px 0;color:#615b66;font-size:16px;line-height:1.6">CloutCo manages creator collaborations and brand-marketing needs end to end. We have prepared a PAN-India creator collaboration proposal with a selected roster and original Reel directions.</p><h2 style="margin:28px 0 6px;font-size:21px">Creator Collaboration + E2E Creator Management</h2><p style="margin:0;color:#615b66;font-size:14px;line-height:1.6">Each selected creator delivers one original Reel, shaped around a distinct concept and refined with the final brand brief.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;font-size:14px">${creatorRows}</table><div style="margin-top:26px;padding:20px;background:#f3ecff"><p style="margin:0;color:#6330dc;font-size:11px;font-weight:700;letter-spacing:1.5px">CAMPAIGN INVESTMENT</p><p style="margin:8px 0 0;font-size:23px;font-weight:700">Starting from ${formatCurrency(proposal.startingInvestment)}</p><p style="margin:10px 0 0;color:#625c69;font-size:13px;line-height:1.5">Final pricing may vary based on selected creators and campaign scope.</p></div><h2 style="margin:28px 0 8px;font-size:20px">Additional services</h2>${serviceHtml}<p style="margin:30px 0 0"><a href="${proposalUrl}" style="display:inline-block;background:#6330dc;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:7px;font-size:14px;font-weight:700">View complete proposal</a></p><div style="border-top:1px solid #e8dfd6;margin:30px 0 18px"></div><p style="margin:0;color:#69636c;font-size:13px;line-height:1.6">CloutCo<br>Ganga Serio, Kharadi, Pune<br><a href="mailto:connect@cloutco.in" style="color:#6330dc">connect@cloutco.in</a> &middot; +91 84840 82402</p></td></tr></table></td></tr></table></body></html>`,
  };
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
  const recipientEmail = proposal?.recipientEmail?.trim() || '';
  if (!proposal) return NextResponse.json({ error: 'We could not prepare this proposal.' }, { status: 500, headers: privateHeaders });
  if (!emailPattern.test(recipientEmail)) return NextResponse.json({ error: 'Enter a valid Brand email before sending the proposal.' }, { status: 422, headers: privateHeaders });

  const proposalUrl = `${new URL(request.url).origin}/proposal/${proposal.proposalToken}`;
  const mail = proposalEmail(proposal, proposalUrl);
  try {
    const transporter = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, auth: { user: smtp.user, pass: smtp.password } });
    await transporter.sendMail({ to: recipientEmail, from: `CloutCo <${smtp.user}>`, replyTo: 'connect@cloutco.in', subject: `Your CloutCo Creator Collaboration Proposal - ${proposal.brandName || 'Campaign'}`, text: mail.text, html: mail.html });
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

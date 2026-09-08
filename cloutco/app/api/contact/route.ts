import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const allowedRoles = new Set(['Creator', 'Brand / Business', 'Agency', 'Other']);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maxLengths = {
  fullName: 120,
  email: 254,
  role: 32,
  subject: 200,
  message: 5_000,
};

type ContactSubmission = {
  fullName: string;
  email: string;
  role: string;
  subject: string;
  message: string;
};

function field(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function parseSubmission(body: unknown): ContactSubmission | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;

  const values = body as Record<string, unknown>;
  const submission = {
    fullName: field(values.fullName, maxLengths.fullName),
    email: field(values.email, maxLengths.email).toLowerCase(),
    role: field(values.role, maxLengths.role),
    subject: field(values.subject, maxLengths.subject),
    message: field(values.message, maxLengths.message),
  };

  if (
    !submission.fullName
    || !emailPattern.test(submission.email)
    || !allowedRoles.has(submission.role)
    || !submission.subject
    || !submission.message
    || /[\r\n]/.test(submission.subject)
  ) {
    return null;
  }

  return submission;
}

function contactMailConfig() {
  const host = process.env.CONTACT_SMTP_HOST?.trim();
  const port = Number(process.env.CONTACT_SMTP_PORT);
  const user = process.env.CONTACT_SMTP_USER?.trim();
  const password = process.env.CONTACT_SMTP_PASSWORD;
  const to = process.env.CONTACT_EMAIL_TO?.trim();

  if (!host || !Number.isInteger(port) || port < 1 || port > 65_535 || !emailPattern.test(user || '') || !password || !emailPattern.test(to || '')) {
    return null;
  }

  return { host, port, user, password, to };
}

function response(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return response('Please complete all required fields and try again.', 400);
  }

  const submission = parseSubmission(body);

  if (!submission) {
    return response('Please complete all required fields and try again.', 400);
  }

  const config = contactMailConfig();

  if (!config) {
    console.error('Contact email delivery is not configured.');
    return response('We could not send your message right now. Please email us directly at connect@cloutco.in.', 503);
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });

    await transporter.sendMail({
      to: config.to,
      from: config.user,
      replyTo: submission.email,
      subject: `[CloutCo Contact] ${submission.subject}`,
      text: [
        `Full Name: ${submission.fullName}`,
        `Email Address: ${submission.email}`,
        `I am a: ${submission.role}`,
        `Subject: ${submission.subject}`,
        '',
        'Message:',
        submission.message,
      ].join('\n'),
    });
  } catch {
    console.error('Contact email delivery failed.');
    return response('We could not send your message right now. Please email us directly at connect@cloutco.in.', 502);
  }

  return NextResponse.json({ ok: true });
}

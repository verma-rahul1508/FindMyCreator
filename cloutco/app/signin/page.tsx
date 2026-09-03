'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.6]">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4.5 7 7.5 6 7.5-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.6]">
      <rect x="5.5" y="10" width="13" height="10" rx="2" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10M12 14v2" />
    </svg>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.6]">
      {hidden ? <path d="m4 4 16 16M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.3A10.9 10.9 0 0 1 12 5c5 0 8.7 4.2 9.5 7-.3 1-1.2 2.5-2.6 3.8M6.2 6.2C3.9 7.8 2.7 10.1 2.5 12c.8 2.8 4.5 7 9.5 7 1.3 0 2.5-.3 3.6-.8" /> : <><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" /><circle cx="12" cy="12" r="2.5" /></>}
    </svg>
  );
}

function BenefitIcon({ type }: { type: 'bolt' | 'bars' | 'shield' }) {
  if (type === 'bolt') {
    return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current"><path d="m13.4 2-8 11h5.7L10.6 22l8-11h-5.7L13.4 2Z" /></svg>;
  }

  if (type === 'bars') {
    return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current"><path d="M4 19h4V11H4v8Zm6 0h4V6h-4v13Zm6 0h4V2h-4v17Z" /></svg>;
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current"><path d="m12 2 8 3.5v5.8c0 5.1-3.4 9-8 10.7-4.6-1.7-8-5.6-8-10.7V5.5L12 2Zm0 4.1-4.5 2v3.2c0 3.5 2.1 6.1 4.5 7.4 2.4-1.3 4.5-3.9 4.5-7.4V8.1L12 6.1Zm-.9 8.2-2-2 1.3-1.3.7.7 2.5-2.5 1.3 1.3-3.8 3.8Z" /></svg>;
}

const benefits = [
  { type: 'bolt' as const, title: 'High-impact collaborations', text: 'Connect with top brands and create powerful campaigns.' },
  { type: 'bars' as const, title: 'Grow your influence', text: 'Expand your reach and monetize your content.' },
  { type: 'shield' as const, title: 'Trusted & secure', text: 'Your data and partnerships are always protected.' },
];

export default function SigninPage() {
  // useRouter applies basePath; window.location.assign() would not,
  // so it 404s wherever the site is served from a subpath.
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setResendMessage('');
    setConfirmationRequired(false);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Sign in is temporarily unavailable. Please try again later.');
      return;
    }

    setIsLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    setIsLoading(false);

    if (signInError) {
      if (signInError.message.toLowerCase().includes('email not confirmed')) {
        setConfirmationRequired(true);
        setError('Please confirm your email address before signing in.');
      } else {
        setError('We could not sign you in. Check your email and password and try again.');
      }
      return;
    }

    router.push('/dashboard');
  };

  const resendConfirmation = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const supabase = getSupabaseClient();
    if (!supabase || !normalizedEmail) return;

    setIsResending(true);
    setResendMessage('');
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: normalizedEmail });
    setIsResending(false);

    if (resendError) {
      setResendMessage('We could not resend the confirmation email. Please try again later.');
    } else {
      setResendMessage('Confirmation email sent. Check your inbox to continue.');
    }
  };

  return (
    <main className="min-h-screen bg-[#fdfcfe] px-2 py-2 sm:px-4 sm:py-4 lg:px-8 lg:py-8">
      <div className="relative mx-auto min-h-[calc(100vh-4rem)] max-w-[1440px] overflow-hidden rounded-[9px] border border-[#e6e7ec] bg-white shadow-[0_14px_45px_rgba(43,34,71,0.06)]">
        <header className="flex items-center justify-between border-b border-[#e4e5e9] px-6 py-5 sm:px-9 sm:py-6 lg:px-10">
          <Link href="/" className="text-[1.5rem] font-semibold tracking-[-0.08em] text-black sm:text-[1.75rem]">
            CLOUTCO<span className="text-[#6330dc]">.</span>
          </Link>
          <p className="text-sm text-[#17171a] sm:text-[0.95rem]">
            New to CloutCo?{' '}
            <Link href="/signup" className="font-medium text-[#5f2ad7] hover:underline">Join as a Creator</Link>
          </p>
        </header>

        <div className="relative grid min-h-[calc(100vh-9rem)] lg:grid-cols-[0.88fr_1.12fr]">
          <div className="pointer-events-none absolute -bottom-48 -left-40 h-[430px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(205,175,255,0.46),rgba(238,229,255,0.18)_48%,transparent_72%)]" />
          <section className="relative flex flex-col justify-center px-7 py-14 sm:px-12 lg:px-[10.5%] lg:py-16">
            <h1 className="max-w-[430px] text-[clamp(3rem,4.8vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.065em] text-black">
              Welcome back,<br /><span className="text-[#6330dc]">Creator.</span>
            </h1>
            <p className="mt-6 max-w-[330px] text-base leading-6 text-[#4e5667] sm:text-[1.05rem]">
              Sign in to your CloutCo account and continue your journey.
            </p>

            <div className="mt-10 space-y-7">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="flex max-w-[355px] items-start gap-5">
                  <span className="grid h-[50px] w-[50px] shrink-0 place-items-center rounded-full bg-[#f0e7ff] text-[#6330dc]">
                    <BenefitIcon type={benefit.type} />
                  </span>
                  <div className="pt-0.5">
                    <h2 className="text-[0.94rem] font-semibold tracking-[-0.02em] text-black">{benefit.title}</h2>
                    <p className="mt-1 text-[0.89rem] leading-5 text-[#596173]">{benefit.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="relative flex items-center border-t border-[#e4e5e9] px-7 py-14 sm:px-12 lg:border-l lg:border-t-0 lg:px-[11%] lg:py-16">
            <div className="w-full max-w-[510px]">
              <h2 className="text-[2rem] font-semibold leading-none tracking-[-0.06em] text-black sm:text-[2.2rem]">Sign in</h2>
              <p className="mt-4 text-[0.95rem] text-[#586071]">Enter your details to access your account.</p>

              <form onSubmit={handleSubmit} className="mt-9 space-y-7" noValidate>
                <div>
                  <label htmlFor="signin-email" className="mb-2 block text-sm font-semibold text-[#17171a]">Email address <span className="text-[#6330dc]">*</span></label>
                  <div className="flex items-center gap-3 rounded-[8px] border border-[#d9dce3] bg-white px-3.5 py-3.5 text-[#7d8492] transition focus-within:border-[#8861df] focus-within:ring-2 focus-within:ring-[#eee8ff]">
                    <MailIcon />
                    <input id="signin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email" autoComplete="email" className="min-w-0 flex-1 bg-transparent text-[0.95rem] text-[#16171a] outline-none placeholder:text-[#8a909c]" />
                  </div>
                </div>

                <div>
                  <label htmlFor="signin-password" className="mb-2 block text-sm font-semibold text-[#17171a]">Password <span className="text-[#6330dc]">*</span></label>
                  <div className="flex items-center gap-3 rounded-[8px] border border-[#d9dce3] bg-white px-3.5 py-3.5 text-[#7d8492] transition focus-within:border-[#8861df] focus-within:ring-2 focus-within:ring-[#eee8ff]">
                    <LockIcon />
                    <input id="signin-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" className="min-w-0 flex-1 bg-transparent text-[0.95rem] text-[#16171a] outline-none placeholder:text-[#8a909c]" />
                    <button type="button" onClick={() => setShowPassword((current) => !current)} className="shrink-0 text-[#737b8b] transition hover:text-[#6330dc]" aria-label={showPassword ? 'Hide password' : 'Show password'}><EyeIcon hidden={showPassword} /></button>
                  </div>
                </div>

                <div className="-mt-1 flex justify-end">
                  <span className="text-sm text-[#a2a5ad]">Forgot password?</span>
                </div>

                {error && <div className="rounded-[8px] border border-[#f1d1d1] bg-[#fff7f7] px-3.5 py-3 text-sm leading-5 text-[#a12c2c]" role="alert">{error}</div>}
                {confirmationRequired && <button type="button" onClick={resendConfirmation} disabled={isResending} className="-mt-4 text-left text-sm font-medium text-[#6330dc] hover:underline disabled:opacity-60">{isResending ? 'Resending confirmation...' : 'Resend confirmation email'}</button>}
                {resendMessage && <p className="-mt-4 text-sm text-[#3c6b52]" role="status">{resendMessage}</p>}

                <button type="submit" disabled={isLoading} className="flex min-h-[52px] w-full items-center justify-center rounded-[8px] bg-[#101112] px-5 text-base font-medium text-white shadow-[0_8px_18px_rgba(16,17,18,0.12)] transition hover:bg-[#292a2b] disabled:cursor-not-allowed disabled:opacity-65">
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>

              <p className="mt-9 text-center text-[0.95rem] text-[#606878]">Don&apos;t have an account? <Link href="/signup" className="ml-1 font-medium text-[#6330dc] hover:underline">Join as a Creator</Link></p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

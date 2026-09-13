'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { AuthAwareLogo } from '@/components/auth-aware-logo';
import { getSupabaseClient } from '@/lib/supabase/client';

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.6]">
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4.5 7 7.5 6 7.5-6" />
    </svg>
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      setError('Password reset is temporarily unavailable. Please try again later.');
      return;
    }

    setIsSubmitting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsSubmitting(false);

    if (resetError) {
      setError('We could not send the reset link. Please try again.');
      return;
    }

    setIsSent(true);
  };

  return (
    <main className="min-h-screen bg-[#fdfcfe] px-2 py-2 sm:px-4 sm:py-4 lg:px-8 lg:py-8">
      <div className="relative mx-auto min-h-[calc(100vh-4rem)] max-w-[1440px] overflow-hidden rounded-[9px] border border-[#e6e7ec] bg-white shadow-[0_14px_45px_rgba(43,34,71,0.06)]">
        <header className="flex items-center justify-between border-b border-[#e4e5e9] px-6 py-5 sm:px-9 sm:py-6 lg:px-10">
          <AuthAwareLogo className="text-[1.5rem] font-semibold tracking-[-0.08em] text-black sm:text-[1.75rem]" />
          <p className="text-sm text-[#17171a] sm:text-[0.95rem]">
            Remember your password?{' '}
            <Link href="/signin" className="font-medium text-[#5f2ad7] hover:underline">Sign in</Link>
          </p>
        </header>

        <div className="relative grid min-h-[calc(100vh-9rem)] lg:grid-cols-[0.88fr_1.12fr]">
          <div className="pointer-events-none absolute -bottom-48 -left-40 h-[430px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(205,175,255,0.46),rgba(238,229,255,0.18)_48%,transparent_72%)]" />
          <section className="order-2 relative flex flex-col justify-center px-7 py-14 sm:px-12 lg:order-1 lg:px-[10.5%] lg:py-16">
            <h1 className="max-w-[430px] text-[clamp(3rem,4.8vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.065em] text-black">
              Get back to<br /><span className="text-[#6330dc]">creating.</span>
            </h1>
            <p className="mt-6 max-w-[350px] text-base leading-6 text-[#4e5667] sm:text-[1.05rem]">
              We&apos;ll help you securely reset your CloutCo password and return to your creator journey.
            </p>
          </section>

          <section className="order-1 relative flex items-center border-t border-[#e4e5e9] px-7 py-8 sm:px-12 sm:py-10 lg:order-2 lg:border-l lg:border-t-0 lg:px-[11%] lg:py-16">
            <div className="w-full max-w-[510px]">
              {isSent ? (
                <div>
                  <h2 className="text-[2rem] font-semibold leading-none tracking-[-0.06em] text-black sm:text-[2.2rem]">Check your email</h2>
                  <p className="mt-5 max-w-[430px] text-[0.95rem] leading-6 text-[#586071]">
                    If an account exists for this email address, we&apos;ve sent you a password reset link. Please check your inbox and spam folder.
                  </p>
                  <Link href="/signin" className="mt-9 inline-flex min-h-[52px] items-center justify-center rounded-[8px] bg-[#101112] px-5 text-base font-medium text-white shadow-[0_8px_18px_rgba(16,17,18,0.12)] transition hover:bg-[#292a2b]">
                    Back to Sign In
                  </Link>
                </div>
              ) : (
                <>
                  <h2 className="text-[2rem] font-semibold leading-none tracking-[-0.06em] text-black sm:text-[2.2rem]">Forgot your password?</h2>
                  <p className="mt-4 max-w-[440px] text-[0.95rem] leading-6 text-[#586071]">
                    Enter the email address associated with your CloutCo account and we&apos;ll send you a link to reset your password.
                  </p>

                  <form onSubmit={handleSubmit} className="mt-9 space-y-7" noValidate>
                    <div>
                      <label htmlFor="forgot-password-email" className="mb-2 block text-sm font-semibold text-[#17171a]">Email <span className="text-[#6330dc]">*</span></label>
                      <div className="flex items-center gap-3 rounded-[8px] border border-[#d9dce3] bg-white px-3.5 py-3.5 text-[#7d8492] transition focus-within:border-[#8861df] focus-within:ring-2 focus-within:ring-[#eee8ff]">
                        <MailIcon />
                        <input id="forgot-password-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email" autoComplete="email" className="min-w-0 flex-1 bg-transparent text-[0.95rem] text-[#16171a] outline-none placeholder:text-[#8a909c]" />
                      </div>
                    </div>

                    {error && <div className="rounded-[8px] border border-[#f1d1d1] bg-[#fff7f7] px-3.5 py-3 text-sm leading-5 text-[#a12c2c]" role="alert">{error}</div>}

                    <button type="submit" disabled={isSubmitting} className="flex min-h-[52px] w-full items-center justify-center rounded-[8px] bg-[#101112] px-5 text-base font-medium text-white shadow-[0_8px_18px_rgba(16,17,18,0.12)] transition hover:bg-[#292a2b] disabled:cursor-not-allowed disabled:opacity-65">
                      {isSubmitting ? 'Sending Reset Link...' : 'Send Reset Link'}
                    </button>
                  </form>

                  <p className="mt-9 text-center text-[0.95rem] text-[#606878]"><Link href="/signin" className="font-medium text-[#6330dc] hover:underline">Back to Sign In</Link></p>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

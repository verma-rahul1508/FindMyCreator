'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { AuthAwareLogo } from '@/components/auth-aware-logo';
import { getSupabaseClient } from '@/lib/supabase/client';

type RecoveryState = 'checking' | 'ready' | 'invalid';

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.6]">
      <rect x="5.5" y="10" width="13" height="10" rx="2" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10M12 14v2" />
    </svg>
  );
}

export default function ResetPasswordPage() {
  const [supabase] = useState(() => getSupabaseClient({ detectSessionInUrl: false }));
  const recoveryUserId = useRef<string | null>(null);
  const [recoveryState, setRecoveryState] = useState<RecoveryState>(() => (supabase ? 'checking' : 'invalid'));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) return;

    let isActive = true;

    const establishRecoverySession = async (session: { access_token: string }) => {
      const { data, error: userError } = await supabase.auth.getUser(session.access_token);
      if (!isActive) return;
      if (userError || !data.user) {
        console.error('[reset-password] recovery session validation failed');
        setRecoveryState('invalid');
        return;
      }

      recoveryUserId.current = data.user.id;
      setRecoveryState('ready');
    };

    const establishFromRecoveryLink = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');
      const isRecoveryHash = hash.get('type') === 'recovery' && Boolean(accessToken && refreshToken);

      if (code) {
        console.info('[reset-password] recovery code present');
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!isActive) return;
        if (exchangeError || !data.session) {
          console.error('[reset-password] recovery code exchange failed');
          setRecoveryState('invalid');
          return;
        }

        url.searchParams.delete('code');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
        await establishRecoverySession(data.session);
        return;
      }

      if (isRecoveryHash && accessToken && refreshToken) {
        console.info('[reset-password] recovery hash present');
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!isActive) return;
        if (sessionError || !data.session) {
          console.error('[reset-password] recovery hash session setup failed');
          setRecoveryState('invalid');
          return;
        }

        window.history.replaceState({}, '', `${url.pathname}${url.search}`);
        await establishRecoverySession(data.session);
        return;
      }

      console.info('[reset-password] recovery parameters unavailable');
      setRecoveryState('invalid');
    };

    void establishFromRecoveryLink();

    return () => {
      isActive = false;
    };
  }, [supabase]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!password) {
      setError('Enter a new password.');
      return;
    }
    if (!confirmPassword) {
      setError('Confirm your new password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }

    if (!supabase) {
      setError('Password reset is temporarily unavailable. Please try again later.');
      return;
    }

    if (recoveryState !== 'ready' || !recoveryUserId.current) {
      setRecoveryState('invalid');
      return;
    }

    setIsSubmitting(true);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user || userData.user.id !== recoveryUserId.current) {
      console.error('[reset-password] recovery user validation failed before update');
      setIsSubmitting(false);
      setRecoveryState('invalid');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (updateError) {
      console.error('[reset-password] updateUser failed');
      if (/(session|jwt|token|user.+does not exist)/i.test(updateError.message)) {
        setRecoveryState('invalid');
      } else {
        setError('We could not update your password. Please try again.');
      }
      return;
    }

    setIsUpdated(true);
    setPassword('');
    setConfirmPassword('');
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
              Your account,<br /><span className="text-[#6330dc]">secured.</span>
            </h1>
            <p className="mt-6 max-w-[350px] text-base leading-6 text-[#4e5667] sm:text-[1.05rem]">
              Choose a new password to get back to building your creator profile on CloutCo.
            </p>
          </section>

          <section className="order-1 relative flex items-center border-t border-[#e4e5e9] px-7 py-8 sm:px-12 sm:py-10 lg:order-2 lg:border-l lg:border-t-0 lg:px-[11%] lg:py-16">
            <div className="w-full max-w-[510px]">
              {recoveryState === 'checking' ? (
                <div aria-live="polite">
                  <h2 className="text-[2rem] font-semibold leading-none tracking-[-0.06em] text-black sm:text-[2.2rem]">Reset your password</h2>
                  <p className="mt-4 text-[0.95rem] text-[#586071]">Verifying your password reset link...</p>
                </div>
              ) : recoveryState === 'invalid' ? (
                <div>
                  <h2 className="text-[2rem] font-semibold leading-none tracking-[-0.06em] text-black sm:text-[2.2rem]">Reset link unavailable</h2>
                  <p className="mt-5 max-w-[430px] text-[0.95rem] leading-6 text-[#586071]">
                    This password reset link is invalid or has expired. Please request a new password reset link.
                  </p>
                  <Link href="/forgot-password" className="mt-9 inline-flex min-h-[52px] items-center justify-center rounded-[8px] bg-[#101112] px-5 text-base font-medium text-white shadow-[0_8px_18px_rgba(16,17,18,0.12)] transition hover:bg-[#292a2b]">
                    Request a New Link
                  </Link>
                </div>
              ) : isUpdated ? (
                <div>
                  <h2 className="text-[2rem] font-semibold leading-none tracking-[-0.06em] text-black sm:text-[2.2rem]">Password updated</h2>
                  <p className="mt-5 max-w-[430px] text-[0.95rem] leading-6 text-[#586071]">Your password has been successfully updated.</p>
                  <Link href="/signin" className="mt-9 inline-flex min-h-[52px] items-center justify-center rounded-[8px] bg-[#101112] px-5 text-base font-medium text-white shadow-[0_8px_18px_rgba(16,17,18,0.12)] transition hover:bg-[#292a2b]">
                    Continue to Sign In
                  </Link>
                </div>
              ) : (
                <>
                  <h2 className="text-[2rem] font-semibold leading-none tracking-[-0.06em] text-black sm:text-[2.2rem]">Reset your password</h2>
                  <p className="mt-4 text-[0.95rem] text-[#586071]">Choose a new password for your CloutCo account.</p>

                  <form onSubmit={handleSubmit} className="mt-9 space-y-7" noValidate>
                    <div>
                      <label htmlFor="reset-password" className="mb-2 block text-sm font-semibold text-[#17171a]">New Password <span className="text-[#6330dc]">*</span></label>
                      <div className="flex items-center gap-3 rounded-[8px] border border-[#d9dce3] bg-white px-3.5 py-3.5 text-[#7d8492] transition focus-within:border-[#8861df] focus-within:ring-2 focus-within:ring-[#eee8ff]">
                        <LockIcon />
                        <input id="reset-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your new password" autoComplete="new-password" className="min-w-0 flex-1 bg-transparent text-[0.95rem] text-[#16171a] outline-none placeholder:text-[#8a909c]" />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="confirm-reset-password" className="mb-2 block text-sm font-semibold text-[#17171a]">Confirm New Password <span className="text-[#6330dc]">*</span></label>
                      <div className="flex items-center gap-3 rounded-[8px] border border-[#d9dce3] bg-white px-3.5 py-3.5 text-[#7d8492] transition focus-within:border-[#8861df] focus-within:ring-2 focus-within:ring-[#eee8ff]">
                        <LockIcon />
                        <input id="confirm-reset-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm your new password" autoComplete="new-password" className="min-w-0 flex-1 bg-transparent text-[0.95rem] text-[#16171a] outline-none placeholder:text-[#8a909c]" />
                      </div>
                    </div>

                    {error && <div className="rounded-[8px] border border-[#f1d1d1] bg-[#fff7f7] px-3.5 py-3 text-sm leading-5 text-[#a12c2c]" role="alert">{error}</div>}

                    <button type="submit" disabled={isSubmitting} className="flex min-h-[52px] w-full items-center justify-center rounded-[8px] bg-[#101112] px-5 text-base font-medium text-white shadow-[0_8px_18px_rgba(16,17,18,0.12)] transition hover:bg-[#292a2b] disabled:cursor-not-allowed disabled:opacity-65">
                      {isSubmitting ? 'Updating Password...' : 'Update Password'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

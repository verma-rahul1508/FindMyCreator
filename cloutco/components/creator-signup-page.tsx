'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

type FormValues = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  dob: string;
  gender: string;
  more: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
};

const initialValues: FormValues = {
  fullName: '',
  email: '',
  phone: '',
  city: '',
  dob: '',
  gender: '',
  more: '',
  password: '',
  confirmPassword: '',
  termsAccepted: false,
};

const genderOptions = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

function getPasswordStrength(password: string) {
  if (!password) return { label: '', tone: 'bg-transparent' };
  if (password.length < 8) return { label: 'Weak', tone: 'bg-red-500' };
  if (password.length < 12) return { label: 'Medium', tone: 'bg-yellow-500' };
  return { label: 'Strong', tone: 'bg-emerald-500' };
}

export function CreatorSignupPage() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordStrength = getPasswordStrength(values.password);

  const errors = useMemo(() => {
    const nextErrors: Partial<Record<keyof FormValues, string>> = {};

    if (!values.fullName.trim()) nextErrors.fullName = 'Full name is required.';

    if (!values.email.trim()) {
      nextErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!values.phone.trim()) {
      nextErrors.phone = 'Phone number is required.';
    } else if (!/^\+?\d[\d\s()-]{8,}$/.test(values.phone.trim())) {
      nextErrors.phone = 'Please enter a valid phone number.';
    }

    if (!values.city.trim()) nextErrors.city = 'Current city is required.';

    if (!values.dob) {
      nextErrors.dob = 'Date of birth is required.';
    } else {
      const birthDate = new Date(values.dob);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const hasBirthdayPassed =
        today.getMonth() > birthDate.getMonth() ||
        (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
      const finalAge = hasBirthdayPassed ? age : age - 1;

      if (Number.isNaN(birthDate.getTime()) || finalAge < 13) {
        nextErrors.dob = 'Please enter a valid date of birth.';
      }
    }

    if (!values.gender) nextErrors.gender = 'Gender is required.';

    if (!values.password) {
      nextErrors.password = 'Password is required.';
    } else if (values.password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
    }

    if (!values.confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password.';
    } else if (values.password !== values.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!values.termsAccepted) {
      nextErrors.termsAccepted = 'You must agree to the Terms of Service and Privacy Policy.';
    }

    return nextErrors;
  }, [values]);

  const showError = (field: keyof FormValues) => Boolean(touched[field] && errors[field]);

  const updateField = (field: keyof FormValues, value: string | boolean) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (touched[field] || field === 'termsAccepted') {
      setTouched((current) => ({ ...current, [field]: true }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextTouched = {
      fullName: true,
      email: true,
      phone: true,
      city: true,
      dob: true,
      gender: true,
      password: true,
      confirmPassword: true,
      termsAccepted: true,
    };
    setTouched(nextTouched);
    setNotification(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      setSubmitState('idle');
      setNotification({
        type: 'error',
        text: 'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your environment before signing up.',
      });
      return;
    }

    setSubmitState('loading');

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: values.email.trim().toLowerCase(),
        password: values.password,
        options: {
          data: {
            full_name: values.fullName.trim(),
            phone_number: values.phone.trim(),
            current_city: values.city.trim(),
            date_of_birth: values.dob,
            gender: values.gender,
            more: values.more.trim() || '',
          },
        },
      });

      if (signUpError) {
        const message = signUpError.message.toLowerCase();

        if (message.includes('already') || message.includes('registered')) {
          setSubmitState('idle');
          setNotification({
            type: 'error',
            text: 'An account with this email already exists. Please sign in instead.',
          });
          return;
        }

        throw signUpError;
      }

      const authUser = signUpData.user;

      if (!authUser) {
        throw new Error('Unable to create auth user.');
      }

      setSubmitState('success');
      setNotification({
        type: 'success',
        text: signUpData.session
          ? 'Account created successfully.'
          : 'Your account has been created. Please check your email to verify your account.',
      });
    } catch (error) {
      setSubmitState('idle');
      const message = error instanceof Error ? error.message : 'Unable to create your account right now.';
      setNotification({
        type: 'error',
        text: message.includes('duplicate') || message.includes('already') || message.includes('registered')
          ? 'An account with this email already exists. Please sign in instead.'
          : 'We could not create your account. Please review your details and try again.',
      });
    }
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-14 pt-8 sm:px-6 lg:px-8 xl:px-12">
      <div className="grid items-start gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 xl:gap-16">
        <div className="pt-2">
          <p className="text-[0.76rem] font-bold uppercase tracking-[0.24em] text-[#6a2cf0]">Create your account</p>
          <h1 className="mt-5 font-serif text-[clamp(3.2rem,5vw,6rem)] leading-[0.9] tracking-[-0.065em] text-black">
            Join <span className="text-[#7440f4]">CloutCo.</span>
          </h1>
          <p className="mt-5 max-w-[540px] text-lg leading-8 tracking-[-0.02em] text-[#404a5d] sm:text-xl">
            Create your account and start discovering collaboration opportunities that grow your influence and income.
          </p>

          <div className="mt-8 space-y-5">
            <div className="flex items-start gap-3">
              <span className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f0e7ff] text-[#6a2cf0]">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
                  <path d="M7 19V5.5A1.5 1.5 0 0 1 8.5 4H15.5A1.5 1.5 0 0 1 17 5.5V19l-2.5-2-2.5 2-2.5-2L7 19Z" />
                </svg>
              </span>
              <div>
                <div className="text-[1.12rem] font-semibold tracking-[-0.04em] text-black">Build your profile</div>
                <div className="mt-1 text-[0.98rem] leading-6 text-[#4f5a6d]">Showcase your content, audience and niche to brands.</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f0e7ff] text-[#6a2cf0]">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
                  <path d="m4.5 18 4.5-4.5 3 3 7.5-9" />
                  <path d="M6 6h12v12H6z" />
                </svg>
              </span>
              <div>
                <div className="text-[1.12rem] font-semibold tracking-[-0.04em] text-black">Find opportunities</div>
                <div className="mt-1 text-[0.98rem] leading-6 text-[#4f5a6d]">Discover brand campaigns that match your style and audience.</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f0e7ff] text-[#6a2cf0]">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
                  <path d="M12 3 5 6v5c0 4.5 3.6 8.5 7 10 3.4-1.5 7-5.5 7-10V6l-7-3Z" />
                </svg>
              </span>
              <div>
                <div className="text-[1.12rem] font-semibold tracking-[-0.04em] text-black">Grow your impact</div>
                <div className="mt-1 text-[0.98rem] leading-6 text-[#4f5a6d]">Collaborate, create and grow with the right brands.</div>
              </div>
            </div>
          </div>

          <div className="mt-8 inline-flex w-full max-w-[530px] items-center gap-3 rounded-[18px] bg-[#f2ecff] px-4 py-3 text-left">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#efe7ff] text-[#6a2cf0] text-xl">✦</span>
            <div>
              <div className="text-[1.08rem] font-semibold tracking-[-0.03em] text-black">Creators first. Always.</div>
              <div className="text-[0.96rem] leading-6 text-[#505a6f]">CloutCo is built to help creators like you connect with brands and scale your journey.</div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-[#e8e2f2] bg-[#fbf7ff]/70 p-4 shadow-[0_12px_24px_rgba(70,48,112,0.04)] sm:p-6 lg:p-7">
          <div className="mb-5">
            <h2 className="text-[2rem] font-semibold tracking-[-0.05em] text-black sm:text-[2.15rem]">Sign up to CloutCo</h2>
            <p className="mt-2 text-base text-[#4d5667]">
              Already have an account?{' '}
              <Link href="/signin" className="font-medium text-[#6a2cf0] hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-[#2b3242]">
                  Full Name <span className="text-[#6a2cf0]">*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={values.fullName}
                  onChange={(event) => updateField('fullName', event.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, fullName: true }))}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  className={`w-full rounded-xl border bg-white px-3.5 py-3 text-base text-[#1c2330] outline-none transition placeholder:text-[#7b8295] ${
                    showError('fullName') ? 'border-[#d64d4d] focus:border-[#d64d4d]' : 'border-[#dfe4ef] focus:border-[#7b62ed]'
                  }`}
                />
                {showError('fullName') && <p className="mt-1 text-sm text-[#d64d4d]">{errors.fullName}</p>}
              </div>

              <div className="sm:col-span-1">
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#2b3242]">
                  Email Address <span className="text-[#6a2cf0]">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={values.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                  placeholder="Enter your email address"
                  autoComplete="email"
                  className={`w-full rounded-xl border bg-white px-3.5 py-3 text-base text-[#1c2330] outline-none transition placeholder:text-[#7b8295] ${
                    showError('email') ? 'border-[#d64d4d] focus:border-[#d64d4d]' : 'border-[#dfe4ef] focus:border-[#7b62ed]'
                  }`}
                />
                {showError('email') && <p className="mt-1 text-sm text-[#d64d4d]">{errors.email}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-[#2b3242]">
                  Phone Number <span className="text-[#6a2cf0]">*</span>
                </label>
                <div className="flex overflow-hidden rounded-xl border border-[#dfe4ef] bg-white focus-within:border-[#7b62ed]">
                  <div className="flex items-center justify-center border-r border-[#dfe4ef] bg-[#faf8ff] px-3 text-sm font-medium text-[#2b3242]">
                    +91
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    value={values.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                    onBlur={() => setTouched((current) => ({ ...current, phone: true }))}
                    placeholder="Enter your phone number"
                    autoComplete="tel"
                    className="w-full border-0 bg-transparent px-3.5 py-3 text-base text-[#1c2330] outline-none placeholder:text-[#7b8295]"
                  />
                </div>
                {showError('phone') && <p className="mt-1 text-sm text-[#d64d4d]">{errors.phone}</p>}
              </div>

              <div className="sm:col-span-1">
                <label htmlFor="city" className="mb-1.5 block text-sm font-medium text-[#2b3242]">
                  Current City <span className="text-[#6a2cf0]">*</span>
                </label>
                <input
                  id="city"
                  type="text"
                  value={values.city}
                  onChange={(event) => updateField('city', event.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, city: true }))}
                  placeholder="Enter your current city"
                  autoComplete="address-level2"
                  className={`w-full rounded-xl border bg-white px-3.5 py-3 text-base text-[#1c2330] outline-none transition placeholder:text-[#7b8295] ${
                    showError('city') ? 'border-[#d64d4d] focus:border-[#d64d4d]' : 'border-[#dfe4ef] focus:border-[#7b62ed]'
                  }`}
                />
                {showError('city') && <p className="mt-1 text-sm text-[#d64d4d]">{errors.city}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <label htmlFor="dob" className="mb-1.5 block text-sm font-medium text-[#2b3242]">
                  Date of Birth <span className="text-[#6a2cf0]">*</span>
                </label>
                <input
                  id="dob"
                  type="date"
                  value={values.dob}
                  onChange={(event) => updateField('dob', event.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, dob: true }))}
                  className={`w-full rounded-xl border bg-white px-3.5 py-3 text-base text-[#1c2330] outline-none transition ${
                    showError('dob') ? 'border-[#d64d4d] focus:border-[#d64d4d]' : 'border-[#dfe4ef] focus:border-[#7b62ed]'
                  }`}
                />
                {showError('dob') && <p className="mt-1 text-sm text-[#d64d4d]">{errors.dob}</p>}
              </div>

              <div className="sm:col-span-1">
                <label htmlFor="gender" className="mb-1.5 block text-sm font-medium text-[#2b3242]">
                  Gender <span className="text-[#6a2cf0]">*</span>
                </label>
                <select
                  id="gender"
                  value={values.gender}
                  onChange={(event) => updateField('gender', event.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, gender: true }))}
                  className={`w-full appearance-none rounded-xl border bg-white px-3.5 py-3 text-base text-[#1c2330] outline-none transition ${
                    showError('gender') ? 'border-[#d64d4d] focus:border-[#d64d4d]' : 'border-[#dfe4ef] focus:border-[#7b62ed]'
                  }`}
                >
                  <option value="" disabled>
                    Select your gender
                  </option>
                  {genderOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {showError('gender') && <p className="mt-1 text-sm text-[#d64d4d]">{errors.gender}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="more" className="mb-1.5 block text-sm font-medium text-[#2b3242]">
                More (Optional)
              </label>
              <textarea
                id="more"
                rows={3}
                value={values.more}
                maxLength={300}
                onChange={(event) => updateField('more', event.target.value)}
                placeholder="Tell us anything else you'd like us to know"
                className="w-full resize-none rounded-xl border border-[#dfe4ef] bg-white px-3.5 py-3 text-base text-[#1c2330] outline-none transition placeholder:text-[#7b8295] focus:border-[#7b62ed]"
              />
              <div className="mt-1 flex items-center justify-between gap-3 text-xs text-[#667189]">
                <span>You can share your niche, social handles, experience, or anything that helps.</span>
                <span>{values.more.length}/300</span>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#2b3242]">
                Password <span className="text-[#6a2cf0]">*</span>
              </label>
              <div className="flex items-center overflow-hidden rounded-xl border border-[#dfe4ef] bg-white focus-within:border-[#7b62ed]">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={values.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, password: true }))}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  className="w-full border-0 bg-transparent px-3.5 py-3 text-base text-[#1c2330] outline-none placeholder:text-[#7b8295]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="mr-3 text-sm font-medium text-[#4d5667] hover:text-[#6a2cf0]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {values.password && (
                <div className="mt-2 flex items-center gap-2">
                  <span className={`h-2 flex-1 rounded-full ${passwordStrength.tone}`} />
                  <span className="text-xs font-medium text-[#4d5667]">{passwordStrength.label}</span>
                </div>
              )}
              {showError('password') && <p className="mt-1 text-sm text-[#d64d4d]">{errors.password}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-[#2b3242]">
                Confirm Password <span className="text-[#6a2cf0]">*</span>
              </label>
              <div className="flex items-center overflow-hidden rounded-xl border border-[#dfe4ef] bg-white focus-within:border-[#7b62ed]">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={values.confirmPassword}
                  onChange={(event) => updateField('confirmPassword', event.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, confirmPassword: true }))}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  className="w-full border-0 bg-transparent px-3.5 py-3 text-base text-[#1c2330] outline-none placeholder:text-[#7b8295]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="mr-3 text-sm font-medium text-[#4d5667] hover:text-[#6a2cf0]"
                  aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {showError('confirmPassword') && <p className="mt-1 text-sm text-[#d64d4d]">{errors.confirmPassword}</p>}
            </div>

            <div className="pt-1">
              <label className="flex items-start gap-3 text-sm text-[#2f3748]">
                <input
                  type="checkbox"
                  checked={values.termsAccepted}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => updateField('termsAccepted', event.target.checked)}
                  onBlur={() => setTouched((current) => ({ ...current, termsAccepted: true }))}
                  className="mt-0.5 h-4 w-4 rounded border-[#dfe4ef] text-[#6a2cf0] focus:ring-[#6a2cf0]"
                />
                <span>
                  I agree to the <a href="#" className="font-medium text-[#6a2cf0] hover:underline">Terms of Service</a> and{' '}
                  <a href="#" className="font-medium text-[#6a2cf0] hover:underline">Privacy Policy</a>.
                </span>
              </label>
              {showError('termsAccepted') && <p className="mt-2 text-sm text-[#d64d4d]">{errors.termsAccepted}</p>}
            </div>

            <button
              type="submit"
              disabled={submitState === 'loading'}
              className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#5d2adf] to-[#7a58ea] px-6 py-3.5 text-base font-medium text-white shadow-[0_12px_24px_rgba(94,42,223,0.2)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-75"
            >
              {submitState === 'loading' ? 'Creating account...' : 'Create Account'}
              <span className="ml-2 text-lg">→</span>
            </button>

            {notification && (
              <div
                className={`rounded-xl border px-3 py-2 text-sm ${
                  notification.type === 'success'
                    ? 'border-[#dfe7ff] bg-[#f4f8ff] text-[#1f5c4a]'
                    : 'border-[#f5d4d4] bg-[#fff3f3] text-[#b32626]'
                }`}
              >
                {notification.text}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

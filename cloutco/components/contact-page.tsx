'use client';

import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

const selectOptions = ['Creator', 'Brand / Business', 'Agency', 'Other'];

type FormValues = {
  fullName: string;
  email: string;
  role: string;
  subject: string;
  message: string;
};

const initialValues: FormValues = {
  fullName: '',
  email: '',
  role: '',
  subject: '',
  message: '',
};

export function ContactPage() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => {
    const nextErrors: Partial<Record<keyof FormValues, string>> = {};

    if (!values.fullName.trim()) {
      nextErrors.fullName = 'Full name is required.';
    }

    if (!values.email.trim()) {
      nextErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!values.role) {
      nextErrors.role = 'Please select an option.';
    }

    if (!values.subject.trim()) {
      nextErrors.subject = 'Subject is required.';
    }

    if (!values.message.trim()) {
      nextErrors.message = 'Message is required.';
    }

    return nextErrors;
  }, [values]);

  const handleChange = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (touched[field]) {
      setTouched((current) => ({ ...current, [field]: true }));
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setTouched({
      fullName: true,
      email: true,
      role: true,
      subject: true,
      message: true,
    });

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitted(true);
  };

  const showError = (field: keyof FormValues) => Boolean(touched[field] && errors[field]);

  return (
    <div className="mx-auto max-w-[1440px] px-4 pb-14 pt-8 sm:px-6 lg:px-8 xl:px-12">
      <div className="grid items-start gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 xl:gap-16">
        <div className="pt-2">
          <p className="text-[0.78rem] font-bold uppercase tracking-[0.22em] text-[#6a2cf0]">Contact CloutCo</p>

          <h1 className="mt-5 font-serif text-[clamp(3.3rem,5.5vw,7rem)] leading-[0.9] tracking-[-0.065em] text-black">
            Let&apos;s <span className="text-[#7440f4]">talk.</span>
          </h1>

          <p className="mt-5 max-w-[540px] text-lg leading-8 tracking-[-0.02em] text-[#404a5d] sm:text-xl">
            Have a question, need help, or want to work with CloutCo? Send us a message and our team will get back to you.
          </p>

          <div className="mt-7 space-y-4">
            <div className="flex items-center gap-3 text-[1.05rem] text-[#2b3242]">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#f0e7ff] text-[#6a2cf0]">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
                  <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
                  <path d="m5.5 7 6.5 5 6.5-5" />
                </svg>
              </span>
              <div>
                <span className="font-medium">Email</span>
                <div className="text-[#4b5364]">hello@cloutco.in</div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[1.05rem] text-[#2b3242]">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#f0e7ff] text-[#6a2cf0]">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 3.5v9l5 2.5" />
                </svg>
              </span>
              <div>
                <span className="font-medium">Response Time</span>
                <div className="text-[#4b5364]">Within 1-2 business days</div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[1.05rem] text-[#2b3242]">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#f0e7ff] text-[#6a2cf0]">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
                  <path d="M12 21s6-5.6 6-11a6 6 0 1 0-12 0c0 5.4 6 11 6 11Z" />
                  <circle cx="12" cy="10" r="2.4" />
                </svg>
              </span>
              <div>
                <span className="font-medium">Based in</span>
                <div className="text-[#4b5364]">India</div>
              </div>
            </div>
          </div>

          <div className="mt-8 inline-flex items-center gap-3 rounded-[18px] bg-[#f1ebff]/80 px-4 py-3 text-left shadow-[0_10px_24px_rgba(93,61,166,0.05)]">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#f0e7ff] text-[#6a2cf0] text-xl">
              ✦
            </span>
            <div>
              <div className="text-[1.08rem] font-semibold tracking-[-0.03em] text-black">Creators first. Always.</div>
              <div className="text-[0.95rem] text-[#4f5a6d]">We&apos;re here to support your journey and help you grow with the right opportunities.</div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-[#e8e2f2] bg-[#f9f5ff]/40 p-4 shadow-[0_12px_24px_rgba(70,48,112,0.04)] sm:p-6 lg:p-7">
          <div className="mb-5">
            <h2 className="text-[2rem] font-semibold tracking-[-0.05em] text-black sm:text-[2.2rem]">Send us a message</h2>
            <p className="mt-2 text-base leading-7 text-[#4b5364]">Fill in the details and we&apos;ll get back to you shortly.</p>
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
                  onChange={(event) => handleChange('fullName', event.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, fullName: true }))}
                  placeholder="Enter your full name"
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
                  onChange={(event) => handleChange('email', event.target.value)}
                  onBlur={() => setTouched((current) => ({ ...current, email: true }))}
                  placeholder="Enter your email address"
                  className={`w-full rounded-xl border bg-white px-3.5 py-3 text-base text-[#1c2330] outline-none transition placeholder:text-[#7b8295] ${
                    showError('email') ? 'border-[#d64d4d] focus:border-[#d64d4d]' : 'border-[#dfe4ef] focus:border-[#7b62ed]'
                  }`}
                />
                {showError('email') && <p className="mt-1 text-sm text-[#d64d4d]">{errors.email}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-[#2b3242]">
                I am a <span className="text-[#6a2cf0]">*</span>
              </label>
              <select
                id="role"
                value={values.role}
                onChange={(event) => handleChange('role', event.target.value)}
                onBlur={() => setTouched((current) => ({ ...current, role: true }))}
                className={`w-full appearance-none rounded-xl border bg-white px-3.5 py-3 pr-10 text-base text-[#1c2330] outline-none transition placeholder:text-[#7b8295] ${
                  showError('role') ? 'border-[#d64d4d] focus:border-[#d64d4d]' : 'border-[#dfe4ef] focus:border-[#7b62ed]'
                }`}
              >
                <option value="" disabled>
                  Select an option
                </option>
                {selectOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {showError('role') && <p className="mt-1 text-sm text-[#d64d4d]">{errors.role}</p>}
            </div>

            <div>
              <label htmlFor="subject" className="mb-1.5 block text-sm font-medium text-[#2b3242]">
                Subject <span className="text-[#6a2cf0]">*</span>
              </label>
              <input
                id="subject"
                type="text"
                value={values.subject}
                onChange={(event) => handleChange('subject', event.target.value)}
                onBlur={() => setTouched((current) => ({ ...current, subject: true }))}
                placeholder="Enter the subject"
                className={`w-full rounded-xl border bg-white px-3.5 py-3 text-base text-[#1c2330] outline-none transition placeholder:text-[#7b8295] ${
                  showError('subject') ? 'border-[#d64d4d] focus:border-[#d64d4d]' : 'border-[#dfe4ef] focus:border-[#7b62ed]'
                }`}
              />
              {showError('subject') && <p className="mt-1 text-sm text-[#d64d4d]">{errors.subject}</p>}
            </div>

            <div>
              <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-[#2b3242]">
                Message <span className="text-[#6a2cf0]">*</span>
              </label>
              <textarea
                id="message"
                rows={5}
                value={values.message}
                onChange={(event) => handleChange('message', event.target.value)}
                onBlur={() => setTouched((current) => ({ ...current, message: true }))}
                placeholder="Write your message here..."
                className={`w-full resize-none rounded-xl border bg-white px-3.5 py-3 text-base text-[#1c2330] outline-none transition placeholder:text-[#7b8295] ${
                  showError('message') ? 'border-[#d64d4d] focus:border-[#d64d4d]' : 'border-[#dfe4ef] focus:border-[#7b62ed]'
                }`}
              />
              {showError('message') && <p className="mt-1 text-sm text-[#d64d4d]">{errors.message}</p>}
            </div>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#5d2adf] to-[#7f5ae6] px-6 py-3.5 text-base font-medium text-white shadow-[0_12px_24px_rgba(94,42,223,0.22)] transition hover:brightness-105"
            >
              Send Message <span className="ml-2 text-lg">→</span>
            </button>

            <div className="flex items-center justify-center gap-2 pt-1 text-center text-sm text-[#49566a]">
              <span className="grid h-5 w-5 place-items-center rounded-full border border-[#c9b8f8] bg-[#f1ebff] text-[#6a2cf0] text-[0.7rem]">i</span>
              We respect your privacy. Your information will never be shared.
            </div>

            {submitted && (
              <div className="rounded-xl border border-[#dfe7ff] bg-[#f4f8ff] px-3 py-2 text-sm text-[#1f5c4a]">
                Your message has been drafted successfully. Connect this form to a real email service when you are ready.
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

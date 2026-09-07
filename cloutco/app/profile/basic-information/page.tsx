'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';

type BasicInformation = {
  full_name: string;
  email: string;
  phone_number: string;
  current_city: string;
  date_of_birth: string;
  gender: string;
  more: string | null;
};

type EditableBasicInformation = Pick<BasicInformation, 'full_name' | 'phone_number' | 'current_city' | 'date_of_birth' | 'gender'> & {
  more: string;
};

const genderOptions = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const emptyValues: EditableBasicInformation = {
  full_name: '',
  phone_number: '',
  current_city: '',
  date_of_birth: '',
  gender: '',
  more: '',
};

function validate(values: EditableBasicInformation) {
  if (!values.full_name.trim()) return 'Full name is required.';
  if (!values.phone_number.trim()) return 'Phone number is required.';
  if (!/^\+?\d[\d\s()-]{8,}$/.test(values.phone_number.trim())) return 'Please enter a valid phone number.';
  if (!values.current_city.trim()) return 'Current city is required.';
  if (!values.date_of_birth) return 'Date of birth is required.';

  const birthDate = new Date(`${values.date_of_birth}T00:00:00`);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const hasBirthdayPassed = today.getMonth() > birthDate.getMonth()
    || (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  if (Number.isNaN(birthDate.getTime()) || (hasBirthdayPassed ? age : age - 1) < 13) return 'Please enter a valid date of birth.';
  if (!values.gender) return 'Gender is required.';
  return '';
}

export default function BasicInformationPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [values, setValues] = useState<EditableBasicInformation>(emptyValues);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadBasicInformation = async () => {
    setLoading(true);
    setLoadError('');
    const supabase = getSupabaseClient();
    if (!supabase) {
      router.replace('/signin');
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.replace('/signin');
      return;
    }

    const { data, error } = await supabase
      .from('creators')
      .select('full_name, email, phone_number, current_city, date_of_birth, gender, more')
      .eq('auth_user_id', userData.user.id)
      .maybeSingle();

    if (error || !data) {
      setLoadError('Your basic information could not be loaded.');
      setLoading(false);
      return;
    }

    const basicInformation = data as BasicInformation;
    setEmail(userData.user.email || basicInformation.email || '');
    setValues({
      full_name: basicInformation.full_name || '',
      phone_number: basicInformation.phone_number || '',
      current_city: basicInformation.current_city || '',
      date_of_birth: basicInformation.date_of_birth || '',
      gender: basicInformation.gender || '',
      more: basicInformation.more || '',
    });
    setLoading(false);
  };

  useEffect(() => { void loadBasicInformation(); }, []);

  const update = (field: keyof EditableBasicInformation, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setSaveError('');
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validate(values);
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) return;
    setSaving(true);
    setSaveError('');

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.replace('/signin');
      return;
    }

    const { error } = await supabase
      .from('creators')
      .update({
        full_name: values.full_name.trim(),
        phone_number: values.phone_number.trim(),
        current_city: values.current_city.trim(),
        date_of_birth: values.date_of_birth,
        gender: values.gender,
        more: values.more.trim() || null,
      })
      .eq('auth_user_id', userData.user.id);

    if (error) {
      setSaveError('We could not save your basic information. Please try again.');
      setSaving(false);
      return;
    }

    router.push('/profile');
  };

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#fbfaff] text-sm text-[#5b6272]">Loading your basic information...</main>;
  if (loadError) return <main className="grid min-h-screen place-items-center bg-[#fbfaff] px-6 text-center"><div className="max-w-md rounded-2xl border border-[#e8e4f1] bg-white p-8 shadow-[0_12px_30px_rgba(70,48,112,0.05)]"><h1 className="text-2xl font-semibold tracking-[-0.05em] text-black">We couldn&apos;t load your basic information</h1><p className="mt-3 text-sm leading-6 text-[#626a7a]">{loadError}</p><button type="button" onClick={() => void loadBasicInformation()} className="mt-6 rounded-lg bg-black px-5 py-3 text-sm font-medium text-white">Try again</button></div></main>;

  return <main className="min-h-screen bg-[#fbfaff] px-5 py-8 text-[#151518] sm:px-8 sm:py-12">
    <div className="mx-auto max-w-3xl">
      <Link href="/profile" className="inline-flex min-h-10 items-center text-sm font-semibold text-[#6330dc] hover:text-[#4720b2]"><span aria-hidden="true" className="mr-2">&larr;</span>My Profile</Link>
      <section className="mt-5 rounded-2xl border border-[#e8e7eb] bg-white p-6 shadow-[0_8px_28px_rgba(50,40,80,0.035)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7440f4]">Basic Information</p>
        <h1 className="mt-3 text-[2.2rem] font-semibold tracking-[-0.06em] sm:text-[2.75rem]">Keep your details current</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#5d6575]">These details help keep your creator account accurate.</p>

        <form onSubmit={save} noValidate className="mt-8 space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-[#2b3242]">Full Name <span className="text-[#6a2cf0]">*</span><input value={values.full_name} onChange={(event) => update('full_name', event.target.value)} autoComplete="name" className="mt-2 w-full rounded-xl border border-[#dfe4ef] bg-white px-3.5 py-3 text-base font-normal outline-none transition focus:border-[#7b62ed]" /></label>
            <label className="block text-sm font-semibold text-[#2b3242]">Email<input value={email} readOnly aria-readonly="true" className="mt-2 w-full cursor-not-allowed rounded-xl border border-[#e6e2eb] bg-[#f8f7fa] px-3.5 py-3 text-base font-normal text-[#667085] outline-none" /><span className="mt-2 block text-xs font-normal leading-5 text-[#777e8d]">Email changes are managed through the secure account email flow.</span></label>
            <label className="block text-sm font-semibold text-[#2b3242]">Phone Number <span className="text-[#6a2cf0]">*</span><input value={values.phone_number} onChange={(event) => update('phone_number', event.target.value)} autoComplete="tel" className="mt-2 w-full rounded-xl border border-[#dfe4ef] bg-white px-3.5 py-3 text-base font-normal outline-none transition focus:border-[#7b62ed]" /></label>
            <label className="block text-sm font-semibold text-[#2b3242]">Current City <span className="text-[#6a2cf0]">*</span><input value={values.current_city} onChange={(event) => update('current_city', event.target.value)} autoComplete="address-level2" className="mt-2 w-full rounded-xl border border-[#dfe4ef] bg-white px-3.5 py-3 text-base font-normal outline-none transition focus:border-[#7b62ed]" /></label>
            <label className="block text-sm font-semibold text-[#2b3242]">Date of Birth <span className="text-[#6a2cf0]">*</span><input type="date" value={values.date_of_birth} onChange={(event) => update('date_of_birth', event.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe4ef] bg-white px-3.5 py-3 text-base font-normal outline-none transition focus:border-[#7b62ed]" /></label>
            <label className="block text-sm font-semibold text-[#2b3242]">Gender <span className="text-[#6a2cf0]">*</span><select value={values.gender} onChange={(event) => update('gender', event.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe4ef] bg-white px-3.5 py-3 text-base font-normal outline-none transition focus:border-[#7b62ed]"><option value="" disabled>Select your gender</option>{genderOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          </div>
          <label className="block text-sm font-semibold text-[#2b3242]">More <span className="font-normal text-[#777e8d]">(Optional)</span><textarea value={values.more} onChange={(event) => update('more', event.target.value)} maxLength={300} rows={4} className="mt-2 w-full resize-none rounded-xl border border-[#dfe4ef] bg-white px-3.5 py-3 text-base font-normal outline-none transition focus:border-[#7b62ed]" /><span className="mt-2 block text-right text-xs font-normal text-[#777e8d]">{values.more.length}/300</span></label>
          {saveError && <p role="alert" className="rounded-xl border border-[#f0c6c6] bg-[#fff7f7] px-4 py-3 text-sm text-[#b13d3d]">{saveError}</p>}
          <div className="flex flex-col-reverse gap-3 border-t border-[#f0eff2] pt-6 sm:flex-row sm:justify-end"><Link href="/profile" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dfd8e8] px-5 text-sm font-semibold text-[#4d5360] hover:bg-[#faf9fc]">Cancel</Link><button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#6330dc] px-5 text-sm font-semibold text-white shadow-[0_7px_16px_rgba(99,48,220,0.2)] transition hover:bg-[#5123bc] disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving...' : 'Save Basic Information'}</button></div>
        </form>
      </section>
    </div>
  </main>;
}

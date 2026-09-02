import Link from 'next/link';

export default function SigninPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fffdfc] px-6 py-16 text-center">
      <div className="w-full max-w-xl rounded-2xl border border-[#e8e2f2] bg-white p-8 shadow-[0_12px_24px_rgba(70,48,112,0.04)]">
        <h1 className="font-serif text-4xl tracking-[-0.06em] text-black">Sign in</h1>
        <p className="mt-4 text-base text-[#4b5364]">This is a placeholder sign-in page for the existing CloutCo flow.</p>
        <Link href="/signup" className="mt-6 inline-flex items-center justify-center rounded-full bg-[#6a2cf0] px-5 py-3 text-sm font-medium text-white">
          Back to sign up
        </Link>
      </div>
    </div>
  );
}

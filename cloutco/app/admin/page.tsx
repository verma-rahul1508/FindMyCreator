'use client';

export default function AdminDashboardPage() {
  return <section className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7C3AED]">CloutCo administration</p>
    <h1 className="mt-4 text-[2.15rem] font-semibold tracking-[-0.06em] text-[#151518] sm:text-[2.7rem]">Admin Dashboard</h1>
    <p className="mt-4 max-w-2xl text-sm leading-6 text-[#626a7a] sm:text-base">Manage CloutCo creators, review profiles, and monitor platform activity.</p>

    <section className="mt-10 max-w-2xl rounded-2xl border border-[#e8e7eb] bg-white p-7 shadow-[0_10px_30px_rgba(33,24,54,0.04)] sm:p-9">
      <h2 className="text-xl font-semibold tracking-[-0.04em] text-[#151518]">Your admin workspace is ready.</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[#697080]">Creator management, approvals, analytics, and reports will appear here.</p>
    </section>
  </section>;
}

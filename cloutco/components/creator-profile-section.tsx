import Image from 'next/image';

const benefits = [
  ['01', 'All in one place', 'Showcase your bio, niche, audience, content and social links.'],
  ['02', 'Built for opportunities', 'Help brands quickly understand who you are and what makes your content unique.'],
  ['03', 'Showcase your best', 'Highlight your top content and past collaborations that you’re proud of.'],
  ['04', 'You’re in control', 'Update your profile anytime and choose what to share.'],
];

const socialPlatforms = [
  ['Instagram', '@aanyasharma', '72K Followers', 'bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]'],
  ['YouTube', 'Aanya Sharma', '18K Subscribers', 'bg-[#ff1d1d]'],
  ['TikTok', '@aanyasharma', '56K Followers', 'bg-black'],
  ['Threads', '@aanyasharma', '3.2K Followers', 'bg-[#7a7b83]'],
];

const featuredContent = [
  ['/images/creator-unboxing.png', 'Creator sharing a beauty product'],
  ['/images/journey-profile.png', 'Creator presenting lifestyle content'],
  ['/images/creator-photography.png', 'Beauty product flat lay'],
  ['/images/creator-lifestyle.png', 'Creator filming content'],
  ['/images/journey-collaboration.png', 'Creator style portrait'],
];

function Benefit({ benefit }: { benefit: string[] }) {
  return (
    <li className="flex gap-4 border-b border-[#e8e5ee] py-5 first:pt-0 last:border-0 last:pb-0">
      <span className="pt-0.5 text-sm font-semibold tracking-[-0.03em] text-[#6b30ee]">{benefit[0]}</span>
      <div>
        <h3 className="text-lg font-semibold tracking-[-0.04em] text-black">{benefit[1]}</h3>
        <p className="mt-1 text-[0.96rem] leading-6 tracking-[-0.02em] text-[#525b71]">{benefit[2]}</p>
      </div>
    </li>
  );
}

function MiniIcon({ children }: { children: React.ReactNode }) {
  return <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f0eaff] text-[#6b30ee]">{children}</span>;
}

function ProfilePreview() {
  return (
    <div className="rounded-[26px] border border-white bg-white p-4 shadow-[0_20px_60px_rgba(50,26,95,0.11)] sm:p-6">
      <div className="flex gap-4 sm:gap-6">
        <div className="relative h-[118px] w-[98px] shrink-0 overflow-hidden rounded-[15px] bg-[#eee8e5] sm:h-[182px] sm:w-[154px]">
          <Image src="/images/journey-profile.png" alt="Aanya Sharma, creator profile portrait" fill sizes="(max-width: 640px) 98px, 154px" className="object-cover" />
          <span className="absolute bottom-1 left-1 rounded-full bg-white px-2 py-0.5 text-[0.65rem] font-medium text-[#34a853] shadow-sm">Active</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-xl font-semibold tracking-[-0.055em] text-black sm:text-[1.8rem]">Aanya Sharma <span className="inline-grid h-4 w-4 place-items-center rounded-full bg-[#6b30ee] align-middle text-[0.6rem] text-white">✓</span></h3>
              <p className="mt-0.5 text-sm text-[#505a70] sm:text-base">@aanyasharma</p>
            </div>
            <button type="button" className="hidden shrink-0 items-center gap-1.5 rounded-xl border border-[#e5e1e9] px-3 py-2 text-xs font-medium text-black sm:inline-flex"><span>✎</span>Edit Profile</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-medium text-[#6229df] sm:gap-2 sm:text-sm">
            {['Fashion', 'Lifestyle', 'Beauty'].map((tag) => <span key={tag} className="rounded-full bg-[#f3efff] px-2.5 py-1">{tag}</span>)}
          </div>
          <p className="mt-3 hidden max-w-xl text-sm leading-5 text-[#4f5870] sm:block">Fashion and lifestyle creator sharing honest reviews, outfit inspiration and real-life moments.</p>
          <div className="mt-3 hidden flex-wrap gap-x-4 gap-y-1 text-xs text-[#525b71] sm:flex"><span>⌖ Mumbai, India</span><span>✉ aanya@example.com</span></div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 rounded-2xl border border-[#ebe7ef] py-3 sm:mt-6 sm:py-4">
        {[
          ['Audience', '78K+', '♙'],
          ['Engagement Rate', '4.3%', '⌁'],
          ['Avg. Views', '45K+', '◉'],
        ].map(([label, value, icon]) => (
          <div key={label} className="flex min-w-0 flex-col items-center gap-0.5 border-r border-[#eeeaf1] px-1 text-center last:border-0 sm:flex-row sm:justify-center sm:gap-2 sm:px-2 sm:text-left">
            <span className="text-sm text-[#6b30ee] sm:text-lg">{icon}</span><span><span className="block truncate text-[0.62rem] text-[#596177] sm:text-xs">{label}</span><strong className="block text-sm tracking-[-0.03em] text-black sm:text-base">{value}</strong></span>
          </div>
        ))}
      </div>

      <ProfilePanel title="Social Presence">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {socialPlatforms.map(([name, handle, count, color]) => (
            <div key={name} className="min-w-0 rounded-xl border border-[#e8e5ed] p-2.5 sm:p-3">
              <div className="flex items-center gap-2"><span className={`grid h-5 w-5 place-items-center rounded-md text-[0.58rem] font-bold text-white ${color}`}>{name[0]}</span><span className="truncate text-xs font-semibold text-black">{name}</span></div>
              <p className="mt-1 truncate text-[0.68rem] text-[#596177]">{handle}</p>
              <p className="truncate text-[0.68rem] font-medium text-black">{count}</p>
            </div>
          ))}
        </div>
      </ProfilePanel>

      <ProfilePanel title="Featured Content">
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
          {featuredContent.map(([src, alt], index) => (
            <div key={src} className="relative aspect-[4/5] overflow-hidden rounded-lg bg-[#eee9e6] sm:rounded-xl">
              <Image src={src} alt={alt} fill sizes="(max-width: 640px) 17vw, (max-width: 1024px) 11vw, 120px" className="object-cover" />
              {index === 1 || index === 3 ? <span className="absolute inset-0 grid place-items-center bg-black/15 text-base text-white">▷</span> : null}
            </div>
          ))}
        </div>
      </ProfilePanel>

      <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#f5f1ff] p-3 sm:mt-5 sm:p-4">
        <MiniIcon><span className="text-base">♙</span></MiniIcon>
        <p className="text-xs leading-5 text-[#535d73] sm:text-sm"><strong className="font-semibold text-black">Professional. Authentic. You.</strong><br />A profile that helps brands see the real you.</p>
      </div>
    </div>
  );
}

function ProfilePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl border border-[#ebe7ef] p-3 sm:mt-5 sm:p-4">
      <div className="mb-3 flex items-center justify-between"><h4 className="text-sm font-semibold tracking-[-0.035em] text-black sm:text-base">{title}</h4><span className="text-xs font-medium text-[#6329e5]">View all&nbsp; →</span></div>
      {children}
    </div>
  );
}

export function CreatorProfileSection() {
  return (
    <section id="creator-profile" className="relative overflow-hidden bg-[#fffefd] px-5 py-20 sm:px-8 sm:py-28 lg:px-12 xl:px-16">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[620px] w-[min(100%,1300px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#cdb9ff]/15 blur-[115px]" />
      <div className="relative mx-auto grid max-w-[1450px] gap-14 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-center lg:gap-12 xl:gap-16">
        <div className="max-w-[500px]">
          <p className="inline-flex rounded-full bg-[#f1ebff] px-4 py-1.5 text-xs font-bold tracking-[0.14em] text-[#6728e9]">YOUR CREATOR PROFILE</p>
          <h2 className="mt-7 font-serif text-[clamp(3.2rem,4.7vw,5.25rem)] leading-[0.93] tracking-[-0.065em] text-black">Your work deserves a profile that <span className="text-[#7440f4]">stands out.</span></h2>
          <p className="mt-7 max-w-[460px] text-lg leading-8 tracking-[-0.025em] text-[#525b71] sm:text-xl">Bring your creator identity, content, audience and social presence together in one professional profile built for brand opportunities.</p>
          <ul className="mt-10 list-none p-0">{benefits.map((benefit) => <Benefit key={benefit[0]} benefit={benefit} />)}</ul>
        </div>
        <ProfilePreview />
      </div>
    </section>
  );
}

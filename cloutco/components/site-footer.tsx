const creatorLinks = [
  'How It Works',
  'Create Profile',
  'Opportunities',
  'Creator Resources',
  'Help Center',
];

const brandLinks = ['Post a Campaign', 'How It Works', 'Find Creators', 'Brand Resources'];
const companyLinks = [
  { label: 'About Us', href: '#' },
  { label: 'Our Mission', href: '#' },
  { label: 'Careers', href: '#' },
  { label: 'Contact Us', href: '/contact' },
];
const legalLinks = ['Terms of Service', 'Privacy Policy', 'Cookie Policy'];

const socialLinks = [
  { label: 'Instagram', icon: 'instagram' },
  { label: 'YouTube', icon: 'youtube' },
  { label: 'TikTok', icon: 'tiktok' },
  { label: 'LinkedIn', icon: 'linkedin' },
];

function SocialIcon({ type }: { type: string }) {
  const common = 'h-5 w-5';

  if (type === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={common} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5" />
        <circle cx="12" cy="12" r="4.3" />
        <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (type === 'youtube') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={common} fill="currentColor">
        <path d="M21.6 8.2a2.8 2.8 0 0 0-2-2A55.7 55.7 0 0 0 12 5.8a55.7 55.7 0 0 0-7.6.4 2.8 2.8 0 0 0-2 2A28 28 0 0 0 2.4 12a28 28 0 0 0 .4 3.8 2.8 2.8 0 0 0 2 2A55.7 55.7 0 0 0 12 18.2a55.7 55.7 0 0 0 7.6-.4 2.8 2.8 0 0 0 2-2A28 28 0 0 0 21.6 12a28 28 0 0 0-.4-3.8ZM10 15.5v-7l6 3.5-6 3.5Z" />
      </svg>
    );
  }

  if (type === 'tiktok') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={common} fill="currentColor">
        <path d="M15.6 3.5c.4 1.5 1.4 2.7 3 3.3v2.6c-1.3-.1-2.5-.5-3.4-1.2v7.2c0 3.2-2.5 5.7-5.7 5.7s-5.7-2.5-5.7-5.7 2.5-5.7 5.7-5.7c.4 0 .7 0 1 .1v2.8a3.7 3.7 0 0 0-1-.2 2.9 2.9 0 1 0 2.9 3c.2 0 .5 0 .7-.1V3.5h3.5Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={common} fill="currentColor">
      <path d="M6.94 8.5A2.66 2.66 0 0 1 9.6 5.84h4.8A2.66 2.66 0 0 1 17.06 8.5v7c0 1.47-1.19 2.66-2.66 2.66h-4.8a2.66 2.66 0 0 1-2.66-2.66v-7Zm8.38 1.9a.85.85 0 1 0 0 1.7.85.85 0 0 0 0-1.7ZM12 8.3A3.7 3.7 0 1 0 12 15.7 3.7 3.7 0 0 0 12 8.3Z" />
    </svg>
  );
}

function NavColumn({ title, links }: { title: string; links: Array<string | { label: string; href: string }> }) {
  return (
    <div>
      <h3 className="text-[1.05rem] font-semibold tracking-[-0.045em] text-black sm:text-[1.15rem]">{title}</h3>
      <ul className="mt-5 space-y-4 text-[0.98rem] leading-6 tracking-[-0.02em] text-[#444d5e]">
        {links.map((link) => {
          const item = typeof link === 'string' ? { label: link, href: '#' } : link;

          return (
            <li key={item.label}>
              <a href={item.href} className="transition-colors hover:text-[#6b30ee]">
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[#cfe0ff]/80 bg-[#fffdfc]">
      <div className="mx-auto max-w-[1440px] px-5 pb-7 pt-9 sm:px-8 lg:px-12 xl:px-16">
        <div className="grid gap-10 pb-10 pt-6 lg:grid-cols-[1.1fr_2.1fr] lg:gap-14">
          <div className="max-w-[420px]">
            <div className="text-[2.3rem] font-semibold tracking-[-0.08em] text-black leading-none sm:text-[2.8rem]">
              Clout<span className="text-[#7c6ae7]">Co</span>
            </div>

            <p className="mt-7 text-[1.05rem] leading-8 tracking-[-0.025em] text-[#404a5d]">
              CloutCo is a marketplace that connects creators with brands for high-impact collaborations.
            </p>

            <div className="mt-8 flex items-center gap-3">
              {socialLinks.map(({ label, icon }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="grid h-12 w-12 place-items-center rounded-full bg-[#efe7ff] text-[#6b30ee] transition-colors hover:bg-[#e5dafe]"
                >
                  <SocialIcon type={icon} />
                </a>
              ))}
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
            <NavColumn title="For Creators" links={creatorLinks} />
            <NavColumn title="For Brands" links={brandLinks} />
            <NavColumn title="Company" links={companyLinks} />
            <NavColumn title="Legal" links={legalLinks} />
          </div>
        </div>

        <div className="border-t border-[#cfdae8] pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="text-[0.98rem] tracking-[-0.02em] text-[#444d5e]">
              © 2025 CloutCo. All rights reserved.
            </div>

            <div className="flex items-center justify-center gap-2 text-[0.98rem] font-medium tracking-[-0.02em] text-black sm:text-[1.05rem]">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#efe7ff] text-[#6b30ee]">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
                  <path d="M12 20.6c-4.15 0-7.5-3.34-7.5-7.49S7.85 5.62 12 5.62c4.16 0 7.5 3.35 7.5 7.49 0 4.15-3.34 7.49-7.5 7.49Zm0-1.65a5.84 5.84 0 1 0 0-11.68 5.84 5.84 0 0 0 0 11.68Zm-1.22-3.16-.92-2.49H8.5l2.76-7.18h2.18l2.76 7.2H13.5l-.87 2.47h-2.85Zm1.62-4.52-.68 1.89h1.3l-.62-1.89Z" />
                </svg>
              </span>
              <span>Built for creators.</span>
              <span className="text-[#6b30ee]">Backed by brands.</span>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-[#cfd6e8] bg-white px-3 py-2 text-sm font-medium text-[#2f3646] shadow-[0_0_0_1px_rgba(207,214,232,0.2)] transition-colors hover:border-[#c7cde4]"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-[#6b30ee]" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="8" />
                  <path d="M4 12h16M12 4a14 14 0 0 1 0 16M12 4a14 14 0 0 0 0 16" />
                </svg>
                <span>English</span>
                <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="m5 7 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

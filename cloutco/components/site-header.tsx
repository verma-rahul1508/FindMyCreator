'use client';

import Link from 'next/link';
import { useState } from 'react';

const navItems = [
  { label: 'For Creators', href: '#creators' },
  { label: 'How It Works', href: '#how-it-works' },
];

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    const target = document.querySelector(href);

    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-[#fffdfc]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center" aria-label="CloutCo home">
          <span className="text-[1.5rem] font-semibold tracking-[-0.08em] text-black sm:text-[1.75rem]">
            Clout<span className="text-[#7c6ae7]">Co</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(event) => handleNavClick(event, item.href)}
              className="text-sm font-medium text-black/75 transition-colors hover:text-black"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/signin"
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:border-black/20 hover:bg-[#f7f3ff]"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-full bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1b1b1b]"
          >
            Get Started
          </Link>
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-black transition-colors hover:border-black/20 hover:bg-[#f7f3ff] md:hidden"
        >
          <span className="sr-only">Open navigation menu</span>
          <span className="flex flex-col gap-1.5">
            <span
              className={`block h-0.5 w-5 rounded-full bg-black transition-transform ${
                isMenuOpen ? 'translate-y-2 rotate-45' : ''
              }`}
            />
            <span
              className={`block h-0.5 w-5 rounded-full bg-black transition-opacity ${
                isMenuOpen ? 'opacity-0' : 'opacity-100'
              }`}
            />
            <span
              className={`block h-0.5 w-5 rounded-full bg-black transition-transform ${
                isMenuOpen ? '-translate-y-2 -rotate-45' : ''
              }`}
            />
          </span>
        </button>
      </div>

      {isMenuOpen && (
        <div className="border-t border-black/5 bg-white md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(event) => handleNavClick(event, item.href)}
                className="flex min-h-11 items-center rounded-full px-3 text-base font-medium text-black/80 transition-colors hover:bg-[#f7f3ff] hover:text-black"
              >
                {item.label}
              </a>
            ))}

            <div className="mt-2 grid gap-2">
              <Link
                href="/signin"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-black transition-colors hover:border-black/20 hover:bg-[#f7f3ff]"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-black px-4 text-sm font-medium text-white transition-colors hover:bg-[#1b1b1b]"
              >
                Get Started
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

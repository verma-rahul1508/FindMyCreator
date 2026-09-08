'use client';

import Link from 'next/link';
import { useState } from 'react';

type CreatorMobileNavigationItem = {
  label: string;
  href: string;
};

type CreatorMobileNavigationProps = {
  currentPage: 'dashboard' | 'profile';
  additionalItems: CreatorMobileNavigationItem[];
};

function MenuIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]"><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

export function CreatorMobileNavigation({ currentPage, additionalItems }: CreatorMobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const primaryItems: CreatorMobileNavigationItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'My Profile', href: '/profile' },
  ];

  const closeMenu = () => setIsOpen(false);

  return <>
    <button type="button" aria-label="Open creator navigation" aria-expanded={isOpen} onClick={() => setIsOpen(true)} className="grid h-10 w-10 place-items-center rounded-full border border-[#e3e1e9] text-[#525966] transition hover:bg-[#f7f4ff] lg:hidden"><MenuIcon /></button>
    {isOpen && <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Creator navigation">
      <button type="button" aria-label="Close creator navigation" onClick={closeMenu} className="absolute inset-0 bg-[#151518]/30" />
      <aside className="relative flex h-full w-[calc(100vw-2rem)] max-w-xs flex-col bg-white p-5 shadow-[12px_0_32px_rgba(45,35,75,0.18)]">
        <div className="flex items-center justify-between border-b border-[#e8e7eb] pb-4"><p className="text-sm font-semibold text-[#151518]">Creator navigation</p><button type="button" aria-label="Close creator navigation" onClick={closeMenu} className="grid h-10 w-10 place-items-center rounded-full border border-[#e3e1e9] text-[#525966] transition hover:bg-[#f7f4ff]"><CloseIcon /></button></div>
        <nav className="mt-5 space-y-2" aria-label="Creator navigation">{primaryItems.map((item) => <Link key={item.href} href={item.href} onClick={closeMenu} className={'flex min-h-11 items-center rounded-xl px-4 py-3 text-sm ' + (currentPage === (item.href === '/dashboard' ? 'dashboard' : 'profile') ? 'bg-[#f1ebff] font-medium text-[#6330dc]' : 'text-[#424754] hover:bg-[#faf8ff]')}>{item.label}</Link>)}{additionalItems.map((item) => <a key={item.label} href={item.href} onClick={closeMenu} className="flex min-h-11 items-center rounded-xl px-4 py-3 text-sm text-[#424754] hover:bg-[#faf8ff]">{item.label}</a>)}</nav>
      </aside>
    </div>}
  </>;
}

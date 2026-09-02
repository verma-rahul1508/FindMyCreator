import type { Metadata } from 'next';
import { ContactPage } from '@/components/contact-page';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export const metadata: Metadata = {
  title: 'Contact CloutCo',
  description:
    'Contact CloutCo to discuss creator collaborations, brand opportunities, and general questions about working with our creator-first marketplace.',
};

export default function ContactRoutePage() {
  return (
    <div className="min-h-screen bg-[#fffdfc] text-black">
      <SiteHeader />
      <main>
        <ContactPage />
      </main>
      <SiteFooter />
    </div>
  );
}

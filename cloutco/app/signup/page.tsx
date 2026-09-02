import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { CreatorSignupPage } from '@/components/creator-signup-page';

export const metadata: Metadata = {
  title: 'Create your CloutCo account',
  description:
    'Join CloutCo as a creator to discover collaboration opportunities, grow your audience, and connect with brands.',
};

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#fffdfc] text-black">
      <SiteHeader />
      <main>
        <CreatorSignupPage />
      </main>
      <SiteFooter />
    </div>
  );
}

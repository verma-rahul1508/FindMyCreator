import { SiteHeader } from '@/components/site-header';
import { CreatorHero } from '@/components/creator-hero';
import { HowItWorksSection } from '@/components/how-it-works-section';
import { CreatorProfileSection } from '@/components/creator-profile-section';
import { CreatorFinalCta } from '@/components/creator-final-cta';
import { SiteFooter } from '@/components/site-footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#fffdfc] text-black">
      <SiteHeader />
      <main>
        <CreatorHero />
        <HowItWorksSection />
        <CreatorProfileSection />
        <CreatorFinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

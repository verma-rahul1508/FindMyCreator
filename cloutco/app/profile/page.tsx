'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { AuthAwareLogo } from '@/components/auth-aware-logo';
import { getSupabaseClient } from '@/lib/supabase/client';
import { loadCreatorProfileProgress, type CreatorProfileProgress } from '@/lib/profile-progress';
import type { ProfileSectionKey } from '@/lib/profile-sections';
import { loadSocialAccounts } from '@/lib/social-platform-persistence';
import { formatPlatformCount } from '@/lib/format-number';

type Creator = { id: string; public_profile_id: string; full_name: string; email: string; phone_number: string; current_city: string; date_of_birth: string; gender: string; status: string; created_at: string };
type Identity = { profile_photo_url: string | null; display_name: string | null; username: string | null; creator_type: string | null; creator_type_other: string | null };
type ContentProfile = { primary_niche: string | null; primary_niche_other: string | null };
type SocialAccount = {
  id: string;
  platform: 'Instagram' | 'Facebook' | 'YouTube';
  platformName: string;
  profileUrl: string;
  username: string;
  audienceCount: string;
  isPrimary: boolean;
  instagramInsights?: {
    period: string;
    overview: {
      views: string;
      interactions: string;
      netFollowers: string;
    };
  };
  facebookInsights?: {
    period: string;
    overview: {
      viewsTotal: string;
    };
    engagement: {
      total: string;
    };
    audience: {
      netFollowers: string;
    };
  };
};
type InsightIcon = 'eye' | 'heart' | 'users' | 'trend';
type IconName = 'home' | 'user' | 'check' | 'message' | 'settings' | 'bell' | 'chevron' | 'arrow' | 'spark' | 'document' | 'shield' | 'identity' | 'content' | 'social' | 'portfolio' | 'flip' | 'share' | 'pin' | InsightIcon;

const creatorFields = 'id, public_profile_id, full_name, email, phone_number, current_city, date_of_birth, gender, status, created_at';
const reasons = ['Build a stronger professional presence', 'Help CloutCo understand your content', 'Make your creator profile more complete', 'Showcase your work professionally'];
const creatorTypeLabels: Record<string, string> = { content_creator: 'Content Creator', influencer: 'Influencer', ugc_creator: 'UGC Creator', digital_creator: 'Digital Creator' };
const platformLogos: Record<string, string> = { instagram: '/brands/instagram.svg', facebook: '/brands/facebook.svg', youtube: '/brands/youtube.svg' };
const sectionPresentation: Record<ProfileSectionKey, { description: string; icon: IconName }> = {
  'basic-information': { description: 'Your basic details and location', icon: 'user' },
  'creator-identity': { description: 'Add your photo, username, bio and languages', icon: 'identity' },
  'content-and-niche': { description: 'Tell us what you create and your niche', icon: 'content' },
  'social-platforms': { description: 'Connect your social media accounts', icon: 'social' },
  portfolio: { description: 'Showcase your best work', icon: 'portfolio' },
};

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="m3.5 10 8.5-7 8.5 7" /><path d="M5.5 9v10h13V9M9.5 19v-5h5v5" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 20c.5-3.4 2.8-5 7-5s6.5 1.6 7 5" /></>,
    check: <><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    message: <><path d="M5 6.5h14v9H9l-4 3v-12Z" /><path d="M8 10h8M8 13h5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19 13.2a7.6 7.6 0 0 0 0-2.4l2-1.5-2-3.4-2.4 1a8 8 0 0 0-2-1.2L14.3 3h-4.6l-.4 2.7a8 8 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 2.4l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 2 1.2l.4 2.7h4.6l.4-2.7a8 8 0 0 0-2 1.2l2.4 1 2-3.4-2-1.5Z" /></>,
    bell: <><path d="M6.5 16.5h11l-1.2-1.8V10a4.3 4.3 0 0 0-8.6 0v4.7l-1.2 1.8Z" /><path d="M10 19h4" /></>,
    chevron: <path d="m9 5 7 7-7 7" />,
    arrow: <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>,
    spark: <><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Z" /><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z" /></>,
    document: <><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M8.5 8h7M8.5 12h7M8.5 16h4" /></>,
    shield: <><path d="m12 3 7 3v5c0 4-2.9 7.6-7 9-4.1-1.4-7-5-7-9V6l7-3Z" /><path d="m9 11.8 2 2 4-4" /></>,
    identity: <><circle cx="12" cy="8" r="2.5" /><path d="M7.5 18c.5-2.5 2-4 4.5-4s4 1.5 4.5 4" /></>,
    content: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></>,
    social: <><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    portfolio: <><path d="M4 7.5h16v12H4zM8 7.5V5h8v2.5M4 12h16" /></>,
    flip: <><path d="M19 9.5A7.5 7.5 0 1 0 20 15" /><path d="M19 4.5v5h-5" /></>,
    share: <><circle cx="18" cy="5" r="2.25" /><circle cx="6" cy="12" r="2.25" /><circle cx="18" cy="19" r="2.25" /><path d="m8 11 7.8-4.8M8 13l7.8 4.8" /></>,
    pin: <><path d="M19 10.5c0 4.5-7 9.5-7 9.5s-7-5-7-9.5a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10.5" r="2.25" /></>,
    eye: <><path d="M3.5 12s3.1-5 8.5-5 8.5 5 8.5 5-3.1 5-8.5 5-8.5-5-8.5-5Z" /><circle cx="12" cy="12" r="2.4" /></>,
    heart: <path d="M20 8.7c0 4.7-8 9-8 9s-8-4.3-8-9A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 8 1.7Z" />,
    users: <><circle cx="9" cy="8.5" r="2.5" /><circle cx="16.5" cy="9.5" r="2" /><path d="M4.5 19c.5-3.1 2.2-4.8 4.5-4.8s4 1.7 4.5 4.8M14.1 15.1c2.7-.2 4.7 1.2 5.1 3.9" /></>,
    trend: <><path d="m4.5 16 5-5 3.3 3.3L19.5 7.5" /><path d="M14.5 7.5h5v5" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.65]">{paths[name]}</svg>;
}

function formatStatus(status: string) { return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Not available'; }
function platformKey(platform?: string) { return platform?.trim().toLowerCase() || ''; }
function platformName(account: SocialAccount) { const key = platformKey(account.platform); return key === 'youtube' ? 'YouTube' : key === 'instagram' ? 'Instagram' : key === 'facebook' ? 'Facebook' : account.platformName; }
function usernameLabel(username?: string | null) { const value = username?.trim().replace(/^@+/, ''); return value ? '@' + value : ''; }
function creatorTypeLabel(identity: Identity | null) { const type = identity?.creator_type?.trim() || ''; if (!type) return ''; return type.toLowerCase() === 'other' ? identity?.creator_type_other?.trim() || '' : creatorTypeLabels[type] || type; }
function primaryNicheLabel(content: ContentProfile | null) { const niche = content?.primary_niche?.trim() || ''; if (!niche) return ''; return niche.toLowerCase() === 'other' ? content?.primary_niche_other?.trim() || '' : niche; }
function PlatformLogo({ platform, className = '' }: { platform: string; className?: string }) { const logo = platformLogos[platformKey(platform)]; return logo ? <img src={logo} alt="" className={className} /> : null; }
function CreatorCardAction({ icon, label, onClick, filled = false }: { icon: 'flip' | 'share'; label: string; onClick: () => void; filled?: boolean }) {
  const [hideTooltip, setHideTooltip] = useState(false);
  return <div className="group relative" onPointerEnter={() => setHideTooltip(false)} onPointerLeave={() => setHideTooltip(false)}><button type="button" onClick={() => { setHideTooltip(true); onClick(); }} onBlur={() => setHideTooltip(false)} aria-label={label} className={'inline-grid h-10 w-10 place-items-center rounded-full transition ' + (filled ? 'bg-[#6932de] text-white shadow-[0_8px_16px_rgba(91,47,206,0.25)] hover:bg-[#5724c3]' : 'border border-[#dfd5f4] bg-white/85 text-[#6330dc] shadow-[0_5px_12px_rgba(74,48,122,0.05)] hover:border-[#cdbcf0] hover:bg-[#fbf9ff]')}><Icon name={icon} /></button><span role="tooltip" className={'pointer-events-none absolute bottom-[calc(100%+0.65rem)] left-1/2 z-30 w-max max-w-[11rem] -translate-x-1/2 rounded-lg bg-[#17131f] px-2.5 py-1.5 text-center text-[0.68rem] font-medium leading-4 text-white shadow-[0_8px_18px_rgba(24,17,37,0.2)] transition-opacity duration-150 after:absolute after:left-1/2 after:top-full after:h-2 after:w-2 after:-translate-x-1/2 after:-translate-y-1 after:rotate-45 after:bg-[#17131f] ' + (hideTooltip ? 'opacity-0' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100')}>{label}</span></div>;
}
function LoadingState() { return <main className="grid min-h-screen place-items-center bg-[#fbfaff] text-sm text-[#5b6272]">Loading your creator profile...</main>; }
function ErrorState({ retry }: { retry: () => void }) { return <main className="grid min-h-screen place-items-center bg-[#fbfaff] px-6 text-center"><div className="max-w-md rounded-2xl border border-[#e8e4f1] bg-white p-8 shadow-[0_12px_30px_rgba(70,48,112,0.05)]"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#f1ebff] text-[#6330dc]"><Icon name="document" /></div><h1 className="mt-5 text-2xl font-semibold tracking-[-0.05em] text-black">We couldn&apos;t load your profile</h1><p className="mt-3 text-sm leading-6 text-[#626a7a]">Please try again. Your profile information has not been changed.</p><button type="button" onClick={retry} className="mt-6 rounded-lg bg-black px-5 py-3 text-sm font-medium text-white">Try again</button></div></main>; }

function CreatorCard({ creator, identity, content, photoUrl, socialAccounts, initials, allRequiredComplete }: { creator: Creator; identity: Identity | null; content: ContentProfile | null; photoUrl: string; socialAccounts: SocialAccount[]; initials: string; allRequiredComplete: boolean }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [shareStatus, setShareStatus] = useState('');
  const [copyFallbackUrl, setCopyFallbackUrl] = useState('');
  const displayName = identity?.display_name?.trim() || creator.full_name.trim() || 'Creator';
  const username = usernameLabel(identity?.username);
  const creatorType = creatorTypeLabel(identity);
  const niche = primaryNicheLabel(content);
  const city = creator.current_city?.trim() || '';
  const primaryAccount = socialAccounts.find((account) => account.isPrimary);
  const secondaryAccounts = primaryAccount ? socialAccounts.filter((account) => account.id !== primaryAccount.id) : socialAccounts;
  const primaryInstagramAccount = primaryAccount && platformKey(primaryAccount.platform) === 'instagram' ? primaryAccount : null;
  const primaryFacebookAccount = primaryAccount && platformKey(primaryAccount.platform) === 'facebook' ? primaryAccount : null;
  const secondaryPlatformAccounts = secondaryAccounts;
  const instagramPeriod = primaryInstagramAccount?.instagramInsights?.period.trim() || '';
  const facebookPeriod = primaryFacebookAccount?.facebookInsights?.period.trim() || '';
  const instagramInsightCards = [
    instagramPeriod && primaryInstagramAccount?.instagramInsights?.overview.views.trim()
      ? { label: 'Last ' + instagramPeriod + ' days Views', value: primaryInstagramAccount.instagramInsights.overview.views, icon: 'eye' as const }
      : null,
    instagramPeriod && primaryInstagramAccount?.instagramInsights?.overview.interactions.trim()
      ? { label: 'Last ' + instagramPeriod + ' days Interactions', value: primaryInstagramAccount.instagramInsights.overview.interactions, icon: 'heart' as const }
      : null,
    primaryInstagramAccount?.audienceCount.trim()
      ? { label: 'Followers', value: primaryInstagramAccount.audienceCount, icon: 'users' as const }
      : null,
    primaryInstagramAccount?.instagramInsights?.overview.netFollowers.trim()
      ? { label: 'Net Followers', value: primaryInstagramAccount.instagramInsights.overview.netFollowers, icon: 'trend' as const }
      : null,
  ].filter((card): card is { label: string; value: string; icon: InsightIcon } => card !== null);
  const facebookInsightCards = [
    facebookPeriod && primaryFacebookAccount?.facebookInsights?.overview.viewsTotal.trim()
      ? { label: 'Last ' + facebookPeriod + ' days Views', value: primaryFacebookAccount.facebookInsights.overview.viewsTotal, icon: 'eye' as const }
      : null,
    facebookPeriod && primaryFacebookAccount?.facebookInsights?.engagement.total.trim()
      ? { label: 'Last ' + facebookPeriod + ' days Engagement', value: primaryFacebookAccount.facebookInsights.engagement.total, icon: 'heart' as const }
      : null,
    primaryFacebookAccount?.audienceCount.trim()
      ? { label: 'Followers', value: primaryFacebookAccount.audienceCount, icon: 'users' as const }
      : null,
    primaryFacebookAccount?.facebookInsights?.audience.netFollowers.trim()
      ? { label: 'Net Followers', value: primaryFacebookAccount.facebookInsights.audience.netFollowers, icon: 'trend' as const }
      : null,
  ].filter((card): card is { label: string; value: string; icon: InsightIcon } => card !== null);
  const primaryInsightCards = primaryInstagramAccount ? instagramInsightCards : primaryFacebookAccount ? facebookInsightCards : [];
  const primaryInsightsEmptyMessage = primaryAccount
    ? platformKey(primaryAccount.platform) === 'youtube'
      ? 'Primary platform insights are not available for YouTube.'
      : 'Add ' + platformName(primaryAccount) + ' analytics in Social Platforms to show insights here.'
    : 'Add a primary platform in Social Platforms to show insights here.';
  const transition = reducedMotion ? 'none' : 'transform 600ms cubic-bezier(0.22, 0.61, 0.36, 1)';
  const audienceLabel = platformKey(primaryAccount?.platform) === 'youtube' ? 'Subscribers' : 'Followers';
  const desktopCardHeight = secondaryAccounts.length ? 'sm:min-h-[315px]' : 'sm:min-h-[280px]';

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setReducedMotion(motion.matches);
    updateMotionPreference();
    motion.addEventListener('change', updateMotionPreference);
    return () => motion.removeEventListener('change', updateMotionPreference);
  }, []);

  const shareProfile = async () => {
    setShareStatus('');
    setCopyFallbackUrl('');
    if (!creator.public_profile_id) {
      setShareStatus('Your public profile link is not ready yet.');
      return;
    }
    const profilePreviewUrl = window.location.origin + '/creator/' + creator.public_profile_id;
    if (navigator.share) {
      try {
        await navigator.share({ title: displayName + ' | CloutCo', text: 'Check out my creator profile on CloutCo.', url: profilePreviewUrl });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(profilePreviewUrl);
        setShareStatus('Profile link copied');
        window.setTimeout(() => setShareStatus(''), 3000);
        return;
      } catch {
        // The visible field below is an accessible fallback.
      }
    }
    setCopyFallbackUrl(profilePreviewUrl);
    setShareStatus('Copy this profile link');
  };

  return <div className="w-full max-w-[600px] [perspective:1400px]">
    <div className={'relative min-h-[530px] sm:aspect-[15/7] ' + desktopCardHeight}>
      <div className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)', transition }}>
        <article aria-label="Creator card front" className="absolute inset-0 isolate overflow-hidden rounded-[1.7rem] border border-[#ded3f6] bg-[linear-gradient(135deg,#ffffff_0%,#fdfbff_57%,#f4efff_100%)] shadow-[0_18px_42px_rgba(78,50,135,0.1)] [backface-visibility:hidden]">
          <div className="relative grid h-full grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] grid-rows-[220px_minmax(0,1fr)] sm:grid-cols-[170px_minmax(0,1fr)_190px] sm:grid-rows-1">
            <div className="col-span-2 min-h-0 overflow-hidden bg-[#f1eaff] text-3xl font-semibold text-[#6731dc] sm:col-span-1">
              {photoUrl ? <img src={photoUrl} alt={'Portrait of ' + displayName} className="h-full w-full object-cover object-center" /> : <div className="grid h-full w-full place-items-center bg-[linear-gradient(145deg,#f6f0ff_0%,#e6d8ff_100%)]">{initials}</div>}
            </div>
            <div className="min-w-0 p-4 sm:p-5">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#9b7cf4]">Creator</p>
              <h2 className="mt-2 break-words text-[1.65rem] font-semibold leading-[0.95] tracking-[-0.065em] text-[#15121b] sm:text-[2.05rem]">{displayName}</h2>
              {niche && <p className="mt-2 break-words text-xl font-semibold leading-6 tracking-[-0.035em] text-[#4d3691] sm:text-[1.35rem]">{niche}</p>}
              {(username || creatorType) && <p className="mt-2 text-sm font-medium leading-5 text-[#6a68a2]">{username}{username && creatorType ? ' · ' : ''}{creatorType}</p>}
              {city && <p className="mt-2 flex items-center gap-1.5 text-base font-medium leading-5 text-[#55577b]"><span className="shrink-0 text-[#7440f4]"><Icon name="pin" /></span><span className="min-w-0 break-words">{city}</span></p>}
              {!allRequiredComplete && <p className="mt-3 inline-flex rounded-lg border border-[#e2d6fa] bg-[#faf7ff] px-2.5 py-1.5 text-left text-[0.68rem] font-medium leading-4 text-[#675d82]">Complete your profile to finish your Creator Card.</p>}
            </div>
            <div className="flex min-w-0 flex-col border-l border-[#e6dff5] p-3 sm:py-5 sm:pl-5 sm:pr-2">
              {primaryAccount ? <div className="flex items-center gap-2.5 sm:block"><PlatformLogo platform={primaryAccount.platform} className="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12" /><div className="min-w-0 sm:mt-2"><p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[#9b7cf4]">Primary platform</p><p className="mt-1 truncate text-sm font-semibold text-[#6b70a4]">{platformName(primaryAccount)}</p><p className="mt-1 text-[1.55rem] font-semibold leading-none tracking-[-0.06em] text-[#17141d] sm:text-[1.8rem]">{formatPlatformCount(primaryAccount.audienceCount)}</p><p className="mt-1 text-xs font-medium text-[#777ba8]">{audienceLabel}</p></div></div> : <div><p className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[#9b7cf4]">Primary platform</p><p className="mt-2 text-sm font-semibold text-[#36303f]">No primary platform</p><p className="mt-2 text-xs leading-5 text-[#777180]">Add one in Social Platforms.</p></div>}
              <div className="mt-auto flex flex-wrap justify-end gap-3 pt-3 sm:flex-nowrap sm:pt-5"><CreatorCardAction icon="flip" label="Flip the Creator Card" onClick={() => setIsFlipped(true)} /><CreatorCardAction icon="share" label="Share it to someone" onClick={() => void shareProfile()} filled /></div>
            </div>
          </div>
          {shareStatus && <p role="status" className="absolute bottom-3 left-1/2 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full border border-[#d9cdf4] bg-white/95 px-3 py-1.5 text-xs font-medium text-[#5630ae] shadow-sm">{shareStatus}</p>}
          {copyFallbackUrl && <label className="absolute bottom-3 left-4 right-4 rounded-lg border border-[#d9cdf4] bg-white/95 p-2 text-xs text-[#5630ae]">Profile URL<input aria-label="Profile preview URL" readOnly value={copyFallbackUrl} onFocus={(event) => event.currentTarget.select()} className="mt-1 block w-full rounded border border-[#e5ddf4] bg-white px-2 py-1 text-[#3f354d]" /></label>}
        </article>
        <article aria-label="Creator card back" className="absolute inset-0 isolate overflow-hidden rounded-[1.7rem] border border-[#ded3f6] bg-[linear-gradient(135deg,#ffffff_0%,#fdfbff_60%,#f4efff_100%)] shadow-[0_18px_42px_rgba(78,50,135,0.1)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <div aria-hidden="true" className="absolute -right-16 -top-16 h-48 w-48 rounded-full border-[26px] border-[#eee4ff]/80" />
          <div aria-hidden="true" className="absolute -bottom-16 -left-6 h-40 w-40 rounded-full bg-[#f2ebff]/60" />
          <div className="relative grid h-full min-h-0 grid-rows-2 sm:grid-cols-2 sm:grid-rows-1">
            <section className="flex min-h-0 min-w-0 flex-col p-4 sm:p-5" aria-labelledby="creator-card-insights">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[#6330dc]">Social Presence</p>
              <h2 id="creator-card-insights" className="mt-1.5 text-[1.35rem] font-semibold leading-none tracking-[-0.055em] text-[#15121b] sm:text-[1.55rem]">Primary insights</h2>
              {primaryInsightCards.length ? <div className="mt-3 grid flex-1 grid-cols-2 gap-2 sm:mt-4 sm:gap-3">{primaryInsightCards.map((card) => <div key={card.label} className="flex min-w-0 flex-col justify-between rounded-xl border border-[#e5dcf6] bg-white/75 p-2.5 shadow-[0_6px_16px_rgba(70,43,118,0.03)] sm:p-3"><div className="flex min-w-0 items-start gap-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f1eaff] text-[#6d35e5]"><Icon name={card.icon} /></span><p className="min-w-0 pt-0.5 text-[0.62rem] font-medium leading-4 text-[#7375a0]">{card.label}</p></div><p className="mt-2 break-words text-[1.2rem] font-semibold leading-none tracking-[-0.05em] text-[#19161f] sm:text-[1.45rem]">{formatPlatformCount(card.value)}</p></div>)}</div> : <p className="mt-4 text-xs leading-5 text-[#7275a0]">{primaryInsightsEmptyMessage}</p>}
            </section>
            <section className="flex min-h-0 min-w-0 flex-col border-t border-[#e6dff5] p-4 sm:border-l sm:border-t-0 sm:p-5" aria-labelledby="creator-card-other-platforms">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-[#6330dc]">Other Platforms</p>
              <h2 id="creator-card-other-platforms" className="mt-1.5 text-[1.1rem] font-semibold leading-none tracking-[-0.045em] text-[#15121b] sm:text-[1.25rem]">Find me here, too.</h2>
              {secondaryPlatformAccounts.length ? <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-3">{secondaryPlatformAccounts.map((account) => <div key={account.id} className="flex min-w-0 items-center gap-2.5 rounded-xl border border-[#e8e1f3] bg-white/75 px-2.5 py-2.5 shadow-[0_6px_16px_rgba(70,43,118,0.03)] sm:gap-3 sm:px-3 sm:py-3"><PlatformLogo platform={account.platform} className="h-10 w-10 shrink-0 object-contain sm:h-11 sm:w-11" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[#24202a]">{platformName(account)}</p>{usernameLabel(account.username) && <p className="mt-0.5 truncate text-xs text-[#7073a1]">{usernameLabel(account.username)}</p>}</div><div className="shrink-0 border-l border-[#e9e2f4] pl-2.5 text-right sm:pl-3"><p className="text-[0.58rem] font-medium text-[#777ba8]">{platformKey(account.platform) === 'youtube' ? 'Subscribers' : 'Followers'}</p><p className="mt-1 text-sm font-semibold leading-none tracking-[-0.05em] text-[#1b1821] sm:text-base">{formatPlatformCount(account.audienceCount)}</p></div></div>)}</div> : <div className="flex-1" />}
              <div className="mt-auto flex items-center justify-end gap-2 pt-3 sm:pt-4"><CreatorCardAction icon="flip" label="Flip the Creator Card" onClick={() => setIsFlipped(false)} /><CreatorCardAction icon="share" label="Share it to someone" onClick={() => void shareProfile()} filled /></div>
              {shareStatus && <p role="status" className="mt-2 text-center text-xs font-medium text-[#5630ae]">{shareStatus}</p>}
              {copyFallbackUrl && <label className="mt-2 text-xs text-[#5630ae]">Profile URL<input aria-label="Profile preview URL" readOnly value={copyFallbackUrl} onFocus={(event) => event.currentTarget.select()} className="mt-1 block w-full rounded border border-[#d9cdf4] bg-white px-2 py-1.5 text-[#3f354d]" /></label>}
            </section>
          </div>
        </article>
      </div>
    </div>
  </div>;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [content, setContent] = useState<ContentProfile | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [progress, setProgress] = useState<CreatorProfileProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    setLoadError(false);
    setProfilePhotoUrl('');
    const supabase = getSupabaseClient();
    if (!supabase) { router.replace('/signin'); return; }
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.replace('/signin'); return; }
    try {
      const [{ data: creatorData, error: creatorError }, progressData] = await Promise.all([
        supabase.from('creators').select(creatorFields).eq('auth_user_id', userData.user.id).maybeSingle(),
        loadCreatorProfileProgress(),
      ]);
      if (creatorError || !creatorData) throw creatorError || new Error('Creator profile not found.');
      const [identityResult, contentResult, savedSocial] = await Promise.all([
        supabase.from('creator_identity').select('profile_photo_url, display_name, username, creator_type, creator_type_other').eq('creator_id', creatorData.id).maybeSingle(),
        supabase.from('creator_content_profile').select('primary_niche, primary_niche_other').eq('creator_id', creatorData.id).maybeSingle(),
        loadSocialAccounts(creatorData.id),
      ]);
      if (identityResult.error || contentResult.error) throw identityResult.error || contentResult.error;
      const identityData = identityResult.data as Identity | null;
      if (identityData?.profile_photo_url) {
        const { data: signed } = await supabase.storage.from('creator-profile-photos').createSignedUrl(identityData.profile_photo_url, 3600);
        if (signed?.signedUrl) setProfilePhotoUrl(signed.signedUrl);
      }
      setUser(userData.user);
      setCreator(creatorData as Creator);
      setIdentity(identityData);
      setContent(contentResult.data as ContentProfile | null);
      setSocialAccounts(savedSocial as SocialAccount[]);
      setProgress(progressData);
      setLoading(false);
    } catch {
      setLoadError(true);
      setLoading(false);
    }
  };

  useEffect(() => { void loadProfile(); }, []);

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (!error) router.replace('/signin');
    else setSigningOut(false);
  };

  if (loading) return <LoadingState />;
  if (loadError || !creator || !user || !progress) return <ErrorState retry={() => void loadProfile()} />;

  const name = identity?.display_name?.trim() || creator.full_name.trim() || 'Creator';
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const basicInformation = progress.sections.find((section) => section.key === 'basic-information');
  const nextSection = progress.firstIncompleteRequiredSection;
  const nextProfileRoute = nextSection?.route ?? '/profile';
  const progressPercent = (progress.completedCount / progress.requiredCount) * 100;
  const isProfileComplete = progress.allRequiredComplete;
  const status = formatStatus(creator.status);
  const statusCopy = creator.status === 'pending' ? 'Your profile is being prepared.' : creator.status === 'active' ? 'Your creator profile is active.' : 'Your profile is currently not active.';

  return <main className="min-h-screen bg-[#fbfaff] text-[#151518]">
    <header className="flex h-[78px] items-center justify-between border-b border-[#e8e7eb] bg-white px-5 sm:px-8 lg:px-10"><AuthAwareLogo className="text-[1.5rem] font-semibold tracking-[-0.08em] text-black sm:text-[1.8rem]">CLOUTCO<span className="text-[#6330dc]">.</span></AuthAwareLogo><div className="flex items-center gap-4 sm:gap-6"><button type="button" className="text-[#525966]" aria-label="Notifications"><Icon name="bell" /></button><div className="hidden h-8 w-px bg-[#e7e7eb] sm:block" /><details className="group relative"><summary className="flex cursor-pointer list-none items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#eee8ff] text-sm font-semibold text-[#6330dc]">{initials}</span><span className="hidden text-left sm:block"><strong className="block max-w-[160px] truncate text-sm font-semibold">{name}</strong><span className="block text-xs text-[#707787]">Creator</span></span><span className="hidden text-[#656c7a] sm:block">⌄</span></summary><div className="absolute right-0 top-12 z-20 w-44 rounded-xl border border-[#e3e1e9] bg-white p-2 shadow-[0_12px_30px_rgba(45,35,75,0.12)]"><button type="button" onClick={signOut} disabled={signingOut} className="w-full rounded-lg px-3 py-2 text-left text-sm text-[#30333b] hover:bg-[#f7f4ff]">{signingOut ? 'Signing out...' : 'Sign out'}</button></div></details></div></header>
    <div className="mx-auto flex max-w-[1600px]">
      <aside className="hidden w-[230px] shrink-0 border-r border-[#e8e7eb] bg-white px-5 py-8 lg:block"><nav className="space-y-2" aria-label="Creator navigation"><Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-[#424754] hover:bg-[#faf8ff]"><Icon name="home" />Dashboard</Link><a href="#profile-sections" className="flex items-center gap-3 rounded-xl bg-[#f1ebff] px-4 py-3.5 text-sm font-medium text-[#6330dc]"><Icon name="user" />My Profile</a><a href="#next-steps" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-[#424754] hover:bg-[#faf8ff]"><Icon name="message" />Messages</a><a href="#profile-status" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-[#424754] hover:bg-[#faf8ff]"><Icon name="settings" />Settings</a></nav><div className="mt-36 rounded-2xl border border-[#e8e0fa] bg-[#fbf9ff] p-5"><div className="grid h-9 w-9 place-items-center rounded-full border border-[#d9c8ff] text-[#6330dc]"><Icon name="spark" /></div><h2 className="mt-5 text-sm font-semibold">Complete your profile</h2><p className="mt-2 text-xs leading-5 text-[#626a7a]">Build your professional creator profile on CloutCo.</p><p className="mt-4 text-xs font-medium text-[#34363d]">{progress.completedCount} of {progress.requiredCount} sections completed</p><p className="mt-2 text-xs text-[#777e8d]">{nextSection ? 'Next: ' + nextSection.title : 'Required sections complete'}</p>{nextSection ? <Link href={nextProfileRoute} className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-[#d3c1ff] px-3 py-2.5 text-xs font-medium text-[#6330dc]">Continue Profile <Icon name="arrow" /></Link> : <span className="mt-5 flex items-center justify-center rounded-lg border border-[#e2ddec] px-3 py-2.5 text-xs font-medium text-[#777e8d]">Required sections complete</span>}</div></aside>
      <div className="min-w-0 flex-1 px-5 py-9 sm:px-8 lg:px-12 lg:py-11">
        <section className="grid w-full gap-8 xl:grid-cols-[minmax(280px,1fr)_minmax(0,600px)] xl:items-center xl:gap-8"><div><h1 className="text-[2.4rem] font-semibold tracking-[-0.065em] sm:text-[3rem]">My Profile</h1><p className="mt-4 max-w-[340px] text-sm leading-6 text-[#5d6575]">Your creator profile brings your identity, content, audience, and work together in one polished view.</p><p className="mt-3 max-w-[340px] text-xs leading-5 text-[#7a728d]">Keep your profile information up to date to ensure your Creator Card is accurate.</p><Link href="/profile/preview" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d8c7fb] bg-[#f6f0ff] px-4 text-sm font-semibold text-[#6330dc] shadow-[0_6px_16px_rgba(99,48,220,0.12)] transition hover:border-[#c5afea] hover:bg-[#ede3ff]">Preview Profile <span aria-hidden="true" className="ml-2">&rarr;</span></Link></div><div className="w-full max-w-[600px] min-w-0 xl:mr-12 xl:justify-self-end"><CreatorCard creator={creator} identity={identity} content={content} photoUrl={profilePhotoUrl} socialAccounts={socialAccounts} initials={initials} allRequiredComplete={progress.allRequiredComplete} /></div></section>
        <div className="mt-8 grid gap-5 xl:grid-cols-[1.18fr_0.82fr]"><section className="rounded-2xl border border-[#e8e7eb] bg-white p-6 shadow-[0_7px_24px_rgba(50,40,80,0.035)] sm:p-7"><div className="flex items-start justify-between"><div><h2 className="text-lg font-semibold tracking-[-0.03em]">Profile setup progress</h2><p className="mt-2 text-sm text-[#626a7a]">{progress.completedCount} section{progress.completedCount === 1 ? '' : 's'} completed</p></div><span className="grid h-10 w-10 place-items-center rounded-full bg-[#f1ebff] text-[#7440f4]"><Icon name="document" /></span></div><div className="mt-7 flex items-center gap-4"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#eee9f9]"><div className={'h-full rounded-full ' + (isProfileComplete ? 'bg-[#13a34a]' : 'bg-[#7440f4]')} style={{ width: String(progressPercent) + '%' }} /></div><span className="whitespace-nowrap text-sm font-semibold text-[#6330dc]">{progress.completedCount} of {progress.requiredCount}</span></div><div className="mt-6 grid gap-4 border-t border-[#f0eff2] pt-5 sm:grid-cols-2"><div><p className="text-sm font-medium">Basic Information</p><p className="mt-1 text-xs text-[#777e8d]">{basicInformation?.completed ? 'Completed' : 'Not started'}</p><Link href="/profile/basic-information" className="mt-3 inline-flex text-xs font-semibold text-[#6330dc] hover:text-[#4720b2]">Edit Basic Information <span aria-hidden="true" className="ml-1">&rarr;</span></Link></div><div><p className="text-sm font-medium">{progress.requiredCount - progress.completedCount} sections remaining</p><p className="mt-1 text-xs text-[#777e8d]">Complete your professional profile step by step.</p></div></div></section><section id="profile-status" className="rounded-2xl border border-[#e8e7eb] bg-white p-6 shadow-[0_7px_24px_rgba(50,40,80,0.035)] sm:p-7"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold tracking-[-0.03em]">Profile status</h2><span className="rounded-full bg-[#fff3d9] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-[#a06900]">{status}</span></div><div className="mt-7 flex flex-col items-center text-center"><span className="grid h-14 w-14 place-items-center rounded-full bg-[#f1ebff] text-[#7440f4]"><Icon name="shield" /></span><h3 className="mt-4 text-sm font-semibold">{statusCopy}</h3><p className="mt-3 max-w-[230px] text-xs leading-5 text-[#656d7c]">Your basic details are saved in your CloutCo creator profile.</p></div></section></div>
        <section id="profile-sections" className="mt-5 rounded-2xl border border-[#e8e7eb] bg-white p-6 shadow-[0_7px_24px_rgba(50,40,80,0.035)] sm:p-7"><h2 className="text-lg font-semibold tracking-[-0.03em]">Profile sections</h2><p className="mt-2 text-sm text-[#626a7a]">Complete each section to build your professional creator profile.</p><div className="mt-6 space-y-2">{progress.sections.map((section) => { const presentation = sectionPresentation[section.key]; const row = <div className="flex items-center gap-4 rounded-xl border border-[#eeeef2] px-4 py-3.5 transition hover:border-[#ded3f7] hover:bg-[#fcfbff]"><span className={'grid h-10 w-10 shrink-0 place-items-center rounded-lg ' + (section.completed ? 'bg-[#eefbf2] text-[#13a34a]' : 'bg-[#f3edff] text-[#7440f4]')}><Icon name={section.completed ? 'check' : presentation.icon} /></span><span className="min-w-0 flex-1"><strong className="block text-sm font-semibold">{section.title}{section.required ? '' : ' (Optional)'}</strong><small className="mt-1 block text-xs text-[#777e8d]">{presentation.description}</small></span><span className={'hidden rounded-full px-3 py-1 text-[0.68rem] font-medium sm:block ' + (section.completed ? 'bg-[#eefbf2] text-[#21834a]' : 'bg-[#f5f0ff] text-[#7440f4]')}>{section.completed ? 'Completed' : section.required ? 'Not started' : 'Optional'}</span><span className="text-[#858b98]"><Icon name="chevron" /></span></div>; return section.route ? <Link key={section.key} href={section.route}>{row}</Link> : <div key={section.key} aria-disabled="true">{row}</div>; })}</div></section>
        <section id="next-steps" className="mt-5 rounded-2xl border border-[#e8e7eb] bg-white p-6 shadow-[0_7px_24px_rgba(50,40,80,0.035)] sm:p-7"><h2 className="text-lg font-semibold tracking-[-0.03em]">Why complete your profile?</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{reasons.map((reason) => <p key={reason} className="flex items-start gap-3 text-sm leading-5 text-[#4e5667]"><span className="mt-0.5 text-[#7440f4]"><Icon name="check" /></span>{reason}</p>)}</div><div className="mt-7 border-t border-[#f0eff2] pt-6"><div className="flex items-center justify-between gap-3"><h3 className="text-base font-semibold">Profile status</h3><span className="rounded-full bg-[#fff3d9] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-[#a06900]">{status}</span></div><p className="mt-4 text-sm font-medium">{statusCopy}</p><p className="mt-2 text-sm leading-5 text-[#656d7c]">Your basic details are saved in your CloutCo creator profile.</p></div></section>
      </div>
    </div>
  </main>;
}

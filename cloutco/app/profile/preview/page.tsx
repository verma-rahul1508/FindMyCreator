'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { loadSocialAccounts } from '@/lib/social-platform-persistence';
import { formatPlatformCount } from '@/lib/format-number';

type Creator = { id: string; full_name: string; current_city: string | null };
type Identity = { profile_photo_url: string | null; display_name: string | null; username: string | null; bio: string | null; languages: string[] | null; creator_type: string | null; creator_type_other: string | null };
type ContentDraft = { primary?: string; primaryOther?: string; otherNiches?: string[]; otherNichesOther?: string; contentFormats?: string[]; contentFormatsOther?: string; contentStyles?: string[]; contentStylesOther?: string };
type ContentProfileRow = { primary_niche: string | null; primary_niche_other: string | null; other_niches: string[] | null; other_niches_other: string | null; content_formats: string[] | null; content_formats_other: string | null; content_styles: string[] | null; content_styles_other: string | null };
type InstagramAudience = { followers?: string; followerGrowth?: string; women?: string; men?: string; ages?: Record<string, string>; locations?: { countries?: Array<{ id?: string; name?: string; percentage?: string }>; cities?: Array<{ id?: string; name?: string; percentage?: string }> } };
type InsightLocation = { id?: string; name?: string; percentage?: string };
type FacebookMediaType = { id?: string; mediaType?: string; percentage?: string };
type FacebookMetric = { id?: string; name?: string; value?: string };
type FacebookInsights = {
  period?: string;
  overview?: { viewsTotal?: string; mediaTypes?: FacebookMediaType[] };
  engagement?: { total?: string };
  audience?: { netFollowers?: string; women?: string; men?: string; ageGroups?: FacebookMetric[]; locations?: { countries?: InsightLocation[]; cities?: InsightLocation[] } };
  traffic?: FacebookMetric[];
  source?: FacebookMetric[];
};
type InstagramOverview = { views?: string; interactions?: string; allInteractions?: string; postsViews?: string; reelsViews?: string; storiesViews?: string; liveVideosViews?: string };
type SocialAccount = { id: string; platform: string; platformName?: string; profileUrl?: string; username?: string; audienceCount?: string; isPrimary?: boolean; instagramInsights?: { period?: string; overview?: InstagramOverview; audience?: InstagramAudience }; facebookInsights?: FacebookInsights };
type PortfolioItem = { id: string; contentUrl?: string; platform?: string; contentType?: string; title?: string; description?: string; thumbnail?: string | null; createdAt?: string };
type PortfolioDatabaseRow = { id: string; content_url: string; platform: string; content_type: string; title: string | null; description: string | null; thumbnail_url: string | null; created_at: string };

const creatorTypeLabels: Record<string, string> = { content_creator: 'Content Creator', influencer: 'Influencer', ugc_creator: 'UGC Creator', digital_creator: 'Digital Creator' };
const platformLogos: Record<string, string> = { instagram: '/brands/instagram.svg', facebook: '/brands/facebook.svg', youtube: '/brands/youtube.svg' };

function formatSelection(value?: string, other?: string) { return value === 'Other' ? other?.trim() || '' : value?.trim() || ''; }
function safeExternalUrl(value?: string) { if (!value) return ''; try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : ''; } catch { return ''; } }
function percentWidth(value: string) { const number = Number(value); return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : 0; }
function numericValue(value?: string) { const number = Number(value?.trim()); return Number.isFinite(number) ? number : null; }
function highestPercentage<T extends { percentage?: string }>(items: T[] | undefined) { return (items || []).reduce<T | null>((highest, item) => { const percentage = numericValue(item.percentage); return percentage !== null && (!highest || percentage > (numericValue(highest.percentage) ?? -Infinity)) ? item : highest; }, null); }
function highestMetric(metrics: FacebookMetric[] | undefined) { return (metrics || []).reduce<FacebookMetric | null>((highest, metric) => { const value = numericValue(metric.value); return value !== null && metric.name?.trim() && (!highest || value > (numericValue(highest.value) ?? -Infinity)) ? metric : highest; }, null); }
type MetricIcon = 'followers' | 'views' | 'interactions' | 'content' | 'city' | 'growth' | 'age' | 'gender';
function metricIcon(icon: MetricIcon) { return { followers: String.fromCodePoint(0x1F465), views: String.fromCodePoint(0x25C9), interactions: String.fromCodePoint(0x2661), content: String.fromCodePoint(0x25B6), city: String.fromCodePoint(0x25C7), growth: String.fromCodePoint(0x2197), age: String.fromCodePoint(0x1F464), gender: String.fromCodePoint(0x25CB) }[icon]; }
function providedNumber(value?: string) { const normalized = value?.trim(); if (!normalized) return null; const number = Number(normalized); return Number.isFinite(number) ? number : null; }
function highestProvidedPercentage<T extends { percentage?: string }>(items: T[] | undefined) { return (items || []).reduce<T | null>((highest, item) => { const percentage = providedNumber(item.percentage); return percentage !== null && (!highest || percentage > (providedNumber(highest.percentage) ?? -Infinity)) ? item : highest; }, null); }
function highestProvidedMetric(metrics: FacebookMetric[] | undefined) { return (metrics || []).reduce<FacebookMetric | null>((highest, metric) => { const value = providedNumber(metric.value); return value !== null && metric.name?.trim() && (!highest || value > (providedNumber(highest.value) ?? -Infinity)) ? metric : highest; }, null); }
function formatCount(value?: string) { return formatPlatformCount(value); }
function platformKey(platform?: string) { return platform?.trim().toLowerCase() || ''; }
function platformName(account: SocialAccount) { const key = platformKey(account.platform); return key === 'instagram' ? 'Instagram' : key === 'facebook' ? 'Facebook' : key === 'youtube' ? 'YouTube' : account.platformName?.trim() || account.platform; }
function platformViews(account: SocialAccount) { const key = platformKey(account.platform); return key === 'instagram' ? account.instagramInsights?.overview?.views : key === 'facebook' ? account.facebookInsights?.overview?.viewsTotal : ''; }
function analyticsPeriod(account: SocialAccount) { const key = platformKey(account.platform); return key === 'instagram' ? account.instagramInsights?.period : key === 'facebook' ? account.facebookInsights?.period : ''; }
function periodMetricLabel(period: string | undefined, metric: string) { const days = Number(period?.trim()); return Number.isInteger(days) && days > 0 ? `Last ${days} days ${metric}` : metric; }

function EditLink({ href, children }: { href: string; children: ReactNode }) { return <Link href={href} className="text-[0.78rem] font-medium text-[#5f28dc] transition hover:text-[#4520a8]">{children} <span aria-hidden="true">→</span></Link>; }
function SectionHeading({ eyebrow, title, editHref, editLabel }: { eyebrow: string; title: string; editHref?: string; editLabel: string }) { return <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#6330dc]">{eyebrow}</p><h2 className="mt-2 text-[1.35rem] font-semibold tracking-[-0.045em] text-[#1b1920] sm:text-[1.5rem]">{title}</h2></div>{editHref && <EditLink href={editHref}>{editLabel}</EditLink>}</div>; }
function ProfileSection({ children }: { children: ReactNode }) { return <section className="border-t border-[#e6e4ea] py-8 sm:py-10">{children}</section>; }
function EditorialPrompt({ heading, description, href, action }: { heading: string; description: string; href: string; action: string }) { return <div className="border-l-2 border-[#d9cbf7] py-0.5 pl-5"><h3 className="text-base font-medium text-[#2d2932]">{heading}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-[#696572]">{description}</p><Link href={href} className="mt-3 inline-flex text-sm font-semibold text-[#6330dc] hover:text-[#4720b2]">{action} <span aria-hidden="true" className="ml-1">→</span></Link></div>; }
function PlatformMark({ platform, size = 'secondary' }: { platform: string; size?: 'primary' | 'secondary' }) {
  const logo = platformLogos[platformKey(platform)];
  const sizeClass = size === 'primary' ? 'h-16 w-16 rounded-2xl p-3 sm:h-[4.5rem] sm:w-[4.5rem]' : 'h-12 w-12 rounded-xl p-2.5';
  return <span aria-hidden="true" className={`grid shrink-0 place-items-center ${sizeClass} ${logo ? 'border border-[#e8e4ee] bg-white shadow-[0_5px_14px_rgba(60,42,90,0.05)]' : 'bg-[#766e87] text-sm font-semibold text-white'}`}>{logo ? <img src={logo} alt="" className="h-full w-full object-contain" /> : platform === 'Other' ? '+' : platform.slice(0, 1).toUpperCase()}</span>;
}
function AudienceBar({ label, value }: { label: string; value: string }) { return <div><div className="flex items-center justify-between gap-3 text-[0.78rem] text-[#4b4752]"><span className="truncate">{label}</span><span className="shrink-0">{value.trim()}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f0eff4]"><span className="block h-full rounded-full bg-[#c4a8f2]" style={{ width: `${percentWidth(value)}%` }} /></div></div>; }

function ProfileSummaryCard({
  displayName,
  initials,
  photoUrl,
  identity,
  creatorType,
  creatorLocation,
  primaryNiche,
  otherNiches,
  formats,
  styles,
  hasContent,
}: {
  displayName: string;
  initials: string;
  photoUrl: string;
  identity: Identity | null;
  creatorType: string;
  creatorLocation: string;
  primaryNiche: string;
  otherNiches: string[];
  formats: string[];
  styles: string[];
  hasContent: boolean;
}) {
  const languages = (identity?.languages || []).map((language) => language.trim()).filter(Boolean);

  return <section className="relative isolate overflow-hidden rounded-2xl border border-[#e8e2f1] bg-[linear-gradient(135deg,#fff_0%,#fdfbff_55%,#f7f2ff_100%)] px-6 py-7 shadow-[0_12px_34px_rgba(60,42,90,0.04)] sm:px-8 sm:py-9 lg:px-10 lg:py-10">
    <div aria-hidden="true" className="absolute -left-16 bottom-[-5rem] -z-10 h-52 w-52 rounded-full border border-[#e8ddfa] bg-[#faf7ff]" />
    <div aria-hidden="true" className="absolute right-[-4.5rem] top-[-5rem] -z-10 h-72 w-72 rounded-full bg-[#f0e8ff]/70" />
    <div aria-hidden="true" className="absolute right-[28%] top-12 -z-10 h-20 w-20 rounded-full border border-[#ece4f8] bg-white/60" />
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
      <div className="min-w-0">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-full border-[3px] border-[#d9c6f7] bg-[#f4effb] text-2xl font-semibold text-[#6c43b7] shadow-[0_5px_15px_rgba(73,47,120,0.08)] sm:h-32 sm:w-32 sm:text-3xl">
            {photoUrl ? <img src={photoUrl} alt={displayName ? `Portrait of ${displayName}` : ''} className="h-full w-full object-cover" /> : initials}
          </div>
          <div className="min-w-0 pt-0.5">
            <span className="inline-flex rounded-full bg-[#efe6ff] px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#6330dc]">{creatorType || 'Creator'}</span>
            {displayName && <h1 className="mt-3 break-words text-[2.25rem] font-semibold leading-[0.98] tracking-[-0.065em] text-[#15131a] sm:text-[2.65rem]">{displayName}</h1>}
            {identity?.username?.trim() && <p className="mt-2 text-base font-medium text-[#24212a]">@{identity.username.trim().replace(/^@+/, '')}</p>}
            {(creatorType || languages.length) && <p className="mt-3 text-sm leading-6 text-[#5c5765]">{[creatorType, languages.join(' · ')].filter(Boolean).join(' · ')}</p>}
            {creatorLocation && <p className="mt-1 text-sm leading-6 text-[#5c5765]">{creatorLocation}</p>}
          </div>
        </div>
        {identity?.bio?.trim() && <p className="mt-6 max-w-xl text-[0.95rem] leading-7 text-[#46414e]">{identity.bio.trim()}</p>}
      </div>

      <div className="min-w-0 border-t border-[#e9e3ee] pt-7 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#6330dc]">Content &amp; Niche</p>
        {hasContent ? <>
          <h2 className="mt-3 break-words text-[2.25rem] font-semibold leading-[0.98] tracking-[-0.065em] text-[#15131a] sm:text-[2.65rem]">{primaryNiche}</h2>
          {otherNiches.length ? <div className="mt-5 flex flex-wrap gap-2">{otherNiches.map((niche) => <span key={niche} className="rounded-full border border-[#e5d8f8] bg-[#f3effc] px-3 py-1.5 text-xs font-medium text-[#5d5480]">{niche}</span>)}</div> : null}
          <div className="mt-7 grid gap-6 border-t border-[#e9e3ee] pt-6 sm:grid-cols-2 sm:gap-0">
            <div className="min-w-0 sm:pr-6"><p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#686270]">Content formats</p><p className="mt-3 text-sm leading-6 text-[#292632]">{formats.join(' · ')}</p></div>
            <div className="min-w-0 border-t border-[#eee9f2] pt-6 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0"><p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#686270]">Content style</p><p className="mt-3 text-sm leading-6 text-[#292632]">{styles.join(' · ')}</p></div>
          </div>
        </> : <div className="mt-7"><EditorialPrompt heading="Tell brands what you create" description="Add your niche, content formats and creative style to show brands what you specialise in." href="/profile/content" action="Add Content & Niche" /></div>}
      </div>
    </div>
  </section>;
}

function RecentContentStrip({ portfolio }: { portfolio: PortfolioItem[] }) {
  const newestFirst = [...portfolio].sort((first, second) => (Date.parse(second.createdAt || '') || 0) - (Date.parse(first.createdAt || '') || 0));
  const thumbnailItems = newestFirst.filter((item): item is PortfolioItem & { thumbnail: string } => Boolean(item.thumbnail?.trim()));
  const visibleItems = thumbnailItems.slice(0, thumbnailItems.length > 4 ? 3 : 4);
  const remainingCount = thumbnailItems.length - visibleItems.length;
  if (!visibleItems.length) return null;

  return <div className="mt-5 border-t border-[#ebe5f2] pt-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-[#403b4a]">Recent Content</p><Link href="/profile/portfolio" className="shrink-0 text-xs font-semibold text-[#6330dc] hover:text-[#4720b2]">View selected work <span aria-hidden="true">&rarr;</span></Link></div><div className="mt-3 flex items-center gap-2.5">{visibleItems.map((item) => <div key={item.id} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#e9e3f1] bg-[#f5f1fa] sm:h-[4.5rem] sm:w-[4.5rem]"><img src={item.thumbnail} alt={item.title?.trim() || ''} className="h-full w-full object-cover" /></div>)}{remainingCount > 0 && <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border border-[#e1d6f4] bg-[#f3edff] px-2 text-center text-xs font-semibold leading-4 text-[#6130d5] sm:h-[4.5rem] sm:w-[4.5rem]">+{remainingCount} more</div>}</div></div>;
}

function PrimaryPlatformCard({ account, portfolio }: { account: SocialAccount; portfolio: PortfolioItem[] }) {
  const accountPlatform = platformKey(account.platform);
  const displayPlatformName = platformName(account);
  const followerLabel = accountPlatform === 'youtube' ? 'Subscribers' : 'Followers';
  const profileUrl = safeExternalUrl(account.profileUrl);
  const period = analyticsPeriod(account);
  const instagramOverview = account.instagramInsights?.overview;
  const facebookInsights = account.facebookInsights;
  const instagramTopContent = highestProvidedMetric([
    { name: 'Post', value: instagramOverview?.postsViews },
    { name: 'Reel', value: instagramOverview?.reelsViews },
    { name: 'Story', value: instagramOverview?.storiesViews },
    { name: 'Live Video', value: instagramOverview?.liveVideosViews },
  ]);
  const facebookTopContent = highestPercentage(facebookInsights?.overview?.mediaTypes);
  const views = accountPlatform === 'instagram' ? instagramOverview?.views : accountPlatform === 'facebook' ? facebookInsights?.overview?.viewsTotal : '';
  const interactions = accountPlatform === 'instagram' ? instagramOverview?.interactions : accountPlatform === 'facebook' ? facebookInsights?.engagement?.total : '';
  const topViewContent = accountPlatform === 'instagram' ? instagramTopContent?.name?.trim() || '' : accountPlatform === 'facebook' ? facebookTopContent?.mediaType?.trim() || '' : '';
  const metrics = [
    account.audienceCount?.trim() ? { label: followerLabel, value: formatCount(account.audienceCount), icon: 'followers' as const } : null,
    views?.trim() ? { label: periodMetricLabel(period, 'Views'), value: formatCount(views), icon: 'views' as const } : null,
    interactions?.trim() ? { label: periodMetricLabel(period, 'Interactions'), value: formatCount(interactions), icon: 'interactions' as const } : null,
    topViewContent ? { label: 'Top View Content', value: topViewContent, icon: 'content' as const } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; icon: MetricIcon }>;

  return <article className="h-full rounded-2xl border border-[#ded1f6] bg-[linear-gradient(135deg,#fff_0%,#fefcff_72%,#f7f2ff_100%)] p-5 shadow-[0_10px_28px_rgba(60,42,90,0.035)] sm:p-6">
    <div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-4"><PlatformMark platform={account.platform} size="primary" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold tracking-[-0.04em] text-[#1f1c25]">{displayPlatformName}</h3><span className="rounded-full bg-[#f1eaff] px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[#6430dc]">Primary</span></div>{account.username?.trim() && <p className="mt-1 truncate text-sm text-[#615c6a]">@{account.username.trim().replace(/^@+/, '')}</p>}</div></div>{profileUrl && <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-sm font-medium text-[#6330dc] hover:text-[#4720b2]">View Profile <span aria-hidden="true">&rarr;</span></a>}</div>
    {metrics.length ? <div className="mt-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4">{metrics.map((metric) => <div key={metric.label} className="min-w-0 rounded-xl border border-[#e9e3f1] bg-white/80 px-3.5 py-3.5"><div className="flex min-h-7 items-center gap-2"><span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f1ebff] text-xs text-[#6531dc]">{metricIcon(metric.icon)}</span><p className="text-[0.72rem] font-medium leading-4 text-[#686270]">{metric.label}</p></div><p className="mt-3 truncate text-xl font-semibold tracking-[-0.05em] text-[#1f1c25]">{metric.value}</p></div>)}</div> : <p className="mt-6 text-sm leading-6 text-[#686270]">Platform insights have not been provided yet.</p>}
    <RecentContentStrip portfolio={portfolio} />
  </article>;
}

function AudiencePanel({ account }: { account?: SocialAccount }) {
  const accountPlatform = platformKey(account?.platform);
  const displayPlatformName = account ? platformName(account) : '';
  const instagramAudience = accountPlatform === 'instagram' ? account?.instagramInsights?.audience : undefined;
  const facebookAudience = accountPlatform === 'facebook' ? account?.facebookInsights?.audience : undefined;
  const instagramTopAge = highestProvidedMetric(Object.entries(instagramAudience?.ages || {}).map(([name, value]) => ({ name, value })));
  const facebookTopAge = highestMetric(facebookAudience?.ageGroups);
  const topAge = instagramTopAge?.name?.trim() || facebookTopAge?.name?.trim() || '';
  const topCountry = instagramAudience ? highestProvidedPercentage(instagramAudience.locations?.countries) : highestPercentage(facebookAudience?.locations?.countries);
  const topCity = instagramAudience ? highestProvidedPercentage(instagramAudience.locations?.cities) : highestPercentage(facebookAudience?.locations?.cities);
  const women = instagramAudience?.women?.trim() || facebookAudience?.women?.trim() || '';
  const men = instagramAudience?.men?.trim() || facebookAudience?.men?.trim() || '';
  const highlights = [
    topAge ? { label: 'Top Age', value: topAge, icon: 'age' as const } : null,
    topCountry?.name?.trim() ? { label: 'Top Country', value: topCountry.name.trim(), icon: 'city' as const } : null,
    topCity?.name?.trim() ? { label: 'Top City', value: topCity.name.trim(), icon: 'city' as const } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; icon: MetricIcon }>;
  const hasAudience = Boolean(highlights.length || women || men);
  const noAudienceMessage = !account ? 'Add a primary social platform to see audience insights.' : accountPlatform === 'youtube' ? "Audience insights aren't available for this platform yet." : "Audience insights haven't been provided yet.";

  return <aside className="relative isolate h-full overflow-hidden rounded-2xl border border-[#e8def8] bg-[linear-gradient(145deg,#fdfaff_0%,#f8f3ff_100%)] p-5 shadow-[0_10px_28px_rgba(60,42,90,0.03)] sm:p-6 lg:p-7">
    <div aria-hidden="true" className="absolute -right-12 -top-12 -z-10 h-44 w-44 rounded-full border-[18px] border-[#efe6ff]/80" />
    <div aria-hidden="true" className="absolute right-10 top-8 -z-10 h-16 w-16 rounded-full bg-white/50" />
    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#6330dc]">Who watches my content</p>
    <h3 className="mt-3 text-[2rem] font-semibold leading-none tracking-[-0.065em] text-[#15131a] sm:text-[2.25rem]">My Audience</h3>
    {account && accountPlatform !== 'youtube' ? <p className="mt-3 max-w-md text-sm leading-6 text-[#5f5870]">A snapshot of the people who engage with my content on <span className="font-semibold text-[#26212f]">{displayPlatformName}</span>.</p> : null}
    {hasAudience ? <div className="mt-6"><div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">{highlights.map((highlight) => <div key={highlight.label} className="min-w-0 rounded-xl border border-[#e9e2f4] bg-white/80 p-3"><div className="flex items-center gap-1"><span aria-hidden="true" className="grid h-[1.125rem] w-[1.125rem] shrink-0 place-items-center rounded-full bg-[#f1ebff] text-[0.62rem] text-[#6531dc]">{metricIcon(highlight.icon)}</span><p className="whitespace-nowrap text-[0.8125rem] font-medium leading-5 text-[#6c6573]">{highlight.label}</p></div><p className="mt-4 truncate text-xl font-semibold tracking-[-0.05em] text-[#1f1c25]">{highlight.value}</p></div>)}</div>{(women || men) && <div className="mt-3 rounded-xl border border-[#e9e2f4] bg-white/80 p-4"><p className="text-xs font-medium text-[#413c49]">Audience Gender</p><div className="mt-3 space-y-2.5">{women && <AudienceBar label="Women" value={women} />}{men && <AudienceBar label="Men" value={men} />}</div></div>}</div> : <p className="mt-6 text-sm leading-6 text-[#686270]">{noAudienceMessage}</p>}
  </aside>;
}

function CompactSecondaryPlatformCard({ account }: { account: SocialAccount }) {
  const displayPlatformName = platformName(account);
  const followerLabel = platformKey(account.platform) === 'youtube' ? 'Subscribers' : 'Followers';
  const profileUrl = safeExternalUrl(account.profileUrl);
  const views = platformViews(account);
  const metrics = [
    account.audienceCount?.trim() ? { label: followerLabel, value: formatCount(account.audienceCount), icon: 'followers' as const } : null,
    views?.trim() ? { label: periodMetricLabel(analyticsPeriod(account), 'Views'), value: formatCount(views), icon: 'views' as const } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; icon: MetricIcon }>;

  return <article className="flex h-full min-h-[188px] flex-col rounded-2xl border border-[#e8e2f0] bg-white p-5 shadow-[0_7px_20px_rgba(60,42,90,0.025)]"><div className="flex min-w-0 items-center gap-3.5"><PlatformMark platform={account.platform} size="secondary" /><div className="min-w-0"><h3 className="truncate text-base font-semibold tracking-[-0.035em] text-[#1f1c25]">{displayPlatformName}</h3>{account.username?.trim() && <p className="mt-0.5 truncate text-sm text-[#615c6a]">@{account.username.trim().replace(/^@+/, '')}</p>}</div></div>{metrics.length ? <div className="mt-5 grid grid-cols-2 gap-3">{metrics.map((metric) => <div key={metric.label} className="min-w-0"><div className="flex min-h-7 items-center gap-2"><span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f1ebff] text-xs text-[#6531dc]">{metricIcon(metric.icon)}</span><p className="text-[0.68rem] leading-4 text-[#686270]">{metric.label}</p></div><p className="mt-2 truncate text-lg font-semibold tracking-[-0.05em] text-[#1f1c25]">{metric.value}</p></div>)}</div> : <p className="mt-5 text-sm leading-6 text-[#686270]">Basic platform information is available.</p>}{profileUrl && <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="mt-auto pt-5 text-sm font-medium text-[#6330dc] hover:text-[#4720b2]">View Profile <span aria-hidden="true">&rarr;</span></a>}</article>;
}

export default function ProfilePreviewPage() {
  const router = useRouter();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [content, setContent] = useState<ContentDraft>({});
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadPreview = async () => {
    setLoading(true); setLoadError(false);
    const supabase = getSupabaseClient();
    if (!supabase) { router.replace('/signin'); return; }
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { router.replace('/signin'); return; }
    const { data: creatorData, error: creatorError } = await supabase.from('creators').select('id, full_name, current_city').eq('auth_user_id', userData.user.id).maybeSingle();
    if (creatorError || !creatorData) { setLoadError(true); setLoading(false); return; }
    try {
      const [identityResult, contentResult, portfolioResult, savedSocial] = await Promise.all([
        supabase.from('creator_identity').select('profile_photo_url, display_name, username, bio, languages, creator_type, creator_type_other').eq('creator_id', creatorData.id).maybeSingle(),
        supabase.from('creator_content_profile').select('primary_niche, primary_niche_other, other_niches, other_niches_other, content_formats, content_formats_other, content_styles, content_styles_other').eq('creator_id', creatorData.id).maybeSingle(),
        supabase.from('creator_portfolio_items').select('id, content_url, platform, content_type, title, description, thumbnail_url, created_at').eq('creator_id', creatorData.id).order('sort_order', { ascending: true }),
        loadSocialAccounts(creatorData.id),
      ]);
      if (identityResult.error || contentResult.error || portfolioResult.error) throw new Error('We could not load your profile preview.');

      const identityData = identityResult.data as Identity | null;
      const contentData = contentResult.data as ContentProfileRow | null;
      const portfolioData = (portfolioResult.data || []) as PortfolioDatabaseRow[];
      const savedContent: ContentDraft = contentData ? {
        primary: contentData.primary_niche || '',
        primaryOther: contentData.primary_niche_other || '',
        otherNiches: contentData.other_niches || [],
        otherNichesOther: contentData.other_niches_other || '',
        contentFormats: contentData.content_formats || [],
        contentFormatsOther: contentData.content_formats_other || '',
        contentStyles: contentData.content_styles || [],
        contentStylesOther: contentData.content_styles_other || '',
      } : {};
      const savedPortfolio: PortfolioItem[] = portfolioData.map((item) => ({
        id: item.id,
        contentUrl: item.content_url,
        platform: item.platform,
        contentType: item.content_type,
        title: item.title || '',
        description: item.description || '',
        thumbnail: item.thumbnail_url,
        createdAt: item.created_at,
      }));

      setCreator(creatorData as Creator); setIdentity(identityData);
      if (identityData?.profile_photo_url) { const { data: signed } = await supabase.storage.from('creator-profile-photos').createSignedUrl(identityData.profile_photo_url, 3600); if (signed?.signedUrl) setPhotoUrl(signed.signedUrl); }
      setContent(savedContent);
      setSocialAccounts(savedSocial as SocialAccount[]);
      setPortfolio(savedPortfolio);
      setLoading(false);
    } catch {
      setLoadError(true); setLoading(false);
    }
  };
  useEffect(() => { void loadPreview(); }, []);

  const displayName = identity?.display_name?.trim() || creator?.full_name?.trim() || '';
  const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const primaryNiche = formatSelection(content.primary, content.primaryOther);
  const otherNiches = (content.otherNiches || []).map((item) => formatSelection(item, content.otherNichesOther)).filter(Boolean);
  const formats = (content.contentFormats || []).map((item) => formatSelection(item, content.contentFormatsOther)).filter(Boolean);
  const styles = (content.contentStyles || []).map((item) => formatSelection(item, content.contentStylesOther)).filter(Boolean);
  const hasContent = Boolean(primaryNiche && formats.length && styles.length);
  const creatorType = (identity?.creator_type === 'other' ? identity.creator_type_other?.trim() : identity?.creator_type ? creatorTypeLabels[identity.creator_type] : '') || '';
  const creatorLocation = creator?.current_city?.trim() || '';
  const primarySocialAccount = socialAccounts.find((account) => account.isPrimary);
  const secondarySocialAccounts = primarySocialAccount ? socialAccounts.filter((account) => account.id !== primarySocialAccount.id) : socialAccounts;

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#fbfaff] text-sm text-[#5b6272]">Loading your profile preview...</main>;
  if (loadError || !creator) return <main className="grid min-h-screen place-items-center bg-[#fbfaff] px-6 text-center"><div className="max-w-md"><h1 className="text-2xl font-semibold tracking-[-0.05em] text-black">We couldn&apos;t load your profile preview</h1><p className="mt-3 text-sm leading-6 text-[#626a7a]">Please try again. Your profile information has not been changed.</p><button type="button" onClick={() => void loadPreview()} className="mt-6 text-sm font-semibold text-[#6330dc]">Try again</button></div></main>;

  return (
    <main className="min-h-screen bg-[#fbfaff] px-3 py-3 text-[#19171d] sm:px-5 sm:py-5">
      <div className="mx-auto max-w-[1180px] overflow-hidden rounded-xl border border-[#ebe7f0] bg-white shadow-[0_12px_34px_rgba(60,42,90,0.04)]">
        <div className="px-7 pt-5 sm:px-9">
          <nav className="flex items-center justify-between gap-4" aria-label="Profile preview navigation">
            <Link href="/profile" className="inline-flex min-h-10 items-center text-sm font-medium text-[#4e4a55] hover:text-[#6330dc]"><span aria-hidden="true" className="mr-2">&larr;</span>My Profile</Link>
            <Link href="/profile" className="inline-flex min-h-10 items-center text-sm font-medium text-[#6330dc] hover:text-[#4720b2]">Edit Profile <span aria-hidden="true" className="ml-1">&rarr;</span></Link>
          </nav>
        </div>

        <div className="mt-3 px-7 sm:px-9">
          <ProfileSummaryCard
            displayName={displayName}
            initials={initials}
            photoUrl={photoUrl}
            identity={identity}
            creatorType={creatorType}
            creatorLocation={creatorLocation}
            primaryNiche={primaryNiche}
            otherNiches={otherNiches}
            formats={formats}
            styles={styles}
            hasContent={hasContent}
          />
        </div>

        <div className="px-7 sm:px-9">
          <ProfileSection>
            <SectionHeading eyebrow="Social Presence" title="Where I create" editHref={socialAccounts.length ? '/profile/social' : undefined} editLabel="Edit Social Platforms" />
            <div className="mt-7 grid gap-5 min-[1200px]:grid-cols-[minmax(0,1.65fr)_minmax(430px,1fr)] min-[1200px]:items-stretch">
              <div className="min-w-0">
                {socialAccounts.length ? primarySocialAccount ? <div className="flex flex-col gap-4"><PrimaryPlatformCard account={primarySocialAccount} portfolio={portfolio} />{secondarySocialAccounts.length ? <div className="grid auto-rows-fr gap-4 sm:grid-cols-2">{secondarySocialAccounts.map((account) => <CompactSecondaryPlatformCard key={account.id} account={account} />)}</div> : null}</div> : <div className="grid auto-rows-fr gap-4 sm:grid-cols-2">{socialAccounts.map((account) => <CompactSecondaryPlatformCard key={account.id} account={account} />)}</div> : <EditorialPrompt heading="Show brands where you create" description="Add your social platforms so brands can see where you publish content." href="/profile/social" action="Add Social Platforms" />}
              </div>
              <AudiencePanel account={primarySocialAccount} />
            </div>
          </ProfileSection>
          <div className="flex justify-center pb-10 pt-2 sm:pb-12">
            <Link href="/profile" className="inline-flex min-h-10 items-center rounded-xl border border-[#dfd2f5] bg-[#fbf9ff] px-4 py-2 text-sm font-medium text-[#6330dc] shadow-[0_4px_12px_rgba(60,42,90,0.025)] transition hover:border-[#cbb7ee] hover:bg-[#f5f0ff] hover:text-[#4720b2]">
              <span aria-hidden="true" className="mr-2">&larr;</span>Back to Profile
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { loadSocialAccounts } from '@/lib/social-platform-persistence';
import { formatPlatformCount } from '@/lib/format-number';

type Creator = { id: string; full_name: string };
type Identity = { profile_photo_url: string | null; display_name: string | null; username: string | null; bio: string | null; languages: string[] | null; creator_type: string | null; creator_type_other: string | null };
type ContentDraft = { primary?: string; primaryOther?: string; otherNiches?: string[]; otherNichesOther?: string; contentFormats?: string[]; contentFormatsOther?: string; contentStyles?: string[]; contentStylesOther?: string };
type ContentProfileRow = { primary_niche: string | null; primary_niche_other: string | null; other_niches: string[] | null; other_niches_other: string | null; content_formats: string[] | null; content_formats_other: string | null; content_styles: string[] | null; content_styles_other: string | null };
type InstagramAudience = { followers?: string; followerGrowth?: string; women?: string; men?: string; ages?: Record<string, string>; locations?: { countries?: Array<{ id?: string; name?: string; percentage?: string }>; cities?: Array<{ id?: string; name?: string; percentage?: string }> } };
type InsightLocation = { id?: string; name?: string; percentage?: string };
type FacebookMediaType = { id?: string; mediaType?: string; percentage?: string };
type FacebookMetric = { id?: string; name?: string; value?: string };
type FacebookInsights = {
  overview?: { viewsTotal?: string; mediaTypes?: FacebookMediaType[] };
  engagement?: { total?: string };
  audience?: { netFollowers?: string; women?: string; men?: string; ageGroups?: FacebookMetric[]; locations?: { countries?: InsightLocation[]; cities?: InsightLocation[] } };
  traffic?: FacebookMetric[];
  source?: FacebookMetric[];
};
type InstagramOverview = { views?: string; interactions?: string; allInteractions?: string; postsViews?: string; reelsViews?: string; storiesViews?: string; liveVideosViews?: string };
type SocialAccount = { id: string; platform: string; platformName?: string; profileUrl?: string; username?: string; audienceCount?: string; isPrimary?: boolean; instagramInsights?: { overview?: InstagramOverview; audience?: InstagramAudience }; facebookInsights?: FacebookInsights };
type PortfolioItem = { id: string; contentUrl?: string; platform?: string; contentType?: string; title?: string; description?: string; thumbnail?: string | null };
type PortfolioDatabaseRow = { id: string; content_url: string; platform: string; content_type: string; title: string | null; description: string | null; thumbnail_url: string | null };

const creatorTypeLabels: Record<string, string> = { content_creator: 'Content Creator', influencer: 'Influencer', ugc_creator: 'UGC Creator', digital_creator: 'Digital Creator' };
const platformLogos: Record<string, string> = { Instagram: '/brands/instagram.svg', Facebook: '/brands/facebook.svg', YouTube: '/brands/youtube.svg' };

function formatSelection(value?: string, other?: string) { return value === 'Other' ? other?.trim() || '' : value?.trim() || ''; }
function safeExternalUrl(value?: string) { if (!value) return ''; try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : ''; } catch { return ''; } }
function percentWidth(value: string) { const number = Number(value); return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : 0; }
function isVideo(type?: string) { return /video|reel|vlog|livestream|podcast/i.test(type || ''); }
function numericValue(value?: string) { const number = Number(value?.trim()); return Number.isFinite(number) ? number : null; }
function highestPercentage<T extends { percentage?: string }>(items: T[] | undefined) { return (items || []).reduce<T | null>((highest, item) => { const percentage = numericValue(item.percentage); return percentage !== null && (!highest || percentage > (numericValue(highest.percentage) ?? -Infinity)) ? item : highest; }, null); }
function highestMetric(metrics: FacebookMetric[] | undefined) { return (metrics || []).reduce<FacebookMetric | null>((highest, metric) => { const value = numericValue(metric.value); return value !== null && metric.name?.trim() && (!highest || value > (numericValue(highest.value) ?? -Infinity)) ? metric : highest; }, null); }
type MetricIcon = 'followers' | 'views' | 'interactions' | 'content' | 'city' | 'growth' | 'age' | 'gender';
function metricIcon(icon: MetricIcon) { return { followers: String.fromCodePoint(0x1F465), views: String.fromCodePoint(0x25C9), interactions: String.fromCodePoint(0x2661), content: String.fromCodePoint(0x25B6), city: String.fromCodePoint(0x25C7), growth: String.fromCodePoint(0x2197), age: String.fromCodePoint(0x1F464), gender: String.fromCodePoint(0x25CB) }[icon]; }
function providedNumber(value?: string) { const normalized = value?.trim(); if (!normalized) return null; const number = Number(normalized); return Number.isFinite(number) ? number : null; }
function highestProvidedPercentage<T extends { percentage?: string }>(items: T[] | undefined) { return (items || []).reduce<T | null>((highest, item) => { const percentage = providedNumber(item.percentage); return percentage !== null && (!highest || percentage > (providedNumber(highest.percentage) ?? -Infinity)) ? item : highest; }, null); }
function highestProvidedMetric(metrics: FacebookMetric[] | undefined) { return (metrics || []).reduce<FacebookMetric | null>((highest, metric) => { const value = providedNumber(metric.value); return value !== null && metric.name?.trim() && (!highest || value > (providedNumber(highest.value) ?? -Infinity)) ? metric : highest; }, null); }
function formatCount(value?: string) { return formatPlatformCount(value); }
function platformViews(account: SocialAccount) { return account.platform === 'Instagram' ? account.instagramInsights?.overview?.views : account.platform === 'Facebook' ? account.facebookInsights?.overview?.viewsTotal : ''; }

function EditLink({ href, children }: { href: string; children: ReactNode }) { return <Link href={href} className="text-[0.78rem] font-medium text-[#5f28dc] transition hover:text-[#4520a8]">{children} <span aria-hidden="true">→</span></Link>; }
function SectionHeading({ eyebrow, title, editHref, editLabel }: { eyebrow: string; title: string; editHref?: string; editLabel: string }) { return <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#6330dc]">{eyebrow}</p><h2 className="mt-2 text-[1.35rem] font-semibold tracking-[-0.045em] text-[#1b1920] sm:text-[1.5rem]">{title}</h2></div>{editHref && <EditLink href={editHref}>{editLabel}</EditLink>}</div>; }
function ProfileSection({ children }: { children: ReactNode }) { return <section className="border-t border-[#e6e4ea] py-8 sm:py-10">{children}</section>; }
function EditorialPrompt({ heading, description, href, action }: { heading: string; description: string; href: string; action: string }) { return <div className="border-l-2 border-[#d9cbf7] py-0.5 pl-5"><h3 className="text-base font-medium text-[#2d2932]">{heading}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-[#696572]">{description}</p><Link href={href} className="mt-3 inline-flex text-sm font-semibold text-[#6330dc] hover:text-[#4720b2]">{action} <span aria-hidden="true" className="ml-1">→</span></Link></div>; }
function PlatformMark({ platform }: { platform: string }) {
  const logo = platformLogos[platform];
  return <span aria-hidden="true" className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${logo ? 'border border-[#e8e4ee] bg-white p-2' : 'bg-[#766e87] text-sm font-semibold text-white'}`}>{logo ? <img src={logo} alt="" className="h-full w-full object-contain" /> : platform === 'Other' ? '+' : platform.slice(0, 1).toUpperCase()}</span>;
}
function AudienceBar({ label, value }: { label: string; value: string }) { return <div><div className="flex items-center justify-between gap-3 text-[0.78rem] text-[#4b4752]"><span className="truncate">{label}</span><span className="shrink-0">{value.trim()}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f0eff4]"><span className="block h-full rounded-full bg-[#c4a8f2]" style={{ width: `${percentWidth(value)}%` }} /></div></div>; }
function WorkPlaceholder({ platform, contentType }: { platform?: string; contentType?: string }) { return <div className="relative flex aspect-[4/3] items-end overflow-hidden bg-[#f4f0fa] p-4"><span className="absolute -right-6 -top-7 h-28 w-28 rounded-full border border-[#ddd1ef]" /><span className="absolute right-8 top-8 h-11 w-11 rounded-full bg-white/70" /><div className="relative"><p className="text-sm font-medium text-[#403b4a]">{platform}</p>{contentType && <p className="mt-1 text-xs text-[#777180]">{contentType}</p>}</div></div>; }

function FacebookPrimaryCard({ account }: { account: SocialAccount }) {
  const insights = account.facebookInsights;
  const topContent = highestPercentage(insights?.overview?.mediaTypes);
  const topCity = highestPercentage(insights?.audience?.locations?.cities);
  const topAge = highestMetric(insights?.audience?.ageGroups);
  const women = numericValue(insights?.audience?.women);
  const men = numericValue(insights?.audience?.men);
  const topGender = women === null && men === null ? null : women === null || (men !== null && men > women) ? { label: 'Men', percentage: insights?.audience?.men?.trim() || '' } : { label: 'Women', percentage: insights?.audience?.women?.trim() || '' };
  const metrics = [
    account.audienceCount?.trim() ? { label: 'Followers', value: formatCount(account.audienceCount), icon: 'followers' as const } : null,
    insights?.overview?.viewsTotal?.trim() ? { label: 'Views', value: formatCount(insights.overview.viewsTotal), icon: 'views' as const } : null,
    insights?.engagement?.total?.trim() ? { label: 'Interactions', value: formatCount(insights.engagement.total), icon: 'interactions' as const } : null,
    topContent?.mediaType?.trim() ? { label: 'Top Content Type', value: topContent.mediaType.trim(), detail: `${topContent.percentage?.trim()}%`, icon: 'content' as const } : null,
    topCity?.name?.trim() ? { label: 'Top City', value: topCity.name.trim(), detail: `${topCity.percentage?.trim()}%`, icon: 'city' as const } : null,
    insights?.audience?.netFollowers?.trim() ? { label: 'Follower Growth', value: formatCount(insights.audience.netFollowers), icon: 'growth' as const } : null,
    topAge?.name?.trim() ? { label: 'Top Age Range', value: topAge.name.trim(), detail: `${topAge.value?.trim()}%`, icon: 'age' as const } : null,
    topGender ? { label: 'Top Gender', value: topGender.label, detail: `${topGender.percentage}%`, icon: 'gender' as const } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; detail?: string; icon: MetricIcon }>;
  const profileUrl = safeExternalUrl(account.profileUrl);

  return <article className="rounded-xl border border-[#e8e4ee] bg-white p-5 shadow-[0_8px_24px_rgba(60,42,90,0.04)] sm:p-6"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><PlatformMark platform="Facebook" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-[#1f1c25]">Facebook</h3><span className="rounded-full bg-[#f1ebff] px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[#6430dc]">Primary</span></div>{account.username?.trim() && <p className="mt-0.5 truncate text-xs text-[#615c6a]">@{account.username.trim().replace(/^@+/, '')}</p>}</div></div>{profileUrl && <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-sm font-medium text-[#6330dc] hover:text-[#4720b2]">View Profile <span aria-hidden="true">&#8599;</span></a>}</div>{metrics.length ? <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3">{metrics.map((metric) => <div key={metric.label} className="min-w-0 rounded-lg border border-[#eeeaf3] bg-[#fdfcff] px-3 py-3"><div className="flex items-center gap-2"><span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#f1ebff] text-xs text-[#6531dc]">{metricIcon(metric.icon)}</span><p className="truncate text-[0.67rem] font-medium text-[#746e7b]">{metric.label}</p></div><p className="mt-2 truncate text-sm font-semibold tracking-[-0.025em] text-[#1f1c25] sm:text-base">{metric.value}</p>{metric.detail && <p className="mt-0.5 text-[0.7rem] text-[#706a77]">{metric.detail}</p>}</div>)}</div> : <p className="mt-5 text-sm leading-6 text-[#686270]">Facebook analytics have not been provided yet.</p>}</article>;
}

function InstagramPrimaryCard({ account }: { account: SocialAccount }) {
  const overview = account.instagramInsights?.overview;
  const audience = account.instagramInsights?.audience;
  const topContent = highestProvidedMetric([
    { name: 'Posts', value: overview?.postsViews },
    { name: 'Reels', value: overview?.reelsViews },
    { name: 'Stories', value: overview?.storiesViews },
    { name: 'Live Videos', value: overview?.liveVideosViews },
  ]);
  const topCity = highestProvidedPercentage(audience?.locations?.cities);
  const topAge = highestProvidedMetric(Object.entries(audience?.ages || {}).map(([name, value]) => ({ name, value })));
  const women = providedNumber(audience?.women);
  const men = providedNumber(audience?.men);
  const topGender = women === null && men === null ? null : women === null || (men !== null && men > women) ? { label: 'Men', percentage: audience?.men?.trim() || '' } : { label: 'Women', percentage: audience?.women?.trim() || '' };
  const metrics = [
    account.audienceCount?.trim() ? { label: 'Followers', value: formatCount(account.audienceCount), icon: 'followers' as const } : null,
    overview?.views?.trim() ? { label: 'Views', value: formatCount(overview.views), icon: 'views' as const } : null,
    (overview?.allInteractions?.trim() || overview?.interactions?.trim()) ? { label: 'Interactions', value: formatCount(overview.allInteractions?.trim() || overview.interactions?.trim()), icon: 'interactions' as const } : null,
    topContent?.name?.trim() ? { label: 'Top Content Type', value: topContent.name.trim(), detail: `${formatCount(topContent.value)} views`, icon: 'content' as const } : null,
    topCity?.name?.trim() ? { label: 'Top City', value: topCity.name.trim(), detail: `${topCity.percentage?.trim()}%`, icon: 'city' as const } : null,
    audience?.followerGrowth?.trim() ? { label: 'Follower Growth', value: formatCount(audience.followerGrowth), icon: 'growth' as const } : null,
    topAge?.name?.trim() ? { label: 'Top Age Range', value: topAge.name.trim(), detail: `${topAge.value?.trim()}%`, icon: 'age' as const } : null,
    topGender ? { label: 'Top Gender', value: topGender.label, detail: `${topGender.percentage}%`, icon: 'gender' as const } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; detail?: string; icon: MetricIcon }>;
  const profileUrl = safeExternalUrl(account.profileUrl);

  return <article className="rounded-xl border border-[#e8e4ee] bg-white p-5 shadow-[0_8px_24px_rgba(60,42,90,0.04)] sm:p-6"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><PlatformMark platform="Instagram" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-[#1f1c25]">Instagram</h3><span className="rounded-full bg-[#f1ebff] px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[#6430dc]">Primary</span></div>{account.username?.trim() && <p className="mt-0.5 truncate text-xs text-[#615c6a]">@{account.username.trim().replace(/^@+/, '')}</p>}</div></div>{profileUrl && <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-sm font-medium text-[#6330dc] hover:text-[#4720b2]">View Profile <span aria-hidden="true">&#8599;</span></a>}</div>{metrics.length ? <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3">{metrics.map((metric) => <div key={metric.label} className="min-w-0 rounded-lg border border-[#eeeaf3] bg-[#fdfcff] px-3 py-3"><div className="flex items-center gap-2"><span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#f1ebff] text-xs text-[#6531dc]">{metricIcon(metric.icon)}</span><p className="truncate text-[0.67rem] font-medium text-[#746e7b]">{metric.label}</p></div><p className="mt-2 truncate text-sm font-semibold tracking-[-0.025em] text-[#1f1c25] sm:text-base">{metric.value}</p>{metric.detail && <p className="mt-0.5 truncate text-[0.7rem] text-[#706a77]">{metric.detail}</p>}</div>)}</div> : <p className="mt-5 text-sm leading-6 text-[#686270]">Instagram analytics have not been provided yet.</p>}</article>;
}

function PrimaryBasicPlatformCard({ account }: { account: SocialAccount }) {
  const profileUrl = safeExternalUrl(account.profileUrl);
  const views = platformViews(account);
  const platformName = account.platform === 'Other' ? account.platformName?.trim() || account.platform : account.platform;
  const followerLabel = account.platform === 'YouTube' ? 'Subscribers' : 'Followers';

  return <article className="rounded-xl border border-[#e8e4ee] bg-white p-5 shadow-[0_8px_24px_rgba(60,42,90,0.04)] sm:p-6"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><PlatformMark platform={account.platform} /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-[#1f1c25]">{platformName}</h3><span className="rounded-full bg-[#f1ebff] px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[#6430dc]">Primary</span></div>{account.username?.trim() && <p className="mt-0.5 truncate text-xs text-[#615c6a]">@{account.username.trim().replace(/^@+/, '')}</p>}</div></div>{profileUrl && <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-sm font-medium text-[#6330dc] hover:text-[#4720b2]">View Profile <span aria-hidden="true">&#8599;</span></a>}</div><div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3">{account.audienceCount?.trim() ? <div className="rounded-lg border border-[#eeeaf3] bg-[#fdfcff] px-3 py-3"><p className="text-[0.67rem] font-medium text-[#746e7b]">{followerLabel}</p><p className="mt-2 truncate text-sm font-semibold tracking-[-0.025em] text-[#1f1c25] sm:text-base">{formatCount(account.audienceCount)}</p></div> : null}{views?.trim() ? <div className="rounded-lg border border-[#eeeaf3] bg-[#fdfcff] px-3 py-3"><p className="text-[0.67rem] font-medium text-[#746e7b]">Views</p><p className="mt-2 truncate text-sm font-semibold tracking-[-0.025em] text-[#1f1c25] sm:text-base">{formatCount(views)}</p></div> : null}</div></article>;
}

function SecondaryPlatformCard({ account }: { account: SocialAccount }) {
  const profileUrl = safeExternalUrl(account.profileUrl);
  const views = platformViews(account);
  const platformName = account.platform === 'Other' ? account.platformName?.trim() || account.platform : account.platform;
  const followerLabel = account.platform === 'YouTube' ? 'Subscribers' : 'Followers';

  return <article className="flex h-full min-h-[182px] flex-col rounded-xl border border-[#e8e4ee] bg-white p-5"><div className="flex min-w-0 items-center gap-3"><PlatformMark platform={account.platform} /><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-[#1f1c25]">{platformName}</h3>{account.username?.trim() && <p className="mt-0.5 truncate text-xs text-[#615c6a]">@{account.username.trim().replace(/^@+/, '')}</p>}</div></div><div className="mt-5 grid grid-cols-2 gap-3">{account.audienceCount?.trim() ? <div><p className="text-[0.67rem] font-medium text-[#746e7b]">{followerLabel}</p><p className="mt-1 truncate text-sm font-semibold text-[#1f1c25]">{formatCount(account.audienceCount)}</p></div> : null}{views?.trim() ? <div><p className="text-[0.67rem] font-medium text-[#746e7b]">Views</p><p className="mt-1 truncate text-sm font-semibold text-[#1f1c25]">{formatCount(views)}</p></div> : null}</div>{profileUrl && <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="mt-auto pt-5 text-sm font-medium text-[#6330dc] hover:text-[#4720b2]">View profile <span aria-hidden="true">&#8599;</span></a>}</article>;
}

function FacebookAudienceSources({ insights }: { insights?: FacebookInsights }) {
  const traffic = (insights?.traffic || []).filter((item) => item.name?.trim() && item.value?.trim());
  const source = (insights?.source || []).filter((item) => item.name?.trim() && item.value?.trim());
  if (!traffic.length && !source.length) return null;

  return <div><p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#686270]">Where your views came from</p>{traffic.length ? <div className="mt-4"><p className="text-xs font-medium text-[#5d5764]">Traffic</p><div className="mt-3 space-y-3.5">{traffic.map((item) => <AudienceBar key={item.id || item.name} label={item.name || ''} value={item.value || ''} />)}</div></div> : null}{source.length ? <div className={traffic.length ? 'mt-5' : 'mt-4'}><p className="text-xs font-medium text-[#5d5764]">Source</p><div className="mt-3 space-y-3.5">{source.map((item) => <AudienceBar key={item.id || item.name} label={item.name || ''} value={item.value || ''} />)}</div></div> : null}</div>;
}

function AudienceSection({ socialAccounts }: { socialAccounts: SocialAccount[] }) {
  const account = socialAccounts.find((socialAccount) => socialAccount.isPrimary);

  if (!account) {
    return <ProfileSection><SectionHeading eyebrow="Audience" title="Who watches your content?" editLabel="" /><div className="mt-7"><EditorialPrompt heading="Add a primary social platform first" description="Audience information is shown from your primary social platform." href="/profile/social" action="Add Social Platforms" /></div></ProfileSection>;
  }

  const platformName = account.platform === 'Other' ? account.platformName?.trim() || account.platform : account.platform;
  const instagramAudience = account.platform === 'Instagram' ? account.instagramInsights?.audience : undefined;
  const facebookInsights = account.platform === 'Facebook' ? account.facebookInsights : undefined;
  const facebookAudience = facebookInsights?.audience;
  const followers = instagramAudience?.followers?.trim() || '';
  const audienceMetric = account.platform === 'Facebook' ? facebookAudience?.netFollowers?.trim() || '' : instagramAudience?.followerGrowth?.trim() || '';
  const audienceMetricLabel = account.platform === 'Facebook' ? 'Net Followers' : 'Follower Growth';
  const genders: Array<[string, string]> = instagramAudience
    ? ([['Women', instagramAudience.women || ''], ['Men', instagramAudience.men || '']] as Array<[string, string]>).filter(([, value]) => value.trim())
    : facebookAudience ? ([['Women', facebookAudience.women || ''], ['Men', facebookAudience.men || '']] as Array<[string, string]>).filter(([, value]) => value.trim()) : [];
  const ages: Array<[string, string]> = instagramAudience
    ? Object.entries(instagramAudience.ages || {}).filter(([, value]) => value?.trim())
    : (facebookAudience?.ageGroups || []).filter((item) => item.name?.trim() && item.value?.trim()).map((item) => [item.name || '', item.value || '']);
  const countries = (instagramAudience?.locations?.countries || facebookAudience?.locations?.countries || []).filter((location) => location.name?.trim());
  const cities = (instagramAudience?.locations?.cities || facebookAudience?.locations?.cities || []).filter((location) => location.name?.trim());
  const hasFacebookSources = Boolean((facebookInsights?.traffic || []).some((item) => item.name?.trim() && item.value?.trim()) || (facebookInsights?.source || []).some((item) => item.name?.trim() && item.value?.trim()));
  const hasAudience = Boolean(followers || audienceMetric || genders.length || ages.length || countries.length || cities.length || hasFacebookSources);

  return <ProfileSection>
    <SectionHeading eyebrow="Audience" title="Who watches your content?" editLabel="" />
    <article className="mt-7 rounded-xl border border-[#e8e4ee] bg-[#fcfbff] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-center gap-3"><PlatformMark platform={account.platform} /><div><p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#6330dc]">Audience</p><h3 className="mt-1 text-base font-semibold text-[#201d26]">{platformName} Audience</h3></div></div><EditLink href="/profile/social">Edit {platformName}</EditLink></div>{hasAudience ? <div className="mt-6"><div className="flex flex-wrap gap-6 border-b border-[#ebe7ef] pb-5">{followers && <div><p className="text-xs text-[#66606e]">Followers</p><p className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[#1d1a22]">{formatCount(followers)}</p></div>}{audienceMetric && <div><p className="text-xs text-[#66606e]">{audienceMetricLabel}</p><p className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[#1d1a22]">{formatCount(audienceMetric)}</p></div>}</div><div className="mt-6 grid gap-7 lg:grid-cols-3">{genders.length ? <div><p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#686270]">Gender</p><div className="mt-4 space-y-3.5">{genders.map(([label, value]) => <AudienceBar key={label} label={label} value={value} />)}</div></div> : null}{ages.length ? <div><p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#686270]">Age Range</p><div className="mt-4 space-y-3.5">{ages.map(([label, value]) => <AudienceBar key={label} label={label} value={value} />)}</div></div> : null}{(countries.length || cities.length) ? <div><p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#686270]">Top Locations</p>{countries.length ? <div className="mt-4"><p className="text-xs font-medium text-[#5d5764]">Countries</p><div className="mt-3 space-y-3.5">{countries.map((location) => location.percentage?.trim() ? <AudienceBar key={location.id || location.name} label={location.name || ''} value={location.percentage} /> : <p key={location.id || location.name} className="text-sm text-[#4b4752]">{location.name}</p>)}</div></div> : null}{cities.length ? <div className={countries.length ? 'mt-5' : 'mt-4'}><p className="text-xs font-medium text-[#5d5764]">Cities / Towns</p><div className="mt-3 space-y-3.5">{cities.map((location) => location.percentage?.trim() ? <AudienceBar key={location.id || location.name} label={location.name || ''} value={location.percentage} /> : <p key={location.id || location.name} className="text-sm text-[#4b4752]">{location.name}</p>)}</div></div> : null}</div> : null}{account.platform === 'Facebook' ? <FacebookAudienceSources insights={facebookInsights} /> : null}</div></div> : <p className="mt-6 text-sm leading-6 text-[#686270]">Audience information has not been provided yet.</p>}</article>
  </ProfileSection>;
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
    const { data: creatorData, error: creatorError } = await supabase.from('creators').select('id, full_name').eq('auth_user_id', userData.user.id).maybeSingle();
    if (creatorError || !creatorData) { setLoadError(true); setLoading(false); return; }
    try {
      const [identityResult, contentResult, portfolioResult, savedSocial] = await Promise.all([
        supabase.from('creator_identity').select('profile_photo_url, display_name, username, bio, languages, creator_type, creator_type_other').eq('creator_id', creatorData.id).maybeSingle(),
        supabase.from('creator_content_profile').select('primary_niche, primary_niche_other, other_niches, other_niches_other, content_formats, content_formats_other, content_styles, content_styles_other').eq('creator_id', creatorData.id).maybeSingle(),
        supabase.from('creator_portfolio_items').select('id, content_url, platform, content_type, title, description, thumbnail_url').eq('creator_id', creatorData.id).order('sort_order', { ascending: true }),
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
  const creatorType = identity?.creator_type === 'other' ? identity.creator_type_other?.trim() : identity?.creator_type ? creatorTypeLabels[identity.creator_type] : '';
  const primarySocialAccount = socialAccounts.find((account) => account.isPrimary);
  const secondarySocialAccounts = primarySocialAccount ? socialAccounts.filter((account) => account.id !== primarySocialAccount.id) : socialAccounts;
  const workGrid = portfolio.length >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : portfolio.length === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2';

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#fbfaff] text-sm text-[#5b6272]">Loading your profile preview...</main>;
  if (loadError || !creator) return <main className="grid min-h-screen place-items-center bg-[#fbfaff] px-6 text-center"><div className="max-w-md"><h1 className="text-2xl font-semibold tracking-[-0.05em] text-black">We couldn&apos;t load your profile preview</h1><p className="mt-3 text-sm leading-6 text-[#626a7a]">Please try again. Your profile information has not been changed.</p><button type="button" onClick={() => void loadPreview()} className="mt-6 text-sm font-semibold text-[#6330dc]">Try again</button></div></main>;

  return <main className="min-h-screen bg-[#fbfaff] px-3 py-3 text-[#19171d] sm:px-5 sm:py-5"><div className="mx-auto max-w-[1180px] overflow-hidden rounded-xl border border-[#ebe7f0] bg-white shadow-[0_12px_34px_rgba(60,42,90,0.04)]"><div className="px-7 pt-5 sm:px-9"><nav className="flex items-center justify-between gap-4" aria-label="Profile preview navigation"><Link href="/profile" className="inline-flex min-h-10 items-center text-sm font-medium text-[#4e4a55] hover:text-[#6330dc]"><span aria-hidden="true" className="mr-2">←</span>My Profile</Link><Link href="/profile" className="inline-flex min-h-10 items-center text-sm font-medium text-[#6330dc] hover:text-[#4720b2]">Edit Profile <span aria-hidden="true" className="ml-1">→</span></Link></nav></div><header className="relative isolate overflow-hidden px-7 py-9 sm:px-9 sm:py-10"><div aria-hidden="true" className="absolute right-[-3rem] top-[-4rem] -z-10 h-72 w-72 rounded-full bg-[#f7f3ff]" /><div aria-hidden="true" className="absolute right-[15%] top-12 -z-10 h-44 w-44 rounded-full bg-[#fbf9ff]" /><div className="flex flex-col gap-7 sm:flex-row sm:items-center sm:gap-8"><div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-full border-[3px] border-[#dfd0fa] bg-[#f4effb] text-2xl font-semibold text-[#6c43b7] shadow-[0_5px_15px_rgba(73,47,120,0.08)] sm:h-32 sm:w-32 sm:text-3xl">{photoUrl ? <img src={photoUrl} alt={displayName ? `Portrait of ${displayName}` : ''} className="h-full w-full object-cover" /> : initials}</div><div className="min-w-0 max-w-3xl flex-1"><div className="flex flex-wrap items-start justify-between gap-5"><div><h1 className="text-[2.35rem] font-semibold tracking-[-0.065em] text-[#15131a] sm:text-[2.65rem]">{displayName}</h1>{identity?.username?.trim() && <p className="mt-1.5 text-base font-medium text-[#24212a]">@{identity.username.trim().replace(/^@+/, '')}</p>}</div><EditLink href="/profile/identity">Edit Identity</EditLink></div>{(creatorType || identity?.languages?.filter(Boolean).length) && <p className="mt-4 text-sm text-[#5c5765]">{[creatorType, identity?.languages?.filter(Boolean).join(' · ')].filter(Boolean).join('  ·  ')}</p>}{identity?.bio?.trim() && <p className="mt-5 max-w-2xl text-[0.95rem] leading-7 text-[#46414e]">{identity.bio.trim()}</p>}</div></div></header><div className="px-7 sm:px-9"><ProfileSection><SectionHeading eyebrow="Content & Niche" title="What I create" editHref={hasContent ? '/profile/content' : undefined} editLabel="Edit Content" />{hasContent ? <div className="mt-7"><div className="grid gap-7 sm:grid-cols-3"><div><p className="text-xs text-[#66606e]">Primary niche</p><p className="mt-2 text-xl font-semibold tracking-[-0.04em]">{primaryNiche}</p></div><div><p className="text-xs text-[#66606e]">Content formats</p><p className="mt-2 text-sm leading-6 text-[#292632]">{formats.join(' · ')}</p></div><div><p className="text-xs text-[#66606e]">Content style</p><p className="mt-2 text-sm leading-6 text-[#292632]">{styles.join(' · ')}</p></div></div>{otherNiches.length ? <div className="mt-5 flex flex-wrap gap-2">{otherNiches.map((niche) => <span key={niche} className="rounded-full bg-[#f3effc] px-3 py-1 text-xs text-[#5d5480]">{niche}</span>)}</div> : null}</div> : <div className="mt-7"><EditorialPrompt heading="Tell brands what you create" description="Add your niche, content formats and creative style to show brands what you specialise in." href="/profile/content" action="Add Content & Niche" /></div>}</ProfileSection><ProfileSection><SectionHeading eyebrow="Social Presence" title="Where I create" editHref={socialAccounts.length ? '/profile/social' : undefined} editLabel="Edit Social Platforms" />{socialAccounts.length ? primarySocialAccount ? <div className="mt-7 grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(260px,0.85fr)]"><div className="min-w-0">{primarySocialAccount.platform === 'Instagram' ? <InstagramPrimaryCard account={primarySocialAccount} /> : primarySocialAccount.platform === 'Facebook' ? <FacebookPrimaryCard account={primarySocialAccount} /> : <PrimaryBasicPlatformCard account={primarySocialAccount} />}</div>{secondarySocialAccounts.length ? <div className={`grid auto-rows-fr gap-4 ${secondarySocialAccounts.length === 2 ? 'sm:grid-cols-2 lg:grid-cols-1' : ''}`}>{secondarySocialAccounts.map((account) => <SecondaryPlatformCard key={account.id} account={account} />)}</div> : null}</div> : <div className="mt-7 grid auto-rows-fr gap-4 sm:grid-cols-2">{socialAccounts.map((account) => <SecondaryPlatformCard key={account.id} account={account} />)}</div> : <div className="mt-7"><EditorialPrompt heading="Show brands where you create" description="Add your social platforms so brands can see where you publish content." href="/profile/social" action="Add Social Platforms" /></div>}</ProfileSection><AudienceSection socialAccounts={socialAccounts} /><ProfileSection><SectionHeading eyebrow="Selected Work" title="What I create" editHref={portfolio.length ? '/profile/portfolio' : undefined} editLabel="Edit Portfolio" />{portfolio.length ? <div className={`mt-7 grid gap-5 ${workGrid}`}>{portfolio.map((item) => { const contentUrl = safeExternalUrl(item.contentUrl); return <article key={item.id} className="min-w-0 overflow-hidden rounded-xl border border-[#e8e4ee] bg-white">{item.thumbnail ? <div className="relative aspect-[4/3] overflow-hidden bg-[#f1edf7]"><img src={item.thumbnail} alt="" className="h-full w-full object-cover" />{isVideo(item.contentType) && <span aria-hidden="true" className="absolute inset-0 grid place-items-center"><span className="grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[#6731dc] shadow-sm">▶</span></span>}</div> : <WorkPlaceholder platform={item.platform} contentType={item.contentType} />}<div className="p-4"><div className="flex flex-wrap gap-x-2 gap-y-1 text-[0.68rem] font-medium text-[#625b6a]">{item.platform && <span>{item.platform}</span>}{item.contentType && <span>· {item.contentType}</span>}</div>{item.title?.trim() && <h3 className="mt-3 text-base font-semibold tracking-[-0.025em] text-[#24212a]">{item.title.trim()}</h3>}{item.description?.trim() && <p className="mt-2 line-clamp-3 text-sm leading-5 text-[#625d68]">{item.description.trim()}</p>}{contentUrl && <a href={contentUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex text-sm font-medium text-[#6330dc] hover:text-[#4720b2]">View original <span aria-hidden="true" className="ml-1">↗</span></a>}</div></article>; })}</div> : <div className="mt-7"><EditorialPrompt heading="Show your best work" description="Add portfolio pieces so brands can see your creative style." href="/profile/portfolio" action="Add Portfolio Work" /></div>}</ProfileSection></div></div></main>;
}

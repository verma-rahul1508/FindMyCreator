'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { loadCreatorProfileProgress, type CreatorProfileProgress } from '@/lib/profile-progress';

type Platform = 'Instagram' | 'YouTube' | 'Facebook' | 'TikTok' | 'Snapchat' | 'LinkedIn' | 'Pinterest' | 'X' | 'Other';
type SocialAccount = { id: string; platform: Platform; platformName?: string };
type PortfolioItem = {
  id: string; contentUrl: string; platform: Platform; contentType: string; contentTypeOther: string; category: string;
  categoryOther: string; title: string; description: string; thumbnail: string | null; views: string; likes: string; comments: string;
  contentId?: string | null; canonicalUrl?: string | null; embedUrl?: string | null; authorName?: string | null; authorUrl?: string | null; metricsSource?: 'creator' | 'platform' | null;
};
type FormState = Omit<PortfolioItem, 'id'>;
type Errors = Record<string, string>;
type PreviewStage = 'entry' | 'fetching' | 'found' | 'unavailable' | 'unsupported' | 'temporary' | 'form';
type FetchedPreview = { platform: 'Instagram' | 'Facebook' | 'YouTube'; contentId: string | null; canonicalUrl: string; contentType: string | null; title: string | null; description: string | null; thumbnailUrl: string | null; embedUrl: string | null; authorName: string | null; authorUrl: string | null; metrics: { views: string | null; likes: string | null; comments: string | null }; metricsSource: 'platform' | null; fetchedAt: string };
type PortfolioDatabaseRow = {
  id: string; sort_order: number; content_url: string; canonical_url: string | null; platform: string; content_type: string;
  content_type_other: string | null; category: string | null; category_other: string | null; title: string | null;
  description: string | null; thumbnail_url: string | null; content_id: string | null; embed_url: string | null;
  author_name: string | null; author_url: string | null; views: string | number | null; likes: string | number | null;
  comments: string | number | null; metrics_source: string | null;
};
type PortfolioItemPayload = {
  creator_id: string; sort_order: number; content_url: string; canonical_url: string | null; platform: string;
  content_type: string; content_type_other: string | null; category: string | null; category_other: string | null;
  title: string | null; description: string | null; thumbnail_url: string | null; content_id: string | null;
  embed_url: string | null; author_name: string | null; author_url: string | null; views: string | null;
  likes: string | null; comments: string | null; metrics_source: 'creator' | 'platform' | null;
};
type PortfolioItemUpdatePayload = Omit<PortfolioItemPayload, 'creator_id'>;

const portfolioStorageKey = 'cloutco-portfolio-draft';
const socialStorageKey = 'cloutco-social-platforms-draft';
const platformOrder: Platform[] = ['Instagram', 'YouTube', 'Facebook', 'TikTok', 'Snapchat', 'LinkedIn', 'Pinterest', 'X'];
const contentTypes = ['Reel / Short Video', 'Long-form Video', 'Story', 'Photo', 'Carousel', 'Tutorial / How-to', 'Review', 'Vlog', 'UGC', 'Livestream', 'Podcast', 'Written Content', 'Other'];
const categories = ['Beauty', 'Fashion', 'Food & Beverage', 'Travel', 'Lifestyle', 'Fitness', 'Health & Wellness', 'Technology', 'Gaming', 'Finance', 'Business', 'Education', 'Parenting & Family', 'Entertainment', 'Comedy', 'Music', 'Art & Design', 'Photography', 'Automotive', 'Sports', 'Home & Interiors', 'Pets', 'Culture', 'DIY & Crafts', 'Other'];
const emptyForm: FormState = { contentUrl: '', platform: 'Other', contentType: '', contentTypeOther: '', category: '', categoryOther: '', title: '', description: '', thumbnail: null, views: '', likes: '', comments: '', contentId: null, canonicalUrl: null, embedUrl: null, authorName: null, authorUrl: null, metricsSource: null };
const contentIdentity = (item: Pick<PortfolioItem, 'platform' | 'contentUrl' | 'canonicalUrl' | 'contentId'>) => item.contentId ? `${item.platform}:${item.contentId}` : (item.canonicalUrl || item.contentUrl).trim().toLowerCase().replace(/\/$/, '');
const isValidUrl = (value: string) => { try { const url = new URL(value.trim()); return url.protocol === 'https:' || url.protocol === 'http:'; } catch { return false; } };
const nullableText = (value: string | null | undefined) => value?.trim() || null;
const nullableMetric = (value: string | null | undefined) => value?.trim() || null;
const validPlatforms: Platform[] = [...platformOrder, 'Other'];

function mapPortfolioRow(row: PortfolioDatabaseRow): PortfolioItem {
  return {
    id: row.id,
    contentUrl: row.content_url,
    platform: row.platform as Platform,
    contentType: row.content_type,
    contentTypeOther: row.content_type_other || '',
    category: row.category || '',
    categoryOther: row.category_other || '',
    title: row.title || '',
    description: row.description || '',
    thumbnail: row.thumbnail_url,
    views: row.views === null ? '' : String(row.views),
    likes: row.likes === null ? '' : String(row.likes),
    comments: row.comments === null ? '' : String(row.comments),
    contentId: row.content_id,
    canonicalUrl: row.canonical_url,
    embedUrl: row.embed_url,
    authorName: row.author_name,
    authorUrl: row.author_url,
    metricsSource: row.metrics_source === 'creator' || row.metrics_source === 'platform' ? row.metrics_source : null,
  };
}

function toPortfolioPayload(item: FormState | PortfolioItem, creatorId: string, sortOrder: number): PortfolioItemPayload {
  return {
    creator_id: creatorId,
    sort_order: sortOrder,
    content_url: item.contentUrl.trim(),
    canonical_url: nullableText(item.canonicalUrl),
    platform: item.platform.trim(),
    content_type: item.contentType.trim(),
    content_type_other: nullableText(item.contentTypeOther),
    category: nullableText(item.category),
    category_other: nullableText(item.categoryOther),
    title: nullableText(item.title),
    description: nullableText(item.description),
    thumbnail_url: nullableText(item.thumbnail),
    content_id: nullableText(item.contentId),
    embed_url: nullableText(item.embedUrl),
    author_name: nullableText(item.authorName),
    author_url: nullableText(item.authorUrl),
    views: nullableMetric(item.views),
    likes: nullableMetric(item.likes),
    comments: nullableMetric(item.comments),
    metrics_source: item.metricsSource === 'creator' || item.metricsSource === 'platform' ? item.metricsSource : null,
  };
}

function toPortfolioUpdatePayload(item: FormState | PortfolioItem, creatorId: string, sortOrder: number): PortfolioItemUpdatePayload {
  const { creator_id: _creatorId, ...payload } = toPortfolioPayload(item, creatorId, sortOrder);
  return payload;
}

function normalizeDraftItem(value: unknown, fallbackId: string): PortfolioItem | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const text = (key: string) => typeof item[key] === 'string' ? item[key].trim() : '';
  const platform = text('platform') as Platform;
  const contentUrl = text('contentUrl');
  const contentType = text('contentType');
  const contentTypeOther = text('contentTypeOther');
  const category = text('category');
  const categoryOther = text('categoryOther');
  const metrics = ['views', 'likes', 'comments'].map((key) => text(key));
  const metricsAreValid = metrics.every((metric) => !metric || /^\d+$/.test(metric));
  if (!isValidUrl(contentUrl) || !validPlatforms.includes(platform) || !contentType || (contentType === 'Other' && !contentTypeOther) || (category === 'Other' && !categoryOther) || text('title').length > 80 || text('description').length > 200 || !metricsAreValid) return null;
  const optional = (key: string) => text(key) || null;
  const source = text('metricsSource');
  if (source && source !== 'creator' && source !== 'platform') return null;
  return {
    id: text('id') || fallbackId,
    contentUrl,
    platform,
    contentType,
    contentTypeOther,
    category,
    categoryOther,
    title: text('title'),
    description: text('description'),
    thumbnail: optional('thumbnail'),
    views: metrics[0],
    likes: metrics[1],
    comments: metrics[2],
    contentId: optional('contentId'),
    canonicalUrl: optional('canonicalUrl'),
    embedUrl: optional('embedUrl'),
    authorName: optional('authorName'),
    authorUrl: optional('authorUrl'),
    metricsSource: source === 'creator' || source === 'platform' ? source : null,
  };
}

async function fetchPortfolioItems(creatorId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return { items: [] as PortfolioItem[], error: 'Portfolio service is unavailable.' };
  const { data, error } = await supabase
    .from('creator_portfolio_items')
    .select('*')
    .eq('creator_id', creatorId)
    .order('sort_order', { ascending: true });
  if (error) return { items: [] as PortfolioItem[], error: error.message };
  return { items: ((data || []) as PortfolioDatabaseRow[]).map(mapPortfolioRow), error: null };
}

type IconName = 'home' | 'user' | 'message' | 'settings' | 'bell' | 'check' | 'plus' | 'arrow' | 'lightbulb' | 'close' | 'edit' | 'trash' | 'link' | 'image' | 'play' | 'chart' | 'spark' | 'more';
function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3.5 10 8.5-7 8.5 7" /><path d="M5.5 9v10h13V9M9.5 19v-5h5v5" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 20c.5-3.4 2.8-5 7-5s6.5 1.6 7 5" /></>,
    message: <><path d="M5 6.5h14v9H9l-4 3v-12Z" /><path d="M8 10h8M8 13h5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19 13.2a7.6 7.6 0 0 0 0-2.4l2-1.5-2-3.4-2.4 1a8 8 0 0 0-2-1.2L14.3 3h-4.6l-.4 2.7a8 8 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 2.4l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 2 1.2l.4 2.7h4.6l.4-2.7a8 8 0 0 0 2 1.2l2.4 1 2-3.4-2-1.5Z" /></>,
    bell: <><path d="M6.5 16.5h11l-1.2-1.8V10a4.3 4.3 0 0 0-8.6 0v4.7l-1.2 1.8Z" /><path d="M10 19h4" /></>,
    check: <><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>,
    lightbulb: <><path d="M9 18h6M10 21h4" /><path d="M8.2 15.6C6.8 14.4 6 12.7 6 11a6 6 0 1 1 12 0c0 1.7-.8 3.4-2.2 4.6-.6.5-.8 1.1-.8 1.8H9c0-.7-.2-1.3-.8-1.8Z" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    edit: <><path d="m4 16.5-.7 4.2 4.2-.7L19 8.5 15.5 5 4 16.5Z" /><path d="m13.8 6.7 3.5 3.5" /></>,
    trash: <><path d="M5 7h14M9 7V4h6v3m-8 0 1 13h8l1-13" /><path d="M10 11v5M14 11v5" /></>,
    link: <><path d="M10.2 13.8a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 0 0-5.7-5.7l-1.3 1.3" /><path d="M13.8 10.2a4 4 0 0 0-5.7 0l-2.3 2.3a4 4 0 0 0 5.7 5.7l1.3-1.3" /></>,
    image: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="9.5" r="1.5" /><path d="m5 17 4.5-4 3 2.6 2.5-2.2 4 3.6" /></>,
    play: <><circle cx="12" cy="12" r="8.5" /><path d="m10 8.7 5 3.3-5 3.3V8.7Z" /></>,
    chart: <><path d="M4 19V5M4 19h16" /><path d="m7 15 3.6-4 3 2.2L20 6" /></>,
    spark: <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" />,
    more: <><circle cx="5" cy="12" r="1" className="fill-current stroke-none" /><circle cx="12" cy="12" r="1" className="fill-current stroke-none" /><circle cx="19" cy="12" r="1" className="fill-current stroke-none" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={`${className} fill-none stroke-current stroke-[1.65]`}>{paths[name]}</svg>;
}

function BrandGlyph({ platform }: { platform: Platform }) {
  const frame = 'grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white';
  if (platform === 'Instagram') return <span className={`${frame} bg-[#c6328b]`}><svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="3.6" /><circle cx="17.4" cy="6.8" r=".8" className="fill-current stroke-none" /></svg></span>;
  if (platform === 'YouTube') return <span className={`${frame} bg-[#ef2323]`}><svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M21 8.2a2.7 2.7 0 0 0-1.9-1.9C17.4 5.8 12 5.8 12 5.8s-5.4 0-7.1.5A2.7 2.7 0 0 0 3 8.2 28 28 0 0 0 2.5 12c0 1.3.2 2.6.5 3.8a2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.1.5 7.1.5s5.4 0 7.1-.5a2.7 2.7 0 0 0 1.9-1.9c.3-1.2.5-2.5.5-3.8s-.2-2.6-.5-3.8Z" /><path d="m10 15.2 5-3.2-5-3.2v6.4Z" className="fill-white" /></svg></span>;
  if (platform === 'Facebook') return <span className={`${frame} bg-[#1877f2]`}><svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M13.7 21v-8h2.7l.4-3.1h-3.1V8c0-.9.3-1.5 1.6-1.5H17V3.7c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 4v2.2H8.3V13H11v8h2.7Z" /></svg></span>;
  if (platform === 'TikTok') return <span className={`${frame} bg-[#111111]`}><svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M14.4 3c.3 2.3 1.6 3.7 4 3.9v3.1a7.2 7.2 0 0 1-4-1.2v6.5a5.5 5.5 0 1 1-4.8-5.5v3.2a2.4 2.4 0 1 0 1.7 2.3V3h3.1Z" /></svg></span>;
  if (platform === 'Snapchat') return <span className={`${frame} bg-[#f0c600] text-[#171717]`}><svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M12 3.5a4.1 4.1 0 0 0-4.1 4.1v4c-.4.3-1.1.6-1.8.6-.2.6.4 1.4 1.8 1.7.2 1.6 1.4 2.5 2.8 2.5.5.5.9.8 1.3.8s.8-.3 1.3-.8c1.4 0 2.6-.9 2.8-2.5 1.4-.3 2-1.1 1.8-1.7-.7 0-1.4-.3-1.8-.6v-4A4.1 4.1 0 0 0 12 3.5Z" /></svg></span>;
  if (platform === 'LinkedIn') return <span className={`${frame} bg-[#0a66c2]`}><svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M6.3 8.1A1.8 1.8 0 1 0 6.3 4.5a1.8 1.8 0 0 0 0 3.6ZM4.8 9.5h3v9.7h-3V9.5Zm4.9 0h2.9v1.3h.1c.4-.8 1.4-1.7 3-1.7 3.2 0 3.8 2.1 3.8 4.8v5.4h-3v-4.8c0-1.1 0-2.6-1.6-2.6s-1.8 1.2-1.8 2.5v4.9h-3V9.5Z" /></svg></span>;
  if (platform === 'Pinterest') return <span className={`${frame} bg-[#c8232c]`}><svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M12 3.3a8.7 8.7 0 0 0-3.2 16.8c-.1-1.4 0-3 .3-4.3l1.1-4.7s-.3-.7-.3-1.8c0-1.7 1-3 2.2-3 1.1 0 1.6.8 1.6 1.8 0 1.1-.7 2.7-1 4.2-.3 1.2.6 2.2 1.8 2.2 2.2 0 3.7-2.8 3.7-6.1 0-2.5-1.7-4.9-5.4-4.9-3.9 0-6.4 2.9-6.4 6.2 0 1.1.3 1.9.8 2.5.2.2.2.3.1.6l-.3 1.1c-.1.4-.4.5-.7.3-2-1-2.9-3.6-2.9-6 0-4.3 3.3-9.4 10.1-9.4 5.4 0 8.9 3.9 8.9 8.1 0 5.5-3.1 9.6-7.7 9.6-1.5 0-2.9-.8-3.4-1.7l-.9 3.4c-.3 1.2-.9 2.4-1.5 3.3.9.3 1.8.4 2.8.4a8.7 8.7 0 1 0 0-17.4Z" /></svg></span>;
  if (platform === 'X') return <span className={`${frame} bg-[#111111]`}><svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M4.2 4.5h4.3l3.7 4.8 4.1-4.8h1.5l-4.9 5.7 6.8 8.8h-4.3l-4.1-5.3-4.5 5.3H5.3l5.3-6.2-6.4-8.3Zm3.1 1.3 8.8 11.4h1.3L8.6 5.8H7.3Z" /></svg></span>;
  return <span className={`${frame} bg-[#766e87] text-lg font-semibold`}>+</span>;
}

function ProgressCard() {
  const steps = [['Basic Information', 'Personal details', 'done'], ['Creator Identity', 'Your creator persona', 'done'], ['Content & Niche', 'What you create', 'done'], ['Social Platforms', 'Where you create', 'done'], ['Portfolio', 'Showcase your work', 'current']];
  return <aside className="order-2 rounded-2xl border border-[#e8e7eb] bg-white p-5 shadow-[0_7px_20px_rgba(50,40,80,0.03)] xl:order-1 xl:sticky xl:top-5"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Complete your profile</h2><span className="text-xs text-[#596177]">4 of 5</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#ececf1]"><span className="block h-full w-[80%] rounded-full bg-[#7034e8]" /></div><ol className="mt-5 space-y-1.5">{steps.map(([title, subtitle, state], index) => <li key={title} className={`flex items-center gap-3 rounded-xl px-2 py-2 ${state === 'current' ? 'bg-[#f3efff]' : ''}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${state === 'done' ? 'bg-[#57b8ae] text-white' : state === 'current' ? 'bg-[#6731dc] text-white shadow-[0_5px_12px_rgba(103,49,220,0.22)]' : 'border border-[#ccd1dd] bg-white text-[#495162]'}`}>{state === 'done' ? 'âœ“' : index + 1}</span><span><strong className="block text-xs font-medium">{title}</strong><small className="block text-[0.66rem] text-[#677082]">{subtitle}</small></span></li>)}</ol></aside>;
}

function FieldError({ children }: { children?: string }) { return children ? <p role="alert" className="mt-1.5 text-xs font-medium text-[#b22836]">{children}</p> : null; }
function StepHeading({ value, title, children }: { value: string; title: string; children: ReactNode }) { return <div className="flex gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f0eaff] text-sm font-semibold text-[#6430dc] shadow-[0_5px_14px_rgba(99,48,220,0.08)]">{value}</span><div><h2 className="text-base font-semibold">{title}</h2><p className="mt-1 text-sm leading-5 text-[#677082]">{children}</p></div></div>; }

function Preview({ item, large = false }: { item: Pick<PortfolioItem, 'platform' | 'contentType' | 'thumbnail'>; large?: boolean }) {
  const treatment = item.contentType.includes('Video') || item.contentType === 'Reel / Short Video' || item.contentType === 'Vlog' || item.contentType === 'Livestream' || item.contentType === 'Podcast' ? 'play' : 'image';
  return <div className={`relative grid place-items-center overflow-hidden bg-[#f1edfb] ${large ? 'h-44 sm:h-52' : 'h-44'}`}>{item.thumbnail ? <img src={item.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <><div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.85),transparent_38%),linear-gradient(135deg,#f7f4ff,#eee7fb)]" /><span className="relative grid h-16 w-16 place-items-center rounded-2xl bg-white/80 text-[#6731dc] shadow-[0_8px_20px_rgba(88,55,160,.12)]"><Icon name={treatment} className="h-8 w-8" /></span></>}<span className="absolute bottom-3 left-3"><BrandGlyph platform={item.platform} /></span></div>;
}

function SupportedPlatforms() { return <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#687082]"><span>Supported for automatic previews</span><BrandGlyph platform="Instagram" /><BrandGlyph platform="Facebook" /><BrandGlyph platform="YouTube" /></div>; }

function PreviewEntry({ url, onUrlChange, stage, preview, message, onFetch, onUse, onManual, onTryAnother }: { url: string; onUrlChange: (value: string) => void; stage: PreviewStage; preview: FetchedPreview | null; message?: string; onFetch: () => void; onUse: () => void; onManual: () => void; onTryAnother: () => void }) {
  if (stage === 'fetching') return <div className="mt-6 rounded-2xl border border-[#ded3f2] bg-[#fcfbff] p-6"><div className="flex items-center gap-4"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#f0eaff] text-[#6731dc]"><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /></span><div><h3 className="text-base font-semibold">{message || 'Fetching your content...'}</h3><p className="mt-1 text-sm text-[#677082]">This should only take a moment.</p></div></div></div>;
  if (stage === 'found' && preview) return <div className="mt-6 overflow-hidden rounded-2xl border border-[#d8c8f1] bg-[#fcfbff]"><div className="border-b border-[#e8e1f3] px-5 py-4"><p className="text-sm font-semibold text-[#6330dc]">Preview found</p><h3 className="mt-1 text-lg font-semibold">Is this the content you want to add?</h3></div><div className="grid gap-5 p-5 sm:grid-cols-[180px_minmax(0,1fr)]"><div className="relative min-h-36 overflow-hidden rounded-xl bg-[#f0eaff]">{preview.thumbnailUrl ? <img src={preview.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <span className="grid h-full min-h-36 place-items-center text-[#6731dc]"><Icon name="play" className="h-9 w-9" /></span>}<span className="absolute bottom-2 left-2"><BrandGlyph platform={preview.platform} /></span></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{preview.platform}</span>{preview.contentType && <span className="rounded-full bg-[#f0eaff] px-2.5 py-1 text-xs font-medium text-[#6330dc]">{preview.contentType}</span>}</div><h4 className="mt-3 line-clamp-2 text-base font-semibold">{preview.title || 'Content preview'}</h4>{preview.description && <p className="mt-2 line-clamp-3 text-sm leading-5 text-[#677082]">{preview.description}</p>}{preview.authorName && <p className="mt-3 text-xs text-[#687082]">By {preview.authorName}</p>}{(preview.metrics.views || preview.metrics.likes || preview.metrics.comments) && <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#677082]">{preview.metrics.views && <span>{preview.metrics.views} views</span>}{preview.metrics.likes && <span>{preview.metrics.likes} likes</span>}{preview.metrics.comments && <span>{preview.metrics.comments} comments</span>}<span className="font-medium text-[#6330dc]">Platform data</span></div>}</div></div><div className="flex flex-col-reverse gap-2 border-t border-[#e8e1f3] px-5 py-4 sm:flex-row sm:justify-end"><button type="button" onClick={onTryAnother} className="min-h-10 rounded-xl border border-[#d9dce3] px-4 text-sm font-medium">Try another URL</button><button type="button" onClick={onUse} className="min-h-10 rounded-xl bg-[#6731dc] px-4 text-sm font-semibold text-white">Use this content</button></div></div>;
  if (stage === 'unavailable' || stage === 'unsupported' || stage === 'temporary') { const unsupported = stage === 'unsupported'; return <div className="mt-6 rounded-2xl border border-[#ded3f2] bg-[#fcfbff] p-5"><h3 className="text-lg font-semibold">{unsupported ? 'Unsupported platform' : stage === 'temporary' ? 'Preview temporarily unavailable' : 'Preview unavailable'}</h3><p className="mt-2 text-sm leading-6 text-[#677082]">{unsupported ? "This platform isn't supported for automatic previews yet." : stage === 'temporary' ? "We couldn't load a preview right now. Please try again, or continue manually." : "We couldn't load a preview for this content. The content may be private, unavailable, restricted, or temporarily inaccessible."}</p>{unsupported && <p className="mt-3 break-all rounded-lg bg-white px-3 py-2 text-xs text-[#687082]">{url}</p>}<SupportedPlatforms /><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onTryAnother} className="min-h-10 rounded-xl border border-[#d9dce3] px-4 text-sm font-medium">Try another URL</button><button type="button" onClick={onManual} className="min-h-10 rounded-xl bg-[#6731dc] px-4 text-sm font-semibold text-white">Continue manually</button></div></div>; }
  return <div className="mt-6 rounded-2xl border border-[#dcd0f2] bg-[#fcfbff] p-5 sm:p-6"><h3 className="text-lg font-semibold">Add work</h3><p className="mt-1 text-sm text-[#677082]">Start with a link to the content you want brands to see.</p><label className="mt-5 block"><span className="text-sm font-semibold">Content URL <span className="text-[#6a35df]">*</span></span><div className="mt-2 flex flex-col gap-2 sm:flex-row"><div className="flex min-h-11 flex-1 items-center gap-3 rounded-xl border border-[#dfe1e8] bg-white px-3.5 focus-within:border-[#8a62e5]"><span className="text-[#616a7a]"><Icon name="link" /></span><input value={url} onChange={(event) => onUrlChange(event.target.value)} placeholder="Paste your Instagram, Facebook or YouTube URL" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></div><button type="button" onClick={onFetch} className="min-h-11 rounded-xl bg-[#6731dc] px-5 text-sm font-semibold text-white">Fetch preview â†’</button></div></label>{message && <p role="alert" className="mt-2 text-sm font-medium text-[#b22836]">{message}</p>}<SupportedPlatforms /><p className="mt-3 text-xs text-[#687082]">You can also add content from other platforms manually.</p><button type="button" onClick={onManual} className="mt-4 text-sm font-semibold text-[#6330dc]">Continue manually</button></div>;
}

export default function PortfolioPage() {
  const router = useRouter();
  const [profileName, setProfileName] = useState('Creator');
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [previewStage, setPreviewStage] = useState<PreviewStage>('entry');
  const [previewUrl, setPreviewUrl] = useState('');
  const [fetchedPreview, setFetchedPreview] = useState<FetchedPreview | null>(null);
  const [fetchMessage, setFetchMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [canCompleteProfile, setCanCompleteProfile] = useState(false);
  const [profileCompletedAt, setProfileCompletedAt] = useState<string | null>(null);

  const refreshProfileCompletion = async (): Promise<CreatorProfileProgress | null> => {
    try {
      const progress = await loadCreatorProfileProgress();
      setCanCompleteProfile(progress.allRequiredComplete);
      return progress;
    } catch {
      setCanCompleteProfile(false);
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadPortfolio = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) { router.replace('/signin'); return; }
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) { router.replace('/signin'); return; }
      const name = authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0];
      if (name && !cancelled) setProfileName(name);
      const { data: creator, error: creatorError } = await supabase
        .from('creators')
        .select('id, profile_completed_at')
        .eq('auth_user_id', authData.user.id)
        .maybeSingle();
      if (creatorError || !creator?.id) {
        if (!cancelled) { setNotice('We could not load your creator profile. Please try again.'); setLoading(false); }
        return;
      }
      if (!cancelled) setCreatorId(creator.id);
      if (!cancelled) setProfileCompletedAt(creator.profile_completed_at);
      const loaded = await fetchPortfolioItems(creator.id);
      if (loaded.error) {
        if (!cancelled) { setNotice(`We could not load your portfolio. ${loaded.error}`); setLoading(false); }
        return;
      }
      try {
        const savedPlatforms = JSON.parse(window.sessionStorage.getItem(socialStorageKey) || '[]') as SocialAccount[];
        if (Array.isArray(savedPlatforms) && !cancelled) setSocialAccounts(savedPlatforms.filter((account) => account?.id && account?.platform));
      } catch { window.sessionStorage.removeItem(socialStorageKey); }
      if (loaded.items.length) {
        window.sessionStorage.removeItem(portfolioStorageKey);
        const progress = await refreshProfileCompletion();
        if (!cancelled) {
          setItems(loaded.items);
          if (!progress) setNotice('We could not verify your profile completion status. Please try again.');
          setLoading(false);
        }
        return;
      }
      let draftItems: PortfolioItem[] = [];
      try {
        const savedDraft = JSON.parse(window.sessionStorage.getItem(portfolioStorageKey) || '[]') as unknown;
        if (Array.isArray(savedDraft) && savedDraft.length <= 10) {
          const normalized = savedDraft.map((item, index) => normalizeDraftItem(item, `draft-${index}`));
          if (normalized.every((item): item is PortfolioItem => item !== null) && new Set(normalized.map(contentIdentity)).size === normalized.length) draftItems = normalized;
        }
      } catch { window.sessionStorage.removeItem(portfolioStorageKey); }
      if (draftItems.length) {
        const { error: migrationError } = await supabase
          .from('creator_portfolio_items')
          .insert(draftItems.map((item, index) => toPortfolioPayload(item, creator.id, index + 1)));
        if (migrationError) {
          if (!cancelled) { setNotice(`We could not migrate your saved portfolio draft. ${migrationError.message}`); setLoading(false); }
          return;
        }
        window.sessionStorage.removeItem(portfolioStorageKey);
        const reloaded = await fetchPortfolioItems(creator.id);
        if (reloaded.error) {
          if (!cancelled) { setNotice(`Your portfolio was saved, but could not be reloaded. ${reloaded.error}`); setLoading(false); }
          return;
        }
        const progress = await refreshProfileCompletion();
        if (!cancelled) {
          setItems(reloaded.items);
          if (!progress) setNotice('We could not verify your profile completion status. Please try again.');
          setLoading(false);
        }
        return;
      }
      const progress = await refreshProfileCompletion();
      if (!cancelled) {
        setItems([]);
        if (!progress) setNotice('We could not verify your profile completion status. Please try again.');
        setLoading(false);
      }
    };
    void loadPortfolio();
    return () => { cancelled = true; };
  }, [router]);

  const initialPlatforms = useMemo(() => Array.from(new Set(socialAccounts.map((account) => account.platform))).sort((a, b) => platformOrder.indexOf(a) - platformOrder.indexOf(b)), [socialAccounts]);
  const selectablePlatforms = Array.from(new Set([...initialPlatforms, form.platform, 'Other' as Platform]));
  const initials = profileName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const selectedForRemoval = items.find((item) => item.id === pendingRemoval);
  const detectedPlatform = (() => {
    const url = form.contentUrl.toLowerCase();
    if (url.includes('instagram.com')) return 'Instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
    if (url.includes('facebook.com')) return 'Facebook';
    if (url.includes('tiktok.com')) return 'TikTok';
    if (url.includes('snapchat.com')) return 'Snapchat';
    if (url.includes('linkedin.com')) return 'LinkedIn';
    if (url.includes('pinterest.')) return 'Pinterest';
    if (url.includes('x.com') || url.includes('twitter.com')) return 'X';
    return '';
  })();
  const updateForm = (changes: Partial<FormState>) => { setForm((current) => ({ ...current, ...changes })); setErrors((current) => ({ ...current, form: '', contentUrl: '', platform: '', contentType: '', contentTypeOther: '', categoryOther: '' })); };
  const openAddForm = () => { setForm(emptyForm); setEditingId(null); setErrors({}); setNotice(''); setPreviewStage('entry'); setPreviewUrl(''); setFetchedPreview(null); setFetchMessage(''); setFormOpen(true); };
  const openEditForm = (item: PortfolioItem) => { const { id, ...values } = item; setForm({ ...emptyForm, ...values }); setEditingId(id); setErrors({}); setNotice(''); setPreviewStage('form'); setFetchedPreview(null); setFetchMessage(''); setFormOpen(true); };
  const validate = () => {
    const next: Errors = {};
    const normalizedUrl = contentIdentity(form);
    if (!isValidUrl(form.contentUrl)) next.contentUrl = 'Enter a valid http:// or https:// content URL.';
    if (!form.platform) next.platform = 'Choose a platform.';
    if (!form.contentType) next.contentType = 'Choose a content type.';
    if (form.contentType === 'Other' && !form.contentTypeOther.trim()) next.contentTypeOther = 'Tell us more about this content type.';
    if (form.category === 'Other' && !form.categoryOther.trim()) next.categoryOther = 'Tell us more about this category.';
    if (items.some((item) => item.id !== editingId && contentIdentity(item) === normalizedUrl)) next.contentUrl = 'This content has already been added to your portfolio.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const submitWork = async () => {
    if (saving || !creatorId || !validate()) return;
    if (!editingId && items.length >= 10) { setNotice('You can showcase up to 10 pieces of work.'); return; }
    const value = { ...form, contentUrl: form.contentUrl.trim(), title: form.title.trim(), description: form.description.trim(), contentTypeOther: form.contentTypeOther.trim(), categoryOther: form.categoryOther.trim() };
    const supabase = getSupabaseClient();
    if (!supabase) { setNotice('Portfolio service is unavailable. Please try again.'); return; }
    setSaving(true); setNotice('');
    const sortOrder = editingId ? items.findIndex((item) => item.id === editingId) + 1 : items.length + 1;
    if (sortOrder < 1) { setNotice('We could not find this portfolio item. Please reload and try again.'); setSaving(false); return; }
    const query = editingId
      ? supabase.from('creator_portfolio_items').update(toPortfolioUpdatePayload(value, creatorId, sortOrder)).eq('id', editingId).eq('creator_id', creatorId)
      : supabase.from('creator_portfolio_items').insert(toPortfolioPayload(value, creatorId, sortOrder));
    const { data, error } = await query.select('*').single();
    if (error || !data) {
      setNotice(`We could not save this portfolio item. ${error?.message || 'Please try again.'}`);
      setSaving(false);
      return;
    }
    const savedItem = mapPortfolioRow(data as PortfolioDatabaseRow);
    setItems((current) => editingId ? current.map((item) => item.id === editingId ? savedItem : item) : [...current, savedItem]);
    window.sessionStorage.removeItem(portfolioStorageKey);
    await refreshProfileCompletion();
    setFormOpen(false); setEditingId(null); setForm(emptyForm); setSaving(false);
  };
  const continueManually = () => {
    setForm((current) => ({ ...current, contentUrl: previewUrl.trim() || current.contentUrl }));
    setPreviewStage('form'); setFetchMessage('');
  };
  const fetchPreview = async () => {
    const url = previewUrl.trim();
    try { const parsed = new URL(url); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid'); } catch { setFetchMessage('Enter a valid content URL.'); return; }
    setFetchMessage('Detecting platform...'); setPreviewStage('fetching');
    window.setTimeout(() => setFetchMessage('Fetching your content...'), 350);
    window.setTimeout(() => setFetchMessage('Preparing preview...'), 850);
    try {
      const response = await fetch('/api/portfolio/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
      const result = await response.json() as { status?: PreviewStage | 'invalid'; preview?: FetchedPreview };
      if (result.status === 'found' && result.preview) { setFetchedPreview(result.preview); setPreviewStage('found'); return; }
      if (result.status === 'unsupported') { setPreviewStage('unsupported'); return; }
      if (result.status === 'invalid') { setPreviewStage('entry'); setFetchMessage('Enter a valid content URL.'); return; }
      if (result.status === 'temporary') { setPreviewStage('temporary'); return; }
      setPreviewStage('unavailable');
    } catch { setPreviewStage('temporary'); }
  };
  const useFetchedContent = () => {
    if (!fetchedPreview) return;
    setForm((current) => ({ ...current, contentUrl: fetchedPreview.canonicalUrl, platform: fetchedPreview.platform, contentType: fetchedPreview.contentType || current.contentType, title: fetchedPreview.title || current.title, description: fetchedPreview.description || current.description, thumbnail: fetchedPreview.thumbnailUrl, contentId: fetchedPreview.contentId, canonicalUrl: fetchedPreview.canonicalUrl, embedUrl: fetchedPreview.embedUrl, authorName: fetchedPreview.authorName, authorUrl: fetchedPreview.authorUrl, views: fetchedPreview.metrics.views || current.views, likes: fetchedPreview.metrics.likes || current.likes, comments: fetchedPreview.metrics.comments || current.comments, metricsSource: fetchedPreview.metricsSource }));
    setPreviewStage('form');
  };
  const removeWork = async () => {
    if (saving || !pendingRemoval || !creatorId) return;
    const supabase = getSupabaseClient();
    if (!supabase) { setNotice('Portfolio service is unavailable. Please try again.'); return; }
    setSaving(true); setNotice('');
    const { error: deleteError } = await supabase.from('creator_portfolio_items').delete().eq('id', pendingRemoval).eq('creator_id', creatorId);
    if (deleteError) { setNotice(`We could not remove this portfolio item. ${deleteError.message}`); setSaving(false); return; }
    const remaining = items.filter((item) => item.id !== pendingRemoval);
    for (const [index, item] of remaining.entries()) {
      const { error: orderError } = await supabase.from('creator_portfolio_items').update({ sort_order: index + 1 }).eq('id', item.id).eq('creator_id', creatorId);
      if (orderError) {
        const reloaded = await fetchPortfolioItems(creatorId);
        if (!reloaded.error) setItems(reloaded.items);
        setNotice(`The item was removed, but we could not update the portfolio order. ${orderError.message}`);
        setSaving(false);
        return;
      }
    }
    setItems(remaining); window.sessionStorage.removeItem(portfolioStorageKey); await refreshProfileCompletion(); setPendingRemoval(null); setSaving(false);
  };
  const confirmSavedPortfolio = async (): Promise<CreatorProfileProgress | null> => {
    if (!creatorId) { setNotice('We could not load your creator profile. Please try again.'); return null; }
    const reloaded = await fetchPortfolioItems(creatorId);
    if (reloaded.error) { setNotice(`We could not verify your portfolio save. ${reloaded.error}`); return null; }
    setItems(reloaded.items); window.sessionStorage.removeItem(portfolioStorageKey);
    const progress = await refreshProfileCompletion();
    if (!progress) setNotice('We could not verify your profile completion status. Please try again.');
    return progress;
  };
  const completeProfile = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) { setNotice('Profile completion is unavailable. Please try again.'); return false; }
    const { data, error } = await supabase.rpc('complete_creator_profile');
    if (error || !data) {
      setNotice(`We could not complete your profile. ${error?.message || 'Please try again.'}`);
      return false;
    }
    setProfileCompletedAt(data as string);
    return true;
  };
  const saveAndExit = async () => { if (saving) return; setSaving(true); setNotice(''); const progress = await confirmSavedPortfolio(); setSaving(false); if (progress) router.push('/profile'); };
  const saveAndContinue = async () => {
    if (saving) return;
    if (!items.length) { setNotice('Add at least one portfolio piece with a valid URL, platform, and content type to continue.'); return; }
    setSaving(true); setNotice('');
    const progress = await confirmSavedPortfolio();
    if (!progress) { setSaving(false); return; }
    if (!progress.allRequiredComplete) {
      setSaving(false);
      router.push(progress.firstIncompleteRequiredSection?.route || '/profile');
      return;
    }
    if (!profileCompletedAt && !await completeProfile()) { setSaving(false); return; }
    setSaving(false);
    router.push('/profile/preview');
  };

  const primaryCtaLabel = canCompleteProfile
    ? profileCompletedAt ? 'View Profile Preview' : 'Complete Profile'
    : 'Save & Continue';

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#fbfaff] text-sm text-[#5b6272]">Loading your portfolio...</main>;

  return <main className="min-h-screen bg-[#fbfaff] text-[#17171b]"><header className="flex h-[76px] items-center justify-between border-b border-[#e8e7eb] bg-white px-5 sm:px-8 lg:px-10"><Link href="/" className="text-[1.45rem] font-semibold tracking-[-0.08em] text-black sm:text-[1.7rem]">CloutCo</Link><div className="flex items-center gap-4 sm:gap-6"><button type="button" aria-label="Notifications" className="text-[#4e5667]"><Icon name="bell" /></button><span className="hidden h-8 w-px bg-[#e7e7eb] sm:block" /><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#eee8ff] text-xs font-semibold text-[#6330dc]">{initials}</span><span className="hidden text-sm font-medium sm:block">{profileName}</span><span className="hidden text-[#626a7a] sm:block">âŒ„</span></div></div></header><div className="mx-auto flex max-w-[1600px]"><aside className="hidden w-[205px] shrink-0 border-r border-[#e8e7eb] bg-white px-5 py-7 lg:block"><nav className="space-y-1.5" aria-label="Creator navigation"><Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#343946] hover:bg-[#faf8ff]"><Icon name="home" />Dashboard</Link><Link href="/profile" className="flex items-center gap-3 rounded-xl bg-[#f1ebff] px-3 py-3 text-sm font-medium text-[#6330dc]"><Icon name="user" />My Profile</Link><a href="#messages" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#343946] hover:bg-[#faf8ff]"><Icon name="message" />Messages</a><a href="#settings" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#343946] hover:bg-[#faf8ff]"><Icon name="settings" />Settings</a></nav><div className="mt-32 rounded-2xl border border-[#e8e0fa] bg-[#fbf9ff] p-4"><p className="text-base font-semibold leading-5">Create<br />Collaborate<br />Grow <span className="text-[#6932e8]">â†—</span></p><p className="mt-4 text-xs leading-5 text-[#60697a]">Your creator profile, all in one place.</p></div></aside><div className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12"><div className="grid gap-6 xl:grid-cols-[250px_minmax(0,1fr)_260px] xl:items-start"><ProgressCard /><section className="order-1 min-w-0 rounded-2xl border border-[#e8e7eb] bg-white p-5 shadow-[0_7px_20px_rgba(50,40,80,0.03)] sm:p-8 xl:order-2"><p className="text-xs font-bold tracking-[0.14em] text-[#6a35df]">PORTFOLIO</p><h1 className="mt-2 text-[2.1rem] font-semibold tracking-[-0.06em] sm:text-[2.75rem]">Show us what you create.</h1><p className="mt-3 max-w-2xl text-base leading-7 text-[#5e6678]">Add your best content so brands can see your creative style, quality, and range.</p><section className="mt-8 rounded-2xl border border-[#e8e7eb] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><StepHeading value="01" title="Your Work">Add the content pieces that best represent you as a creator.</StepHeading><span className="rounded-full bg-[#f0eaff] px-3 py-1.5 text-sm font-semibold text-[#6330dc]">{items.length} of 10 pieces</span></div>{!items.length && !formOpen && <div className="mt-7 grid place-items-center rounded-2xl border border-dashed border-[#d9ccef] bg-[#fcfbff] px-5 py-12 text-center"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#f0eaff] text-[#6731dc]"><Icon name="spark" className="h-7 w-7" /></span><h3 className="mt-4 text-lg font-semibold">Your portfolio is empty</h3><p className="mt-2 max-w-sm text-sm leading-6 text-[#677082]">Add the work you&apos;re most proud of and give brands a feel for your creative style.</p><button type="button" onClick={openAddForm} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#6731dc] px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(99,48,220,0.18)]"><Icon name="plus" />Add your first piece</button></div>}{items.length > 0 && !formOpen && <div className="mt-6 flex justify-end">{items.length < 10 ? <button type="button" onClick={openAddForm} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#d8c8f2] bg-[#fbf9ff] px-4 text-sm font-semibold text-[#6330dc] hover:bg-[#f4efff]"><Icon name="plus" />Add work</button> : <div className="rounded-xl border border-[#e4dbf4] bg-[#fbf9ff] px-4 py-3 text-right"><p className="text-sm font-semibold">Portfolio limit reached</p><p className="mt-1 text-xs text-[#677082]">You can showcase up to 10 pieces of work.</p></div>}</div>}{formOpen && previewStage !== 'form' && <PreviewEntry url={previewUrl} onUrlChange={(value) => { setPreviewUrl(value); setFetchMessage(''); }} stage={previewStage} preview={fetchedPreview} message={fetchMessage} onFetch={fetchPreview} onUse={useFetchedContent} onManual={continueManually} onTryAnother={() => { setPreviewStage('entry'); setFetchMessage(''); setFetchedPreview(null); }} />}{formOpen && previewStage === 'form' && <div className="mt-6 rounded-2xl border border-[#dcd0f2] bg-[#fcfbff] p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-semibold">{editingId ? 'Edit work' : 'Add work'}</h3><p className="mt-1 text-sm text-[#677082]">Share the key details for this portfolio piece.</p></div><button type="button" aria-label="Close work form" onClick={() => { setFormOpen(false); setErrors({}); }} className="grid h-9 w-9 place-items-center rounded-lg text-[#677082] hover:bg-[#f0eaff]"><Icon name="close" /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="text-sm font-semibold">Content URL <span className="text-[#6a35df]">*</span></span><div className="mt-2 flex min-h-11 items-center gap-3 rounded-xl border border-[#dfe1e8] bg-white px-3.5 focus-within:border-[#8a62e5]"><span className="text-[#616a7a]"><Icon name="link" /></span><input value={form.contentUrl} onChange={(event) => updateForm({ contentUrl: event.target.value })} placeholder="https://..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></div><FieldError>{errors.contentUrl}</FieldError>{detectedPlatform && <p className="mt-1.5 text-xs text-[#6a35df]">This link looks like {detectedPlatform}. You can choose a different platform below.</p>}</label><label><span className="text-sm font-semibold">Platform <span className="text-[#6a35df]">*</span></span><select value={form.platform} onChange={(event) => updateForm({ platform: event.target.value as Platform })} className="mt-2 min-h-11 w-full rounded-xl border border-[#dfe1e8] bg-white px-3.5 text-sm outline-none focus:border-[#8a62e5]">{selectablePlatforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}</select><FieldError>{errors.platform}</FieldError></label><label><span className="text-sm font-semibold">Content Type <span className="text-[#6a35df]">*</span></span><select value={form.contentType} onChange={(event) => updateForm({ contentType: event.target.value, contentTypeOther: event.target.value === 'Other' ? form.contentTypeOther : '' })} className="mt-2 min-h-11 w-full rounded-xl border border-[#dfe1e8] bg-white px-3.5 text-sm outline-none focus:border-[#8a62e5]"><option value="">Select content type</option>{contentTypes.map((type) => <option key={type}>{type}</option>)}</select><FieldError>{errors.contentType}</FieldError></label>{form.contentType === 'Other' && <label className="sm:col-span-2"><span className="text-sm font-semibold">Tell us more <span className="text-[#6a35df]">*</span></span><input value={form.contentTypeOther} maxLength={50} onChange={(event) => updateForm({ contentTypeOther: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[#dfe1e8] bg-white px-3.5 text-sm outline-none focus:border-[#8a62e5]" /><FieldError>{errors.contentTypeOther}</FieldError></label>}<label><span className="text-sm font-semibold">Category</span><select value={form.category} onChange={(event) => updateForm({ category: event.target.value, categoryOther: event.target.value === 'Other' ? form.categoryOther : '' })} className="mt-2 min-h-11 w-full rounded-xl border border-[#dfe1e8] bg-white px-3.5 text-sm outline-none focus:border-[#8a62e5]"><option value="">Select category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>{form.category === 'Other' && <label><span className="text-sm font-semibold">Tell us more</span><input value={form.categoryOther} maxLength={50} onChange={(event) => updateForm({ categoryOther: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[#dfe1e8] bg-white px-3.5 text-sm outline-none focus:border-[#8a62e5]" /><FieldError>{errors.categoryOther}</FieldError></label>}<label className="sm:col-span-2"><span className="text-sm font-semibold">Title</span><input value={form.title} maxLength={80} onChange={(event) => updateForm({ title: event.target.value })} placeholder="Give this piece a short title" className="mt-2 min-h-11 w-full rounded-xl border border-[#dfe1e8] bg-white px-3.5 text-sm outline-none focus:border-[#8a62e5]" /></label><label className="sm:col-span-2"><span className="text-sm font-semibold">Description</span><textarea value={form.description} maxLength={200} rows={3} onChange={(event) => updateForm({ description: event.target.value })} placeholder="Tell brands what makes this piece special" className="mt-2 w-full resize-none rounded-xl border border-[#dfe1e8] bg-white px-3.5 py-3 text-sm outline-none focus:border-[#8a62e5]" /></label></div><div className="mt-6 border-t border-[#eceaf1] pt-5"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f0eaff] text-[#6731dc]"><Icon name="chart" /></span><div><h4 className="text-sm font-semibold">Performance snapshot</h4><p className="mt-1 text-sm text-[#677082]">Optional â€” add the latest numbers shown for this piece of content.</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-3">{(['views', 'likes', 'comments'] as const).map((metric) => <label key={metric}><span className="text-sm font-medium capitalize">{metric}</span><input inputMode="numeric" value={form[metric]} onChange={(event) => updateForm({ [metric]: event.target.value.replace(/[^0-9]/g, '') })} placeholder="0" className="mt-2 min-h-11 w-full rounded-xl border border-[#dfe1e8] bg-white px-3.5 text-sm outline-none focus:border-[#8a62e5]" /></label>)}</div><p className="mt-3 text-xs text-[#707787]">{form.metricsSource === 'platform' ? 'Platform data' : 'Creator provided'}</p></div><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => { setFormOpen(false); setErrors({}); }} className="min-h-11 rounded-xl border border-[#d9dce3] px-5 text-sm font-medium">Cancel</button><button type="button" onClick={submitWork} className="min-h-11 rounded-xl bg-[#6731dc] px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(99,48,220,0.18)]">{editingId ? 'Save changes' : 'Add work'}</button></div></div>}{items.length > 0 && <div className="mt-6 grid gap-4 sm:grid-cols-2">{items.map((item) => <article key={item.id} className="group overflow-hidden rounded-2xl border border-[#e7e5eb] bg-white shadow-[0_6px_18px_rgba(50,40,80,0.035)]"><Preview item={item} /><div className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><BrandGlyph platform={item.platform} /><span className="truncate text-sm font-semibold">{item.platform}</span><span className="truncate text-xs text-[#6d7483]">{item.contentType === 'Other' ? item.contentTypeOther : item.contentType}</span></div><h3 className="mt-3 line-clamp-1 text-base font-semibold">{item.title || 'Untitled work'}</h3><p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-[#677082]">{item.description || 'No description added.'}</p></div><button type="button" aria-label={`Edit ${item.title || 'work'}`} onClick={() => openEditForm(item)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#677082] hover:bg-[#f0eaff] hover:text-[#6731dc]"><Icon name="more" /></button></div>{(item.views || item.likes || item.comments) && <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-[#efeff2] pt-3 text-xs text-[#5f6778]">{item.views && <span><strong className="text-[#343946]">{item.views}</strong> views</span>}{item.likes && <span><strong className="text-[#343946]">{item.likes}</strong> likes</span>}{item.comments && <span><strong className="text-[#343946]">{item.comments}</strong> comments</span>}</div>}<div className="mt-4 flex items-center justify-between"><button type="button" onClick={() => openEditForm(item)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6330dc]"><Icon name="edit" className="h-4 w-4" />Edit</button><button type="button" onClick={() => setPendingRemoval(item.id)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#a83a46] hover:text-[#b22836]"><Icon name="trash" className="h-4 w-4" />Remove</button></div></div></article>)}</div>}</section>{notice && <p role="alert" className="mt-5 rounded-lg border border-[#f1d1d1] bg-[#fff7f7] px-3 py-2.5 text-sm text-[#a12c2c]">{notice}</p>}<div className="mt-6 flex flex-col-reverse gap-2 border-t border-[#efeff2] pt-6 sm:flex-row sm:justify-end"><button type="button" onClick={saveAndExit} className="min-h-12 rounded-xl border border-[#d9dce3] px-6 text-sm font-medium text-[#30333b]">Save &amp; Exit</button><button type="button" onClick={saveAndContinue} disabled={saving} className="min-h-12 rounded-xl bg-[#6731dc] px-7 text-sm font-medium text-white shadow-[0_8px_18px_rgba(99,48,220,0.18)] disabled:cursor-not-allowed disabled:opacity-70">{saving ? 'Saving...' : primaryCtaLabel} <span className="ml-1">→</span></button></div></section><aside className="order-3 space-y-4 xl:sticky xl:top-5"><section className="rounded-2xl bg-[#f0eaff] p-6"><span className="grid h-10 w-10 place-items-center rounded-full bg-white/55 text-[#6530dc]"><Icon name="spark" /></span><h2 className="mt-4 text-base font-semibold">What should you showcase?</h2><p className="mt-2 text-sm leading-6 text-[#5d5875]">Choose work that best represents your creative style, quality, and the type of content you want to create more of.</p><p className="mt-3 text-sm leading-6 font-medium text-[#5d5875]">You can add up to 10 pieces and update your portfolio later.</p></section><section className="rounded-2xl border border-[#e6e0f4] bg-white p-6"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#f0eaff] text-[#6530dc]"><Icon name="lightbulb" /></span><h2 className="mt-4 text-base font-semibold">Tip</h2><p className="mt-2 text-sm leading-6 text-[#5d5875]">Show variety, but keep your strongest work first.</p></section></aside></div></div></div>{selectedForRemoval && <div className="fixed inset-0 z-50 grid place-items-center bg-[#1e172c]/30 p-5"><div role="dialog" aria-modal="true" aria-labelledby="remove-work-title" className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"><h2 id="remove-work-title" className="text-lg font-semibold">Remove this work?</h2><p className="mt-2 text-sm leading-6 text-[#657083]">This piece will be removed from your portfolio.</p><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setPendingRemoval(null)} className="min-h-10 rounded-lg border border-[#d9dce3] px-4 text-sm font-medium">Cancel</button><button type="button" onClick={removeWork} className="min-h-10 rounded-lg bg-[#b62e40] px-4 text-sm font-medium text-white">Remove</button></div></div></div>}</main>;
}

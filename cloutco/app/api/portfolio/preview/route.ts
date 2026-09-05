import { NextResponse } from 'next/server';

type Platform = 'Instagram' | 'Facebook' | 'YouTube';
type Preview = {
  platform: Platform; contentId: string | null; canonicalUrl: string; contentType: string | null; title: string | null;
  description: string | null; thumbnailUrl: string | null; embedUrl: string | null; authorName: string | null; authorUrl: string | null;
  metrics: { views: string | null; likes: string | null; comments: string | null }; metricsSource: 'platform' | null; fetchedAt: string;
};
type PreviewResult = Preview | null | 'temporary';

const supportedHosts: Record<string, Platform> = {
  'instagram.com': 'Instagram', 'www.instagram.com': 'Instagram',
  'facebook.com': 'Facebook', 'www.facebook.com': 'Facebook',
  'youtube.com': 'YouTube', 'www.youtube.com': 'YouTube', 'youtu.be': 'YouTube',
};

const text = (value: unknown, maximum = 500) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maximum) || null : null;
const number = (value: unknown) => typeof value === 'string' && /^\d+$/.test(value) ? value : null;
const safeHttpsUrl = (value: unknown) => {
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return url.protocol === 'https:' ? url.toString() : null; } catch { return null; }
};

function normalizeUrl(input: string) {
  let url: URL;
  try { url = new URL(input.trim()); } catch { return { error: 'invalid' as const }; }
  if (!['http:', 'https:'].includes(url.protocol)) return { error: 'invalid' as const };
  const host = url.hostname.toLowerCase();
  const platform = supportedHosts[host];
  if (!platform) return { error: 'unsupported' as const, url: url.toString() };
  const segments = url.pathname.split('/').filter(Boolean);
  if (platform === 'Instagram') {
    if (!['p', 'reel'].includes(segments[0])) return { error: 'unsupported' as const, url: url.toString() };
    const canonicalUrl = new URL(url.toString());
    canonicalUrl.search = '';
    canonicalUrl.hash = '';
    return { platform, canonicalUrl: canonicalUrl.toString(), contentId: segments[1] || null, contentType: segments[0] === 'reel' ? 'Reel / Short Video' : null, facebookReel: false };
  }
  if (platform === 'Facebook') {
    const facebookReel = segments[0] === 'reel';
    if (!facebookReel && !segments.includes('posts')) return { error: 'unsupported' as const, url: url.toString() };
    return { platform, canonicalUrl: url.toString(), contentId: null, contentType: facebookReel ? 'Reel / Short Video' : null, facebookReel };
  }
  const contentId = host === 'youtu.be' ? segments[0] : url.searchParams.get('v') || (['shorts', 'embed', 'live'].includes(segments[0]) ? segments[1] : null);
  if (!contentId || !/^[A-Za-z0-9_-]{6,}$/.test(contentId)) return { error: 'invalid' as const };
  return { platform, contentId, contentType: segments[0] === 'shorts' ? 'Reel / Short Video' : 'Long-form Video', canonicalUrl: `https://www.youtube.com/watch?v=${contentId}` };
}

async function youtubePreview(url: string, contentId: string, contentType: string): Promise<PreviewResult> {
  const fallback: Preview = {
    platform: 'YouTube', contentId, canonicalUrl: url, contentType, title: null, description: null,
    thumbnailUrl: null, embedUrl: `https://www.youtube.com/embed/${contentId}`, authorName: null, authorUrl: null,
    metrics: { views: null, likes: null, comments: null }, metricsSource: null, fetchedAt: new Date().toISOString(),
  };
  try {
    const key = process.env.YOUTUBE_API_KEY;
    if (key) {
      const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${encodeURIComponent(contentId)}&key=${encodeURIComponent(key)}`, { next: { revalidate: 0 } });
      if (response.status >= 500) return 'temporary';
      if (!response.ok) return null;
      const item = (await response.json() as { items?: Array<{ snippet?: Record<string, unknown>; statistics?: Record<string, unknown> }> }).items?.[0];
      if (!item) return null;
      const snippet = item.snippet || {}; const statistics = item.statistics || {}; const thumbnails = snippet.thumbnails as Record<string, { url?: string }> | undefined;
      return { ...fallback, title: text(snippet.title, 160), description: text(snippet.description, 500), authorName: text(snippet.channelTitle, 120), authorUrl: typeof snippet.channelId === 'string' ? `https://www.youtube.com/channel/${snippet.channelId}` : null, thumbnailUrl: safeHttpsUrl(thumbnails?.maxres?.url || thumbnails?.high?.url || thumbnails?.medium?.url || thumbnails?.default?.url), metrics: { views: number(statistics.viewCount), likes: number(statistics.likeCount), comments: number(statistics.commentCount) }, metricsSource: 'platform' };
    }
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { next: { revalidate: 0 } });
    if (response.status >= 500) return 'temporary';
    if (!response.ok) return null;
    const data = await response.json() as Record<string, unknown>;
    return { ...fallback, title: text(data.title, 160), authorName: text(data.author_name, 120), authorUrl: safeHttpsUrl(data.author_url), thumbnailUrl: safeHttpsUrl(data.thumbnail_url) };
  } catch { return 'temporary'; }
}

async function metaPreview(platform: 'Instagram' | 'Facebook', canonicalUrl: string, facebookReel: boolean): Promise<PreviewResult> {
  const endpoint = platform === 'Instagram' ? 'instagram_oembed' : facebookReel ? 'oembed_video' : 'oembed_post';
  const version = process.env.META_GRAPH_API_VERSION || 'v25.0';
  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${endpoint}?url=${encodeURIComponent(canonicalUrl)}`, { next: { revalidate: 0 } });
    if (response.status >= 500) return 'temporary';
    if (!response.ok) return null;
    const data = await response.json() as Record<string, unknown>;
    return { platform, contentId: null, canonicalUrl, contentType: platform === 'Facebook' && facebookReel ? 'Reel / Short Video' : null, title: text(data.title, 160), description: text(data.title, 500), thumbnailUrl: safeHttpsUrl(data.thumbnail_url), embedUrl: null, authorName: text(data.author_name, 120) || text(data.provider_name, 120), authorUrl: safeHttpsUrl(data.author_url), metrics: { views: null, likes: null, comments: null }, metricsSource: null, fetchedAt: new Date().toISOString() };
  } catch { return 'temporary'; }
}

export async function POST(request: Request) {
  let body: { url?: unknown };
  try { body = await request.json() as { url?: unknown }; } catch { return NextResponse.json({ status: 'invalid' }, { status: 400 }); }
  if (typeof body.url !== 'string') return NextResponse.json({ status: 'invalid' }, { status: 400 });
  const normalized = normalizeUrl(body.url);
  if ('error' in normalized) return NextResponse.json({ status: normalized.error }, { status: normalized.error === 'invalid' ? 400 : 200 });
  const preview = normalized.platform === 'YouTube' ? await youtubePreview(normalized.canonicalUrl, normalized.contentId, normalized.contentType) : await metaPreview(normalized.platform, normalized.canonicalUrl, normalized.facebookReel);
  if (preview === 'temporary') return NextResponse.json({ status: 'temporary' });
  if (!preview) return NextResponse.json({ status: 'unavailable' });
  return NextResponse.json({ status: 'found', preview });
}

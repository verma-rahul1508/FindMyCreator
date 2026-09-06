import { getSupabaseClient } from '@/lib/supabase/client';
import { profileSections, type ProfileSection, type ProfileSectionKey } from '@/lib/profile-sections';

type CreatorRecord = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  current_city: string | null;
  date_of_birth: string | null;
  gender: string | null;
};

type CreatorIdentityRecord = {
  display_name: string | null;
  bio: string | null;
  creator_type: string | null;
};

type CreatorContentProfileRecord = {
  primary_niche: string | null;
  primary_niche_other: string | null;
  other_niches: string[] | null;
  other_niches_other: string | null;
  content_formats: string[] | null;
  content_formats_other: string | null;
  content_styles: string[] | null;
  content_styles_other: string | null;
};

type SocialPlatformRecord = {
  id: string;
  platform: 'instagram' | 'facebook' | 'youtube';
  profile_url: string | null;
  audience_count: number | string | null;
  is_primary: boolean;
};

type SocialSnapshotRecord = {
  id: string;
  social_platform_id: string;
  platform: 'instagram' | 'facebook';
  updated_at: string;
};

type InstagramAnalyticsRecord = {
  snapshot_id: string;
  views_all_content: number | string | null;
  overview_followers_percentage: number | string | null;
  overview_non_followers_percentage: number | string | null;
  net_followers: number | string | null;
  interactions: number | string | null;
  viewers_total: number | string | null;
  posts_views: number | string | null;
  reels_views: number | string | null;
  stories_views: number | string | null;
  live_videos_views: number | string | null;
  all_interactions: number | string | null;
  posts_interactions: number | string | null;
  reels_interactions: number | string | null;
  stories_interactions: number | string | null;
  live_videos_interactions: number | string | null;
  profile_visits: number | string | null;
  bio_link_taps: number | string | null;
  business_address_taps: number | string | null;
  audience_followers: number | string | null;
  follower_growth: number | string | null;
};

type FacebookAnalyticsRecord = {
  snapshot_id: string;
  views_total: number | string | null;
  viewers: number | string | null;
  engagement_total: number | string | null;
  new_conversations: number | string | null;
  net_followers: number | string | null;
};

type CreatorPortfolioItemRecord = {
  content_url: string | null;
  platform: string | null;
  content_type: string | null;
  content_type_other: string | null;
  category: string | null;
  category_other: string | null;
};

export type ProfileSectionProgress = ProfileSection & {
  completed: boolean;
};

export type CreatorProfileProgress = {
  sections: ProfileSectionProgress[];
  completedCount: number;
  requiredCompletedCount: number;
  requiredCount: number;
  allRequiredComplete: boolean;
  firstIncompleteRequiredSection: ProfileSectionProgress | null;
};

const isNonBlank = (value: string | null | undefined) => Boolean(value?.trim());
const hasOnlyNonBlankValues = (values: string[] | null | undefined): values is string[] => (
  Array.isArray(values) && values.length > 0 && values.every((value) => isNonBlank(value))
);
const isNonNegativeWholeNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || String(value).trim() === '') return false;
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue >= 0;
};
const isPercentage = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || String(value).trim() === '') return false;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 && numericValue <= 100;
};
const isHttpUrl = (value: string | null | undefined) => {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

export function isBasicInformationComplete(creator: CreatorRecord | null | undefined) {
  return Boolean(creator && [
    creator.full_name,
    creator.email,
    creator.phone_number,
    creator.current_city,
    creator.date_of_birth,
    creator.gender,
  ].every(isNonBlank));
}

export function isCreatorIdentityComplete(identity: CreatorIdentityRecord | null | undefined) {
  return Boolean(identity && isNonBlank(identity.display_name) && isNonBlank(identity.bio) && isNonBlank(identity.creator_type));
}

export function isContentAndNicheComplete(content: CreatorContentProfileRecord | null | undefined) {
  if (!content || !isNonBlank(content.primary_niche)) return false;

  const { content_formats: contentFormats, content_styles: contentStyles } = content;
  if (!hasOnlyNonBlankValues(contentFormats) || !hasOnlyNonBlankValues(contentStyles)) return false;

  if (content.primary_niche === 'Other' && !isNonBlank(content.primary_niche_other)) return false;
  if (content.other_niches?.some((niche) => !isNonBlank(niche))) return false;
  if (content.other_niches?.includes('Other') && !isNonBlank(content.other_niches_other)) return false;
  if (contentFormats.includes('Other') && !isNonBlank(content.content_formats_other)) return false;
  if (contentStyles.includes('Other') && !isNonBlank(content.content_styles_other)) return false;

  return true;
}

function isPersistedPortfolioItemComplete(item: CreatorPortfolioItemRecord) {
  if (!isNonBlank(item.content_url) || !isNonBlank(item.platform) || !isNonBlank(item.content_type)) return false;
  if (item.content_type === 'Other' && !isNonBlank(item.content_type_other)) return false;
  if (item.category === 'Other' && !isNonBlank(item.category_other)) return false;
  return true;
}

function isPersistedInstagramAnalyticsComplete(analytics: InstagramAnalyticsRecord | undefined) {
  if (!analytics) return false;
  const requiredCounts = [
    analytics.views_all_content,
    analytics.net_followers,
    analytics.interactions,
    analytics.viewers_total,
    analytics.posts_views,
    analytics.reels_views,
    analytics.stories_views,
    analytics.live_videos_views,
    analytics.all_interactions,
    analytics.posts_interactions,
    analytics.reels_interactions,
    analytics.stories_interactions,
    analytics.live_videos_interactions,
    analytics.profile_visits,
    analytics.bio_link_taps,
    analytics.business_address_taps,
    analytics.audience_followers,
    analytics.follower_growth,
  ];

  return requiredCounts.every(isNonNegativeWholeNumber)
    && isPercentage(analytics.overview_followers_percentage)
    && isPercentage(analytics.overview_non_followers_percentage);
}

function isPersistedFacebookAnalyticsComplete(analytics: FacebookAnalyticsRecord | undefined) {
  return Boolean(analytics && [
    analytics.views_total,
    analytics.viewers,
    analytics.engagement_total,
    analytics.new_conversations,
    analytics.net_followers,
  ].every(isNonNegativeWholeNumber));
}

function isSocialPlatformsComplete(
  platforms: SocialPlatformRecord[],
  latestSnapshots: Map<string, SocialSnapshotRecord>,
  instagramAnalytics: Map<string, InstagramAnalyticsRecord>,
  facebookAnalytics: Map<string, FacebookAnalyticsRecord>,
) {
  if (!platforms.length || !platforms.every((platform) => isHttpUrl(platform.profile_url) && isNonNegativeWholeNumber(platform.audience_count))) return false;

  const primaryPlatform = platforms.find((platform) => platform.is_primary);
  if (!primaryPlatform) return false;
  if (primaryPlatform.platform === 'youtube') return true;

  const snapshot = latestSnapshots.get(primaryPlatform.id);
  if (!snapshot || snapshot.platform !== primaryPlatform.platform) return false;

  return primaryPlatform.platform === 'instagram'
    ? isPersistedInstagramAnalyticsComplete(instagramAnalytics.get(snapshot.id))
    : isPersistedFacebookAnalyticsComplete(facebookAnalytics.get(snapshot.id));
}

function throwIfError(error: { message: string } | null, message: string) {
  if (error) throw new Error(`${message}: ${error.message}`);
}

export async function loadCreatorProfileProgress(): Promise<CreatorProfileProgress> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data: userData, error: userError } = await supabase.auth.getUser();
  throwIfError(userError, 'We could not load your session');
  if (!userData.user) throw new Error('You must be signed in to load profile progress.');

  const { data: creatorData, error: creatorError } = await supabase
    .from('creators')
    .select('id, full_name, email, phone_number, current_city, date_of_birth, gender')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle();
  throwIfError(creatorError, 'We could not load your creator profile');
  if (!creatorData) throw new Error('Creator profile not found.');

  const creator = creatorData as CreatorRecord;
  const [identityResult, contentResult, platformsResult, portfolioResult] = await Promise.all([
    supabase.from('creator_identity').select('display_name, bio, creator_type').eq('creator_id', creator.id).maybeSingle(),
    supabase.from('creator_content_profile').select('primary_niche, primary_niche_other, other_niches, other_niches_other, content_formats, content_formats_other, content_styles, content_styles_other').eq('creator_id', creator.id).maybeSingle(),
    supabase.from('creator_social_platforms').select('id, platform, profile_url, audience_count, is_primary').eq('creator_id', creator.id),
    supabase.from('creator_portfolio_items').select('content_url, platform, content_type, content_type_other, category, category_other').eq('creator_id', creator.id),
  ]);
  throwIfError(identityResult.error, 'We could not load creator identity');
  throwIfError(contentResult.error, 'We could not load content and niche details');
  throwIfError(platformsResult.error, 'We could not load social platforms');
  throwIfError(portfolioResult.error, 'We could not load portfolio items');

  const platforms = (platformsResult.data || []) as SocialPlatformRecord[];
  const portfolioItems = (portfolioResult.data || []) as CreatorPortfolioItemRecord[];
  const platformIds = platforms.map((platform) => platform.id);
  let latestSnapshots = new Map<string, SocialSnapshotRecord>();
  let instagramAnalytics = new Map<string, InstagramAnalyticsRecord>();
  let facebookAnalytics = new Map<string, FacebookAnalyticsRecord>();

  if (platformIds.length) {
    const { data: snapshotData, error: snapshotError } = await supabase
      .from('creator_social_analytics_snapshots')
      .select('id, social_platform_id, platform, updated_at')
      .in('social_platform_id', platformIds)
      .eq('is_current', true)
      .order('updated_at', { ascending: false });
    throwIfError(snapshotError, 'We could not load social analytics snapshots');

    for (const snapshot of (snapshotData || []) as SocialSnapshotRecord[]) {
      if (!latestSnapshots.has(snapshot.social_platform_id)) latestSnapshots.set(snapshot.social_platform_id, snapshot);
    }

    const snapshotIds = [...latestSnapshots.values()].map((snapshot) => snapshot.id);
    if (snapshotIds.length) {
      const [instagramResult, facebookResult] = await Promise.all([
        supabase.from('creator_instagram_analytics').select('snapshot_id, views_all_content, overview_followers_percentage, overview_non_followers_percentage, net_followers, interactions, viewers_total, posts_views, reels_views, stories_views, live_videos_views, all_interactions, posts_interactions, reels_interactions, stories_interactions, live_videos_interactions, profile_visits, bio_link_taps, business_address_taps, audience_followers, follower_growth').in('snapshot_id', snapshotIds),
        supabase.from('creator_facebook_analytics').select('snapshot_id, views_total, viewers, engagement_total, new_conversations, net_followers').in('snapshot_id', snapshotIds),
      ]);
      throwIfError(instagramResult.error, 'We could not load Instagram analytics');
      throwIfError(facebookResult.error, 'We could not load Facebook analytics');

      instagramAnalytics = new Map(((instagramResult.data || []) as InstagramAnalyticsRecord[]).map((analytics) => [analytics.snapshot_id, analytics]));
      facebookAnalytics = new Map(((facebookResult.data || []) as FacebookAnalyticsRecord[]).map((analytics) => [analytics.snapshot_id, analytics]));
    }
  }

  const completedByKey: Record<ProfileSectionKey, boolean> = {
    'basic-information': isBasicInformationComplete(creator),
    'creator-identity': isCreatorIdentityComplete(identityResult.data as CreatorIdentityRecord | null),
    'content-and-niche': isContentAndNicheComplete(contentResult.data as CreatorContentProfileRecord | null),
    'social-platforms': isSocialPlatformsComplete(platforms, latestSnapshots, instagramAnalytics, facebookAnalytics),
    'portfolio': portfolioItems.some(isPersistedPortfolioItemComplete),
  };

  const sections = profileSections.map((section) => ({ ...section, completed: completedByKey[section.key] }));
  const requiredSections = sections.filter((section) => section.required);
  const requiredCompletedCount = requiredSections.filter((section) => section.completed).length;

  return {
    sections,
    completedCount: sections.filter((section) => section.completed).length,
    requiredCompletedCount,
    requiredCount: requiredSections.length,
    allRequiredComplete: requiredCompletedCount === requiredSections.length,
    firstIncompleteRequiredSection: requiredSections.find((section) => !section.completed) ?? null,
  };
}

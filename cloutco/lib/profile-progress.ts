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
  net_followers: number | string | null;
  interactions: number | string | null;
  viewers_total: number | string | null;
  profile_visits: number | string | null;
  women_percentage: number | string | null;
  men_percentage: number | string | null;
};

type FacebookAnalyticsRecord = {
  snapshot_id: string;
  views_total: number | string | null;
  viewers: number | string | null;
  engagement_total: number | string | null;
  net_followers: number | string | null;
  women_percentage: number | string | null;
  men_percentage: number | string | null;
};

type YouTubeAnalyticsRecord = {
  social_platform_id: string;
  views: number | string | null;
  likes: number | string | null;
  shares: number | string | null;
  top_country: string | null;
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

function isPersistedInstagramAnalyticsComplete(analytics: InstagramAnalyticsRecord | undefined, topAgeRangeCount: number, topLocationCount: number) {
  if (!analytics) return false;
  const requiredCounts = [
    analytics.views_all_content,
    analytics.net_followers,
    analytics.interactions,
    analytics.viewers_total,
    analytics.profile_visits,
  ];

  return requiredCounts.every(isNonNegativeWholeNumber)
    && isPercentage(analytics.women_percentage)
    && isPercentage(analytics.men_percentage)
    && topAgeRangeCount >= 1
    && topLocationCount >= 1;
}

function isPersistedFacebookAnalyticsComplete(analytics: FacebookAnalyticsRecord | undefined, topAgeGroupCount: number, topLocationCount: number) {
  return Boolean(analytics && [
    analytics.views_total,
    analytics.viewers,
    analytics.engagement_total,
    analytics.net_followers,
  ].every(isNonNegativeWholeNumber)
    && isPercentage(analytics.women_percentage)
    && isPercentage(analytics.men_percentage)
    && topAgeGroupCount === 1
    && topLocationCount >= 1
    && topLocationCount <= 5);
}

function isPersistedYouTubeAnalyticsComplete(analytics: YouTubeAnalyticsRecord | undefined) {
  return Boolean(analytics
    && [analytics.views, analytics.likes, analytics.shares].every(isNonNegativeWholeNumber)
    && isNonBlank(analytics.top_country));
}

function isSocialPlatformsComplete(
  platforms: SocialPlatformRecord[],
  latestSnapshots: Map<string, SocialSnapshotRecord>,
  instagramAnalytics: Map<string, InstagramAnalyticsRecord>,
  instagramTopAgeRangeCounts: Map<string, number>,
  instagramTopLocationCounts: Map<string, number>,
  facebookAnalytics: Map<string, FacebookAnalyticsRecord>,
  facebookTopAgeGroupCounts: Map<string, number>,
  facebookTopLocationCounts: Map<string, number>,
  youtubeAnalytics: Map<string, YouTubeAnalyticsRecord>,
) {
  if (!platforms.length || !platforms.every((platform) => isHttpUrl(platform.profile_url) && isNonNegativeWholeNumber(platform.audience_count))) return false;

  const primaryPlatform = platforms.find((platform) => platform.is_primary);
  if (!primaryPlatform) return false;
  if (primaryPlatform.platform === 'youtube') return isPersistedYouTubeAnalyticsComplete(youtubeAnalytics.get(primaryPlatform.id));

  const snapshot = latestSnapshots.get(primaryPlatform.id);
  if (!snapshot || snapshot.platform !== primaryPlatform.platform) return false;

  return primaryPlatform.platform === 'instagram'
    ? isPersistedInstagramAnalyticsComplete(instagramAnalytics.get(snapshot.id), instagramTopAgeRangeCounts.get(snapshot.id) || 0, instagramTopLocationCounts.get(snapshot.id) || 0)
    : isPersistedFacebookAnalyticsComplete(facebookAnalytics.get(snapshot.id), facebookTopAgeGroupCounts.get(snapshot.id) || 0, facebookTopLocationCounts.get(snapshot.id) || 0);
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
  const [identityResult, contentResult, platformsResult] = await Promise.all([
    supabase.from('creator_identity').select('display_name, bio, creator_type').eq('creator_id', creator.id).maybeSingle(),
    supabase.from('creator_content_profile').select('primary_niche, primary_niche_other, other_niches, other_niches_other, content_formats, content_formats_other, content_styles, content_styles_other').eq('creator_id', creator.id).maybeSingle(),
    supabase.from('creator_social_platforms').select('id, platform, profile_url, audience_count, is_primary').eq('creator_id', creator.id),
  ]);
  throwIfError(identityResult.error, 'We could not load creator identity');
  throwIfError(contentResult.error, 'We could not load content and niche details');
  throwIfError(platformsResult.error, 'We could not load social platforms');

  const platforms = (platformsResult.data || []) as SocialPlatformRecord[];
  const platformIds = platforms.map((platform) => platform.id);
  const latestSnapshots = new Map<string, SocialSnapshotRecord>();
  let instagramAnalytics = new Map<string, InstagramAnalyticsRecord>();
  const instagramTopAgeRangeCounts = new Map<string, number>();
  const instagramTopLocationCounts = new Map<string, number>();
  let facebookAnalytics = new Map<string, FacebookAnalyticsRecord>();
  const facebookTopAgeGroupCounts = new Map<string, number>();
  const facebookTopLocationCounts = new Map<string, number>();
  let youtubeAnalytics = new Map<string, YouTubeAnalyticsRecord>();

  if (platformIds.length) {
    const [snapshotResult, youtubeResult] = await Promise.all([
      supabase
        .from('creator_social_analytics_snapshots')
        .select('id, social_platform_id, platform, updated_at')
        .in('social_platform_id', platformIds)
        .eq('is_current', true)
        .order('updated_at', { ascending: false }),
      supabase.from('creator_youtube_analytics').select('social_platform_id, views, likes, shares, top_country').in('social_platform_id', platformIds),
    ]);
    const { data: snapshotData, error: snapshotError } = snapshotResult;
    throwIfError(snapshotError, 'We could not load social analytics snapshots');
    throwIfError(youtubeResult.error, 'We could not load YouTube analytics');
    youtubeAnalytics = new Map(((youtubeResult.data || []) as YouTubeAnalyticsRecord[]).map((analytics) => [analytics.social_platform_id, analytics]));

    for (const snapshot of (snapshotData || []) as SocialSnapshotRecord[]) {
      if (!latestSnapshots.has(snapshot.social_platform_id)) latestSnapshots.set(snapshot.social_platform_id, snapshot);
    }

    const snapshotIds = [...latestSnapshots.values()].map((snapshot) => snapshot.id);
    if (snapshotIds.length) {
      const [instagramResult, facebookResult, instagramTopAgeRangesResult, instagramTopLocationsResult, facebookTopAgeGroupsResult, facebookTopLocationsResult] = await Promise.all([
        supabase.from('creator_instagram_analytics').select('snapshot_id, views_all_content, net_followers, interactions, viewers_total, profile_visits, women_percentage, men_percentage').in('snapshot_id', snapshotIds),
        supabase.from('creator_facebook_analytics').select('snapshot_id, views_total, viewers, engagement_total, net_followers, women_percentage, men_percentage').in('snapshot_id', snapshotIds),
        supabase.from('creator_instagram_top_age_ranges').select('snapshot_id').in('snapshot_id', snapshotIds),
        supabase.from('creator_instagram_top_locations').select('snapshot_id').in('snapshot_id', snapshotIds),
        supabase.from('creator_facebook_top_age_groups').select('snapshot_id').in('snapshot_id', snapshotIds),
        supabase.from('creator_facebook_top_locations').select('snapshot_id').in('snapshot_id', snapshotIds),
      ]);
      throwIfError(instagramResult.error, 'We could not load Instagram analytics');
      throwIfError(facebookResult.error, 'We could not load Facebook analytics');
      throwIfError(instagramTopAgeRangesResult.error, 'We could not load Instagram top age ranges');
      throwIfError(instagramTopLocationsResult.error, 'We could not load Instagram top locations');
      throwIfError(facebookTopAgeGroupsResult.error, 'We could not load Facebook top age groups');
      throwIfError(facebookTopLocationsResult.error, 'We could not load Facebook top locations');

      instagramAnalytics = new Map(((instagramResult.data || []) as InstagramAnalyticsRecord[]).map((analytics) => [analytics.snapshot_id, analytics]));
      facebookAnalytics = new Map(((facebookResult.data || []) as FacebookAnalyticsRecord[]).map((analytics) => [analytics.snapshot_id, analytics]));
      for (const selection of instagramTopAgeRangesResult.data || []) instagramTopAgeRangeCounts.set(selection.snapshot_id, (instagramTopAgeRangeCounts.get(selection.snapshot_id) || 0) + 1);
      for (const selection of instagramTopLocationsResult.data || []) instagramTopLocationCounts.set(selection.snapshot_id, (instagramTopLocationCounts.get(selection.snapshot_id) || 0) + 1);
      for (const selection of facebookTopAgeGroupsResult.data || []) facebookTopAgeGroupCounts.set(selection.snapshot_id, (facebookTopAgeGroupCounts.get(selection.snapshot_id) || 0) + 1);
      for (const selection of facebookTopLocationsResult.data || []) facebookTopLocationCounts.set(selection.snapshot_id, (facebookTopLocationCounts.get(selection.snapshot_id) || 0) + 1);
    }
  }

  const completedByKey: Record<ProfileSectionKey, boolean> = {
    'basic-information': isBasicInformationComplete(creator),
    'creator-identity': isCreatorIdentityComplete(identityResult.data as CreatorIdentityRecord | null),
    'content-and-niche': isContentAndNicheComplete(contentResult.data as CreatorContentProfileRecord | null),
    'social-platforms': isSocialPlatformsComplete(platforms, latestSnapshots, instagramAnalytics, instagramTopAgeRangeCounts, instagramTopLocationCounts, facebookAnalytics, facebookTopAgeGroupCounts, facebookTopLocationCounts, youtubeAnalytics),
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

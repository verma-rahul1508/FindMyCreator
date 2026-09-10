import { getSupabaseClient } from '@/lib/supabase/client';

type Platform = 'Instagram' | 'Facebook' | 'YouTube';
type Account = { id: string; platform: Platform; platformName: string; profileUrl: string; username: string; audienceCount: string; isPrimary: boolean; instagramInsights?: unknown; facebookInsights?: unknown; youtubeInsights?: unknown };
type PlatformRow = { id: string; platform: string; profile_url: string; username: string | null; audience_count: number | string; is_primary: boolean };
type SnapshotRow = { id: string; social_platform_id: string; platform: string };
type InstagramAnalyticsRow = { snapshot_id: string; views_all_content: number | string | null; net_followers: number | string | null; interactions: number | string | null; viewers_total: number | string | null; profile_visits: number | string | null; women_percentage: number | string | null; men_percentage: number | string | null };
type FacebookAnalyticsRow = { snapshot_id: string; views_total: number | string | null; viewers: number | string | null; engagement_total: number | string | null; net_followers: number | string | null; women_percentage: number | string | null; men_percentage: number | string | null };
type YouTubeAnalyticsRow = { social_platform_id: string; views: number | string | null; likes: number | string | null; shares: number | string | null; top_country: string | null };
type LegacyAgeRow = { snapshot_id: string; range_label: string; percentage: number | string };
type LegacyLocationRow = { snapshot_id: string; location_kind: string; location_name: string; percentage: number | string };
type FacebookBreakdownRow = { snapshot_id: string; breakdown_kind: string; label: string; count_value: number | string | null; percentage_value: number | string | null };
type InstagramAgeSelectionRow = { snapshot_id: string; age_range: string };
type InstagramLocationSelectionRow = { snapshot_id: string; location_name: string };
type FacebookAgeSelectionRow = { snapshot_id: string; age_group: string };
type FacebookLocationSelectionRow = { snapshot_id: string; location_name: string };

const PLATFORM_LABELS = { instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube' } as const;

function platformLabel(value: string): Platform {
  const label = PLATFORM_LABELS[value as keyof typeof PLATFORM_LABELS];
  if (!label) throw new Error('Unsupported social platform.');
  return label;
}

function text(value: number | string | null | undefined) {
  return value === null || value === undefined ? '' : String(value);
}

function rowsForSnapshot<T extends { snapshot_id: string }>(rows: T[], snapshotId: string) {
  return rows.filter((row) => row.snapshot_id === snapshotId);
}

function throwIfError(error: { message: string } | null, message: string) {
  if (error) throw new Error(message);
}

export async function saveSocialAccounts(creatorId: string, accounts: Account[]) {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Sign in to save your social platforms.');
  void creatorId;
  const { error } = await supabase.rpc('save_creator_social_platforms', { p_accounts: accounts });
  throwIfError(error, 'We could not save your social platforms. Please try again.');
}

export async function loadSocialAccounts(creatorId: string): Promise<Account[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Sign in to load your social platforms.');

  const { data: platformData, error: platformError } = await supabase.from('creator_social_platforms').select('id, platform, profile_url, username, audience_count, is_primary').eq('creator_id', creatorId);
  throwIfError(platformError, 'We could not load your social platforms.');
  const platforms = (platformData || []) as PlatformRow[];
  if (!platforms.length) return [];
  const platformIds = platforms.map((platform) => platform.id);

  const { data: snapshotData, error: snapshotError } = await supabase.from('creator_social_analytics_snapshots').select('id, social_platform_id, platform, updated_at').in('social_platform_id', platformIds).eq('is_current', true).order('updated_at', { ascending: false });
  throwIfError(snapshotError, 'We could not load your social analytics snapshots.');
  const latestSnapshots = new Map<string, SnapshotRow>();
  for (const snapshot of (snapshotData || []) as SnapshotRow[]) if (!latestSnapshots.has(snapshot.social_platform_id)) latestSnapshots.set(snapshot.social_platform_id, snapshot);
  const snapshotIds = [...latestSnapshots.values()].map((snapshot) => snapshot.id);

  const [instagramResult, facebookResult, youtubeResult, ageResult, locationResult, facebookBreakdownResult, instagramAgeResult, instagramLocationResult, facebookAgeResult, facebookLocationResult] = await Promise.all([
    supabase.from('creator_instagram_analytics').select('snapshot_id, views_all_content, net_followers, interactions, viewers_total, profile_visits, women_percentage, men_percentage').in('snapshot_id', snapshotIds),
    supabase.from('creator_facebook_analytics').select('snapshot_id, views_total, viewers, engagement_total, net_followers, women_percentage, men_percentage').in('snapshot_id', snapshotIds),
    supabase.from('creator_youtube_analytics').select('social_platform_id, views, likes, shares, top_country').in('social_platform_id', platformIds),
    supabase.from('creator_social_audience_age_ranges').select('snapshot_id, range_label, percentage, sort_order').in('snapshot_id', snapshotIds).order('sort_order'),
    supabase.from('creator_social_audience_locations').select('snapshot_id, location_kind, location_name, percentage, sort_order').in('snapshot_id', snapshotIds).order('sort_order'),
    supabase.from('creator_facebook_analytics_breakdowns').select('snapshot_id, breakdown_kind, label, count_value, percentage_value, sort_order').in('snapshot_id', snapshotIds).order('sort_order'),
    supabase.from('creator_instagram_top_age_ranges').select('snapshot_id, age_range, display_order').in('snapshot_id', snapshotIds).order('display_order'),
    supabase.from('creator_instagram_top_locations').select('snapshot_id, location_name, display_order').in('snapshot_id', snapshotIds).order('display_order'),
    supabase.from('creator_facebook_top_age_groups').select('snapshot_id, age_group').in('snapshot_id', snapshotIds),
    supabase.from('creator_facebook_top_locations').select('snapshot_id, location_name, display_order').in('snapshot_id', snapshotIds).order('display_order'),
  ]);
  throwIfError(instagramResult.error, 'We could not load your saved Instagram analytics.');
  throwIfError(facebookResult.error, 'We could not load your saved Facebook analytics.');
  throwIfError(youtubeResult.error, 'We could not load your saved YouTube analytics.');
  throwIfError(ageResult.error, 'We could not load your saved audience age ranges.');
  throwIfError(locationResult.error, 'We could not load your saved audience locations.');
  throwIfError(facebookBreakdownResult.error, 'We could not load your saved Facebook breakdowns.');
  throwIfError(instagramAgeResult.error, 'We could not load your saved Instagram age selections.');
  throwIfError(instagramLocationResult.error, 'We could not load your saved Instagram location selections.');
  throwIfError(facebookAgeResult.error, 'We could not load your saved Facebook age selection.');
  throwIfError(facebookLocationResult.error, 'We could not load your saved Facebook location selections.');

  const instagramBySnapshot = new Map(((instagramResult.data || []) as InstagramAnalyticsRow[]).map((row) => [row.snapshot_id, row]));
  const facebookBySnapshot = new Map(((facebookResult.data || []) as FacebookAnalyticsRow[]).map((row) => [row.snapshot_id, row]));
  const youtubeByPlatform = new Map(((youtubeResult.data || []) as YouTubeAnalyticsRow[]).map((row) => [row.social_platform_id, row]));
  const legacyAges = (ageResult.data || []) as LegacyAgeRow[];
  const legacyLocations = (locationResult.data || []) as LegacyLocationRow[];
  const facebookBreakdowns = (facebookBreakdownResult.data || []) as FacebookBreakdownRow[];
  const instagramAgeSelections = (instagramAgeResult.data || []) as InstagramAgeSelectionRow[];
  const instagramLocationSelections = (instagramLocationResult.data || []) as InstagramLocationSelectionRow[];
  const facebookAgeSelections = (facebookAgeResult.data || []) as FacebookAgeSelectionRow[];
  const facebookLocationSelections = (facebookLocationResult.data || []) as FacebookLocationSelectionRow[];

  return platforms.map((platformRow) => {
    const platform = platformLabel(platformRow.platform);
    const account: Account = { id: platformRow.id, platform, platformName: platform, profileUrl: platformRow.profile_url, username: platformRow.username || '', audienceCount: text(platformRow.audience_count), isPrimary: platformRow.is_primary };
    if (platform === 'YouTube') {
      const analytics = youtubeByPlatform.get(platformRow.id);
      return analytics ? { ...account, youtubeInsights: { views: text(analytics.views), likes: text(analytics.likes), shares: text(analytics.shares), topCountry: analytics.top_country || '' } } : account;
    }
    const snapshot = latestSnapshots.get(platformRow.id);
    if (!snapshot) return account;
    if (platform === 'Instagram') {
      const analytics = instagramBySnapshot.get(snapshot.id);
      if (!analytics) return account;
      const selectedAges = rowsForSnapshot(instagramAgeSelections, snapshot.id).map((selection) => selection.age_range);
      const selectedCities = rowsForSnapshot(instagramLocationSelections, snapshot.id).map((selection) => selection.location_name);
      const fallbackAges = rowsForSnapshot(legacyAges, snapshot.id).sort((left, right) => Number(right.percentage) - Number(left.percentage)).slice(0, 2).map((selection) => selection.range_label);
      const fallbackCities = rowsForSnapshot(legacyLocations, snapshot.id).filter((selection) => selection.location_kind === 'city').sort((left, right) => Number(right.percentage) - Number(left.percentage)).slice(0, 5).map((selection) => selection.location_name);
      return { ...account, instagramInsights: { period: '30', overview: { views: text(analytics.views_all_content), netFollowers: text(analytics.net_followers), interactions: text(analytics.interactions), viewersTotal: text(analytics.viewers_total), profileVisits: text(analytics.profile_visits) }, audience: { women: text(analytics.women_percentage), men: text(analytics.men_percentage), topAgeRanges: selectedAges.length ? selectedAges : fallbackAges, topCities: selectedCities.length ? selectedCities : fallbackCities } } };
    }
    const analytics = facebookBySnapshot.get(snapshot.id);
    if (!analytics) return account;
    const breakdowns = rowsForSnapshot(facebookBreakdowns, snapshot.id);
    const audienceAges = rowsForSnapshot(legacyAges, snapshot.id).map((selection) => ({ id: `${snapshot.id}-${selection.range_label}`, name: selection.range_label, value: text(selection.percentage) }));
    const audienceLocations = rowsForSnapshot(legacyLocations, snapshot.id);
    return { ...account, facebookInsights: { period: '28', overview: { viewsTotal: text(analytics.views_total), viewers: text(analytics.viewers), mediaTypes: breakdowns.filter((item) => item.breakdown_kind === 'view_media_type').map((item) => ({ id: `${snapshot.id}-${item.label}`, mediaType: item.label, percentage: text(item.percentage_value) })), viewType: { views: '', threeSecondViews: '', oneMinuteViews: '' }, viewerType: { followers: '', nonFollowers: '' } }, engagement: { total: text(analytics.engagement_total), mediaTypes: breakdowns.filter((item) => item.breakdown_kind === 'engagement_media_type').map((item) => ({ id: `${snapshot.id}-${item.label}`, mediaType: item.label, count: text(item.count_value) })), interactionTypes: breakdowns.filter((item) => item.breakdown_kind === 'interaction_type').map((item) => ({ id: `${snapshot.id}-${item.label}`, name: item.label, value: text(item.count_value) })), newConversations: '' }, audience: { netFollowers: text(analytics.net_followers), women: text(analytics.women_percentage), men: text(analytics.men_percentage), ageGroups: audienceAges, locations: { countries: audienceLocations.filter((item) => item.location_kind === 'country').map((item) => ({ id: `${snapshot.id}-${item.location_name}`, name: item.location_name, percentage: text(item.percentage) })), cities: audienceLocations.filter((item) => item.location_kind === 'city').map((item) => ({ id: `${snapshot.id}-${item.location_name}`, name: item.location_name, percentage: text(item.percentage) })) }, topAgeGroup: rowsForSnapshot(facebookAgeSelections, snapshot.id)[0]?.age_group || '', topCities: rowsForSnapshot(facebookLocationSelections, snapshot.id).map((selection) => selection.location_name) } } };
  });
}

import { getSupabaseClient } from '@/lib/supabase/client';

type Platform = 'Instagram' | 'Facebook' | 'YouTube';
type Account = { id: string; platform: Platform; platformName: string; profileUrl: string; username: string; audienceCount: string; isPrimary: boolean; instagramInsights?: any; facebookInsights?: any };

const dbPlatform = (platform: Platform) => platform.toLowerCase();
const count = (value: string) => { const valueText = value.trim(); if (!/^\d+$/.test(valueText)) throw new Error('Enter non-negative whole-number counts.'); return valueText; };
const percentage = (value: string) => { const valueText = value.trim(); if (!valueText) return null; const numericValue = Number(valueText); if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 100) throw new Error('Enter percentages from 0 to 100.'); return valueText; };
const optionalCount = (value?: string) => !value?.trim() ? null : count(value);

async function replaceAudienceRows(snapshotId: string, insights: any) {
  const supabase = getSupabaseClient(); if (!supabase) throw new Error('Sign in to save your social platforms.');
  const ageRows = Object.entries(insights.audience.ages || {}).filter(([, value]) => String(value).trim()).map(([range_label, value], sort_order) => ({ snapshot_id: snapshotId, range_label, percentage: percentage(String(value)), sort_order }));
  const locationRows = (['countries', 'cities'] as const).flatMap((key) => (insights.audience.locations?.[key] || []).filter((item: any) => item.name?.trim() && item.percentage?.trim()).map((item: any, sort_order: number) => ({ snapshot_id: snapshotId, location_kind: key === 'countries' ? 'country' : 'city', location_name: item.name.trim(), percentage: percentage(item.percentage), sort_order })));
  const [{ error: ageDeleteError }, { error: locationDeleteError }] = await Promise.all([supabase.from('creator_social_audience_age_ranges').delete().eq('snapshot_id', snapshotId), supabase.from('creator_social_audience_locations').delete().eq('snapshot_id', snapshotId)]);
  if (ageDeleteError || locationDeleteError) throw new Error('We could not update audience details.');
  if (ageRows.length) { const { error } = await supabase.from('creator_social_audience_age_ranges').insert(ageRows); if (error) throw new Error('We could not save age ranges.'); }
  if (locationRows.length) { const { error } = await supabase.from('creator_social_audience_locations').insert(locationRows); if (error) throw new Error('We could not save locations.'); }
}

async function currentSnapshot(platformId: string, platform: string, periodDays: string) {
  const supabase = getSupabaseClient(); if (!supabase) throw new Error('Sign in to save your social platforms.');
  const { data: existing, error: lookupError } = await supabase.from('creator_social_analytics_snapshots').select('id').eq('social_platform_id', platformId).eq('period_days', Number(periodDays)).eq('is_current', true).maybeSingle();
  if (lookupError) throw new Error('We could not load analytics snapshots.');
  if (existing) return existing.id as string;
  const { data, error } = await supabase.from('creator_social_analytics_snapshots').insert({ social_platform_id: platformId, platform, period_days: Number(periodDays), is_current: true }).select('id').single();
  if (error || !data) throw new Error('We could not create an analytics snapshot.');
  return data.id as string;
}

async function saveInstagram(platformId: string, account: Account) {
  const insights = account.instagramInsights; const snapshotId = await currentSnapshot(platformId, 'instagram', insights.period);
  const overview = insights.overview; const audience = insights.audience; const supabase = getSupabaseClient(); if (!supabase) throw new Error('Sign in to save your social platforms.');
  const payload = { snapshot_id: snapshotId, platform: 'instagram', views_all_content: optionalCount(overview.views), overview_followers_percentage: percentage(overview.followersPercent), overview_non_followers_percentage: percentage(overview.nonFollowersPercent), net_followers: optionalCount(overview.netFollowers), interactions: optionalCount(overview.interactions), viewers_total: optionalCount(overview.viewersTotal), posts_views: optionalCount(overview.postsViews), reels_views: optionalCount(overview.reelsViews), stories_views: optionalCount(overview.storiesViews), live_videos_views: optionalCount(overview.liveVideosViews), all_interactions: optionalCount(overview.allInteractions), posts_interactions: optionalCount(overview.postsInteractions), reels_interactions: optionalCount(overview.reelsInteractions), stories_interactions: optionalCount(overview.storiesInteractions), live_videos_interactions: optionalCount(overview.liveVideosInteractions), profile_visits: optionalCount(overview.profileVisits), bio_link_taps: optionalCount(overview.bioLinkTaps), business_address_taps: optionalCount(overview.businessAddressTaps), audience_followers: optionalCount(audience.followers), follower_growth: optionalCount(audience.followerGrowth), women_percentage: percentage(audience.women), men_percentage: percentage(audience.men) };
  const { error } = await supabase.from('creator_instagram_analytics').upsert(payload, { onConflict: 'snapshot_id' }); if (error) throw new Error('We could not save Instagram Insights.');
  await replaceAudienceRows(snapshotId, insights);
}

async function saveFacebook(platformId: string, account: Account) {
  const insights = account.facebookInsights; const snapshotId = await currentSnapshot(platformId, 'facebook', insights.period); const supabase = getSupabaseClient(); if (!supabase) throw new Error('Sign in to save your social platforms.');
  const overview = insights.overview; const engagement = insights.engagement; const audience = insights.audience;
  const payload = { snapshot_id: snapshotId, platform: 'facebook', views_total: optionalCount(overview.viewsTotal), viewers: optionalCount(overview.viewers), view_type_views: optionalCount(overview.viewType.views), view_type_three_second_views: optionalCount(overview.viewType.threeSecondViews), view_type_one_minute_views: optionalCount(overview.viewType.oneMinuteViews), overview_viewer_followers_percentage: percentage(overview.viewerType.followers), overview_viewer_non_followers_percentage: percentage(overview.viewerType.nonFollowers), engagement_total: optionalCount(engagement.total), engagement_viewer_followers_percentage: percentage(engagement.viewerType.followers), engagement_viewer_non_followers_percentage: percentage(engagement.viewerType.nonFollowers), new_conversations: optionalCount(engagement.newConversations), net_followers: optionalCount(audience.netFollowers), women_percentage: percentage(audience.women), men_percentage: percentage(audience.men) };
  const { error } = await supabase.from('creator_facebook_analytics').upsert(payload, { onConflict: 'snapshot_id' }); if (error) throw new Error('We could not save Facebook Analytics.');
  await replaceAudienceRows(snapshotId, insights);
  const rows = [
    ...overview.mediaTypes.filter((item: any) => item.mediaType.trim() && item.percentage.trim()).map((item: any, sort_order: number) => ({ snapshot_id: snapshotId, breakdown_kind: 'view_media_type', label: item.mediaType.trim(), percentage_value: percentage(item.percentage), count_value: null, sort_order })),
    ...engagement.mediaTypes.filter((item: any) => item.mediaType.trim() && item.count.trim()).map((item: any, sort_order: number) => ({ snapshot_id: snapshotId, breakdown_kind: 'engagement_media_type', label: item.mediaType.trim(), count_value: optionalCount(item.count), percentage_value: null, sort_order })),
    ...engagement.interactionTypes.filter((item: any) => item.name.trim() && item.value.trim()).map((item: any, sort_order: number) => ({ snapshot_id: snapshotId, breakdown_kind: 'interaction_type', label: item.name.trim(), count_value: optionalCount(item.value), percentage_value: null, sort_order })),
    ...insights.traffic.filter((item: any) => item.name.trim() && item.value.trim()).map((item: any, sort_order: number) => ({ snapshot_id: snapshotId, breakdown_kind: 'traffic', label: item.name.trim(), percentage_value: percentage(item.value), count_value: null, sort_order })),
    ...insights.source.filter((item: any) => item.name.trim() && item.value.trim()).map((item: any, sort_order: number) => ({ snapshot_id: snapshotId, breakdown_kind: 'source', label: item.name.trim(), percentage_value: percentage(item.value), count_value: null, sort_order })),
  ];
  const { error: deleteError } = await supabase.from('creator_facebook_analytics_breakdowns').delete().eq('snapshot_id', snapshotId); if (deleteError) throw new Error('We could not update Facebook breakdowns.');
  if (rows.length) { const { error: insertError } = await supabase.from('creator_facebook_analytics_breakdowns').insert(rows); if (insertError) throw new Error('We could not save Facebook breakdowns.'); }
}

export async function saveSocialAccounts(creatorId: string, accounts: Account[]) {
  const supabase = getSupabaseClient(); if (!supabase) throw new Error('Sign in to save your social platforms.');
  void creatorId;
  const { error } = await supabase.rpc('save_creator_social_platforms', { p_accounts: accounts });
  if (error) throw new Error('We could not save your social platforms. Please try again.');
}

export async function loadSocialAccounts(creatorId: string): Promise<Account[]> {
  const supabase = getSupabaseClient(); if (!supabase) throw new Error('Sign in to load your social platforms.');
  const { data: platforms, error } = await supabase.from('creator_social_platforms').select('*').eq('creator_id', creatorId); if (error) throw new Error('We could not load your social platforms.');
  if (!platforms?.length) return [];
  const ids = platforms.map((row: any) => row.id);
  const { data: snapshots, error: snapshotsError } = await supabase.from('creator_social_analytics_snapshots').select('*').in('social_platform_id', ids).eq('is_current', true).order('updated_at', { ascending: false });
  if (snapshotsError) throw new Error('We could not load your social analytics snapshots.');
  const latest = new Map<string, any>(); (snapshots || []).forEach((row: any) => { if (!latest.has(row.social_platform_id)) latest.set(row.social_platform_id, row); });
  const snapshotIds = [...latest.values()].map((row) => row.id); if (!snapshotIds.length) return platforms.map((row: any) => ({ id: row.id, platform: row.platform[0].toUpperCase() + row.platform.slice(1), platformName: row.platform[0].toUpperCase() + row.platform.slice(1), profileUrl: row.profile_url, username: row.username || '', audienceCount: String(row.audience_count), isPrimary: row.is_primary } as Account));
  const [instagram, facebook, ages, locations, breakdowns] = await Promise.all([
    supabase.from('creator_instagram_analytics').select('*').in('snapshot_id', snapshotIds), supabase.from('creator_facebook_analytics').select('*').in('snapshot_id', snapshotIds), supabase.from('creator_social_audience_age_ranges').select('*').in('snapshot_id', snapshotIds).order('sort_order'), supabase.from('creator_social_audience_locations').select('*').in('snapshot_id', snapshotIds).order('sort_order'), supabase.from('creator_facebook_analytics_breakdowns').select('*').in('snapshot_id', snapshotIds).order('sort_order'),
  ]);
  if (instagram.error || facebook.error || ages.error || locations.error || breakdowns.error) throw new Error('We could not load your saved analytics.');
  const ig = new Map((instagram.data || []).map((row: any) => [row.snapshot_id, row])); const fb = new Map((facebook.data || []).map((row: any) => [row.snapshot_id, row]));
  const bySnapshot = (rows: any[], id: string) => rows.filter((row) => row.snapshot_id === id);
  return platforms.map((row: any) => { const platform = row.platform[0].toUpperCase() + row.platform.slice(1) as Platform; const snapshot = latest.get(row.id); const base: Account = { id: row.id, platform, platformName: platform, profileUrl: row.profile_url, username: row.username || '', audienceCount: String(row.audience_count), isPrimary: row.is_primary };
    if (!snapshot || platform === 'YouTube') return base;
    const locationData = bySnapshot(locations.data || [], snapshot.id); const ageData = bySnapshot(ages.data || [], snapshot.id); const audience = { locations: { countries: locationData.filter((item) => item.location_kind === 'country').map((item) => ({ id: item.id, name: item.location_name, percentage: String(item.percentage) })), cities: locationData.filter((item) => item.location_kind === 'city').map((item) => ({ id: item.id, name: item.location_name, percentage: String(item.percentage) })) } };
    if (platform === 'Instagram') { const data = ig.get(snapshot.id); if (!data) return base; return { ...base, instagramInsights: { period: String(snapshot.period_days), overview: { views: String(data.views_all_content ?? ''), followersPercent: String(data.overview_followers_percentage ?? ''), nonFollowersPercent: String(data.overview_non_followers_percentage ?? ''), netFollowers: String(data.net_followers ?? ''), interactions: String(data.interactions ?? ''), viewersTotal: String(data.viewers_total ?? ''), postsViews: String(data.posts_views ?? ''), reelsViews: String(data.reels_views ?? ''), storiesViews: String(data.stories_views ?? ''), liveVideosViews: String(data.live_videos_views ?? ''), allInteractions: String(data.all_interactions ?? ''), postsInteractions: String(data.posts_interactions ?? ''), reelsInteractions: String(data.reels_interactions ?? ''), storiesInteractions: String(data.stories_interactions ?? ''), liveVideosInteractions: String(data.live_videos_interactions ?? ''), profileVisits: String(data.profile_visits ?? ''), bioLinkTaps: String(data.bio_link_taps ?? ''), businessAddressTaps: String(data.business_address_taps ?? '') }, audience: { ...audience, followers: String(data.audience_followers ?? ''), followerGrowth: String(data.follower_growth ?? ''), women: String(data.women_percentage ?? ''), men: String(data.men_percentage ?? ''), ages: Object.fromEntries(ageData.map((item) => [item.range_label, String(item.percentage)])) } } }; }
    const data = fb.get(snapshot.id); if (!data) return base; const bs = bySnapshot(breakdowns.data || [], snapshot.id); const metrics = (kind: string) => bs.filter((item) => item.breakdown_kind === kind).map((item) => ({ id: item.id, name: item.label, value: String(item.count_value ?? item.percentage_value) })); return { ...base, facebookInsights: { period: String(snapshot.period_days), overview: { viewsTotal: String(data.views_total ?? ''), viewers: String(data.viewers ?? ''), mediaTypes: bs.filter((item) => item.breakdown_kind === 'view_media_type').map((item) => ({ id: item.id, mediaType: item.label, percentage: String(item.percentage_value) })), viewType: { views: String(data.view_type_views ?? ''), threeSecondViews: String(data.view_type_three_second_views ?? ''), oneMinuteViews: String(data.view_type_one_minute_views ?? '') }, viewerType: { followers: String(data.overview_viewer_followers_percentage ?? ''), nonFollowers: String(data.overview_viewer_non_followers_percentage ?? '') } }, engagement: { total: String(data.engagement_total ?? ''), mediaTypes: bs.filter((item) => item.breakdown_kind === 'engagement_media_type').map((item) => ({ id: item.id, mediaType: item.label, count: String(item.count_value) })), interactionTypes: metrics('interaction_type'), viewerType: { followers: String(data.engagement_viewer_followers_percentage ?? ''), nonFollowers: String(data.engagement_viewer_non_followers_percentage ?? '') }, newConversations: String(data.new_conversations ?? '') }, audience: { ...audience, netFollowers: String(data.net_followers ?? ''), women: String(data.women_percentage ?? ''), men: String(data.men_percentage ?? ''), ageGroups: ageData.map((item) => ({ id: item.id, name: item.range_label, value: String(item.percentage) })) }, traffic: metrics('traffic'), source: metrics('source') } };
  });
}

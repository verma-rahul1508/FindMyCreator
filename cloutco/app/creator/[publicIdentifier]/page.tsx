"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthAwareLogo } from "@/components/auth-aware-logo";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  CompactSecondaryPlatformCard,
  PrimaryPlatformCard,
  ProfileSection,
  ProfileSummaryCard,
  SectionHeading,
  type ContentDraft,
  type Identity,
  type SocialAccount,
} from "@/app/profile/preview/page";

type PublicAudienceItem = {
  label?: string;
  name?: string;
  percentage?: number | string;
};
type PublicInsights = {
  periodDays?: number | string;
  views?: number | string;
  viewers?: number | string;
  interactions?: number | string;
  netFollowers?: number | string;
  followerGrowth?: number | string;
  womenPercentage?: number | string;
  menPercentage?: number | string;
  postsViews?: number | string;
  reelsViews?: number | string;
  storiesViews?: number | string;
  liveVideosViews?: number | string;
  mediaTypes?: Array<{ mediaType?: string; percentage?: number | string }>;
  ageRanges?: PublicAudienceItem[];
  countries?: PublicAudienceItem[];
  cities?: PublicAudienceItem[];
  topAge?: string;
  topCity?: string;
};
type PublicSocialAccount = {
  platform: string;
  profileUrl?: string;
  username?: string;
  audienceCount?: number | string;
  isPrimary?: boolean;
  insights?: PublicInsights;
};
type PublicProfile = {
  displayName?: string;
  username?: string;
  bio?: string;
  languages?: string[];
  creatorType?: string;
  city?: string;
  content?: {
    primaryNiche?: string;
    otherNiches?: string[];
    otherNichesOther?: string;
    contentFormats?: string[];
    contentFormatsOther?: string;
    contentStyles?: string[];
    contentStylesOther?: string;
  };
  socialAccounts?: PublicSocialAccount[];
};

const creatorTypeLabels: Record<string, string> = {
  content_creator: "Content Creator",
  influencer: "Influencer",
  ugc_creator: "UGC Creator",
  digital_creator: "Digital Creator",
};
const asText = (value: number | string | undefined) =>
  value === undefined || value === null ? "" : String(value);
const normalizeOther = (values: string[] | undefined, other?: string) =>
  (values || [])
    .map((value) => (value === "Other" ? other?.trim() || "" : value))
    .filter(Boolean);

function toSocialAccount(
  account: PublicSocialAccount,
  index: number,
): SocialAccount {
  const platform = account.platform.trim();
  const key = platform.toLowerCase();
  const insights = account.insights;
  const audience = {
    locations: {
      countries: (insights?.countries || []).map((item, itemIndex) => ({
        id: `country-${index}-${itemIndex}`,
        name: item.name || "",
        percentage: asText(item.percentage),
      })),
      cities: (insights?.cities || []).map((item, itemIndex) => ({
        id: `city-${index}-${itemIndex}`,
        name: item.name || "",
        percentage: asText(item.percentage),
      })),
    },
  };
  const base: SocialAccount = {
    id: `public-${index}-${platform}`,
    platform,
    platformName:
      key === "youtube"
        ? "YouTube"
        : key === "instagram"
          ? "Instagram"
          : key === "facebook"
            ? "Facebook"
            : platform,
    profileUrl: account.profileUrl || "",
    username: account.username || "",
    audienceCount: asText(account.audienceCount),
    isPrimary: Boolean(account.isPrimary),
  };
  if (key === "instagram")
    return {
      ...base,
      instagramInsights: {
        period: asText(insights?.periodDays),
        overview: {
          views: asText(insights?.views),
          viewersTotal: asText(insights?.viewers),
          interactions: asText(insights?.interactions),
          postsViews: asText(insights?.postsViews),
          reelsViews: asText(insights?.reelsViews),
          storiesViews: asText(insights?.storiesViews),
          liveVideosViews: asText(insights?.liveVideosViews),
        },
        audience: {
          ...audience,
          followerGrowth: asText(insights?.followerGrowth),
          women: asText(insights?.womenPercentage),
          men: asText(insights?.menPercentage),
          ages: Object.fromEntries(
            (insights?.ageRanges || [])
              .filter((item) => item.label)
              .map((item) => [item.label as string, asText(item.percentage)]),
          ),
          topAgeRanges: insights?.topAge ? [insights.topAge] : [],
          topCities: insights?.topCity ? [insights.topCity] : [],
        },
      },
    };
  if (key === "facebook")
    return {
      ...base,
      facebookInsights: {
        period: asText(insights?.periodDays),
        overview: {
          viewsTotal: asText(insights?.views),
          mediaTypes: (insights?.mediaTypes || []).map((item, itemIndex) => ({
            id: `media-${index}-${itemIndex}`,
            mediaType: item.mediaType || "",
            percentage: asText(item.percentage),
          })),
        },
        engagement: { total: asText(insights?.interactions) },
        audience: {
          ...audience,
          netFollowers: asText(insights?.netFollowers),
          women: asText(insights?.womenPercentage),
          men: asText(insights?.menPercentage),
          ageGroups: (insights?.ageRanges || []).map((item, itemIndex) => ({
            id: `age-${index}-${itemIndex}`,
            name: item.label || "",
            value: asText(item.percentage),
          })),
          topAgeGroup: insights?.topAge || "",
          topCities: insights?.topCity ? [insights.topCity] : [],
        },
      },
    };
  return base;
}

export default function PublicCreatorProfilePage() {
  const params = useParams<{ publicIdentifier: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = getSupabaseClient();
      if (!supabase || !params.publicIdentifier) {
        setLoadError(true);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("get_public_creator_profile", {
        p_public_profile_id: params.publicIdentifier,
      });
      if (error || !data) {
        setLoadError(true);
        setLoading(false);
        return;
      }
      let signedPhotoUrl = "";
      try {
        const photoResponse = await fetch(
          `/api/creator/${encodeURIComponent(params.publicIdentifier)}/photo`,
          { cache: "no-store" },
        );
        if (photoResponse.ok) {
          const photo = (await photoResponse.json()) as { url?: unknown };
          if (typeof photo.url === "string") signedPhotoUrl = photo.url;
        }
      } catch {
        /* Preserve the initials fallback when the photo is unavailable. */
      }
      setProfile(data as PublicProfile);
      setPhotoUrl(signedPhotoUrl);
      setLoading(false);
    };
    void loadProfile();
  }, [params.publicIdentifier]);

  if (loading)
    return (
      <main className="grid min-h-screen place-items-center bg-[#fbfaff] text-sm text-[#5b6272]">
        Loading your profile preview...
      </main>
    );
  if (loadError || !profile)
    return (
      <main className="grid min-h-screen place-items-center bg-[#fbfaff] px-6 text-center">
        <div className="max-w-md">
          <h1 className="text-2xl font-semibold tracking-[-0.05em] text-black">
            We couldn&apos;t load this creator profile
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#626a7a]">
            The link may be incorrect or the profile is no longer available.
          </p>
        </div>
      </main>
    );

  const displayName = profile.displayName?.trim() || "Creator";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const identity: Identity = {
    profile_photo_url: null,
    display_name: profile.displayName || null,
    username: profile.username || null,
    bio: profile.bio || null,
    languages: profile.languages || [],
    creator_type:
      profile.creatorType && creatorTypeLabels[profile.creatorType]
        ? profile.creatorType
        : profile.creatorType
          ? "other"
          : null,
    creator_type_other:
      profile.creatorType && creatorTypeLabels[profile.creatorType]
        ? null
        : profile.creatorType || null,
  };
  const content: ContentDraft = {
    primary: profile.content?.primaryNiche || "",
    otherNiches: normalizeOther(
      profile.content?.otherNiches,
      profile.content?.otherNichesOther,
    ),
    contentFormats: normalizeOther(
      profile.content?.contentFormats,
      profile.content?.contentFormatsOther,
    ),
    contentStyles: normalizeOther(
      profile.content?.contentStyles,
      profile.content?.contentStylesOther,
    ),
  };
  const primaryNiche = content.primary || "";
  const otherNiches = content.otherNiches || [];
  const formats = content.contentFormats || [];
  const styles = content.contentStyles || [];
  const hasContent = Boolean(primaryNiche && formats.length && styles.length);
  const creatorType = profile.creatorType
    ? creatorTypeLabels[profile.creatorType] || profile.creatorType
    : "";
  const socialAccounts = (profile.socialAccounts || []).map(toSocialAccount);
  const primarySocialAccount = socialAccounts.find(
    (account) => account.isPrimary,
  );
  const secondarySocialAccounts = primarySocialAccount
    ? socialAccounts.filter((account) => account.id !== primarySocialAccount.id)
    : socialAccounts;

  return (
    <main className="min-h-screen bg-[#fbfaff] px-3 py-3 text-[#19171d] sm:px-5 sm:py-5">
      <div className="mx-auto max-w-[1180px] overflow-hidden rounded-xl border border-[#ebe7f0] bg-white shadow-[0_12px_34px_rgba(60,42,90,0.04)]">
        <div className="px-7 pt-5 sm:px-9">
          <AuthAwareLogo ariaLabel="CloutCo home" />
        </div>
        <div className="mt-3 px-7 sm:px-9">
          <ProfileSummaryCard
            displayName={displayName}
            initials={initials}
            photoUrl={photoUrl}
            identity={identity}
            creatorType={creatorType}
            creatorLocation={profile.city?.trim() || ""}
            primaryNiche={primaryNiche}
            otherNiches={otherNiches}
            formats={formats}
            styles={styles}
            hasContent={hasContent}
            portraitPanel
          />
        </div>
        <div className="px-7 sm:px-9">
          <ProfileSection>
            <SectionHeading
              eyebrow="Social Presence"
              title="Where I create"
              editLabel=""
            />
            <div className="mt-7 min-w-0">
              {socialAccounts.length ? (
                primarySocialAccount ? (
                  <div className="flex flex-col gap-4">
                    <PrimaryPlatformCard account={primarySocialAccount} />
                    {secondarySocialAccounts.length ? (
                      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2">
                        {secondarySocialAccounts.map((account) => (
                          <CompactSecondaryPlatformCard
                            key={account.id}
                            account={account}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid auto-rows-fr gap-4 sm:grid-cols-2">
                    {socialAccounts.map((account) => (
                      <CompactSecondaryPlatformCard
                        key={account.id}
                        account={account}
                      />
                    ))}
                  </div>
                )
              ) : (
                <p className="text-sm leading-6 text-[#686270]">
                  Social platforms have not been added yet.
                </p>
              )}
            </div>
          </ProfileSection>
        </div>
      </div>
    </main>
  );
}

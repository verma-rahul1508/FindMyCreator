export const profileSectionKeys = [
  'basic-information',
  'creator-identity',
  'content-and-niche',
  'social-platforms',
  'portfolio',
] as const;

export type ProfileSectionKey = (typeof profileSectionKeys)[number];

export type ProfileSection = {
  key: ProfileSectionKey;
  title: string;
  route: string | null;
  required: boolean;
};

export const profileSections: ProfileSection[] = [
  { key: 'basic-information', title: 'Basic Information', route: null, required: true },
  { key: 'creator-identity', title: 'Creator Identity', route: '/profile/identity', required: true },
  { key: 'content-and-niche', title: 'Content & Niche', route: '/profile/content', required: true },
  { key: 'social-platforms', title: 'Social Platforms', route: '/profile/social', required: true },
  { key: 'portfolio', title: 'Portfolio', route: '/profile/portfolio', required: true },
];

export function getNextProfileRoute(completedSections: Partial<Record<ProfileSectionKey | string, boolean>>) {
  const nextSection = profileSections.find(
    (section) => section.required && !(completedSections[section.key] ?? completedSections[section.title]),
  );
  return nextSection?.route ?? '/profile';
}

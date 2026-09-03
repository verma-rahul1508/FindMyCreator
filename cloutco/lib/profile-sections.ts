export type ProfileSection = {
  title: string;
  route?: string;
  required: boolean;
};

export const profileSections: ProfileSection[] = [
  { title: 'Basic Information', required: true },
  { title: 'Creator Identity', route: '/profile/identity', required: true },
  { title: 'Content & Niche', route: '/profile/content', required: true },
  { title: 'Social Platforms', route: '/profile/social', required: true },
  { title: 'Audience', route: '/profile/audience', required: true },
  { title: 'Portfolio', route: '/profile/portfolio', required: true },
  { title: 'Performance', route: '/profile/performance', required: false },
];

export function getNextProfileRoute(completedSections: Record<string, boolean>) {
  const nextSection = profileSections.find((section) => section.required && !completedSections[section.title]);
  return nextSection?.route ?? '/profile';
}

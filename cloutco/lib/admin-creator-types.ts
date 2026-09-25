export type AdminCreatorPlatform = {
  platform: 'instagram' | 'facebook' | 'youtube';
  audience_count: number | string;
  is_primary: boolean;
  profile_url: string | null;
};

export type AdminCreatorListRow = {
  creator_id: string;
  profile_photo_url: string | null;
  display_name: string | null;
  username: string | null;
  full_name: string;
  phone_number: string | null;
  current_city: string | null;
  primary_niche: string | null;
  primary_niche_other: string | null;
  creator_type: string | null;
  platforms: AdminCreatorPlatform[];
  status: 'pending' | 'active' | 'rejected';
  created_at: string;
  completed_sections: number;
  total_required_sections: number;
  last_30_days_views: number | string | null;
  total_count: number | string;
};

export type AdminCreatorStatusCounts = {
  total_count: number | string;
  pending_count: number | string;
  active_count: number | string;
  rejected_count: number | string;
};

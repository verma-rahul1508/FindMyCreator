import { createClient } from '@supabase/supabase-js';

let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient({ detectSessionInUrl = true }: { detectSessionInUrl?: boolean } = {}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    return null;
  }

  const options = {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl,
    },
  };

  // A browser-wide client keeps Supabase's session hydration and token refresh
  // coordinated across dashboard, profile, and admin navigation.
  if (typeof window !== 'undefined' && detectSessionInUrl) {
    browserClient ??= createClient(supabaseUrl, supabasePublishableKey, options);
    return browserClient;
  }

  return createClient(supabaseUrl, supabasePublishableKey, options);
}

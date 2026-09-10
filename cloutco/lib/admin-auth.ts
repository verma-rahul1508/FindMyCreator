import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const ADMIN_SESSION_COOKIE = 'cloutco-admin-session';

type ActiveAdmin = {
  email: string | null;
};

type AdminAuthorization =
  | { state: 'unauthenticated' }
  | { state: 'forbidden' }
  | { state: 'authorized'; email: string | null };

/**
 * Checks the database-backed authorization record for the authenticated user
 * associated with the supplied server-side Supabase client.
 */
export async function isCurrentUserAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return false;
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');

  return !adminError && isAdmin === true;
}

/**
 * Validates a Supabase access token server-side, then checks the active
 * database-backed admin authorization for that authenticated user.
 */
export async function getAdminAuthorizationForAccessToken(accessToken: string): Promise<AdminAuthorization> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    return { state: 'unauthenticated' };
  }

  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return { state: 'unauthenticated' };
  }

  if (!(await isCurrentUserAdmin(supabase))) {
    return { state: 'forbidden' };
  }

  return { state: 'authorized', email: userData.user.email ?? null };
}

export async function getActiveAdminForAccessToken(accessToken: string): Promise<ActiveAdmin | null> {
  const authorization = await getAdminAuthorizationForAccessToken(accessToken);

  return authorization.state === 'authorized' ? { email: authorization.email } : null;
}

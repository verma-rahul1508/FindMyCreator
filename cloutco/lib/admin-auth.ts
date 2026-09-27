import 'server-only';

import { createClient } from '@supabase/supabase-js';

export const ADMIN_SESSION_COOKIE = 'cloutco-admin-session';

type ActiveAdmin = {
  email: string | null;
};

type AdminAuthorization =
  | { state: 'unauthenticated' }
  | { state: 'unavailable' }
  | { state: 'forbidden' }
  | { state: 'authorized'; email: string | null };

/**
 * Validates a user-issued Supabase access token server-side, then checks the
 * verified user's active database-backed administrator record through the
 * existing security-definer is_admin() function.
 */
export async function getAdminAuthorizationForAccessToken(accessToken: string): Promise<AdminAuthorization> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    return { state: 'unavailable' };
  }

  // The stateless server client must pass the user's token to PostgREST too.
  // A direct service-role read of admin_users is not permitted by its grants.
  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });

  const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);

  if (userError || !userData.user) {
    console.warn(`[admin-auth] Access token verification failed: ${userError?.name ?? 'no_user'}; status=${userError?.status ?? 'none'}; code=${userError?.code ?? 'none'}`);
    return userError?.name === 'AuthRetryableFetchError' || userError?.status === 0
      ? { state: 'unavailable' }
      : { state: 'unauthenticated' };
  }

  const { data: isAdmin, error: adminError } = await authClient.rpc('is_admin');
  if (adminError) {
    console.warn('[admin-auth] Admin lookup failed', {
      code: adminError.code ?? null,
      status: adminError.code === '42501' ? 403 : null,
    });
  }
  if (adminError) return { state: 'unavailable' };
  if (isAdmin !== true) {
    return { state: 'forbidden' };
  }

  return { state: 'authorized', email: userData.user.email ?? null };
}

export async function getActiveAdminForAccessToken(accessToken: string): Promise<ActiveAdmin | null> {
  const authorization = await getAdminAuthorizationForAccessToken(accessToken);

  return authorization.state === 'authorized' ? { email: authorization.email } : null;
}

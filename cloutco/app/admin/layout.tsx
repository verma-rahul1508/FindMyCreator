import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { AdminSessionBootstrap, AdminShell } from '@/components/admin-access-gate';
import { ADMIN_SESSION_COOKIE, getActiveAdminForAccessToken } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const accessToken = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;

  if (!accessToken) {
    return <AdminSessionBootstrap />;
  }

  const activeAdmin = await getActiveAdminForAccessToken(accessToken);

  if (!activeAdmin) {
    return <AdminSessionBootstrap />;
  }

  return <AdminShell email={activeAdmin.email}>{children}</AdminShell>;
}

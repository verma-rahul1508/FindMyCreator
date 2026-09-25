'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminBrandDetail } from '@/components/admin-brand-editor';

export default function AdminBrandDetailPage() {
  const { brandId } = useParams<{ brandId: string }>();
  return <>
    <div className="mx-auto w-full max-w-6xl px-5 pt-7 sm:px-8 lg:px-10"><Link href="/admin/brands" className="text-sm font-semibold text-[#6330dc]">← Back to Brands</Link></div>
    <div className="mx-auto flex w-full max-w-6xl justify-end px-5 pt-4 sm:px-8 lg:px-10"><Link href={`/admin/brands/${brandId}/proposal`} className="inline-flex min-h-10 items-center rounded-lg border border-[#d9ccee] bg-[#faf8ff] px-4 text-sm font-semibold text-[#6330dc]">Generate proposal</Link></div>
    <AdminBrandDetail brandId={brandId} />
  </>;
}

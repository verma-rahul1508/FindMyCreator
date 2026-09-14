'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AdminBrandDetail } from '@/components/admin-brand-editor';

export default function AdminBrandDetailPage() {
  const { brandId } = useParams<{ brandId: string }>();
  return <>
    <div className="mx-auto w-full max-w-6xl px-5 pt-7 sm:px-8 lg:px-10"><Link href="/admin/brands" className="text-sm font-semibold text-[#6330dc]">← Back to Brands</Link></div>
    <AdminBrandDetail brandId={brandId} />
  </>;
}

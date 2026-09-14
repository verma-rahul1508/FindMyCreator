import Link from 'next/link';
import { AdminBrandEditor } from '@/components/admin-brand-editor';

export default function NewAdminBrandPage() {
  return <>
    <div className="mx-auto w-full max-w-6xl px-5 pt-7 sm:px-8 lg:px-10"><Link href="/admin/brands" className="text-sm font-semibold text-[#6330dc]">← Back to Brands</Link></div>
    <AdminBrandEditor />
  </>;
}

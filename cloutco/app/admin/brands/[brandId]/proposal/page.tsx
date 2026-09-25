'use client';

import { useParams } from 'next/navigation';
import { AdminBrandProposal } from '@/components/admin-brand-proposal';

export default function AdminBrandProposalPage() {
  const { brandId } = useParams<{ brandId: string }>();
  return <AdminBrandProposal brandId={brandId} />;
}

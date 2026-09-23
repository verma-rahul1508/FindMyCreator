import { redirect } from 'next/navigation';

export default async function AdminCreatorEditPage({ params }: { params: Promise<{ creatorId: string }> }) {
  const { creatorId } = await params;
  redirect(`/admin/creators/new?creator=${encodeURIComponent(creatorId)}`);
}

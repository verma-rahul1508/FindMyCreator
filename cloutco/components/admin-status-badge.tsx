export type AdminStatus = 'pending' | 'active' | 'rejected';

const statusMeta: Record<AdminStatus, { label: string; className: string }> = {
  pending: { label: 'Pending Review', className: 'border-[#e8d8a8] bg-[#fffaf0] text-[#80611b]' },
  active: { label: 'Approved', className: 'border-[#cce8da] bg-[#f3fbf6] text-[#26754b]' },
  rejected: { label: 'Rejected', className: 'border-[#f0cfd2] bg-[#fff6f6] text-[#a44852]' },
};

export function AdminStatusBadge({ status }: { status: AdminStatus }) {
  const meta = statusMeta[status];
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span>;
}

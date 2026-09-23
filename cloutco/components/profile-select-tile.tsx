'use client';

export function SelectTile({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`flex min-h-11 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6b30e8] ${selected ? 'border-[#8d68e9] bg-[#f4efff] text-[#6030d6] ring-1 ring-[#d9c9ff]' : 'border-[#e1e2e9] bg-white text-[#282d38] hover:border-[#cbbcf1] hover:bg-[#fcfbff]'}`}><span className={`h-1.5 w-1.5 rounded-full ${selected ? 'bg-[#6b30e8]' : 'bg-[#b7bdc8]'}`} />{label}</button>;
}

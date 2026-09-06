export function formatPlatformCount(value: number | string | null | undefined): string {
  if (value === null || value === undefined || String(value).trim() === '') return '';

  const number = Number(value);
  if (!Number.isFinite(number)) return '';

  const absolute = Math.abs(number);
  if (absolute < 100_000) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(number);
  }

  if (absolute < 1_000_000) {
    const thousands = Math.round(number / 1_000);
    if (Math.abs(thousands) >= 1_000) return `${Math.round(number / 100_000) / 10}M`;
    return `${thousands}K`;
  }

  return `${Math.round((number / 1_000_000) * 10) / 10}M`;
}

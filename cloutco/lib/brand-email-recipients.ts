const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type BrandEmailRecipients = {
  recipients: string[];
  valid: boolean;
};

export function isValidEmail(value: string | null | undefined): boolean {
  return EMAIL_PATTERN.test((value ?? '').trim());
}

/** Parses the semicolon-separated recipient list used by Brand records. */
export function parseBrandEmailRecipients(value: string | null | undefined): BrandEmailRecipients {
  const parts = (value ?? '').split(';').map((part) => part.trim().toLowerCase());
  if (!parts.length || parts.some((part) => !isValidEmail(part))) return { recipients: [], valid: false };
  return { recipients: [...new Set(parts)], valid: true };
}

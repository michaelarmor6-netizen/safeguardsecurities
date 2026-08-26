// Normalisation happens once, at the boundary, or the row fails - the same
// rule the dialer side lives by. A phone is E.164 or it is absent; an email
// is RFC-plausible and lowercased or it is absent. No half-clean values are
// ever stored, because "mostly a phone number" is how a dialer calls a fax
// machine at 3am.
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';
import type { CrmField } from './crmTypes';

export const DEFAULT_REGION: CountryCode = 'PH';

export interface NormalizedPhone {
  e164: string;
  country?: string;       // ISO alpha-2 if the parser could tell
  callingCode: string;    // e.g. '63' - Vicidial wants it split out
  national: string;       // digits only, no calling code
}

export function normalizePhone(raw: string, defaultRegion: CountryCode = DEFAULT_REGION): NormalizedPhone | null {
  const cleaned = (raw ?? '').trim();
  if (!cleaned) return null;
  const parsed = parsePhoneNumberFromString(cleaned, defaultRegion);
  if (!parsed || !parsed.isValid()) return null;
  return {
    e164: parsed.number,
    country: parsed.country,
    callingCode: parsed.countryCallingCode,
    national: parsed.nationalNumber,
  };
}

// Deliberately a plausibility check, not full RFC 5322 - the review grid and
// the bounce webhook are the real validators. This catches typos, not liars.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(raw: string): string | null {
  const cleaned = (raw ?? '').trim().toLowerCase();
  if (!cleaned || !EMAIL_RE.test(cleaned)) return null;
  return cleaned;
}

export function splitFullName(full: string): { firstName: string; lastName: string } {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

// Header auto-guessing for the mapping step. English + the Filipino terms
// that actually show up in local lead sheets. The admin can always override -
// this only picks the starting point.
const HEADER_PATTERNS: [RegExp, CrmField][] = [
  [/^(first[\s_-]*name|fname|given)/i, 'firstName'],
  [/^(last[\s_-]*name|lname|surname|family|apelyido)/i, 'lastName'],
  [/^(full[\s_-]*name|contact[\s_-]*person|owner|pangalan|^name$)/i, 'fullName'],
  [/(company|business|negosyo|establishment|trade[\s_-]*name|org)/i, 'company'],
  [/(alt|other|secondary).{0,4}(phone|mobile|number)/i, 'altPhone'],
  [/(phone|mobile|cell|contact.{0,4}(no|num)|telepono|tel\b|whatsapp|viber)/i, 'phone'],
  [/(e?[-_\s]*mail)/i, 'email'],
  [/(country|bansa|nation)/i, 'country'],
  [/(note|remark|comment)/i, 'notes'],
  [/(tag|label|category|segment)/i, 'tag'],
];

export function guessField(header: string): CrmField | null {
  const h = (header ?? '').trim();
  if (!h) return null;
  for (const [re, field] of HEADER_PATTERNS) {
    if (re.test(h)) return field;
  }
  return null;
}

// Referral code generation.
//
// Codes are DERIVED from the uid rather than random, so the same account always
// produces the same code - no collision handling, no "which one is mine" bugs
// if a code document ever goes missing and has to be recreated.
//
// The readable prefix is cosmetic (it makes a shared link look personal); the
// uid-derived suffix is what actually makes it unique.

const SUFFIX_LENGTH = 4;

/** Stable short hash of a uid, base36. Not cryptographic - uniqueness only. */
function uidSuffix(uid: string): string {
  let h = 2166136261; // FNV-1a offset basis
  for (let i = 0; i < uid.length; i += 1) {
    h ^= uid.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).slice(0, SUFFIX_LENGTH).padStart(SUFFIX_LENGTH, '0');
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 16);
}

/**
 * Build this account's referral code, e.g. "samuelgumata-k3x1".
 * Falls back to a generic prefix when there is no usable name yet.
 */
export function makeReferralCode(uid: string, displayName?: string, email?: string): string {
  const raw = slugify(displayName ?? '') || slugify(email?.split('@')[0] ?? '') || 'investor';
  return `${raw}-${uidSuffix(uid)}`;
}

/** Shape check for a code arriving from a URL, before we hit Firestore with it. */
export function isPlausibleReferralCode(value: string): boolean {
  return /^[a-z0-9]{1,16}-[a-z0-9]{4}$/.test(value.trim().toLowerCase());
}

/** Full shareable link for a code. */
export function buildReferralLink(code: string): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://app.safeguardsecurities.us';
  return `${origin}/investor/signup?ref=${encodeURIComponent(code)}`;
}

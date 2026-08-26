// GI inbound webhook: signature scheme and payload validation.
//
// Pure functions, no Firebase imports - so the whole security and validation
// surface is unit-testable without an emulator. index.ts wires them to HTTP.
//
// Signature scheme (mirrors what the GI repo will implement):
//   mac = HMAC-SHA256(secret, `${timestamp}.${rawBody}`) as hex
//   headers: X-GI-Signature: <mac>, X-GI-Timestamp: <unix seconds>
// The timestamp is bound INTO the mac and checked against a +/-5-minute
// window - replaying a captured request outside the window fails, and
// tampering with either body or timestamp breaks the mac.
import { createHmac, timingSafeEqual } from 'crypto';

export const GI_TIMESTAMP_WINDOW_SECONDS = 300;
export const GI_MAX_BATCH = 100;

export function giSign(timestamp: string, rawBody: string | Buffer, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest('hex');
}

export function giVerify(
  timestamp: string, rawBody: string | Buffer, signature: string,
  secret: string, nowMs: number,
): { ok: boolean; reason?: string } {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: 'bad timestamp' };
  if (Math.abs(nowMs / 1000 - ts) > GI_TIMESTAMP_WINDOW_SECONDS) {
    return { ok: false, reason: 'timestamp outside window' };
  }
  const expected = giSign(timestamp, rawBody, secret);
  const a = Buffer.from(String(signature));
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'bad signature' };
  }
  return { ok: true };
}

// ------------------------------------------------------------ payload -----
export const CONSENT_BASES = ['inquiry', 'existing_business', 'purchased_list', 'unknown'] as const;

export interface GiLeadIn {
  giLeadId: string;
  mission?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phoneE164?: string;
  email?: string;
  country?: string;
  consentBasis?: string;
  consentSource?: string;
  segment?: string;
  tags?: string[];
  dossier?: Record<string, unknown>;
}

export interface GiLeadClean {
  giLeadId: string;
  mission: string;
  firstName: string;
  lastName: string;
  company?: string;
  phoneE164?: string;
  email?: string;
  country?: string;
  consentBasis: (typeof CONSENT_BASES)[number];
  consentSource: string;
  segment: string;
  tags: string[];
  dossier: Record<string, unknown>;
}

const E164_RE = /^\+[1-9][0-9]{6,14}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Per-row validation. The contract is strict ON PURPOSE: a GI lead without
// consent provenance is rejected per-row (never defaulted), because "why were
// we allowed to contact this person" must survive the hop between systems.
export function validateGiLead(raw: GiLeadIn): { ok: true; lead: GiLeadClean } | { ok: false; reason: string } {
  const giLeadId = String(raw.giLeadId ?? '').trim();
  if (!giLeadId || giLeadId.length > 120) return { ok: false, reason: 'giLeadId required' };

  const consentBasis = String(raw.consentBasis ?? '').trim() as GiLeadClean['consentBasis'];
  if (!CONSENT_BASES.includes(consentBasis)) {
    return { ok: false, reason: `consentBasis required (one of ${CONSENT_BASES.join('|')})` };
  }
  const consentSource = String(raw.consentSource ?? '').trim();
  if (!consentSource) return { ok: false, reason: 'consentSource required' };

  const phone = String(raw.phoneE164 ?? '').trim();
  if (phone && !E164_RE.test(phone)) return { ok: false, reason: `phoneE164 "${phone}" is not E.164` };
  const email = String(raw.email ?? '').trim().toLowerCase();
  if (email && !EMAIL_RE.test(email)) return { ok: false, reason: `email "${email}" is invalid` };
  if (!phone && !email) return { ok: false, reason: 'no usable phone or email' };

  const firstName = String(raw.firstName ?? '').trim();
  const lastName = String(raw.lastName ?? '').trim();
  const company = String(raw.company ?? '').trim();
  if (!firstName && !lastName && !company) return { ok: false, reason: 'no name or company' };

  return {
    ok: true,
    lead: {
      giLeadId,
      mission: String(raw.mission ?? '').trim() || 'unspecified',
      firstName, lastName,
      company: company || undefined,
      phoneE164: phone || undefined,
      email: email || undefined,
      country: String(raw.country ?? '').trim().toUpperCase().slice(0, 2) || undefined,
      consentBasis, consentSource,
      segment: String(raw.segment ?? '').trim() || 'investor-prospect',
      tags: Array.isArray(raw.tags) ? raw.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20) : [],
      dossier: raw.dossier && typeof raw.dossier === 'object' ? raw.dossier as Record<string, unknown> : {},
    },
  };
}

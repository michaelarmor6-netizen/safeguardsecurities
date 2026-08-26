import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getMarketSnapshot, getMarketHistory, searchMarkets, type IgCredentials } from './ig';

initializeApp();

const IG_API_KEY = defineSecret('IG_API_KEY');
const IG_USERNAME = defineSecret('IG_USERNAME');
const IG_PASSWORD = defineSecret('IG_PASSWORD');
const IG_ACCOUNT_TYPE = defineSecret('IG_ACCOUNT_TYPE'); // 'demo' | 'live'

const SECRETS = [IG_API_KEY, IG_USERNAME, IG_PASSWORD, IG_ACCOUNT_TYPE];

function getCreds(): IgCredentials {
  const accountType = IG_ACCOUNT_TYPE.value() === 'live' ? 'live' : 'demo';
  return {
    apiKey: IG_API_KEY.value(),
    username: IG_USERNAME.value(),
    password: IG_PASSWORD.value(),
    accountType,
  };
}

function requireAuth(request: CallableRequest): string {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  return request.auth.uid;
}

// Roles live in Firestore (profiles/{uid}.role), not Auth custom claims - so
// admin gating here must read Firestore directly (Admin SDK bypasses rules).
async function requireInvestorAdmin(request: CallableRequest): Promise<void> {
  const uid = requireAuth(request);
  const snap = await getFirestore().doc(`profiles/${uid}`).get();
  const role = snap.exists ? (snap.data()?.role as string | undefined) : undefined;
  if (!role || role === 'client') {
    throw new HttpsError('permission-denied', 'Admins only.');
  }
}

export const igMarketSnapshot = onCall({ secrets: SECRETS }, async (request) => {
  requireAuth(request);
  const epic = String(request.data?.epic ?? '').trim();
  if (!epic) throw new HttpsError('invalid-argument', 'epic is required');
  try {
    return await getMarketSnapshot(getCreds(), epic);
  } catch (err) {
    throw new HttpsError('internal', err instanceof Error ? err.message : 'IG request failed');
  }
});

export const igMarketHistory = onCall({ secrets: SECRETS }, async (request) => {
  requireAuth(request);
  const epic = String(request.data?.epic ?? '').trim();
  if (!epic) throw new HttpsError('invalid-argument', 'epic is required');
  const resolution = String(request.data?.resolution ?? 'MINUTE_5');
  const max = Math.min(Number(request.data?.max ?? 100) || 100, 200);
  try {
    return await getMarketHistory(getCreds(), epic, resolution, max);
  } catch (err) {
    throw new HttpsError('internal', err instanceof Error ? err.message : 'IG request failed');
  }
});

// Admin-only lookup tool for finding the correct epic for an instrument -
// not used by the regular client-facing market panel.
export const igSearchMarkets = onCall({ secrets: SECRETS }, async (request) => {
  await requireInvestorAdmin(request);
  const searchTerm = String(request.data?.searchTerm ?? '').trim();
  if (!searchTerm) throw new HttpsError('invalid-argument', 'searchTerm is required');
  try {
    return await searchMarkets(getCreds(), searchTerm);
  } catch (err) {
    throw new HttpsError('internal', err instanceof Error ? err.message : 'IG request failed');
  }
});

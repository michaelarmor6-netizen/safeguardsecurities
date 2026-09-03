import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';

export function requireAuth(request: CallableRequest): string {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  return request.auth.uid;
}

// Roles live in Firestore (profiles/{uid}.role), not Auth custom claims - so
// admin gating here must read Firestore directly (Admin SDK bypasses rules).
export async function requireInvestorAdmin(request: CallableRequest): Promise<string> {
  const uid = requireAuth(request);
  const snap = await getFirestore().doc(`profiles/${uid}`).get();
  const role = snap.exists ? (snap.data()?.role as string | undefined) : undefined;
  if (!role || role === 'client') {
    throw new HttpsError('permission-denied', 'Admins only.');
  }
  return uid;
}

// Order-level fill-weighted average across partial fills. Distinct from the
// position-level cost-basis math below - this tracks "what did this ORDER
// fill at on average," while positions track "what does this HOLDING cost."
export function computeWeightedAverage(prevQty: number, prevAvg: number | undefined, fillQty: number, fillPrice: number): number {
  const oldAvg = Number(prevAvg ?? 0);
  const totalQty = prevQty + fillQty;
  if (totalQty <= 0) return 0;
  return (prevQty * oldAvg + fillQty * fillPrice) / totalQty;
}

export interface PositionUpdateResult {
  newQty: number;
  newAvgCost: number;
  realizedPnlDelta: number;
}

// Real brokerage cost-basis math: adding to a position blends cost basis;
// reducing/closing realizes P/L against the OLD cost basis and leaves the
// remainder's basis untouched; flipping direction resets basis to the flip
// price. Mirrors the exact formula used by the platform this was adapted
// from - see the Trading Execution Engine plan for the full derivation.
export function computePositionUpdate(
  oldQty: number,
  oldAvgCost: number,
  side: 'buy' | 'sell',
  fillQty: number,
  fillPrice: number,
): PositionUpdateResult {
  const signedFillQty = side === 'buy' ? fillQty : -fillQty;
  const newQty = oldQty + signedFillQty;
  const sameDirection = oldQty === 0 || Math.sign(oldQty) === Math.sign(signedFillQty);

  if (sameDirection) {
    const newAvgCost = (Math.abs(oldQty) * oldAvgCost + Math.abs(signedFillQty) * fillPrice) / (Math.abs(oldQty) + Math.abs(signedFillQty));
    return { newQty, newAvgCost, realizedPnlDelta: 0 };
  }

  const closedQty = Math.min(Math.abs(oldQty), Math.abs(signedFillQty));
  const realizedPnlDelta = oldQty > 0 ? (fillPrice - oldAvgCost) * closedQty : (oldAvgCost - fillPrice) * closedQty;

  let newAvgCost: number;
  if (Math.abs(newQty) < 1e-8) newAvgCost = 0;
  else if (Math.sign(newQty) !== Math.sign(oldQty)) newAvgCost = fillPrice;
  else newAvgCost = oldAvgCost;

  return { newQty, newAvgCost, realizedPnlDelta };
}

export type OceanStatus = 'O' | 'C' | 'E';

export function orderStatusToOcean(status: string): OceanStatus {
  if (status === 'pending' || status === 'working' || status === 'partially_filled') return 'O';
  if (status === 'expired') return 'E';
  return 'C'; // filled | cancelled | rejected
}

export const TRADE_CORRECTION_WINDOW_DAYS = 3;

export function isWithinTradeCorrectionWindow(executedAt: Date): boolean {
  const ageMs = Date.now() - executedAt.getTime();
  return ageMs <= TRADE_CORRECTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

// ---- role separation ----------------------------------------------------
// requireInvestorAdmin above treats every non-client role as an admin, which
// means a support agent hired to answer tickets can move client money. These
// lists mirror the predicates in firestore.rules - change both together.

/** Anyone on staff. Enough to READ client data, never to move money. */
export const STAFF_ROLES = ['support', 'admin', 'finance', 'compliance', 'super_admin'] as const;
/** Credits, debits, funding decisions. */
export const FINANCE_ROLES = ['finance', 'admin', 'super_admin'] as const;
/** KYC and sanctions outcomes. */
export const COMPLIANCE_ROLES = ['compliance', 'admin', 'super_admin'] as const;

export async function requireRole(
  request: CallableRequest,
  allowed: readonly string[],
  action: string,
): Promise<string> {
  const uid = requireAuth(request);
  const snap = await getFirestore().doc(`profiles/${uid}`).get();
  const role = snap.exists ? (snap.data()?.role as string | undefined) : undefined;
  if (!role || !allowed.includes(role)) {
    throw new HttpsError('permission-denied', `Your role cannot ${action}.`);
  }
  return uid;
}

/** Gate for anything that changes a wallet balance. */
export function requireFinanceAdmin(request: CallableRequest): Promise<string> {
  return requireRole(request, FINANCE_ROLES, 'move client funds');
}

// ---- money ---------------------------------------------------------------

/**
 * Cash is stored as a JS number, so every arithmetic result is snapped back to
 * whole cents. Without this, repeated credits accumulate float dust
 * (0.1 + 0.2 = 0.30000000000000004) and the wallet slowly stops matching the
 * ledger sum it is supposed to equal.
 */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Sanity ceiling on one manual credit - catches a slipped decimal point. */
export const MAX_MANUAL_CREDIT = 10_000_000;

/**
 * Validate an admin-entered credit amount. Rejects junk, zero, negatives and
 * implausible figures before any of it reaches a balance.
 */
export function normalizeCreditAmount(raw: unknown): number {
  const amount = roundMoney(Number(raw));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpsError('invalid-argument', 'Enter an amount greater than zero.');
  }
  if (amount > MAX_MANUAL_CREDIT) {
    throw new HttpsError(
      'invalid-argument',
      `Single credits are capped at ${MAX_MANUAL_CREDIT.toLocaleString('en-US')} - split it or check the decimal point.`,
    );
  }
  return amount;
}

/** SG-FUND{YY}{NNNNN} from a per-year sequence. Mirrors the client-side generator. */
export function fundingReferenceFor(year: number, sequence: number): string {
  return `SG-FUND${String(year % 100).padStart(2, '0')}${String(sequence).padStart(5, '0')}`;
}

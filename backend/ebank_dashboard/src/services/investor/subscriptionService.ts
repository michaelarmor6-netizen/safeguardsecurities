import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';
import {
  currentPeriodKey,
  getPlanDefinition,
  resolvePlan,
  usageDocId,
  type PlanDefinition,
  type SubscriptionPlan,
} from '../../lib/subscriptionPlans';

// AI Engine subscription state: which plan a client is on, and how much of
// this period's allowance they have used.
//
// Phase 1 has no billing. Plans are assigned by staff from the admin users
// page, so we can find out whether anyone actually wants this before building
// payment infrastructure for it.
//
// The usage counter is READ here for display. It is WRITTEN by the
// generateTradingSignal Cloud Function, which is the only place that can
// count reliably - see the note in lib/subscriptionPlans.ts.

export interface AiUsage {
  userId: string;
  period: string;
  signalsUsed: number;
  updatedAt?: Date;
}

export interface SubscriptionState {
  plan: SubscriptionPlan;
  definition: PlanDefinition;
  period: string;
  signalsUsed: number;
  signalsRemaining: number;
  quotaExhausted: boolean;
}

function mapUsage(id: string, data: DocumentData): AiUsage {
  return {
    userId: data.userId ?? id.split('_')[0] ?? '',
    period: data.period ?? '',
    signalsUsed: Number(data.signalsUsed ?? 0),
    updatedAt: data.updatedAt?.toDate?.() ?? undefined,
  };
}

/**
 * This period's signal usage. A missing document means zero used - the
 * Cloud Function creates it on first generation.
 */
export async function getUsageForPeriod(
  userId: string,
  period: string = currentPeriodKey(),
): Promise<AiUsage> {
  const empty: AiUsage = { userId, period, signalsUsed: 0 };
  if (!userId) return empty;

  try {
    const snap = await getDoc(doc(db, LIVE_COLLECTIONS.aiUsage, usageDocId(userId, period)));
    return snap.exists() ? mapUsage(snap.id, snap.data()) : empty;
  } catch (error) {
    // Usage is a display concern - never block the page on it.
    console.error('Failed to read AI usage:', error);
    return empty;
  }
}

/**
 * Full subscription picture for a client: plan, allowance, and what is left.
 * `plan` comes from the caller (it is already on the profile) so this costs
 * one Firestore read rather than two.
 */
export async function getSubscriptionState(
  userId: string,
  plan: SubscriptionPlan,
): Promise<SubscriptionState> {
  const definition = getPlanDefinition(plan);
  const period = currentPeriodKey();
  const usage = await getUsageForPeriod(userId, period);

  const signalsUsed = usage.signalsUsed;
  const signalsRemaining = Math.max(0, definition.aiSignalsPerMonth - signalsUsed);

  return {
    plan,
    definition,
    period,
    signalsUsed,
    signalsRemaining,
    quotaExhausted: signalsRemaining <= 0,
  };
}

/**
 * Staff action: move a client between plans.
 *
 * Phase 1 is deliberately admin-only. When Phase 5 billing lands, the billing
 * function becomes the caller and this stays as the manual override for
 * support - comps, goodwill credits, and fixing failed charges by hand.
 */
export async function setPlanForUser(userId: string, plan: SubscriptionPlan): Promise<void> {
  await updateDoc(doc(db, LIVE_COLLECTIONS.profiles, userId), {
    plan: resolvePlan(plan),
    planSince: new Date(),
    updatedAt: new Date(),
  });
}

// ---------------------------------------------------------------------------
// Plan change requests
//
// There is no billing yet (Phase 5), so a client cannot move themselves onto a
// paid plan - Firestore rules block writes to profile.plan for exactly that
// reason. Instead a client registers intent here and staff action it from the
// admin users page. Honest about what it is: a request, not a purchase.
// ---------------------------------------------------------------------------

export type PlanRequestStatus = 'pending' | 'approved' | 'declined';

export interface PlanRequest {
  id: string;
  userId: string;
  userEmail?: string;
  currentPlan: SubscriptionPlan;
  requestedPlan: SubscriptionPlan;
  status: PlanRequestStatus;
  note?: string;
  createdAt?: Date;
}

function mapPlanRequest(id: string, data: DocumentData): PlanRequest {
  return {
    id,
    userId: data.userId ?? '',
    userEmail: data.userEmail,
    currentPlan: resolvePlan(data.currentPlan),
    requestedPlan: resolvePlan(data.requestedPlan),
    status: (data.status as PlanRequestStatus) ?? 'pending',
    note: data.note,
    createdAt: data.createdAt?.toDate?.() ?? undefined,
  };
}

/** Raise an upgrade request. Staff approve it by changing the plan directly. */
export async function requestPlanChange(input: {
  userId: string;
  userEmail?: string;
  currentPlan: SubscriptionPlan;
  requestedPlan: SubscriptionPlan;
  note?: string;
}): Promise<{ id: string }> {
  const ref = await addDoc(collection(db, LIVE_COLLECTIONS.planRequests), {
    userId: input.userId,
    userEmail: input.userEmail ?? '',
    currentPlan: input.currentPlan,
    requestedPlan: input.requestedPlan,
    status: 'pending' as PlanRequestStatus,
    note: input.note ?? '',
    createdAt: new Date(),
  });
  return { id: ref.id };
}

/** The client's outstanding request, if any - so we don't invite duplicates. */
export async function getPendingPlanRequest(userId: string): Promise<PlanRequest | null> {
  if (!userId) return null;
  try {
    const snap = await getDocs(
      query(
        collection(db, LIVE_COLLECTIONS.planRequests),
        where('userId', '==', userId),
        where('status', '==', 'pending'),
      ),
    );
    if (snap.empty) return null;
    return mapPlanRequest(snap.docs[0].id, snap.docs[0].data());
  } catch (error) {
    console.error('Failed to read plan requests:', error);
    return null;
  }
}

/** Staff view: every outstanding request, keyed by the client's uid. */
export async function getAllPendingPlanRequests(): Promise<Map<string, PlanRequest>> {
  const out = new Map<string, PlanRequest>();
  try {
    const snap = await getDocs(
      query(collection(db, LIVE_COLLECTIONS.planRequests), where('status', '==', 'pending')),
    );
    snap.docs.forEach((d) => {
      const req = mapPlanRequest(d.id, d.data());
      out.set(req.userId, req);
    });
  } catch (error) {
    console.error('Failed to read pending plan requests:', error);
  }
  return out;
}

/** Close a request once staff have acted on it, so it stops showing as pending. */
export async function resolvePlanRequest(
  requestId: string,
  status: Exclude<PlanRequestStatus, 'pending'>,
): Promise<void> {
  await updateDoc(doc(db, LIVE_COLLECTIONS.planRequests, requestId), {
    status,
    resolvedAt: new Date(),
  });
}

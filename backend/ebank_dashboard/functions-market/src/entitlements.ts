import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

// Server-side allowance enforcement for the AI Engine.
//
// The quotas below MIRROR src/lib/subscriptionPlans.ts in the app. The client
// copy drives display (the "3 of 5 used" meter); THIS copy is the one that
// actually gates. Change a quota and you must change both - they are
// deliberately duplicated because functions-market compiles as its own
// codebase and cannot import from the app's src/.
//
// Client-side checks are cosmetic: a callable can be invoked directly with
// the Firebase SDK using config that ships in our own bundle. This file is
// the only thing standing between a client and unlimited Anthropic spend.

export type SubscriptionPlan = 'free' | 'pro';

const SIGNAL_QUOTA: Record<SubscriptionPlan, number> = {
  free: 5,
  pro: 100,
};

function resolvePlan(value: unknown): SubscriptionPlan {
  return value === 'pro' ? 'pro' : 'free';
}

/** UTC so a client changing timezone can't roll their own quota over early. */
export function currentPeriodKey(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export interface Reservation {
  plan: SubscriptionPlan;
  quota: number;
  used: number;
  period: string;
}

/**
 * Atomically take one signal from this month's allowance.
 *
 * Runs in a transaction so two concurrent requests can't both read "4 of 5"
 * and both proceed. Throws resource-exhausted when the allowance is spent -
 * the client surfaces that as an upgrade prompt.
 */
export async function reserveSignal(uid: string): Promise<Reservation> {
  const db = getFirestore();

  const profile = await db.collection('profiles').doc(uid).get();
  const plan = resolvePlan(profile.data()?.plan);
  const quota = SIGNAL_QUOTA[plan];
  const period = currentPeriodKey();
  const ref = db.collection('aiUsage').doc(`${uid}_${period}`);

  const used = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = Number(snap.data()?.signalsUsed ?? 0);

    if (current >= quota) {
      throw new HttpsError(
        'resource-exhausted',
        `You have used all ${quota} signals included this month. Your allowance ` +
          `resets at the start of next month.`,
      );
    }

    tx.set(
      ref,
      {
        userId: uid,
        period,
        plan,
        signalsUsed: current + 1,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return current + 1;
  });

  return { plan, quota, used, period };
}

/**
 * Hand a reservation back when generation failed.
 *
 * A client should not lose an allowance because Finnhub timed out or the
 * model call errored. Best-effort: a failure to refund must never mask the
 * original error the caller is about to throw.
 */
export async function releaseSignal(uid: string, period: string): Promise<void> {
  try {
    await getFirestore()
      .collection('aiUsage')
      .doc(`${uid}_${period}`)
      .set(
        { signalsUsed: FieldValue.increment(-1), updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
  } catch (err) {
    console.error('Failed to release signal reservation', { uid, period, err });
  }
}

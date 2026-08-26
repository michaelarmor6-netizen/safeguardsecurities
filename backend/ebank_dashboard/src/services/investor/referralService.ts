import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';
import { makeReferralCode } from '../../lib/referralCodes';

// Client referrals.
//
// Two collections, because a code has to be resolvable to an account by
// someone who is not that account:
//   referralCodes/{code}  ->  { userId }   the lookup, written once by the owner
//   referrals/{id}        ->  the join record, written by the person signing up
//
// Nothing here pays anybody. A referral is recorded, and staff decide what (if
// anything) it earns - there is no automated reward, and no money moves.

export type ReferralStatus = 'signed_up' | 'funded' | 'rejected';

export interface Referral {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  referredEmail?: string;
  code: string;
  status: ReferralStatus;
  createdAt?: Date;
}

function mapReferral(id: string, data: DocumentData): Referral {
  return {
    id,
    referrerUserId: data.referrerUserId ?? '',
    referredUserId: data.referredUserId ?? '',
    referredEmail: data.referredEmail,
    code: data.code ?? '',
    status: (data.status as ReferralStatus) ?? 'signed_up',
    createdAt: data.createdAt?.toDate?.() ?? undefined,
  };
}

/**
 * This account's referral code, creating the lookup document on first use.
 * Idempotent: the code is derived from the uid, so re-running is harmless.
 */
export async function getOrCreateReferralCode(
  uid: string,
  displayName?: string,
  email?: string,
): Promise<string> {
  const code = makeReferralCode(uid, displayName, email);
  const ref = doc(db, LIVE_COLLECTIONS.referralCodes, code);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { userId: uid, createdAt: new Date() });
    }
  } catch (error) {
    // The code itself is still valid and shareable even if the lookup write
    // failed - it just cannot be attributed until the document exists.
    console.error('Failed to ensure referral code document:', error);
  }

  return code;
}

/** Resolve a shared code back to the account that owns it. */
export async function resolveReferralCode(code: string): Promise<string | null> {
  try {
    const snap = await getDoc(doc(db, LIVE_COLLECTIONS.referralCodes, code.trim().toLowerCase()));
    return snap.exists() ? (snap.data().userId ?? null) : null;
  } catch {
    return null;
  }
}

/**
 * Record that this newly-created account arrived through someone's link.
 * Called once, immediately after signup, by the account that was referred.
 */
export async function recordReferral(input: {
  code: string;
  referredUserId: string;
  referredEmail?: string;
}): Promise<void> {
  const referrerUserId = await resolveReferralCode(input.code);
  if (!referrerUserId) return;                       // unknown code - ignore quietly
  if (referrerUserId === input.referredUserId) return; // no self-referral

  try {
    await addDoc(collection(db, LIVE_COLLECTIONS.referrals), {
      referrerUserId,
      referredUserId: input.referredUserId,
      referredEmail: input.referredEmail ?? '',
      code: input.code.trim().toLowerCase(),
      status: 'signed_up' as ReferralStatus,
      createdAt: new Date(),
    });
  } catch (error) {
    // Never block signup on referral bookkeeping.
    console.error('Failed to record referral:', error);
  }
}

/** People who joined through this account's link. */
export async function getMyReferrals(uid: string, max = 50): Promise<Referral[]> {
  if (!uid) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, LIVE_COLLECTIONS.referrals),
        where('referrerUserId', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(max),
      ),
    );
    return snap.docs.map((d) => mapReferral(d.id, d.data()));
  } catch (error) {
    console.error('Failed to read referrals:', error);
    return [];
  }
}

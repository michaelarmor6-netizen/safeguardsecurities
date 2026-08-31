import { addDoc, collection, doc, getDocs, onSnapshot, query, runTransaction, updateDoc, where, type DocumentData, type DocumentReference, type Unsubscribe } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';

export interface InvestorWallet {
  id: string;
  userId: string;
  balance: number;
  currency?: string;
  label?: string;
}

function mapWallet(id: string, data: DocumentData): InvestorWallet {
  return {
    id,
    userId: data.userId ?? '',
    balance: Number(data.balance ?? 0),
    currency: data.currency ?? 'USD',
    label: data.label,
  };
}

export async function getAllWallets(): Promise<InvestorWallet[]> {
  const snap = await getDocs(collection(db, LIVE_COLLECTIONS.wallets));
  return snap.docs.map((d) => mapWallet(d.id, d.data()));
}

export async function getUserWallet(userId: string): Promise<InvestorWallet | null> {
  const snap = await getDocs(query(collection(db, LIVE_COLLECTIONS.wallets), where('userId', '==', userId)));
  const docSnap = snap.docs[0];
  return docSnap ? mapWallet(docSnap.id, docSnap.data()) : null;
}

export async function createWalletForUser(userId: string) {
  return addDoc(collection(db, LIVE_COLLECTIONS.wallets), {
    userId,
    balance: 0,
    currency: 'USD',
    label: 'Primary Wallet',
    status: 'active',
    createdAt: new Date(),
  });
}

export async function updateWalletBalance(walletId: string, balance: number) {
  await updateDoc(doc(db, LIVE_COLLECTIONS.wallets, walletId), { balance, updatedAt: new Date() });
}

// The client's wallet doc ref, creating an empty wallet if they have never
// been funded. Callers that need the ref inside a runTransaction must resolve
// it FIRST: the wallet is found by query (where userId ==) and Firestore
// transactions can only read a known doc ref, never run a query.
export async function ensureWalletRef(userId: string): Promise<DocumentReference<DocumentData>> {
  const existing = await getUserWallet(userId);
  return existing
    ? doc(db, LIVE_COLLECTIONS.wallets, existing.id)
    : await createWalletForUser(userId);
}

export interface WalletCreditResult {
  walletId: string;
  previousBalance: number;
  newBalance: number;
}

// Atomic balance change - the ONLY way money should move into a wallet.
// Read-then-write (read the balance, write current + amount) silently loses a
// credit whenever two land together: two admins confirming receipt at once, or
// an admin top-up racing a confirmation. A transaction serialises the
// read-modify-write so each credit is applied exactly once. `delta` may be
// negative for a correction, but never past zero.
export async function creditWallet(userId: string, delta: number): Promise<WalletCreditResult> {
  if (!Number.isFinite(delta) || delta === 0) {
    throw new Error('Credit amount must be a non-zero number.');
  }
  const walletRef = await ensureWalletRef(userId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(walletRef);
    if (!snap.exists()) throw new Error('Wallet no longer exists - reload and try again.');
    const previousBalance = Number(snap.data().balance ?? 0);
    const newBalance = previousBalance + delta;
    if (newBalance < 0) {
      throw new Error('That would take the wallet below zero.');
    }
    tx.update(walletRef, { balance: newBalance, updatedAt: new Date() });
    return { walletId: walletRef.id, previousBalance, newBalance };
  });
}

// Live balance for the investor Wallet page - updates the moment funding is
// confirmed, without a refresh.
export function watchUserWallet(
  userId: string,
  onChange: (wallet: InvestorWallet | null) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, LIVE_COLLECTIONS.wallets), where('userId', '==', userId)),
    (snap) => {
      const d = snap.docs[0];
      onChange(d ? mapWallet(d.id, d.data()) : null);
    },
    (e) => onError?.(e),
  );
}


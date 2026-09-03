import { addDoc, collection, getDocs, onSnapshot, query, where, type DocumentData, type Unsubscribe } from 'firebase/firestore';
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

// Balances are NOT writable from the browser any more. cashLedger is
// function-only (`allow write: if false`) so it can stand as the immutable
// record of cash, which meant any browser-side credit was structurally unable
// to post to it - that is how deposits came to be missing from the ledger the
// account statement is built from. Every credit now runs through the
// confirmFundingReceipt / recordClientDeposit callables in functions-trading,
// which write wallet and ledger in one Admin-SDK transaction under a finance
// role. firestore.rules refuses wallet balance updates from clients outright,
// so re-adding a setter here would fail at the rules layer rather than
// silently reintroducing the split-brain.

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


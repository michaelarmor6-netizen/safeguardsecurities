import { addDoc, collection, doc, getDocs, onSnapshot, query, updateDoc, where, type DocumentData, type Unsubscribe } from 'firebase/firestore';
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


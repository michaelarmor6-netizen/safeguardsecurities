import { arrayRemove, arrayUnion, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';

export async function getWatchlistSymbols(userId: string): Promise<string[]> {
  const snap = await getDoc(doc(db, LIVE_COLLECTIONS.watchlists, userId));
  if (!snap.exists()) return [];
  const symbols = snap.data().symbols;
  return Array.isArray(symbols) ? symbols : [];
}

export async function addToWatchlist(userId: string, symbol: string) {
  await setDoc(
    doc(db, LIVE_COLLECTIONS.watchlists, userId),
    { userId, symbols: arrayUnion(symbol.toUpperCase()), updatedAt: new Date() },
    { merge: true },
  );
}

export async function removeFromWatchlist(userId: string, symbol: string) {
  await setDoc(
    doc(db, LIVE_COLLECTIONS.watchlists, userId),
    { symbols: arrayRemove(symbol.toUpperCase()), updatedAt: new Date() },
    { merge: true },
  );
}

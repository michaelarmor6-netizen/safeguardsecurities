import { collection, getDocs, orderBy, query, where, type DocumentData } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';

export interface PortfolioSnapshot {
  date: string; // YYYY-MM-DD
  portfolioValue: number;
  cashBalance: number;
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
}

function mapSnapshot(data: DocumentData): PortfolioSnapshot {
  return {
    date: data.date ?? '',
    portfolioValue: Number(data.portfolioValue ?? 0),
    cashBalance: Number(data.cashBalance ?? 0),
    totalValue: Number(data.totalValue ?? 0),
    dayChange: Number(data.dayChange ?? 0),
    dayChangePercent: Number(data.dayChangePercent ?? 0),
  };
}

export async function getPortfolioHistory(userId: string): Promise<PortfolioSnapshot[]> {
  const snap = await getDocs(
    query(collection(db, LIVE_COLLECTIONS.portfolioSnapshots), where('userId', '==', userId), orderBy('date', 'asc')),
  );
  return snap.docs.map((d) => mapSnapshot(d.data()));
}

const runPortfolioSnapshotNowFn = httpsCallable<void, { snapshotted: number }>(functions, 'runPortfolioSnapshotNow');

export async function runPortfolioSnapshotNow() {
  const res = await runPortfolioSnapshotNowFn();
  return res.data;
}

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';

export type AlertCondition = 'above' | 'below';
export type AlertStatus = 'active' | 'triggered' | 'cancelled';

export interface PriceAlert {
  id: string;
  userId: string;
  assetId: string;
  symbol: string;
  condition: AlertCondition;
  targetPrice: number;
  status: AlertStatus;
  seen: boolean;
  createdAt?: Date;
  triggeredAt?: Date;
  triggeredPrice?: number;
}

function mapAlert(id: string, data: DocumentData): PriceAlert {
  return {
    id,
    userId: data.userId ?? '',
    assetId: data.assetId ?? '',
    symbol: data.symbol ?? '',
    condition: data.condition ?? 'above',
    targetPrice: Number(data.targetPrice ?? 0),
    status: data.status ?? 'active',
    seen: Boolean(data.seen ?? true),
    createdAt: data.createdAt?.toDate?.(),
    triggeredAt: data.triggeredAt?.toDate?.(),
    triggeredPrice: data.triggeredPrice != null ? Number(data.triggeredPrice) : undefined,
  };
}

export async function getAlertsForUser(userId: string): Promise<PriceAlert[]> {
  const snap = await getDocs(
    query(collection(db, LIVE_COLLECTIONS.priceAlerts), where('userId', '==', userId), orderBy('createdAt', 'desc')),
  );
  return snap.docs.map((d) => mapAlert(d.id, d.data()));
}

export async function createPriceAlert(input: {
  userId: string;
  assetId: string;
  symbol: string;
  condition: AlertCondition;
  targetPrice: number;
}) {
  await addDoc(collection(db, LIVE_COLLECTIONS.priceAlerts), {
    ...input,
    symbol: input.symbol.toUpperCase(),
    status: 'active',
    seen: true,
    createdAt: new Date(),
  });
}

export async function cancelPriceAlert(alertId: string) {
  await updateDoc(doc(db, LIVE_COLLECTIONS.priceAlerts, alertId), { status: 'cancelled', updatedAt: new Date() });
}

export async function markAlertSeen(alertId: string) {
  await updateDoc(doc(db, LIVE_COLLECTIONS.priceAlerts, alertId), { seen: true, updatedAt: new Date() });
}

export async function deletePriceAlert(alertId: string) {
  await deleteDoc(doc(db, LIVE_COLLECTIONS.priceAlerts, alertId));
}

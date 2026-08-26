import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, type DocumentData } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';

export interface Strategy {
  id: string;
  name: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  targetAllocation: string;
  createdAt?: Date;
}

function mapStrategy(id: string, data: DocumentData): Strategy {
  return {
    id,
    name: data.name ?? '',
    description: data.description ?? '',
    riskLevel: data.riskLevel ?? 'medium',
    targetAllocation: data.targetAllocation ?? '',
    createdAt: data.createdAt?.toDate?.(),
  };
}

export async function getAllStrategies(): Promise<Strategy[]> {
  const snap = await getDocs(query(collection(db, LIVE_COLLECTIONS.strategies), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => mapStrategy(d.id, d.data()));
}

export async function createStrategy(input: Omit<Strategy, 'id' | 'createdAt'>) {
  return addDoc(collection(db, LIVE_COLLECTIONS.strategies), { ...input, createdAt: new Date() });
}

export async function deleteStrategy(id: string) {
  await deleteDoc(doc(db, LIVE_COLLECTIONS.strategies, id));
}

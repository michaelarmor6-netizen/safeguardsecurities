// The do-not-contact list. Mirrors the dialer's DNC semantics: checked at
// import AND at every outbound use, because a suppression list consulted
// only once is a suppression list that leaks.
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, where, type DocumentData } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { LIVE_COLLECTIONS } from '../../../config/liveCollections';
import type { CrmSuppressionEntry } from './crmTypes';

function mapEntry(id: string, data: DocumentData): CrmSuppressionEntry {
  return {
    id,
    type: data.type ?? 'email',
    value: data.value ?? '',
    reason: data.reason ?? 'manual',
    source: data.source,
    addedAt: data.addedAt?.toDate?.(),
  };
}

export async function listSuppression(): Promise<CrmSuppressionEntry[]> {
  const snap = await getDocs(query(collection(db, LIVE_COLLECTIONS.crmSuppression), orderBy('addedAt', 'desc')));
  return snap.docs.map((d) => mapEntry(d.id, d.data()));
}

export async function addSuppression(entry: Omit<CrmSuppressionEntry, 'id' | 'addedAt'>): Promise<void> {
  await addDoc(collection(db, LIVE_COLLECTIONS.crmSuppression), { ...entry, addedAt: new Date() });
}

export async function removeSuppression(id: string): Promise<void> {
  await deleteDoc(doc(db, LIVE_COLLECTIONS.crmSuppression, id));
}

// Batch membership check. Firestore 'in' caps at 30 values per query, so we
// chunk; a 5,000-row import costs ~170 reads here, which is fine.
export async function findSuppressed(values: string[]): Promise<Set<string>> {
  const suppressed = new Set<string>();
  const unique = [...new Set(values.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 30) {
    const chunk = unique.slice(i, i + 30);
    const snap = await getDocs(query(collection(db, LIVE_COLLECTIONS.crmSuppression), where('value', 'in', chunk)));
    snap.docs.forEach((d) => suppressed.add(d.data().value));
  }
  return suppressed;
}

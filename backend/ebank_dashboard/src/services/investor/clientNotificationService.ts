import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';

export type ClientNoticeType = 'invoice';

export interface ClientNotice {
  id: string;
  userId: string;
  type: ClientNoticeType;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt?: Date;
}

function mapNotice(id: string, data: DocumentData): ClientNotice {
  return {
    id,
    userId: data.userId ?? '',
    type: data.type === 'invoice' ? 'invoice' : 'invoice',
    title: data.title ?? 'Notification',
    body: data.body ?? '',
    href: data.href ?? '/workspace/invoices',
    read: data.read === true,
    createdAt: data.createdAt?.toDate?.(),
  };
}

export async function getNoticesForUser(userId: string): Promise<ClientNotice[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, LIVE_COLLECTIONS.clientNotifications),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(40),
      ),
    );
    return snap.docs.map((d) => mapNotice(d.id, d.data()));
  } catch {
    const snap = await getDocs(
      query(collection(db, LIVE_COLLECTIONS.clientNotifications), where('userId', '==', userId), limit(40)),
    );
    return snap.docs
      .map((d) => mapNotice(d.id, d.data()))
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }
}

export function subscribeNoticesForUser(
  userId: string,
  onChange: (rows: ClientNotice[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, LIVE_COLLECTIONS.clientNotifications),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(40),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => mapNotice(d.id, d.data()))),
    () => {
      getNoticesForUser(userId).then(onChange).catch(() => onChange([]));
    },
  );
}

export async function markNoticeRead(id: string) {
  await updateDoc(doc(db, LIVE_COLLECTIONS.clientNotifications, id), {
    read: true,
    updatedAt: new Date(),
  });
}

export async function markAllNoticesRead(rows: ClientNotice[]) {
  await Promise.all(rows.filter((r) => !r.read).map((r) => markNoticeRead(r.id)));
}

import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';

export interface StaffNotice {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string;
  invoiceId?: string;
  userId?: string;
  read: boolean;
  createdAt?: Date;
}

function mapNotice(id: string, data: DocumentData): StaffNotice {
  return {
    id,
    type: String(data.type ?? ''),
    title: data.title ?? 'Notification',
    body: data.body ?? '',
    href: data.href ?? '/admin/transactions',
    invoiceId: data.invoiceId,
    userId: data.userId,
    read: data.read === true,
    createdAt: data.createdAt?.toDate?.(),
  };
}

export function subscribeStaffNotices(
  onChange: (rows: StaffNotice[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, LIVE_COLLECTIONS.staffNotifications),
    orderBy('createdAt', 'desc'),
    limit(40),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => mapNotice(d.id, d.data()))),
    () => {
      getDocs(query(collection(db, LIVE_COLLECTIONS.staffNotifications), limit(40)))
        .then((snap) =>
          onChange(
            snap.docs
              .map((d) => mapNotice(d.id, d.data()))
              .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)),
          ),
        )
        .catch(() => onChange([]));
    },
  );
}

export async function markStaffNoticeRead(id: string) {
  await updateDoc(doc(db, LIVE_COLLECTIONS.staffNotifications, id), {
    read: true,
    updatedAt: new Date(),
  });
}

export async function markAllStaffNoticesRead(rows: StaffNotice[]) {
  await Promise.all(rows.filter((r) => !r.read).map((r) => markStaffNoticeRead(r.id)));
}

import { addDoc, collection, getDocs, orderBy, query, type DocumentData } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  details?: string;
  createdAt?: Date;
}

function mapEntry(id: string, data: DocumentData): AuditLogEntry {
  return {
    id,
    actorId: data.actorId ?? '',
    actorEmail: data.actorEmail ?? '',
    action: data.action ?? '',
    details: data.details,
    createdAt: data.createdAt?.toDate?.(),
  };
}

export async function logAction(actorId: string, actorEmail: string, action: string, details?: string) {
  // Best-effort - a logging failure should never block the underlying admin action.
  try {
    await addDoc(collection(db, LIVE_COLLECTIONS.auditLogs), {
      actorId,
      actorEmail,
      action,
      details: details ?? null,
      createdAt: new Date(),
    });
  } catch (e) {
    console.error('Failed to write audit log entry:', e);
  }
}

export async function getAuditLog(): Promise<AuditLogEntry[]> {
  const snap = await getDocs(query(collection(db, LIVE_COLLECTIONS.auditLogs), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => mapEntry(d.id, d.data()));
}

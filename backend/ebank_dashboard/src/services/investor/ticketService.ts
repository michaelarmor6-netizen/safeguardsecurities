import { addDoc, collection, doc, getDocs, orderBy, query, updateDoc, where, type DocumentData } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail?: string;
  subject: string;
  message: string;
  status: 'open' | 'answered' | 'closed';
  adminReply?: string;
  createdAt?: Date;
}

function mapTicket(id: string, data: DocumentData): SupportTicket {
  return {
    id,
    userId: data.userId ?? '',
    userEmail: data.userEmail,
    subject: data.subject ?? '',
    message: data.message ?? '',
    status: data.status ?? 'open',
    adminReply: data.adminReply,
    createdAt: data.createdAt?.toDate?.(),
  };
}

export async function getAllTickets(): Promise<SupportTicket[]> {
  const snap = await getDocs(query(collection(db, LIVE_COLLECTIONS.supportTickets), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => mapTicket(d.id, d.data()));
}

export async function getTicketsForUser(userId: string): Promise<SupportTicket[]> {
  const snap = await getDocs(
    query(collection(db, LIVE_COLLECTIONS.supportTickets), where('userId', '==', userId), orderBy('createdAt', 'desc')),
  );
  return snap.docs.map((d) => mapTicket(d.id, d.data()));
}

export async function createTicket(userId: string, userEmail: string, subject: string, message: string) {
  return addDoc(collection(db, LIVE_COLLECTIONS.supportTickets), {
    userId,
    userEmail,
    subject,
    message,
    status: 'open',
    createdAt: new Date(),
  });
}

export async function replyToTicket(id: string, adminReply: string) {
  await updateDoc(doc(db, LIVE_COLLECTIONS.supportTickets, id), {
    adminReply,
    status: 'answered',
    updatedAt: new Date(),
  });
}

export async function closeTicket(id: string) {
  await updateDoc(doc(db, LIVE_COLLECTIONS.supportTickets, id), { status: 'closed', updatedAt: new Date() });
}

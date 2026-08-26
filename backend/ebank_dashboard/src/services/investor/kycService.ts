import { addDoc, collection, doc, getDocs, orderBy, query, updateDoc, where, type DocumentData } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';

export interface KycSubmission {
  id: string;
  userId: string;
  userEmail?: string;
  fullName: string;
  dateOfBirth: string;
  address: string;
  phone: string;
  idType: string;
  idNumber: string;
  idDocumentUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
  reviewNote?: string;
  createdAt?: Date;
}

function mapSubmission(id: string, data: DocumentData): KycSubmission {
  return {
    id,
    userId: data.userId ?? '',
    userEmail: data.userEmail,
    fullName: data.fullName ?? '',
    dateOfBirth: data.dateOfBirth ?? '',
    address: data.address ?? '',
    phone: data.phone ?? '',
    idType: data.idType ?? '',
    idNumber: data.idNumber ?? '',
    idDocumentUrl: data.idDocumentUrl,
    status: data.status ?? 'pending',
    reviewNote: data.reviewNote,
    createdAt: data.createdAt?.toDate?.(),
  };
}

// Some browsers/OSes (notably photos exported via WhatsApp on Android) hand
// File objects with an empty or generic `.type`. storage.rules requires a
// real image/* or application/pdf contentType on the upload, so a blank
// File.type gets silently rejected with a 403 - determine it from the file
// extension instead of trusting the browser-reported MIME type.
function resolveContentType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'heic':
      return 'image/heic';
    case 'webp':
      return 'image/webp';
    case 'pdf':
      return 'application/pdf';
    default:
      return file.type || 'application/octet-stream';
  }
}

export async function uploadKycDocument(userId: string, file: File): Promise<string> {
  const path = `kyc/${userId}/${Date.now()}_${file.name}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { contentType: resolveContentType(file) });
  return getDownloadURL(fileRef);
}

export async function submitKyc(input: Omit<KycSubmission, 'id' | 'status' | 'createdAt'>) {
  return addDoc(collection(db, LIVE_COLLECTIONS.kycSubmissions), {
    ...input,
    status: 'pending',
    createdAt: new Date(),
  });
}

export async function getKycSubmissionsForUser(userId: string): Promise<KycSubmission[]> {
  const snap = await getDocs(
    query(collection(db, LIVE_COLLECTIONS.kycSubmissions), where('userId', '==', userId), orderBy('createdAt', 'desc')),
  );
  return snap.docs.map((d) => mapSubmission(d.id, d.data()));
}

export async function getAllKycSubmissions(): Promise<KycSubmission[]> {
  const snap = await getDocs(query(collection(db, LIVE_COLLECTIONS.kycSubmissions), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => mapSubmission(d.id, d.data()));
}

export async function reviewKyc(id: string, status: 'verified' | 'rejected', reviewNote?: string) {
  await updateDoc(doc(db, LIVE_COLLECTIONS.kycSubmissions, id), {
    status,
    reviewNote: reviewNote ?? null,
    updatedAt: new Date(),
  });
}

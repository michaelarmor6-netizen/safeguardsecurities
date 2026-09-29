import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where, type DocumentData } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';
import { isKycDocType, resolveKycUpload, type KycDocStatus, type KycDocType } from '../../lib/kycDocuments';

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
  // The ID file is optional. Firestore rejects undefined, so leave idDocumentUrl
  // off the document when the client did not upload one.
  const { idDocumentUrl, ...rest } = input;
  return addDoc(collection(db, LIVE_COLLECTIONS.kycSubmissions), {
    ...rest,
    ...(idDocumentUrl ? { idDocumentUrl } : {}),
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

export interface KycDocument {
  id: string;
  userId: string;
  userEmail?: string;
  clientName: string;
  docType: string;
  fileName: string;
  storagePath?: string;
  fileUrl?: string;
  fileRemoved: boolean;
  status: KycDocStatus;
  reviewNote?: string;
  submittedAt?: Date;
}

function mapDocument(id: string, data: DocumentData): KycDocument {
  return {
    id,
    userId: data.userId ?? '',
    userEmail: data.userEmail,
    clientName: data.clientName ?? '',
    docType: data.docType ?? '',
    fileName: data.fileName ?? '',
    storagePath: data.storagePath,
    fileUrl: data.fileUrl,
    fileRemoved: data.fileRemoved === true,
    status: data.status ?? 'pending',
    reviewNote: data.reviewNote,
    submittedAt: data.submittedAt?.toDate?.(),
  };
}

export async function uploadIdentityDocument(input: {
  userId: string;
  userEmail: string;
  clientName: string;
  docType: KycDocType;
  file: File;
}): Promise<void> {
  const resolved = resolveKycUpload(input.file);
  if (!resolved.ok) throw new Error(resolved.error);
  if (!isKycDocType(input.docType)) throw new Error('Select a document type.');

  const safeName = input.file.name.replace(/[^\w.\-]+/g, '_');
  const storagePath = `kyc/${input.userId}/${Date.now()}_${safeName}`;
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, input.file, { contentType: resolved.contentType });
  const fileUrl = await getDownloadURL(fileRef);

  await addDoc(collection(db, LIVE_COLLECTIONS.kycDocuments), {
    userId: input.userId,
    userEmail: input.userEmail,
    clientName: input.clientName,
    docType: input.docType,
    fileName: input.file.name,
    storagePath,
    fileUrl,
    fileRemoved: false,
    status: 'pending',
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getKycDocumentsForUser(userId: string): Promise<KycDocument[]> {
  const snap = await getDocs(
    query(collection(db, LIVE_COLLECTIONS.kycDocuments), where('userId', '==', userId), orderBy('submittedAt', 'desc')),
  );
  return snap.docs.map((d) => mapDocument(d.id, d.data()));
}

export async function getAllKycDocuments(): Promise<KycDocument[]> {
  const snap = await getDocs(query(collection(db, LIVE_COLLECTIONS.kycDocuments), orderBy('submittedAt', 'desc')));
  return snap.docs.map((d) => mapDocument(d.id, d.data()));
}

export async function removeIdentityDocument(docRow: KycDocument): Promise<void> {
  if (docRow.status === 'approved') throw new Error('Approved documents cannot be removed.');
  if (docRow.storagePath && !docRow.fileRemoved) {
    await deleteObject(ref(storage, docRow.storagePath));
  }
  await updateDoc(doc(db, LIVE_COLLECTIONS.kycDocuments, docRow.id), {
    fileRemoved: true,
    updatedAt: serverTimestamp(),
  });
}

export async function reviewIdentityDocument(
  id: string,
  status: 'approved' | 'rejected',
  reviewNote?: string,
) {
  if (status === 'rejected' && !reviewNote?.trim()) {
    throw new Error('Add a note explaining the rejection.');
  }
  await updateDoc(doc(db, LIVE_COLLECTIONS.kycDocuments, id), {
    status,
    reviewNote: reviewNote?.trim() || null,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

import { arrayUnion, collection, deleteField, doc, getDoc, getDocs, onSnapshot, orderBy, query, runTransaction, updateDoc, where, type DocumentData, type Unsubscribe } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { fundingReference } from './fundingDetailsService';
import { db, storage } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';
import { creditWallet, ensureWalletRef } from './walletService';

// Two-step lifecycle (2026-08-24): 'approved' now means "approved - funding
// details sent to the client, awaiting their payment" (awaitingPayment=true);
// the wallet is only credited when finance confirms receipt ('funded').
// Legacy rows approved before this change were credited AT approval and have
// no awaitingPayment flag - never show them a Confirm button (double-credit).
// A proof-of-payment file the client attached after tapping "I've sent the
// payment" - a bank transfer screenshot, wire receipt PDF, etc. Stored in
// Storage under payment-proofs/{userId}/{requestId}/; metadata rides on the
// request doc so both the client card and the admin Funding page can list it.
export interface PaymentProof {
  name: string;
  url: string;
  path: string;
  size: number;
  contentType: string;
  uploadedAt?: Date;
}

export interface FundingRequest {
  id: string;
  userId: string;
  userEmail?: string;
  amount: number;
  status: 'pending' | 'approved' | 'funded' | 'rejected';
  reference?: string; // system-generated SG-FUND{YY}{NNNNN}; legacy rows derive from doc id
  awaitingPayment?: boolean;
  createdAt?: Date;
  approvedAt?: Date;
  fundedAt?: Date;
  paymentClaimedAt?: Date; // client tapped the I-have-sent-the-payment button
  paymentProofs?: PaymentProof[]; // receipts the client uploaded after claiming
  emailSentAt?: Date;
  emailError?: string;
  /** 'admin' = recorded straight onto the client by staff (no client request). */
  source?: 'client' | 'admin';
  /** Free-text finance memo on an admin-recorded credit (wire ref, reason). */
  note?: string;
  recordedByEmail?: string;
  recordedByUid?: string;
}

function mapFunding(id: string, data: DocumentData): FundingRequest {
  return {
    id,
    userId: data.userId ?? '',
    userEmail: data.userEmail,
    amount: Number(data.amount ?? 0),
    status: data.status ?? 'pending',
    reference: data.reference,
    awaitingPayment: data.awaitingPayment === true,
    createdAt: data.createdAt?.toDate?.(),
    approvedAt: data.approvedAt?.toDate?.(),
    fundedAt: data.fundedAt?.toDate?.(),
    paymentClaimedAt: data.paymentClaimedAt?.toDate?.(),
    paymentProofs: Array.isArray(data.paymentProofs)
      ? data.paymentProofs.map((p: DocumentData) => ({
          name: String(p.name ?? 'receipt'),
          url: String(p.url ?? ''),
          path: String(p.path ?? ''),
          size: Number(p.size ?? 0),
          contentType: String(p.contentType ?? ''),
          uploadedAt: p.uploadedAt?.toDate?.(),
        }))
      : [],
    emailSentAt: data.emailSentAt?.toDate?.(),
    emailError: data.emailError,
    source: data.source === 'admin' ? 'admin' : 'client',
    note: data.note,
    recordedByEmail: data.recordedByEmail,
    recordedByUid: data.recordedByUid,
  };
}

export async function getAllFundingRequests(): Promise<FundingRequest[]> {
  const snap = await getDocs(
    query(collection(db, LIVE_COLLECTIONS.fundingRequests), orderBy('createdAt', 'desc')),
  );
  return snap.docs.map((d) => mapFunding(d.id, d.data()));
}

export async function getPendingFundingRequests() {
  const snap = await getDocs(
    query(collection(db, LIVE_COLLECTIONS.fundingRequests), where('status', '==', 'pending')),
  );
  return snap.docs.map((d) => mapFunding(d.id, d.data()));
}

export async function updateFundingRequest(id: string, status: FundingRequest['status']) {
  await updateDoc(doc(db, LIVE_COLLECTIONS.fundingRequests, id), { status, updatedAt: new Date() });
}

// Single request - used by the funding invoice page. Rules enforce access
// (owner or admin); a client requesting someone else's doc gets a permission
// error surfaced by the caller.
export async function getFundingRequestById(id: string): Promise<FundingRequest | null> {
  const snap = await getDoc(doc(db, LIVE_COLLECTIONS.fundingRequests, id));
  return snap.exists() ? mapFunding(snap.id, snap.data()) : null;
}

export async function getFundingRequestsForUser(userId: string): Promise<FundingRequest[]> {
  const snap = await getDocs(
    query(collection(db, LIVE_COLLECTIONS.fundingRequests), where('userId', '==', userId), orderBy('createdAt', 'desc')),
  );
  return snap.docs.map((d) => mapFunding(d.id, d.data()));
}

// Live view of the client's own requests: the Wallet page updates the moment
// an admin approves / confirms - no refresh needed (non-technical clients
// never refresh). Returns the unsubscribe function.
export function watchFundingRequestsForUser(
  userId: string,
  onChange: (requests: FundingRequest[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, LIVE_COLLECTIONS.fundingRequests), where('userId', '==', userId), orderBy('createdAt', 'desc')),
    (snap) => onChange(snap.docs.map((d) => mapFunding(d.id, d.data()))),
    (e) => onError?.(e),
  );
}

// Client-side I-have-sent-the-payment: stamps paymentClaimedAt so finance
// knows to go check the bank. Rules allow the owner to update ONLY this field.
export async function claimPaymentSent(id: string) {
  await updateDoc(doc(db, LIVE_COLLECTIONS.fundingRequests, id), {
    paymentClaimedAt: new Date(),
    updatedAt: new Date(),
  });
}

// ---- proof of payment upload ----

// What the file picker offers; storage.rules enforces the same set server-side.
export const PROOF_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.gif,.doc,.docx';
export const PROOF_MAX_BYTES = 15 * 1024 * 1024;

// Some browsers/OSes (notably photos exported via WhatsApp on Android) hand
// File objects with an empty or generic `.type`. storage.rules requires a
// real contentType on the upload, so a blank File.type gets silently rejected
// with a 403 - determine it from the file extension instead. (Same fix as
// kycService.resolveContentType, plus the Word/receipt formats.)
function resolveProofContentType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'heic': return 'image/heic';
    case 'heif': return 'image/heif';
    case 'pdf': return 'application/pdf';
    case 'doc': return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default: return file.type || 'application/octet-stream';
  }
}

// Upload one receipt and attach its metadata to the request doc. Rules allow
// the owner to touch ONLY paymentClaimedAt/paymentProofs/updatedAt, and the
// Storage path is owner-writable, staff-readable (see storage.rules).
export async function uploadPaymentProof(requestId: string, userId: string, file: File): Promise<PaymentProof> {
  if (file.size > PROOF_MAX_BYTES) {
    throw new Error(`"${file.name}" is too large - files must be under 15MB.`);
  }
  const contentType = resolveProofContentType(file);
  const safeName = file.name.replace(/[^\w.\- ]+/g, '_');
  const path = `payment-proofs/${userId}/${requestId}/${Date.now()}_${safeName}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { contentType });
  const url = await getDownloadURL(fileRef);
  const proof: PaymentProof = { name: file.name, url, path, size: file.size, contentType, uploadedAt: new Date() };
  await updateDoc(doc(db, LIVE_COLLECTIONS.fundingRequests, requestId), {
    paymentProofs: arrayUnion(proof),
    updatedAt: new Date(),
  });
  return proof;
}

// The reference shown everywhere for a request: the stored generated number,
// with a fallback to the legacy doc-id form for rows created before the
// generator existed (2026-08-24).
export function requestReference(r: Pick<FundingRequest, 'id' | 'reference'>): string {
  return r.reference ?? fundingReference(r.id);
}

// Generates SG-FUND{YY}{NNNNN} from a per-year sequential counter
// (counters/funding-{YYYY}, see firestore.rules) so finance gets short,
// human-quotable, collision-free numbers. Counter + request are committed in
// one transaction; contention is negligible at funding-request volume.
export async function createFundingRequest(userId: string, userEmail: string, amount: number) {
  const now = new Date();
  const year = now.getFullYear();
  const counterRef = doc(db, 'counters', `funding-${year}`);
  const requestRef = doc(collection(db, LIVE_COLLECTIONS.fundingRequests));
  await runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const next = (counterSnap.exists() ? Number(counterSnap.data().value ?? 0) : 0) + 1;
    const reference = `SG-FUND${String(year % 100).padStart(2, '0')}${String(next).padStart(5, '0')}`;
    tx.set(counterRef, { value: next });
    tx.set(requestRef, {
      userId,
      userEmail,
      amount,
      status: 'pending',
      reference,
      createdAt: now,
    });
  });
  return requestRef;
}

// Step 1: approve. Does NOT credit the wallet. Sets awaitingPayment so the
// client sees the payment instructions in-app, and the functions-accounts
// Firestore trigger (sendFundingDetailsOnApproval) emails them a copy.
export async function approveFundingRequest(request: FundingRequest) {
  await updateDoc(doc(db, LIVE_COLLECTIONS.fundingRequests, request.id), {
    status: 'approved',
    awaitingPayment: true,
    approvedAt: new Date(),
    updatedAt: new Date(),
  });
}

// Manual email path: the admin sent the funding details from their own mail
// client (mailto: link on the Funding page) and marks the request as emailed.
export async function markFundingEmailSent(id: string) {
  await updateDoc(doc(db, LIVE_COLLECTIONS.fundingRequests, id), {
    emailSentAt: new Date(),
    emailError: deleteField(),
    updatedAt: new Date(),
  });
}

// Step 2: finance confirms the money actually arrived - only now is the
// wallet credited. Guard: only awaitingPayment rows are eligible (legacy
// 'approved' rows were already credited at approval).
export async function confirmFundingReceived(request: FundingRequest) {
  if (request.status !== 'approved' || request.awaitingPayment !== true) {
    throw new Error('Only approved requests awaiting payment can be marked funded.');
  }
  const { newBalance } = await creditWallet(request.userId, request.amount);
  await updateDoc(doc(db, LIVE_COLLECTIONS.fundingRequests, request.id), {
    status: 'funded',
    awaitingPayment: false,
    fundedAt: new Date(),
    updatedAt: new Date(),
  });
  return newBalance;
}

// ---- admin-recorded funding (top-up) ----

// A client who is already funded rarely files a fresh in-app request when they
// wire more money - they just send it and call their account manager. Before
// this, finance had no way to record that: the only path to a wallet credit was
// client request -> approve -> confirm receipt, so the money either sat
// uncredited or someone edited a balance out of band with no paper trail.
//
// This records the deposit the same way the normal flow ends up: a funding
// request that is BORN 'funded', with its own SG-FUND reference, so it lands on
// Transactions, exports in the finance CSV and prints an invoice/receipt like
// any other deposit. `source: 'admin'` marks it as desk-recorded rather than
// client-requested.
//
// Counter bump + request doc + wallet credit all commit in ONE transaction:
// there is no window where the reference is burned but the money is not in, or
// the wallet moved but nothing recorded it.
//
// No email fires: sendFundingDetailsOnApproval only triggers on pending ->
// approved, and payment instructions would make no sense for money that has
// already arrived.

/** Sanity ceiling on a single manual credit - catches a slipped decimal point. */
export const MAX_MANUAL_CREDIT = 10_000_000;

export interface AddFundsInput {
  userId: string;
  userEmail?: string;
  amount: number;
  /** Finance memo: wire reference, "top-up per call 2026-08-31", etc. */
  note?: string;
  adminUid: string;
  adminEmail?: string;
}

export interface AddFundsResult {
  requestId: string;
  reference: string;
  amount: number;
  previousBalance: number;
  newBalance: number;
}

export async function addFundsToClient(input: AddFundsInput): Promise<AddFundsResult> {
  if (!input.userId) throw new Error('Pick a client first.');
  if (!input.adminUid) throw new Error('Your admin session expired - sign in again.');
  const amount = Math.round(Number(input.amount) * 100) / 100; // money, to the cent
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Enter an amount greater than zero.');
  }
  if (amount > MAX_MANUAL_CREDIT) {
    throw new Error(`Single credits are capped at ${MAX_MANUAL_CREDIT.toLocaleString('en-US')} - split it or check the decimal point.`);
  }

  const now = new Date();
  const year = now.getFullYear();
  const counterRef = doc(db, 'counters', `funding-${year}`);
  // Resolved before the transaction: the wallet is found by query, and a
  // transaction can only read a known doc ref.
  const walletRef = await ensureWalletRef(input.userId);
  const requestRef = doc(collection(db, LIVE_COLLECTIONS.fundingRequests));

  return runTransaction(db, async (tx) => {
    // All reads before any write - Firestore transaction rule.
    const counterSnap = await tx.get(counterRef);
    const walletSnap = await tx.get(walletRef);
    if (!walletSnap.exists()) throw new Error('Wallet no longer exists - reload and try again.');

    const next = (counterSnap.exists() ? Number(counterSnap.data().value ?? 0) : 0) + 1;
    const reference = `SG-FUND${String(year % 100).padStart(2, '0')}${String(next).padStart(5, '0')}`;
    const previousBalance = Number(walletSnap.data().balance ?? 0);
    const newBalance = previousBalance + amount;

    tx.set(counterRef, { value: next });
    tx.set(requestRef, {
      userId: input.userId,
      userEmail: input.userEmail ?? '',
      amount,
      status: 'funded',
      awaitingPayment: false,
      reference,
      source: 'admin',
      ...(input.note?.trim() ? { note: input.note.trim() } : {}),
      recordedByUid: input.adminUid,
      recordedByEmail: input.adminEmail ?? '',
      createdAt: now,
      approvedAt: now, // the invoice dates off this; recording IS the approval
      fundedAt: now,
      updatedAt: now,
    });
    tx.update(walletRef, { balance: newBalance, updatedAt: now });

    return { requestId: requestRef.id, reference, amount, previousBalance, newBalance };
  });
}

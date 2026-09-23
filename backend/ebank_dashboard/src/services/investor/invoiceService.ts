import {
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../../config/firebase';
import {
  PROOF_ACCEPT,
  PROOF_MAX_BYTES,
  type PaymentProof,
} from './fundingService';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';
import { getPlatformSettings, DEFAULTS } from './settingsService';

export interface InvoiceNumbering {
  prefix: string;
  includeYear: boolean;
  padLength: number;
}

export function sanitizeInvoicePrefix(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return cleaned.slice(0, 16) || DEFAULTS.invoicePrefix;
}

export function clampInvoicePad(n: number): number {
  const v = Math.floor(Number(n) || DEFAULTS.invoicePadLength);
  return Math.min(8, Math.max(3, v));
}

export function formatInvoiceNumber(
  numbering: InvoiceNumbering,
  sequence: number,
  year = new Date().getFullYear(),
): string {
  const prefix = sanitizeInvoicePrefix(numbering.prefix);
  const pad = clampInvoicePad(numbering.padLength);
  const yearPart = numbering.includeYear ? String(year % 100).padStart(2, '0') : '';
  return `${prefix}${yearPart}${String(sequence).padStart(pad, '0')}`;
}

export function invoiceCounterId(includeYear: boolean, year = new Date().getFullYear()): string {
  return includeYear ? `invoices-${year}` : 'invoices';
}

export async function getInvoiceNumbering(): Promise<InvoiceNumbering> {
  const s = await getPlatformSettings();
  return {
    prefix: sanitizeInvoicePrefix(s.invoicePrefix),
    includeYear: s.invoiceIncludeYear,
    padLength: clampInvoicePad(s.invoicePadLength),
  };
}

export async function getInvoiceNextSequence(includeYear: boolean): Promise<number> {
  const snap = await getDoc(doc(db, 'counters', invoiceCounterId(includeYear)));
  const last = snap.exists() ? Number(snap.data().value ?? 0) : 0;
  return last + 1;
}

/** Persist last-issued so the next create uses `nextSequence`. */
export async function setInvoiceNextSequence(includeYear: boolean, nextSequence: number): Promise<void> {
  const n = Math.floor(Number(nextSequence) || 1);
  if (n < 1) throw new Error('Next sequence must be at least 1.');
  await runTransaction(db, async (tx) => {
    tx.set(doc(db, 'counters', invoiceCounterId(includeYear)), { value: n - 1 });
  });
}

export type InvoiceStatus = 'issued' | 'sent' | 'paid' | 'void';
export type InvoiceSendMode = 'auto' | 'manual';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface StaffInvoice {
  id: string;
  number: string;
  userId: string;
  billToName: string;
  billToEmail: string;
  billToCompany?: string;
  billToAddress?: string;
  currency: string;
  lineItems: InvoiceLineItem[];
  taxRate: number;
  taxLabel: string;
  notes?: string;
  paymentTerms?: string;
  dueDate?: Date;
  includePaymentInstructions: boolean;
  sendMode: InvoiceSendMode;
  status: InvoiceStatus;
  issuedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  createdByUid: string;
  createdByEmail: string;
  emailSentAt?: Date;
  emailError?: string;
  paymentClaimedAt?: Date;
  paymentProofs?: PaymentProof[];
  paidAt?: Date;
}

export interface CreateInvoiceInput {
  userId: string;
  billToName: string;
  billToEmail: string;
  billToCompany?: string;
  billToAddress?: string;
  currency: string;
  lineItems: InvoiceLineItem[];
  taxRate: number;
  taxLabel: string;
  notes?: string;
  paymentTerms?: string;
  dueDate?: Date | null;
  includePaymentInstructions: boolean;
  sendMode: InvoiceSendMode;
  createdByUid: string;
  createdByEmail: string;
}

export function invoiceSubtotal(items: InvoiceLineItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

export function invoiceTaxAmount(items: InvoiceLineItem[], taxRate: number): number {
  return invoiceSubtotal(items) * (Number(taxRate) || 0) / 100;
}

export function invoiceTotal(items: InvoiceLineItem[], taxRate: number): number {
  return invoiceSubtotal(items) + invoiceTaxAmount(items, taxRate);
}

export function formatInvoiceMoney(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

function mapLineItems(raw: unknown): InvoiceLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => ({
    description: String(item?.description ?? ''),
    quantity: Number(item?.quantity ?? 0),
    unitPrice: Number(item?.unitPrice ?? 0),
  }));
}

function mapInvoice(id: string, data: DocumentData): StaffInvoice {
  return {
    id,
    number: data.number ?? '',
    userId: data.userId ?? '',
    billToName: data.billToName ?? '',
    billToEmail: data.billToEmail ?? '',
    billToCompany: data.billToCompany,
    billToAddress: data.billToAddress,
    currency: data.currency ?? 'USD',
    lineItems: mapLineItems(data.lineItems),
    taxRate: Number(data.taxRate ?? 0),
    taxLabel: data.taxLabel ?? 'Tax',
    notes: data.notes,
    paymentTerms: data.paymentTerms,
    dueDate: data.dueDate?.toDate?.(),
    includePaymentInstructions: data.includePaymentInstructions === true,
    sendMode: data.sendMode === 'manual' ? 'manual' : 'auto',
    status: (['issued', 'sent', 'paid', 'void'] as InvoiceStatus[]).includes(data.status)
      ? data.status
      : 'issued',
    issuedAt: data.issuedAt?.toDate?.(),
    createdAt: data.createdAt?.toDate?.(),
    updatedAt: data.updatedAt?.toDate?.(),
    createdByUid: data.createdByUid ?? '',
    createdByEmail: data.createdByEmail ?? '',
    emailSentAt: data.emailSentAt?.toDate?.(),
    emailError: data.emailError,
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
    paidAt: data.paidAt?.toDate?.(),
  };
}

export async function createStaffInvoice(input: CreateInvoiceInput): Promise<string> {
  const items = input.lineItems.filter((i) => i.description.trim() && i.quantity > 0);
  if (!items.length) throw new Error('Add at least one line item.');
  if (!input.billToName.trim()) throw new Error('Bill-to name is required.');
  if (!input.billToEmail.trim() || !input.billToEmail.includes('@')) {
    throw new Error('A valid bill-to email is required.');
  }
  if (!input.userId) throw new Error('Select a client.');

  const now = new Date();
  const year = now.getFullYear();
  const numbering = await getInvoiceNumbering();
  const counterRef = doc(db, 'counters', invoiceCounterId(numbering.includeYear, year));
  const invoiceRef = doc(collection(db, LIVE_COLLECTIONS.invoices));
  let issuedNumber = '';

  await runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const next = (counterSnap.exists() ? Number(counterSnap.data().value ?? 0) : 0) + 1;
    const number = formatInvoiceNumber(numbering, next, year);
    tx.set(counterRef, { value: next });
    tx.set(invoiceRef, {
      number,
      userId: input.userId,
      billToName: input.billToName.trim(),
      billToEmail: input.billToEmail.trim().toLowerCase(),
      billToCompany: input.billToCompany?.trim() || null,
      billToAddress: input.billToAddress?.trim() || null,
      currency: input.currency || 'USD',
      lineItems: items,
      taxRate: Number(input.taxRate) || 0,
      taxLabel: input.taxLabel.trim() || 'Tax',
      notes: input.notes?.trim() || null,
      paymentTerms: input.paymentTerms?.trim() || null,
      dueDate: input.dueDate ?? null,
      includePaymentInstructions: input.includePaymentInstructions,
      sendMode: input.sendMode,
      status: 'issued',
      issuedAt: now,
      createdAt: now,
      createdByUid: input.createdByUid,
      createdByEmail: input.createdByEmail,
    });
    issuedNumber = number;
  });
  try {
    await setDoc(doc(collection(db, LIVE_COLLECTIONS.clientNotifications)), {
      userId: input.userId,
      type: 'invoice',
      title: 'New invoice',
      body: `Invoice ${issuedNumber} for ${formatInvoiceMoney(invoiceTotal(items, Number(input.taxRate) || 0), input.currency || 'USD')} has been issued to your account.`,
      href: `/invoice/${invoiceRef.id}`,
      read: false,
      createdAt: now,
    });
  } catch (err) {
    console.error('Invoice issued but notification write failed:', err);
  }
  return invoiceRef.id;
}

export async function getInvoiceById(id: string): Promise<StaffInvoice | null> {
  const snap = await getDoc(doc(db, LIVE_COLLECTIONS.invoices, id));
  return snap.exists() ? mapInvoice(snap.id, snap.data()) : null;
}

export async function getAllInvoices(): Promise<StaffInvoice[]> {
  const snap = await getDocs(query(collection(db, LIVE_COLLECTIONS.invoices), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => mapInvoice(d.id, d.data()));
}

export async function getInvoicesForUser(userId: string): Promise<StaffInvoice[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, LIVE_COLLECTIONS.invoices),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
      ),
    );
    return snap.docs.map((d) => mapInvoice(d.id, d.data()));
  } catch {
    const snap = await getDocs(
      query(collection(db, LIVE_COLLECTIONS.invoices), where('userId', '==', userId)),
    );
    return snap.docs
      .map((d) => mapInvoice(d.id, d.data()))
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }
}

export async function markInvoiceEmailSent(id: string) {
  await updateDoc(doc(db, LIVE_COLLECTIONS.invoices, id), {
    emailSentAt: new Date(),
    emailError: deleteField(),
    status: 'sent',
    updatedAt: new Date(),
  });
}

export async function markInvoicePaid(id: string) {
  await updateDoc(doc(db, LIVE_COLLECTIONS.invoices, id), {
    status: 'paid',
    paidAt: new Date(),
    updatedAt: new Date(),
  });
}

export { PROOF_ACCEPT };

export async function claimInvoicePayment(invoice: StaffInvoice): Promise<void> {
  if (!invoice.id) throw new Error('Invoice is missing.');
  const now = new Date();
  await updateDoc(doc(db, LIVE_COLLECTIONS.invoices, invoice.id), {
    paymentClaimedAt: now,
    status: 'paid',
    paidAt: now,
    updatedAt: now,
  });
  try {
    await setDoc(doc(collection(db, LIVE_COLLECTIONS.staffNotifications)), {
      type: 'invoice-payment',
      title: 'Invoice payment reported',
      body: `${invoice.billToName || invoice.billToEmail} reported payment for ${invoice.number}.`,
      href: '/admin/transactions',
      invoiceId: invoice.id,
      userId: invoice.userId,
      read: false,
      createdAt: now,
    });
  } catch (err) {
    console.error('Invoice payment claimed but finance notice failed:', err);
  }
}

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

export async function uploadInvoicePaymentProof(
  invoice: StaffInvoice,
  userId: string,
  file: File,
): Promise<PaymentProof> {
  if (file.size > PROOF_MAX_BYTES) {
    throw new Error(`"${file.name}" is too large - files must be under 15MB.`);
  }
  const contentType = resolveProofContentType(file);
  const safeName = file.name.replace(/[^\w.\- ]+/g, '_');
  const path = `payment-proofs/${userId}/invoice-${invoice.id}/${Date.now()}_${safeName}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, file, { contentType });
  const url = await getDownloadURL(fileRef);
  const proof: PaymentProof = { name: file.name, url, path, size: file.size, contentType, uploadedAt: new Date() };
  await updateDoc(doc(db, LIVE_COLLECTIONS.invoices, invoice.id), {
    paymentProofs: arrayUnion(proof),
    updatedAt: new Date(),
  });
  return proof;
}

export async function voidInvoice(id: string) {
  await updateDoc(doc(db, LIVE_COLLECTIONS.invoices, id), {
    status: 'void',
    updatedAt: new Date(),
  });
}

const INVOICE_MAIL_URL =
  (import.meta.env.VITE_INVOICE_MAIL_URL as string | undefined)?.trim() ||
  'https://safeguard-invoice-mail.sgfintechllc.workers.dev';

export async function sendInvoiceEmail(invoiceId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in required');
  const token = await user.getIdToken();
  const res = await fetch(INVOICE_MAIL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ invoiceId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `Send failed (${res.status})`);
  }
}

export function formatAddress(parts: {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
} | undefined): string {
  if (!parts) return '';
  return [parts.line1, parts.line2, [parts.city, parts.state, parts.postalCode].filter(Boolean).join(', '), parts.country]
    .filter(Boolean)
    .join('\n');
}

import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';

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
  const counterRef = doc(db, 'counters', `invoices-${year}`);
  const invoiceRef = doc(collection(db, LIVE_COLLECTIONS.invoices));

  await runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const next = (counterSnap.exists() ? Number(counterSnap.data().value ?? 0) : 0) + 1;
    const number = `SG-INV${String(year % 100).padStart(2, '0')}${String(next).padStart(5, '0')}`;
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
  });
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
  const snap = await getDocs(
    query(
      collection(db, LIVE_COLLECTIONS.invoices),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
    ),
  );
  return snap.docs.map((d) => mapInvoice(d.id, d.data()));
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
    updatedAt: new Date(),
  });
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

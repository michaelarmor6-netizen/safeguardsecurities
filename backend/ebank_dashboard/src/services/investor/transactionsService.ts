// Completed money movements, as a first-class record separate from the
// requests that produced them.
//
// A funding REQUEST is workflow: pending -> approved (awaiting payment) ->
// funded / rejected. A TRANSACTION is the settled fact: money arrived, the
// wallet was credited, and here is the client's proof of payment. Mixing the
// two on one screen made the funding queue grow forever and buried the
// evidence finance actually needs to retrieve later.
//
// Both deposit paths land here as funded fundingRequests: the client-requested
// flow (request -> approve -> confirm receipt) and the desk-recorded top-up
// (fundingService.addFundsToClient), told apart by `source`. The shape carries
// `type` so withdrawals/adjustments can join later without changing every call
// site.
import { getAllFundingRequests, requestReference, type FundingRequest, type PaymentProof } from './fundingService';
import { getAllInvoices, invoiceTotal, type StaffInvoice } from './invoiceService';

export type TransactionType = 'deposit' | 'invoice';

export interface Transaction {
  /** Same id as the source funding request - the invoice route keys off it. */
  id: string;
  type: TransactionType;
  reference: string;
  userId: string;
  userEmail?: string;
  amount: number;
  /** When the money was confirmed received and the wallet credited. */
  completedAt?: Date;
  /** When the client first said they had sent it. */
  paymentClaimedAt?: Date;
  requestedAt?: Date;
  approvedAt?: Date;
  proofs: PaymentProof[];
  /** 'admin' = desk-recorded top-up (no client request); 'client' = normal flow. */
  source: 'client' | 'admin';
  /** Finance memo on an admin-recorded credit. */
  note?: string;
  /** Which admin recorded it - only set on source==='admin'. */
  recordedByEmail?: string;
}

function toInvoiceTransaction(inv: StaffInvoice): Transaction {
  return {
    id: inv.id,
    type: 'invoice',
    reference: inv.number,
    userId: inv.userId,
    userEmail: inv.billToEmail,
    amount: invoiceTotal(inv.lineItems, inv.taxRate),
    completedAt: inv.paidAt ?? inv.paymentClaimedAt,
    paymentClaimedAt: inv.paymentClaimedAt,
    requestedAt: inv.issuedAt ?? inv.createdAt,
    proofs: inv.paymentProofs ?? [],
    source: 'client',
    note: inv.status === 'paid' ? 'Invoice paid' : 'Invoice payment reported',
  };
}

function toTransaction(f: FundingRequest): Transaction {
  return {
    id: f.id,
    type: 'deposit',
    reference: requestReference(f),
    userId: f.userId,
    userEmail: f.userEmail,
    amount: f.amount,
    // Legacy rows (credited at approval, before the two-step flow) have no
    // fundedAt - their approval WAS the settlement.
    completedAt: f.fundedAt ?? f.approvedAt,
    paymentClaimedAt: f.paymentClaimedAt,
    requestedAt: f.createdAt,
    approvedAt: f.approvedAt,
    proofs: f.paymentProofs ?? [],
    source: f.source === 'admin' ? 'admin' : 'client',
    note: f.note,
    recordedByEmail: f.recordedByEmail,
  };
}

/**
 * Every successful transaction, newest first. Two shapes qualify:
 *  - 'funded' rows (the two-step flow: confirmed received, wallet credited)
 *  - legacy 'approved' rows with awaitingPayment unset (credited AT approval,
 *    before 2026-08-24) - settled money, just under the old lifecycle.
 * An approved row still awaiting payment is not a transaction, it's a promise.
 */
export async function listTransactions(): Promise<Transaction[]> {
  const [requests, invoices] = await Promise.all([getAllFundingRequests(), getAllInvoices()]);
  const deposits = requests
    .filter((f) => f.status === 'funded' || (f.status === 'approved' && f.awaitingPayment !== true))
    .map(toTransaction);
  const invoicePays = invoices
    .filter((inv) => inv.status !== 'void' && (inv.status === 'paid' || Boolean(inv.paymentClaimedAt)))
    .map(toInvoiceTransaction);
  return [...deposits, ...invoicePays]
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0));
}

const csvCell = (value: unknown): string => {
  const s = value === undefined || value === null ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const iso = (d?: Date) => (d ? d.toISOString() : '');

/** Finance-facing export: one row per transaction, proof URLs included. */
export function buildTransactionsCsv(rows: Transaction[]): string {
  const headers = [
    'Reference', 'Type', 'Source', 'Recorded By', 'Note', 'Client', 'Amount USD', 'Completed At',
    'Requested At', 'Payment Claimed At', 'Proof Count', 'Proof URLs',
  ];
  const lines = [headers.join(',')];
  for (const t of rows) {
    lines.push([
      csvCell(t.reference),
      csvCell(t.type),
      csvCell(t.source),
      csvCell(t.recordedByEmail ?? ''),
      csvCell(t.note ?? ''),
      csvCell(t.userEmail ?? t.userId),
      csvCell(t.amount.toFixed(2)),
      csvCell(iso(t.completedAt)),
      csvCell(iso(t.requestedAt)),
      csvCell(iso(t.paymentClaimedAt)),
      csvCell(t.proofs.length),
      csvCell(t.proofs.map((p) => p.url).join(' | ')),
    ].join(','));
  }
  // CRLF + no BOM: Excel-friendly, matches the CRM exporter.
  return lines.join('\r\n');
}

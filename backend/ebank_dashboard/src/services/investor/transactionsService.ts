// Completed money movements, as a first-class record separate from the
// requests that produced them.
//
// A funding REQUEST is workflow: pending -> approved (awaiting payment) ->
// funded / rejected. A TRANSACTION is the settled fact: money arrived, the
// wallet was credited, and here is the client's proof of payment. Mixing the
// two on one screen made the funding queue grow forever and buried the
// evidence finance actually needs to retrieve later.
//
// Today the only source is a funded fundingRequest (a deposit). The shape
// carries `type` so withdrawals/adjustments can join later without changing
// every call site.
import { getAllFundingRequests, requestReference, type FundingRequest, type PaymentProof } from './fundingService';

export type TransactionType = 'deposit';

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
  const requests = await getAllFundingRequests();
  return requests
    .filter((f) => f.status === 'funded' || (f.status === 'approved' && f.awaitingPayment !== true))
    .map(toTransaction)
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
    'Reference', 'Type', 'Client', 'Amount USD', 'Completed At',
    'Requested At', 'Payment Claimed At', 'Proof Count', 'Proof URLs',
  ];
  const lines = [headers.join(',')];
  for (const t of rows) {
    lines.push([
      csvCell(t.reference),
      csvCell(t.type),
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

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Copy, Paperclip, Upload } from 'lucide-react';
import {
  claimInvoicePayment,
  formatInvoiceMoney,
  invoiceTotal,
  PROOF_ACCEPT,
  uploadInvoicePaymentProof,
  type StaffInvoice,
} from '../../services/investor/invoiceService';
import {
  bankInstructionRows,
  type FundingDetails,
} from '../../services/investor/fundingDetailsService';

async function copyText(value: string, what: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${what} copied`, { duration: 1500 });
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) {
        toast.success(`${what} copied`, { duration: 1500 });
        return true;
      }
    } catch { /* fall through */ }
    toast.error('Copy failed - press and hold the text to select it');
    return false;
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const onCopy = async () => {
    if (await copyText(value, label)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      title={`Copy ${label}`}
      className="w-full flex justify-between items-center gap-4 py-1 text-sm text-left group rounded-[6px] px-1 -mx-1 transition hover:bg-[rgba(255,255,255,.05)]"
    >
      <span className="shrink-0" style={{ color: 'var(--sg-muted-2)' }}>{label}</span>
      <span className="text-right font-mono break-all flex items-center gap-1.5 justify-end" style={{ color: 'var(--sg-text)' }}>
        {value}
        {copied
          ? <Check className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--sg-teal)' }} />
          : <Copy className="h-3.5 w-3.5 shrink-0 opacity-40 group-hover:opacity-100 transition" />}
      </span>
    </button>
  );
}

export default function InvoicePaymentInstructions({
  invoice,
  details,
  userId,
  canAct = true,
  onChanged,
}: {
  invoice: StaffInvoice;
  details: FundingDetails | null;
  userId: string;
  canAct?: boolean;
  onChanged?: (next: StaffInvoice) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const amount = invoiceTotal(invoice.lineItems, invoice.taxRate);
  const amountFmt = formatInvoiceMoney(amount, invoice.currency);
  const reference = invoice.number;
  const paid = invoice.status === 'paid';

  const refresh = (patch: Partial<StaffInvoice>) => {
    onChanged?.({ ...invoice, ...patch });
  };

  const onProofFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setUploading(true);
    try {
      let proofs = invoice.paymentProofs ?? [];
      for (const f of [...list]) {
        const p = await uploadInvoicePaymentProof(invoice, userId, f);
        proofs = [...proofs, p];
      }
      refresh({ paymentProofs: proofs });
      toast.success(list.length > 1
        ? `${list.length} files uploaded — finance will match them to this invoice.`
        : 'Proof uploaded — finance will match it to this invoice.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed — please try again');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="rounded-[14px] border p-5"
      style={{ borderColor: 'rgba(212,175,55,.35)', background: 'linear-gradient(135deg, rgba(212,175,55,.10), transparent 60%), var(--sg-bg-elevated)' }}
    >
      <h3 className="font-semibold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
        Payment instructions — {amountFmt}
      </h3>
      <p className="text-xs mt-1" style={{ color: 'var(--sg-muted-2)' }}>
        Send payment for this invoice using the details below. Quote reference{' '}
        <button
          type="button"
          onClick={() => copyText(reference, 'Reference')}
          title="Copy reference"
          className="font-mono font-semibold underline decoration-dotted underline-offset-2"
          style={{ color: 'var(--sg-gold)' }}
        >
          {reference}
        </button>{' '}
        in the transfer memo so finance can match your payment.
      </p>
      <div className="mt-3">
        <DetailRow label="Amount to send (copies plain number)" value={amount.toFixed(2)} />
        <DetailRow label="Invoice number" value={reference} />
      </div>
      {details?.bankEnabled && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--sg-muted)' }}>Bank wire / transfer</p>
          {bankInstructionRows(details).map(([label, value]) => (
            <DetailRow key={label} label={label} value={value} />
          ))}
          <DetailRow label="Reason for payment" value={`Invoice ${reference}`} />
        </div>
      )}
      {details?.cryptoEnabled && details.cryptoWallets.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--sg-muted)' }}>Crypto</p>
          {details.cryptoWallets.map((w, i) => (
            <DetailRow key={i} label={`${w.asset} (${w.network})`} value={w.memo ? `${w.address} (memo: ${w.memo})` : w.address} />
          ))}
          <p className="text-xs mt-1" style={{ color: 'var(--sg-muted-2)' }}>
            Include the invoice number in the transaction memo where supported.
          </p>
        </div>
      )}
      {details?.extraInstructions && (
        <p className="text-xs mt-3 whitespace-pre-wrap" style={{ color: 'var(--sg-muted)' }}>{details.extraInstructions}</p>
      )}
      {!details?.bankEnabled && !(details?.cryptoEnabled && details.cryptoWallets.length > 0) && (
        <p className="text-sm mt-3" style={{ color: 'var(--sg-muted)' }}>
          Payment details will be provided by SafeGuard staff shortly.
        </p>
      )}
      <div className="mt-4 rounded-[10px] p-3" style={{ background: 'rgba(255,255,255,.04)' }}>
        <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--sg-muted)' }}>How to pay — 4 easy steps</p>
        <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: 'var(--sg-muted)' }}>
          <li>Open your online banking app and start a transfer (or add us as a payee).</li>
          <li>Tap any detail above to copy it, then paste it into your banking app — no retyping.</li>
          <li>Paste the invoice number into the transfer note / memo field.</li>
          <li>After sending, tap the green button below so finance knows to look for it.</li>
        </ol>
      </div>
      {paid ? (
        <p className="text-sm font-semibold mt-3" style={{ color: 'var(--sg-teal)' }}>
          This invoice is marked paid.
        </p>
      ) : !canAct ? (
        invoice.paymentClaimedAt ? (
          <p className="text-sm font-semibold mt-3" style={{ color: 'var(--sg-teal)' }}>
            Client reported payment on {invoice.paymentClaimedAt.toLocaleDateString()}.
          </p>
        ) : null
      ) : invoice.paymentClaimedAt ? (
        <div className="mt-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--sg-teal)' }}>
            ✓ You told us the payment was sent on {invoice.paymentClaimedAt.toLocaleDateString()}. Finance is matching it to this invoice.
          </p>
        </div>
      ) : (
        <button
          type="button"
          className="sg-btn-primary mt-3"
          disabled={claiming}
          onClick={async () => {
            setClaiming(true);
            try {
              await claimInvoicePayment(invoice);
              const now = new Date();
              refresh({ paymentClaimedAt: now, status: 'paid', paidAt: now });
              toast.success("Thanks — this invoice is marked paid and recorded in transactions.");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Failed — please try again');
            } finally {
              setClaiming(false);
            }
          }}
        >
          {claiming ? 'Notifying…' : "✓ I've sent the payment"}
        </button>
      )}
      {(invoice.paymentProofs?.length ?? 0) > 0 && (
        <div className="mt-2 space-y-1">
          {invoice.paymentProofs!.map((p, i) => (
            <a
              key={i}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-xs underline w-fit"
              style={{ color: 'var(--sg-text)' }}
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--sg-teal)' }} />
              {p.name}
              {p.uploadedAt && (
                <span style={{ color: 'var(--sg-muted-2)' }}>· {p.uploadedAt.toLocaleDateString()}</span>
              )}
            </a>
          ))}
        </div>
      )}
      {canAct && invoice.status !== 'void' && (
        <>
          <label
            className="sg-btn-ghost inline-flex items-center gap-2 mt-2 cursor-pointer"
            style={uploading ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
          >
            <Upload className="h-4 w-4" />
            {uploading
              ? 'Uploading…'
              : (invoice.paymentProofs?.length ?? 0) > 0
                ? 'Upload another proof'
                : 'Upload proof of payment'}
            <input
              type="file"
              hidden
              multiple
              accept={PROOF_ACCEPT}
              disabled={uploading}
              onChange={(e) => {
                void onProofFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          <p className="text-xs mt-1" style={{ color: 'var(--sg-muted-2)' }}>
            A screenshot or receipt of your transfer helps finance match this invoice faster.
            Accepted: photos (JPG, PNG, HEIC, WebP, GIF), PDF, Word — up to 15MB each.
          </p>
        </>
      )}
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          type="button"
          className="sg-btn-ghost flex items-center gap-2"
          onClick={() => {
            if (!details) return;
            const lines: string[] = [`Invoice: ${reference}`, `Amount: ${amountFmt}`];
            if (details.bankEnabled) {
              lines.push('', 'Bank wire / transfer:');
              for (const [label, value] of bankInstructionRows(details)) {
                if (value) lines.push(`${label}: ${value}`);
              }
              lines.push(`Reason for payment: Invoice ${reference}`);
            }
            if (details.cryptoEnabled && details.cryptoWallets.length > 0) {
              lines.push('', 'Crypto:');
              for (const w of details.cryptoWallets) {
                if (w.address) lines.push(`${w.asset} (${w.network}): ${w.address}${w.memo ? ` (memo: ${w.memo})` : ''}`);
              }
            }
            copyText(lines.join('\n'), 'All payment details');
          }}
        >
          <Copy className="h-4 w-4" />
          Copy all details
        </button>
      </div>
    </div>
  );
}

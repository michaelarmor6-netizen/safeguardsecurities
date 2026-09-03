import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Check, Copy, FileText, Paperclip, Upload, Wallet as WalletIcon } from 'lucide-react';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { watchUserWallet, type InvestorWallet } from '../../../services/investor/walletService';
import {
  claimPaymentSent,
  createFundingRequest,
  requestReference,
  uploadPaymentProof,
  watchFundingRequestsForUser,
  PROOF_ACCEPT,
  type FundingRequest,
} from '../../../services/investor/fundingService';
import {
  getFundingDetails,
  bankInstructionRows,
  paymentReasonLine,
  type FundingDetails,
} from '../../../services/investor/fundingDetailsService';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const statusColor: Record<FundingRequest['status'], string> = {
  pending: 'var(--sg-gold)',
  approved: 'var(--sg-gold)',
  funded: 'var(--sg-teal)',
  rejected: 'var(--sg-danger)',
};

const statusLabel: Record<FundingRequest['status'], string> = {
  pending: 'pending',
  approved: 'awaiting payment',
  funded: 'funded',
  rejected: 'rejected',
};

async function copyText(value: string, what: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${what} copied`, { duration: 1500 });
    return true;
  } catch {
    // Older/locked-down browsers: hidden-textarea fallback
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

// Click-to-copy row: clients paste values straight into their banking app
// instead of retyping account numbers.
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

export default function InvestorWalletPage() {
  const navigate = useNavigate();
  const { user, profile } = useInvestorAuth();
  const [wallet, setWallet] = useState<InvestorWallet | null>(null);
  const [requests, setRequests] = useState<FundingRequest[]>([]);
  const [fundingDetails, setFundingDetails] = useState<FundingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Proof-of-payment upload: one or more receipts (screenshot, PDF, Word).
  // The onSnapshot watcher refreshes the card the moment the doc updates.
  const onProofFiles = async (r: FundingRequest, list: FileList | null) => {
    if (!list || list.length === 0 || !user) return;
    setUploadingId(r.id);
    try {
      for (const f of [...list]) {
        await uploadPaymentProof(r.id, user.uid, f);
      }
      toast.success(list.length > 1
        ? `${list.length} files uploaded - our team will verify your payment.`
        : 'Proof uploaded - our team will verify your payment.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed - please try again');
    } finally {
      setUploadingId(null);
    }
  };

  // Live: wallet balance + request statuses stream in via onSnapshot, so an
  // approval or credit shows up the moment the desk acts - no refresh needed.
  const prevStatuses = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    if (!user) return;
    getFundingDetails().then(setFundingDetails).catch(() => undefined);
    const unWallet = watchUserWallet(user.uid, setWallet);
    const unReqs = watchFundingRequestsForUser(
      user.uid,
      (r) => {
        // Friendly nudge when a status changes while they're on the page
        for (const req of r) {
          const prev = prevStatuses.current.get(req.id);
          if (prev && prev !== req.status) {
            if (req.status === 'approved' && req.awaitingPayment) {
              toast.success('Your funding request was approved - payment instructions are ready below.', { duration: 6000 });
            } else if (req.status === 'funded') {
              toast.success('Payment received - your wallet has been credited!', { duration: 6000 });
            }
          }
          prevStatuses.current.set(req.id, req.status);
        }
        setRequests(r);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => {
      unWallet();
      unReqs();
    };
  }, [user]);

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!user || !value || value <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSubmitting(true);
    try {
      await createFundingRequest(user.uid, profile?.email ?? user.email ?? '', value);
      toast.success('Funding request submitted for review');
      setAmount('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center" style={{ color: 'var(--sg-muted)' }}>Loading wallet...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="sg-page-title flex items-center gap-2">
          <WalletIcon className="h-5 w-5" style={{ color: 'var(--sg-indigo)' }} />
          Wallet
        </h1>
        <p className="sg-page-sub mt-1">Funding, balance, and wallet activity.</p>
      </div>

      <div
        className="rounded-[18px] border p-6"
        style={{ borderColor: 'rgba(99,102,241,.22)', background: 'linear-gradient(135deg, rgba(99,102,241,.14), transparent 55%), var(--sg-bg-elevated)' }}
      >
        <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>{wallet?.label ?? 'Primary Wallet'} balance</p>
        <p className="text-3xl font-bold mt-1" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          {fmt(wallet?.balance ?? 0)}
        </p>
      </div>

      <div className="sg-card p-5" style={{ borderRadius: 14 }}>
        <h3 className="font-semibold mb-3" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          Request Funds
        </h3>
        <form onSubmit={submitRequest} className="flex flex-col sm:flex-row gap-3">
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (USD)"
            className="sg-input flex-1"
          />
          <button type="submit" disabled={submitting} className="sg-btn-primary sm:w-auto">
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
        <p className="text-xs mt-2" style={{ color: 'var(--sg-muted-2)' }}>
          Requests are reviewed by SafeGuard staff before funds are credited to your wallet.
        </p>
      </div>

      {requests.filter((r) => r.status === 'approved' && r.awaitingPayment === true).map((r) => (
        <div
          key={r.id}
          className="rounded-[14px] border p-5"
          style={{ borderColor: 'rgba(212,175,55,.35)', background: 'linear-gradient(135deg, rgba(212,175,55,.10), transparent 60%), var(--sg-bg-elevated)' }}
        >
          <h3 className="font-semibold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
            Payment instructions — {fmt(r.amount)}
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--sg-muted-2)' }}>
            Your funding request was approved. Send your payment using the details below and
            quote reference{' '}
            <button
              type="button"
              onClick={() => copyText(requestReference(r), 'Reference')}
              title="Copy reference"
              className="font-mono font-semibold underline decoration-dotted underline-offset-2"
              style={{ color: 'var(--sg-gold)' }}
            >
              {requestReference(r)}
            </button>{' '}
            in the transfer memo. A copy has also been emailed to you. Your wallet is credited
            once we confirm receipt.
          </p>
          <div className="mt-3">
            <DetailRow label="Amount to send (copies plain number)" value={r.amount.toFixed(2)} />
          </div>
          {fundingDetails?.bankEnabled && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--sg-muted)' }}>Bank wire / transfer</p>
              {bankInstructionRows(fundingDetails).map(([label, value]) => (
                <DetailRow key={label} label={label} value={value} />
              ))}
              <DetailRow label="Reason for payment" value={paymentReasonLine(fundingDetails, requestReference(r))} />
            </div>
          )}
          {fundingDetails?.cryptoEnabled && fundingDetails.cryptoWallets.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--sg-muted)' }}>Crypto</p>
              {fundingDetails.cryptoWallets.map((w, i) => (
                <DetailRow key={i} label={`${w.asset} (${w.network})`} value={w.memo ? `${w.address} (memo: ${w.memo})` : w.address} />
              ))}
              <p className="text-xs mt-1" style={{ color: 'var(--sg-muted-2)' }}>
                Include the reference code in the transaction memo where supported.
              </p>
            </div>
          )}
          {fundingDetails?.extraInstructions && (
            <p className="text-xs mt-3 whitespace-pre-wrap" style={{ color: 'var(--sg-muted)' }}>{fundingDetails.extraInstructions}</p>
          )}
          {!fundingDetails?.bankEnabled && !(fundingDetails?.cryptoEnabled && fundingDetails.cryptoWallets.length > 0) && (
            <p className="text-sm mt-3" style={{ color: 'var(--sg-muted)' }}>
              Payment details will be provided by SafeGuard staff shortly — please check the
              email we sent or contact support.
            </p>
          )}
          <div className="mt-4 rounded-[10px] p-3" style={{ background: 'rgba(255,255,255,.04)' }}>
            <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--sg-muted)' }}>How to pay — 4 easy steps</p>
            <ol className="text-xs space-y-1 list-decimal list-inside" style={{ color: 'var(--sg-muted)' }}>
              <li>Open your online banking app and start a transfer (or add us as a payee).</li>
              <li>Tap any detail above to copy it, then paste it into your banking app — no retyping.</li>
              <li>Paste the reference code into the transfer note / memo field.</li>
              <li>After sending, tap the green button below so our team knows to look for it.</li>
            </ol>
          </div>
          {r.paymentClaimedAt ? (
            <div className="mt-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--sg-teal)' }}>
                ✓ You told us the payment was sent on {r.paymentClaimedAt.toLocaleDateString()}. We're
                checking for it — your wallet will be credited once it arrives.
              </p>
              {(r.paymentProofs?.length ?? 0) > 0 && (
                <div className="mt-2 space-y-1">
                  {r.paymentProofs!.map((p, i) => (
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
              <label
                className="sg-btn-ghost inline-flex items-center gap-2 mt-2 cursor-pointer"
                style={uploadingId === r.id ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
              >
                <Upload className="h-4 w-4" />
                {uploadingId === r.id
                  ? 'Uploading…'
                  : (r.paymentProofs?.length ?? 0) > 0
                    ? 'Upload another proof'
                    : 'Upload proof of payment'}
                <input
                  type="file"
                  hidden
                  multiple
                  accept={PROOF_ACCEPT}
                  disabled={uploadingId === r.id}
                  onChange={(e) => {
                    void onProofFiles(r, e.target.files);
                    e.target.value = ''; // allow re-picking the same file
                  }}
                />
              </label>
              <p className="text-xs mt-1" style={{ color: 'var(--sg-muted-2)' }}>
                A screenshot or receipt of your transfer helps us credit you faster.
                Accepted: photos (JPG, PNG, HEIC, WebP, GIF), PDF, Word — up to 15MB each.
              </p>
            </div>
          ) : (
            <button
              type="button"
              className="sg-btn-primary mt-3"
              onClick={async () => {
                try {
                  await claimPaymentSent(r.id);
                  toast.success("Thanks - we'll watch for your payment and credit your wallet once it arrives.");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Failed - please try again');
                }
              }}
            >
              ✓ I've sent the payment
            </button>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              className="sg-btn-ghost flex items-center gap-2"
              onClick={() => {
                if (!fundingDetails) return;
                const lines: string[] = [`Payment reference: ${requestReference(r)}`, `Amount: ${fmt(r.amount)}`];
                if (fundingDetails.bankEnabled) {
                  lines.push('', 'Bank wire / transfer:');
                  for (const [label, value] of bankInstructionRows(fundingDetails)) {
                    if (value) lines.push(`${label}: ${value}`);
                  }
                  lines.push(`Reason for payment: ${paymentReasonLine(fundingDetails, requestReference(r))}`);
                }
                if (fundingDetails.cryptoEnabled && fundingDetails.cryptoWallets.length > 0) {
                  lines.push('', 'Crypto:');
                  for (const w of fundingDetails.cryptoWallets) {
                    if (w.address) lines.push(`${w.asset} (${w.network}): ${w.address}${w.memo ? ` (memo: ${w.memo})` : ''}`);
                  }
                }
                copyText(lines.join('\n'), 'All payment details');
              }}
            >
              <Copy className="h-4 w-4" />
              Copy all details
            </button>
            <button
              type="button"
              className="sg-btn-ghost flex items-center gap-2"
              onClick={() => navigate(`/funding-invoice/${r.id}`)}
            >
              <FileText className="h-4 w-4" />
              View invoice (print / save PDF)
            </button>
          </div>
        </div>
      ))}

      <div>
        <h3 className="font-semibold mb-3" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          Request History
        </h3>
        <div className="sg-panel overflow-x-auto sg-table-stack-wrap p-3 md:p-0">
          <table className="min-w-full text-sm sg-table-stack">
            <thead className="sg-text-muted">
              <tr>
                <th className="text-left p-4">Date</th>
                <th className="text-right p-4">Amount</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4"></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t sg-row-border">
                  <td className="p-4 sg-text-muted" data-label="Date">{r.createdAt ? r.createdAt.toLocaleDateString() : '—'}</td>
                  <td className="p-4 text-right sg-text-main" data-label="Amount">{fmt(r.amount)}</td>
                  <td className="p-4" data-label="Status">
                    <span className="text-xs font-semibold uppercase" style={{ color: statusColor[r.status] }}>
                      {r.status === 'approved' && r.awaitingPayment !== true ? 'approved' : statusLabel[r.status]}
                    </span>
                  </td>
                  <td className="p-4">
                    {(r.status === 'funded' || (r.status === 'approved' && r.awaitingPayment === true)) && (
                      <button
                        type="button"
                        className="text-xs underline"
                        style={{ color: 'var(--sg-teal)' }}
                        onClick={() => navigate(`/funding-invoice/${r.id}`)}
                      >
                        Invoice
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {requests.length === 0 && (
            <p className="p-8 text-center sg-text-muted">No funding requests yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

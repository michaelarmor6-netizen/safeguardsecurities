import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { approveFundingRequest, confirmFundingReceived, getAllFundingRequests, markFundingEmailSent, requestReference, updateFundingRequest } from '../../../services/investor/fundingService';
import type { FundingRequest } from '../../../services/investor/fundingService';

import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { logAction } from '../../../services/investor/auditService';

// Two-step flow: Approve sends the funding (deposit) instructions to the
// client (in-app card + auto-email via the functions-accounts trigger), then
// once the money actually arrives "Confirm receipt" credits the wallet.
// Legacy rows approved before 2026-08-24 were credited at approval
// (awaitingPayment is unset) and get no Confirm button.

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending review',
  approved: 'Awaiting payment',
  funded: 'Funded',
  rejected: 'Rejected',
};

export default function InvestorAdminFundingPage() {
  const navigate = useNavigate();
  const { user, profile: adminProfile } = useInvestorAuth();
  const [rows, setRows] = useState<FundingRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  // This queue is ONLY open work: pending review, awaiting payment, rejected.
  // Settled money - 'funded' rows AND legacy approved-and-credited rows (the
  // pre-2026-08-24 one-step flow, awaitingPayment unset) - lives on the
  // Transactions page with its proof of payment.
  const isSettled = (f: FundingRequest) =>
    f.status === 'funded' || (f.status === 'approved' && f.awaitingPayment !== true);
  const load = () =>
    getAllFundingRequests()
      .then((all) => setRows(all.filter((f) => !isSettled(f))))
      .catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);
  // "Email manually" opens /funding-email/{id}: rendered HTML template with
  // copy-for-Thunderbird, plain-text mailto fallback, and Mark emailed.
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try {
      await fn();
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  const statusCell = (f: FundingRequest) => {
    const label = STATUS_LABEL[f.status] ?? f.status;
    return (
      <div>
        <span>{label}</span>
        {f.status === 'approved' && f.awaitingPayment === true && f.paymentClaimedAt && (
          <p className="text-xs mt-0.5 font-semibold" style={{ color: 'var(--sg-teal)' }}>
            💰 Client says paid {f.paymentClaimedAt.toLocaleString()} — check the bank
          </p>
        )}
        {/* Request details only on this page. The proof FILES live on the
            Transactions page once settled; here finance just sees that
            evidence was attached before confirming against the bank. */}
        {f.status === 'approved' && f.awaitingPayment === true && (f.paymentProofs?.length ?? 0) > 0 && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--sg-gold)' }}>
            📎 {f.paymentProofs!.length} proof file{f.paymentProofs!.length > 1 ? 's' : ''} attached — view in Transactions after confirming
          </p>
        )}
        {f.status === 'approved' && f.awaitingPayment === true && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--sg-muted-2)' }}>
            {f.emailSentAt
              ? 'Details emailed ' + f.emailSentAt.toLocaleString()
              : f.emailError
                ? 'Auto-email failed (' + f.emailError + ') — use Email manually'
                : 'Not emailed yet — use Email manually below'}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="sg-page-title">Funding Requests</h1>
        <p className="sg-page-sub mt-1">
          Approve to send deposit instructions; confirm receipt to credit the wallet. A confirmed
          request moves to Transactions. Instructions content lives in Settings → Funding Details.
        </p>
      </div>
      <div className="sg-panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sg-text-muted">
            <tr>
              <th className="text-left p-4">User</th>
              <th className="text-left p-4">Reference</th>
              <th className="text-left p-4">Amount</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id} className="border-t sg-row-border">
                <td className="p-4 sg-text-main">{f.userEmail ?? f.userId}</td>
                <td className="p-4 sg-text-muted font-mono text-xs">{requestReference(f)}</td>
                <td className="p-4 sg-text-muted">{fmt(f.amount)}</td>
                <td className="p-4 sg-text-muted">{statusCell(f)}</td>
                <td className="p-4 flex gap-2">
                  {f.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        className="sg-action-btn"
                        disabled={busyId === f.id}
                        onClick={() => run(f.id, async () => {
                          await approveFundingRequest(f);
                          if (user) logAction(user.uid, adminProfile?.email ?? '', 'Funding approved - details sent', `${f.userEmail ?? f.userId}: ${fmt(f.amount)} (${requestReference(f)})`);
                          toast.success('Approved - funding details sent to client');
                        })}
                      >
                        Approve &amp; send details
                      </button>
                      <button
                        type="button"
                        className="sg-danger-btn"
                        disabled={busyId === f.id}
                        onClick={() => run(f.id, async () => {
                          await updateFundingRequest(f.id, 'rejected');
                          if (user) logAction(user.uid, adminProfile?.email ?? '', 'Funding rejected', `${f.userEmail ?? f.userId}: ${fmt(f.amount)}`);
                          toast.success('Rejected');
                        })}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {f.status === 'approved' && f.awaitingPayment === true && (
                    <>
                      <button
                        type="button"
                        className="sg-action-btn"
                        onClick={() => navigate(`/funding-email/${f.id}`)}
                      >
                        Email manually
                      </button>
                      {!f.emailSentAt && (
                        <button
                          type="button"
                          className="sg-action-btn"
                          disabled={busyId === f.id}
                          onClick={() => run(f.id, async () => {
                            await markFundingEmailSent(f.id);
                            if (user) logAction(user.uid, adminProfile?.email ?? '', 'Funding details emailed manually', `${f.userEmail ?? f.userId}: ${requestReference(f)}`);
                            toast.success('Marked as emailed');
                          })}
                        >
                          Mark emailed
                        </button>
                      )}
                      <button
                        type="button"
                        className="sg-action-btn"
                        disabled={busyId === f.id}
                        onClick={() => run(f.id, async () => {
                          await confirmFundingReceived(f);
                          if (user) logAction(user.uid, adminProfile?.email ?? '', 'Funding receipt confirmed - wallet credited', `${f.userEmail ?? f.userId}: ${fmt(f.amount)} (${requestReference(f)})`);
                          toast.success('Receipt confirmed - wallet credited');
                        })}
                      >
                        Confirm receipt &amp; credit
                      </button>
                    </>
                  )}
                  {f.status === 'approved' && f.awaitingPayment === true && (
                    <button
                      type="button"
                      className="sg-action-btn"
                      onClick={() => navigate(`/funding-invoice/${f.id}`)}
                    >
                      Invoice
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-8 text-center sg-text-muted">
            No open funding requests. Completed ones are on the Transactions page.
          </p>
        )}
      </div>
    </div>
  );
}

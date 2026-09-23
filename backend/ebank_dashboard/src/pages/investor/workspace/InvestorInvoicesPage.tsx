import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { formatInvoiceMoney, getInvoicesForUser, invoiceTotal, type StaffInvoice } from '../../../services/investor/invoiceService';
import { getFundingDetails, type FundingDetails } from '../../../services/investor/fundingDetailsService';
import InvoicePaymentInstructions from '../../../components/investor/InvoicePaymentInstructions';

export default function InvestorInvoicesPage() {
  const { user } = useInvestorAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<StaffInvoice[]>([]);
  const [details, setDetails] = useState<FundingDetails | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getFundingDetails().then(setDetails).catch(() => undefined);
    getInvoicesForUser(user.uid)
      .then(setRows)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load invoices'));
  }, [user]);

  const visible = rows.filter((r) => r.status !== 'void');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold sg-text-main">Invoices</h1>
        <p className="text-sm" style={{ color: 'var(--sg-muted)' }}>
          Official invoices issued to your account by the SafeGuard Securities finance desk.
        </p>
      </div>
      <div className="sg-panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: 'var(--sg-muted)' }}>
              <th className="text-left p-3">Number</th>
              <th className="text-right p-3">Amount</th>
              <th className="text-left p-3">Issued</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3" />
            </tr>
          </thead>
          <tbody>
            {visible.map((inv) => (
              <Fragment key={inv.id}>
                <tr style={{ borderTop: '1px solid var(--sg-border)' }}>
                  <td className="p-3 font-mono">{inv.number}</td>
                  <td className="p-3 text-right">{formatInvoiceMoney(invoiceTotal(inv.lineItems, inv.taxRate), inv.currency)}</td>
                  <td className="p-3">{inv.issuedAt?.toLocaleString() ?? '—'}</td>
                  <td className="p-3 capitalize">
                    {inv.status}
                    {inv.paymentClaimedAt && inv.status !== 'paid' && (
                      <span className="block text-[11px] normal-case" style={{ color: 'var(--sg-teal)' }}>
                        payment reported
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap space-x-2">
                    <button type="button" className="sg-action-btn text-xs" onClick={() => navigate(`/invoice/${inv.id}`)}>
                      View
                    </button>
                    <button
                      type="button"
                      className="sg-action-btn text-xs"
                      onClick={() => setOpenId((id) => (id === inv.id ? null : inv.id))}
                    >
                      Payment instructions
                    </button>
                  </td>
                </tr>
                {openId === inv.id && user && (
                  <tr key={`${inv.id}-pay`}>
                    <td colSpan={5} className="p-3">
                      <InvoicePaymentInstructions
                        invoice={inv}
                        details={details}
                        userId={user.uid}
                        onChanged={(next) => setRows((cur) => cur.map((r) => (r.id === next.id ? next : r)))}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center" style={{ color: 'var(--sg-muted)' }}>
                  No invoices have been issued to you yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

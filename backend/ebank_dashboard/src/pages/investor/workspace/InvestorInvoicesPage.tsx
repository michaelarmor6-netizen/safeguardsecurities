import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { formatInvoiceMoney, getInvoicesForUser, invoiceTotal, type StaffInvoice } from '../../../services/investor/invoiceService';

export default function InvestorInvoicesPage() {
  const { user } = useInvestorAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<StaffInvoice[]>([]);

  useEffect(() => {
    if (!user) return;
    getInvoicesForUser(user.uid)
      .then(setRows)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load invoices'));
  }, [user]);

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
            {rows.filter((r) => r.status !== 'void').map((inv) => (
              <tr key={inv.id} style={{ borderTop: '1px solid var(--sg-border)' }}>
                <td className="p-3 font-mono">{inv.number}</td>
                <td className="p-3 text-right">{formatInvoiceMoney(invoiceTotal(inv.lineItems, inv.taxRate), inv.currency)}</td>
                <td className="p-3">{inv.issuedAt?.toLocaleString() ?? '—'}</td>
                <td className="p-3 capitalize">{inv.status}</td>
                <td className="p-3 text-right">
                  <button type="button" className="sg-action-btn text-xs" onClick={() => navigate(`/invoice/${inv.id}`)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
            {rows.filter((r) => r.status !== 'void').length === 0 && (
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

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Paperclip, Download, Search } from 'lucide-react';
import {
  listTransactions,
  buildTransactionsCsv,
  type Transaction,
} from '../../../services/investor/transactionsService';
import { downloadCsv } from '../../../services/investor/crm/vicidialExport';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { logAction } from '../../../services/investor/auditService';

// Settled money only. The Funding Requests page owns the workflow (pending /
// awaiting payment / rejected); once finance confirms receipt the row leaves
// that queue and lands here permanently, with the client's proof of payment
// attached. See transactionsService for why the two are separate.

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const dt = (d?: Date) =>
  d ? d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export default function InvestorAdminTransactionsPage() {
  const navigate = useNavigate();
  const { user, profile: adminProfile } = useInvestorAuth();
  const [rows, setRows] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    listTransactions()
      .then(setRows)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load transactions'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    // `to` is inclusive of the whole day the admin picked.
    const fromTs = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toTs = to ? new Date(`${to}T23:59:59.999`).getTime() : null;
    return rows.filter((t) => {
      if (q) {
        const hay = `${t.reference} ${t.userEmail ?? ''} ${t.userId}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const ts = t.completedAt?.getTime();
      if (fromTs !== null && (ts === undefined || ts < fromTs)) return false;
      if (toTs !== null && (ts === undefined || ts > toTs)) return false;
      return true;
    });
  }, [rows, search, from, to]);

  const total = useMemo(() => filtered.reduce((sum, t) => sum + t.amount, 0), [filtered]);
  const withProof = useMemo(() => filtered.filter((t) => t.proofs.length > 0).length, [filtered]);

  const onExport = () => {
    if (filtered.length === 0) {
      toast.error('Nothing to export with the current filters.');
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(buildTransactionsCsv(filtered), `safeguard-transactions-${stamp}.csv`);
    // Exporting client payment records is an auditable act.
    if (user) {
      logAction(
        user.uid,
        adminProfile?.email ?? '',
        'Transactions exported',
        `${filtered.length} transaction(s), ${fmt(total)}`,
      );
    }
    toast.success(`Exported ${filtered.length} transaction(s)`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="sg-page-title">Transactions</h1>
          <p className="sg-page-sub mt-1">
            Completed deposits with the client's proof of payment. Requests still in progress live
            on Funding Requests.
          </p>
        </div>
        <button type="button" className="sg-action-btn flex items-center gap-2" onClick={onExport}>
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sg-panel p-4">
          <p className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)' }}>Transactions</p>
          <p className="text-2xl font-semibold mt-1" style={{ fontFamily: 'var(--sg-font-display)' }}>
            {filtered.length}
          </p>
        </div>
        <div className="sg-panel p-4">
          <p className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)' }}>Total settled</p>
          <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--sg-teal)', fontFamily: 'var(--sg-font-display)' }}>
            {fmt(total)}
          </p>
        </div>
        <div className="sg-panel p-4">
          <p className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)' }}>With proof attached</p>
          <p className="text-2xl font-semibold mt-1" style={{ fontFamily: 'var(--sg-font-display)' }}>
            {withProof}/{filtered.length}
          </p>
        </div>
      </div>

      <div className="sg-panel p-3 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Search</label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--sg-muted-2)' }} />
            <input
              className="sg-input pl-8 w-full"
              placeholder="Reference or client email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>From</label>
          <input type="date" className="sg-input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>To</label>
          <input type="date" className="sg-input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {(search || from || to) && (
          <button
            type="button"
            className="sg-btn-ghost"
            onClick={() => { setSearch(''); setFrom(''); setTo(''); }}
          >
            Clear
          </button>
        )}
      </div>

      <div className="sg-panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sg-text-muted">
            <tr>
              <th className="text-left p-4">Completed</th>
              <th className="text-left p-4">Reference</th>
              <th className="text-left p-4">Client</th>
              <th className="text-left p-4">Type</th>
              <th className="text-left p-4">Amount</th>
              <th className="text-left p-4">Proof of payment</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-t sg-row-border align-top">
                <td className="p-4 sg-text-muted whitespace-nowrap">
                  {dt(t.completedAt)}
                  {t.paymentClaimedAt && (
                    <div className="text-xs mt-0.5" style={{ color: 'var(--sg-muted-2)' }}>
                      client sent {dt(t.paymentClaimedAt)}
                    </div>
                  )}
                </td>
                <td className="p-4 sg-text-muted font-mono text-xs whitespace-nowrap">{t.reference}</td>
                <td className="p-4 sg-text-main">{t.userEmail ?? t.userId}</td>
                <td className="p-4 sg-text-muted capitalize">{t.type}</td>
                <td className="p-4 font-semibold" style={{ color: 'var(--sg-teal)' }}>{fmt(t.amount)}</td>
                <td className="p-4">
                  {t.proofs.length === 0 ? (
                    <span className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>none attached</span>
                  ) : (
                    <div className="space-y-1">
                      {t.proofs.map((p, i) => (
                        <a
                          key={i}
                          href={p.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs underline w-fit"
                          style={{ color: 'var(--sg-gold)' }}
                          title={p.uploadedAt ? `Uploaded ${dt(p.uploadedAt)}` : undefined}
                        >
                          <Paperclip className="h-3.5 w-3.5 shrink-0" />
                          {p.name}
                        </a>
                      ))}
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <button
                    type="button"
                    className="sg-action-btn"
                    onClick={() => navigate(`/funding-invoice/${t.id}`)}
                  >
                    Invoice
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <p className="p-8 text-center sg-text-muted">
            {rows.length === 0
              ? 'No completed transactions yet. They appear here once finance confirms receipt on a funding request.'
              : 'No transactions match these filters.'}
          </p>
        )}
        {loading && <p className="p-8 text-center sg-text-muted">Loading transactions…</p>}
      </div>
    </div>
  );
}

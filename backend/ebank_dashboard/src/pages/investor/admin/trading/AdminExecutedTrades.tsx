import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Edit2, Search } from 'lucide-react';
import { getAllTrades, type Trade } from '../../../../services/investor/tradesService';
import { updateTradeContract } from '../../../../services/investor/tradingService';
import { useInvestorAuth } from '../../../../contexts/InvestorAuthContext';
import { logAction } from '../../../../services/investor/auditService';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const TRADE_CORRECTION_WINDOW_DAYS = 3;

function withinCorrectionWindow(executedAt?: Date): boolean {
  if (!executedAt) return false;
  return Date.now() - executedAt.getTime() <= TRADE_CORRECTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

function creditDebit(t: Trade): number {
  return t.side === 'buy' ? -(t.grossAmount + t.fees + t.commission) : t.grossAmount - t.fees - t.commission;
}

function downloadCsv(rows: Trade[]) {
  const headers = ['Trade Ref', 'Investor', 'Date', 'Symbol', 'Side', 'Qty', 'Call/Put', 'Strike', 'Expiry', 'Price', 'Trade Value', 'Fees', 'Commission', 'Credit/Debit', 'Remarks'];
  const lines = rows.map((t) =>
    [
      t.tradeRef,
      t.userEmail ?? t.userId,
      t.executedAt?.toISOString() ?? '',
      t.symbol,
      t.side,
      t.quantity,
      t.optionType ?? '',
      t.strikePrice ?? '',
      t.expiryDate ?? '',
      t.price,
      t.grossAmount,
      t.fees,
      t.commission,
      creditDebit(t),
      t.remarks,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  );
  const csv = [headers.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `executed-trades-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function CorrectionRow({ trade, onDone }: { trade: Trade; onDone: () => void }) {
  const { user, profile } = useInvestorAuth();
  const [editing, setEditing] = useState(false);
  const [contractSize, setContractSize] = useState(trade.contractSize != null ? String(trade.contractSize) : '');
  const [clientStatus, setClientStatus] = useState(trade.clientStatus ?? 'active');
  const [saving, setSaving] = useState(false);

  if (!withinCorrectionWindow(trade.executedAt)) return null;

  if (!editing) {
    return (
      <button type="button" className="sg-action-btn flex items-center gap-1 text-xs px-2 py-1" onClick={() => setEditing(true)}>
        <Edit2 className="h-3 w-3" /> Edit
      </button>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      await updateTradeContract({
        tradeId: trade.id,
        contractSize: contractSize ? Number(contractSize) : null,
        clientStatus: clientStatus as 'pending' | 'active' | 'inactive',
      });
      if (user) logAction(user.uid, profile?.email ?? '', 'Trade corrected', `${trade.tradeRef}`);
      toast.success('Trade metadata updated');
      setEditing(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update trade');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input
        type="number"
        value={contractSize}
        onChange={(e) => setContractSize(e.target.value)}
        placeholder="Contract size"
        className="sg-input py-1 px-2 text-xs w-24"
      />
      <select
        value={clientStatus}
        onChange={(e) => setClientStatus(e.target.value as 'pending' | 'active' | 'inactive')}
        className="sg-input py-1 px-2 text-xs"
      >
        <option value="pending">Pending</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <button type="button" className="sg-action-btn text-xs px-2 py-1" disabled={saving} onClick={save}>
        {saving ? 'Saving...' : 'Save'}
      </button>
      <button type="button" className="sg-btn-ghost text-xs px-2 py-1" onClick={() => setEditing(false)}>Cancel</button>
    </div>
  );
}

export default function AdminExecutedTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    getAllTrades()
      .then(setTrades)
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load executed trades'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return trades;
    return trades.filter(
      (t) =>
        t.symbol.toLowerCase().includes(needle) ||
        (t.userEmail ?? '').toLowerCase().includes(needle) ||
        t.tradeRef.toLowerCase().includes(needle),
    );
  }, [trades, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--sg-muted-2)' }} />
          <input
            className="sg-input pl-9"
            placeholder="Symbol, investor email, trade ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className="sg-btn-ghost flex items-center gap-2" onClick={() => downloadCsv(filtered)}>
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="sg-panel overflow-x-auto">
        <div className="px-4 pt-4 pb-2 text-xs" style={{ color: 'var(--sg-muted-2)' }}>
          Edit available for {TRADE_CORRECTION_WINDOW_DAYS} days after execution (metadata only — quantity, price, and gross value are permanent).
        </div>
        <table className="min-w-full text-sm">
          <thead className="sg-text-muted">
            <tr>
              <th className="text-left p-3">Trade Ref</th>
              <th className="text-left p-3">Investor</th>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Symbol</th>
              <th className="text-left p-3">Side</th>
              <th className="text-right p-3">Qty</th>
              <th className="text-left p-3">Call/Put</th>
              <th className="text-right p-3">Strike</th>
              <th className="text-left p-3">Expiry</th>
              <th className="text-right p-3">Price</th>
              <th className="text-right p-3">Trade Value</th>
              <th className="text-right p-3">Credit/Debit</th>
              <th className="text-left p-3">Remarks</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-t sg-row-border">
                <td className="p-3 font-mono text-xs sg-text-faint">{t.tradeRef}</td>
                <td className="p-3 sg-text-main">{t.userEmail ?? t.userId}</td>
                <td className="p-3 sg-text-muted">{t.executedAt ? t.executedAt.toLocaleString() : '—'}</td>
                <td className="p-3 font-semibold sg-text-main">{t.symbol}</td>
                <td className="p-3 uppercase" style={{ color: t.side === 'buy' ? 'var(--sg-teal)' : 'var(--sg-danger)' }}>{t.side}</td>
                <td className="p-3 text-right sg-text-main">{t.quantity}</td>
                <td className="p-3 uppercase sg-text-faint text-xs">{t.optionType ?? '—'}</td>
                <td className="p-3 text-right sg-text-faint text-xs">{t.strikePrice != null ? fmt(t.strikePrice) : '—'}</td>
                <td className="p-3 sg-text-faint text-xs">{t.expiryDate ?? '—'}</td>
                <td className="p-3 text-right sg-text-main">{fmt(t.price)}</td>
                <td className="p-3 text-right sg-text-main">{fmt(t.grossAmount)}</td>
                <td className="p-3 text-right" style={{ color: creditDebit(t) >= 0 ? 'var(--sg-teal)' : 'var(--sg-danger)' }}>
                  {fmt(creditDebit(t))}
                </td>
                <td className="p-3 sg-text-faint text-xs">{t.remarks}</td>
                <td className="p-3">
                  <CorrectionRow trade={t} onDone={load} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && <p className="p-8 text-center sg-text-muted">No trades on file.</p>}
        {loading && <p className="p-8 text-center sg-text-muted">Loading...</p>}
      </div>
    </div>
  );
}

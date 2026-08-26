import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FileText } from 'lucide-react';
import { getAllInvestorProfiles, type InvestorProfile } from '../../../../services/investor/profileService';
import { generateAccountStatement, type StatementResult } from '../../../../services/investor/tradingService';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const OCEAN_LABEL: Record<'O' | 'C' | 'E', string> = { O: 'Open', C: 'Closed', E: 'Expired' };

export default function AdminStatements() {
  const [investors, setInvestors] = useState<InvestorProfile[]>([]);
  const [investorId, setInvestorId] = useState('');
  const [startDate, setStartDate] = useState(isoDaysAgo(30));
  const [endDate, setEndDate] = useState(isoDaysAgo(-1));
  const [statement, setStatement] = useState<StatementResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAllInvestorProfiles()
      .then((rows) => setInvestors(rows.filter((r) => r.role === 'client')))
      .catch(() => toast.error('Failed to load investors'));
  }, []);

  const generate = async () => {
    if (!investorId) {
      toast.error('Select an investor');
      return;
    }
    setLoading(true);
    try {
      const result = await generateAccountStatement(investorId, startDate, endDate);
      setStatement(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate statement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="sg-card p-5 space-y-4" style={{ borderRadius: 14 }}>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" style={{ color: 'var(--sg-indigo)' }} />
          <h3 className="font-semibold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
            Statement Preview
          </h3>
        </div>
        <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>
          Live, read-time preview computed from executed trades and cash ledger entries — no PDF export or archive yet.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Investor</label>
            <select className="sg-input mt-1.5" value={investorId} onChange={(e) => setInvestorId(e.target.value)}>
              <option value="">— Select investor —</option>
              {investors.map((i) => (
                <option key={i.id} value={i.id}>{i.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Start</label>
            <input type="date" className="sg-input mt-1.5" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>End</label>
            <input type="date" className="sg-input mt-1.5" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <button type="button" className="sg-btn-primary" disabled={loading} onClick={generate}>
          {loading ? 'Generating...' : 'Generate Statement'}
        </button>
      </div>

      {statement && (
        <div className="sg-panel overflow-x-auto">
          <div className="px-4 pt-4 pb-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--sg-text)' }}>{statement.statementRef}</p>
              <p className="text-xs sg-text-faint">{statement.periodStart} → {statement.periodEnd}</p>
            </div>
            <div className="flex gap-4 text-xs">
              <div>
                <p style={{ color: 'var(--sg-muted-2)' }}>Cleared Amount</p>
                <p className="font-semibold sg-text-main">{fmt(statement.summary.clearedAmount)}</p>
              </div>
              <div>
                <p style={{ color: 'var(--sg-muted-2)' }}>Closing Balance</p>
                <p className="font-semibold sg-text-main">{statement.summary.closingBalance != null ? fmt(statement.summary.closingBalance) : '—'}</p>
              </div>
              <div>
                <p style={{ color: 'var(--sg-muted-2)' }}>Trades</p>
                <p className="font-semibold sg-text-main">{statement.summary.tradeCount}</p>
              </div>
            </div>
          </div>
          <table className="min-w-full text-sm">
            <thead className="sg-text-muted">
              <tr>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Trade Ref</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Symbol</th>
                <th className="text-left p-3">Side</th>
                <th className="text-right p-3">Qty</th>
                <th className="text-right p-3">Price</th>
                <th className="text-right p-3">Trade Value</th>
                <th className="text-right p-3">Fees</th>
                <th className="text-right p-3">Credit/Debit</th>
              </tr>
            </thead>
            <tbody>
              {statement.rows.map((r) => (
                <tr key={r.tradeRef} className="border-t sg-row-border">
                  <td className="p-3">
                    <span
                      className="text-xs font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: r.status === 'O' ? 'rgba(234,179,8,.15)' : r.status === 'E' ? 'rgba(239,68,68,.15)' : 'rgba(16,185,129,.15)',
                        color: r.status === 'O' ? 'var(--sg-gold)' : r.status === 'E' ? 'var(--sg-danger)' : 'var(--sg-teal)',
                      }}
                      title={OCEAN_LABEL[r.status]}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs sg-text-faint">{r.tradeRef}</td>
                  <td className="p-3 sg-text-muted">{r.executedAt ? new Date(r.executedAt).toLocaleDateString() : '—'}</td>
                  <td className="p-3 font-semibold sg-text-main">{r.symbol}</td>
                  <td className="p-3 uppercase" style={{ color: r.side === 'buy' ? 'var(--sg-teal)' : 'var(--sg-danger)' }}>{r.side}</td>
                  <td className="p-3 text-right sg-text-main">{r.quantity}</td>
                  <td className="p-3 text-right sg-text-main">{fmt(r.price)}</td>
                  <td className="p-3 text-right sg-text-main">{fmt(r.grossAmount)}</td>
                  <td className="p-3 text-right sg-text-muted">{fmt(r.fees + r.commission)}</td>
                  <td className="p-3 text-right" style={{ color: r.creditDebit >= 0 ? 'var(--sg-teal)' : 'var(--sg-danger)' }}>
                    {fmt(r.creditDebit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {statement.rows.length === 0 && <p className="p-6 text-center sg-text-muted">No trades in this period.</p>}
        </div>
      )}
    </div>
  );
}

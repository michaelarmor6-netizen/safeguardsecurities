import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FileText, Printer } from 'lucide-react';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { getPortfolioStatsForUser, getUserPortfolio, type PortfolioHolding, type PortfolioStats } from '../../../services/investor/portfolioService';
import { getUserWallet, type InvestorWallet } from '../../../services/investor/walletService';
import { getTradesForUser, type Trade } from '../../../services/investor/tradesService';
import { termsForSet } from '../../../lib/assetTerminology';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

export default function InvestorStatementPage() {
  const { user, profile } = useInvestorAuth();
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [wallet, setWallet] = useState<InvestorWallet | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getUserPortfolio(user.uid), getPortfolioStatsForUser(user.uid), getUserWallet(user.uid), getTradesForUser(user.uid)])
      .then(([h, s, w, t]) => {
        setHoldings(h);
        setStats(s);
        setWallet(w);
        setTrades(t.slice(0, 20));
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load statement'))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <div className="py-20 text-center" style={{ color: 'var(--sg-muted)' }}>Loading statement...</div>;
  }

  const s = stats ?? { totalValue: 0, totalGain: 0, totalGainPercent: 0, dayChange: 0, dayChangePercent: 0, holdingsCount: 0 };
  // A statement that calls contracts "shares" is wrong on a legal document.
  // termsForSet falls back to neutral wording when the book mixes classes
  // rather than picking one and mislabelling the rest.
  const holdingTerms = termsForSet(holdings.map((h) => h.assetClass));
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-4xl mx-auto space-y-6 print:max-w-none">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="sg-page-title flex items-center gap-2">
            <FileText className="h-5 w-5" style={{ color: 'var(--sg-indigo)' }} />
            Account Statement
          </h1>
          <p className="sg-page-sub mt-1">Summary of your account as of {today}.</p>
        </div>
        <button type="button" onClick={() => window.print()} className="sg-btn-ghost">
          <Printer className="h-4 w-4" />
          Print / Save PDF
        </button>
      </div>

      <div className="sg-card p-6" style={{ borderRadius: 14 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>Account holder</p>
            <p className="font-semibold" style={{ color: 'var(--sg-text)' }}>
              {profile?.displayName ?? profile?.email}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>Statement date</p>
            <p className="font-semibold" style={{ color: 'var(--sg-text)' }}>{today}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Wallet Balance', value: fmt(wallet?.balance ?? 0) },
          { label: 'Portfolio Value', value: fmt(s.totalValue) },
          { label: 'Total Gain', value: `${fmt(s.totalGain)} (${pct(s.totalGainPercent)})` },
          { label: 'Holdings', value: String(s.holdingsCount) },
        ].map(({ label, value }) => (
          <div key={label} className="sg-panel p-4">
            <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>{label}</p>
            <p className="text-lg font-bold mt-1" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="font-semibold mb-3" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          Holdings
        </h3>
        <div className="sg-panel overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="sg-text-muted">
              <tr>
                <th className="text-left p-3">Symbol</th>
                <th className="text-right p-3">{holdingTerms.quantityLabel}</th>
                <th className="text-right p-3">Price</th>
                <th className="text-right p-3">Value</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.id} className="border-t sg-row-border">
                  <td className="p-3 font-semibold sg-text-main">{h.symbol}</td>
                  <td className="p-3 text-right sg-text-main">{h.shares.toLocaleString()}</td>
                  <td className="p-3 text-right sg-text-main">{fmt(h.price)}</td>
                  <td className="p-3 text-right sg-text-main">{fmt(h.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {holdings.length === 0 && <p className="p-6 text-center sg-text-muted">No holdings.</p>}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          Recent Executed Trades
        </h3>
        <div className="sg-panel overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="sg-text-muted">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Symbol</th>
                <th className="text-left p-3">Side</th>
                <th className="text-right p-3">Qty</th>
                <th className="text-right p-3">Price</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id} className="border-t sg-row-border">
                  <td className="p-3 sg-text-muted">{t.executedAt ? t.executedAt.toLocaleDateString() : '—'}</td>
                  <td className="p-3 font-semibold sg-text-main">{t.symbol}</td>
                  <td className="p-3 uppercase sg-text-muted">{t.side}</td>
                  <td className="p-3 text-right sg-text-main">{t.quantity.toLocaleString()}</td>
                  <td className="p-3 text-right sg-text-main">{fmt(t.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {trades.length === 0 && <p className="p-6 text-center sg-text-muted">No executed trades yet.</p>}
        </div>
      </div>
    </div>
  );
}

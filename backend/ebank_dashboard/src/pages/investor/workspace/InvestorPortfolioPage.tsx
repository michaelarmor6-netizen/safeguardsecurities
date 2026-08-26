import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { termsForSet } from '../../../lib/assetTerminology';
import {
  getPortfolioStatsForUser,
  getUserPortfolio,
  type PortfolioHolding,
  type PortfolioStats,
} from '../../../services/investor/portfolioService';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

export default function InvestorPortfolioPage() {
  const { user } = useInvestorAuth();
  const { displayName } = useOutletContext<{ displayName: string }>();
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getUserPortfolio(user.uid), getPortfolioStatsForUser(user.uid)])
      .then(([h, s]) => {
        setHoldings(h);
        setStats(s);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load portfolio'))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return <div className="py-20 text-center" style={{ color: 'var(--sg-muted)' }}>Loading portfolio...</div>;
  }

  const s = stats ?? { totalValue: 0, totalGain: 0, totalGainPercent: 0, dayChange: 0, dayChangePercent: 0, holdingsCount: 0 };

  const terms = termsForSet(holdings.map((h) => h.assetClass));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="sg-page-title flex items-center gap-2">
          <Briefcase className="h-5 w-5" style={{ color: 'var(--sg-indigo)' }} />
          Portfolio
        </h1>
        <p className="sg-page-sub mt-1">{displayName}&apos;s current holdings and allocation.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Value', value: fmt(s.totalValue), color: 'var(--sg-indigo)' },
          { label: 'Total Gain', value: fmt(s.totalGain), color: s.totalGain >= 0 ? 'var(--sg-teal)' : 'var(--sg-danger)' },
          { label: 'Gain %', value: pct(s.totalGainPercent), color: s.totalGainPercent >= 0 ? 'var(--sg-teal)' : 'var(--sg-danger)' },
          { label: 'Holdings', value: String(s.holdingsCount), color: 'var(--sg-gold)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="sg-card p-4" style={{ borderRadius: 14 }}>
            <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>{label}</p>
            <p className="text-2xl font-bold mt-1" style={{ fontFamily: 'var(--sg-font-display)', color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="sg-panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sg-text-muted">
            <tr>
              <th className="text-left p-4">Symbol</th>
              <th className="text-left p-4">Name</th>
              <th className="text-right p-4">{terms.quantityLabel}</th>
              <th className="text-right p-4">{terms.costLabel}</th>
              <th className="text-right p-4">Mark</th>
              <th className="text-right p-4">Change</th>
              <th className="text-right p-4">Value</th>
              <th className="text-right p-4">Allocation</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h) => {
              const up = h.changePercent >= 0;
              return (
                <tr key={h.id} className="border-t sg-row-border">
                  <td className="p-4 font-semibold sg-text-main">{h.symbol}</td>
                  <td className="p-4 sg-text-muted">{h.name}</td>
                  <td className="p-4 text-right sg-text-main">{h.shares.toLocaleString()}</td>
                  <td className="p-4 text-right sg-text-muted">{fmt(h.averagePrice)}</td>
                  <td className="p-4 text-right sg-text-main">
                    {fmt(h.price)}
                    {h.markedAtCost && (
                      <span
                        className="block text-[10px]"
                        style={{ color: 'var(--sg-muted-2)' }}
                        title="No live market price for this instrument — valued at entry cost"
                      >
                        at cost
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right" style={{ color: up ? 'var(--sg-teal)' : 'var(--sg-danger)' }}>
                    <span className="inline-flex items-center gap-0.5">
                      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      {pct(h.changePercent)}
                    </span>
                  </td>
                  <td className="p-4 text-right sg-text-main">{fmt(h.value)}</td>
                  <td className="p-4 text-right sg-text-muted">{h.allocation.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {holdings.length === 0 && (
          <p className="p-8 text-center sg-text-muted">No holdings yet. Positions will appear here once your portfolio is funded.</p>
        )}
      </div>
    </div>
  );
}

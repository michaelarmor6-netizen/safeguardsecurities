import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDownRight, ArrowUpRight, TrendingUp } from 'lucide-react';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { getPortfolioStatsForUser, PORTFOLIO_MARK_REFRESH_MS, type PortfolioStats } from '../../../services/investor/portfolioService';
import { getPortfolioHistory, type PortfolioSnapshot } from '../../../services/investor/portfolioHistoryService';
import PortfolioMiniChart from '../../../components/investor/PortfolioMiniChart';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

export default function InvestorPerformancePage() {
  const { user } = useInvestorAuth();
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [history, setHistory] = useState<PortfolioSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'30D' | '90D' | '1Y' | 'All'>('90D');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = (initial: boolean) => {
      Promise.all([getPortfolioStatsForUser(user.uid), getPortfolioHistory(user.uid)])
        .then(([s, hist]) => {
          if (cancelled) return;
          setStats(s);
          setHistory(hist);
        })
        .catch((e) => {
          if (!cancelled) toast.error(e instanceof Error ? e.message : 'Failed to load performance');
        })
        .finally(() => {
          if (initial && !cancelled) setLoading(false);
        });
    };
    load(true);
    const timer = window.setInterval(() => load(false), PORTFOLIO_MARK_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [user]);

  const rangeDays = range === '30D' ? 30 : range === '90D' ? 90 : range === '1Y' ? 365 : Infinity;
  const visibleHistory = useMemo(() => (rangeDays === Infinity ? history : history.slice(-rangeDays)), [history, rangeDays]);
  const chartValues = useMemo(() => visibleHistory.map((h) => h.totalValue), [visibleHistory]);

  const periodChange = useMemo(() => {
    if (visibleHistory.length < 2) return null;
    const first = visibleHistory[0].totalValue;
    const last = visibleHistory[visibleHistory.length - 1].totalValue;
    return { amount: last - first, percent: first ? ((last - first) / first) * 100 : 0 };
  }, [visibleHistory]);

  // Value depends on a daily underlying mark that can go stale silently (a
  // lapsed data subscription returns 401 and the snapshot job then marks at
  // cost). Surface the freshness of the newest data point so a frozen chart
  // is legible rather than mistaken for a real flat trend.
  const dataAsOf = history.length ? history[history.length - 1].date : null;
  const staleDays = useMemo(() => {
    if (!dataAsOf) return null;
    const last = Date.parse(`${dataAsOf}T00:00:00Z`);
    const today = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
    if (!Number.isFinite(last) || !Number.isFinite(today)) return null;
    return Math.round((today - last) / 86400000);
  }, [dataAsOf]);

  if (loading) {
    return <div className="py-20 text-center" style={{ color: 'var(--sg-muted)' }}>Loading performance...</div>;
  }

  const s = stats ?? { totalValue: 0, totalGain: 0, totalGainPercent: 0, dayChange: 0, dayChangePercent: 0, holdingsCount: 0 };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="sg-page-title flex items-center gap-2">
          <TrendingUp className="h-5 w-5" style={{ color: 'var(--sg-indigo)' }} />
          Performance
        </h1>
        <p className="sg-page-sub mt-1">Historical value trend and current performance against cost basis.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'Total Value', value: fmt(s.totalValue), color: 'var(--sg-indigo)' },
          {
            label: 'Total Gain / Loss',
            value: `${fmt(s.totalGain)} (${pct(s.totalGainPercent)})`,
            color: s.totalGain >= 0 ? 'var(--sg-teal)' : 'var(--sg-danger)',
            up: s.totalGain >= 0,
          },
          {
            label: "Today's Change",
            value: `${fmt(s.dayChange)} (${pct(s.dayChangePercent)})`,
            color: s.dayChange >= 0 ? 'var(--sg-teal)' : 'var(--sg-danger)',
            up: s.dayChange >= 0,
          },
          { label: 'Active Holdings', value: String(s.holdingsCount), color: 'var(--sg-gold)' },
        ].map(({ label, value, color, up }) => (
          <div key={label} className="sg-card p-5" style={{ borderRadius: 14 }}>
            <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>{label}</p>
            <p className="text-xl font-bold mt-1 flex items-center gap-1.5" style={{ fontFamily: 'var(--sg-font-display)', color }}>
              {up !== undefined && (up ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />)}
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="sg-card p-5" style={{ borderRadius: 14 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
            Value History
          </h3>
          <div className="flex gap-1">
            {(['30D', '90D', '1Y', 'All'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className="px-3 py-1 text-xs rounded-[10px] transition border"
                style={
                  range === r
                    ? { background: 'rgba(99,102,241,.15)', color: 'var(--sg-indigo)', borderColor: 'rgba(99,102,241,.3)' }
                    : { color: 'var(--sg-muted-2)', borderColor: 'transparent' }
                }
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {dataAsOf && (
          <p
            className="text-[11px] mb-3"
            style={{ color: staleDays != null && staleDays > 1 ? 'var(--sg-gold)' : 'var(--sg-muted-2)' }}
          >
            {staleDays != null && staleDays > 1
              ? `Data as of ${dataAsOf} — ${staleDays} days behind. Values refresh after each market close.`
              : `Data as of ${dataAsOf}.`}
          </p>
        )}

        {chartValues.length >= 2 ? (
          <>
            <PortfolioMiniChart values={chartValues} />
            <div className="flex justify-between text-sm mt-2">
              <span style={{ color: 'var(--sg-muted-2)' }}>
                {visibleHistory[0]?.date} → {visibleHistory[visibleHistory.length - 1]?.date}
              </span>
              {periodChange && (
                <span style={{ color: periodChange.amount >= 0 ? 'var(--sg-teal)' : 'var(--sg-danger)' }}>
                  {fmt(periodChange.amount)} ({pct(periodChange.percent)})
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="py-10 text-center text-sm" style={{ color: 'var(--sg-muted-2)' }}>
            Building your performance history — a data point is recorded once daily, so the chart fills in over the
            next few days. Figures above reflect your current holdings against their recorded cost basis in the
            meantime.
          </div>
        )}
      </div>
    </div>
  );
}

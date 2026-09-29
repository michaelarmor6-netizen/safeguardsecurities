import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, FileText, Sparkles, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { formatInvoiceMoney, getInvoicesForUser, invoiceTotal, type StaffInvoice } from '../../../services/investor/invoiceService';
import {
  getPortfolioStatsForUser,
  getUserPortfolio,
  PORTFOLIO_MARK_REFRESH_MS,
  type PortfolioHolding,
  type PortfolioStats,
} from '../../../services/investor/portfolioService';
import { getUserWallet } from '../../../services/investor/walletService';
import { getPortfolioHistory, type PortfolioSnapshot } from '../../../services/investor/portfolioHistoryService';
import PortfolioPerformanceChart from '../../../components/investor/PortfolioPerformanceChart';
import { termsFor } from '../../../lib/assetTerminology';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

function HoldingCard({ holding }: { holding: PortfolioHolding }) {
  const up = holding.changePercent >= 0;
  // "Shares" is equity vocabulary. A gold option is held in CONTRACTS at a
  // premium - labelling it shares contradicts both the trade ticket and the
  // client's own statement.
  const terms = termsFor(holding.assetClass);
  return (
    <div className="sg-card p-4" style={{ borderRadius: 14 }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold" style={{ color: 'var(--sg-text)', fontFamily: 'var(--sg-font-display)' }}>
              {holding.symbol}
            </span>
            <span className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>
              {holding.name}
            </span>
          </div>
          <p className="text-lg font-semibold mt-1" style={{ color: 'var(--sg-text)', fontFamily: 'var(--sg-font-display)' }}>
            ${holding.price.toFixed(2)}
          </p>
        </div>
        <span
          className="flex items-center gap-0.5 text-sm font-medium"
          style={{ color: up ? 'var(--sg-teal)' : 'var(--sg-danger)' }}
        >
          {up ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
          {pct(holding.changePercent)}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p style={{ color: 'var(--sg-muted-2)' }}>{terms.quantityLabel}</p>
          <p className="font-medium" style={{ color: 'var(--sg-text)' }}>
            {holding.shares.toLocaleString()}
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--sg-muted-2)' }}>Value</p>
          <p className="font-medium" style={{ color: 'var(--sg-text)' }}>
            {fmt(holding.value)}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--sg-muted-2)' }}>
          <span>Allocation</span>
          <span>{holding.allocation.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--sg-border)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(holding.allocation, 100)}%`, background: 'var(--sg-teal)' }}
          />
        </div>
      </div>
      <p className="text-[10px] mt-2 flex items-center gap-1" style={{ color: 'var(--sg-teal)' }}>
        <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: 'var(--sg-teal)' }} />
        Live data
      </p>
    </div>
  );
}

export default function InvestorDashboardPage() {
  const { user } = useInvestorAuth();
  const navigate = useNavigate();
  const { displayName } = useOutletContext<{ displayName: string }>();
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [history, setHistory] = useState<PortfolioSnapshot[]>([]);
  const [invoices, setInvoices] = useState<StaffInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartRange, setChartRange] = useState<'7D' | '30D' | '90D' | '1Y'>('30D');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = (initial: boolean) => {
      Promise.all([
        getUserPortfolio(user.uid),
        getPortfolioStatsForUser(user.uid),
        getUserWallet(user.uid),
        getPortfolioHistory(user.uid),
        getInvoicesForUser(user.uid).catch(() => [] as StaffInvoice[]),
      ])
        .then(([h, s, w, hist, inv]) => {
          if (cancelled) return;
          setHoldings(h);
          setStats(s);
          setWalletBalance(w?.balance ?? 0);
          setHistory(hist);
          setInvoices(inv.filter((i) => i.status !== 'void').slice(0, 3));
        })
        .catch((e) => {
          if (!cancelled) toast.error(e instanceof Error ? e.message : 'Failed to load portfolio');
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

  // Real daily snapshots (see functions-trading's snapshotPortfolios) - not
  // synthetic. History only goes back as far as snapshots have accumulated
  // since this feature shipped; there's no fabricated backfill.
  const rangeDays = chartRange === '7D' ? 7 : chartRange === '30D' ? 30 : chartRange === '90D' ? 90 : 365;
  const visibleHistory = useMemo(() => history.slice(-rangeDays), [history, rangeDays]);
  const chartValues = useMemo(() => visibleHistory.map((h) => h.totalValue), [visibleHistory]);
  const chartPoints = useMemo(
    () => visibleHistory.map((h) => ({ date: h.date, value: h.totalValue })),
    [visibleHistory],
  );

  if (loading) {
    return (
      <div className="py-20 text-center" style={{ color: 'var(--sg-muted)' }}>
        Loading dashboard...
      </div>
    );
  }

  const s = stats ?? {
    totalValue: 0,
    totalGain: 0,
    totalGainPercent: 0,
    dayChange: 0,
    dayChangePercent: 0,
    holdingsCount: 0,
  };

  // No live feed. Gain stays blank until an admin posts a P/L on the holding.
  const awaitingMark = holdings.length > 0 && holdings.every((h) => h.markedAtCost);
  const markAsOf = holdings.find((h) => h.markAsOf)?.markAsOf;

  const statColors = ['var(--sg-indigo)', 'var(--sg-teal)', 'var(--sg-pink)', 'var(--sg-gold)'] as const;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-semibold leading-snug" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          Welcome back, {displayName}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--sg-muted)' }}>
          Here&apos;s what&apos;s happening with your investments today.
        </p>
      </div>

      <div
        className="rounded-[18px] border p-6 relative overflow-hidden"
        style={{
          borderColor: 'rgba(99,102,241,.22)',
          background: 'linear-gradient(135deg, rgba(99,102,241,.14), transparent 55%), var(--sg-bg-elevated)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(var(--sg-grid) 1px, transparent 1px), linear-gradient(90deg, var(--sg-grid) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            opacity: 0.7,
          }}
        />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="sg-badge mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              Live Trading
            </span>
            <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
              AI-Engine Trading <em className="sg-title-accent">Platform</em>
            </h2>
            <p className="text-sm mt-1 max-w-lg" style={{ color: 'var(--sg-muted)' }}>
              Institutional-grade AI with adaptive risk controls — portfolio visibility and market context in one workspace.
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>
              Wallet balance
            </p>
            <p className="text-2xl font-bold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
              {fmt(walletBalance)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Value', value: fmt(s.totalValue), sub: pct(s.dayChangePercent), up: s.dayChangePercent >= 0 },
          awaitingMark
            ? { label: 'Total Gain', value: '—', sub: 'Waiting for an admin P/L update', up: true }
            : {
                label: 'Total Gain',
                value: fmt(s.totalGain),
                sub: markAsOf ? `${pct(s.totalGainPercent)} · as of ${markAsOf}` : pct(s.totalGainPercent),
                up: s.totalGain >= 0,
              },
          { label: 'Holdings', value: String(s.holdingsCount), sub: 'Active positions', up: true },
          awaitingMark
            ? { label: 'Performance', value: '—', sub: 'Waiting for an admin P/L update', up: true }
            : { label: 'Performance', value: pct(s.totalGainPercent), sub: 'Based on active holdings', up: s.totalGainPercent >= 0 },
        ].map(({ label, value, sub, up }, i) => (
          <div key={label} className="sg-card p-4" style={{ borderRadius: 14 }}>
            <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>
              {label}
            </p>
            <p className="text-2xl font-bold mt-1" style={{ fontFamily: 'var(--sg-font-display)', color: statColors[i] }}>
              {value}
            </p>
            <p
              className="text-xs mt-1 flex items-center gap-1"
              style={{ color: up ? 'var(--sg-teal)' : 'var(--sg-danger)' }}
            >
              {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {sub}
            </p>
          </div>
        ))}
      </div>

      <div className="sg-card p-5" style={{ borderRadius: 14 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" style={{ color: 'var(--sg-teal)' }} />
            <h3 className="font-semibold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
              Portfolio Performance
            </h3>
          </div>
          <div className="flex gap-1">
            {(['7D', '30D', '90D', '1Y'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setChartRange(r)}
                className="px-3 py-1 text-xs rounded-[10px] transition border"
                style={
                  chartRange === r
                    ? {
                        background: 'rgba(99,102,241,.15)',
                        color: 'var(--sg-indigo)',
                        borderColor: 'rgba(99,102,241,.3)',
                        fontFamily: 'var(--sg-font-display)',
                      }
                    : {
                        color: 'var(--sg-muted-2)',
                        borderColor: 'transparent',
                        fontFamily: 'var(--sg-font-display)',
                      }
                }
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        {chartValues.length >= 2 ? (
          <>
            <PortfolioPerformanceChart points={chartPoints} />
            <div className="flex justify-between text-sm mt-2">
              <span style={{ color: 'var(--sg-muted-2)' }}>
                {visibleHistory[0]?.date} → {visibleHistory[visibleHistory.length - 1]?.date}
              </span>
              <span style={{ color: s.dayChangePercent >= 0 ? 'var(--sg-teal)' : 'var(--sg-danger)' }}>
                {pct(s.dayChangePercent)}
              </span>
            </div>
          </>
        ) : (
          <div className="py-10 text-center text-sm" style={{ color: 'var(--sg-muted-2)' }}>
            Building your performance history — a data point is recorded once daily, so the chart fills in over the
            next few days.
          </div>
        )}
      </div>

      {invoices.length > 0 && (
        <div className="sg-card p-5" style={{ borderRadius: 14 }}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" style={{ color: 'var(--sg-indigo)' }} />
              <h3 className="font-semibold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
                Recent invoices
              </h3>
            </div>
            <button type="button" className="sg-action-btn text-xs" onClick={() => navigate('/workspace/invoices')}>
              View all
            </button>
          </div>
          <div className="space-y-2">
            {invoices.map((inv) => (
              <button
                key={inv.id}
                type="button"
                className="w-full flex items-center justify-between gap-3 text-left px-3 py-2 rounded-[10px] text-sm"
                style={{ background: 'var(--sg-bg)', color: 'var(--sg-text)' }}
                onClick={() => navigate(`/invoice/${inv.id}`)}
              >
                <span className="font-mono">{inv.number}</span>
                <span style={{ color: 'var(--sg-muted)' }}>{inv.issuedAt?.toLocaleDateString() ?? '—'}</span>
                <span className="font-medium">{formatInvoiceMoney(invoiceTotal(inv.lineItems, inv.taxRate), inv.currency)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-semibold mb-4" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          Your Holdings
        </h3>
        {holdings.length === 0 ? (
          <div className="sg-card p-8 text-center" style={{ borderRadius: 14, color: 'var(--sg-muted-2)' }}>
            No holdings yet. Positions will appear here once your portfolio is funded.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {holdings.map((h) => (
              <HoldingCard key={h.id} holding={h} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

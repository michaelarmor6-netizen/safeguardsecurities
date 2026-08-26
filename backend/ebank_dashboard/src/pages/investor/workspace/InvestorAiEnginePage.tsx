import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Sparkles, ArrowUpRight, ArrowDownRight, Minus, AlertTriangle } from 'lucide-react';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { generateSignal, getSignalHistoryForUser, type AiSignal } from '../../../services/investor/aiSignalService';
import { createOrder } from '../../../services/investor/orderService';
import FundingRequiredNotice from '../../../components/investor/FundingRequiredNotice';
import { useEntitlements } from '../../../hooks/useEntitlements';

const sideColor: Record<AiSignal['side'], string> = {
  buy: 'var(--sg-teal)',
  sell: 'var(--sg-danger)',
  hold: 'var(--sg-muted-2)',
};

const sideIcon: Record<AiSignal['side'], typeof ArrowUpRight> = {
  buy: ArrowUpRight,
  sell: ArrowDownRight,
  hold: Minus,
};

export default function InvestorAiEnginePage() {
  const { user, profile, isFunded } = useInvestorAuth();
  const entitlements = useEntitlements();
  const [symbol, setSymbol] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [signal, setSignal] = useState<AiSignal | null>(null);
  const [history, setHistory] = useState<AiSignal[]>([]);
  const [quantity, setQuantity] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);

  const loadHistory = () => {
    if (!user) return;
    getSignalHistoryForUser(user.uid)
      .then(setHistory)
      .catch(() => {});
  };

  useEffect(loadHistory, [user]);

  const analyze = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = symbol.trim().toUpperCase();
    if (!clean) {
      toast.error('Enter a symbol, e.g. AAPL');
      return;
    }
    setAnalyzing(true);
    setSignal(null);
    try {
      const result = await generateSignal(clean);
      setSignal(result);
      loadHistory();
      entitlements.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate signal');
      // Re-sync the meter: the allowance may have moved in another tab, or the
      // server may have refunded a reservation after a failed generation.
      entitlements.refresh();
    } finally {
      setAnalyzing(false);
    }
  };

  const placeOrder = async () => {
    if (!signal || !user || signal.side === 'hold') return;
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      toast.error('Enter a valid quantity');
      return;
    }
    setPlacingOrder(true);
    try {
      await createOrder(user.uid, profile?.email ?? user.email ?? '', signal.symbol, signal.side, qty);
      toast.success('Order submitted as pending — an admin will review and execute it');
      setQuantity('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit order');
    } finally {
      setPlacingOrder(false);
    }
  };

  const SideIcon = signal ? sideIcon[signal.side] : Sparkles;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="sg-page-title flex items-center gap-2">
          <Sparkles className="h-5 w-5" style={{ color: 'var(--sg-indigo)' }} />
          AI Engine
          <span
            className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded"
            style={{
              letterSpacing: '0.1em',
              color: entitlements.isPro ? 'var(--sg-teal)' : 'var(--sg-muted-2)',
              border: `1px solid ${entitlements.isPro ? 'var(--sg-teal)' : 'var(--sg-border-strong)'}`,
              fontFamily: 'var(--sg-font-display)',
            }}
          >
            {entitlements.planLabel}
          </span>
        </h1>
        <p className="sg-page-sub mt-1">
          SG AI reasons over real technical indicators (SMA, RSI, MACD) to produce a buy/sell/hold signal.
        </p>
      </div>

      {!isFunded ? (
        <FundingRequiredNotice
          title="Fund your account to unlock the AI Engine"
          description="AI-generated technical signals and order placement activate once your account has a funded balance."
        />
      ) : (
        <>
      <form onSubmit={analyze} className="sg-card p-5 space-y-4" style={{ borderRadius: 14 }}>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h3 className="font-semibold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
            Analyze a Symbol
          </h3>
          {!entitlements.loading && (
            <span
              className="text-xs tabular-nums"
              style={{ color: entitlements.quotaExhausted ? 'var(--sg-danger)' : 'var(--sg-muted-2)' }}
            >
              {entitlements.signalsUsed} of {entitlements.signalQuota} signals used this month
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="e.g. AAPL"
            className="sg-input flex-1"
          />
          <button
            type="submit"
            disabled={analyzing || entitlements.quotaExhausted}
            className="sg-btn-primary shrink-0"
          >
            {analyzing ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
        {entitlements.quotaExhausted && (
          <p className="text-xs" style={{ color: 'var(--sg-muted)' }}>
            You have used all {entitlements.signalQuota} signals on the {entitlements.planLabel} plan
            this month. Your allowance resets at the start of next month — contact your account
            manager to move to a higher plan.
          </p>
        )}
      </form>

      {signal && (
        <div className="sg-card p-5 space-y-4" style={{ borderRadius: 14 }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>{signal.symbol}</p>
              <p
                className="text-2xl font-bold uppercase flex items-center gap-2"
                style={{ color: sideColor[signal.side], fontFamily: 'var(--sg-font-display)' }}
              >
                <SideIcon className="h-6 w-6" />
                {signal.side}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>Confidence</p>
              <p className="text-lg font-semibold" style={{ color: 'var(--sg-text)' }}>
                {Math.round(signal.confidence * 100)}%
              </p>
            </div>
          </div>

          <p className="text-sm" style={{ color: 'var(--sg-muted)' }}>{signal.rationale}</p>

          <div className="grid grid-cols-4 gap-3 text-xs border-t pt-3 sg-row-border">
            <div>
              <p style={{ color: 'var(--sg-muted-2)' }}>SMA20</p>
              <p style={{ color: 'var(--sg-text)' }}>{signal.indicators.sma20?.toFixed(2) ?? '—'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--sg-muted-2)' }}>SMA50</p>
              <p style={{ color: 'var(--sg-text)' }}>{signal.indicators.sma50?.toFixed(2) ?? '—'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--sg-muted-2)' }}>RSI14</p>
              <p style={{ color: 'var(--sg-text)' }}>{signal.indicators.rsi14?.toFixed(1) ?? '—'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--sg-muted-2)' }}>MACD Hist.</p>
              <p style={{ color: 'var(--sg-text)' }}>{signal.indicators.macd?.histogram.toFixed(3) ?? '—'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs p-3 rounded-lg" style={{ background: 'var(--sg-bg-panel)', color: 'var(--sg-muted-2)' }}>
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            AI-generated analysis for informational purposes only — not financial advice. Review carefully before acting.
          </div>

          {signal.side !== 'hold' && (
            <div className="flex gap-2 border-t pt-4 sg-row-border">
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Quantity"
                className="sg-input flex-1"
              />
              <button type="button" onClick={placeOrder} disabled={placingOrder} className="sg-btn-primary shrink-0">
                {placingOrder ? 'Submitting...' : `Place ${signal.side.toUpperCase()} Order`}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-semibold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          Signal History
        </h3>
        {history.length === 0 && (
          <div className="sg-panel p-8 text-center sg-text-muted">No signals generated yet.</div>
        )}
        {history.map((h) => (
          <div key={h.id} className="sg-card p-4 flex items-center justify-between gap-3" style={{ borderRadius: 14 }}>
            <div>
              <p className="font-semibold" style={{ color: 'var(--sg-text)' }}>{h.symbol}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--sg-muted-2)' }}>
                {h.createdAt ? h.createdAt.toLocaleString() : ''}
              </p>
            </div>
            <span className="text-xs font-semibold uppercase" style={{ color: sideColor[h.side] }}>
              {h.side} · {Math.round(h.confidence * 100)}%
            </span>
          </div>
        ))}
      </div>
        </>
      )}
    </div>
  );
}

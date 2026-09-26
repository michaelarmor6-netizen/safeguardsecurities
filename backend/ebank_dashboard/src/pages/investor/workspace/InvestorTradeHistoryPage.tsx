import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { createOrder, type InvestorOrder } from '../../../services/investor/orderService';
import { getTradesForUser, type Trade } from '../../../services/investor/tradesService';
import TradingRecord from '../../../components/investor/TradingRecord';

const REFRESH_MS = 12_000;

export default function InvestorTradeHistoryPage() {
  const { user, profile } = useInvestorAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [orderSide, setOrderSide] = useState<InvestorOrder['side']>('buy');
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const run = (initial: boolean) => {
      if (initial) setLoading(true);
      getTradesForUser(user.uid)
        .then((rows) => {
          if (!cancelled) setTrades(rows);
        })
        .catch((e) => {
          if (initial) toast.error(e instanceof Error ? e.message : 'Failed to load trade history');
        })
        .finally(() => {
          if (initial && !cancelled) setLoading(false);
        });
    };
    run(true);
    const timer = window.setInterval(() => run(false), REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [user]);

  const clientName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || profile?.displayName || profile?.email || 'Client';

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (!user || !symbol.trim() || !qty || qty <= 0) {
      toast.error('Enter a symbol and quantity');
      return;
    }
    setSubmitting(true);
    try {
      await createOrder(user.uid, profile?.email ?? user.email ?? '', symbol.trim(), orderSide, qty);
      toast.success('Order submitted for execution');
      setSymbol('');
      setQuantity('');
      setPlacing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center" style={{ color: 'var(--sg-muted)' }}>Loading trade history...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="sg-page-title">{clientName}</h1>
          <p className="sg-page-sub">{profile?.email ?? user?.email}</p>
        </div>
        <button type="button" className="sg-btn-ghost text-xs shrink-0" onClick={() => setPlacing((v) => !v)}>
          {placing ? 'Close order ticket' : 'Place order'}
        </button>
      </div>

      {placing && (
        <form onSubmit={submitOrder} className="sg-card p-5 space-y-4" style={{ borderRadius: 14 }}>
          <h3 className="font-semibold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
            Place order
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Symbol (e.g. GCZ27)" className="sg-input" />
            <select value={orderSide} onChange={(e) => setOrderSide(e.target.value as InvestorOrder['side'])} className="sg-input">
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
            <input type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Quantity" className="sg-input" />
          </div>
          <button type="submit" disabled={submitting} className="sg-btn-primary">
            {submitting ? 'Submitting...' : 'Submit order'}
          </button>
          <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>
            Orders are reviewed and executed by SafeGuard staff. A fill appears in this record after it is confirmed.
          </p>
        </form>
      )}

      <TradingRecord trades={trades} />
    </div>
  );
}

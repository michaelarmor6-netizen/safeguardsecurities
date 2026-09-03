import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { History } from 'lucide-react';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { createOrder, getOrdersForUser, type InvestorOrder } from '../../../services/investor/orderService';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

// Trades need the time of day, not just the date - two fills on the same day
// are indistinguishable otherwise, and the execution time is what a client
// reconciles against.
const fmtDateTime = (d: Date) =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(d);

const statusColor: Record<InvestorOrder['status'], string> = {
  pending: 'var(--sg-gold)',
  working: 'var(--sg-indigo)',
  partially_filled: 'var(--sg-indigo)',
  filled: 'var(--sg-teal)',
  cancelled: 'var(--sg-muted-2)',
  rejected: 'var(--sg-danger)',
  expired: 'var(--sg-muted-2)',
};

export default function InvestorTradeHistoryPage() {
  const { user, profile } = useInvestorAuth();
  const [orders, setOrders] = useState<InvestorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<InvestorOrder['side']>('buy');
  const [quantity, setQuantity] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    if (!user) return;
    getOrdersForUser(user.uid)
      .then(setOrders)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load trade history'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [user]);

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (!user || !symbol.trim() || !qty || qty <= 0) {
      toast.error('Enter a symbol and quantity');
      return;
    }
    setSubmitting(true);
    try {
      await createOrder(user.uid, profile?.email ?? user.email ?? '', symbol.trim(), side, qty);
      toast.success('Order submitted for execution');
      setSymbol('');
      setQuantity('');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center" style={{ color: 'var(--sg-muted)' }}>Loading trade history...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="sg-page-title flex items-center gap-2">
          <History className="h-5 w-5" style={{ color: 'var(--sg-indigo)' }} />
          Trade History
        </h1>
        <p className="sg-page-sub mt-1">Place an order and review your trade history.</p>
      </div>

      <form onSubmit={submitOrder} className="sg-card p-5 space-y-4" style={{ borderRadius: 14 }}>
        <h3 className="font-semibold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          Place Order
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Symbol (e.g. AAPL)"
            className="sg-input"
          />
          <select value={side} onChange={(e) => setSide(e.target.value as InvestorOrder['side'])} className="sg-input">
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Quantity"
            className="sg-input"
          />
        </div>
        <button type="submit" disabled={submitting} className="sg-btn-primary">
          {submitting ? 'Submitting...' : 'Submit Order'}
        </button>
        <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>
          Orders are reviewed and executed by SafeGuard staff.
        </p>
      </form>

      <div className="sg-panel overflow-x-auto sg-table-stack-wrap p-3 md:p-0">
        <table className="min-w-full text-sm sg-table-stack">
          <thead className="sg-text-muted">
            <tr>
              <th className="text-left p-4">Date &amp; Time</th>
              <th className="text-left p-4">Symbol</th>
              <th className="text-left p-4">Side</th>
              <th className="text-right p-4">Quantity</th>
              <th className="text-right p-4">Price</th>
              <th className="text-left p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t sg-row-border">
                <td className="p-4 sg-text-muted whitespace-nowrap" data-label="Date">
                  {/* Fill time is the trade's real timestamp; fall back to when it was placed for orders not yet filled. */}
                  {(() => {
                    const ts = o.filledAt ?? o.createdAt;
                    return ts ? fmtDateTime(ts) : '—';
                  })()}
                </td>
                <td className="p-4 font-semibold sg-text-main" data-label="Symbol">{o.symbol}</td>
                <td className="p-4" data-label="Side">
                  <span
                    className="text-xs font-semibold uppercase"
                    style={{ color: o.side === 'buy' ? 'var(--sg-teal)' : 'var(--sg-danger)' }}
                  >
                    {o.side}
                  </span>
                </td>
                <td className="p-4 text-right sg-text-main" data-label="Quantity">{o.quantity.toLocaleString()}</td>
                <td className="p-4 text-right sg-text-main" data-label="Price">{o.price != null ? fmt(o.price) : '—'}</td>
                <td className="p-4" data-label="Status">
                  <span className="text-xs font-semibold uppercase" style={{ color: statusColor[o.status] }}>
                    {o.status.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <p className="p-8 text-center sg-text-muted">No trades yet. Executed orders will appear here.</p>
        )}
      </div>
    </div>
  );
}

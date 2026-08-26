import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllOrders, type InvestorOrder, type OrderStatus } from '../../../services/investor/orderService';
import AdminTradeEntryPanel from './trading/AdminTradeEntryPanel';
import AdminExecutionQueue from './trading/AdminExecutionQueue';
import AdminExecutedTrades from './trading/AdminExecutedTrades';
import AdminStatements from './trading/AdminStatements';
import AdminPortfolioStructure from './trading/AdminPortfolioStructure';
import OrderRowActions from './trading/OrderRowActions';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

type Tab = 'orders' | 'execution' | 'executed' | 'statements' | 'portfolio';

const TABS: { key: Tab; label: string }[] = [
  { key: 'orders', label: 'Orders' },
  { key: 'execution', label: 'Trade Entry & Queue' },
  { key: 'executed', label: 'Executed Trades' },
  { key: 'statements', label: 'Statements' },
  { key: 'portfolio', label: 'Portfolio Structure' },
];

const STATUS_FILTERS: { key: 'all' | OrderStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'working', label: 'Working' },
  { key: 'partially_filled', label: 'Partial' },
  { key: 'filled', label: 'Filled' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'rejected', label: 'Rejected' },
];

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: 'var(--sg-gold)',
  working: 'var(--sg-indigo)',
  partially_filled: 'var(--sg-indigo)',
  filled: 'var(--sg-teal)',
  cancelled: 'var(--sg-muted-2)',
  rejected: 'var(--sg-danger)',
  expired: 'var(--sg-muted-2)',
};

export default function InvestorAdminOrdersPage() {
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<InvestorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');

  const load = () => {
    getAllOrders()
      .then(setOrders)
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load orders'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const kpis = useMemo(() => {
    const awaitingAction = orders.filter((o) => o.status === 'pending').length;
    const working = orders.filter((o) => o.status === 'working' || o.status === 'partially_filled').length;
    const todayStr = new Date().toDateString();
    const executedToday = orders.filter((o) => o.filledAt && o.filledAt.toDateString() === todayStr).length;
    const rejectedToday = orders.filter((o) => o.status === 'rejected' && o.createdAt?.toDateString() === todayStr).length;
    return { awaitingAction, working, executedToday, rejectedToday };
  }, [orders]);

  const filteredOrders = statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="sg-page-title">Trading Operations</h1>
        <p className="sg-page-sub mt-1">
          Single brokerage workstation — orders, executions, trade history, statements, and portfolio structure. Instrument
          configuration lives under Asset Management.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Orders awaiting action', value: kpis.awaitingAction },
          { label: 'Working orders', value: kpis.working },
          { label: 'Executed today', value: kpis.executedToday },
          { label: 'Rejected today', value: kpis.rejectedToday },
        ].map((k) => (
          <div key={k.label} className="sg-panel p-3 text-center">
            <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>{k.label}</p>
            <p className="text-lg font-bold mt-1" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 flex-wrap border-b pb-2" style={{ borderColor: 'var(--sg-border)' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className="px-3 py-1.5 rounded-full text-sm font-medium"
            style={{
              background: tab === t.key ? 'var(--sg-indigo)' : 'transparent',
              color: tab === t.key ? 'white' : 'var(--sg-muted)',
              border: `1px solid ${tab === t.key ? 'var(--sg-indigo)' : 'var(--sg-border)'}`,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'orders' && (
        <div className="space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  background: statusFilter === f.key ? 'rgba(99,102,241,.14)' : 'transparent',
                  color: statusFilter === f.key ? 'var(--sg-indigo)' : 'var(--sg-muted)',
                  border: `1px solid ${statusFilter === f.key ? 'var(--sg-indigo)' : 'var(--sg-border)'}`,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="sg-panel overflow-x-auto">
            <div className="px-4 pt-4 pb-2 text-sm" style={{ color: 'var(--sg-text)' }}>
              <span className="font-semibold">Order book</span>
              <span className="sg-text-faint"> — admin-created and investor-submitted orders across all lifecycle states.</span>
            </div>
            <table className="min-w-full text-sm">
              <thead className="sg-text-muted">
                <tr>
                  <th className="text-left p-3">Investor</th>
                  <th className="text-left p-3">Symbol</th>
                  <th className="text-left p-3">Side</th>
                  <th className="text-right p-3">Qty / Filled</th>
                  <th className="text-right p-3">Limit / Avg Fill</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Placed</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="border-t sg-row-border">
                    <td className="p-3 sg-text-main">{o.userEmail ?? o.userId}</td>
                    <td className="p-3 font-semibold sg-text-main">{o.symbol}</td>
                    <td className="p-3 uppercase" style={{ color: o.side === 'buy' ? 'var(--sg-teal)' : 'var(--sg-danger)' }}>{o.side}</td>
                    <td className="p-3 text-right sg-text-main">{o.quantity} / {o.filledQuantity}</td>
                    <td className="p-3 text-right sg-text-main">
                      {o.avgFillPrice != null ? fmt(o.avgFillPrice) : o.limitPrice != null ? fmt(o.limitPrice) : '—'}
                    </td>
                    <td className="p-3">
                      <span className="text-xs font-semibold capitalize" style={{ color: STATUS_COLOR[o.status] }}>
                        {o.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 sg-text-faint text-xs">{o.createdAt ? o.createdAt.toLocaleString() : '—'}</td>
                    <td className="p-3">
                      <OrderRowActions order={o} onDone={load} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && filteredOrders.length === 0 && <p className="p-8 text-center sg-text-muted">No orders match this filter.</p>}
            {loading && <p className="p-8 text-center sg-text-muted">Loading...</p>}
          </div>
        </div>
      )}

      {tab === 'execution' && (
        <div className="space-y-5">
          <AdminTradeEntryPanel onOrderPlaced={load} />
          <AdminExecutionQueue orders={orders} onDone={load} />
        </div>
      )}

      {tab === 'executed' && <AdminExecutedTrades />}
      {tab === 'statements' && <AdminStatements />}
      {tab === 'portfolio' && <AdminPortfolioStructure />}
    </div>
  );
}

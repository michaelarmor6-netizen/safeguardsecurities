import type { InvestorOrder } from '../../../../services/investor/orderService';
import OrderRowActions from './OrderRowActions';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

function QueueTable({ title, orders, onDone }: { title: string; orders: InvestorOrder[]; onDone: () => void }) {
  return (
    <div className="sg-panel overflow-x-auto">
      <div className="px-4 pt-4 pb-2 text-sm font-semibold flex items-center justify-between" style={{ color: 'var(--sg-text)' }}>
        {title}
        <span className="sg-text-faint font-normal text-xs">{orders.length} order{orders.length === 1 ? '' : 's'}</span>
      </div>
      <table className="min-w-full text-sm">
        <thead className="sg-text-muted">
          <tr>
            <th className="text-left p-3">Investor</th>
            <th className="text-left p-3">Symbol</th>
            <th className="text-left p-3">Side</th>
            <th className="text-right p-3">Qty / Filled</th>
            <th className="text-right p-3">Limit Price</th>
            <th className="text-left p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t sg-row-border">
              <td className="p-3 sg-text-main">{o.userEmail ?? o.userId}</td>
              <td className="p-3 font-semibold sg-text-main">{o.symbol}</td>
              <td className="p-3 uppercase" style={{ color: o.side === 'buy' ? 'var(--sg-teal)' : 'var(--sg-danger)' }}>{o.side}</td>
              <td className="p-3 text-right sg-text-main">{o.quantity} / {o.filledQuantity}</td>
              <td className="p-3 text-right sg-text-main">{o.limitPrice != null ? fmt(o.limitPrice) : '—'}</td>
              <td className="p-3">
                <OrderRowActions order={o} onDone={onDone} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 && <p className="p-6 text-center sg-text-muted text-sm">No orders in this queue.</p>}
    </div>
  );
}

export default function AdminExecutionQueue({ orders, onDone }: { orders: InvestorOrder[]; onDone: () => void }) {
  const pending = orders.filter((o) => o.status === 'pending');
  const working = orders.filter((o) => o.status === 'working' || o.status === 'partially_filled');

  return (
    <div className="space-y-5">
      <QueueTable title="Pending Approval" orders={pending} onDone={onDone} />
      <QueueTable title="Working / Partial" orders={working} onDone={onDone} />
    </div>
  );
}

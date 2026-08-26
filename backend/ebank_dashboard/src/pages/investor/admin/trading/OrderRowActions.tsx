import { useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, XCircle, Ban } from 'lucide-react';
import type { InvestorOrder } from '../../../../services/investor/orderService';
import { fillOrder, markOrderWorking, rejectOrder, cancelOrder } from '../../../../services/investor/tradingService';
import { useInvestorAuth } from '../../../../contexts/InvestorAuthContext';
import { logAction } from '../../../../services/investor/auditService';

const FINAL_STATUSES = new Set(['filled', 'cancelled', 'rejected', 'expired']);

// Fees/commission are deliberately not asked for here - they're set once,
// on the order, back in Trade Entry (or default to 0 for a self-submitted
// order) and fillOrder applies them automatically. Re-asking on every fill
// was redundant and, for a queued order filled later, was the only place
// they were ever captured at all.
function FillRow({ order, onDone }: { order: InvestorOrder; onDone: () => void }) {
  const { user: adminUser, profile: adminProfile } = useInvestorAuth();
  const [filling, setFilling] = useState(false);
  const remaining = order.quantity - order.filledQuantity;
  const [qty, setQty] = useState(String(remaining));
  const [price, setPrice] = useState(order.limitPrice != null ? String(order.limitPrice) : '');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const qtyNum = Number(qty);
    const priceNum = Number(price);
    if (!(qtyNum > 0) || !(priceNum > 0)) {
      toast.error('Enter a valid quantity and price');
      return;
    }
    setSubmitting(true);
    try {
      const result = await fillOrder({
        orderId: order.id,
        quantity: qtyNum,
        price: priceNum,
        clientStatus: 'active',
      });
      if (adminUser) {
        logAction(adminUser.uid, adminProfile?.email ?? '', 'Order filled', `${order.userEmail ?? order.userId}: ${order.symbol} ${result.tradeRef}`);
      }
      toast.success(`Filled — ${result.tradeRef}`);
      setFilling(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record fill', { duration: 6000 });
    } finally {
      setSubmitting(false);
    }
  };

  if (!filling) {
    return (
      <button type="button" className="sg-action-btn" onClick={() => setFilling(true)}>
        Fill
      </button>
    );
  }

  const field = (label: string, width: string, value: string, onChange: (v: string) => void) => (
    <div className={width}>
      <label className="block text-[9px] uppercase font-semibold mb-0.5" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.06em' }}>
        {label}
      </label>
      <input type="number" min="0" step="any" value={value} onChange={(e) => onChange(e.target.value)} className="sg-input py-1 px-2 text-xs w-full" />
    </div>
  );

  return (
    <div className="flex flex-wrap items-end gap-1.5">
      {field('Qty', 'w-20', qty, setQty)}
      {field('Price', 'w-24', price, setPrice)}
      <button type="button" className="sg-action-btn text-xs px-2 py-1" disabled={submitting} onClick={submit}>
        {submitting ? 'Filling...' : 'Confirm'}
      </button>
      <button type="button" className="sg-btn-ghost text-xs px-2 py-1" onClick={() => setFilling(false)}>Cancel</button>
    </div>
  );
}

// Every place an order/trade can be listed (the read-only Orders tab, the
// Pending/Working queues in Trade Entry & Queue) renders the same actions
// for the same status, from this one component - so "no way to act on a
// pending order" can't recur just because a new list view forgot to wire
// its own copy of these buttons.
export default function OrderRowActions({ order, onDone }: { order: InvestorOrder; onDone: () => void }) {
  const { user: adminUser, profile: adminProfile } = useInvestorAuth();

  if (FINAL_STATUSES.has(order.status)) {
    return <span className="text-xs sg-text-faint capitalize">{order.status}</span>;
  }

  const approve = async () => {
    try {
      await markOrderWorking(order.id);
      if (adminUser) logAction(adminUser.uid, adminProfile?.email ?? '', 'Order approved', `${order.userEmail ?? order.userId}: ${order.symbol}`);
      toast.success('Order approved');
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve order');
    }
  };

  const reject = async () => {
    const reason = window.prompt('Reason for rejecting this order:');
    if (!reason) return;
    try {
      await rejectOrder(order.id, reason);
      if (adminUser) logAction(adminUser.uid, adminProfile?.email ?? '', 'Order rejected', `${order.userEmail ?? order.userId}: ${order.symbol} — ${reason}`);
      toast.success('Order rejected');
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject order');
    }
  };

  const cancel = async () => {
    if (!window.confirm(`Cancel this order (${order.symbol})?`)) return;
    try {
      await cancelOrder(order.id);
      if (adminUser) logAction(adminUser.uid, adminProfile?.email ?? '', 'Order cancelled', `${order.userEmail ?? order.userId}: ${order.symbol}`);
      toast.success('Order cancelled');
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel order');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {order.status === 'pending' && (
        <button type="button" className="sg-action-btn flex items-center gap-1" onClick={approve}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
        </button>
      )}
      <FillRow order={order} onDone={onDone} />
      <button type="button" className="sg-danger-btn flex items-center gap-1 text-xs px-2 py-1" onClick={reject}>
        <XCircle className="h-3.5 w-3.5" /> Reject
      </button>
      <button type="button" className="sg-btn-ghost flex items-center gap-1 text-xs px-2 py-1" onClick={cancel}>
        <Ban className="h-3.5 w-3.5" /> Cancel
      </button>
    </div>
  );
}

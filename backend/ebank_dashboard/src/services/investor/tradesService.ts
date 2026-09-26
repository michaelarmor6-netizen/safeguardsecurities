import { collection, getDocs, orderBy, query, where, type DocumentData } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';
import { getAllOrders, getOrdersForUser, type InvestorOrder } from './orderService';

export interface Trade {
  id: string;
  tradeRef: string;
  orderId: string;
  userId: string;
  userEmail?: string;
  assetId?: string;
  subPortfolioId?: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  grossAmount: number;
  fees: number;
  commission: number;
  currency: string;
  executedAt?: Date;
  remarks: 'OPEN' | 'PARTIALLY_FILLED' | 'CLOSED' | 'ADJUSTED';
  clientStatus?: 'pending' | 'active' | 'inactive';
  optionType?: 'call' | 'put';
  strikePrice?: number;
  /** Underlying at entry, as typed on the desk ticket. Not the premium. */
  entryUnderlyingPrice?: number;
  expiryDate?: string;
  contractSize?: number;
  brokerExecutionId?: string;
}

// Same cash figure Trading Operations posts to the wallet: a buy debits
// trade value plus fee plus commission; a sell credits trade value minus both.
export function tradeCreditDebit(t: Pick<Trade, 'side' | 'grossAmount' | 'fees' | 'commission'>): number {
  return t.side === 'buy' ? -(t.grossAmount + t.fees + t.commission) : t.grossAmount - t.fees - t.commission;
}

function mapTrade(id: string, data: DocumentData): Trade {
  return {
    id,
    tradeRef: data.tradeRef ?? '',
    orderId: data.orderId ?? '',
    userId: data.userId ?? '',
    userEmail: data.userEmail,
    assetId: data.assetId ?? undefined,
    subPortfolioId: data.subPortfolioId ?? undefined,
    symbol: data.symbol ?? '',
    side: data.side ?? 'buy',
    quantity: Number(data.quantity ?? 0),
    price: Number(data.price ?? 0),
    grossAmount: Number(data.grossAmount ?? 0),
    fees: Number(data.fees ?? 0),
    commission: Number(data.commission ?? 0),
    currency: data.currency ?? 'USD',
    executedAt: data.executedAt?.toDate?.(),
    remarks: data.remarks ?? 'OPEN',
    clientStatus: data.clientStatus,
    optionType: data.optionType ?? undefined,
    strikePrice: data.strikePrice != null ? Number(data.strikePrice) : undefined,
    entryUnderlyingPrice: data.entryUnderlyingPrice != null ? Number(data.entryUnderlyingPrice) : undefined,
    expiryDate: data.expiryDate ?? undefined,
    contractSize: data.contractSize != null ? Number(data.contractSize) : undefined,
    brokerExecutionId: data.brokerExecutionId ?? undefined,
  };
}

// Older fills stored the contract terms on the order and the holding, not on
// the trade row. The client record should still show what the desk entered,
// so a blank trade field falls back to that order. A value already on the
// trade wins, including a strike or entry the desk corrected later.
function withDeskTerms(trade: Trade, order?: InvestorOrder): Trade {
  if (!order) return trade;
  return {
    ...trade,
    optionType: trade.optionType ?? order.optionType,
    strikePrice: trade.strikePrice ?? order.strikePrice,
    entryUnderlyingPrice: trade.entryUnderlyingPrice ?? order.entryUnderlyingPrice,
    expiryDate: trade.expiryDate ?? order.expiryDate,
  };
}

function applyDeskTerms(trades: Trade[], orders: InvestorOrder[]): Trade[] {
  const byId = new Map(orders.map((o) => [o.id, o]));
  return trades.map((t) => withDeskTerms(t, t.orderId ? byId.get(t.orderId) : undefined));
}

export async function getTradesForUser(userId: string): Promise<Trade[]> {
  const [snap, orders] = await Promise.all([
    getDocs(query(collection(db, LIVE_COLLECTIONS.trades), where('userId', '==', userId), orderBy('executedAt', 'desc'))),
    getOrdersForUser(userId).catch(() => [] as InvestorOrder[]),
  ]);
  return applyDeskTerms(snap.docs.map((d) => mapTrade(d.id, d.data())), orders);
}

export async function getTradesForOrder(orderId: string): Promise<Trade[]> {
  const snap = await getDocs(query(collection(db, LIVE_COLLECTIONS.trades), where('orderId', '==', orderId)));
  return snap.docs.map((d) => mapTrade(d.id, d.data()));
}

// Admin-only (firestore.rules restricts trades reads to owner-or-admin, so
// this only actually returns data when called by an admin session) - powers
// the Executed Trades ledger.
export async function getAllTrades(): Promise<Trade[]> {
  const [snap, orders] = await Promise.all([
    getDocs(query(collection(db, LIVE_COLLECTIONS.trades), orderBy('executedAt', 'desc'))),
    getAllOrders().catch(() => [] as InvestorOrder[]),
  ]);
  return applyDeskTerms(snap.docs.map((d) => mapTrade(d.id, d.data())), orders);
}

import { addDoc, collection, getDocs, orderBy, query, where, type DocumentData } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';

export type OrderStatus = 'pending' | 'working' | 'partially_filled' | 'filled' | 'cancelled' | 'rejected' | 'expired';

export interface InvestorOrder {
  id: string;
  userId: string;
  userEmail?: string;
  assetId?: string;
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
  timeInForce: 'day' | 'gtc' | 'ioc' | 'fok';
  quantity: number;
  limitPrice?: number;
  stopPrice?: number;
  /** @deprecated use limitPrice (intent) or avgFillPrice (actual) - kept for older callers that only read a single "price" */
  price?: number;
  status: OrderStatus;
  filledQuantity: number;
  avgFillPrice?: number;
  clientStatus?: 'pending' | 'active' | 'inactive';
  rejectionReason?: string;
  optionType?: 'call' | 'put';
  strikePrice?: number;
  expiryDate?: string;
  contractSize?: number;
  /** Underlying price the desk recorded on the day the contract was entered. */
  entryUnderlyingPrice?: number;
  deliveryType?: 'cash_settled' | 'physical';
  fees?: number;
  commission?: number;
  subPortfolioId?: string;
  createdAt?: Date;
  filledAt?: Date;
  cancelledAt?: Date;
}

function mapOrder(id: string, data: DocumentData): InvestorOrder {
  const limitPrice = data.limitPrice != null ? Number(data.limitPrice) : undefined;
  const avgFillPrice = data.avgFillPrice != null ? Number(data.avgFillPrice) : undefined;
  return {
    id,
    userId: data.userId ?? '',
    userEmail: data.userEmail,
    assetId: data.assetId ?? undefined,
    symbol: data.symbol ?? '',
    side: data.side ?? 'buy',
    orderType: data.orderType ?? 'market',
    timeInForce: data.timeInForce ?? 'day',
    quantity: Number(data.quantity ?? 0),
    limitPrice,
    stopPrice: data.stopPrice != null ? Number(data.stopPrice) : undefined,
    price: avgFillPrice ?? limitPrice ?? (data.price != null ? Number(data.price) : undefined),
    status: data.status ?? 'pending',
    filledQuantity: Number(data.filledQuantity ?? 0),
    avgFillPrice,
    clientStatus: data.clientStatus,
    rejectionReason: data.rejectionReason,
    optionType: data.optionType ?? undefined,
    strikePrice: data.strikePrice != null ? Number(data.strikePrice) : undefined,
    expiryDate: data.expiryDate ?? undefined,
    contractSize: data.contractSize != null ? Number(data.contractSize) : undefined,
    entryUnderlyingPrice: data.entryUnderlyingPrice != null ? Number(data.entryUnderlyingPrice) : undefined,
    deliveryType: data.deliveryType ?? undefined,
    fees: data.fees != null ? Number(data.fees) : undefined,
    commission: data.commission != null ? Number(data.commission) : undefined,
    subPortfolioId: data.subPortfolioId ?? undefined,
    createdAt: data.createdAt?.toDate?.(),
    filledAt: data.filledAt?.toDate?.(),
    cancelledAt: data.cancelledAt?.toDate?.(),
  };
}

export async function getAllOrders(): Promise<InvestorOrder[]> {
  const snap = await getDocs(query(collection(db, LIVE_COLLECTIONS.orders), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => mapOrder(d.id, d.data()));
}

export async function getPendingOrders() {
  return (await getAllOrders()).filter((o) => o.status === 'pending');
}

export async function getOrdersForUser(userId: string): Promise<InvestorOrder[]> {
  const snap = await getDocs(
    query(collection(db, LIVE_COLLECTIONS.orders), where('userId', '==', userId), orderBy('createdAt', 'desc')),
  );
  return snap.docs.map((d) => mapOrder(d.id, d.data()));
}

// Self-service order submission (Trade Desk quick order, AI Engine "place
// order", Trade History page). Client-created orders always start pending
// and are reviewed/filled by staff through the Trading Operations admin
// workspace (see tradingService.ts), which is what actually creates trades,
// positions, and cash movement - this function only ever writes the order
// stub. Best-effort resolves assetId from the Asset Management catalog so
// the order can flow through the same fill engine as admin-placed ones;
// falls back to a bare symbol if the ticker isn't in the catalog.
export async function createOrder(
  userId: string,
  userEmail: string,
  symbol: string,
  side: 'buy' | 'sell',
  quantity: number,
) {
  const upperSymbol = symbol.toUpperCase();
  let assetId: string | null = null;
  try {
    const assetSnap = await getDocs(
      query(collection(db, LIVE_COLLECTIONS.assets), where('symbol', '==', upperSymbol)),
    );
    if (!assetSnap.empty) assetId = assetSnap.docs[0].id;
  } catch {
    // Catalog lookup is best-effort - a freeform symbol with no catalog
    // match is still a valid self-submitted order.
  }

  return addDoc(collection(db, LIVE_COLLECTIONS.orders), {
    userId,
    userEmail,
    assetId,
    symbol: upperSymbol,
    side,
    orderType: 'market',
    timeInForce: 'day',
    quantity,
    status: 'pending',
    filledQuantity: 0,
    clientStatus: 'pending',
    createdAt: new Date(),
  });
}

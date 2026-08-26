import { collection, getDocs, orderBy, query, where, type DocumentData } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';

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
  expiryDate?: string;
  contractSize?: number;
  brokerExecutionId?: string;
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
    expiryDate: data.expiryDate ?? undefined,
    contractSize: data.contractSize != null ? Number(data.contractSize) : undefined,
    brokerExecutionId: data.brokerExecutionId ?? undefined,
  };
}

export async function getTradesForUser(userId: string): Promise<Trade[]> {
  const snap = await getDocs(
    query(collection(db, LIVE_COLLECTIONS.trades), where('userId', '==', userId), orderBy('executedAt', 'desc')),
  );
  return snap.docs.map((d) => mapTrade(d.id, d.data()));
}

export async function getTradesForOrder(orderId: string): Promise<Trade[]> {
  const snap = await getDocs(query(collection(db, LIVE_COLLECTIONS.trades), where('orderId', '==', orderId)));
  return snap.docs.map((d) => mapTrade(d.id, d.data()));
}

// Admin-only (firestore.rules restricts trades reads to owner-or-admin, so
// this only actually returns data when called by an admin session) - powers
// the Executed Trades ledger.
export async function getAllTrades(): Promise<Trade[]> {
  const snap = await getDocs(query(collection(db, LIVE_COLLECTIONS.trades), orderBy('executedAt', 'desc')));
  return snap.docs.map((d) => mapTrade(d.id, d.data()));
}

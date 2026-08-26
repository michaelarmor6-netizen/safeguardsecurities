import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';

export interface PlaceOrderPayload {
  userId: string;
  userEmail?: string;
  assetId: string;
  side: 'buy' | 'sell';
  orderType?: 'market' | 'limit' | 'stop' | 'stop_limit';
  timeInForce?: 'day' | 'gtc' | 'ioc' | 'fok';
  quantity: number;
  limitPrice: number;
  stopPrice?: number;
  clientOrderId?: string;
  clientStatus?: 'pending' | 'active' | 'inactive';
  optionType?: 'call' | 'put';
  strikePrice?: number;
  expiryDate?: string;
  contractSize?: number;
  /** Underlying price at entry — P/L reference for limited-risk options. */
  entryUnderlyingPrice?: number;
  deliveryType?: 'cash_settled' | 'physical';
  fees?: number;
  commission?: number;
  subPortfolioId?: string;
  symbolOverride?: string;
}

export interface FillOrderPayload {
  orderId: string;
  quantity: number;
  price: number;
  fees?: number;
  commission?: number;
  optionType?: 'call' | 'put';
  strikePrice?: number;
  expiryDate?: string;
  contractSize?: number;
  /** Underlying price at entry — P/L reference for limited-risk options. */
  entryUnderlyingPrice?: number;
  deliveryType?: 'cash_settled' | 'physical';
  clientStatus?: 'pending' | 'active' | 'inactive';
  brokerExecutionId?: string;
}

export interface FillOrderResult {
  tradeId: string;
  tradeRef: string;
  status: string;
  filledQuantity: number;
  remainingQuantity: number;
}

export interface UpdateTradeContractPayload {
  tradeId: string;
  optionType?: 'call' | 'put' | null;
  strikePrice?: number | null;
  expiryDate?: string | null;
  contractSize?: number | null;
  entryUnderlyingPrice?: number | null;
  clientStatus?: 'pending' | 'active' | 'inactive';
}

export interface StatementRow {
  tradeRef: string;
  status: 'O' | 'C' | 'E';
  executedAt: string | null;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  grossAmount: number;
  fees: number;
  commission: number;
  creditDebit: number;
  remarks: string;
}

export interface StatementResult {
  statementRef: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  rows: StatementRow[];
  summary: { clearedAmount: number; closingBalance: number | null; tradeCount: number };
}

const placeOrderOnBehalfFn = httpsCallable<PlaceOrderPayload, { orderId: string }>(functions, 'placeOrderOnBehalf');
const fillOrderFn = httpsCallable<FillOrderPayload, FillOrderResult>(functions, 'fillOrder');
const markOrderWorkingFn = httpsCallable<{ orderId: string }, { ok: true }>(functions, 'markOrderWorking');
const rejectOrderFn = httpsCallable<{ orderId: string; reason: string }, { ok: true }>(functions, 'rejectOrder');
const cancelOrderFn = httpsCallable<{ orderId: string }, { ok: true }>(functions, 'cancelOrder');
const updateTradeContractFn = httpsCallable<UpdateTradeContractPayload, { ok: true }>(functions, 'updateTradeContract');
const generateAccountStatementFn = httpsCallable<{ userId: string; startDate: string; endDate: string }, StatementResult>(
  functions,
  'generateAccountStatement',
);

export async function placeOrderOnBehalf(payload: PlaceOrderPayload) {
  const res = await placeOrderOnBehalfFn(payload);
  return res.data;
}

export async function fillOrder(payload: FillOrderPayload) {
  const res = await fillOrderFn(payload);
  return res.data;
}

export async function markOrderWorking(orderId: string) {
  await markOrderWorkingFn({ orderId });
}

export async function rejectOrder(orderId: string, reason: string) {
  await rejectOrderFn({ orderId, reason });
}

export async function cancelOrder(orderId: string) {
  await cancelOrderFn({ orderId });
}

export async function updateTradeContract(payload: UpdateTradeContractPayload) {
  await updateTradeContractFn(payload);
}

export async function generateAccountStatement(userId: string, startDate: string, endDate: string) {
  const res = await generateAccountStatementFn({ userId, startDate, endDate });
  return res.data;
}

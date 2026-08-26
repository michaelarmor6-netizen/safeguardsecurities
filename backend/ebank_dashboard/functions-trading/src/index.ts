import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  requireAuth,
  requireInvestorAdmin,
  computeWeightedAverage,
  computePositionUpdate,
  orderStatusToOcean,
  isWithinTradeCorrectionWindow,
} from './lib';
import { valueOptionPosition } from './optionValuation';

initializeApp();

const ORDERS = 'adminOrders';
const TRADES = 'trades';
const HOLDINGS = 'portfolioHoldings';
const WALLETS = 'wallets';
const CASH_LEDGER = 'cashLedger';
const ASSETS = 'assets';

const FINAL_STATUSES = new Set(['filled', 'cancelled', 'rejected', 'expired']);

interface PlaceOrderPayload {
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
  /** Underlying price at entry - drives P/L for limited-risk options. */
  entryUnderlyingPrice?: number;
  deliveryType?: 'cash_settled' | 'physical';
  subPortfolioId?: string;
  // Captured at order time so a "queue now, fill later" order doesn't lose
  // the admin's fee/commission intent - fillOrder falls back to these when
  // the fill payload doesn't override them, so the Execution Queue's fill
  // form never has to ask for them again.
  fees?: number;
  commission?: number;
  // Lets the client record a trade against a specific futures contract month
  // (e.g. "GCZ26") without that month needing its own catalog doc - assetId
  // still points at the root instrument (e.g. Gold/GC) for tradability
  // checks and analytics; this only overrides the display/ledger symbol.
  symbolOverride?: string;
}

// Admin trade entry - Step 1 of the two-step execution flow (place, then
// fill). Writes only the order row: no trade, no position, no cash movement
// yet. "Execute immediately" in the admin UI calls this and fillOrder back
// to back.
export const placeOrderOnBehalf = onCall(async (request) => {
  const adminUid = await requireInvestorAdmin(request);
  const data = (request.data ?? {}) as PlaceOrderPayload;

  const userId = String(data.userId ?? '');
  const assetId = String(data.assetId ?? '');
  const side = data.side;
  const quantity = Number(data.quantity ?? 0);
  const limitPrice = Number(data.limitPrice ?? 0);

  if (!userId) throw new HttpsError('invalid-argument', 'userId is required');
  if (!assetId) throw new HttpsError('invalid-argument', 'assetId is required');
  if (side !== 'buy' && side !== 'sell') throw new HttpsError('invalid-argument', 'side must be buy or sell');
  if (!(quantity > 0)) throw new HttpsError('invalid-argument', 'quantity must be greater than 0');
  if (!(limitPrice > 0)) throw new HttpsError('invalid-argument', 'limitPrice must be greater than 0');

  // Options are not a separate catalog entry - any tradable underlying can
  // be traded as an options contract on it by supplying contract terms.
  // Mirrors the source platform's "option profile" required-field set
  // without needing a synthetic per-strike instrument in the catalog.
  const isOption = Boolean(data.optionType);
  if (isOption && (!data.strikePrice || !data.expiryDate)) {
    throw new HttpsError('invalid-argument', 'Option contracts require optionType, strikePrice, and expiryDate');
  }

  const db = getFirestore();
  const assetSnap = await db.collection(ASSETS).doc(assetId).get();
  if (!assetSnap.exists) throw new HttpsError('not-found', `Asset ${assetId} not found`);
  const asset = assetSnap.data()!;
  if (!asset.isTradable) throw new HttpsError('failed-precondition', `${asset.symbol} is not currently tradable`);

  let subPortfolioId: string | null = null;
  if (data.subPortfolioId) {
    const sleeveSnap = await db.collection('subPortfolios').doc(data.subPortfolioId).get();
    if (!sleeveSnap.exists || sleeveSnap.data()?.userId !== userId) {
      throw new HttpsError('invalid-argument', 'subPortfolioId does not belong to this investor');
    }
    subPortfolioId = data.subPortfolioId;
  }

  const symbol = data.symbolOverride ? data.symbolOverride.trim().toUpperCase() : asset.symbol;

  const now = FieldValue.serverTimestamp();
  const orderRef = await db.collection(ORDERS).add({
    userId,
    userEmail: data.userEmail ?? '',
    assetId,
    symbol,
    side,
    orderType: data.orderType ?? 'limit',
    timeInForce: data.timeInForce ?? 'day',
    quantity,
    limitPrice,
    stopPrice: data.stopPrice ?? null,
    status: 'pending',
    filledQuantity: 0,
    avgFillPrice: null,
    placedBy: adminUid,
    clientOrderId: data.clientOrderId ?? null,
    clientStatus: data.clientStatus ?? 'pending',
    rejectionReason: null,
    optionType: data.optionType ?? null,
    strikePrice: data.strikePrice ?? null,
    expiryDate: data.expiryDate ?? null,
    contractSize: data.contractSize ?? null,
    entryUnderlyingPrice: data.entryUnderlyingPrice ?? null,
    deliveryType: data.deliveryType ?? null,
    fees: data.fees ?? 0,
    commission: data.commission ?? 0,
    subPortfolioId,
    createdAt: now,
    placedAt: now,
    filledAt: null,
    cancelledAt: null,
  });

  return { orderId: orderRef.id };
});

interface FillOrderPayload {
  orderId: string;
  quantity: number;
  price: number;
  fees?: number;
  commission?: number;
  optionType?: 'call' | 'put';
  strikePrice?: number;
  expiryDate?: string;
  contractSize?: number;
  /** Underlying price at entry - drives P/L for limited-risk options. */
  entryUnderlyingPrice?: number;
  deliveryType?: 'cash_settled' | 'physical';
  clientStatus?: 'pending' | 'active' | 'inactive';
  brokerExecutionId?: string;
}

// Step 2: records one fill against an order. Supports partial fills - call
// this multiple times against the same order until fully filled. Every
// downstream client-visible surface (Positions, Trade History, Statement)
// is a read of what this function writes; there is no separate sync step.
export const fillOrder = onCall(async (request) => {
  const adminUid = await requireInvestorAdmin(request);
  const data = (request.data ?? {}) as FillOrderPayload;

  const orderId = String(data.orderId ?? '');
  const fillQty = Number(data.quantity ?? 0);
  const fillPrice = Number(data.price ?? 0);

  if (!orderId) throw new HttpsError('invalid-argument', 'orderId is required');
  if (!(fillQty > 0)) throw new HttpsError('invalid-argument', 'quantity must be greater than 0');
  if (!(fillPrice > 0)) throw new HttpsError('invalid-argument', 'price must be greater than 0');

  const db = getFirestore();
  const orderRef = db.collection(ORDERS).doc(orderId);

  const result = await db.runTransaction(async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists) throw new HttpsError('not-found', 'Order not found');
    const order = orderSnap.data()!;

    if (FINAL_STATUSES.has(order.status)) {
      throw new HttpsError('failed-precondition', `Order is already ${order.status} and cannot accept new fills`);
    }

    // Cross-check the order's cached filledQuantity against actual trades,
    // in case a previous fill's order-update ever failed to land.
    const priorTradesSnap = await tx.get(db.collection(TRADES).where('orderId', '==', orderId));
    const tradedQty = priorTradesSnap.docs.reduce((sum, d) => sum + Number(d.data().quantity ?? 0), 0);
    const effectiveFilled = Math.max(Number(order.filledQuantity ?? 0), tradedQty);
    const remaining = order.quantity - effectiveFilled;

    if (remaining <= 1e-8) {
      throw new HttpsError('failed-precondition', 'Order already has a complete fill - use updateTradeContract to correct metadata');
    }
    if (fillQty > remaining + 1e-8) {
      throw new HttpsError('invalid-argument', `Fill quantity exceeds remaining amount (${remaining})`);
    }

    const contractSize = data.contractSize ?? order.contractSize ?? null;
    // Gross value is always quantity x price - no contract-size multiplier.
    // A prior version multiplied by contractSize (e.g. 100 for options),
    // which silently inflated trade value by 100x; contractSize is now
    // metadata-only (stored on the trade for reference) and never enters
    // the cash/gross math.
    const gross = fillQty * fillPrice;
    // Falls back to whatever fees/commission the admin set when the order
    // was placed, so a queued order filled later from the Execution Queue
    // doesn't need them re-entered.
    const fees = Number(data.fees ?? order.fees ?? 0);
    const commission = Number(data.commission ?? order.commission ?? 0);
    const totalCosts = fees + commission;

    const walletSnap = await tx.get(db.collection(WALLETS).where('userId', '==', order.userId));
    const walletDoc = walletSnap.docs[0];
    if (!walletDoc) throw new HttpsError('failed-precondition', 'This investor has no wallet on file');
    const walletBalance = Number(walletDoc.data().balance ?? 0);

    const signedCash = order.side === 'buy' ? -(gross + totalCosts) : gross - totalCosts;
    const newCash = walletBalance + signedCash;
    if (order.side === 'buy' && newCash < -1e-6) {
      throw new HttpsError('failed-precondition', 'Insufficient brokerage cash for this fill');
    }

    const holdingKey = order.assetId || order.symbol;
    const holdingRef = db.collection(HOLDINGS).doc(`${order.userId}_${holdingKey}`);
    const holdingSnap = await tx.get(holdingRef);
    const oldQty = holdingSnap.exists ? Number(holdingSnap.data()!.quantity ?? 0) : 0;
    const oldAvgCost = holdingSnap.exists ? Number(holdingSnap.data()!.avgCost ?? 0) : 0;
    const oldRealizedPnl = holdingSnap.exists ? Number(holdingSnap.data()!.realizedPnl ?? 0) : 0;

    const { newQty, newAvgCost, realizedPnlDelta } = computePositionUpdate(oldQty, oldAvgCost, order.side, fillQty, fillPrice);

    // Portfolio Structure sync: a fill tagged with a sleeve (subPortfolioId,
    // set at order placement) mirrors into that sleeve's own holding row.
    // The sleeve holding is its own independent sub-ledger scoped to
    // (subPortfolioId, symbol) - not a mirror of the account-wide position -
    // so it gets the same cost-basis math applied to its own prior state.
    let sleeveHoldingRef: FirebaseFirestore.DocumentReference | null = null;
    let sleeveUpdate: ReturnType<typeof computePositionUpdate> | null = null;
    if (order.subPortfolioId) {
      sleeveHoldingRef = db.collection('subPortfolioHoldings').doc(`${order.subPortfolioId}_${order.symbol}`);
      const sleeveSnap = await tx.get(sleeveHoldingRef);
      const sleeveOldQty = sleeveSnap.exists ? Number(sleeveSnap.data()!.quantity ?? 0) : 0;
      const sleeveOldAvgCost = sleeveSnap.exists ? Number(sleeveSnap.data()!.avgCost ?? 0) : 0;
      sleeveUpdate = computePositionUpdate(sleeveOldQty, sleeveOldAvgCost, order.side, fillQty, fillPrice);
    }

    const newFilledQty = effectiveFilled + fillQty;
    const newAvgFillPrice = computeWeightedAverage(effectiveFilled, order.avgFillPrice, fillQty, fillPrice);
    const fullyFilled = newFilledQty >= order.quantity - 1e-8;
    const nextStatus = fullyFilled ? 'filled' : 'partially_filled';

    const remarks = Math.abs(newQty) < 1e-8 ? 'CLOSED' : !fullyFilled ? 'PARTIALLY_FILLED' : 'OPEN';

    // Sequential, human-readable trade reference. Firestore has no native
    // sequence, so a transaction-guarded counter document stands in for the
    // DB trigger/sequence the source platform uses - this transaction makes
    // the increment race-safe under concurrent admin fills.
    const counterRef = db.collection('counters').doc('tradeRef');
    const counterSnap = await tx.get(counterRef);
    const year = new Date().getUTCFullYear();
    const counterData = counterSnap.exists ? counterSnap.data()! : { year, seq: 0 };
    const seq = counterData.year === year ? counterData.seq + 1 : 1;
    const tradeRef = `SG-TRD-${year}-${String(seq).padStart(6, '0')}`;

    const now = FieldValue.serverTimestamp();
    const tradeDocRef = db.collection(TRADES).doc();

    tx.set(counterRef, { year, seq });
    tx.set(tradeDocRef, {
      tradeRef,
      orderId,
      userId: order.userId,
      userEmail: order.userEmail ?? '',
      assetId: order.assetId ?? null,
      subPortfolioId: order.subPortfolioId ?? null,
      symbol: order.symbol,
      side: order.side,
      quantity: fillQty,
      price: fillPrice,
      grossAmount: gross,
      fees,
      commission,
      currency: 'USD',
      executedAt: now,
      remarks,
      clientStatus: data.clientStatus ?? order.clientStatus ?? 'active',
      optionType: data.optionType ?? order.optionType ?? null,
      strikePrice: data.strikePrice ?? order.strikePrice ?? null,
      expiryDate: data.expiryDate ?? order.expiryDate ?? null,
      contractSize: contractSize,
      deliveryType: data.deliveryType ?? order.deliveryType ?? null,
      brokerExecutionId: data.brokerExecutionId ?? null,
      recordedBy: adminUid,
    });
    tx.update(orderRef, {
      status: nextStatus,
      filledQuantity: newFilledQty,
      avgFillPrice: newAvgFillPrice,
      filledAt: fullyFilled ? now : null,
      rejectionReason: null,
      updatedAt: now,
    });
    tx.set(
      holdingRef,
      {
        userId: order.userId,
        assetId: order.assetId ?? null,
        symbol: order.symbol,
        quantity: newQty,
        avgCost: newAvgCost,

        // Limited-risk options need TWO prices: avgCost is the premium paid,
        // entryUnderlyingPrice is what P/L is measured against. Without both
        // (and the multiplier) a position cannot be valued at all.
        entryUnderlyingPrice:
          data.entryUnderlyingPrice ?? order.entryUnderlyingPrice ?? null,
        multiplier: contractSize ?? null,
        optionType: data.optionType ?? order.optionType ?? null,
        expiryDate: data.expiryDate ?? order.expiryDate ?? null,

        realizedPnl: oldRealizedPnl + realizedPnlDelta,
        currency: 'USD',
        openedAt: holdingSnap.exists ? holdingSnap.data()!.openedAt ?? now : now,
        lastTradeAt: now,
        updatedAt: now,
      },
      { merge: true },
    );
    if (sleeveHoldingRef && sleeveUpdate) {
      if (Math.abs(sleeveUpdate.newQty) < 1e-8) {
        tx.delete(sleeveHoldingRef);
      } else {
        tx.set(
          sleeveHoldingRef,
          {
            subPortfolioId: order.subPortfolioId,
            userId: order.userId,
            symbol: order.symbol,
            quantity: sleeveUpdate.newQty,
            avgCost: sleeveUpdate.newAvgCost,
            markPrice: fillPrice,
            unitLabel: 'shares',
            currency: 'USD',
            updatedAt: now,
          },
          { merge: true },
        );
      }
    }
    tx.update(walletDoc.ref, { balance: newCash, updatedAt: now });
    tx.set(db.collection(CASH_LEDGER).doc(), {
      userId: order.userId,
      currency: 'USD',
      entryType: order.side === 'buy' ? 'trade_buy' : 'trade_sell',
      amount: signedCash,
      balanceAfter: newCash,
      referenceType: 'trade',
      referenceId: tradeDocRef.id,
      description: `${order.side.toUpperCase()} ${fillQty} ${order.symbol} @ ${fillPrice}`,
      postedBy: adminUid,
      postedAt: now,
    });

    return {
      tradeId: tradeDocRef.id,
      tradeRef,
      status: nextStatus,
      filledQuantity: newFilledQty,
      remainingQuantity: order.quantity - newFilledQty,
    };
  });

  return result;
});

export const markOrderWorking = onCall(async (request) => {
  await requireInvestorAdmin(request);
  const orderId = String((request.data as { orderId?: string } | undefined)?.orderId ?? '');
  if (!orderId) throw new HttpsError('invalid-argument', 'orderId is required');

  const db = getFirestore();
  const ref = db.collection(ORDERS).doc(orderId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Order not found');
  if (snap.data()!.status !== 'pending') throw new HttpsError('failed-precondition', 'Only pending orders can be marked working');

  await ref.update({ status: 'working', updatedAt: FieldValue.serverTimestamp() });
  return { ok: true };
});

export const rejectOrder = onCall(async (request) => {
  await requireInvestorAdmin(request);
  const data = (request.data ?? {}) as { orderId?: string; reason?: string };
  const orderId = String(data.orderId ?? '');
  const reason = String(data.reason ?? '').trim();
  if (!orderId) throw new HttpsError('invalid-argument', 'orderId is required');
  if (!reason) throw new HttpsError('invalid-argument', 'A rejection reason is required');

  const db = getFirestore();
  const ref = db.collection(ORDERS).doc(orderId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Order not found');
  if (FINAL_STATUSES.has(snap.data()!.status)) throw new HttpsError('failed-precondition', 'Order is already in a final status');

  await ref.update({ status: 'rejected', rejectionReason: reason, updatedAt: FieldValue.serverTimestamp() });
  return { ok: true };
});

export const cancelOrder = onCall(async (request) => {
  await requireInvestorAdmin(request);
  const orderId = String((request.data as { orderId?: string } | undefined)?.orderId ?? '');
  if (!orderId) throw new HttpsError('invalid-argument', 'orderId is required');

  const db = getFirestore();
  const ref = db.collection(ORDERS).doc(orderId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Order not found');
  if (FINAL_STATUSES.has(snap.data()!.status)) throw new HttpsError('failed-precondition', 'Order is already in a final status');

  await ref.update({ status: 'cancelled', cancelledAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  return { ok: true };
});

interface UpdateTradeContractPayload {
  tradeId: string;
  optionType?: 'call' | 'put' | null;
  strikePrice?: number | null;
  expiryDate?: string | null;
  contractSize?: number | null;
  clientStatus?: 'pending' | 'active' | 'inactive';
}

// Post-fill correction - metadata only. Quantity, price, gross, fees, and
// commission are never accepted here (not just hidden in the UI - this
// function's payload type doesn't carry them), matching the source
// platform's "a filled trade's economics are permanent" rule.
export const updateTradeContract = onCall(async (request) => {
  const adminUid = await requireInvestorAdmin(request);
  const data = (request.data ?? {}) as UpdateTradeContractPayload;
  const tradeId = String(data.tradeId ?? '');
  if (!tradeId) throw new HttpsError('invalid-argument', 'tradeId is required');

  const db = getFirestore();
  const ref = db.collection(TRADES).doc(tradeId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', 'Trade not found');
  const trade = snap.data()!;
  const executedAt = (trade.executedAt as Timestamp | undefined)?.toDate?.() ?? new Date(0);
  if (!isWithinTradeCorrectionWindow(executedAt)) {
    throw new HttpsError('failed-precondition', 'This trade is outside its correction window');
  }

  const patch: Record<string, unknown> = { remarks: 'ADJUSTED', updatedAt: FieldValue.serverTimestamp(), correctedBy: adminUid };
  if (data.optionType !== undefined) patch.optionType = data.optionType;
  if (data.strikePrice !== undefined) patch.strikePrice = data.strikePrice;
  if (data.expiryDate !== undefined) patch.expiryDate = data.expiryDate;
  if (data.contractSize !== undefined) patch.contractSize = data.contractSize;
  if (data.clientStatus !== undefined) patch.clientStatus = data.clientStatus;

  await ref.update(patch);

  // Mirror the correction back onto the parent order's contract fields.
  const orderPatch: Record<string, unknown> = {};
  if (data.optionType !== undefined) orderPatch.optionType = data.optionType;
  if (data.strikePrice !== undefined) orderPatch.strikePrice = data.strikePrice;
  if (data.expiryDate !== undefined) orderPatch.expiryDate = data.expiryDate;
  if (data.contractSize !== undefined) orderPatch.contractSize = data.contractSize;
  if (Object.keys(orderPatch).length > 0) {
    await db.collection(ORDERS).doc(String(trade.orderId)).update(orderPatch);
  }

  return { ok: true };
});

interface StatementPayload {
  userId: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
}

// Live, read-time statement - nothing is persisted as a "statement"
// document, matching the source platform exactly (no PDF, no archive).
export const generateAccountStatement = onCall(async (request) => {
  const requesterUid = requireAuth(request);
  const data = (request.data ?? {}) as StatementPayload;
  const userId = String(data.userId ?? requesterUid);

  if (userId !== requesterUid) {
    await requireInvestorAdmin(request);
  }

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new HttpsError('invalid-argument', 'startDate/endDate must be valid ISO dates');
  }

  const db = getFirestore();
  const startTs = Timestamp.fromDate(start);
  const endTs = Timestamp.fromDate(end);

  const [tradesSnap, ledgerSnap] = await Promise.all([
    db
      .collection(TRADES)
      .where('userId', '==', userId)
      .where('executedAt', '>=', startTs)
      .where('executedAt', '<', endTs)
      .get(),
    db.collection(CASH_LEDGER).where('userId', '==', userId).where('postedAt', '<', endTs).get(),
  ]);

  const orderIds = Array.from(new Set(tradesSnap.docs.map((d) => String(d.data().orderId))));
  const orderStatusById = new Map<string, string>();
  await Promise.all(
    orderIds.map(async (id) => {
      const snap = await db.collection(ORDERS).doc(id).get();
      if (snap.exists) orderStatusById.set(id, String(snap.data()!.status));
    }),
  );

  const rows = tradesSnap.docs
    .map((d) => {
      const t = d.data();
      const orderStatus = orderStatusById.get(String(t.orderId)) ?? 'filled';
      const gross = Number(t.grossAmount ?? 0);
      const fees = Number(t.fees ?? 0);
      const commission = Number(t.commission ?? 0);
      const creditDebit = t.side === 'buy' ? -(gross + fees + commission) : gross - fees - commission;
      return {
        tradeRef: t.tradeRef,
        status: orderStatusToOcean(orderStatus),
        executedAt: (t.executedAt as Timestamp | undefined)?.toDate?.()?.toISOString() ?? null,
        symbol: t.symbol,
        side: t.side,
        quantity: t.quantity,
        price: t.price,
        grossAmount: gross,
        fees,
        commission,
        creditDebit,
        remarks: t.remarks,
      };
    })
    .sort((a, b) => (a.executedAt ?? '').localeCompare(b.executedAt ?? ''));

  const inPeriodLedger = ledgerSnap.docs
    .map((d) => d.data())
    .filter((e) => {
      const postedAt = (e.postedAt as Timestamp | undefined)?.toDate?.();
      return postedAt && postedAt >= start && postedAt < end;
    });
  const clearedAmount = inPeriodLedger
    .filter((e) => e.entryType === 'deposit' || e.entryType === 'withdrawal')
    .reduce((sum, e) => sum + Number(e.amount ?? 0), 0);

  const closingLedger = ledgerSnap.docs
    .map((d) => d.data())
    .filter((e) => {
      const postedAt = (e.postedAt as Timestamp | undefined)?.toDate?.();
      return postedAt && postedAt < end;
    })
    .sort((a, b) => {
      const at = (a.postedAt as Timestamp)?.toDate?.()?.getTime() ?? 0;
      const bt = (b.postedAt as Timestamp)?.toDate?.()?.getTime() ?? 0;
      return bt - at;
    });
  const closingBalance = closingLedger[0] ? Number(closingLedger[0].balanceAfter ?? 0) : null;

  const yyyymm = `${start.getUTCFullYear()}${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
  const statementRef = `SG-STMT-${yyyymm}-${userId.slice(-6).toUpperCase()}`;

  return {
    statementRef,
    userId,
    periodStart: data.startDate,
    periodEnd: data.endDate,
    rows,
    summary: { clearedAmount, closingBalance, tradeCount: rows.length },
  };
});

async function snapshotAllPortfolios(): Promise<{ snapshotted: number }> {
  const db = getFirestore();
  const [walletsSnap, assetsSnap] = await Promise.all([db.collection(WALLETS).get(), db.collection(ASSETS).get()]);

  // Valuation uses the quote already cached on each asset doc (kept fresh
  // every 5 minutes by refreshAssetQuotes in functions-market) rather than
  // calling Finnhub directly - this function needs no secrets of its own.
  const priceByAssetId = new Map<string, number>();
  const priceBySymbol = new Map<string, number>();
  // Which underlying each instrument is marked against (e.g. GCZ27 -> C:XAUUSD).
  const underlyingByAssetId = new Map<string, string>();
  const underlyingBySymbol = new Map<string, string>();
  for (const a of assetsSnap.docs) {
    const data = a.data();
    const price = data.quote?.price;
    if (typeof price === 'number' && price > 0) {
      priceByAssetId.set(a.id, price);
      priceBySymbol.set(String(data.symbol), price);
    }
    const underlying = data.underlyingPriceSymbol;
    if (typeof underlying === 'string' && underlying.trim()) {
      const key = underlying.trim().toUpperCase();
      underlyingByAssetId.set(a.id, key);
      underlyingBySymbol.set(String(data.symbol), key);
    }
  }

  // Daily reference prices for underlyings, written by
  // refreshUnderlyingPricesDaily in functions-market.
  const underlyingPrice = new Map<string, number>();
  const marketPricesSnap = await db.collection('marketPrices').get();
  for (const doc of marketPricesSnap.docs) {
    const data = doc.data();
    const price = Number(data.price ?? 0);
    const ticker = String(data.ticker ?? '').trim().toUpperCase();
    if (ticker && Number.isFinite(price) && price > 0) underlyingPrice.set(ticker, price);
  }

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  let count = 0;
  // Derivatives that should be valued via the payoff but fall back to cost
  // (no daily mark in marketPrices, or a position missing entryUnderlyingPrice
  // / multiplier). Silent today; counted so a lapsed data subscription or a
  // bad position shows up in the logs instead of as an unexplained flat chart.
  let derivativesMarkedAtCost = 0;
  for (const walletDoc of walletsSnap.docs) {
    const wallet = walletDoc.data();
    const userId = String(wallet.userId ?? '');
    if (!userId) continue;
    const cashBalance = Number(wallet.balance ?? 0);

    const holdingsSnap = await db.collection(HOLDINGS).where('userId', '==', userId).get();
    let portfolioValue = 0;
    for (const h of holdingsSnap.docs) {
      const data = h.data();
      const qty = Number(data.quantity ?? data.shares ?? 0);

      // Limited-risk options cannot be valued as quantity x price: the client
      // paid a premium, and P/L is driven by the UNDERLYING, which is a
      // different number entirely. Valuing them the ordinary way was why every
      // option position marked at cost forever and the Performance chart drew
      // a flat line.
      const underlyingTicker =
        (data.assetId && underlyingByAssetId.get(data.assetId)) ??
        underlyingBySymbol.get(String(data.symbol));
      const mark = underlyingTicker ? underlyingPrice.get(underlyingTicker) : undefined;

      if (mark != null) {
        const valuation = valueOptionPosition(
          {
            contracts: qty,
            premiumPerContract: Number(data.avgCost ?? data.averagePrice ?? 0),
            entryUnderlyingPrice: Number(data.entryUnderlyingPrice ?? 0),
            multiplier: Number(data.multiplier ?? 0),
          },
          mark,
        );
        if (valuation) {
          portfolioValue += valuation.value;
          continue;
        }
        // valuation === null: the position predates entryUnderlyingPrice, or
        // has no multiplier. Fall through to mark at cost rather than invent
        // a number for a client statement.
      }

      // Reaching here with an underlying ticker means a derivative was not
      // valued via the payoff (successful valuations `continue` above).
      if (underlyingTicker) derivativesMarkedAtCost++;

      const price =
        (data.assetId && priceByAssetId.get(data.assetId)) ??
        priceBySymbol.get(String(data.symbol)) ??
        Number(data.currentPrice ?? data.price ?? 0);
      portfolioValue += qty * price;
    }

    const totalValue = portfolioValue + cashBalance;

    const prevSnap = await db.collection('portfolioSnapshots').doc(`${userId}_${yesterdayStr}`).get();
    const prevTotal = prevSnap.exists ? Number(prevSnap.data()!.totalValue ?? totalValue) : null;
    const dayChange = prevTotal != null ? totalValue - prevTotal : 0;
    const dayChangePercent = prevTotal ? (dayChange / prevTotal) * 100 : 0;

    await db
      .collection('portfolioSnapshots')
      .doc(`${userId}_${dateStr}`)
      .set(
        {
          userId,
          date: dateStr,
          portfolioValue,
          cashBalance,
          totalValue,
          dayChange,
          dayChangePercent,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    count++;
  }

  if (derivativesMarkedAtCost > 0) {
    console.warn(
      `snapshotAllPortfolios: ${derivativesMarkedAtCost} derivative holding(s) marked at ` +
        'cost (missing daily mark or entryUnderlyingPrice) - the Performance chart will ' +
        'stay flat for those until a mark exists and the position carries an entry price.',
    );
  }

  return { snapshotted: count };
}

// Daily portfolio value snapshot - the real data source behind the
// Dashboard/Performance history charts, replacing a client-side Math.sin
// placeholder that never reflected real history. Runs once after market
// close; idempotent (doc id is userId_date) so a re-run the same day just
// overwrites today's point rather than duplicating it.
export const snapshotPortfolios = onSchedule({ schedule: 'every day 21:05' }, async () => {
  const result = await snapshotAllPortfolios();
  console.log(`snapshotPortfolios: ${result.snapshotted} wallets snapshotted`);
});

// Admin-triggerable version of the same logic - lets staff seed today's
// data point on demand (e.g. right after this feature ships) instead of
// waiting for the next scheduled run.
export const runPortfolioSnapshotNow = onCall(async (request) => {
  await requireInvestorAdmin(request);
  return snapshotAllPortfolios();
});

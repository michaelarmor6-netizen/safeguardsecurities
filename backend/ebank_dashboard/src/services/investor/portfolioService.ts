import { collection, getDocs, query, where, type DocumentData } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';
import { getAllFundingRequests, getPendingFundingRequests } from './fundingService';
import { getQuote } from './marketService';
import { getAllAssets, type AssetClass } from './assetCatalogService';
import { valueOptionPosition, breakEvenPrice } from '../../lib/optionValuation';
import { getAllOrders, getPendingOrders } from './orderService';
import { getAllInvestorProfiles, getPendingApplicants } from './profileService';
import { getAllWallets } from './walletService';

export interface PortfolioHolding {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  shares: number;
  averagePrice: number;
  currentPrice: number;
  price: number;
  change: number;
  changePercent: number;
  value: number;
  allocation: number;
  sector?: string;
  assetId?: string;
  assetClass?: AssetClass;
  /** Underlying price at entry — P/L reference for limited-risk options. */
  entryUnderlyingPrice?: number;
  /** Units of underlying per contract (100 troy oz for gold). */
  multiplier?: number;
  /** Payoff after the limited-risk floor, when the position can be valued. */
  optionPnl?: number;
  /** Maximum possible loss — the premium paid. */
  maxLoss?: number;
  /** True when the loss floor bound the result (total write-off). */
  isCapped?: boolean;
  /** Underlying price at which the payoff repays the premium. */
  breakEven?: number;
  /** True when no live quote exists and price falls back to entry cost. */
  markedAtCost?: boolean;
}

export interface PortfolioStats {
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  holdingsCount: number;
}

function mapRawHolding(id: string, data: DocumentData): Omit<PortfolioHolding, 'price' | 'change' | 'changePercent' | 'value' | 'allocation'> {
  const shares = Number(data.shares ?? data.quantity ?? 0);
  return {
    id,
    userId: data.userId ?? '',
    symbol: data.symbol ?? '',
    name: data.name ?? data.symbol ?? '',
    shares,
    // fillOrder writes `avgCost`; older/admin-seeded rows may use
    // averagePrice/avgPrice. Reading only the latter silently showed $0.00.
    averagePrice: Number(data.avgCost ?? data.averagePrice ?? data.avgPrice ?? 0),
    currentPrice: Number(data.currentPrice ?? data.price ?? 0),
    sector: data.sector,
    assetId: data.assetId ?? undefined,
    entryUnderlyingPrice: Number(data.entryUnderlyingPrice ?? 0) || undefined,
    multiplier: Number(data.multiplier ?? 0) || undefined,
  };
}

export interface RawHolding {
  id: string;
  userId: string;
  symbol: string;
  shares: number;
  currentPrice: number;
}

// Unfiltered, admin-only read of all holdings using their last-recorded price
// (no per-holding live quote calls) - used for risk/exposure summaries where
// a real-time price isn't needed.
export async function getAllHoldingsRaw(): Promise<RawHolding[]> {
  const snap = await getDocs(collection(db, LIVE_COLLECTIONS.portfolioHoldings));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId ?? '',
      symbol: data.symbol ?? '',
      shares: Number(data.shares ?? data.quantity ?? 0),
      currentPrice: Number(data.currentPrice ?? data.price ?? 0),
    };
  });
}

export async function getUserPortfolio(userId: string): Promise<PortfolioHolding[]> {
  const snap = await getDocs(
    query(collection(db, LIVE_COLLECTIONS.portfolioHoldings), where('userId', '==', userId)),
  );
  if (snap.empty) return [];

  const rows = snap.docs.map((d) => mapRawHolding(d.id, d.data()));

  // One catalog read for the whole portfolio: gives each holding its real
  // instrument name and asset class, so a gold future stops displaying as
  // "GCF27 / GCF27" measured in shares.
  const catalog = await getAllAssets().catch(() => []);
  const byId = new Map(catalog.map((a) => [a.id, a]));
  const bySymbol = new Map(catalog.map((a) => [a.symbol, a]));

  const enriched: PortfolioHolding[] = [];

  for (const row of rows) {
    const asset = (row.assetId ? byId.get(row.assetId) : undefined) ?? bySymbol.get(row.symbol);
    const quote = await getQuote(row.symbol, row.currentPrice);

    // The catalog's cached quote may ONLY be used when the holding is that
    // exact instrument. Root commodities carry a proxy quoteSymbol (Gold/GC
    // quotes via the GLD ETF), so reaching through to it would mark a COMEX
    // futures contract at an ETF's share price - a fabricated loss on a
    // position that has not moved. A contract month (GCF27) is not its root
    // (GC), and neither is the proxy.
    const isSameInstrument = asset?.symbol === row.symbol;
    const catalogPrice = isSameInstrument ? asset?.quote?.price ?? 0 : 0;

    // Raw futures contracts have no quote of their own, so no live price
    // exists. Mark those at entry cost rather than zero - a position valued
    // at $0 tells the client their holding is worthless, which is not true.
    const livePrice = quote.price || row.currentPrice || catalogPrice || 0;
    const markedAtCost = livePrice <= 0;
    const price = markedAtCost ? row.averagePrice : livePrice;
    const value = row.shares * price;

    // Limited-risk option payoff. Needs the entry underlying price and the
    // multiplier, both persisted at fill; returns null when either is absent
    // (positions opened before those fields existed) or when there is no live
    // underlying price. In that case we keep the mark-at-cost path rather than
    // inventing a valuation.
    const valuation = valueOptionPosition(
      {
        contracts: row.shares,
        premiumPerContract: row.averagePrice,
        entryUnderlyingPrice: row.entryUnderlyingPrice ?? 0,
        multiplier: row.multiplier ?? 0,
      },
      livePrice,
    );

    enriched.push({
      ...row,
      name: asset?.name ?? row.name,
      assetClass: asset?.assetClass,
      price,
      change: markedAtCost ? 0 : quote.change,
      changePercent: markedAtCost ? 0 : quote.changePercent,
      value: valuation ? valuation.value : value,
      allocation: 0,
      markedAtCost: valuation ? false : markedAtCost,
      optionPnl: valuation?.pnl,
      maxLoss: valuation?.maxLoss,
      isCapped: valuation?.isCapped,
      breakEven:
        row.entryUnderlyingPrice && row.multiplier
          ? breakEvenPrice({
              contracts: row.shares,
              premiumPerContract: row.averagePrice,
              entryUnderlyingPrice: row.entryUnderlyingPrice,
              multiplier: row.multiplier,
            }) ?? undefined
          : undefined,
    });
  }

  const totalValue = enriched.reduce((sum, h) => sum + h.value, 0);
  enriched.forEach((h) => {
    h.allocation = totalValue > 0 ? (h.value / totalValue) * 100 : 0;
  });

  return enriched;
}

export async function getPortfolioStatsForUser(userId: string): Promise<PortfolioStats> {
  const holdings = await getUserPortfolio(userId);

  // Derive cost basis from the enriched holdings rather than re-reading the
  // raw documents. The old version parsed the cost field itself and missed
  // `avgCost` (what fillOrder writes), so cost basis came out as 0 and the
  // whole position value was reported as profit.
  const costBasis = holdings.reduce((sum, h) => sum + h.shares * h.averagePrice, 0);

  // Where a position was valued through the option payoff, its P/L is already
  // computed (and floored at the premium). Summing those is more accurate than
  // value - cost, which would ignore the limited-risk cap.
  const payoffPnl = holdings.reduce(
    (sum, h) => (typeof h.optionPnl === 'number' ? sum + h.optionPnl : sum),
    0,
  );
  const hasPayoffPositions = holdings.some((h) => typeof h.optionPnl === 'number');

  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
  const totalGain = hasPayoffPositions ? payoffPnl : totalValue - costBasis;
  const totalGainPercent = costBasis > 0 ? (totalGain / costBasis) * 100 : 0;
  const dayChange = holdings.reduce((sum, h) => sum + h.change * h.shares, 0);
  const dayChangePercent = totalValue > 0 ? (dayChange / totalValue) * 100 : 0;

  return {
    totalValue,
    totalGain,
    totalGainPercent,
    dayChange,
    dayChangePercent,
    holdingsCount: holdings.length,
  };
}

/** @deprecated use getPortfolioStatsForUser */
export function getPortfolioStats(holdings: PortfolioHolding[]): PortfolioStats {
  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
  const dayChange = holdings.reduce((sum, h) => sum + h.change * h.shares, 0);
  return {
    totalValue,
    totalGain: 0,
    totalGainPercent: 0,
    dayChange,
    dayChangePercent: totalValue > 0 ? (dayChange / totalValue) * 100 : 0,
    holdingsCount: holdings.length,
  };
}

export async function getAdminStats() {
  const [users, wallets, pendingOrders, pendingFunding, pendingApplicants] = await Promise.all([
    getAllInvestorProfiles(),
    getAllWallets(),
    getPendingOrders(),
    getPendingFundingRequests(),
    getPendingApplicants(),
  ]);

  const activeUsers = users.filter((u) => u.accountStatus === 'active').length;
  const todayOrders = (await getAllOrders()).filter((o) => {
    if (!o.createdAt) return false;
    return o.createdAt.toDateString() === new Date().toDateString();
  });

  return {
    totalUsers: users.length,
    activeUsers,
    totalWalletBalance: wallets.reduce((sum, w) => sum + w.balance, 0),
    pendingOrders: pendingOrders.length,
    pendingFunding: pendingFunding.length,
    pendingApplicants: pendingApplicants.length,
    todayVolume: todayOrders.reduce((sum, o) => sum + (o.price ?? 0) * o.quantity, 0),
    todayTrades: todayOrders.length,
    recentUsers: users.slice(0, 8),
    recentFunding: (await getAllFundingRequests()).filter((f) => f.status === 'pending').slice(0, 5),
  };
}

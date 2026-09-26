import { collection, doc, getDoc, getDocs, query, where, type DocumentData } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';
import { getAllFundingRequests, getPendingFundingRequests } from './fundingService';
import { getQuote } from './marketService';
import { getAllAssets, type AssetClass } from './assetCatalogService';
import { valueOptionPosition, breakEvenPrice, optionReturnPercent, optionSessionPnl, unrealizedGain, isOptionSide } from '../../lib/optionValuation';
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
  /** Underlying price at entry — recorded at fill; P/L uses the strike, not this. */
  entryUnderlyingPrice?: number;
  /** Units of underlying per contract, recorded at fill. Payoff is $100 per point. */
  multiplier?: number;
  /** Broker strike. P/L is measured from this price to the current underlying. */
  strikePrice?: number;
  /** Call profits when price rises; put profits when it falls. */
  optionType?: 'call' | 'put';
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
  /** Trading session (YYYY-MM-DD) of the settlement used to mark the payoff. */
  markAsOf?: string;
  /**
   * Change in this holding's value since the previous settlement.
   * Absent when there is no prior mark to compare — distinct from a measured
   * flat day, which is 0.
   */
  dayPnl?: number;
}

export interface PortfolioStats {
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
  holdingsCount: number;
}

/** Open screens re-read marks on this interval. The hourly job writes them. */
export const PORTFOLIO_MARK_REFRESH_MS = 30 * 60 * 1000;

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
    multiplier: Number(data.multiplier ?? data.contractSize ?? 0) || undefined,
    strikePrice: Number(data.strikePrice ?? 0) || undefined,
    optionType: isOptionSide(data.optionType) ? data.optionType : undefined,
  };
}

interface OpeningTerms {
  strike?: number;
  optionType?: 'call' | 'put';
}

// Existing holdings often have the strike and call/put only on the filled
// order. Without both, P/L cannot be measured from the strike and the book
// stays at the premium while the underlying moves.
async function loadOpeningTerms(userId: string): Promise<Map<string, OpeningTerms>> {
  const snap = await getDocs(query(collection(db, LIVE_COLLECTIONS.orders), where('userId', '==', userId)));
  const best = new Map<string, { strike?: number; strikeAt: number; optionType?: 'call' | 'put'; typeAt: number }>();
  for (const d of snap.docs) {
    const data = d.data();
    const status = String(data.status ?? '');
    if (status !== 'filled' && status !== 'partially_filled') continue;
    const symbol = String(data.symbol ?? '').trim().toUpperCase();
    if (!symbol) continue;
    const strike = Number(data.strikePrice ?? 0);
    const optionType = isOptionSide(data.optionType) ? data.optionType : undefined;
    if (!(strike > 0) && !optionType) continue;
    const at = typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : Number.MAX_SAFE_INTEGER;
    const prev = best.get(symbol) ?? { strikeAt: Number.POSITIVE_INFINITY, typeAt: Number.POSITIVE_INFINITY };
    if (strike > 0 && at < prev.strikeAt) {
      prev.strike = strike;
      prev.strikeAt = at;
    }
    if (optionType && at < prev.typeAt) {
      prev.optionType = optionType;
      prev.typeAt = at;
    }
    best.set(symbol, prev);
  }
  const terms = new Map<string, OpeningTerms>();
  for (const [symbol, row] of best) terms.set(symbol, { strike: row.strike, optionType: row.optionType });
  return terms;
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

interface UnderlyingMark {
  price: number;
  asOf?: string;
  previousPrice?: number;
  previousAsOf?: string;
}

// Same doc-id sanitisation functions-market uses when it writes marketPrices.
const marketPriceDocId = (ticker: string) => ticker.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');

const CONTRACT_MONTH = /^[A-Z]{1,3}[FGHJKMNQUVXZ]\d{2}$/;

// Catalog underlyingPriceSymbol when it is set. Existing books left that
// field blank, so a contract-month holding (GCF27) is marked under its own
// symbol. Spot (XAUUSD) and equities are not mapped onto a gold future.
function markTickerFor(symbol: string, underlyingPriceSymbol?: string | null): string | undefined {
  const explicit = underlyingPriceSymbol?.trim().toUpperCase();
  if (explicit) return explicit;
  const own = symbol.trim().toUpperCase();
  if (CONTRACT_MONTH.test(own)) return own;
  return undefined;
}

/**
 * Daily settlement marks for a set of underlying tickers, straight from
 * marketPrices - the SAME source the nightly snapshotPortfolios job values
 * against, so the dashboard and the recorded history can never disagree.
 * A missing or malformed doc yields no mark (position falls back to cost).
 */
async function fetchUnderlyingMarks(tickers: string[]): Promise<Map<string, UnderlyingMark>> {
  const marks = new Map<string, UnderlyingMark>();
  const unique = [...new Set(tickers.map((x) => x.trim().toUpperCase()).filter(Boolean))];
  await Promise.all(
    unique.map(async (ticker) => {
      try {
        const snap = await getDoc(doc(db, 'marketPrices', marketPriceDocId(ticker)));
        const data = snap.data();
        const price = Number(data?.price);
        const previousPrice = Number(data?.previousPrice);
        if (snap.exists() && Number.isFinite(price) && price > 0) {
          marks.set(ticker, {
            price,
            asOf: typeof data?.asOf === 'string' ? data.asOf : undefined,
            previousPrice: Number.isFinite(previousPrice) && previousPrice > 0 ? previousPrice : undefined,
            previousAsOf: typeof data?.previousAsOf === 'string' ? data.previousAsOf : undefined,
          });
        }
      } catch {
        // Unreadable mark = unmarked position, never a crash.
      }
    }),
  );
  return marks;
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

  // One read per distinct underlying. Catalog underlyingPriceSymbol when it
  // is set; otherwise the holding symbol itself when that symbol is the
  // contract month (GCF27).
  const underlyingTickers = rows
    .map((r) => {
      const asset = (r.assetId ? byId.get(r.assetId) : undefined) ?? bySymbol.get(r.symbol);
      return markTickerFor(r.symbol, asset?.underlyingPriceSymbol);
    })
    .filter((x): x is string => typeof x === 'string' && x.length > 0);
  const marks = await fetchUnderlyingMarks(underlyingTickers);

  const needsOpeningTerms = rows.some((r) => !r.strikePrice || !r.optionType);
  const openingTerms = needsOpeningTerms ? await loadOpeningTerms(userId).catch(() => new Map<string, OpeningTerms>()) : new Map<string, OpeningTerms>();

  const enriched: PortfolioHolding[] = [];

  for (const row of rows) {
    const asset = (row.assetId ? byId.get(row.assetId) : undefined) ?? bySymbol.get(row.symbol);
    const quote = await getQuote(row.symbol, row.currentPrice);
    const opening = openingTerms.get(row.symbol.trim().toUpperCase());

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
    const spotValue = row.shares * (markedAtCost ? row.averagePrice : livePrice);

    // Limited-risk option payoff. The basis is the broker's strike, compared
    // with the running underlying price. Call: each $1 up pays $100 per
    // contract. Put: each $1 down pays $100 per contract. Losses stop at the
    // premium. The current price is the underlying settlement — never the
    // premium and never a proxy quote.
    const underlyingTicker = markTickerFor(row.symbol, asset?.underlyingPriceSymbol);
    const mark = underlyingTicker ? marks.get(underlyingTicker) : undefined;
    const strikePrice = row.strikePrice ?? opening?.strike ?? 0;
    const optionType = row.optionType ?? opening?.optionType;
    const position = optionType
      ? {
          contracts: row.shares,
          premiumPerContract: row.averagePrice,
          strikePrice,
          optionType,
        }
      : null;
    const valuation = position && mark?.price ? valueOptionPosition(position, mark.price) : null;
    const sessionPnl =
      position && valuation && mark?.previousPrice ? optionSessionPnl(position, mark.price, mark.previousPrice) : null;

    enriched.push({
      ...row,
      name: asset?.name ?? row.name,
      assetClass: asset?.assetClass,
      strikePrice: strikePrice || undefined,
      optionType,
      // For a valued option the mark is current value per contract, so the
      // figure on screen moves with the underlying instead of sitting on the
      // premium that was paid.
      price: valuation ? valuation.value / row.shares : markedAtCost ? row.averagePrice : livePrice,
      change: valuation ? valuation.pnl / row.shares : markedAtCost ? 0 : quote.change,
      changePercent: valuation ? optionReturnPercent(valuation) : markedAtCost ? 0 : quote.changePercent,
      value: valuation ? valuation.value : spotValue,
      allocation: 0,
      markedAtCost: valuation ? false : markedAtCost,
      markAsOf: valuation ? mark?.asOf : undefined,
      dayPnl: sessionPnl ?? (valuation ? undefined : markedAtCost ? 0 : quote.change * row.shares),
      optionPnl: valuation?.pnl,
      maxLoss: valuation?.maxLoss,
      isCapped: valuation?.isCapped,
      breakEven: position ? breakEvenPrice(position) ?? undefined : undefined,
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

  // Sum each holding on its own. Using only the option payoff whenever ANY
  // position had one dropped every other holding's mark-to-market, so the
  // headline P/L stayed put while those prices moved.
  const totalGain = holdings.reduce(
    (sum, h) => sum + unrealizedGain({ optionPnl: h.optionPnl, value: h.value, quantity: h.shares, averagePrice: h.averagePrice }),
    0,
  );

  const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
  const totalGainPercent = costBasis > 0 ? (totalGain / costBasis) * 100 : 0;
  // Day move is the session change in value (prior settlement → current), not
  // the equity-quote change. Derivative contracts have no such quote, so the
  // old `change * shares` path reported $0 on every day the book actually moved.
  const dayChange = holdings.reduce((sum, h) => sum + (h.dayPnl ?? 0), 0);
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

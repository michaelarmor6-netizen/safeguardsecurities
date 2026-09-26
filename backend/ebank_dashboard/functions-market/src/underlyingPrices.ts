// Daily reference prices for the UNDERLYING behind a derivative position.
//
// A limited-risk option's P/L is driven by the underlying, not by any quote on
// the contract itself. Raw futures/option contracts are seeded quoteSymbol:null
// (they are not Finnhub-quotable), so before this existed there was no daily
// price for them at all - which is why every option position marked at cost
// forever and the client Performance chart was a flat line.
//
// Source is Massive's FUTURES API, deliberately not its forex API. Forex can
// serve gold as spot (C:XAUUSD), but spot is not what a COMEX contract like
// GCZ27 settles against - the two differ by the futures basis, routinely tens
// of dollars an ounce. Marking a futures-referenced position against spot would
// manufacture a P/L equal to that basis on day one: the same class of error as
// the GLD proxy mark that once showed a fabricated 58% loss. Quoting the
// contract itself removes the mismatch rather than documenting it.

export interface UnderlyingPrice {
  ticker: string;
  price: number;
  /** Whether the price is an exchange settlement or just the session close. */
  priceType: 'settlement' | 'close';
  /** Trading session the bar belongs to, YYYY-MM-DD. */
  asOf: string;
  source: string;
}

const MASSIVE_BASE = 'https://api.massive.com';

/** Keep the prior session's price when a new settlement arrives, so day P/L has a baseline. */
export function rollUnderlyingPrice<T extends { price: number; asOf: string }>(
  existing: { price?: unknown; asOf?: unknown; previousPrice?: unknown; previousAsOf?: unknown } | undefined,
  next: T,
): T & { previousPrice?: number; previousAsOf?: string } {
  const prevPrice = Number(existing?.price);
  const prevAsOf = typeof existing?.asOf === 'string' ? existing.asOf : undefined;
  const sameSession = prevAsOf != null && prevAsOf === next.asOf;
  if (!sameSession && Number.isFinite(prevPrice) && prevPrice > 0 && prevAsOf) {
    return { ...next, previousPrice: prevPrice, previousAsOf: prevAsOf };
  }
  const keptPrev = Number(existing?.previousPrice);
  const keptAsOf = typeof existing?.previousAsOf === 'string' ? existing.previousAsOf : undefined;
  if (Number.isFinite(keptPrev) && keptPrev > 0 && keptAsOf) {
    return { ...next, previousPrice: keptPrev, previousAsOf: keptAsOf };
  }
  return next;
}

/**
 * Most recent completed SESSION bar for a futures contract.
 *
 * resolution=1session is the right granularity for a once-a-day mark: an
 * intraday bar would make the recorded value depend on which minute the job
 * happened to run. Session bars also carry settlement_price, which is the
 * exchange's official daily mark and what a statement should reference -
 * close is only a fallback for a session that has not settled yet.
 */
export async function fetchUnderlyingClose(apiKey: string, ticker: string): Promise<UnderlyingPrice> {
  if (!apiKey) throw new Error('Market data key is not configured (MASSIVE_API_KEY)');
  if (!ticker) throw new Error('ticker is required');

  const url =
    `${MASSIVE_BASE}/futures/v1/aggs/${encodeURIComponent(ticker)}` +
    `?resolution=1session&limit=1&sort=window_start.desc&apiKey=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 429) throw new Error('Market data rate limit reached');
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Not entitled to futures data for ${ticker} (${res.status}) - check the Massive plan`);
    }
    if (res.status === 404) {
      throw new Error(`Unknown futures ticker "${ticker}" - confirm it against Massive's contracts index`);
    }
    throw new Error(`Market data request failed for ${ticker} (${res.status})`);
  }

  const data = (await res.json()) as {
    results?: Array<{ close?: number; settlement_price?: number; session_end_date?: string }>;
  };
  const bar = data.results?.[0];

  const settlement = Number(bar?.settlement_price);
  const close = Number(bar?.close);
  const useSettlement = Number.isFinite(settlement) && settlement > 0;
  const price = useSettlement ? settlement : close;

  // A malformed or empty response must NOT become a price. Marking a client
  // position against a fabricated number is worse than not updating at all.
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`No usable session price returned for ${ticker}`);
  }

  return {
    ticker,
    price,
    priceType: useSettlement ? 'settlement' : 'close',
    asOf: bar?.session_end_date ?? new Date().toISOString().slice(0, 10),
    source: 'massive-futures',
  };
}

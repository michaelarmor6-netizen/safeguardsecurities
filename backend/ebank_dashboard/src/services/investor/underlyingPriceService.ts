import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';

// Daily reference price for the UNDERLYING behind a derivative position.
//
// Two ways a price lands in marketPrices, and the portfolio snapshot treats
// them identically:
//   1. Automatic - the Massive FUTURES API, which needs its own (free)
//      subscription on that asset class. Requires underlyingPriceSymbol on the
//      asset.
//   2. Manual - the desk posts the day's settlement here.
//
// If neither has happened, option positions mark at cost. That is the correct
// fallback: an unmarked position is better than a guessed one.

export interface UnderlyingPriceRow {
  ticker: string;
  price: number;
  priceType?: 'settlement' | 'close' | null;
  asOf?: string | null;
  source?: string | null;
  postedBy?: string | null;
}

const listFn = httpsCallable<void, { rows: UnderlyingPriceRow[] }>(functions, 'listUnderlyingPrices');
const setFn = httpsCallable<
  { ticker: string; price: number; asOf: string },
  { ticker: string; price: number; asOf: string }
>(functions, 'setUnderlyingPriceManually');
const refreshFn = httpsCallable<
  void,
  {
    updated: number;
    failed: number;
    details: Array<{ ticker: string; ok: boolean; price?: number; asOf?: string; error?: string }>;
  }
>(functions, 'runUnderlyingPriceRefreshNow');

export async function listUnderlyingPrices(): Promise<UnderlyingPriceRow[]> {
  const res = await listFn();
  return res.data.rows ?? [];
}

export async function setUnderlyingPriceManually(ticker: string, price: number, asOf: string) {
  const res = await setFn({ ticker, price, asOf });
  return res.data;
}

export async function refreshUnderlyingPricesNow() {
  const res = await refreshFn();
  return res.data;
}

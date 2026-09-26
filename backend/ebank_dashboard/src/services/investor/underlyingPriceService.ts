import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';

// Three ways a price lands in marketPrices, and the portfolio reads them
// the same way:
//   1. Hourly - GitHub Actions runs scripts/refresh-underlying-marks.mjs and
//      writes the latest completed hour of the listed contract. This is the
//      one that runs without the Blaze plan.
//   2. Daily settlement - the Massive futures job, which needs Blaze plus a
//      futures subscription. It does not run while billing is off.
//   3. Manual - the desk posts the day's settlement here.
//
// A manual price posted for today is left in place. An unmarked position
// still marks at cost rather than at a guessed proxy.

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

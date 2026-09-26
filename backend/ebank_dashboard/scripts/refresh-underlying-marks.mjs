// Hourly underlying marks for option P/L.
//
// Cloud Functions cannot run this: the Firebase project is not on the Blaze
// plan, so the daily Massive job never fires and every book stays at the last
// posted price. This script runs from GitHub Actions instead (no Blaze, no
// Secret Manager). It quotes the SAME listed contract the catalog names
// (GCZ7 -> GCZ27.CMX), not the front-month continuous and not the GLD proxy.
//
// The price is the latest completed hourly bar. Unrealized P/L moves each
// hour. previousPrice stays the prior session so "today" is still versus
// yesterday, not versus the last hour.
//
// Tickers come from assets.underlyingPriceSymbol when set, and also from
// contract-month symbols on assets and open holdings (GCU26, GCF27, GCZ27).
// The catalog left underlyingPriceSymbol blank, so quoting only that field
// wrote nothing. Spot (XAUUSD) and equities are skipped — they are not a
// listed COMEX month, and a front-month or GLD proxy is the wrong basis.
//
//   FIREBASE_SERVICE_ACCOUNT  JSON of the hosting deploy service account
//   DRY_RUN=1                 print quotes, do not write
//   TICKERS=GCZ7,SIH26        skip the catalog and quote these (dry runs)

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const EXCHANGE_SUFFIX = {
  GC: 'CMX',
  SI: 'CMX',
  HG: 'CMX',
  CL: 'NYM',
  NG: 'NYM',
  PL: 'NYM',
  PA: 'NYM',
};

/** Massive/catalog ticker (GCZ7, GCZ27) -> Yahoo contract (GCZ27.CMX). */
export function yahooSymbolFor(ticker) {
  const raw = String(ticker ?? '').trim().toUpperCase();
  const match = /^([A-Z]{1,3})([FGHJKMNQUVXZ])(\d{1,4})$/.exec(raw);
  if (!match) return null;
  const [, root, month, year] = match;
  const suffix = EXCHANGE_SUFFIX[root];
  if (!suffix) return null;
  let yy;
  if (year.length >= 2) {
    yy = year.slice(-2);
  } else {
    const digit = Number(year);
    const now = new Date().getUTCFullYear();
    const decade = Math.floor(now / 10) * 10;
    let full = decade + digit;
    if (full < now - 1) full += 10;
    yy = String(full).slice(-2);
  }
  return `${root}${month}${yy}.${suffix}`;
}

function sessionDate(unixSeconds) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(unixSeconds * 1000));
}

function rollPrice(existing, next) {
  const prevPrice = Number(existing?.price);
  const prevAsOf = typeof existing?.asOf === 'string' ? existing.asOf : undefined;
  const base = { ...next };
  if (prevAsOf && prevAsOf !== next.asOf && Number.isFinite(prevPrice) && prevPrice > 0) {
    return { ...base, previousPrice: prevPrice, previousAsOf: prevAsOf };
  }
  const keptPrev = Number(existing?.previousPrice);
  const keptAsOf = typeof existing?.previousAsOf === 'string' ? existing.previousAsOf : undefined;
  if (Number.isFinite(keptPrev) && keptPrev > 0 && keptAsOf) {
    return { ...base, previousPrice: keptPrev, previousAsOf: keptAsOf };
  }
  return base;
}

async function fetchHourlyClose(yahooSymbol) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}` +
    '?interval=60m&range=5d';
  const res = await fetch(url, { headers: { 'User-Agent': 'SafeGuardSecurities/marks' } });
  if (!res.ok) throw new Error(`Yahoo quote failed for ${yahooSymbol} (${res.status})`);
  const body = await res.json();
  const result = body.chart?.result?.[0];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const times = result?.timestamp ?? [];
  for (let i = closes.length - 1; i >= 0; i -= 1) {
    const price = Number(closes[i]);
    const ts = Number(times[i]);
    if (Number.isFinite(price) && price > 0 && Number.isFinite(ts)) {
      return { price, asOf: sessionDate(ts) };
    }
  }
  const last = Number(result?.meta?.regularMarketPrice);
  const lastTs = Number(result?.meta?.regularMarketTime);
  if (Number.isFinite(last) && last > 0 && Number.isFinite(lastTs)) {
    return { price: last, asOf: sessionDate(lastTs) };
  }
  throw new Error(`No usable hourly price for ${yahooSymbol}`);
}

async function catalogTickers(db) {
  const fromEnv = String(process.env.TICKERS ?? '')
    .split(',')
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  if (fromEnv.length) return fromEnv;
  const tickers = new Set();
  const assets = await db.collection('assets').get();
  for (const doc of assets.docs) {
    const data = doc.data();
    const explicit = data?.underlyingPriceSymbol;
    if (typeof explicit === 'string' && explicit.trim()) tickers.add(explicit.trim().toUpperCase());
    const symbol = typeof data?.symbol === 'string' ? data.symbol.trim().toUpperCase() : '';
    if (yahooSymbolFor(symbol)) tickers.add(symbol);
  }
  // Open positions whose symbol is itself the contract (GCF27) even when the
  // catalog root (GC) never had underlyingPriceSymbol filled in.
  const holdings = await db.collection('portfolioHoldings').get();
  for (const doc of holdings.docs) {
    const symbol = String(doc.data()?.symbol ?? '').trim().toUpperCase();
    if (yahooSymbolFor(symbol)) tickers.add(symbol);
  }
  return [...tickers];
}

async function main() {
  const dryRun = process.env.DRY_RUN === '1';
  let db = null;
  if (!dryRun) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
    const creds = JSON.parse(raw);
    initializeApp({ credential: cert(creds) });
    db = getFirestore();
  }

  const tickers = await catalogTickers(db);
  if (tickers.length === 0) {
    console.log('No underlyingPriceSymbol values on assets. Nothing to mark.');
    return;
  }

  let updated = 0;
  let failed = 0;
  for (const ticker of tickers) {
    const yahoo = yahooSymbolFor(ticker);
    if (!yahoo) {
      failed += 1;
      console.error(`${ticker}: no Yahoo contract mapping`);
      continue;
    }
    try {
      const bar = await fetchHourlyClose(yahoo);
      if (dryRun || !db) {
        console.log(`${ticker} ${yahoo} ${bar.price} asOf ${bar.asOf}`);
        updated += 1;
        continue;
      }
      const ref = db.collection('marketPrices').doc(ticker.replace(/[^A-Z0-9]/g, '_'));
      const existingSnap = await ref.get();
      const existing = existingSnap.data();
      if (existing?.source === 'manual' && existing.asOf === bar.asOf) {
        console.log(`${ticker}: keeping today's manual settlement ${existing.price}`);
        updated += 1;
        continue;
      }
      const next = rollPrice(existing, {
        ticker,
        price: bar.price,
        priceType: 'close',
        asOf: bar.asOf,
        source: 'yahoo-hourly',
        yahooSymbol: yahoo,
      });
      await ref.set({ ...next, fetchedAt: FieldValue.serverTimestamp() }, { merge: true });
      console.log(`${ticker}: ${bar.price} as of ${bar.asOf} (${yahoo})`);
      updated += 1;
    } catch (err) {
      failed += 1;
      console.error(`${ticker}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`refresh-underlying-marks: ${updated} updated, ${failed} failed`);
  if (updated === 0 && failed > 0) process.exitCode = 1;
}

const isDirectRun = process.argv[1] && process.argv[1].endsWith('refresh-underlying-marks.mjs');
if (isDirectRun) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}

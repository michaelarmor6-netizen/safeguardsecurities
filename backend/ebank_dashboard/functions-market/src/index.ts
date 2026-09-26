import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { fetchDailyCloses, generateSignalFromIndicators } from './ai';
import { computeIndicators } from './indicators';
import { fetchMarketNews, fetchCompanyProfile, fetchCompanyMetrics, fetchQuote } from './finnhub';
import { reserveSignal, releaseSignal } from './entitlements';
import { fetchUnderlyingClose, rollUnderlyingPrice } from './underlyingPrices';

initializeApp();

const FINNHUB_API_KEY = defineSecret('FINNHUB_API_KEY');
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const MASSIVE_API_KEY = defineSecret('MASSIVE_API_KEY');

const AI_SIGNAL_SECRETS = [FINNHUB_API_KEY, ANTHROPIC_API_KEY, MASSIVE_API_KEY];
const FINNHUB_SECRETS = [FINNHUB_API_KEY];
const MASSIVE_SECRETS = [MASSIVE_API_KEY];

function requireAuth(request: CallableRequest): string {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  return request.auth.uid;
}

// AI Engine: fetches real daily closes for a symbol, computes explainable
// technical indicators server-side, and asks Claude to reason over them for
// a buy/sell/hold recommendation. Signal-only - never places or routes an
// order itself. Result is written to aiSignals as an immutable audit trail.
//
// Kept in its own Cloud Functions codebase (see firebase.json "market" entry)
// deliberately - it only needs FINNHUB_API_KEY/ANTHROPIC_API_KEY, not the
// IG_* secrets in functions/, which have never been provisioned and block
// that whole codebase's deploys. This codebase deploys independently.
export const generateTradingSignal = onCall({ secrets: AI_SIGNAL_SECRETS }, async (request) => {
  const uid = requireAuth(request);
  const symbol = String(request.data?.symbol ?? '').trim().toUpperCase();
  if (!symbol) throw new HttpsError('invalid-argument', 'symbol is required');

  // Take the allowance BEFORE any paid call, so a client who is over quota
  // never costs us a Finnhub or model request. Refunded below if the work
  // itself fails.
  const reservation = await reserveSignal(uid);

  try {
    const closes = await fetchDailyCloses({ apiKey: MASSIVE_API_KEY.value() }, symbol);
    const indicators = computeIndicators(closes);
    const signal = await generateSignalFromIndicators(ANTHROPIC_API_KEY.value(), symbol, indicators);

    const doc = {
      userId: uid,
      symbol,
      indicators,
      side: signal.side,
      confidence: signal.confidence,
      rationale: signal.rationale,
      indicatorSummary: signal.indicatorSummary,
      plan: reservation.plan,
      createdAt: FieldValue.serverTimestamp(),
    };
    const ref = await getFirestore().collection('aiSignals').add(doc);

    return {
      id: ref.id,
      symbol,
      indicators,
      ...signal,
      usage: { used: reservation.used, quota: reservation.quota },
    };
  } catch (err) {
    // The client should not lose an allowance because our pipeline failed.
    await releaseSignal(uid, reservation.period);
    throw new HttpsError('internal', err instanceof Error ? err.message : 'AI signal generation failed');
  }
});

// Real market news headlines (Finnhub general news feed) for the Market News
// workspace tab - was previously a "coming soon" placeholder.
export const getMarketNews = onCall({ secrets: FINNHUB_SECRETS }, async (request) => {
  requireAuth(request);
  const category = String(request.data?.category ?? 'general');
  try {
    return await fetchMarketNews(FINNHUB_API_KEY.value(), category);
  } catch (err) {
    throw new HttpsError('internal', err instanceof Error ? err.message : 'Failed to fetch market news');
  }
});

// Real company profile + fundamentals (Finnhub) for the Research workspace
// tab - was previously a "coming soon" placeholder. Distinct from the AI
// Engine: this is factual company data, not an AI-generated recommendation.
export const getCompanyResearch = onCall({ secrets: FINNHUB_SECRETS }, async (request) => {
  requireAuth(request);
  const symbol = String(request.data?.symbol ?? '').trim().toUpperCase();
  if (!symbol) throw new HttpsError('invalid-argument', 'symbol is required');
  try {
    const [profile, metrics] = await Promise.all([
      fetchCompanyProfile(FINNHUB_API_KEY.value(), symbol),
      fetchCompanyMetrics(FINNHUB_API_KEY.value(), symbol),
    ]);
    return { profile, metrics };
  } catch (err) {
    throw new HttpsError('internal', err instanceof Error ? err.message : 'Failed to fetch company research');
  }
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Rides the same quote-refresh pass rather than a separate polling loop -
// every asset that just got a fresh price is checked against any active
// alert on it, in the same function invocation.
async function evaluateAlertsForAsset(assetId: string, price: number): Promise<number> {
  const db = getFirestore();
  const alertsSnap = await db
    .collection('priceAlerts')
    .where('assetId', '==', assetId)
    .where('status', '==', 'active')
    .get();
  if (alertsSnap.empty) return 0;

  const batch = db.batch();
  let triggered = 0;
  for (const alertDoc of alertsSnap.docs) {
    const alert = alertDoc.data();
    const target = Number(alert.targetPrice ?? 0);
    const hit = alert.condition === 'above' ? price >= target : price <= target;
    if (hit) {
      batch.update(alertDoc.ref, {
        status: 'triggered',
        seen: false,
        triggeredAt: FieldValue.serverTimestamp(),
        triggeredPrice: price,
      });
      triggered++;
    }
  }
  if (triggered > 0) await batch.commit();
  return triggered;
}

// Asset Management: batch-refreshes the embedded `quote` field on every
// active instrument that has a Finnhub-quotable quoteSymbol (raw futures
// contracts don't have one - they're seeded quoteSymbol:null and stay
// reference-only). Batched in groups of 10 with a pause between batches to
// stay comfortably under Finnhub's rate limit rather than firing ~100 calls
// at once.
async function refreshAllAssetQuotes(apiKey: string) {
  const db = getFirestore();
  const snap = await db
    .collection('assets')
    .where('isActive', '==', true)
    .get();

  const docs = snap.docs.filter((d) => d.data().quoteSymbol);
  // Finnhub's free tier caps at ~60 calls/minute; batches of 5 with a 6s
  // gap keeps a 119-asset catalog under ~50/min so a full pass doesn't
  // start silently failing partway through once the quota is exhausted.
  const batchSize = 5;
  let updated = 0;
  let failed = 0;
  let alertsTriggered = 0;

  let firstError: string | null = null;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (doc) => {
        const quoteSymbol = String(doc.data().quoteSymbol);
        try {
          const quote = await fetchQuote(apiKey, quoteSymbol);
          await doc.ref.update({
            quote: { ...quote, fetchedAt: FieldValue.serverTimestamp() },
            updatedAt: FieldValue.serverTimestamp(),
          });
          updated++;
          if (quote.price > 0) alertsTriggered += await evaluateAlertsForAsset(doc.id, quote.price);
        } catch (err) {
          failed++;
          if (!firstError) firstError = `${quoteSymbol}: ${err instanceof Error ? err.message : String(err)}`;
        }
      }),
    );
    if (i + batchSize < docs.length) await sleep(6000);
  }
  if (firstError) console.error('refreshAllAssetQuotes first error:', firstError);

  return { updated, failed, total: docs.length, alertsTriggered };
}

// Scheduled every 5 minutes - keeps the Asset Management catalog's live
// quotes fresh for both admin and client reads, which hit Firestore
// directly (not this function) so this is the only thing that ever calls
// out to Finnhub for the catalog.
export const refreshAssetQuotes = onSchedule(
  { schedule: 'every 5 minutes', secrets: FINNHUB_SECRETS, timeoutSeconds: 300 },
  async () => {
    const result = await refreshAllAssetQuotes(FINNHUB_API_KEY.value());
    console.log(
      `refreshAssetQuotes: ${result.updated} updated, ${result.failed} failed of ${result.total}, ${result.alertsTriggered} alerts triggered`,
    );
  },
);

// On-demand single-asset refresh - the admin "Refresh Now" button, or a
// client wanting a fresher price than the last scheduled sweep.
export const getAssetQuote = onCall({ secrets: FINNHUB_SECRETS }, async (request) => {
  requireAuth(request);
  const symbol = String(request.data?.symbol ?? '').trim().toUpperCase();
  if (!symbol) throw new HttpsError('invalid-argument', 'symbol is required');

  const db = getFirestore();
  const ref = db.collection('assets').doc(symbol);
  const doc = await ref.get();
  if (!doc.exists) throw new HttpsError('not-found', `No asset found for ${symbol}`);

  const quoteSymbol = doc.data()?.quoteSymbol;
  if (!quoteSymbol) throw new HttpsError('failed-precondition', `${symbol} has no live quote source (reference-only)`);

  try {
    const quote = await fetchQuote(FINNHUB_API_KEY.value(), String(quoteSymbol));
    const fetchedAt = FieldValue.serverTimestamp();
    await ref.update({ quote: { ...quote, fetchedAt }, updatedAt: fetchedAt });
    if (quote.price > 0) await evaluateAlertsForAsset(symbol, quote.price);
    return { symbol, ...quote };
  } catch (err) {
    throw new HttpsError('internal', err instanceof Error ? err.message : 'Failed to fetch quote');
  }
});


// ---------------------------------------------------------------------------
// Underlying reference prices
// ---------------------------------------------------------------------------

// Every distinct underlying the catalog references, e.g. { 'GCZ7' }.
// Driven by an asset field rather than a hardcoded list so adding silver or
// an index is a catalog edit, not a redeploy.
async function underlyingTickersInUse(): Promise<string[]> {
  const snap = await getFirestore().collection('assets').get();
  const tickers = new Set<string>();
  for (const doc of snap.docs) {
    const t = doc.data()?.underlyingPriceSymbol;
    if (typeof t === 'string' && t.trim()) tickers.add(t.trim().toUpperCase());
  }
  return [...tickers];
}

export interface UnderlyingRefreshResult {
  updated: number;
  failed: number;
  /** Per-ticker outcome, so a mistyped ticker is diagnosable from the caller. */
  details: Array<{ ticker: string; ok: boolean; price?: number; asOf?: string; error?: string }>;
}

// Massive's free Futures tier allows 5 calls/minute, so requests are spaced
// rather than fired in parallel. At 13s apart a 300s timeout covers ~22
// tickers; past that the sweep needs a paid tier or batching.
const RATE_LIMIT_GAP_MS = 13_000;

async function refreshUnderlyingPrices(apiKey: string): Promise<UnderlyingRefreshResult> {
  const db = getFirestore();
  const tickers = await underlyingTickersInUse();
  const details: UnderlyingRefreshResult['details'] = [];
  let updated = 0;
  let failed = 0;

  for (const [i, ticker] of tickers.entries()) {
    if (i > 0) await sleep(RATE_LIMIT_GAP_MS);
    try {
      const bar = await fetchUnderlyingClose(apiKey, ticker);
      const ref = db.collection('marketPrices').doc(ticker.replace(/[^A-Z0-9]/g, '_'));
      const existing = await ref.get();
      await ref.set(
        { ...rollUnderlyingPrice(existing.data(), bar), fetchedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
      updated++;
      details.push({ ticker, ok: true, price: bar.price, asOf: bar.asOf });
    } catch (err) {
      // One bad ticker must not stop the rest. A stale price is visibly stale
      // (asOf stops advancing); a half-finished sweep is not.
      const message = err instanceof Error ? err.message : 'unknown error';
      console.error(`refreshUnderlyingPrices: ${ticker} failed - ${message}`);
      failed++;
      details.push({ ticker, ok: false, error: message });
    }
  }

  return { updated, failed, details };
}

// Runs before snapshotPortfolios (21:05) so the daily portfolio mark uses
// today's settlement rather than yesterday's. The gap is 20 minutes, which is
// slack for the rate-limit spacing above; widen it if the catalog grows past
// a handful of underlyings.
export const refreshUnderlyingPricesDaily = onSchedule(
  { schedule: 'every day 20:45', secrets: MASSIVE_SECRETS, timeoutSeconds: 300 },
  async () => {
    const result = await refreshUnderlyingPrices(MASSIVE_API_KEY.value());
    console.log(`refreshUnderlyingPricesDaily: ${result.updated} updated, ${result.failed} failed`);
  },
);

async function requireAdmin(request: CallableRequest): Promise<string> {
  const uid = requireAuth(request);
  const profile = await getFirestore().doc(`profiles/${uid}`).get();
  const role = profile.exists ? (profile.data()?.role as string | undefined) : undefined;
  if (!role || role === 'client') throw new HttpsError('permission-denied', 'Admins only.');
  return uid;
}

// Admin-triggerable version - seeds prices immediately after this ships
// instead of waiting for the next scheduled run.
export const runUnderlyingPriceRefreshNow = onCall({ secrets: MASSIVE_SECRETS }, async (request) => {
  await requireAdmin(request);
  return refreshUnderlyingPrices(MASSIVE_API_KEY.value());
});

// Manual daily mark, for an underlying with no automatic feed.
//
// The Futures API is what fetches these automatically, and it needs its own
// (free) Massive subscription. Until that exists, the desk posts the day's
// settlement by hand and the portfolio snapshot consumes it identically -
// snapshotAllPortfolios reads marketPrices without caring how a price got
// there. The alternative considered and rejected was deriving gold from GLD
// via the Stocks API: GLD is an ETF holding roughly 1/10 oz with expense drag
// and tracking error, so it would put an approximation on a client's P/L. That
// proxy already produced a fabricated 58% loss on this platform once.
//
// source and postedBy are recorded so a statement can always be traced back to
// who marked the book and how.
export const setUnderlyingPriceManually = onCall(async (request) => {
  const uid = await requireAdmin(request);

  const ticker = String(request.data?.ticker ?? '').trim().toUpperCase();
  const price = Number(request.data?.price);
  const asOf = String(request.data?.asOf ?? '').trim();

  if (!ticker) throw new HttpsError('invalid-argument', 'ticker is required');
  if (!Number.isFinite(price) || price <= 0) {
    throw new HttpsError('invalid-argument', 'price must be a positive number');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    throw new HttpsError('invalid-argument', 'asOf must be YYYY-MM-DD');
  }

  const db = getFirestore();
  const profile = await db.doc(`profiles/${uid}`).get();
  const ref = db.collection('marketPrices').doc(ticker.replace(/[^A-Z0-9]/g, '_'));
  const existing = await ref.get();

  await ref.set(
    {
      ...rollUnderlyingPrice(existing.data(), {
        ticker,
        price,
        priceType: 'settlement' as const,
        asOf,
        source: 'manual',
      }),
      postedBy: profile.data()?.email ?? uid,
      fetchedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { ticker, price, asOf };
});

// Read side for the admin panel. marketPrices is server-write/server-read only
// (no rules entry, so clients cannot touch it directly) - this is the one way
// staff see what the book is currently marked against.
export const listUnderlyingPrices = onCall(async (request) => {
  await requireAdmin(request);
  const db = getFirestore();

  const [tickers, pricesSnap] = await Promise.all([
    underlyingTickersInUse(),
    db.collection('marketPrices').get(),
  ]);

  const byTicker = new Map<string, Record<string, unknown>>();
  for (const doc of pricesSnap.docs) {
    const data = doc.data();
    const t = String(data.ticker ?? '').trim().toUpperCase();
    if (t) {
      byTicker.set(t, {
        ticker: t,
        price: Number(data.price ?? 0),
        priceType: data.priceType ?? null,
        asOf: data.asOf ?? null,
        source: data.source ?? null,
        postedBy: data.postedBy ?? null,
      });
    }
  }

  // Every ticker the catalog references, whether or not it has a price yet -
  // an underlying with no price is exactly what staff need to see.
  return {
    rows: tickers.map((t) => byTicker.get(t) ?? { ticker: t, price: 0, asOf: null, source: null }),
  };
});

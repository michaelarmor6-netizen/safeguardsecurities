import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
if (!getApps().length) initializeApp({ credential: applicationDefault(), projectId: 'e-bank-dashboard' });
const db = getFirestore();
const snap = await db.collection('assets').get();
const byClass = {};
for (const doc of snap.docs) {
  const d = doc.data();
  const cls = d.assetClass ?? 'unknown';
  byClass[cls] ??= { total: 0, withQuote: 0, missing: [] };
  byClass[cls].total++;
  if (d.quote?.price > 0) byClass[cls].withQuote++;
  else if (byClass[cls].missing.length < 5) byClass[cls].missing.push(`${doc.id}(${d.quoteSymbol ?? d.symbol})`);
}
for (const [cls, s] of Object.entries(byClass)) {
  console.log(`${cls}: ${s.withQuote}/${s.total} have a live quote. Missing sample: ${s.missing.join(', ')}`);
}

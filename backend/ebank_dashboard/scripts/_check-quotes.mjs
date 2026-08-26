import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
if (!getApps().length) initializeApp({ credential: applicationDefault(), projectId: 'e-bank-dashboard' });
const db = getFirestore();
for (const id of ['GC', 'AAPL', 'SPY', 'GF']) {
  const snap = await db.collection('assets').doc(id).get();
  console.log(id, JSON.stringify(snap.data()?.quote ?? null));
}

import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, orderBy, query, where, type DocumentData } from 'firebase/firestore';
import { functions, db } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';

export interface AiSignalIndicators {
  sma20: number | null;
  sma50: number | null;
  rsi14: number | null;
  macd: { macd: number; signal: number; histogram: number } | null;
  lastClose: number;
}

export interface AiSignal {
  id: string;
  symbol: string;
  side: 'buy' | 'sell' | 'hold';
  confidence: number;
  rationale: string;
  indicatorSummary: string;
  indicators: AiSignalIndicators;
  createdAt?: Date;
}

const generateFn = httpsCallable<{ symbol: string }, AiSignal>(functions, 'generateTradingSignal');

export async function generateSignal(_symbol: string): Promise<AiSignal> {
  throw new Error('Live signals are paused.');
}

function mapSignal(id: string, data: DocumentData): AiSignal {
  return {
    id,
    symbol: data.symbol ?? '',
    side: data.side ?? 'hold',
    confidence: Number(data.confidence ?? 0),
    rationale: data.rationale ?? '',
    indicatorSummary: data.indicatorSummary ?? '',
    indicators: data.indicators ?? { sma20: null, sma50: null, rsi14: null, macd: null, lastClose: 0 },
    createdAt: data.createdAt?.toDate?.(),
  };
}

export async function getSignalHistoryForUser(userId: string): Promise<AiSignal[]> {
  const snap = await getDocs(
    query(collection(db, LIVE_COLLECTIONS.aiSignals), where('userId', '==', userId), orderBy('createdAt', 'desc')),
  );
  return snap.docs.map((d) => mapSignal(d.id, d.data()));
}

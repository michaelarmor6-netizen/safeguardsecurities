import Anthropic from '@anthropic-ai/sdk';
import { computeIndicators, type IndicatorSet } from './indicators';

export interface MarketDataCredentials {
  apiKey: string;
}

/** @deprecated kept so older call sites keep compiling. */
export type FinnhubCredentials = MarketDataCredentials;

// Daily closes come from Massive (formerly Polygon), NOT Finnhub.
//
// Finnhub moved /stock/candle behind a paid plan - it returns 403 on the free
// tier, which is why the AI Engine failed while the ticker (built on /quote,
// still free) kept working. Massive's aggregates endpoint is included in every
// Stocks plan including the free tier, with two years of end-of-day history.
// That is exactly what daily indicators need, and it conveniently uses the
// same `c` field for close, so indicators.ts is untouched.
export async function fetchDailyCloses(
  creds: MarketDataCredentials,
  symbol: string,
): Promise<number[]> {
  if (!creds.apiKey) {
    throw new Error('Market data key is not configured (MASSIVE_API_KEY)');
  }

  const day = (d: Date) => d.toISOString().slice(0, 10);
  const to = new Date();
  // ~180 calendar days ≈ 124 trading days: enough warm-up for SMA50 and MACD26
  // even across a run of holidays.
  const from = new Date(to.getTime() - 180 * 24 * 60 * 60 * 1000);

  const url =
    `https://api.massive.com/v2/aggs/ticker/${encodeURIComponent(symbol)}` +
    `/range/1/day/${day(from)}/${day(to)}` +
    `?adjusted=true&sort=asc&limit=250&apiKey=${creds.apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('Market data rate limit reached — please try again in a minute');
    }
    throw new Error(`Market data request failed (${res.status})`);
  }

  const data = (await res.json()) as {
    status?: string;
    results?: Array<{ c?: number }>;
  };

  const closes = (data.results ?? [])
    .map((bar) => Number(bar.c))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (closes.length < 30) {
    throw new Error(`Not enough price history for ${symbol} to compute indicators`);
  }
  return closes;
}

const SIGNAL_SCHEMA = {
  type: 'object',
  properties: {
    side: { type: 'string', enum: ['buy', 'sell', 'hold'] },
    confidence: { type: 'number' },
    rationale: { type: 'string' },
    indicatorSummary: { type: 'string' },
  },
  required: ['side', 'confidence', 'rationale', 'indicatorSummary'],
  additionalProperties: false,
} as const;

export interface AiSignalResult {
  side: 'buy' | 'sell' | 'hold';
  confidence: number;
  rationale: string;
  indicatorSummary: string;
}

export async function generateSignalFromIndicators(
  anthropicApiKey: string,
  symbol: string,
  indicators: IndicatorSet,
): Promise<AiSignalResult> {
  const client = new Anthropic({ apiKey: anthropicApiKey });

  const context = {
    symbol,
    lastClose: indicators.lastClose,
    sma20: indicators.sma20,
    sma50: indicators.sma50,
    rsi14: indicators.rsi14,
    macd: indicators.macd,
  };

  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: SIGNAL_SCHEMA },
    },
    system:
      'You are a cautious equity technical-analysis assistant for a brokerage app. You are given real, precomputed ' +
      'technical indicators for one symbol (SMA20, SMA50, RSI14, MACD). Reason over them and produce a single ' +
      'buy/sell/hold recommendation with a confidence between 0 and 1 and a short, plain-language rationale that ' +
      'references the actual indicator values. Be conservative: prefer "hold" when signals conflict or are weak. ' +
      'Do not claim certainty and do not reference information you were not given.',
    messages: [
      {
        role: 'user',
        content: `Technical indicators for ${symbol}:\n${JSON.stringify(context, null, 2)}\n\nProvide your recommendation.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('AI response contained no text output');
  }
  const parsed = JSON.parse(textBlock.text) as AiSignalResult;
  return parsed;
}

export interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

const CACHE = new Map<string, { data: MarketQuote; ts: number }>();
const CACHE_MS = 60_000;
const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY;

async function fetchFinnhubQuote(symbol: string): Promise<MarketQuote | null> {
  if (!FINNHUB_KEY) return null;

  const cacheKey = `finnhub_${symbol}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_MS) return cached.data;

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data.c !== 'number') return null;
    const quote: MarketQuote = {
      symbol,
      price: data.c || 0,
      change: (data.c || 0) - (data.pc || 0),
      changePercent: data.pc ? ((data.c - data.pc) / data.pc) * 100 : 0,
    };
    CACHE.set(cacheKey, { data: quote, ts: Date.now() });
    return quote;
  } catch {
    return null;
  }
}

export async function getQuote(symbol: string, fallbackPrice = 0): Promise<MarketQuote> {
  const live = await fetchFinnhubQuote(symbol);
  if (live && live.price > 0) return live;
  return { symbol, price: fallbackPrice, change: 0, changePercent: 0 };
}

export async function getTickerQuotes(symbols: string[]): Promise<MarketQuote[]> {
  const unique = [...new Set(symbols.filter(Boolean))].slice(0, 8);
  if (unique.length === 0) {
    return Promise.all(['AAPL', 'MSFT', 'GOOGL', 'TSLA'].map((s) => getQuote(s)));
  }
  return Promise.all(unique.map((s) => getQuote(s)));
}

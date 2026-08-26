export interface FinnhubNewsItem {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string;
  datetime: number; // unix seconds
  category: string;
}

export async function fetchMarketNews(apiKey: string, category = 'general'): Promise<FinnhubNewsItem[]> {
  const url = `https://finnhub.io/api/v1/news?category=${encodeURIComponent(category)}&token=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub news request failed (${res.status})`);
  const data = (await res.json()) as Array<Record<string, unknown>>;
  if (!Array.isArray(data)) throw new Error('Unexpected response from Finnhub news');
  return data.slice(0, 30).map((d) => ({
    id: Number(d.id ?? 0),
    headline: String(d.headline ?? ''),
    summary: String(d.summary ?? ''),
    source: String(d.source ?? ''),
    url: String(d.url ?? ''),
    image: String(d.image ?? ''),
    datetime: Number(d.datetime ?? 0),
    category: String(d.category ?? ''),
  }));
}

export interface FinnhubQuote {
  price: number;
  change: number;
  changePercent: number;
}

export async function fetchQuote(apiKey: string, symbol: string): Promise<FinnhubQuote> {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub quote request failed (${res.status})`);
  const data = (await res.json()) as { c?: number; d?: number; dp?: number };
  return {
    price: Number(data.c ?? 0),
    change: Number(data.d ?? 0),
    changePercent: Number(data.dp ?? 0),
  };
}

export interface CompanyProfile {
  name: string;
  ticker: string;
  exchange: string;
  finnhubIndustry: string;
  country: string;
  marketCapitalization: number;
  shareOutstanding: number;
  logo: string;
  weburl: string;
  ipo: string;
  currency: string;
}

export async function fetchCompanyProfile(apiKey: string, symbol: string): Promise<CompanyProfile> {
  const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub profile request failed (${res.status})`);
  const data = (await res.json()) as Partial<CompanyProfile>;
  if (!data || !data.name) throw new Error(`No company profile found for ${symbol}`);
  return data as CompanyProfile;
}

export interface CompanyMetrics {
  peBasicExclExtraTTM?: number;
  epsBasicExclExtraItemsTTM?: number;
  '52WeekHigh'?: number;
  '52WeekLow'?: number;
  dividendYieldIndicatedAnnual?: number;
  beta?: number;
  roeTTM?: number;
  netMarginTTM?: number;
  revenueGrowthTTMYoy?: number;
}

export async function fetchCompanyMetrics(apiKey: string, symbol: string): Promise<CompanyMetrics> {
  const url = `https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub metrics request failed (${res.status})`);
  const data = (await res.json()) as { metric?: CompanyMetrics };
  return data.metric ?? {};
}

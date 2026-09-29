export interface MarketNewsItem {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string;
  datetime: number;
  category: string;
}

export async function getMarketNews(_category = 'general'): Promise<MarketNewsItem[]> {
  // Live news runs on Cloud Run. It stays off until the feeds are turned back on.
  return [];
}

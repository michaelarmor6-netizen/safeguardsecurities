import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';

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

const getMarketNewsFn = httpsCallable<{ category?: string }, MarketNewsItem[]>(functions, 'getMarketNews');

export async function getMarketNews(category = 'general'): Promise<MarketNewsItem[]> {
  const res = await getMarketNewsFn({ category });
  return res.data;
}

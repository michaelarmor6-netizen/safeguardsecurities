import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';

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

export interface CompanyResearch {
  profile: CompanyProfile;
  metrics: CompanyMetrics;
}

const getCompanyResearchFn = httpsCallable<{ symbol: string }, CompanyResearch>(functions, 'getCompanyResearch');

export async function getCompanyResearch(_symbol: string): Promise<CompanyResearch> {
  throw new Error('Company research is paused.');
}

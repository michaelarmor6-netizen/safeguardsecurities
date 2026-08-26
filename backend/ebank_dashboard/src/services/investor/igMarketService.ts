import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';

export interface IgMarketSnapshot {
  epic: string;
  name: string;
  bid: number | null;
  offer: number | null;
  high: number | null;
  low: number | null;
  netChange: number | null;
  percentageChange: number | null;
  updateTime: string | null;
  marketStatus: string | null;
}

export interface IgCandle {
  time: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
}

export interface IgMarketResult {
  epic: string;
  instrumentName: string;
  instrumentType: string;
  expiry: string;
}

const snapshotFn = httpsCallable<{ epic: string }, IgMarketSnapshot>(functions, 'igMarketSnapshot');
const historyFn = httpsCallable<{ epic: string; resolution?: string; max?: number }, IgCandle[]>(functions, 'igMarketHistory');
const searchFn = httpsCallable<{ searchTerm: string }, IgMarketResult[]>(functions, 'igSearchMarkets');

export async function getIgMarketSnapshot(epic: string): Promise<IgMarketSnapshot> {
  const res = await snapshotFn({ epic });
  return res.data;
}

export async function getIgMarketHistory(epic: string, resolution = 'MINUTE_5', max = 100): Promise<IgCandle[]> {
  const res = await historyFn({ epic, resolution, max });
  return res.data;
}

export async function searchIgMarkets(searchTerm: string): Promise<IgMarketResult[]> {
  const res = await searchFn({ searchTerm });
  return res.data;
}

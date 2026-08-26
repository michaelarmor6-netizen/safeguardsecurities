import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';

export type SubPortfolioAssetClass = 'equities' | 'crypto' | 'commodities' | 'managed_strategy';
export type SubPortfolioRiskBand = 'conservative' | 'moderate' | 'aggressive';
export type SubPortfolioStatus = 'active' | 'paused' | 'closed';

export interface SubPortfolio {
  id: string;
  userId: string;
  name: string;
  assetClass: SubPortfolioAssetClass;
  baseCurrency: string;
  targetAllocationPct?: number;
  riskBand?: SubPortfolioRiskBand;
  status: SubPortfolioStatus;
}

export interface SubPortfolioHolding {
  id: string;
  subPortfolioId: string;
  userId: string;
  symbol: string;
  displayName?: string;
  quantity: number;
  avgCost: number;
  markPrice?: number;
  unitLabel: string;
  currency: string;
}

function mapSleeve(id: string, data: DocumentData): SubPortfolio {
  return {
    id,
    userId: data.userId ?? '',
    name: data.name ?? '',
    assetClass: data.assetClass ?? 'equities',
    baseCurrency: data.baseCurrency ?? 'USD',
    targetAllocationPct: data.targetAllocationPct != null ? Number(data.targetAllocationPct) : undefined,
    riskBand: data.riskBand ?? undefined,
    status: data.status ?? 'active',
  };
}

function mapHolding(id: string, data: DocumentData): SubPortfolioHolding {
  return {
    id,
    subPortfolioId: data.subPortfolioId ?? '',
    userId: data.userId ?? '',
    symbol: data.symbol ?? '',
    displayName: data.displayName,
    quantity: Number(data.quantity ?? 0),
    avgCost: Number(data.avgCost ?? 0),
    markPrice: data.markPrice != null ? Number(data.markPrice) : undefined,
    unitLabel: data.unitLabel ?? 'shares',
    currency: data.currency ?? 'USD',
  };
}

export async function getSubPortfoliosForUser(userId: string): Promise<SubPortfolio[]> {
  const snap = await getDocs(query(collection(db, LIVE_COLLECTIONS.subPortfolios), where('userId', '==', userId)));
  return snap.docs.map((d) => mapSleeve(d.id, d.data()));
}

export async function createSubPortfolio(input: Omit<SubPortfolio, 'id' | 'status'>) {
  return addDoc(collection(db, LIVE_COLLECTIONS.subPortfolios), {
    ...input,
    status: 'active',
    createdAt: new Date(),
  });
}

export async function updateSubPortfolio(id: string, patch: Partial<Pick<SubPortfolio, 'name' | 'targetAllocationPct' | 'riskBand' | 'status'>>) {
  await updateDoc(doc(db, LIVE_COLLECTIONS.subPortfolios, id), { ...patch, updatedAt: new Date() });
}

export async function deleteSubPortfolio(id: string) {
  const holdings = await getDocs(query(collection(db, LIVE_COLLECTIONS.subPortfolioHoldings), where('subPortfolioId', '==', id)));
  await Promise.all(holdings.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, LIVE_COLLECTIONS.subPortfolios, id));
}

export async function getHoldingsForSleeve(subPortfolioId: string): Promise<SubPortfolioHolding[]> {
  const snap = await getDocs(
    query(collection(db, LIVE_COLLECTIONS.subPortfolioHoldings), where('subPortfolioId', '==', subPortfolioId)),
  );
  return snap.docs.map((d) => mapHolding(d.id, d.data()));
}

export async function addHoldingToSleeve(input: Omit<SubPortfolioHolding, 'id'>) {
  const id = `${input.subPortfolioId}_${input.symbol.toUpperCase()}`;
  await setDoc(doc(db, LIVE_COLLECTIONS.subPortfolioHoldings, id), {
    ...input,
    symbol: input.symbol.toUpperCase(),
    updatedAt: new Date(),
  });
}

export async function updateSleeveHolding(id: string, patch: Partial<Pick<SubPortfolioHolding, 'quantity' | 'avgCost' | 'markPrice'>>) {
  await updateDoc(doc(db, LIVE_COLLECTIONS.subPortfolioHoldings, id), { ...patch, updatedAt: new Date() });
}

export async function deleteSleeveHolding(id: string) {
  await deleteDoc(doc(db, LIVE_COLLECTIONS.subPortfolioHoldings, id));
}

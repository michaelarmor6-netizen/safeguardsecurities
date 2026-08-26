import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';

// Kept in sync with the Asset Type list in Settings -> Trading Configuration
// (AdminTradingConfigSection.tsx) - an instrument added there under any of
// these types must also be selectable in Trade Entry, or it's uncatalogable
// once created.
export type AssetClass =
  | 'commodity_future'
  | 'equity'
  | 'etf'
  | 'benchmark_index'
  | 'fx'
  | 'crypto'
  | 'option'
  | 'warrant'
  | 'bond'
  | 'other';
export type AssetPriority = 'core' | 'extended';

// Single source of truth for "which asset classes exist" - every UI that
// offers a class/type picker (Trade Entry, Asset Management, Settings ->
// Trading Configuration) should derive its options from this array so they
// can't silently drift out of sync with each other again.
export const ASSET_CLASSES: AssetClass[] = [
  'commodity_future',
  'equity',
  'etf',
  'benchmark_index',
  'fx',
  'crypto',
  'option',
  'warrant',
  'bond',
  'other',
];

export interface AssetGroup {
  id: string;
  label: string;
  assetClass: AssetClass;
  parentLabel: string;
  sortOrder: number;
  description?: string;
}

export interface AssetQuote {
  price: number;
  change: number;
  changePercent: number;
  fetchedAt?: Date;
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  groupId: string;
  exchange?: string;
  sector?: string;
  contractUnit?: string;
  priority: AssetPriority;
  quoteSymbol: string | null;
  /**
   * Massive FUTURES ticker for the underlying this instrument is marked
   * against, e.g. 'GCZ7' for a Dec-2027 gold contract. Distinct from
   * quoteSymbol: that is a Finnhub proxy quote for the instrument itself (and
   * for raw futures it is null), while this drives limited-risk option P/L.
   * Without it an option position can only ever be marked at cost.
   */
  underlyingPriceSymbol: string | null;
  dataProvider: 'finnhub';
  quote?: AssetQuote;
  isTradable: boolean;
  isActive: boolean;
  sortOrder?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

function mapGroup(id: string, data: DocumentData): AssetGroup {
  return {
    id,
    label: data.label,
    assetClass: data.assetClass,
    parentLabel: data.parentLabel,
    sortOrder: data.sortOrder ?? 0,
    description: data.description,
  };
}

function mapAsset(id: string, data: DocumentData): Asset {
  return {
    id,
    symbol: data.symbol,
    name: data.name,
    assetClass: data.assetClass,
    groupId: data.groupId,
    exchange: data.exchange,
    sector: data.sector,
    contractUnit: data.contractUnit,
    priority: data.priority ?? 'core',
    quoteSymbol: data.quoteSymbol ?? null,
    underlyingPriceSymbol: data.underlyingPriceSymbol ?? null,
    dataProvider: data.dataProvider ?? 'finnhub',
    quote: data.quote
      ? {
          price: data.quote.price,
          change: data.quote.change,
          changePercent: data.quote.changePercent,
          fetchedAt: data.quote.fetchedAt?.toDate?.() ?? undefined,
        }
      : undefined,
    isTradable: Boolean(data.isTradable),
    isActive: data.isActive ?? true,
    sortOrder: data.sortOrder,
    createdAt: data.createdAt?.toDate?.() ?? undefined,
    updatedAt: data.updatedAt?.toDate?.() ?? undefined,
  };
}

export async function getAssetGroups(assetClass?: AssetClass): Promise<AssetGroup[]> {
  const base = collection(db, LIVE_COLLECTIONS.assetGroups);
  const q = assetClass
    ? query(base, where('assetClass', '==', assetClass), orderBy('sortOrder', 'asc'))
    : query(base, orderBy('sortOrder', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapGroup(d.id, d.data()));
}

export async function getAllAssets(assetClass?: AssetClass): Promise<Asset[]> {
  const base = collection(db, LIVE_COLLECTIONS.assets);
  const q = assetClass
    ? query(base, where('assetClass', '==', assetClass), where('isActive', '==', true))
    : query(base, where('isActive', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapAsset(d.id, d.data()));
}

export async function getAssetsByGroup(groupId: string): Promise<Asset[]> {
  const q = query(
    collection(db, LIVE_COLLECTIONS.assets),
    where('groupId', '==', groupId),
    where('isActive', '==', true),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapAsset(d.id, d.data()));
}

export function searchAssets(assets: Asset[], query: string): Asset[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return assets;
  return assets.filter(
    (a) => a.symbol.toLowerCase().includes(needle) || a.name.toLowerCase().includes(needle),
  );
}

export function subscribeToAsset(symbol: string, cb: (asset: Asset | null) => void): Unsubscribe {
  return onSnapshot(doc(db, LIVE_COLLECTIONS.assets, symbol), (snap) => {
    cb(snap.exists() ? mapAsset(snap.id, snap.data()) : null);
  });
}

// Admin catalog management
export async function createOrUpdateAsset(asset: Omit<Asset, 'quote' | 'createdAt' | 'updatedAt'>) {
  const ref = doc(db, LIVE_COLLECTIONS.assets, asset.id);
  const existing = await getDoc(ref);
  await setDoc(
    ref,
    {
      ...asset,
      updatedAt: new Date(),
      ...(existing.exists() ? {} : { createdAt: new Date() }),
    },
    { merge: true },
  );
}

export async function setAssetTradable(id: string, isTradable: boolean) {
  await updateDoc(doc(db, LIVE_COLLECTIONS.assets, id), { isTradable, updatedAt: new Date() });
}

export async function setAssetActive(id: string, isActive: boolean) {
  await updateDoc(doc(db, LIVE_COLLECTIONS.assets, id), { isActive, updatedAt: new Date() });
}

const getAssetQuoteFn = httpsCallable<{ symbol: string }, { symbol: string; price: number; change: number; changePercent: number }>(
  functions,
  'getAssetQuote',
);

export async function refreshAssetQuote(symbol: string) {
  const res = await getAssetQuoteFn({ symbol });
  return res.data;
}

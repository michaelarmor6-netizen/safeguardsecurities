import type { AssetClass } from '../services/investor/assetCatalogService';

// Per-asset-class vocabulary.
//
// "Shares" and "Avg Price" are equity terms. A gold futures position is held in
// CONTRACTS at a CONTRACT PRICE, and showing it as shares is simply wrong -
// it also stops the client workspace matching the admin trade-entry form,
// which already says "Number of contracts" / "Contract price".

export interface AssetTerms {
  /** Column header for the position size. */
  quantityLabel: string;
  /** Column header for the entry cost. */
  costLabel: string;
  /** Singular unit, for inline use ("10 contracts"). */
  unit: string;
  unitPlural: string;
}

const EQUITY: AssetTerms = {
  quantityLabel: 'Shares',
  costLabel: 'Avg Price',
  unit: 'share',
  unitPlural: 'shares',
};

const CONTRACTS: AssetTerms = {
  quantityLabel: 'Contracts',
  costLabel: 'Contract Price',
  unit: 'contract',
  unitPlural: 'contracts',
};

const UNITS: AssetTerms = {
  quantityLabel: 'Units',
  costLabel: 'Avg Price',
  unit: 'unit',
  unitPlural: 'units',
};

const TERMS: Record<AssetClass, AssetTerms> = {
  equity: EQUITY,
  etf: EQUITY,
  warrant: EQUITY,
  commodity_future: CONTRACTS,
  option: { ...CONTRACTS, costLabel: 'Avg Premium' },
  fx: { ...UNITS, costLabel: 'Avg Rate' },
  crypto: UNITS,
  benchmark_index: { ...UNITS, costLabel: 'Avg Level' },
  bond: { quantityLabel: 'Nominal', costLabel: 'Avg Price', unit: 'unit', unitPlural: 'units' },
  other: { quantityLabel: 'Quantity', costLabel: 'Avg Cost', unit: 'unit', unitPlural: 'units' },
};

const NEUTRAL: AssetTerms = TERMS.other;

export function termsFor(assetClass?: AssetClass | null): AssetTerms {
  return assetClass ? TERMS[assetClass] ?? NEUTRAL : NEUTRAL;
}

/**
 * Headings for a table that may mix asset classes: use the specific vocabulary
 * when every row agrees, otherwise fall back to neutral wording rather than
 * labelling futures as shares.
 */
export function termsForSet(classes: Array<AssetClass | null | undefined>): AssetTerms {
  const present = Array.from(new Set(classes.filter(Boolean))) as AssetClass[];
  if (present.length === 1) return termsFor(present[0]);
  return NEUTRAL;
}

export function formatQuantity(qty: number, assetClass?: AssetClass | null): string {
  const t = termsFor(assetClass);
  const n = Number.isInteger(qty) ? qty.toString() : qty.toFixed(4);
  return `${n} ${Math.abs(qty) === 1 ? t.unit : t.unitPlural}`;
}

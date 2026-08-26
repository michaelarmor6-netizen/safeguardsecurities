// Generates the standard futures contract-month code sequence for a root
// symbol (e.g. "GC" -> "GCZ26") without needing each month pre-seeded as its
// own catalog document. Prices for these are always admin-entered at fill
// time (this platform never auto-prices any fill), so there's nothing to
// quote per contract month - only the symbol/label needs generating.
//
// Listing convention: every calendar month for the near term, then just
// June/December further out, capped at a total horizon - this mirrors how
// CME actually lists precious metals/energy contracts (dense near months,
// sparse far months) without needing an exact per-commodity exchange feed.

const MONTH_CODES = ['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface ContractMonthOption {
  symbol: string;
  label: string;
}

export interface CommodityContractConfig {
  root: string;
  label: string;
  includeCash: boolean;
}

// The commodities wired for the contract-month picker so far - add more
// roots here as they're rolled out.
export const CONTRACT_MONTH_COMMODITIES: CommodityContractConfig[] = [
  { root: 'GC', label: 'Gold', includeCash: true },
  { root: 'SI', label: 'Silver', includeCash: true },
  { root: 'RB', label: 'Gasoline RBOB', includeCash: false },
];

export function generateFuturesContractMonths(
  root: string,
  { includeCash = false, monthlyYears = 2, totalYears = 6 }: { includeCash?: boolean; monthlyYears?: number; totalYears?: number } = {},
): ContractMonthOption[] {
  const now = new Date();
  const options: ContractMonthOption[] = [];

  if (includeCash) {
    options.push({ symbol: `${root}Y00`, label: 'Cash' });
  }

  const monthlyCutoff = new Date(now.getFullYear() + monthlyYears, 11, 31);
  const horizonCutoff = new Date(now.getFullYear() + totalYears, now.getMonth(), 1);

  let cursor = new Date(now.getFullYear(), now.getMonth(), 1);
  while (cursor <= horizonCutoff) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const isNearTerm = cursor <= monthlyCutoff;
    const isSemiAnnual = month === 5 || month === 11; // Jun or Dec

    if (isNearTerm || isSemiAnnual) {
      options.push({
        symbol: `${root}${MONTH_CODES[month]}${String(year).slice(-2)}`,
        label: `${MONTH_LABELS[month]} '${String(year).slice(-2)}`,
      });
    }
    cursor = new Date(year, month + 1, 1);
  }

  return options;
}

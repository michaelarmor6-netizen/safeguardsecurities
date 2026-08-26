// Limited-risk option payoff - server copy.
//
// SOURCE OF TRUTH: src/lib/optionValuation.ts. This is a deliberate duplicate,
// not an oversight: functions-trading is a separate Cloud Functions codebase
// with its own package.json and tsconfig, so it cannot import from the app's
// src/. If you change the payoff, change BOTH - a client workspace and a
// statement that disagree about a client's P/L is the worst outcome here.
//
//   P/L   = (mark - entry) x multiplier x contracts,  floored at -premiumPaid
//   Value = premiumPaid + P/L,                        floored at 0

export interface OptionPosition {
  contracts: number;
  premiumPerContract: number;
  entryUnderlyingPrice: number;
  multiplier: number;
}

export interface OptionValuation {
  premiumPaid: number;
  grossPnl: number;
  pnl: number;
  value: number;
  maxLoss: number;
  isCapped: boolean;
  underlyingMove: number;
}

function isUsable(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

/**
 * Returns null when the inputs cannot support a valuation - a position opened
 * before entryUnderlyingPrice was recorded, or an underlying with no price.
 * Callers must fall back to marking at cost rather than inventing a number.
 */
export function valueOptionPosition(
  pos: OptionPosition,
  markUnderlyingPrice: number,
): OptionValuation | null {
  const { contracts, premiumPerContract, entryUnderlyingPrice, multiplier } = pos;

  if (
    !isUsable(contracts) ||
    !isUsable(premiumPerContract) ||
    !isUsable(entryUnderlyingPrice) ||
    !isUsable(multiplier) ||
    !isUsable(markUnderlyingPrice) ||
    contracts <= 0 ||
    entryUnderlyingPrice <= 0 ||
    multiplier <= 0 ||
    markUnderlyingPrice <= 0
  ) {
    return null;
  }

  const premiumPaid = premiumPerContract * contracts;
  const underlyingMove = markUnderlyingPrice - entryUnderlyingPrice;
  const grossPnl = underlyingMove * multiplier * contracts;

  // Limited risk: losses stop at the premium paid.
  const pnl = Math.max(grossPnl, -premiumPaid);

  return {
    premiumPaid,
    grossPnl,
    pnl,
    value: Math.max(0, premiumPaid + pnl),
    maxLoss: premiumPaid,
    isCapped: grossPnl < -premiumPaid,
    underlyingMove,
  };
}
// Kept in sync with src/lib/optionValuation.ts. Not currently imported by any
// Cloud Function, but present so the two copies stay identical - the moment a
// statement or snapshot needs a fee or break-even, it must not silently get a
// stale or missing function.
export function applyBrokerageFee(
  pnl: number,
  feeRatePercent: number,
): { fee: number; netPnl: number } {
  if (!isUsable(pnl) || !isUsable(feeRatePercent) || pnl <= 0 || feeRatePercent <= 0) {
    return { fee: 0, netPnl: isUsable(pnl) ? pnl : 0 };
  }
  const fee = pnl * (feeRatePercent / 100);
  return { fee, netPnl: pnl - fee };
}

export function breakEvenPrice(pos: OptionPosition): number | null {
  const { premiumPerContract, entryUnderlyingPrice, multiplier } = pos;
  if (
    !isUsable(premiumPerContract) ||
    !isUsable(entryUnderlyingPrice) ||
    !isUsable(multiplier) ||
    multiplier <= 0
  ) {
    return null;
  }
  return entryUnderlyingPrice + premiumPerContract / multiplier;
}

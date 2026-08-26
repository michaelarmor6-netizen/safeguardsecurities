// Limited-risk option payoff.
//
// SafeGuard is the counterparty and this payoff IS the contract, so the maths
// below is the product definition rather than an approximation of exchange
// option pricing. It is deliberately linear: every $1 the underlying moves in
// the client's favour pays `multiplier` dollars per contract, regardless of
// strike, time to expiry, or implied volatility.
//
//   P/L    = (mark - entry) x multiplier x contracts,  floored at -premiumPaid
//   Value  = premiumPaid + P/L,                        floored at 0
//
// The floor is what makes the product limited-risk: the client can never lose
// more than the premium they paid. It is not a display nicety - without it the
// platform would show clients losses they do not owe. Gold: multiplier 100
// (troy oz per contract), so a $100 move pays $10,000 per contract.
//
// Pure functions, no I/O, so the same file can be used by the client workspace
// and by Cloud Functions (statements, snapshots) - one definition of the
// payoff rather than three that drift apart.

export interface OptionPosition {
  /** Number of contracts held. */
  contracts: number;
  /** Premium paid per contract, in account currency (e.g. 1008). */
  premiumPerContract: number;
  /** Underlying price at entry, per unit (e.g. 4300 per troy oz). */
  entryUnderlyingPrice: number;
  /** Units of underlying controlled per contract (e.g. 100 troy oz). */
  multiplier: number;
}

export interface OptionValuation {
  /** Total premium outlay - also the maximum possible loss. */
  premiumPaid: number;
  /** Uncapped payoff, before the limited-risk floor. Shown for reference only. */
  grossPnl: number;
  /** Payoff after the floor. Never worse than -premiumPaid. */
  pnl: number;
  /** Current position value: premium + pnl, never below zero. */
  value: number;
  /** Same as premiumPaid; named separately because it reads clearer at call sites. */
  maxLoss: number;
  /** True when the floor bound the loss - i.e. the position is a total write-off. */
  isCapped: boolean;
  /** Move in the underlying since entry, per unit. */
  underlyingMove: number;
}

function isUsable(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

/**
 * Value a position against a current underlying price.
 *
 * Returns null when the inputs cannot support a valuation - most often a
 * position opened before entryUnderlyingPrice was recorded, or an instrument
 * with no live underlying price. Callers should fall back to marking at cost
 * rather than inventing a number.
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
  const isCapped = grossPnl < -premiumPaid;

  return {
    premiumPaid,
    grossPnl,
    pnl,
    value: Math.max(0, premiumPaid + pnl),
    maxLoss: premiumPaid,
    isCapped,
    underlyingMove,
  };
}

/**
 * Brokerage fee, charged on gross profit only.
 *
 * A losing position is not additionally charged a fee - the client has already
 * lost the premium, which is the whole of their risk.
 */
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

/** Break-even underlying price: where the payoff exactly repays the premium. */
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

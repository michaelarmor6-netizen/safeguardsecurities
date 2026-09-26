// Limited-risk option payoff.
//
// SafeGuard is the counterparty and this payoff IS the contract, so the maths
// below is the product definition rather than an approximation of exchange
// option pricing. It is deliberately linear, measured from the broker's strike
// to the running underlying price:
//
//   Call  favorable move = current - strike     (price up)
//   Put   favorable move = strike - current     (price down)
//   P/L   = favorable move x $100 x contracts,  floored at -premiumPaid
//   Value = premiumPaid + P/L,                  floored at 0
//
// One dollar in the client's favor pays $100 per contract they hold. A dollar
// against them loses $100 per contract, and the loss stops at the premium
// paid. The floor is the limited-risk term: without it the platform would
// show clients losses they do not owe.
//
// Pure functions, no I/O, so the same file can be used by the client workspace
// and by Cloud Functions (statements, snapshots) - one definition of the
// payoff rather than three that drift apart.

/** Dollars of P/L per $1 favorable move, per contract. */
export const OPTION_DOLLARS_PER_POINT = 100;

export type OptionSide = 'call' | 'put';

export interface OptionPosition {
  /** Number of contracts held. */
  contracts: number;
  /** Premium paid per contract, in account currency (e.g. 1008). */
  premiumPerContract: number;
  /** Broker strike. P/L is measured from this price to the current underlying. */
  strikePrice: number;
  /** Call profits when the underlying rises; put profits when it falls. */
  optionType: OptionSide;
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
  /** Points in the client's favor since the strike. Negative when the move is against them. */
  underlyingMove: number;
}

function isUsable(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

export function isOptionSide(value: unknown): value is OptionSide {
  return value === 'call' || value === 'put';
}

/**
 * On the day a contract is opened, the broker's strike is always below the
 * current underlying price. Equal is not enough — the contract is entered
 * with the market already above the strike.
 */
export function strikeBelowEntryPrice(strikePrice: number, currentPrice: number): boolean {
  return isUsable(strikePrice) && isUsable(currentPrice) && strikePrice > 0 && currentPrice > 0 && strikePrice < currentPrice;
}

/**
 * Points in the client's favor from the strike to the current price.
 * Call: current above strike. Put: current below strike.
 */
export function favorableMove(optionType: OptionSide, strikePrice: number, currentPrice: number): number {
  return optionType === 'call' ? currentPrice - strikePrice : strikePrice - currentPrice;
}

/**
 * Value a position against the running underlying price.
 *
 * Returns null when the inputs cannot support a valuation - no strike, no
 * call/put, or no current price. Callers should fall back to marking at cost
 * rather than inventing a number.
 */
export function valueOptionPosition(
  pos: OptionPosition,
  currentPrice: number,
): OptionValuation | null {
  const { contracts, premiumPerContract, strikePrice, optionType } = pos;

  if (
    !isUsable(contracts) ||
    !isUsable(premiumPerContract) ||
    !isUsable(strikePrice) ||
    !isUsable(currentPrice) ||
    !isOptionSide(optionType) ||
    contracts <= 0 ||
    strikePrice <= 0 ||
    currentPrice <= 0
  ) {
    return null;
  }

  const premiumPaid = premiumPerContract * contracts;
  const underlyingMove = favorableMove(optionType, strikePrice, currentPrice);
  const grossPnl = underlyingMove * OPTION_DOLLARS_PER_POINT * contracts;

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

/** Unrealized return on premium, in percent. Zero when nothing was paid. */
export function optionReturnPercent(valuation: OptionValuation): number {
  if (!isUsable(valuation.premiumPaid) || valuation.premiumPaid <= 0) return 0;
  return (valuation.pnl / valuation.premiumPaid) * 100;
}

/**
 * Change in position value between two underlying prices.
 * Both prices pass through the limited-risk floor, so a position already
 * written off does not keep losing on a further adverse move.
 */
export function optionSessionPnl(
  pos: OptionPosition,
  currentPrice: number,
  previousPrice: number,
): number | null {
  const today = valueOptionPosition(pos, currentPrice);
  const prior = valueOptionPosition(pos, previousPrice);
  if (!today || !prior) return null;
  return today.value - prior.value;
}

/**
 * One holding's unrealized P/L.
 * Option books use the payoff (already floored at the premium). Everything
 * else is value minus cost. Callers must sum this per holding: folding a
 * whole portfolio into the option figure alone drops every other position's
 * move, so the headline P/L stays still while those prices change.
 */
export function unrealizedGain(input: {
  optionPnl?: number;
  value: number;
  quantity: number;
  averagePrice: number;
}): number {
  if (typeof input.optionPnl === 'number' && Number.isFinite(input.optionPnl)) return input.optionPnl;
  const value = Number(input.value);
  const cost = Number(input.quantity) * Number(input.averagePrice);
  if (!Number.isFinite(value) || !Number.isFinite(cost)) return 0;
  return value - cost;
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

/** Underlying price at which the payoff exactly repays the premium. */
export function breakEvenPrice(pos: OptionPosition): number | null {
  const { premiumPerContract, strikePrice, optionType } = pos;
  if (
    !isUsable(premiumPerContract) ||
    !isUsable(strikePrice) ||
    !isOptionSide(optionType) ||
    strikePrice <= 0
  ) {
    return null;
  }
  const points = premiumPerContract / OPTION_DOLLARS_PER_POINT;
  return optionType === 'call' ? strikePrice + points : strikePrice - points;
}

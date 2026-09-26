import { describe, expect, it } from 'vitest';
import { breakEvenPrice, optionReturnPercent, optionSessionPnl, strikeBelowEntryPrice, unrealizedGain, valueOptionPosition } from './optionValuation';

const call = {
  contracts: 1,
  premiumPerContract: 1008,
  strikePrice: 4300,
  optionType: 'call' as const,
};

const put = { ...call, optionType: 'put' as const };

describe('strike versus current price', () => {
  it('pays a call $100 per contract for each $1 the price rises above the strike', () => {
    expect(valueOptionPosition(call, 4301)?.pnl).toBe(100);
    expect(valueOptionPosition({ ...call, contracts: 3 }, 4310)?.pnl).toBe(3000);
    const today = valueOptionPosition(call, 4310);
    expect(today?.pnl).toBe(1000);
    expect(optionReturnPercent(today!)).toBeCloseTo((1000 / 1008) * 100);
  });

  it('pays a put $100 per contract for each $1 the price falls below the strike', () => {
    expect(valueOptionPosition(put, 4299)?.pnl).toBe(100);
    expect(valueOptionPosition({ ...put, contracts: 2 }, 4290)?.pnl).toBe(2000);
    // The same upward move that profits a call loses money on a put.
    expect(valueOptionPosition(put, 4310)?.pnl).toBe(-1000);
  });

  it('requires the strike to be below the current price on the day the contract is entered', () => {
    expect(strikeBelowEntryPrice(4200, 4300)).toBe(true);
    expect(strikeBelowEntryPrice(4300, 4300)).toBe(false);
    expect(strikeBelowEntryPrice(4400, 4300)).toBe(false);
  });

  it('is flat when the current price equals the strike', () => {
    expect(valueOptionPosition(call, 4300)?.pnl).toBe(0);
    expect(valueOptionPosition(put, 4300)?.pnl).toBe(0);
  });

  it('stops the loss at the premium', () => {
    expect(valueOptionPosition(call, 4000)?.pnl).toBe(-1008);
    expect(valueOptionPosition(put, 4600)?.pnl).toBe(-1008);
    expect(optionSessionPnl(call, 3900, 4000)).toBe(0);
  });

  it('moves the session figure with the current price', () => {
    expect(optionSessionPnl(call, 4310, 4300)).toBe(1000);
    expect(optionSessionPnl(put, 4290, 4300)).toBe(1000);
  });

  it('places break-even one premium-worth of points through the strike', () => {
    expect(breakEvenPrice(call)).toBeCloseTo(4300 + 1008 / 100);
    expect(breakEvenPrice(put)).toBeCloseTo(4300 - 1008 / 100);
  });

  it('sums each holding, so a flat option does not freeze the rest of the book', () => {
    const holdings = [
      { optionPnl: 0, value: 1008, quantity: 1, averagePrice: 1008 },
      { value: 150, quantity: 2, averagePrice: 50 },
    ];
    expect(holdings.reduce((sum, h) => sum + unrealizedGain(h), 0)).toBe(50);
  });
});

import { describe, it, expect } from 'vitest';
import {
  roundMoney,
  normalizeCreditAmount,
  fundingReferenceFor,
  computeWeightedAverage,
  computePositionUpdate,
  MAX_MANUAL_CREDIT,
  FINANCE_ROLES,
  STAFF_ROLES,
} from './lib';

// The money math is the surface where a defect costs real money, so it is the
// surface that gets tested. Everything here is pure - no emulator, no network -
// which is what makes it cheap enough to run on every change.

describe('roundMoney', () => {
  it('snaps float dust back to whole cents', () => {
    // The reason this function exists: repeated credits accumulate error and
    // the wallet drifts away from the ledger sum it must equal.
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(0.1 + 0.2).not.toBe(0.3);
  });

  it('keeps two decimal places and rounds the third', () => {
    expect(roundMoney(1234.567)).toBe(1234.57);
    expect(roundMoney(1234.564)).toBe(1234.56);
  });

  it('survives a long chain of credits without drifting', () => {
    let balance = 0;
    for (let i = 0; i < 1000; i += 1) balance = roundMoney(balance + 0.01);
    expect(balance).toBe(10);
  });

  it('leaves whole numbers alone', () => {
    expect(roundMoney(25000)).toBe(25000);
    expect(roundMoney(0)).toBe(0);
  });
});

describe('normalizeCreditAmount', () => {
  it('accepts a normal deposit and rounds to cents', () => {
    expect(normalizeCreditAmount(25000)).toBe(25000);
    expect(normalizeCreditAmount('7500.129')).toBe(7500.13);
  });

  it('refuses zero, negatives and non-numbers', () => {
    expect(() => normalizeCreditAmount(0)).toThrow();
    expect(() => normalizeCreditAmount(-500)).toThrow();
    expect(() => normalizeCreditAmount('abc')).toThrow();
    expect(() => normalizeCreditAmount(undefined)).toThrow();
    expect(() => normalizeCreditAmount(null)).toThrow();
    expect(() => normalizeCreditAmount(Infinity)).toThrow();
  });

  it('refuses an implausible amount - the slipped decimal point', () => {
    expect(() => normalizeCreditAmount(MAX_MANUAL_CREDIT + 1)).toThrow();
    expect(normalizeCreditAmount(MAX_MANUAL_CREDIT)).toBe(MAX_MANUAL_CREDIT);
  });

  it('rounds a sub-cent amount up rather than to zero', () => {
    expect(normalizeCreditAmount(0.005)).toBe(0.01);
    // ...but a value that rounds away entirely is not a deposit.
    expect(() => normalizeCreditAmount(0.001)).toThrow();
  });
});

describe('fundingReferenceFor', () => {
  it('formats SG-FUND{YY}{NNNNN}', () => {
    expect(fundingReferenceFor(2026, 1)).toBe('SG-FUND2600001');
    expect(fundingReferenceFor(2026, 42)).toBe('SG-FUND2600042');
    expect(fundingReferenceFor(2099, 99999)).toBe('SG-FUND9999999');
  });

  it('never collides across a year boundary at the same sequence', () => {
    expect(fundingReferenceFor(2026, 7)).not.toBe(fundingReferenceFor(2027, 7));
  });
});

describe('computeWeightedAverage', () => {
  it('averages two fills by size', () => {
    expect(computeWeightedAverage(100, 10, 100, 20)).toBe(15);
  });

  it('treats the first fill as the average', () => {
    expect(computeWeightedAverage(0, undefined, 50, 12.5)).toBe(12.5);
  });

  it('returns zero rather than dividing by zero', () => {
    expect(computeWeightedAverage(0, 0, 0, 10)).toBe(0);
  });
});

describe('computePositionUpdate', () => {
  it('blends cost basis when adding to a position', () => {
    const r = computePositionUpdate(100, 10, 'buy', 100, 20);
    expect(r.newQty).toBe(200);
    expect(r.newAvgCost).toBe(15);
    expect(r.realizedPnlDelta).toBe(0);
  });

  it('realizes P/L against the OLD basis when reducing, leaving basis intact', () => {
    const r = computePositionUpdate(100, 10, 'sell', 40, 15);
    expect(r.newQty).toBe(60);
    expect(r.newAvgCost).toBe(10);
    expect(r.realizedPnlDelta).toBe(200); // 40 x (15 - 10)
  });

  it('zeroes the basis on a flat close', () => {
    const r = computePositionUpdate(100, 10, 'sell', 100, 12);
    expect(r.newQty).toBe(0);
    expect(r.newAvgCost).toBe(0);
    expect(r.realizedPnlDelta).toBe(200);
  });

  it('resets basis to the fill price when the position flips direction', () => {
    const r = computePositionUpdate(100, 10, 'sell', 150, 12);
    expect(r.newQty).toBe(-50);
    expect(r.newAvgCost).toBe(12);
    expect(r.realizedPnlDelta).toBe(200); // only the 100 that closed
  });

  it('realizes gains on a short covered below basis', () => {
    const r = computePositionUpdate(-100, 20, 'buy', 100, 15);
    expect(r.newQty).toBe(0);
    expect(r.realizedPnlDelta).toBe(500); // 100 x (20 - 15)
  });
});

describe('role separation', () => {
  it('does not let support move money', () => {
    expect(STAFF_ROLES).toContain('support');
    expect(FINANCE_ROLES).not.toContain('support');
  });

  it('does not let compliance move money', () => {
    expect(FINANCE_ROLES).not.toContain('compliance');
  });

  it('never admits a client to any staff list', () => {
    expect(STAFF_ROLES).not.toContain('client');
    expect(FINANCE_ROLES).not.toContain('client');
  });

  it('keeps every finance role on staff', () => {
    for (const role of FINANCE_ROLES) expect(STAFF_ROLES).toContain(role);
  });
});

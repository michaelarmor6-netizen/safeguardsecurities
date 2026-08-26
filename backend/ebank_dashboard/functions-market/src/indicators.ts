export interface Candle {
  close: number;
}

export function sma(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const window = closes.slice(closes.length - period);
  return window.reduce((sum, c) => sum + c, 0) / period;
}

function ema(closes: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let prev = closes[0];
  result.push(prev);
  for (let i = 1; i < closes.length; i++) {
    prev = closes[i] * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export interface MacdResult {
  macd: number;
  signal: number;
  histogram: number;
}

export function macd(closes: number[], fast = 12, slow = 26, signalPeriod = 9): MacdResult | null {
  if (closes.length < slow + signalPeriod) return null;
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine = closes.map((_, i) => emaFast[i] - emaSlow[i]);
  const signalLine = ema(macdLine, signalPeriod);
  const last = macdLine.length - 1;
  return {
    macd: macdLine[last],
    signal: signalLine[last],
    histogram: macdLine[last] - signalLine[last],
  };
}

export interface IndicatorSet {
  sma20: number | null;
  sma50: number | null;
  rsi14: number | null;
  macd: MacdResult | null;
  lastClose: number;
}

export function computeIndicators(closes: number[]): IndicatorSet {
  return {
    sma20: sma(closes, 20),
    sma50: sma(closes, 50),
    rsi14: rsi(closes, 14),
    macd: macd(closes),
    lastClose: closes[closes.length - 1],
  };
}

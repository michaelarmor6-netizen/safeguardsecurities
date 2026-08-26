import { useEffect, useRef } from 'react';
import { createChart, AreaSeries, ColorType, type IChartApi } from 'lightweight-charts';

// The client's OWN portfolio, drawn with the same engine as the trade desk
// charts (lightweight-charts = TradingView's open-source renderer): crosshair,
// tooltip, scales, gradient - the professional look, but the series is the
// client's daily portfolio marks, not a generic market feed.
//
// This replaced a TradingView symbol embed (2026-08-26): far-dated contract
// months (GCZ27) are not listed on the free widget, which silently fell back
// to rendering AAPL - a wrong chart on a client's portfolio page. The
// portfolio series comes from portfolioSnapshots, which the daily settlement
// pipeline extends by one point per trading day.

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export interface PortfolioPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export default function PortfolioPerformanceChart({ points }: { points: PortfolioPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || points.length < 2) return;

    const up = points[points.length - 1].value >= points[0].value;
    const line = up ? cssVar('--sg-teal', '#10b981') : cssVar('--sg-danger', '#f87171');

    const chart = createChart(el, {
      autoSize: true,
      height: 320,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: cssVar('--sg-muted', '#94a3b8'),
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.06)' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: false },
      crosshair: {
        horzLine: { labelBackgroundColor: line },
        vertLine: { labelBackgroundColor: line },
      },
    });
    const series = chart.addSeries(AreaSeries, {
      lineColor: line,
      lineWidth: 2,
      topColor: up ? 'rgba(16,185,129,0.35)' : 'rgba(248,113,113,0.30)',
      bottomColor: 'rgba(0,0,0,0)',
      priceLineVisible: true,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    });

    // Dates are business days; dedupe defensively (a manual snapshot re-run
    // on the same day must not throw the whole chart away).
    const seen = new Set<string>();
    const data = points
      .filter((p) => p.date && Number.isFinite(p.value) && !seen.has(p.date) && seen.add(p.date))
      .map((p) => ({ time: p.date, value: p.value }));
    series.setData(data);
    chart.timeScale().fitContent();
    chartRef.current = chart;

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [points]);

  return <div ref={containerRef} className="w-full" style={{ height: 320 }} />;
}

import { useEffect, useRef, useState } from 'react';
import { X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { createChart, CandlestickSeries, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts';
import { getIgMarketHistory, getIgMarketSnapshot, type IgMarketSnapshot } from '../../services/investor/igMarketService';

const POLL_MS = 7000;

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

// IG sometimes returns "yyyy:MM:dd-HH:mm:ss" rather than ISO 8601.
function parseIgTime(raw: string): UTCTimestamp {
  const normalized = raw.includes('T') ? raw : raw.replace(/^(\d{4}):(\d{2}):(\d{2})-/, '$1-$2-$3T');
  const ms = Date.parse(normalized);
  return (Number.isFinite(ms) ? Math.floor(ms / 1000) : Math.floor(Date.now() / 1000)) as UTCTimestamp;
}

interface Props {
  epic: string;
  name: string;
  onClose: () => void;
}

export default function MarketDetailPanel({ epic, name, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [snapshot, setSnapshot] = useState<IgMarketSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [barCount, setBarCount] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      autoSize: true,
      height: 320,
      layout: {
        background: { color: cssVar('--sg-bg-panel', '#0e1433') },
        textColor: cssVar('--sg-muted', '#94a3b8'),
      },
      grid: {
        vertLines: { color: cssVar('--sg-border', 'rgba(255,255,255,0.07)') },
        horzLines: { color: cssVar('--sg-border', 'rgba(255,255,255,0.07)') },
      },
      timeScale: { timeVisible: true, secondsVisible: false },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: cssVar('--sg-teal', '#10b981'),
      downColor: cssVar('--sg-danger', '#f87171'),
      borderVisible: false,
      wickUpColor: cssVar('--sg-teal', '#10b981'),
      wickDownColor: cssVar('--sg-danger', '#f87171'),
    });
    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    setLoading(true);
    setError(null);
    setSnapshot(null);
    setBarCount(0);

    const loadHistory = async () => {
      try {
        const candles = await getIgMarketHistory(epic);
        if (cancelled || !seriesRef.current) return;
        const bars = candles
          .filter((c) => c.open != null && c.high != null && c.low != null && c.close != null)
          .map((c) => ({
            time: parseIgTime(c.time),
            open: c.open as number,
            high: c.high as number,
            low: c.low as number,
            close: c.close as number,
          }));
        seriesRef.current.setData(bars);
        setBarCount(bars.length);
        chartRef.current?.timeScale().fitContent();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load price history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const pollSnapshot = async () => {
      try {
        const snap = await getIgMarketSnapshot(epic);
        if (cancelled) return;
        setSnapshot(snap);
        if (seriesRef.current && snap.bid != null) {
          seriesRef.current.update({
            time: Math.floor(Date.now() / 1000) as UTCTimestamp,
            open: snap.bid,
            high: snap.bid,
            low: snap.bid,
            close: snap.bid,
          });
        }
      } catch (e) {
        // Don't spam a toast on every failed poll tick - surface via console only.
        console.error('IG snapshot poll failed', e);
      }
    };

    loadHistory().then(pollSnapshot);
    interval = setInterval(pollSnapshot, POLL_MS);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [epic]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const up = (snapshot?.percentageChange ?? 0) >= 0;

  return (
    <aside
      className="w-96 border-l shrink-0 overflow-y-auto"
      style={{ borderColor: 'var(--sg-border)', background: 'var(--sg-bg-panel)' }}
    >
      <div className="p-4 border-b flex items-start justify-between" style={{ borderColor: 'var(--sg-border)' }}>
        <div>
          <p className="font-semibold" style={{ color: 'var(--sg-text)' }}>{name}</p>
          <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>Live via IG · {epic}</p>
        </div>
        <button type="button" onClick={onClose} style={{ color: 'var(--sg-muted)' }}>
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3 border-b text-sm" style={{ borderColor: 'var(--sg-border)' }}>
        <div>
          <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>Bid</p>
          <p className="text-lg font-bold" style={{ color: 'var(--sg-text)', fontFamily: 'var(--sg-font-display)' }}>
            {snapshot?.bid ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>Offer</p>
          <p className="text-lg font-bold" style={{ color: 'var(--sg-text)', fontFamily: 'var(--sg-font-display)' }}>
            {snapshot?.offer ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>Change</p>
          <p className="flex items-center gap-1" style={{ color: up ? 'var(--sg-teal)' : 'var(--sg-danger)' }}>
            {snapshot && (up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />)}
            {snapshot?.netChange ?? '—'} ({snapshot?.percentageChange ?? 0}%)
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>High / Low</p>
          <p style={{ color: 'var(--sg-text)' }}>{snapshot?.high ?? '—'} / {snapshot?.low ?? '—'}</p>
        </div>
      </div>

      <div className="p-4">
        {loading && <p className="text-sm mb-2" style={{ color: 'var(--sg-muted)' }}>Loading chart...</p>}
        {!loading && error && (
          <div
            className="rounded-[10px] border p-4 text-sm text-center mb-2"
            style={{ borderColor: 'var(--sg-border)', color: 'var(--sg-muted)' }}
          >
            <p className="font-medium" style={{ color: 'var(--sg-danger)' }}>Price history unavailable</p>
            <p className="text-xs mt-1">{error}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--sg-muted-2)' }}>Live quotes above may still update.</p>
          </div>
        )}
        {!loading && !error && barCount === 0 && (
          <div
            className="rounded-[10px] border p-4 text-sm text-center mb-2"
            style={{ borderColor: 'var(--sg-border)', color: 'var(--sg-muted)' }}
          >
            No price history is available for this market yet.
          </div>
        )}
        <div
          ref={containerRef}
          className="w-full"
          style={{ display: !loading && (error || barCount === 0) ? 'none' : 'block' }}
        />
        {!error && barCount > 0 && (
          <p className="text-[10px] mt-2" style={{ color: 'var(--sg-muted-2)' }}>
            Updates every {POLL_MS / 1000}s via IG&apos;s market data API.
          </p>
        )}
      </div>
    </aside>
  );
}

import { useEffect, useRef } from 'react';

// Live market chart for the underlying behind a client's position.
//
// The ask was a "Barchart embed" - Barchart's website widgets are a licensed
// Barchart Solutions product (contact-sales + CME exchange data fees), with
// no free self-serve embed. TradingView's advanced-chart widget is free,
// officially embeddable, and lists individual COMEX contract months, so it
// fills the slot; if a Barchart licence is ever taken, only this component
// needs to change.
//
// The chart is INDICATIVE market context. The client's position P/L shown
// elsewhere is computed from the official daily settlement recorded by
// refreshUnderlyingPricesDaily - the two must not be conflated, hence the
// footnote rendered under the chart.

// GCF27 -> { tv: 'COMEX:GCF2027' }. Month letters follow the standard
// futures codes. Roots we sell map to their home exchange; anything unknown
// returns null and the panel simply does not render.
const EXCHANGE_BY_ROOT: Record<string, string> = {
  GC: 'COMEX', SI: 'COMEX', HG: 'COMEX',
  CL: 'NYMEX', NG: 'NYMEX', PL: 'NYMEX', PA: 'NYMEX',
};

export function tradingViewSymbolFor(holdingSymbol: string): string | null {
  const m = /^([A-Z]{1,3})([FGHJKMNQUVXZ])(\d{2})$/.exec(holdingSymbol.trim().toUpperCase());
  if (!m) return null;
  const [, root, month, yy] = m;
  const exchange = EXCHANGE_BY_ROOT[root];
  if (!exchange) return null;
  return `${exchange}:${root}${month}20${yy}`;
}

export default function LiveUnderlyingChart({ symbol, title }: { symbol: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    // The widget reads its config from the script tag's text content.
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: '60',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      support_host: 'https://www.tradingview.com',
    });
    el.appendChild(script);
    return () => { el.innerHTML = ''; };
  }, [symbol]);

  return (
    <div className="sg-card p-4" style={{ borderRadius: 14 }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          {title}
        </h3>
        <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--sg-teal)' }}>
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: 'var(--sg-teal)' }} />
          Live market
        </span>
      </div>
      <div style={{ height: 420 }}>
        <div ref={ref} className="tradingview-widget-container" style={{ height: '100%', width: '100%' }} />
      </div>
      <p className="text-[10px] mt-2" style={{ color: 'var(--sg-muted-2)' }}>
        Indicative market chart for the underlying contract. Your position value and P/L are marked
        against the official daily exchange settlement, updated once per trading day.
      </p>
    </div>
  );
}

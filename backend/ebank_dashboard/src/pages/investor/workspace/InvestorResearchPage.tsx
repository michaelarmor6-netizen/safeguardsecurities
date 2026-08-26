import { useState } from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import { getCompanyResearch, type CompanyResearch } from '../../../services/investor/researchService';

const fmtLarge = (n: number | undefined) => {
  if (n === undefined || Number.isNaN(n)) return '—';
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}B`;
  return `$${n.toFixed(0)}M`;
};
const fmtNum = (n: number | undefined, digits = 2) => (n === undefined || Number.isNaN(n) ? '—' : n.toFixed(digits));
const fmtPct = (n: number | undefined) => (n === undefined || Number.isNaN(n) ? '—' : `${n.toFixed(2)}%`);

export default function InvestorResearchPage() {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CompanyResearch | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = symbol.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await getCompanyResearch(clean);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load research');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="sg-page-title flex items-center gap-2">
          <BookOpen className="h-5 w-5" style={{ color: 'var(--sg-indigo)' }} />
          Research
        </h1>
        <p className="sg-page-sub mt-1">Company profiles and fundamentals — factual data, not a recommendation.</p>
      </div>

      <form onSubmit={search} className="sg-card p-5 space-y-4" style={{ borderRadius: 14 }}>
        <h3 className="font-semibold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          Look Up a Company
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="e.g. AAPL"
            className="sg-input flex-1"
          />
          <button type="submit" disabled={loading} className="sg-btn-primary shrink-0">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {error && (
        <div className="sg-panel p-6 text-center" style={{ color: 'var(--sg-danger)' }}>{error}</div>
      )}

      {data && (
        <div className="sg-card p-5 space-y-5" style={{ borderRadius: 14 }}>
          <div className="flex items-start gap-4">
            {data.profile.logo && (
              <img src={data.profile.logo} alt="" className="w-14 h-14 rounded-lg object-contain shrink-0" style={{ background: 'var(--sg-bg-panel)' }} />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
                {data.profile.name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--sg-muted-2)' }}>
                {data.profile.ticker} · {data.profile.exchange} · {data.profile.finnhubIndustry}
              </p>
              {data.profile.weburl && (
                <a
                  href={data.profile.weburl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs mt-1 inline-flex items-center gap-1"
                  style={{ color: 'var(--sg-indigo)' }}
                >
                  Visit website <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t pt-4 sg-row-border">
            <div>
              <p style={{ color: 'var(--sg-muted-2)' }}>Market Cap</p>
              <p className="mt-0.5 font-medium" style={{ color: 'var(--sg-text)' }}>{fmtLarge(data.profile.marketCapitalization)}</p>
            </div>
            <div>
              <p style={{ color: 'var(--sg-muted-2)' }}>Country</p>
              <p className="mt-0.5 font-medium" style={{ color: 'var(--sg-text)' }}>{data.profile.country || '—'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--sg-muted-2)' }}>IPO Date</p>
              <p className="mt-0.5 font-medium" style={{ color: 'var(--sg-text)' }}>{data.profile.ipo || '—'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--sg-muted-2)' }}>Currency</p>
              <p className="mt-0.5 font-medium" style={{ color: 'var(--sg-text)' }}>{data.profile.currency || '—'}</p>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--sg-muted-2)' }}>Fundamentals</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p style={{ color: 'var(--sg-muted-2)' }}>P/E (TTM)</p>
                <p className="mt-0.5 font-medium" style={{ color: 'var(--sg-text)' }}>{fmtNum(data.metrics.peBasicExclExtraTTM)}</p>
              </div>
              <div>
                <p style={{ color: 'var(--sg-muted-2)' }}>EPS (TTM)</p>
                <p className="mt-0.5 font-medium" style={{ color: 'var(--sg-text)' }}>{fmtNum(data.metrics.epsBasicExclExtraItemsTTM)}</p>
              </div>
              <div>
                <p style={{ color: 'var(--sg-muted-2)' }}>52W High</p>
                <p className="mt-0.5 font-medium" style={{ color: 'var(--sg-text)' }}>{fmtNum(data.metrics['52WeekHigh'])}</p>
              </div>
              <div>
                <p style={{ color: 'var(--sg-muted-2)' }}>52W Low</p>
                <p className="mt-0.5 font-medium" style={{ color: 'var(--sg-text)' }}>{fmtNum(data.metrics['52WeekLow'])}</p>
              </div>
              <div>
                <p style={{ color: 'var(--sg-muted-2)' }}>Dividend Yield</p>
                <p className="mt-0.5 font-medium" style={{ color: 'var(--sg-text)' }}>{fmtPct(data.metrics.dividendYieldIndicatedAnnual)}</p>
              </div>
              <div>
                <p style={{ color: 'var(--sg-muted-2)' }}>Beta</p>
                <p className="mt-0.5 font-medium" style={{ color: 'var(--sg-text)' }}>{fmtNum(data.metrics.beta)}</p>
              </div>
              <div>
                <p style={{ color: 'var(--sg-muted-2)' }}>ROE (TTM)</p>
                <p className="mt-0.5 font-medium" style={{ color: 'var(--sg-text)' }}>{fmtPct(data.metrics.roeTTM)}</p>
              </div>
              <div>
                <p style={{ color: 'var(--sg-muted-2)' }}>Net Margin (TTM)</p>
                <p className="mt-0.5 font-medium" style={{ color: 'var(--sg-text)' }}>{fmtPct(data.metrics.netMarginTTM)}</p>
              </div>
            </div>
          </div>

          <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>
            Data sourced from public market data providers. For informational purposes only — not investment advice.
          </p>
        </div>
      )}

      {!data && !error && !loading && (
        <div className="sg-panel p-8 text-center sg-text-muted">Search a symbol to pull up its profile and fundamentals.</div>
      )}
    </div>
  );
}

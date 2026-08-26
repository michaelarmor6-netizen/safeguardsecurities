import { useEffect, useState } from 'react';
import { Newspaper, ExternalLink, RefreshCw } from 'lucide-react';
import { getMarketNews, type MarketNewsItem } from '../../../services/investor/marketNewsService';

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'forex', label: 'Forex' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'merger', label: 'M&A' },
];

function timeAgo(unixSeconds: number): string {
  if (!unixSeconds) return '';
  const diffMs = Date.now() - unixSeconds * 1000;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function InvestorNewsPage() {
  const [category, setCategory] = useState('general');
  const [news, setNews] = useState<MarketNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = (cat: string) => {
    setLoading(true);
    setError(null);
    getMarketNews(cat)
      .then((items) => setNews(items.filter((n) => n.headline)))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load market news'))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(category), [category]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="sg-page-title flex items-center gap-2">
            <Newspaper className="h-5 w-5" style={{ color: 'var(--sg-indigo)' }} />
            Market News
          </h1>
          <p className="sg-page-sub mt-1">Live headlines streamed from the market data feed.</p>
        </div>
        <button
          type="button"
          onClick={() => load(category)}
          className="sg-btn-ghost flex items-center gap-2 text-xs px-3 py-2 shrink-0"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCategory(c.key)}
            className="text-xs font-medium rounded-full px-3 py-1.5 border transition"
            style={
              category === c.key
                ? { background: 'var(--sg-indigo)', borderColor: 'var(--sg-indigo)', color: '#fff' }
                : { borderColor: 'var(--sg-border-strong)', color: 'var(--sg-muted)' }
            }
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="sg-panel p-8 text-center sg-text-muted">Loading headlines...</div>
      )}

      {!loading && error && (
        <div className="sg-panel p-8 text-center" style={{ color: 'var(--sg-danger)' }}>{error}</div>
      )}

      {!loading && !error && news.length === 0 && (
        <div className="sg-panel p-8 text-center sg-text-muted">No headlines available right now.</div>
      )}

      {!loading && !error && (
        <div className="space-y-3">
          {news.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="sg-card p-4 flex gap-4 items-start group"
              style={{ borderRadius: 14 }}
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt=""
                  className="w-20 h-20 rounded-lg object-cover shrink-0 hidden sm:block"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--sg-muted-2)' }}>
                  <span className="font-medium">{item.source}</span>
                  <span>·</span>
                  <span>{timeAgo(item.datetime)}</span>
                </div>
                <p
                  className="font-semibold leading-snug flex items-start gap-1.5"
                  style={{ color: 'var(--sg-text)', fontFamily: 'var(--sg-font-display)' }}
                >
                  {item.headline}
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition" />
                </p>
                {item.summary && (
                  <p className="text-sm mt-1.5 line-clamp-2" style={{ color: 'var(--sg-muted)' }}>
                    {item.summary}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

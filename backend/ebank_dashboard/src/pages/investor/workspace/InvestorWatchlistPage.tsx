import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Star, Search, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { getWatchlistSymbols, addToWatchlist, removeFromWatchlist } from '../../../services/investor/watchlistService';
import { getAllAssets, type Asset } from '../../../services/investor/assetCatalogService';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

export default function InvestorWatchlistPage() {
  const { user } = useInvestorAuth();
  const [symbols, setSymbols] = useState<string[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = () => {
    if (!user) return;
    setLoading(true);
    Promise.all([getWatchlistSymbols(user.uid), getAllAssets()])
      .then(([s, a]) => {
        setSymbols(s);
        setAssets(a);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load watchlist'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [user]);

  const watched = useMemo(
    () => symbols.map((s) => assets.find((a) => a.symbol === s)).filter((a): a is Asset => Boolean(a)),
    [symbols, assets],
  );

  const searchResults = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return [];
    return assets
      .filter((a) => !symbols.includes(a.symbol))
      .filter((a) => a.symbol.toLowerCase().includes(needle) || a.name.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [assets, search, symbols]);

  const remove = async (symbol: string) => {
    if (!user) return;
    try {
      await removeFromWatchlist(user.uid, symbol);
      setSymbols((prev) => prev.filter((s) => s !== symbol));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove');
    }
  };

  const add = async (symbol: string) => {
    if (!user) return;
    try {
      await addToWatchlist(user.uid, symbol);
      setSymbols((prev) => [...prev, symbol]);
      setSearch('');
      toast.success(`${symbol} added to watchlist`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="sg-page-title flex items-center gap-2">
          <Star className="h-5 w-5" style={{ color: 'var(--sg-gold)' }} />
          Watchlist
        </h1>
        <p className="sg-page-sub mt-1">Track live prices for the instruments you care about.</p>
      </div>

      <div className="sg-card p-4" style={{ borderRadius: 14 }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--sg-muted-2)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search symbol or name to add..."
            className="sg-input pl-9"
          />
        </div>
        {searchResults.length > 0 && (
          <div className="mt-2 max-h-48 overflow-y-auto sg-panel">
            {searchResults.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => add(a.symbol)}
                className="w-full text-left px-3 py-2 text-sm hover:opacity-80 border-b sg-row-border flex items-center justify-between"
              >
                <span>
                  <span className="font-semibold sg-text-main">{a.symbol}</span>{' '}
                  <span className="sg-text-faint">{a.name}</span>
                </span>
                <Star className="h-3.5 w-3.5" style={{ color: 'var(--sg-gold)' }} />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="sg-panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sg-text-muted">
            <tr>
              <th className="text-left p-3">Symbol</th>
              <th className="text-left p-3">Name</th>
              <th className="text-right p-3">Price</th>
              <th className="text-right p-3">Change</th>
              <th className="text-left p-3"></th>
            </tr>
          </thead>
          <tbody>
            {watched.map((a) => {
              const q = a.quote;
              const up = (q?.changePercent ?? 0) >= 0;
              return (
                <tr key={a.id} className="border-t sg-row-border">
                  <td className="p-3 font-semibold sg-text-main">{a.symbol}</td>
                  <td className="p-3 sg-text-muted">{a.name}</td>
                  <td className="p-3 text-right sg-text-main">{q ? fmt(q.price) : '—'}</td>
                  <td className="p-3 text-right" style={{ color: q ? (up ? 'var(--sg-teal)' : 'var(--sg-danger)') : 'var(--sg-muted-2)' }}>
                    {q ? (
                      <span className="inline-flex items-center gap-0.5">
                        {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                        {pct(q.changePercent)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button type="button" onClick={() => remove(a.symbol)} className="sg-btn-ghost !px-2 !py-1">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && watched.length === 0 && (
          <p className="p-8 text-center sg-text-muted">Your watchlist is empty — search above to add an instrument.</p>
        )}
        {loading && <p className="p-8 text-center sg-text-muted">Loading...</p>}
      </div>
    </div>
  );
}

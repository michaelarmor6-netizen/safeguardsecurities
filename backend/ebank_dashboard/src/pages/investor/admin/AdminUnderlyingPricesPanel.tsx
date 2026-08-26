import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import {
  listUnderlyingPrices,
  setUnderlyingPriceManually,
  refreshUnderlyingPricesNow,
  type UnderlyingPriceRow,
} from '../../../services/investor/underlyingPriceService';

// The daily mark for every underlying the catalog references.
//
// This is what makes a client's Performance chart move: option positions are
// valued against the underlying, and without a price here they can only mark
// at cost. Two ways to fill it - the automatic Massive Futures feed (its own
// free subscription), or posting the day's settlement by hand below.

const today = () => new Date().toISOString().slice(0, 10);

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

export default function AdminUnderlyingPricesPanel() {
  const [rows, setRows] = useState<UnderlyingPriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { price: string; asOf: string }>>({});

  const load = useCallback(() => {
    setLoading(true);
    listUnderlyingPrices()
      .then(setRows)
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load underlying prices'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const draftFor = (ticker: string) => drafts[ticker] ?? { price: '', asOf: today() };

  const post = async (ticker: string) => {
    const draft = draftFor(ticker);
    const price = Number(draft.price);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error('Enter a positive price');
      return;
    }
    setBusy(ticker);
    try {
      await setUnderlyingPriceManually(ticker, price, draft.asOf);
      toast.success(`${ticker} marked at ${fmt(price)}`);
      setDrafts((d) => ({ ...d, [ticker]: { price: '', asOf: today() } }));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to post price');
    } finally {
      setBusy(null);
    }
  };

  const runFeed = async () => {
    setBusy('__feed__');
    try {
      const result = await refreshUnderlyingPricesNow();
      // Surface the per-ticker failure rather than a bare count - the usual
      // cause is either a ticker typo or no Futures subscription, and the
      // message says which.
      const firstError = result.details.find((d) => !d.ok);
      if (firstError) {
        toast.error(`${firstError.ticker}: ${firstError.error}`, { duration: 9000 });
      } else {
        toast.success(`${result.updated} updated from the futures feed`);
      }
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Feed refresh failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="sg-panel p-5 space-y-3">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold" style={{ color: 'var(--sg-text)' }}>
            Underlying Daily Marks
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--sg-muted-2)' }}>
            Option positions are valued against these. An underlying with no price marks at cost.
          </p>
        </div>
        <button type="button" className="sg-btn-ghost flex items-center gap-2" disabled={busy !== null} onClick={runFeed}>
          <RefreshCw className={`h-4 w-4 ${busy === '__feed__' ? 'animate-spin' : ''}`} />
          Try futures feed
        </button>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--sg-muted-2)' }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--sg-muted-2)' }}>
          No instrument in the catalog has an Underlying Futures Ticker set. Add one on an asset to
          start marking option positions against it.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const draft = draftFor(row.ticker);
            const stale = row.asOf ? row.asOf < today() : false;
            return (
              <div
                key={row.ticker}
                className="rounded-lg border p-3"
                style={{ borderColor: 'var(--sg-border)', background: 'var(--sg-surface)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold" style={{ color: 'var(--sg-text)' }}>{row.ticker}</span>
                    <span className="ml-3 text-sm" style={{ color: row.price > 0 ? 'var(--sg-text)' : 'var(--sg-danger)' }}>
                      {row.price > 0 ? fmt(row.price) : 'Not marked'}
                    </span>
                  </div>
                  <span className="text-[11px]" style={{ color: stale ? 'var(--sg-danger)' : 'var(--sg-muted-2)' }}>
                    {row.asOf ? `as of ${row.asOf}` : 'never marked'}
                    {row.source ? ` · ${row.source}` : ''}
                    {row.postedBy ? ` · ${row.postedBy}` : ''}
                    {stale ? ' · stale' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="sg-input"
                    placeholder="Settlement price"
                    value={draft.price}
                    onChange={(e) => setDrafts((d) => ({ ...d, [row.ticker]: { ...draft, price: e.target.value } }))}
                  />
                  <input
                    type="date"
                    className="sg-input"
                    value={draft.asOf}
                    onChange={(e) => setDrafts((d) => ({ ...d, [row.ticker]: { ...draft, asOf: e.target.value } }))}
                  />
                  <button
                    type="button"
                    className="sg-btn-primary"
                    disabled={busy !== null}
                    onClick={() => post(row.ticker)}
                  >
                    {busy === row.ticker ? 'Posting…' : 'Post mark'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

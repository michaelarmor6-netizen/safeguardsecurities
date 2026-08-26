import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Layers, Plus, RefreshCw, Download, Search } from 'lucide-react';
import {
  getAllAssets,
  createOrUpdateAsset,
  setAssetTradable,
  ASSET_CLASSES,
  type Asset,
  type AssetClass,
} from '../../../../services/investor/assetCatalogService';
import { useInvestorAuth } from '../../../../contexts/InvestorAuthContext';
import { logAction } from '../../../../services/investor/auditService';
import { searchIgMarkets, type IgMarketResult } from '../../../../services/investor/igMarketService';

// Every one of these is also usable as a Trade Entry Asset Class - an
// instrument added here under any type must stay selectable there, or it's
// uncatalogable once created. The Record<AssetClass, string> below is
// exhaustively type-checked, so adding a class to ASSET_CLASSES without a
// label here is a compile error, not a silent gap.
const TYPE_LABELS: Record<AssetClass, string> = {
  equity: 'Equity',
  etf: 'ETF',
  commodity_future: 'Commodity / Future',
  benchmark_index: 'Benchmark Index',
  option: 'Option',
  crypto: 'Crypto',
  warrant: 'Warrant',
  bond: 'Bond',
  fx: 'FX',
  other: 'Other',
};
const INSTRUMENT_TYPES: { value: AssetClass; label: string }[] = ASSET_CLASSES.map((value) => ({ value, label: TYPE_LABELS[value] }));

const TYPE_LABEL = new Map(INSTRUMENT_TYPES.map((t) => [t.value, t.label]));

const emptyForm = {
  symbol: '',
  name: '',
  type: 'equity',
  exchange: '',
  quoteSymbol: '',
  underlyingPriceSymbol: '',
  active: true,
};

function downloadCsv(rows: Asset[]) {
  const headers = ['Symbol', 'Display Name', 'Asset Type', 'Exchange', 'Status', 'Last Updated'];
  const lines = rows.map((a) =>
    [
      a.symbol,
      a.name,
      TYPE_LABEL.get(a.assetClass) ?? a.assetClass,
      a.exchange ?? '',
      a.isTradable ? 'Active' : 'Inactive',
      a.updatedAt?.toISOString() ?? '',
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  );
  const csv = [headers.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tradable-instruments-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AdminTradingConfigSection() {
  const { user, profile } = useInvestorAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [exchangeFilter, setExchangeFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [igSearchTerm, setIgSearchTerm] = useState('');
  const [igResults, setIgResults] = useState<IgMarketResult[]>([]);
  const [igSearching, setIgSearching] = useState(false);

  const runIgSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!igSearchTerm.trim()) return;
    setIgSearching(true);
    try {
      const results = await searchIgMarkets(igSearchTerm.trim());
      setIgResults(results);
      if (results.length === 0) toast('No matching IG instruments found.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'IG search failed');
    } finally {
      setIgSearching(false);
    }
  };

  const load = () => {
    setLoading(true);
    getAllAssets()
      .then(setAssets)
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load instruments'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const exchanges = useMemo(
    () => Array.from(new Set(assets.map((a) => a.exchange).filter(Boolean))) as string[],
    [assets],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return assets
      .filter((a) => typeFilter === 'all' || a.assetClass === typeFilter)
      .filter((a) => statusFilter === 'all' || (statusFilter === 'active' ? a.isTradable : !a.isTradable))
      .filter((a) => exchangeFilter === 'all' || a.exchange === exchangeFilter)
      .filter((a) => !needle || a.symbol.toLowerCase().includes(needle) || a.name.toLowerCase().includes(needle))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [assets, search, typeFilter, statusFilter, exchangeFilter]);

  const toggleStatus = async (asset: Asset) => {
    try {
      await setAssetTradable(asset.id, !asset.isTradable);
      if (user) logAction(user.uid, profile?.email ?? '', 'Instrument status toggled', `${asset.symbol}: ${!asset.isTradable ? 'Active' : 'Inactive'}`);
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, isTradable: !a.isTradable } : a)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update instrument');
    }
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.symbol.trim() || !form.name.trim()) {
      toast.error('Symbol and display name are required');
      return;
    }
    setSaving(true);
    try {
      const id = form.symbol.trim().toUpperCase();
      await createOrUpdateAsset({
        id,
        symbol: id,
        name: form.name.trim(),
        assetClass: form.type as AssetClass,
        groupId: `other-${form.type}`,
        exchange: form.exchange.trim() || undefined,
        quoteSymbol: form.quoteSymbol.trim() ? form.quoteSymbol.trim().toUpperCase() : null,
        underlyingPriceSymbol: form.underlyingPriceSymbol.trim()
          ? form.underlyingPriceSymbol.trim().toUpperCase()
          : null,
        dataProvider: 'finnhub',
        priority: 'core',
        isTradable: form.active,
        isActive: true,
      });
      if (user) logAction(user.uid, profile?.email ?? '', 'Instrument added', `${id} (${TYPE_LABEL.get(form.type as AssetClass) ?? form.type})`);
      toast.success(`${id} added`);
      setForm(emptyForm);
      setShowAddForm(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add instrument');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sg-panel p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4" style={{ color: 'var(--sg-indigo)' }} />
          <div>
            <h3 className="font-semibold sg-text-main">Trading Configuration</h3>
            <p className="text-xs sg-text-muted">
              Search, add, and manage symbols used in admin trade entry. One list — no asset-class drilling required.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="sg-btn-ghost flex items-center gap-2 !px-3 !py-1.5 text-sm" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button type="button" className="sg-btn-ghost flex items-center gap-2 !px-3 !py-1.5 text-sm" onClick={() => downloadCsv(filtered)}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button type="button" className="sg-btn-primary flex items-center gap-2 !px-3 !py-1.5 text-sm" onClick={() => setShowAddForm((v) => !v)}>
            <Plus className="h-3.5 w-3.5" /> Add Instrument
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={submitAdd} className="sg-card p-4 space-y-3" style={{ borderRadius: 12 }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs sg-text-muted">Symbol *</label>
              <input className="sg-input mt-1" value={form.symbol} onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs sg-text-muted">Display Name *</label>
              <input className="sg-input mt-1" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs sg-text-muted">Asset Type *</label>
              <select className="sg-input mt-1" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {INSTRUMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs sg-text-muted">Exchange</label>
              <input className="sg-input mt-1" value={form.exchange} onChange={(e) => setForm((f) => ({ ...f, exchange: e.target.value }))} placeholder="e.g. NASDAQ" />
            </div>
            <div>
              <label className="text-xs sg-text-muted">Live Quote Symbol</label>
              <input
                className="sg-input mt-1"
                value={form.quoteSymbol}
                onChange={(e) => setForm((f) => ({ ...f, quoteSymbol: e.target.value }))}
                placeholder="Leave blank for reference-only"
              />
            </div>
            <div>
              <label className="text-xs sg-text-muted">Underlying Futures Ticker</label>
              <input
                className="sg-input mt-1"
                value={form.underlyingPriceSymbol}
                onChange={(e) => setForm((f) => ({ ...f, underlyingPriceSymbol: e.target.value }))}
                placeholder="e.g. GCZ7"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="instrActive" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
            <label htmlFor="instrActive" className="text-sm sg-text-muted">Active (available in admin trade entry)</label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="sg-btn-primary">{saving ? 'Saving...' : 'Save Instrument'}</button>
            <button type="button" className="sg-btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          className="sg-input flex-1 min-w-[180px]"
          placeholder="Search symbol or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="sg-input w-auto" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All types</option>
          {INSTRUMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select className="sg-input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select className="sg-input w-auto" value={exchangeFilter} onChange={(e) => setExchangeFilter(e.target.value)}>
          <option value="all">All exchanges</option>
          {exchanges.map((ex) => (
            <option key={ex} value={ex}>{ex}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sg-text-muted">
            <tr>
              <th className="text-left p-2">Symbol</th>
              <th className="text-left p-2">Display Name</th>
              <th className="text-left p-2">Asset Type</th>
              <th className="text-left p-2">Exchange</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map((a) => (
              <tr key={a.id} className="border-t sg-row-border">
                <td className="p-2 font-mono sg-text-main">{a.symbol}</td>
                <td className="p-2 sg-text-main">{a.name}</td>
                <td className="p-2 sg-text-muted">{TYPE_LABEL.get(a.assetClass) ?? a.assetClass}</td>
                <td className="p-2 sg-text-muted">{a.exchange ?? '—'}</td>
                <td className="p-2">
                  <button
                    type="button"
                    onClick={() => toggleStatus(a)}
                    className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{
                      background: a.isTradable ? 'rgba(16,185,129,.14)' : 'rgba(148,163,184,.14)',
                      color: a.isTradable ? 'var(--sg-teal)' : 'var(--sg-muted-2)',
                    }}
                  >
                    {a.isTradable ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="p-2 sg-text-faint text-xs">{a.updatedAt ? a.updatedAt.toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && <p className="p-6 text-center sg-text-muted text-sm">No instruments match this filter.</p>}
        {loading && <p className="p-6 text-center sg-text-muted text-sm">Loading...</p>}
        {filtered.length > 200 && (
          <p className="p-2 text-center text-xs sg-text-faint">Showing first 200 of {filtered.length} — narrow your filters to see more.</p>
        )}
      </div>

      <form onSubmit={runIgSearch} className="sg-card p-4 space-y-3 mt-2" style={{ borderRadius: 12 }}>
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4" style={{ color: 'var(--sg-indigo)' }} />
          <h3 className="font-semibold sg-text-main text-sm">IG Epic Lookup</h3>
        </div>
        <p className="text-xs sg-text-muted">
          Dev tool: search IG&apos;s instrument catalog to find the exact epic for an instrument (e.g. search
          &quot;gold&quot; to find Gold&apos;s epic for wiring live market data). Requires IG API secrets to be set.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={igSearchTerm}
            onChange={(e) => setIgSearchTerm(e.target.value)}
            placeholder="e.g. gold"
            className="sg-input flex-1"
          />
          <button type="submit" disabled={igSearching} className="sg-btn-primary">
            {igSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
        {igResults.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="sg-text-muted">
                <tr>
                  <th className="text-left py-1.5 pr-3">Epic</th>
                  <th className="text-left py-1.5 pr-3">Name</th>
                  <th className="text-left py-1.5 pr-3">Type</th>
                  <th className="text-left py-1.5">Expiry</th>
                </tr>
              </thead>
              <tbody>
                {igResults.map((r) => (
                  <tr key={r.epic} className="border-t sg-row-border">
                    <td className="py-1.5 pr-3 font-mono sg-text-main">{r.epic}</td>
                    <td className="py-1.5 pr-3 sg-text-main">{r.instrumentName}</td>
                    <td className="py-1.5 pr-3 sg-text-muted">{r.instrumentType}</td>
                    <td className="py-1.5 sg-text-muted">{r.expiry}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </form>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, RefreshCw, Search } from 'lucide-react';
import {
  getAllAssets,
  getAssetGroups,
  createOrUpdateAsset,
  setAssetTradable,
  refreshAssetQuote,
  type Asset,
  type AssetClass,
  type AssetGroup,
} from '../../../services/investor/assetCatalogService';
import AdminUnderlyingPricesPanel from './AdminUnderlyingPricesPanel';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { logAction } from '../../../services/investor/auditService';

const OTHER_CLASSES: AssetClass[] = ['option', 'warrant', 'bond', 'other'];

const TABS: { key: AssetClass | 'all' | 'other'; label: string; classes: AssetClass[] }[] = [
  { key: 'all', label: 'All', classes: ['commodity_future', 'equity', 'etf', 'benchmark_index', 'fx', 'crypto', ...OTHER_CLASSES] },
  { key: 'commodity_future', label: 'Commodities & Futures', classes: ['commodity_future'] },
  { key: 'equity', label: 'Stocks & Shares', classes: ['equity', 'benchmark_index'] },
  { key: 'etf', label: 'ETFs', classes: ['etf'] },
  { key: 'fx', label: 'Forex', classes: ['fx'] },
  { key: 'crypto', label: 'Cryptocurrency', classes: ['crypto'] },
  { key: 'other', label: 'Options, Warrants & Bonds', classes: OTHER_CLASSES },
];

const emptyForm = {
  symbol: '',
  name: '',
  assetClass: 'equity' as AssetClass,
  groupId: '',
  exchange: '',
  sector: '',
  contractUnit: '',
  quoteSymbol: '',
  underlyingPriceSymbol: '',
  isTradable: true,
};

export default function InvestorAdminAssetsPage() {
  const { user, profile } = useInvestorAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [groups, setGroups] = useState<AssetGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AssetClass | 'all' | 'other'>('all');
  const [search, setSearch] = useState('');
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([getAllAssets(), getAssetGroups()])
      .then(([a, g]) => {
        setAssets(a);
        setGroups(g);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load catalog'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const groupLabelMap = useMemo(() => new Map(groups.map((g) => [g.id, g.label])), [groups]);
  const groupLabel = (id: string) => groupLabelMap.get(id) ?? id;

  const filtered = useMemo(() => {
    const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];
    const needle = search.trim().toLowerCase();
    return assets
      .filter((a) => activeTab.classes.includes(a.assetClass))
      .filter((a) => !needle || a.symbol.toLowerCase().includes(needle) || a.name.toLowerCase().includes(needle))
      .sort(
        (a, b) =>
          (groupLabelMap.get(a.groupId) ?? a.groupId).localeCompare(groupLabelMap.get(b.groupId) ?? b.groupId) ||
          a.symbol.localeCompare(b.symbol),
      );
  }, [assets, tab, search, groupLabelMap]);

  const grouped = useMemo(() => {
    const map = new Map<string, Asset[]>();
    for (const a of filtered) {
      const list = map.get(a.groupId) ?? [];
      list.push(a);
      map.set(a.groupId, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const toggleTradable = async (asset: Asset) => {
    try {
      await setAssetTradable(asset.id, !asset.isTradable);
      if (user) logAction(user.uid, profile?.email ?? '', 'Asset tradable toggled', `${asset.symbol}: ${!asset.isTradable}`);
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, isTradable: !a.isTradable } : a)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update asset');
    }
  };

  const doRefresh = async (asset: Asset) => {
    if (!asset.quoteSymbol) {
      toast.error(`${asset.symbol} has no live quote source (reference-only)`);
      return;
    }
    setRefreshingId(asset.id);
    try {
      const quote = await refreshAssetQuote(asset.id);
      setAssets((prev) =>
        prev.map((a) =>
          a.id === asset.id
            ? { ...a, quote: { price: quote.price, change: quote.change, changePercent: quote.changePercent, fetchedAt: new Date() } }
            : a,
        ),
      );
      toast.success(`${asset.symbol} refreshed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to refresh quote');
    } finally {
      setRefreshingId(null);
    }
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.symbol.trim() || !form.name.trim() || !form.groupId) {
      toast.error('Symbol, name, and group are required');
      return;
    }
    setSaving(true);
    try {
      const id = form.symbol.trim().toUpperCase();
      await createOrUpdateAsset({
        id,
        symbol: id,
        name: form.name.trim(),
        assetClass: form.assetClass,
        groupId: form.groupId,
        exchange: form.exchange.trim() || undefined,
        sector: form.sector.trim() || undefined,
        contractUnit: form.contractUnit.trim() || undefined,
        quoteSymbol: form.quoteSymbol.trim() ? form.quoteSymbol.trim().toUpperCase() : null,
        underlyingPriceSymbol: form.underlyingPriceSymbol.trim()
          ? form.underlyingPriceSymbol.trim().toUpperCase()
          : null,
        dataProvider: 'finnhub',
        priority: 'core',
        isTradable: form.isTradable,
        isActive: true,
      });
      if (user) logAction(user.uid, profile?.email ?? '', 'Asset added', id);
      toast.success(`${id} added to catalog`);
      setForm(emptyForm);
      setShowAddForm(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add asset');
    } finally {
      setSaving(false);
    }
  };

  const groupOptions = groups.filter((g) => g.assetClass === form.assetClass);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="sg-page-title">Asset Management</h1>
          <p className="sg-page-sub mt-1">Tradable instrument catalog — commodities, futures, stocks, and ETFs.</p>
        </div>
        <button type="button" className="sg-btn-primary flex items-center gap-2" onClick={() => setShowAddForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Add Asset
        </button>
      </div>

      <AdminUnderlyingPricesPanel />

      {showAddForm && (
        <form onSubmit={submitAdd} className="sg-panel p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm sg-text-muted">Symbol *</label>
              <input className="sg-input mt-1" value={form.symbol} onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm sg-text-muted">Name *</label>
              <input className="sg-input mt-1" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm sg-text-muted">Asset Class *</label>
              <select
                className="sg-input mt-1"
                value={form.assetClass}
                onChange={(e) => setForm((f) => ({ ...f, assetClass: e.target.value as AssetClass, groupId: '' }))}
              >
                <option value="commodity_future">Commodity / Future</option>
                <option value="equity">Equity</option>
                <option value="etf">ETF</option>
                <option value="benchmark_index">Benchmark Index</option>
                <option value="fx">Forex</option>
                <option value="crypto">Cryptocurrency</option>
              </select>
            </div>
            <div>
              <label className="text-sm sg-text-muted">Group *</label>
              <select className="sg-input mt-1" value={form.groupId} onChange={(e) => setForm((f) => ({ ...f, groupId: e.target.value }))}>
                <option value="">Select...</option>
                {groupOptions.map((g) => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm sg-text-muted">Exchange</label>
              <input className="sg-input mt-1" value={form.exchange} onChange={(e) => setForm((f) => ({ ...f, exchange: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm sg-text-muted">Sector (equities)</label>
              <input className="sg-input mt-1" value={form.sector} onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm sg-text-muted">Contract Unit (futures)</label>
              <input className="sg-input mt-1" value={form.contractUnit} onChange={(e) => setForm((f) => ({ ...f, contractUnit: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm sg-text-muted">Live Quote Symbol (Finnhub)</label>
              <input
                className="sg-input mt-1"
                value={form.quoteSymbol}
                onChange={(e) => setForm((f) => ({ ...f, quoteSymbol: e.target.value }))}
                placeholder="Leave blank for reference-only"
              />
            </div>
            <div>
              <label className="text-sm sg-text-muted">Underlying Futures Ticker (Massive)</label>
              <input
                className="sg-input mt-1"
                value={form.underlyingPriceSymbol}
                onChange={(e) => setForm((f) => ({ ...f, underlyingPriceSymbol: e.target.value }))}
                placeholder="e.g. GCZ7"
              />
              <p className="text-xs mt-1 sg-text-muted">
                Massive futures contract ticker — root + month code + single-digit year. Drives daily
                P/L for options on this instrument; blank means positions mark at cost.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isTradable"
              checked={form.isTradable}
              onChange={(e) => setForm((f) => ({ ...f, isTradable: e.target.checked }))}
            />
            <label htmlFor="isTradable" className="text-sm sg-text-muted">Tradable on Trade Desk</label>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="sg-btn-primary">{saving ? 'Saving...' : 'Save Asset'}</button>
            <button type="button" className="sg-btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="px-3 py-1.5 rounded-full text-sm font-medium"
              style={{
                background: tab === t.key ? 'var(--sg-indigo)' : 'transparent',
                color: tab === t.key ? 'white' : 'var(--sg-muted)',
                border: `1px solid ${tab === t.key ? 'var(--sg-indigo)' : 'var(--sg-border)'}`,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--sg-muted-2)' }} />
          <input
            className="sg-input pl-9"
            placeholder="Search symbol or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="sg-panel p-6 text-sm sg-text-muted">Loading catalog...</div>
      ) : grouped.length === 0 ? (
        <div className="sg-panel p-6 text-sm sg-text-muted">No assets match this filter.</div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([groupId, groupAssets]) => (
            <div key={groupId} className="sg-panel overflow-x-auto">
              <div className="px-4 pt-4 pb-2 text-sm font-semibold" style={{ color: 'var(--sg-text)' }}>
                {groupLabel(groupId)} <span className="sg-text-faint font-normal">({groupAssets.length})</span>
              </div>
              <table className="min-w-full text-sm">
                <thead className="sg-text-muted">
                  <tr>
                    <th className="text-left p-3">Symbol</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Exchange / Sector</th>
                    <th className="text-left p-3">Last Price</th>
                    <th className="text-left p-3">Tradable</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupAssets.map((a) => (
                    <tr key={a.id} className="border-t sg-row-border">
                      <td className="p-3 font-mono sg-text-main">{a.symbol}</td>
                      <td className="p-3 sg-text-main">{a.name}</td>
                      <td className="p-3 sg-text-faint">{a.exchange || a.sector || '—'}</td>
                      <td className="p-3">
                        {a.quote ? (
                          <span style={{ color: a.quote.change >= 0 ? 'var(--sg-teal)' : 'var(--sg-danger)' }}>
                            ${a.quote.price.toFixed(2)} ({a.quote.changePercent >= 0 ? '+' : ''}{a.quote.changePercent.toFixed(2)}%)
                          </span>
                        ) : a.quoteSymbol ? (
                          <span className="sg-text-faint">Not yet fetched</span>
                        ) : (
                          <span className="sg-text-faint">Reference-only</span>
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => toggleTradable(a)}
                          className="px-2 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: a.isTradable ? 'rgba(16,185,129,.14)' : 'rgba(148,163,184,.14)',
                            color: a.isTradable ? 'var(--sg-teal)' : 'var(--sg-muted-2)',
                          }}
                        >
                          {a.isTradable ? 'Tradable' : 'Locked'}
                        </button>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          className="sg-action-btn flex items-center gap-1.5"
                          disabled={!a.quoteSymbol || refreshingId === a.id}
                          onClick={() => doRefresh(a)}
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${refreshingId === a.id ? 'animate-spin' : ''}`} />
                          Refresh
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

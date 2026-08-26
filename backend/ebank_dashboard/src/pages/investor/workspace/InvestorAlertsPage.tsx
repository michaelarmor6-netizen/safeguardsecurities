import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Bell, Plus, Trash2, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import {
  getAlertsForUser,
  createPriceAlert,
  cancelPriceAlert,
  markAlertSeen,
  deletePriceAlert,
  type PriceAlert,
  type AlertCondition,
} from '../../../services/investor/priceAlertService';
import { getAllAssets, type Asset } from '../../../services/investor/assetCatalogService';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: 'rgba(99,102,241,.12)', color: 'var(--sg-indigo)', label: 'Active' },
  triggered: { bg: 'rgba(16,185,129,.12)', color: 'var(--sg-teal)', label: 'Triggered' },
  cancelled: { bg: 'rgba(148,163,184,.12)', color: 'var(--sg-muted-2)', label: 'Cancelled' },
};

export default function InvestorAlertsPage() {
  const { user } = useInvestorAuth();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [condition, setCondition] = useState<AlertCondition>('above');
  const [targetPrice, setTargetPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!user) return;
    setLoading(true);
    Promise.all([getAlertsForUser(user.uid), getAllAssets()])
      .then(([a, ax]) => {
        setAlerts(a);
        setAssets(ax);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load alerts'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [user]);

  useEffect(() => {
    const unseenTriggered = alerts.filter((a) => a.status === 'triggered' && !a.seen);
    if (unseenTriggered.length === 0) return;
    unseenTriggered.forEach((a) => markAlertSeen(a.id).catch(() => undefined));
  }, [alerts]);

  const searchResults = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return [];
    return assets
      .filter((a) => a.symbol.toLowerCase().includes(needle) || a.name.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [assets, search]);

  const resetForm = () => {
    setShowForm(false);
    setSearch('');
    setSelectedAsset(null);
    setCondition('above');
    setTargetPrice('');
  };

  const submit = async () => {
    if (!user || !selectedAsset) return;
    const price = Number(targetPrice);
    if (!price || price <= 0) {
      toast.error('Enter a valid target price');
      return;
    }
    setSaving(true);
    try {
      await createPriceAlert({
        userId: user.uid,
        assetId: selectedAsset.id,
        symbol: selectedAsset.symbol,
        condition,
        targetPrice: price,
      });
      toast.success(`Alert set for ${selectedAsset.symbol}`);
      resetForm();
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create alert');
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (id: string) => {
    try {
      await cancelPriceAlert(id);
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel alert');
    }
  };

  const remove = async (id: string) => {
    try {
      await deletePriceAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete alert');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="sg-page-title flex items-center gap-2">
            <Bell className="h-5 w-5" style={{ color: 'var(--sg-indigo)' }} />
            Price Alerts
          </h1>
          <p className="sg-page-sub mt-1">Get notified when an instrument crosses a price level you set.</p>
        </div>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="sg-btn-primary flex items-center gap-1.5 !px-4">
          <Plus className="h-4 w-4" />
          New Alert
        </button>
      </div>

      {showForm && (
        <div className="sg-card p-5 space-y-4" style={{ borderRadius: 14 }}>
          {!selectedAsset ? (
            <div className="relative">
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search symbol or name..."
                className="sg-input"
              />
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-48 overflow-y-auto sg-panel">
                  {searchResults.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setSelectedAsset(a);
                        setSearch('');
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:opacity-80 border-b sg-row-border"
                    >
                      <span className="font-semibold sg-text-main">{a.symbol}</span>{' '}
                      <span className="sg-text-faint">{a.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold sg-text-main">{selectedAsset.symbol}</span>{' '}
                <span className="sg-text-faint text-sm">{selectedAsset.name}</span>
                {selectedAsset.quote && (
                  <span className="ml-2 text-sm sg-text-muted">Current: {fmt(selectedAsset.quote.price)}</span>
                )}
              </div>
              <button type="button" onClick={() => setSelectedAsset(null)} className="sg-btn-ghost !px-2 !py-1">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs sg-text-muted block mb-1">Condition</label>
              <div className="flex gap-2">
                {(['above', 'below'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCondition(c)}
                    className="flex-1 px-3 py-2 text-sm rounded-[10px] border transition capitalize"
                    style={
                      condition === c
                        ? { background: 'rgba(99,102,241,.15)', color: 'var(--sg-indigo)', borderColor: 'rgba(99,102,241,.3)' }
                        : { color: 'var(--sg-muted-2)', borderColor: 'var(--sg-border)' }
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs sg-text-muted block mb-1">Target price (USD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="0.00"
                className="sg-input"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetForm} className="sg-btn-ghost">
              Cancel
            </button>
            <button type="button" onClick={submit} disabled={!selectedAsset || saving} className="sg-btn-primary disabled:opacity-50">
              {saving ? 'Saving...' : 'Create Alert'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {loading && <p className="p-8 text-center sg-text-muted">Loading...</p>}
        {!loading && alerts.length === 0 && (
          <div className="sg-panel p-8 text-center sg-text-muted">
            No alerts yet — create one to get notified on a price move.
          </div>
        )}
        {alerts.map((a) => {
          const st = STATUS_STYLE[a.status];
          return (
            <div key={a.id} className="sg-card p-4 flex items-center justify-between gap-3" style={{ borderRadius: 12 }}>
              <div className="flex items-center gap-3">
                {a.condition === 'above' ? (
                  <ArrowUpRight className="h-4 w-4" style={{ color: 'var(--sg-teal)' }} />
                ) : (
                  <ArrowDownRight className="h-4 w-4" style={{ color: 'var(--sg-danger)' }} />
                )}
                <div>
                  <p className="font-semibold sg-text-main">
                    {a.symbol} {a.condition} {fmt(a.targetPrice)}
                  </p>
                  <p className="text-xs sg-text-faint">
                    {a.status === 'triggered' && a.triggeredPrice != null
                      ? `Triggered at ${fmt(a.triggeredPrice)}`
                      : a.createdAt
                        ? `Created ${a.createdAt.toLocaleDateString()}`
                        : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: st.bg, color: st.color }}>
                  {st.label}
                </span>
                {a.status === 'active' && (
                  <button type="button" onClick={() => cancel(a.id)} className="sg-btn-ghost !px-2 !py-1" title="Cancel alert">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {a.status !== 'active' && (
                  <button type="button" onClick={() => remove(a.id)} className="sg-btn-ghost !px-2 !py-1" title="Delete alert">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

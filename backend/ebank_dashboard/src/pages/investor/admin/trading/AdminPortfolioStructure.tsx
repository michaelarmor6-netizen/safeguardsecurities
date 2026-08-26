import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { getAllInvestorProfiles, type InvestorProfile } from '../../../../services/investor/profileService';
import {
  getSubPortfoliosForUser,
  createSubPortfolio,
  updateSubPortfolio,
  deleteSubPortfolio,
  getHoldingsForSleeve,
  addHoldingToSleeve,
  deleteSleeveHolding,
  type SubPortfolio,
  type SubPortfolioHolding,
  type SubPortfolioAssetClass,
} from '../../../../services/investor/subPortfolioService';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

function SleeveHoldings({ sleeve }: { sleeve: SubPortfolio }) {
  const [holdings, setHoldings] = useState<SubPortfolioHolding[]>([]);
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => getHoldingsForSleeve(sleeve.id).then(setHoldings).catch(() => {}), [sleeve.id]);
  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim() || !Number(quantity)) {
      toast.error('Enter a symbol and quantity');
      return;
    }
    setAdding(true);
    try {
      await addHoldingToSleeve({
        subPortfolioId: sleeve.id,
        userId: sleeve.userId,
        symbol,
        quantity: Number(quantity),
        avgCost: Number(avgCost) || 0,
        unitLabel: 'shares',
        currency: sleeve.baseCurrency,
      });
      setSymbol('');
      setQuantity('');
      setAvgCost('');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add holding');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mt-3 pl-4 border-l-2 space-y-2" style={{ borderColor: 'var(--sg-border)' }}>
      {holdings.map((h) => (
        <div key={h.id} className="flex items-center justify-between text-sm">
          <span className="sg-text-main">
            {h.symbol} — {h.quantity.toLocaleString()} @ {fmt(h.avgCost)}
          </span>
          <button
            type="button"
            className="text-xs"
            style={{ color: 'var(--sg-danger)' }}
            onClick={() => deleteSleeveHolding(h.id).then(load)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <form onSubmit={add} className="flex flex-wrap items-center gap-1.5">
        <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Symbol" className="sg-input py-1 px-2 text-xs w-24" />
        <input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Qty" type="number" className="sg-input py-1 px-2 text-xs w-20" />
        <input value={avgCost} onChange={(e) => setAvgCost(e.target.value)} placeholder="Avg cost" type="number" className="sg-input py-1 px-2 text-xs w-24" />
        <button type="submit" disabled={adding} className="sg-action-btn text-xs px-2 py-1">Add</button>
      </form>
    </div>
  );
}

export default function AdminPortfolioStructure() {
  const [investors, setInvestors] = useState<InvestorProfile[]>([]);
  const [investorId, setInvestorId] = useState('');
  const [sleeves, setSleeves] = useState<SubPortfolio[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [assetClass, setAssetClass] = useState<SubPortfolioAssetClass>('equities');

  useEffect(() => {
    getAllInvestorProfiles()
      .then((rows) => setInvestors(rows.filter((r) => r.role === 'client')))
      .catch(() => toast.error('Failed to load investors'));
  }, []);

  const loadSleeves = (uid: string) => getSubPortfoliosForUser(uid).then(setSleeves).catch(() => {});

  useEffect(() => {
    if (investorId) loadSleeves(investorId);
    else setSleeves([]);
  }, [investorId]);

  const createSleeve = async () => {
    if (!investorId || !name.trim()) {
      toast.error('Select an investor and enter a sleeve name');
      return;
    }
    try {
      await createSubPortfolio({ userId: investorId, name: name.trim(), assetClass, baseCurrency: 'USD' });
      setName('');
      setCreating(false);
      loadSleeves(investorId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create sleeve');
    }
  };

  const quickCreateDerivativesSleeve = async () => {
    if (!investorId) {
      toast.error('Select an investor first');
      return;
    }
    try {
      await createSubPortfolio({
        userId: investorId,
        name: 'Limited Risk Options (Derivatives)',
        assetClass: 'commodities',
        baseCurrency: 'USD',
        targetAllocationPct: 100,
      });
      loadSleeves(investorId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create sleeve');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-3 flex items-start gap-2" style={{ borderColor: 'var(--sg-border)', background: 'var(--sg-surface)' }}>
        <Layers className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'var(--sg-indigo)' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--sg-text)' }}>Portfolio Structure — display &amp; allocation only</p>
          <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>
            Manage sleeves, target allocations, and holdings groupings. No trade records are created here — executions flow through the Execution Queue.
          </p>
        </div>
      </div>

      <div className="sg-card p-4" style={{ borderRadius: 12 }}>
        <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Select investor</label>
        <select className="sg-input mt-1.5 max-w-md" value={investorId} onChange={(e) => setInvestorId(e.target.value)}>
          <option value="">— Select an investor —</option>
          {investors.map((i) => (
            <option key={i.id} value={i.id}>{i.email}</option>
          ))}
        </select>
      </div>

      {investorId && (
        <>
          <div className="flex gap-2">
            <button type="button" className="sg-btn-ghost flex items-center gap-2" onClick={() => setCreating((v) => !v)}>
              <Plus className="h-4 w-4" /> New Sleeve
            </button>
            <button type="button" className="sg-btn-ghost" onClick={quickCreateDerivativesSleeve}>
              Create default derivatives sleeve
            </button>
          </div>

          {creating && (
            <div className="sg-card p-4 flex flex-wrap items-end gap-3" style={{ borderRadius: 12 }}>
              <div>
                <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)' }}>Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="sg-input mt-1.5" />
              </div>
              <div>
                <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)' }}>Asset Class</label>
                <select value={assetClass} onChange={(e) => setAssetClass(e.target.value as SubPortfolioAssetClass)} className="sg-input mt-1.5">
                  <option value="equities">Equities</option>
                  <option value="crypto">Crypto</option>
                  <option value="commodities">Commodities</option>
                  <option value="managed_strategy">Managed Strategy</option>
                </select>
              </div>
              <button type="button" className="sg-btn-primary" onClick={createSleeve}>Create</button>
            </div>
          )}

          <div className="space-y-3">
            {sleeves.map((s) => (
              <div key={s.id} className="sg-panel p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold sg-text-main">{s.name}</p>
                    <p className="text-xs sg-text-faint capitalize">{s.assetClass.replace('_', ' ')} · {s.status}{s.targetAllocationPct ? ` · target ${s.targetAllocationPct}%` : ''}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="sg-action-btn text-xs px-2 py-1" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                      {expanded === s.id ? 'Hide holdings' : 'View holdings'}
                    </button>
                    <select
                      value={s.status}
                      onChange={(e) => updateSubPortfolio(s.id, { status: e.target.value as SubPortfolio['status'] }).then(() => loadSleeves(investorId))}
                      className="sg-input py-1 px-2 text-xs"
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="closed">Closed</option>
                    </select>
                    <button
                      type="button"
                      className="sg-danger-btn text-xs px-2 py-1"
                      onClick={() => {
                        if (window.confirm(`Delete sleeve "${s.name}"?`)) deleteSubPortfolio(s.id).then(() => loadSleeves(investorId));
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {expanded === s.id && <SleeveHoldings sleeve={s} />}
              </div>
            ))}
            {sleeves.length === 0 && <p className="p-6 text-center sg-text-muted sg-panel">No sleeves for this investor yet.</p>}
          </div>
        </>
      )}
    </div>
  );
}

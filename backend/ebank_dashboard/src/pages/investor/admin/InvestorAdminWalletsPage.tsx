import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search } from 'lucide-react';
import { getAllWallets, type InvestorWallet } from '../../../services/investor/walletService';
import { getAllInvestorProfiles, type InvestorProfile } from '../../../services/investor/profileService';
import AddClientFundsPanel from './funding/AddClientFundsPanel';

// This page used to list raw auth uids, which made it impossible to answer the
// question staff actually bring to it - "how much does this client hold, and
// can I top them up?". Wallets are now joined to profiles and each row opens
// the same desk-recorded top-up used on Funding Requests, so a balance is never
// edited by hand.

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const clientName = (p?: InvestorProfile) =>
  p ? (p.displayName?.trim() || [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || p.email) : '';

interface Row {
  wallet: InvestorWallet;
  profile?: InvestorProfile;
}

export default function InvestorAdminWalletsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [topUpUserId, setTopUpUserId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([getAllWallets(), getAllInvestorProfiles()])
      .then(([wallets, profiles]) => {
        const byId = new Map(profiles.map((p) => [p.id, p]));
        setRows(
          wallets
            .map((wallet) => ({ wallet, profile: byId.get(wallet.userId) }))
            .sort((a, b) => b.wallet.balance - a.wallet.balance),
        );
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load wallets'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${clientName(r.profile)} ${r.profile?.email ?? ''} ${r.wallet.userId}`.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const total = useMemo(() => filtered.reduce((sum, r) => sum + r.wallet.balance, 0), [filtered]);
  const funded = useMemo(() => filtered.filter((r) => r.wallet.balance > 0).length, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="sg-page-title">Wallets</h1>
          <p className="sg-page-sub mt-1">
            Client cash balances. Adding funds credits the wallet and files a referenced transaction
            - balances are never edited directly.
          </p>
        </div>
        {!topUpUserId && (
          <button
            type="button"
            className="sg-action-btn !px-4 !py-2 flex items-center gap-1.5"
            onClick={() => setTopUpUserId('')}
          >
            <Plus className="h-4 w-4" />
            Add funds to a client
          </button>
        )}
      </div>

      {topUpUserId !== null && (
        <AddClientFundsPanel
          preselectUserId={topUpUserId || undefined}
          onCredited={load}
          onClose={() => setTopUpUserId(null)}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sg-panel p-4">
          <p className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)' }}>Wallets</p>
          <p className="text-2xl font-semibold mt-1" style={{ fontFamily: 'var(--sg-font-display)' }}>{filtered.length}</p>
        </div>
        <div className="sg-panel p-4">
          <p className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)' }}>Total held</p>
          <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--sg-teal)', fontFamily: 'var(--sg-font-display)' }}>
            {fmt(total)}
          </p>
        </div>
        <div className="sg-panel p-4">
          <p className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)' }}>Funded</p>
          <p className="text-2xl font-semibold mt-1" style={{ fontFamily: 'var(--sg-font-display)' }}>
            {funded}/{filtered.length}
          </p>
        </div>
      </div>

      <div className="sg-panel p-3">
        <div className="relative max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 sg-input-icon" style={{ color: 'var(--sg-muted-2)' }} />
          <input
            className="sg-input sg-input-icon-left"
            placeholder="Search by client name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="sg-panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sg-text-muted">
            <tr>
              <th className="text-left p-4">Client</th>
              <th className="text-left p-4">Label</th>
              <th className="text-left p-4">Balance</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.wallet.id} className="border-t sg-row-border">
                <td className="p-4">
                  <span className="block sg-text-main">{clientName(r.profile) || r.wallet.userId}</span>
                  <span className="block text-xs" style={{ color: 'var(--sg-muted-2)' }}>
                    {r.profile?.email ?? r.wallet.userId}
                  </span>
                </td>
                <td className="p-4 sg-text-muted">{r.wallet.label}</td>
                <td className="p-4 font-semibold" style={{ color: r.wallet.balance > 0 ? 'var(--sg-teal)' : 'var(--sg-muted-2)' }}>
                  {fmt(r.wallet.balance)}
                </td>
                <td className="p-4">
                  <button
                    type="button"
                    className="sg-action-btn flex items-center gap-1.5"
                    onClick={() => {
                      setTopUpUserId(r.wallet.userId);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add funds
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <p className="p-6 sg-text-muted text-center">
            {rows.length === 0 ? 'No wallets yet.' : 'No wallets match that search.'}
          </p>
        )}
        {loading && <p className="p-6 sg-text-muted text-center">Loading wallets...</p>}
      </div>
    </div>
  );
}

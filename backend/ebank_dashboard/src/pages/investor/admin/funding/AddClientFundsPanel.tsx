import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Check, Search, Wallet, X } from 'lucide-react';
import { addFundsToClient, getAllFundingRequests, requestReference, type FundingRequest } from '../../../../services/investor/fundingService';
import { getAllInvestorProfiles, type InvestorProfile } from '../../../../services/investor/profileService';
import { getAllWallets } from '../../../../services/investor/walletService';
import { useInvestorAuth } from '../../../../contexts/InvestorAuthContext';
import { logAction } from '../../../../services/investor/auditService';

// Desk-recorded top-up. A funded client who wires more money almost never files
// a fresh in-app request, so finance needs to record the deposit against them
// directly. This is deliberately NOT a "set the balance" box: it credits an
// amount and writes a referenced, invoiceable transaction, so the wallet and
// the paper trail can never disagree. See fundingService.addFundsToClient.

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const clientName = (p: InvestorProfile) =>
  p.displayName?.trim() || [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || p.email || p.id;

interface ClientRow {
  profile: InvestorProfile;
  balance: number;
  /** Requests still in the funding queue - crediting here would double up. */
  openRequests: FundingRequest[];
}

export interface AddClientFundsPanelProps {
  /** Preselect this client (the Wallets page passes the row you clicked). */
  preselectUserId?: string | null;
  /** Fired after a successful credit so the host page can reload its rows. */
  onCredited?: () => void;
  /** Rendered as a Close button when provided. */
  onClose?: () => void;
}

export default function AddClientFundsPanel({ preselectUserId, onCredited, onClose }: AddClientFundsPanelProps) {
  const { user, profile: adminProfile } = useInvestorAuth();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(preselectUserId ?? null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([getAllInvestorProfiles(), getAllWallets(), getAllFundingRequests()])
      .then(([profiles, wallets, requests]) => {
        const balanceByUser = new Map(wallets.map((w) => [w.userId, w.balance]));
        const openByUser = new Map<string, FundingRequest[]>();
        for (const r of requests) {
          // Same definition of "open" the Funding queue uses: still owed work.
          const open = r.status === 'pending' || (r.status === 'approved' && r.awaitingPayment === true);
          if (!open) continue;
          openByUser.set(r.userId, [...(openByUser.get(r.userId) ?? []), r]);
        }
        setClients(
          profiles
            .filter((p) => p.role === 'client')
            .map((p) => ({
              profile: p,
              balance: balanceByUser.get(p.id) ?? 0,
              openRequests: openByUser.get(p.id) ?? [],
            })),
        );
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load clients'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  useEffect(() => {
    if (preselectUserId) {
      setSelectedId(preselectUserId);
      setConfirming(false);
    }
  }, [preselectUserId]);

  const selected = useMemo(
    () => clients.find((c) => c.profile.id === selectedId) ?? null,
    [clients, selectedId],
  );

  // Funded clients first - this panel exists for topping them up, and it saves
  // scrolling past every never-funded applicant to reach them.
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients
      .filter((c) => {
        if (!q) return true;
        const p = c.profile;
        return `${clientName(p)} ${p.email ?? ''} ${p.id}`.toLowerCase().includes(q);
      })
      .sort(
        (a, b) =>
          (b.balance > 0 ? 1 : 0) - (a.balance > 0 ? 1 : 0) ||
          clientName(a.profile).localeCompare(clientName(b.profile)),
      )
      .slice(0, 8);
  }, [clients, search]);

  const parsedAmount = Number(amount.replace(/[$,\s]/g, ''));
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const rounded = Math.round(parsedAmount * 100) / 100;
  const projected = selected && amountValid ? selected.balance + rounded : null;

  const reset = () => {
    setAmount('');
    setNote('');
    setConfirming(false);
  };

  const submit = async () => {
    if (!selected || !amountValid || !user) return;
    setBusy(true);
    try {
      const result = await addFundsToClient({
        userId: selected.profile.id,
        userEmail: selected.profile.email,
        amount: parsedAmount,
        note,
        adminUid: user.uid,
        adminEmail: adminProfile?.email ?? '',
      });
      logAction(
        user.uid,
        adminProfile?.email ?? '',
        'Funds added to client wallet (desk-recorded)',
        `${selected.profile.email ?? selected.profile.id}: ${fmt(result.amount)} (${result.reference}) - balance ${fmt(result.previousBalance)} to ${fmt(result.newBalance)}${note.trim() ? ` - ${note.trim()}` : ''}`,
      );
      toast.success(
        `${fmt(result.amount)} added - new balance ${fmt(result.newBalance)} (${result.reference})`,
        { duration: 6000 },
      );
      reset();
      load();
      onCredited?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add funds');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sg-panel p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold flex items-center gap-2 sg-text-main" style={{ fontFamily: 'var(--sg-font-display)' }}>
            <Wallet className="h-4 w-4" style={{ color: 'var(--sg-teal)' }} />
            Add funds to a client
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--sg-muted-2)' }}>
            For money that arrived outside the request flow - a top-up wire from an existing client,
            a correction. Credits the wallet and files a referenced transaction with an invoice. No
            payment instructions are emailed.
          </p>
        </div>
        {onClose && (
          <button type="button" className="sg-btn-ghost !px-2 !py-1" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!selected ? (
        <div className="space-y-2">
          <label className="text-xs block" style={{ color: 'var(--sg-muted-2)' }}>Client</label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 sg-input-icon" style={{ color: 'var(--sg-muted-2)' }} />
            <input
              className="sg-input sg-input-icon-left"
              placeholder={loading ? 'Loading clients...' : 'Search by name or email'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--sg-border)' }}>
            {matches.map((c) => (
              <button
                key={c.profile.id}
                type="button"
                className="w-full text-left px-3 py-2 flex items-center justify-between gap-3 border-b last:border-b-0 sg-row-border hover:opacity-80"
                onClick={() => { setSelectedId(c.profile.id); setConfirming(false); }}
              >
                <span className="min-w-0">
                  <span className="block sg-text-main truncate">{clientName(c.profile)}</span>
                  <span className="block text-xs truncate" style={{ color: 'var(--sg-muted-2)' }}>{c.profile.email}</span>
                </span>
                <span className="text-right shrink-0">
                  <span
                    className="block text-sm font-semibold"
                    style={{ color: c.balance > 0 ? 'var(--sg-teal)' : 'var(--sg-muted-2)' }}
                  >
                    {fmt(c.balance)}
                  </span>
                  {c.openRequests.length > 0 && (
                    <span className="block text-[11px]" style={{ color: 'var(--sg-gold)' }}>
                      {c.openRequests.length} open request{c.openRequests.length > 1 ? 's' : ''}
                    </span>
                  )}
                </span>
              </button>
            ))}
            {!loading && matches.length === 0 && (
              <p className="px-3 py-4 text-center text-sm sg-text-muted">No clients match that search.</p>
            )}
            {loading && <p className="px-3 py-4 text-center text-sm sg-text-muted">Loading...</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2" style={{ background: 'var(--sg-bg-input)' }}>
            <div className="min-w-0">
              <p className="sg-text-main truncate">{clientName(selected.profile)}</p>
              <p className="text-xs truncate" style={{ color: 'var(--sg-muted-2)' }}>{selected.profile.email}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] uppercase" style={{ color: 'var(--sg-muted-2)' }}>Current balance</p>
              <p className="font-semibold" style={{ color: 'var(--sg-teal)' }}>{fmt(selected.balance)}</p>
            </div>
            <button
              type="button"
              className="sg-btn-ghost !px-3 !py-1.5 shrink-0"
              onClick={() => { setSelectedId(null); reset(); }}
            >
              Change
            </button>
          </div>

          {/* The one way this screen can lose money: crediting here AND then
              confirming the client's own request for the same wire. */}
          {selected.openRequests.length > 0 && (
            <div className="rounded-xl px-3 py-2 text-xs flex gap-2" style={{ border: '1px solid var(--sg-gold)', color: 'var(--sg-gold)' }}>
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                This client already has {selected.openRequests.length} open request
                {selected.openRequests.length > 1 ? 's' : ''} in the queue (
                {selected.openRequests.map((r) => `${requestReference(r)} - ${fmt(r.amount)}`).join(', ')}
                ). If this is that same payment, confirm receipt on the request instead - doing both
                credits the wallet twice.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Amount to add (USD)</label>
              <input
                className="sg-input"
                inputMode="decimal"
                placeholder="25000.00"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setConfirming(false); }}
              />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Note (optional)</label>
              <input
                className="sg-input"
                placeholder="Wire ref / reason - shows on the transaction"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          {projected !== null && (
            <p className="text-sm sg-text-muted">
              New balance will be <strong style={{ color: 'var(--sg-teal)' }}>{fmt(projected)}</strong>
              {` (${fmt(selected.balance)} + ${fmt(rounded)}).`}
            </p>
          )}

          {!confirming ? (
            <button
              type="button"
              className="sg-action-btn !px-4 !py-2"
              disabled={!amountValid || busy}
              style={!amountValid || busy ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              onClick={() => setConfirming(true)}
            >
              Add funds
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm sg-text-main">
                Credit {fmt(rounded)} to {clientName(selected.profile)}?
              </span>
              <button
                type="button"
                className="sg-action-btn !px-4 !py-2 flex items-center gap-1.5"
                disabled={busy}
                style={busy ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                onClick={submit}
              >
                <Check className="h-4 w-4" />
                {busy ? 'Adding...' : 'Confirm & credit wallet'}
              </button>
              <button type="button" className="sg-btn-ghost !px-4 !py-2" disabled={busy} onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

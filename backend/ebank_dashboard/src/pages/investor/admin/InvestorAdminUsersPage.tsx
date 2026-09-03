import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Eye, Search, Trash2 } from 'lucide-react';
import {
  deleteInvestorProfile,
  getAllInvestorProfiles,
  updateInvestorProfile,
  INVESTOR_TIERS,
} from '../../../services/investor/profileService';
import type { InvestorProfile, InvestorTier } from '../../../services/investor/profileService';
import type { AccountStatus, InvestorRole } from '../../../lib/investorRoles';
import { PLAN_IDS, getPlanDefinition, type SubscriptionPlan } from '../../../lib/subscriptionPlans';
import {
  setPlanForUser,
  getAllPendingPlanRequests,
  resolvePlanRequest,
  type PlanRequest,
} from '../../../services/investor/subscriptionService';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { logAction } from '../../../services/investor/auditService';
import ClientDetailsDrawer from './users/ClientDetailsDrawer';

const STATUSES: AccountStatus[] = ['pending', 'active', 'suspended', 'locked'];
const ROLES: InvestorRole[] = ['client', 'support', 'admin', 'finance', 'compliance', 'super_admin'];

// The uid column used to sit in the table, where it wrapped over two lines and
// squeezed every dropdown into "pendin" / "standa". It lives in the details
// drawer now, with a copy button - staff needed to read it, not scan it.

function AccountManagerCell({ user, onSaved }: { user: InvestorProfile; onSaved: () => void }) {
  const { user: adminUser, profile: adminProfile } = useInvestorAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.accountManager?.name ?? '');
  const [email, setEmail] = useState(user.accountManager?.email ?? '');
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-sm">
          {user.accountManager?.name ? (
            <>
              <div className="sg-text-main">{user.accountManager.name}</div>
              <div className="sg-text-faint text-xs">{user.accountManager.email}</div>
            </>
          ) : (
            <span className="sg-text-faint">Unassigned</span>
          )}
        </div>
        <button
          type="button"
          className="sg-action-btn text-xs px-2 py-1"
          onClick={() => {
            setName(user.accountManager?.name ?? '');
            setEmail(user.accountManager?.email ?? '');
            setEditing(true);
          }}
        >
          Edit
        </button>
      </div>
    );
  }

  const save = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setSaving(true);
    try {
      await updateInvestorProfile(user.id, { accountManager: { name: name.trim(), email: email.trim() } });
      if (adminUser) logAction(adminUser.uid, adminProfile?.email ?? '', 'Account manager assigned', `${user.email}: ${name.trim()}`);
      toast.success('Account manager updated');
      setEditing(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update account manager');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 min-w-[180px]">
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="sg-input py-1 px-2 text-sm"
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="sg-input py-1 px-2 text-sm"
      />
      <div className="flex gap-2">
        <button type="button" className="sg-action-btn text-xs px-2 py-1" disabled={saving} onClick={save}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" className="sg-btn-ghost text-xs px-2 py-1" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function InvestorAdminUsersPage() {
  const { user, profile: adminProfile } = useInvestorAuth();
  const [rows, setRows] = useState<InvestorProfile[]>([]);
  const [planRequests, setPlanRequests] = useState<Map<string, PlanRequest>>(new Map());
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<InvestorRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AccountStatus | 'all'>('all');
  // Held by id, not by object, so the drawer picks up an inline edit on reload.
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const loadPlanRequests = () => {
    getAllPendingPlanRequests().then(setPlanRequests).catch(() => {});
  };

  useEffect(loadPlanRequests, []);
  const load = () =>
    getAllInvestorProfiles()
      .then(setRows)
      .catch((e) => toast.error(e.message));

  useEffect(() => { load(); }, []);

  const emailCounts = rows.reduce<Record<string, number>>((acc, u) => {
    acc[u.email] = (acc[u.email] ?? 0) + 1;
    return acc;
  }, {});

  const displayName = (u: InvestorProfile) =>
    [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.displayName?.trim() || '';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && u.accountStatus !== statusFilter) return false;
      if (!q) return true;
      // uid included: staff paste one in from a Firestore or log lookup.
      return `${u.email} ${displayName(u)} ${u.id}`.toLowerCase().includes(q);
    });
  }, [rows, search, roleFilter, statusFilter]);

  const clientCount = rows.filter((u) => u.role === 'client').length;
  const pendingCount = rows.filter((u) => u.accountStatus === 'pending').length;
  const duplicateCount = Object.values(emailCounts).filter((n) => n > 1).length;
  const filtersOn = search !== '' || roleFilter !== 'all' || statusFilter !== 'all';
  const detailsProfile = detailsId ? rows.find((u) => u.id === detailsId) ?? null : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="sg-page-title">Users</h1>
        <p className="sg-page-sub mt-1">
          Every profile on the platform. Set role, status, tier and plan inline; open Details for the
          full client record - onboarding, compliance, KYC and money.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="sg-panel p-4">
          <p className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)' }}>Profiles</p>
          <p className="text-2xl font-semibold mt-1" style={{ fontFamily: 'var(--sg-font-display)' }}>{rows.length}</p>
        </div>
        <div className="sg-panel p-4">
          <p className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)' }}>Clients</p>
          <p className="text-2xl font-semibold mt-1" style={{ fontFamily: 'var(--sg-font-display)' }}>{clientCount}</p>
        </div>
        <div className="sg-panel p-4">
          <p className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)' }}>Pending</p>
          <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--sg-gold)', fontFamily: 'var(--sg-font-display)' }}>{pendingCount}</p>
        </div>
        <div className="sg-panel p-4">
          <p className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)' }}>Duplicate emails</p>
          <p
            className="text-2xl font-semibold mt-1"
            style={{ color: duplicateCount ? 'var(--sg-danger)' : 'var(--sg-muted-2)', fontFamily: 'var(--sg-font-display)' }}
          >
            {duplicateCount}
          </p>
        </div>
      </div>

      <div className="sg-panel p-3 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Search</label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 sg-input-icon" style={{ color: 'var(--sg-muted-2)' }} />
            <input
              className="sg-input sg-input-icon-left"
              placeholder="Name, email or user ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Role</label>
          <select className="sg-input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as InvestorRole | 'all')}>
            <option value="all">All roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Status</label>
          <select className="sg-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AccountStatus | 'all')}>
            <option value="all">All statuses</option>
            {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>
        {filtersOn && (
          <button
            type="button"
            className="sg-btn-ghost"
            onClick={() => { setSearch(''); setRoleFilter('all'); setStatusFilter('all'); }}
          >
            Clear
          </button>
        )}
        <span className="text-xs ml-auto" style={{ color: 'var(--sg-muted-2)' }}>
          {filtered.length} of {rows.length}
        </span>
      </div>

      <div className="sg-panel overflow-x-auto sg-table-stack-wrap p-3 md:p-0">
        <table className="min-w-full text-sm sg-table-stack">
          <thead className="sg-text-muted">
            <tr>
              <th className="text-left p-4">Client</th>
              <th className="text-left p-4">Role</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Tier</th>
              <th className="text-left p-4">Plan</th>
              <th className="text-left p-4">Account Manager</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t sg-row-border">
                <td className="p-4" data-label="Client">
                  {displayName(u) && <span className="block sg-text-main">{displayName(u)}</span>}
                  <span className="block text-xs" style={{ color: displayName(u) ? 'var(--sg-muted-2)' : 'var(--sg-text)' }}>
                    {u.email}
                  </span>
                  {emailCounts[u.email] > 1 && (
                    <span className="text-xs font-semibold" style={{ color: 'var(--sg-danger)' }}>
                      duplicate ({emailCounts[u.email]})
                    </span>
                  )}
                </td>
                <td className="p-4" data-label="Role">
                  <select
                    className="sg-input py-1 px-2 text-sm min-w-[120px]"
                    value={u.role}
                    onChange={async (e) => {
                      const newRole = e.target.value as InvestorRole;
                      try {
                        await updateInvestorProfile(u.id, { role: newRole });
                        if (user) logAction(user.uid, adminProfile?.email ?? '', 'Role changed', `${u.email}: ${u.role} → ${newRole}`);
                        toast.success('Role updated');
                        load();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Failed to update role');
                      }
                    }}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="p-4" data-label="Status">
                  <select
                    className="sg-input py-1 px-2 text-sm min-w-[110px]"
                    value={u.accountStatus}
                    onChange={async (e) => {
                      const newStatus = e.target.value as AccountStatus;
                      try {
                        await updateInvestorProfile(u.id, { accountStatus: newStatus });
                        if (user) logAction(user.uid, adminProfile?.email ?? '', 'Status changed', `${u.email}: ${u.accountStatus} → ${newStatus}`);
                        toast.success('Status updated');
                        load();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Failed to update status');
                      }
                    }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="p-4" data-label="Tier">
                  {/* Trade Desk eligibility: advanced/institutional can self-trade */}
                  <select
                    className="sg-input py-1 px-2 text-sm min-w-[130px]"
                    value={u.investorTier ?? 'standard'}
                    onChange={async (e) => {
                      const newTier = e.target.value as InvestorTier;
                      try {
                        await updateInvestorProfile(u.id, { investorTier: newTier });
                        if (user) logAction(user.uid, adminProfile?.email ?? '', 'Investor tier changed', `${u.email}: ${u.investorTier ?? 'standard'} → ${newTier}`);
                        toast.success('Tier updated');
                        load();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Failed to update tier');
                      }
                    }}
                  >
                    {INVESTOR_TIERS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </td>
                <td className="p-4" data-label="Plan">
                  <select
                    className="sg-input py-1 px-2 text-sm min-w-[120px]"
                    value={u.plan ?? 'free'}
                    onChange={async (e) => {
                      const newPlan = e.target.value as SubscriptionPlan;
                      const prevPlan = u.plan ?? 'free';
                      try {
                        await setPlanForUser(u.id, newPlan);
                        if (user) logAction(user.uid, adminProfile?.email ?? '', 'Plan changed', `${u.email}: ${prevPlan} → ${newPlan}`);

                        // Close any outstanding request from this client so it
                        // stops showing as pending once we have acted on it.
                        const pending = planRequests.get(u.id);
                        if (pending) {
                          await resolvePlanRequest(
                            pending.id,
                            pending.requestedPlan === newPlan ? 'approved' : 'declined',
                          );
                          loadPlanRequests();
                        }

                        toast.success('Plan updated');
                        load();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Failed to update plan');
                      }
                    }}
                  >
                    {PLAN_IDS.map((id) => (
                      <option key={id} value={id}>{getPlanDefinition(id).label}</option>
                    ))}
                  </select>
                  {planRequests.has(u.id) && (
                    <div
                      className="text-[10px] mt-1 whitespace-nowrap"
                      style={{ color: 'var(--sg-gold)' }}
                      title="This client asked about a plan change"
                    >
                      asked about {getPlanDefinition(planRequests.get(u.id)!.requestedPlan).label}
                    </div>
                  )}
                </td>
                <td className="p-4" data-label="Manager">
                  <AccountManagerCell user={u} onSaved={load} />
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                  <button
                    type="button"
                    className="sg-action-btn flex items-center gap-1.5"
                    onClick={() => setDetailsId(u.id)}
                  >
                    <Eye className="h-3.5 w-3.5" /> Details
                  </button>
                  <button
                    type="button"
                    className="sg-action-btn flex items-center gap-1.5"
                    style={{ background: 'rgba(239,68,68,.12)', color: 'var(--sg-danger)' }}
                    onClick={async () => {
                      const ok = window.confirm(
                        `Delete the Firestore profile for ${u.email} (uid ${u.id})?\n\n` +
                          'This only removes the profile document, not the Firebase Auth account if one still ' +
                          'exists for this uid. Safe for orphaned duplicates; if this uid still has a live login, ' +
                          'a fresh blank profile will be recreated the next time they sign in.',
                      );
                      if (!ok) return;
                      try {
                        await deleteInvestorProfile(u.id);
                        if (user) logAction(user.uid, adminProfile?.email ?? '', 'Profile deleted', `${u.email} (${u.id})`);
                        toast.success('Profile deleted');
                        load();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Failed to delete profile');
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-8 text-center sg-text-muted">
            {rows.length === 0 ? 'No profiles yet.' : 'No users match these filters.'}
          </p>
        )}
      </div>

      {detailsProfile && (
        <ClientDetailsDrawer profile={detailsProfile} onClose={() => setDetailsId(null)} />
      )}
    </div>
  );
}

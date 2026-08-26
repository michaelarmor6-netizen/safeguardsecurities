import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
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

const STATUSES: AccountStatus[] = ['pending', 'active', 'suspended', 'locked'];

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

  return (
    <div className="space-y-4">
      <h1 className="sg-page-title">Users</h1>
      <div className="sg-panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sg-text-muted">
            <tr>
              <th className="text-left p-4">Email</th>
              <th className="text-left p-4">Doc ID (uid)</th>
              <th className="text-left p-4">Role</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Tier</th>
              <th className="text-left p-4">Plan</th>
              <th className="text-left p-4">Account Manager</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t sg-row-border">
                <td className="p-4 sg-text-main">
                  {u.email}
                  {emailCounts[u.email] > 1 && (
                    <span className="ml-2 text-xs font-semibold" style={{ color: 'var(--sg-danger)' }}>
                      duplicate ({emailCounts[u.email]})
                    </span>
                  )}
                </td>
                <td className="p-4 sg-text-faint font-mono text-xs break-all">{u.id}</td>
                <td className="p-4">
                  <select
                    className="sg-input py-1 px-2 text-sm"
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
                    {['client', 'support', 'admin', 'finance', 'compliance', 'super_admin'].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="p-4">
                  <select
                    className="sg-input py-1 px-2 text-sm"
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
                <td className="p-4">
                  {/* Trade Desk eligibility: advanced/institutional can self-trade */}
                  <select
                    className="sg-input py-1 px-2 text-sm"
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
                <td className="p-4">
                  <select
                    className="sg-input py-1 px-2 text-sm"
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
                <td className="p-4">
                  <AccountManagerCell user={u} onSaved={load} />
                </td>
                <td className="p-4">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

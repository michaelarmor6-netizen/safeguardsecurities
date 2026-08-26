import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShieldCheck } from 'lucide-react';
import { getAllInvestorProfiles } from '../../../../services/investor/profileService';
import type { InvestorRole } from '../../../../lib/investorRoles';

const ROLE_INFO: { role: InvestorRole; description: string; permissions: string[] }[] = [
  {
    role: 'client',
    description: 'Investor. Access limited to their own workspace, portfolio, orders, and support tickets.',
    permissions: ['View own dashboard, positions, orders', 'Submit KYC and funding requests', 'Place self-directed orders (pending review)'],
  },
  {
    role: 'support',
    description: 'Front-line staff. Handles applicants, KYC review, and support tickets.',
    permissions: ['Review applicants and KYC submissions', 'Respond to support tickets', 'Read-only on trading/financial data'],
  },
  {
    role: 'finance',
    description: 'Handles funding, wallets, and cash operations.',
    permissions: ['Approve/reject funding requests', 'Manage wallet balances', 'View executed trades and statements'],
  },
  {
    role: 'compliance',
    description: 'Oversight and audit access across the platform.',
    permissions: ['Review KYC and account status changes', 'Full audit log access', 'View all trading activity'],
  },
  {
    role: 'admin',
    description: 'Full operational access to the admin console.',
    permissions: ['Everything above', 'Execute trades, manage asset catalog', 'Create/manage user accounts'],
  },
  {
    role: 'super_admin',
    description: 'Full platform control, including staff role assignment and settings.',
    permissions: ['Everything above', 'Assign roles to other staff', 'Change platform-wide settings'],
  },
];

export default function SettingsRolesSection() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllInvestorProfiles()
      .then((rows) => {
        const c: Record<string, number> = {};
        rows.forEach((r) => { c[r.role] = (c[r.role] ?? 0) + 1; });
        setCounts(c);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load role counts'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="sg-panel p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4" style={{ color: 'var(--sg-indigo)' }} />
        <h3 className="font-semibold sg-text-main">Roles &amp; Permissions</h3>
      </div>
      <p className="text-sm sg-text-muted">
        Reference for what each role can access. Permissions are enforced by Firestore security rules and are fixed
        per role — to change a specific user's role, use{' '}
        <Link to="/admin/users" style={{ color: 'var(--sg-indigo)' }}>Users</Link>.
      </p>

      <div className="space-y-3">
        {ROLE_INFO.map((r) => (
          <div key={r.role} className="sg-card p-4" style={{ borderRadius: 12 }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-semibold capitalize sg-text-main">{r.role.replace('_', ' ')}</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,.14)', color: 'var(--sg-indigo)' }}>
                {loading ? '…' : counts[r.role] ?? 0} user{(counts[r.role] ?? 0) === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--sg-muted)' }}>{r.description}</p>
            <ul className="list-disc list-inside mt-2 text-xs space-y-0.5" style={{ color: 'var(--sg-muted-2)' }}>
              {r.permissions.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

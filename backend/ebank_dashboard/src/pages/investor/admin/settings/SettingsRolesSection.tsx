import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ShieldCheck, UserPlus, Copy, Check, AlertTriangle } from 'lucide-react';
import { getAllInvestorProfiles } from '../../../../services/investor/profileService';
import {
  createStaffAccount,
  CREATABLE_STAFF_ROLES,
  type CreatableStaffRole,
  type CreateStaffAccountResult,
} from '../../../../services/investor/investorAccountService';
import { useInvestorAuth } from '../../../../contexts/InvestorAuthContext';
import type { InvestorRole } from '../../../../lib/investorRoles';

// What each creatable role gets, in the words of the job rather than the
// ruleset - this is the sentence the person granting access should be able to
// read back and recognise.
const ROLE_SUMMARY: Record<CreatableStaffRole, string> = {
  support: 'Reads client data and answers tickets. Cannot move money or verify identity.',
  finance: 'Approves funding, credits wallets, opens wallets. The role that touches money.',
  compliance: 'Verifies and rejects KYC. Cannot move money.',
  admin: 'Everything above, plus granting roles and deleting profiles.',
};

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

// Creating staff is granting privilege, so only an administrator sees this.
// The Cloud Function enforces the same rule - this only decides whether to
// render a form the server would refuse anyway.
function CreateStaffPanel({ onCreated }: { onCreated: () => void }) {
  const { profile } = useInvestorAuth();
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CreatableStaffRole>('finance');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<(CreateStaffAccountResult & { email: string }) | null>(null);
  const [copied, setCopied] = useState(false);

  const canGrant = profile?.role === 'admin' || profile?.role === 'super_admin';
  if (!canGrant) return null;

  const reset = () => {
    setFirstName(''); setLastName(''); setEmail(''); setRole('finance'); setCopied(false);
  };

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error('Name and email are required.');
      return;
    }
    setBusy(true);
    try {
      const result = await createStaffAccount({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
      });
      setCreated({ ...result, email: email.trim() });
      reset();
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create the staff account');
    } finally {
      setBusy(false);
    }
  };

  // Shown once. Firebase Auth stores only a hash, so this password cannot be
  // read back from anywhere after this panel closes.
  if (created) {
    return (
      <div className="sg-card p-4 space-y-3" style={{ borderRadius: 12, border: '1px solid var(--sg-teal)' }}>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4" style={{ color: 'var(--sg-teal)' }} />
          <h4 className="font-semibold sg-text-main">
            {created.email} created as {created.role}
          </h4>
        </div>
        <div className="flex items-start gap-2 text-xs" style={{ color: 'var(--sg-gold)' }}>
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Give them this temporary password now — it is not stored anywhere and cannot be shown
            again. They should change it on first sign-in.
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <code
            className="px-3 py-2 rounded-lg font-mono text-sm break-all"
            style={{ background: 'var(--sg-bg-input)', color: 'var(--sg-text)' }}
          >
            {created.temporaryPassword}
          </code>
          <button
            type="button"
            className="sg-action-btn flex items-center gap-1.5"
            onClick={() => {
              navigator.clipboard?.writeText(created.temporaryPassword).then(
                () => { setCopied(true); toast.success('Password copied'); },
                () => toast.error('Could not copy'),
              );
            }}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <button type="button" className="sg-btn-ghost !px-3 !py-1.5 text-sm" onClick={() => { setCreated(null); setOpen(false); }}>
          Done
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        className="sg-action-btn !px-4 !py-2 flex items-center gap-1.5"
        onClick={() => setOpen(true)}
      >
        <UserPlus className="h-4 w-4" />
        Add a staff member
      </button>
    );
  }

  return (
    <div className="sg-card p-4 space-y-3" style={{ borderRadius: 12 }}>
      <h4 className="font-semibold sg-text-main">Add a staff member</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>First name</label>
          <input className="sg-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Last name</label>
          <input className="sg-input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Work email</label>
          <input
            className="sg-input"
            type="email"
            autoComplete="off"
            placeholder="name@safeguardsecurities.us"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Role</label>
          <select className="sg-input" value={role} onChange={(e) => setRole(e.target.value as CreatableStaffRole)}>
            {CREATABLE_STAFF_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <p className="text-xs mt-1.5" style={{ color: 'var(--sg-muted-2)' }}>{ROLE_SUMMARY[role]}</p>
        </div>
      </div>
      <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>
        The account is created active, with a temporary password shown once on the next screen.
        Staff skip client onboarding entirely.
      </p>
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          className="sg-action-btn !px-4 !py-2"
          disabled={busy}
          style={busy ? { opacity: .5, cursor: 'not-allowed' } : undefined}
          onClick={submit}
        >
          {busy ? 'Creating…' : `Create ${role} account`}
        </button>
        <button type="button" className="sg-btn-ghost !px-4 !py-2" disabled={busy} onClick={() => { setOpen(false); reset(); }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function SettingsRolesSection() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const load = () => {
    getAllInvestorProfiles()
      .then((rows) => {
        const c: Record<string, number> = {};
        rows.forEach((r) => { c[r.role] = (c[r.role] ?? 0) + 1; });
        setCounts(c);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load role counts'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <div className="sg-panel p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4" style={{ color: 'var(--sg-indigo)' }} />
        <h3 className="font-semibold sg-text-main">Roles &amp; Permissions</h3>
      </div>
      <p className="text-sm sg-text-muted">
        What each role can access. Permissions are enforced by Firestore security rules and are fixed
        per role — to change an existing user's role, use{' '}
        <Link to="/admin/users" style={{ color: 'var(--sg-indigo)' }}>Users</Link>.
      </p>

      <CreateStaffPanel onCreated={load} />

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

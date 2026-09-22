import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react';
import { getPendingApplicants, updateInvestorProfile } from '../../../services/investor/profileService';
import type { InvestorProfile } from '../../../services/investor/profileService';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { logAction } from '../../../services/investor/auditService';
import {
  matchesClientSearch,
  profileFullName,
  profileUsername,
  type ClientSearchField,
} from '../../../lib/clientSearch';
import ClientSearchToolbar from '../../../components/investor/admin/ClientSearchToolbar';

// Applicant queue. Two rules shape it:
//   * oldest first by default - this is a work queue, and FIFO is the only
//     ordering that is fair to the person who applied on Monday;
//   * waiting time is shown, not just the timestamp, because "3 days" reads
//     as the call to action that "Aug 22, 09:14" never will.

const DAY_MS = 86_400_000;
const STALE_MS = 3 * DAY_MS; // waiting longer than this gets flagged

function fmtSubmitted(d?: Date): string {
  if (!d) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function fmtWaiting(d?: Date): string {
  if (!d) return '';
  const ms = Date.now() - d.getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} min ago`;
  if (ms < DAY_MS) return `${Math.floor(ms / 3_600_000)} h ago`;
  return `${Math.floor(ms / DAY_MS)} d ago`;
}

function applicantName(u: InvestorProfile): string {
  return profileFullName(u) || profileUsername(u) || '—';
}

export default function InvestorAdminApplicantsPage() {
  const { user, profile: adminProfile } = useInvestorAuth();
  const [rows, setRows] = useState<InvestorProfile[]>([]);
  const [oldestFirst, setOldestFirst] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchField, setSearchField] = useState<ClientSearchField>('all');

  const load = () =>
    getPendingApplicants()
      .then(setRows)
      .catch((e) => toast.error(e.message));

  useEffect(() => { load(); }, []);

  // Sorted client-side: a where + orderBy over profiles would demand a
  // composite index for a list that is rarely more than a page long.
  // Profiles with no createdAt (legacy rows) sink to the bottom either way.
  const sorted = useMemo(() => {
    const matched = rows.filter((r) => matchesClientSearch(r, search, searchField));
    const withDate = matched.filter((r) => r.createdAt);
    const without = matched.filter((r) => !r.createdAt);
    withDate.sort((a, b) => (a.createdAt!.getTime() - b.createdAt!.getTime()) * (oldestFirst ? 1 : -1));
    return [...withDate, ...without];
  }, [rows, oldestFirst, search, searchField]);

  const act = async (u: InvestorProfile, status: 'active' | 'suspended') => {
    const verb = status === 'active' ? 'approve' : 'decline';
    if (status === 'suspended' &&
      !window.confirm(`Decline ${u.email}? Their account is set to suspended; they cannot sign in until a staff member reactivates them from Users.`)) return;
    setBusyId(u.id);
    try {
      await updateInvestorProfile(u.id, { accountStatus: status });
      if (user) logAction(user.uid, adminProfile?.email ?? '', `Applicant ${verb}d`, u.email);
      toast.success(status === 'active' ? 'Approved' : 'Declined');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `Failed to ${verb} applicant`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="sg-desk">
      <div className="sg-desk-head">
        <div className="min-w-0">
          <h1 className="sg-page-title">New Applicants{rows.length > 0 ? ` (${rows.length})` : ''}</h1>
          <p className="sg-page-sub mt-1">
            Sorted {oldestFirst ? 'oldest first — the fair processing order' : 'newest first'}.
            Applications waiting more than 3 days are flagged.
          </p>
        </div>
        <ClientSearchToolbar
          search={search}
          searchField={searchField}
          onSearch={setSearch}
          onField={setSearchField}
          onClear={() => setSearch('')}
          showClear={search !== ''}
        >
          <button type="button" className="sg-action-btn inline-flex items-center gap-1.5"
            onClick={() => setOldestFirst((v) => !v)}>
            {oldestFirst ? <ArrowUpNarrowWide size={15} /> : <ArrowDownWideNarrow size={15} />}
            {oldestFirst ? 'Oldest first' : 'Newest first'}
          </button>
        </ClientSearchToolbar>
      </div>
      <div className="sg-panel sg-desk-list">
        <table className="sg-desk-table sg-table-stack text-sm">
          <thead className="sg-text-muted">
            <tr>
              <th className="text-left">Applicant</th>
              <th className="text-left">Email</th>
              <th className="text-left sg-col-mid">Submitted</th>
              <th className="text-left">Waiting</th>
              <th className="text-left sg-col-wide">Source</th>
              <th className="text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => {
              const stale = !!u.createdAt && Date.now() - u.createdAt.getTime() > STALE_MS;
              return (
                <tr key={u.id} className="border-t sg-row-border">
                  <td className="sg-text-main" data-label="Applicant">
                    <span className="sg-desk-client-name">{applicantName(u)}</span>
                  </td>
                  <td className="sg-text-main" data-label="Email">
                    <span className="sg-desk-client-email">{u.email}</span>
                  </td>
                  <td className="sg-text-muted sg-col-mid" data-label="Submitted">{fmtSubmitted(u.createdAt)}</td>
                  <td data-label="Waiting">
                    <span className="sg-text-muted">{fmtWaiting(u.createdAt)}</span>
                    {stale && (
                      <span className="ml-2 text-xs font-semibold" style={{ color: 'var(--sg-amber, #f59e0b)' }}>
                        needs attention
                      </span>
                    )}
                  </td>
                  <td className="sg-text-muted sg-col-wide" data-label="Source">
                    {u.onboardingSource === 'admin' ? 'staff-created' : 'self-signup'}
                  </td>
                  <td>
                    <div className="sg-desk-actions">
                      <button type="button" className="sg-action-btn" disabled={busyId === u.id}
                        onClick={() => act(u, 'active')}>
                        Approve
                      </button>
                      <button type="button" className="sg-action-btn" style={{ opacity: 0.75 }}
                        disabled={busyId === u.id} onClick={() => act(u, 'suspended')}>
                        Decline
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <p className="p-6 sg-text-muted text-center">
            {rows.length === 0 ? 'No pending applicants.' : 'No applicants match this search.'}
          </p>
        )}
      </div>
    </div>
  );
}

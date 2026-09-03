import { useEffect, useState } from 'react';
import { Copy, ExternalLink, X } from 'lucide-react';
import toast from 'react-hot-toast';
import type { InvestorProfile } from '../../../../services/investor/profileService';
import { getUserWallet } from '../../../../services/investor/walletService';
import { backfillDepositLedger, getFundingRequestsForUser, requestReference, type FundingRequest } from '../../../../services/investor/fundingService';
import { getKycSubmissionsForUser, type KycSubmission } from '../../../../services/investor/kycService';

// Everything the desk knows about one client, in one place. The Users table
// answers "who exists and what are they set to"; this answers "who IS this
// person" - the onboarding record, their money, and their KYC - without
// hopping between four admin pages and a Firestore console tab.
//
// Most fields come from onboarding, which plenty of accounts never finish, so
// every section renders even when empty and says so. A blank Employment block
// is itself the useful answer.

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const fmtDate = (d?: Date) =>
  d ? d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const titleCase = (s?: string) =>
  s ? s.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';

// Cards inside the drawer sit on an opaque ground, so they need their own
// solid fill rather than .sg-panel's translucent one.
const tileStyle: React.CSSProperties = {
  background: 'var(--sg-bg-elevated)',
  border: '1px solid var(--sg-border)',
};

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--sg-muted-2)' }}>{label}</p>
      <p className="text-sm sg-text-main break-words">{value?.toString().trim() ? value : '—'}</p>
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty?: boolean; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--sg-teal)' }}>{title}</h3>
      {empty ? (
        <p className="text-sm" style={{ color: 'var(--sg-muted-2)' }}>Not provided — this part of onboarding was never completed.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">{children}</div>
      )}
    </section>
  );
}

function YesNo({ label, value }: { label: string; value?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--sg-muted-2)' }}>{label}</p>
      <p className="text-sm font-semibold" style={{ color: value ? 'var(--sg-teal)' : 'var(--sg-muted-2)' }}>
        {value === undefined ? '—' : value ? 'Yes' : 'No'}
      </p>
    </div>
  );
}

export interface ClientDetailsDrawerProps {
  profile: InvestorProfile;
  onClose: () => void;
}

export default function ClientDetailsDrawer({ profile, onClose }: ClientDetailsDrawerProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [requests, setRequests] = useState<FundingRequest[]>([]);
  const [kyc, setKyc] = useState<KycSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [repairing, setRepairing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Esc closes, and the page behind must not scroll while the drawer is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Money and KYC are separate collections - a client with no wallet or no
    // submission is normal, so a failure on one must not blank the whole panel.
    Promise.allSettled([
      getUserWallet(profile.id),
      getFundingRequestsForUser(profile.id),
      getKycSubmissionsForUser(profile.id),
    ])
      .then(([w, f, k]) => {
        if (cancelled) return;
        setBalance(w.status === 'fulfilled' ? (w.value?.balance ?? 0) : null);
        setRequests(f.status === 'fulfilled' ? f.value : []);
        setKyc(k.status === 'fulfilled' ? k.value : []);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [profile.id, reloadKey]);

  // Deposits credited before the ledger fix never posted a cashLedger entry,
  // so this client's statement has no closing balance (or a stale one). This
  // replays the missing entries. Idempotent - safe to press twice.
  const repairLedger = async () => {
    setRepairing(true);
    try {
      const result = await backfillDepositLedger(profile.id);
      toast.success(
        result.posted === 0
          ? 'Ledger already complete — nothing to repair.'
          : `Posted ${result.posted} missing deposit ${result.posted === 1 ? 'entry' : 'entries'} (${result.entries.join(', ')}).`,
        { duration: 6000 },
      );
      setReloadKey((k) => k + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not repair the ledger');
    } finally {
      setRepairing(false);
    }
  };

  const settled = requests.filter(
    (r) => r.status === 'funded' || (r.status === 'approved' && r.awaitingPayment !== true),
  );
  const open = requests.filter(
    (r) => r.status === 'pending' || (r.status === 'approved' && r.awaitingPayment === true),
  );
  const totalFunded = settled.reduce((sum, r) => sum + r.amount, 0);
  const latestKyc = kyc[0];

  const fullName = [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(' ').trim()
    || profile.displayName?.trim()
    || '';

  const addr = profile.address;
  const addressLines = addr
    ? [addr.line1, addr.line2, [addr.city, addr.state, addr.postalCode].filter(Boolean).join(', '), addr.country]
        .filter((l) => l && String(l).trim())
        .join('\n')
    : '';

  const copyUid = () => {
    navigator.clipboard?.writeText(profile.id).then(
      () => toast.success('User ID copied'),
      () => toast.error('Could not copy'),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(2,6,23,.72)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* --sg-surface (what .sg-panel uses) is rgba(255,255,255,.04) in the
          dark theme - fine for a panel resting on the page, see-through as an
          overlay. A drawer floats over content, so it needs an OPAQUE token:
          --sg-bg-panel is #0e1433 dark / #ffffff light. */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Client details for ${profile.email}`}
        className="relative h-full w-full max-w-2xl overflow-y-auto p-4 sm:p-5 space-y-5"
        style={{
          background: 'var(--sg-bg-panel)',
          borderLeft: '1px solid var(--sg-border)',
          boxShadow: '-24px 0 60px rgba(0,0,0,.45)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="sg-page-title truncate">{fullName || profile.email}</h2>
            <p className="text-sm truncate" style={{ color: 'var(--sg-muted)' }}>{profile.email}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px]">
              {[titleCase(profile.role), titleCase(profile.accountStatus), `${titleCase(profile.investorTier ?? 'standard')} tier`, `${titleCase(profile.plan ?? 'free')} plan`].map((chip) => (
                <span key={chip} className="px-2 py-0.5 rounded-full" style={{ border: '1px solid var(--sg-border)', color: 'var(--sg-muted)' }}>
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <button type="button" className="sg-btn-ghost !px-2 !py-1 shrink-0" onClick={onClose} aria-label="Close details">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Money first - it is what the desk opens this panel for. */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="p-3 rounded-xl" style={tileStyle}>
            <p className="text-[11px] uppercase" style={{ color: 'var(--sg-muted-2)' }}>Wallet balance</p>
            <p className="text-base sm:text-lg font-semibold mt-0.5" style={{ color: 'var(--sg-teal)' }}>
              {loading ? '…' : balance === null ? '—' : fmtMoney(balance)}
            </p>
          </div>
          <div className="p-3 rounded-xl" style={tileStyle}>
            <p className="text-[11px] uppercase" style={{ color: 'var(--sg-muted-2)' }}>Total funded</p>
            <p className="text-base sm:text-lg font-semibold mt-0.5 sg-text-main">{loading ? '…' : fmtMoney(totalFunded)}</p>
          </div>
          <div className="p-3 rounded-xl" style={tileStyle}>
            <p className="text-[11px] uppercase" style={{ color: 'var(--sg-muted-2)' }}>Open requests</p>
            <p className="text-base sm:text-lg font-semibold mt-0.5" style={{ color: open.length ? 'var(--sg-gold)' : 'var(--sg-muted-2)' }}>
              {loading ? '…' : open.length}
            </p>
          </div>
        </div>

        {/* Deposits credited before the ledger fix left no cashLedger entry, so
            this client's statement shows no closing balance. Replaying them is
            idempotent, so this is safe to run on anyone. */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            className="sg-btn-ghost !px-3 !py-1.5 text-xs"
            disabled={repairing}
            style={repairing ? { opacity: .5, cursor: 'not-allowed' } : undefined}
            onClick={repairLedger}
          >
            {repairing ? 'Checking…' : 'Repair statement ledger'}
          </button>
          <span className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>
            Posts any deposit that predates the ledger fix, so statements reconcile.
          </span>
        </div>

        <Section title="Account">
          <Field label="User ID (uid)" value={profile.id} />
          <div>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--sg-muted-2)' }}>&nbsp;</p>
            <button type="button" className="sg-btn-ghost !px-2 !py-1 text-xs flex items-center gap-1.5" onClick={copyUid}>
              <Copy className="h-3.5 w-3.5" /> Copy ID
            </button>
          </div>
          <Field label="Registered" value={fmtDate(profile.createdAt)} />
          <Field label="Created by" value={profile.createdBy} />
          <Field
            label="Onboarding"
            value={
              profile.onboardingCompleted
                ? `Completed ${fmtDate(profile.onboardingCompletedAt)}`
                : profile.onboardingSkipped
                  ? 'Skipped'
                  : 'Not completed'
            }
          />
          <Field label="Onboarding source" value={titleCase(profile.onboardingSource)} />
        </Section>

        <Section title="Personal">
          <Field label="Full name" value={fullName} />
          <Field label="Date of birth" value={profile.dateOfBirth} />
          <Field label="Gender" value={titleCase(profile.gender)} />
          <Field label="Phone" value={profile.phone} />
          <Field label="Citizenship" value={profile.citizenship} />
          <Field label="Residency" value={profile.residencyCountry} />
          <Field label="ID type" value={titleCase(profile.idType)} />
        </Section>

        <Section title="Address" empty={!addr}>
          <div className="sm:col-span-2">
            <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--sg-muted-2)' }}>Residential address</p>
            <p className="text-sm sg-text-main whitespace-pre-line">{addressLines || '—'}</p>
          </div>
        </Section>

        <Section title="Employment" empty={!profile.employment}>
          <Field label="Status" value={titleCase(profile.employment?.status)} />
          <Field label="Employer" value={profile.employment?.employer} />
          <Field label="Job title" value={profile.employment?.jobTitle} />
          <Field label="Annual income" value={profile.employment?.annualIncome} />
          <Field label="Income source" value={titleCase(profile.employment?.incomeSource)} />
        </Section>

        <Section title="Investment profile" empty={!profile.investmentProfile}>
          <Field label="Objective" value={titleCase(profile.investmentProfile?.objective)} />
          <Field label="Risk tolerance" value={titleCase(profile.investmentProfile?.riskTolerance)} />
          <Field label="Experience" value={titleCase(profile.investmentProfile?.experienceLevel)} />
          <Field label="Initial funding intent" value={profile.investmentProfile?.initialFundingIntent} />
          <Field label="Source of funds" value={titleCase(profile.investmentProfile?.sourceOfFunds)} />
        </Section>

        <Section title="Compliance" empty={!profile.compliance}>
          <Field label="FATCA status" value={titleCase(profile.compliance?.fatcaStatus)} />
          <YesNo label="CRS reporting" value={profile.compliance?.crsReporting} />
          <YesNo label="Politically exposed" value={profile.compliance?.pep} />
          <YesNo label="Sanctions screened" value={profile.compliance?.sanctionsScreening} />
          <YesNo label="AML acknowledged" value={profile.compliance?.amlAcknowledged} />
        </Section>

        <Section title="KYC" empty={!loading && kyc.length === 0}>
          <Field label="Latest status" value={titleCase(latestKyc?.status)} />
          <Field label="Submitted" value={fmtDate(latestKyc?.createdAt)} />
          <Field label="ID type" value={titleCase(latestKyc?.idType)} />
          <Field label="ID number" value={latestKyc?.idNumber} />
          {latestKyc?.reviewNote && <Field label="Review note" value={latestKyc.reviewNote} />}
          {latestKyc?.idDocumentUrl && (
            <div>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--sg-muted-2)' }}>Document</p>
              <a
                href={latestKyc.idDocumentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline inline-flex items-center gap-1"
                style={{ color: 'var(--sg-gold)' }}
              >
                Open <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </Section>

        <Section title="Account manager" empty={!profile.accountManager}>
          <Field label="Name" value={profile.accountManager?.name} />
          <Field label="Email" value={profile.accountManager?.email} />
          <Field label="Phone" value={profile.accountManager?.phone} />
        </Section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--sg-teal)' }}>
            Funding history
          </h3>
          {loading ? (
            <p className="text-sm sg-text-muted">Loading…</p>
          ) : requests.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--sg-muted-2)' }}>No funding requests yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead style={{ color: 'var(--sg-muted-2)' }}>
                  <tr>
                    <th className="text-left py-1.5 pr-3">Reference</th>
                    <th className="text-left py-1.5 pr-3">Amount</th>
                    <th className="text-left py-1.5 pr-3">Status</th>
                    <th className="text-left py-1.5">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.slice(0, 12).map((r) => (
                    <tr key={r.id} className="border-t sg-row-border">
                      <td className="py-1.5 pr-3 font-mono">{requestReference(r)}</td>
                      <td className="py-1.5 pr-3 sg-text-main">{fmtMoney(r.amount)}</td>
                      <td className="py-1.5 pr-3">
                        {r.status === 'approved' && r.awaitingPayment === true ? 'awaiting payment' : r.status}
                        {r.source === 'admin' && (
                          <span className="ml-1" style={{ color: 'var(--sg-gold)' }}>(desk)</span>
                        )}
                      </td>
                      <td className="py-1.5" style={{ color: 'var(--sg-muted-2)' }}>
                        {r.createdAt ? r.createdAt.toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {requests.length > 12 && (
                <p className="text-xs mt-2" style={{ color: 'var(--sg-muted-2)' }}>
                  Showing the 12 most recent of {requests.length}.
                </p>
              )}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}

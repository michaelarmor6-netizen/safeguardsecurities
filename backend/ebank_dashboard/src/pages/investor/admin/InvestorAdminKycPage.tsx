import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllKycDocuments, getAllKycSubmissions, reviewIdentityDocument, reviewKyc, type KycDocument, type KycSubmission } from '../../../services/investor/kycService';
import { kycDocLabel } from '../../../lib/kycDocuments';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { logAction } from '../../../services/investor/auditService';

const statusColor: Record<string, string> = {
  pending: 'var(--sg-gold)',
  approved: 'var(--sg-teal)',
  verified: 'var(--sg-teal)',
  rejected: 'var(--sg-danger)',
};

export default function InvestorAdminKycPage() {
  const { user, profile: adminProfile } = useInvestorAuth();
  const [documents, setDocuments] = useState<KycDocument[]>([]);
  const [legacy, setLegacy] = useState<KycSubmission[]>([]);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    Promise.all([getAllKycDocuments(), getAllKycSubmissions()])
      .then(([docs, old]) => {
        setDocuments(docs);
        setLegacy(old);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load KYC'));
  };

  useEffect(load, []);

  const review = async (row: KycDocument, decision: 'approved' | 'rejected') => {
    if (decision === 'approved' && !window.confirm(`Approve this ${kycDocLabel(row.docType)} for ${row.clientName || row.userEmail || 'this client'}?`)) {
      return;
    }
    if (decision === 'rejected' && !notes.trim()) {
      toast.error('Add a note explaining the rejection.');
      return;
    }
    setBusyId(row.id);
    try {
      await reviewIdentityDocument(row.id, decision, decision === 'rejected' ? notes : undefined);
      if (user) logAction(user.uid, adminProfile?.email ?? '', `KYC document ${decision}`, `${row.clientName} ${row.docType}`);
      toast.success(decision === 'approved' ? 'Document approved' : 'Document rejected');
      setRejectingId(null);
      setNotes('');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Review failed');
    } finally {
      setBusyId(null);
    }
  };

  const reviewLegacy = async (row: KycSubmission, status: 'verified' | 'rejected') => {
    try {
      await reviewKyc(row.id, status);
      if (user) logAction(user.uid, adminProfile?.email ?? '', `KYC ${status}`, row.userEmail ?? row.userId);
      toast.success(status === 'verified' ? 'Verified' : 'Rejected');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to review submission');
    }
  };

  const pendingCount = documents.filter((d) => d.status === 'pending').length;
  const visible = documents.filter((d) => filter === 'all' || d.status === 'pending');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="sg-page-title">KYC review</h1>
        <p className="sg-page-sub mt-1">Review identity documents submitted by clients. {pendingCount} pending.</p>
      </div>

      <div className="flex gap-2">
        {(['pending', 'all'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={filter === value ? 'sg-btn-primary text-xs' : 'sg-btn-ghost text-xs'}
            onClick={() => setFilter(value)}
          >
            {value === 'pending' ? 'Pending' : 'All documents'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.map((row) => (
          <div key={row.id} className="sg-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold sg-text-main">{kycDocLabel(row.docType)}</p>
                <p className="text-xs sg-text-faint">{row.clientName || 'Client'} · {row.userEmail ?? row.userId}</p>
                <p className="text-xs sg-text-faint mt-1">
                  {row.fileRemoved ? 'File removed by the client.' : row.fileName}
                  {row.submittedAt ? ` · ${row.submittedAt.toLocaleString()}` : ''}
                </p>
              </div>
              <span className="text-xs font-semibold uppercase shrink-0" style={{ color: statusColor[row.status] }}>
                {row.status}
              </span>
            </div>
            {row.reviewNote && <p className="text-sm mt-2" style={{ color: 'var(--sg-danger)' }}>{row.reviewNote}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!row.fileRemoved && row.fileUrl && (
                <a href={row.fileUrl} target="_blank" rel="noopener noreferrer" className="sg-btn-ghost text-xs">
                  View
                </a>
              )}
              {row.status === 'pending' && (
                <>
                  <button type="button" className="sg-action-btn text-xs" disabled={busyId === row.id} onClick={() => review(row, 'approved')}>
                    Approve
                  </button>
                  <button type="button" className="sg-danger-btn text-xs" onClick={() => setRejectingId(row.id)}>
                    Reject
                  </button>
                </>
              )}
            </div>
            {rejectingId === row.id && (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <label className="text-xs flex-1 min-w-[200px]" style={{ color: 'var(--sg-muted)' }}>
                  Rejection note
                  <input value={notes} onChange={(e) => setNotes(e.target.value)} className="sg-input mt-1" />
                </label>
                <button type="button" className="sg-danger-btn text-xs" disabled={busyId === row.id} onClick={() => review(row, 'rejected')}>
                  Confirm reject
                </button>
              </div>
            )}
          </div>
        ))}
        {visible.length === 0 && <div className="sg-panel p-8 text-center sg-text-muted">No documents in this view.</div>}
      </div>

      {legacy.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--sg-muted)' }}>Earlier applications</h2>
          {legacy.map((s) => (
            <div key={s.id} className="sg-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold sg-text-main">{s.fullName}</p>
                  <p className="text-xs sg-text-faint">{s.userEmail ?? s.userId}</p>
                </div>
                <span className="text-xs font-semibold uppercase" style={{ color: statusColor[s.status] }}>{s.status}</span>
              </div>
              <p className="text-sm mt-2 sg-text-muted">{s.idType} · {s.idNumber}</p>
              {s.idDocumentUrl && (
                <a href={s.idDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-sm mt-2 inline-block underline" style={{ color: 'var(--sg-indigo)' }}>
                  View submitted document
                </a>
              )}
              {s.status === 'pending' && (
                <div className="mt-3 flex gap-2">
                  <button type="button" className="sg-action-btn text-xs" onClick={() => reviewLegacy(s, 'verified')}>Verify</button>
                  <button type="button" className="sg-danger-btn text-xs" onClick={() => reviewLegacy(s, 'rejected')}>Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

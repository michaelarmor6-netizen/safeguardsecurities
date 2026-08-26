import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllKycSubmissions, reviewKyc, type KycSubmission } from '../../../services/investor/kycService';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { logAction } from '../../../services/investor/auditService';

const statusColor: Record<KycSubmission['status'], string> = {
  pending: 'var(--sg-gold)',
  verified: 'var(--sg-teal)',
  rejected: 'var(--sg-danger)',
};

export default function InvestorAdminKycPage() {
  const { user, profile: adminProfile } = useInvestorAuth();
  const [rows, setRows] = useState<KycSubmission[]>([]);
  const load = () => getAllKycSubmissions().then(setRows).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const review = async (s: KycSubmission, status: 'verified' | 'rejected') => {
    try {
      await reviewKyc(s.id, status);
      if (user) logAction(user.uid, adminProfile?.email ?? '', `KYC ${status}`, s.userEmail ?? s.userId);
      toast.success(status === 'verified' ? 'Verified' : 'Rejected');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to review submission');
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="sg-page-title">KYC Review</h1>
      <div className="space-y-3">
        {rows.map((s) => (
          <div key={s.id} className="sg-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold sg-text-main">{s.fullName}</p>
                <p className="text-xs sg-text-faint">{s.userEmail ?? s.userId}</p>
              </div>
              <span className="text-xs font-semibold uppercase shrink-0" style={{ color: statusColor[s.status] }}>
                {s.status}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
              <div><p className="sg-text-faint text-xs">DOB</p><p className="sg-text-main">{s.dateOfBirth}</p></div>
              <div><p className="sg-text-faint text-xs">Phone</p><p className="sg-text-main">{s.phone}</p></div>
              <div><p className="sg-text-faint text-xs">ID Type</p><p className="sg-text-main">{s.idType}</p></div>
              <div><p className="sg-text-faint text-xs">ID Number</p><p className="sg-text-main">{s.idNumber}</p></div>
            </div>
            <p className="text-sm mt-2 sg-text-muted">{s.address}</p>
            {s.idDocumentUrl && (
              <a
                href={s.idDocumentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm mt-2 inline-block underline"
                style={{ color: 'var(--sg-indigo)' }}
              >
                View submitted document
              </a>
            )}
            {s.status === 'pending' && (
              <div className="mt-3 flex gap-2">
                <button type="button" className="sg-action-btn" onClick={() => review(s, 'verified')}>
                  Verify
                </button>
                <button type="button" className="sg-danger-btn" onClick={() => review(s, 'rejected')}>
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
        {rows.length === 0 && <div className="sg-panel p-8 text-center sg-text-muted">No KYC submissions.</div>}
      </div>
    </div>
  );
}

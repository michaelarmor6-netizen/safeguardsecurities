import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck } from 'lucide-react';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import {
  getKycSubmissionsForUser,
  submitKyc,
  uploadKycDocument,
  type KycSubmission,
} from '../../../services/investor/kycService';

const statusColor: Record<KycSubmission['status'], string> = {
  pending: 'var(--sg-gold)',
  verified: 'var(--sg-teal)',
  rejected: 'var(--sg-danger)',
};

export default function InvestorKycPage() {
  const { user, profile } = useInvestorAuth();
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [idType, setIdType] = useState('passport');
  const [idNumber, setIdNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const load = () => {
    if (!user) return;
    getKycSubmissionsForUser(user.uid)
      .then(setSubmissions)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load KYC status'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [user]);

  const latest = submissions[0];
  const canSubmit = !latest || latest.status === 'rejected';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!fullName.trim() || !dateOfBirth || !address.trim() || !phone.trim() || !idNumber.trim()) {
      toast.error('Fill in all fields');
      return;
    }
    setSubmitting(true);
    try {
      let idDocumentUrl: string | undefined;
      if (file) {
        idDocumentUrl = await uploadKycDocument(user.uid, file);
      }
      await submitKyc({
        userId: user.uid,
        userEmail: profile?.email ?? user.email ?? '',
        fullName: fullName.trim(),
        dateOfBirth,
        address: address.trim(),
        phone: phone.trim(),
        idType,
        idNumber: idNumber.trim(),
        idDocumentUrl,
      });
      toast.success('KYC submitted for review');
      setFullName('');
      setDateOfBirth('');
      setAddress('');
      setPhone('');
      setIdNumber('');
      setFile(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit KYC');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center" style={{ color: 'var(--sg-muted)' }}>Loading verification status...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="sg-page-title flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" style={{ color: 'var(--sg-indigo)' }} />
          Identity Verification
        </h1>
        <p className="sg-page-sub mt-1">Complete KYC verification to unlock full account access.</p>
      </div>

      {latest && (
        <div className="sg-card p-4" style={{ borderRadius: 14 }}>
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--sg-muted)' }}>Current status</p>
            <span className="text-xs font-semibold uppercase" style={{ color: statusColor[latest.status] }}>
              {latest.status}
            </span>
          </div>
          {latest.reviewNote && (
            <p className="text-sm mt-2" style={{ color: 'var(--sg-muted)' }}>{latest.reviewNote}</p>
          )}
        </div>
      )}

      {canSubmit ? (
        <form onSubmit={submit} className="sg-card p-5 space-y-4" style={{ borderRadius: 14 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Full Legal Name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="sg-input mt-2" />
            </div>
            <div>
              <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Date of Birth</label>
              <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="sg-input mt-2" />
            </div>
          </div>
          <div>
            <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Residential Address</label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="sg-input mt-2" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Phone Number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="sg-input mt-2" />
            </div>
            <div>
              <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>ID Type</label>
              <select value={idType} onChange={(e) => setIdType(e.target.value)} className="sg-input mt-2">
                <option value="passport">Passport</option>
                <option value="drivers_license">Driver's License</option>
                <option value="national_id">National ID</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>ID Number</label>
            <input type="text" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className="sg-input mt-2" />
          </div>
          <div>
            <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>ID Document (image or PDF, max 10MB)</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="sg-input mt-2"
            />
          </div>
          <button type="submit" disabled={submitting} className="sg-btn-primary">
            {submitting ? 'Submitting...' : 'Submit for Verification'}
          </button>
        </form>
      ) : (
        <div className="sg-panel p-8 text-center sg-text-muted">
          {latest?.status === 'pending'
            ? 'Your verification is under review. We\'ll update your status once it\'s reviewed.'
            : 'Your identity has been verified.'}
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, Clock, FileText, ShieldCheck, Trash2, Upload, XCircle } from 'lucide-react';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import {
  KYC_ACCEPT,
  KYC_DOC_TYPES,
  KYC_MAX_LABEL,
  isKycDocType,
  kycDocLabel,
  resolveKycUpload,
  type KycDocStatus,
} from '../../../lib/kycDocuments';
import {
  getKycDocumentsForUser,
  removeIdentityDocument,
  uploadIdentityDocument,
  type KycDocument,
} from '../../../services/investor/kycService';

const statusStyle: Record<KycDocStatus, { color: string; label: string; icon: typeof Clock }> = {
  pending: { color: 'var(--sg-gold)', label: 'Pending review', icon: Clock },
  approved: { color: 'var(--sg-teal)', label: 'Approved', icon: CheckCircle2 },
  rejected: { color: 'var(--sg-danger)', label: 'Rejected', icon: XCircle },
};

export default function InvestorKycPage() {
  const { user, profile } = useInvestorAuth();
  const [docs, setDocs] = useState<KycDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const docLabel = useMemo(() => KYC_DOC_TYPES.find((d) => d.value === docType)?.label ?? '', [docType]);
  const isPdf = !!file && /\.pdf$/i.test(file.name);

  const load = () => {
    if (!user) return;
    setLoading(true);
    getKycDocumentsForUser(user.uid)
      .then(setDocs)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load documents'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [user]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickFile = (next: File | null) => {
    if (!next) {
      setFile(null);
      return;
    }
    const resolved = resolveKycUpload(next);
    if (!resolved.ok) {
      toast.error(resolved.error);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setFile(next);
  };

  const submit = async () => {
    if (!user) return;
    if (!file) {
      toast.error('Choose a file to upload.');
      return;
    }
    if (!isKycDocType(docType)) {
      toast.error('Select a document type.');
      return;
    }
    const clientName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ')
      || profile?.displayName
      || profile?.email
      || 'Client';
    setUploading(true);
    setProgress(30);
    try {
      setProgress(70);
      await uploadIdentityDocument({
        userId: user.uid,
        userEmail: profile?.email ?? user.email ?? '',
        clientName,
        docType,
        file,
      });
      setProgress(100);
      toast.success(`${docLabel || 'Document'} uploaded. Status: pending review.`);
      setFile(null);
      setDocType('');
      if (inputRef.current) inputRef.current.value = '';
      window.setTimeout(() => setProgress(0), 600);
      load();
    } catch (e) {
      setProgress(0);
      toast.error(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const remove = async (row: KycDocument) => {
    if (row.status === 'approved') {
      toast.error('Approved documents cannot be removed.');
      return;
    }
    try {
      await removeIdentityDocument(row);
      toast.success('File removed. The record is kept for audit.');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove file.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="sg-page-title flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" style={{ color: 'var(--sg-indigo)' }} />
          Identity verification
        </h1>
        <p className="sg-page-sub mt-1">
          Upload each required document. Files are stored for you and the compliance team only.
        </p>
      </div>

      <section className="sg-card p-5 space-y-4" style={{ borderRadius: 14 }}>
        <div>
          <h2 className="font-semibold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
            Upload a document
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--sg-muted)' }}>
            PDF, JPEG, PNG, WebP, or HEIC, up to {KYC_MAX_LABEL}.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm" style={{ color: 'var(--sg-muted)' }} htmlFor="kyc-doc-type">Document type</label>
            <select id="kyc-doc-type" value={docType} onChange={(e) => setDocType(e.target.value)} className="sg-input mt-2">
              <option value="">Select document type</option>
              {KYC_DOC_TYPES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm" style={{ color: 'var(--sg-muted)' }} htmlFor="kyc-doc-file">File</label>
            <input
              ref={inputRef}
              id="kyc-doc-file"
              type="file"
              accept={KYC_ACCEPT}
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              className="sg-input mt-2"
            />
          </div>
        </div>

        {file && (
          <div className="rounded-xl p-4" style={{ border: '1px solid var(--sg-border)', background: 'var(--sg-bg-elevated)' }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 shrink-0" style={{ color: 'var(--sg-muted)' }} />
                <span className="truncate text-sm font-medium sg-text-main">{file.name}</span>
                <span className="text-xs shrink-0" style={{ color: 'var(--sg-muted-2)' }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              <button
                type="button"
                className="sg-btn-ghost text-xs"
                onClick={() => {
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = '';
                }}
              >
                Remove
              </button>
            </div>
            {previewUrl && (
              <div className="mt-3 overflow-hidden rounded-lg" style={{ border: '1px solid var(--sg-border)' }}>
                {isPdf ? (
                  <iframe src={previewUrl} title="PDF preview" className="h-72 w-full" />
                ) : (
                  <img src={previewUrl} alt="Document preview" className="max-h-72 w-full object-contain" />
                )}
              </div>
            )}
          </div>
        )}

        {progress > 0 && (
          <div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--sg-border)' }}>
              <div className="h-full" style={{ width: `${progress}%`, background: 'var(--sg-indigo)' }} />
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--sg-muted)' }}>{progress < 100 ? 'Uploading…' : 'Done'}</p>
          </div>
        )}

        <div className="flex justify-end">
          <button type="button" className="sg-btn-primary flex items-center gap-2" disabled={uploading || !file} onClick={submit}>
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading…' : `Submit ${docLabel || 'document'}`}
          </button>
        </div>
      </section>

      <section className="sg-card p-5" style={{ borderRadius: 14 }}>
        <h2 className="font-semibold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          Submitted documents
        </h2>
        <p className="text-sm mt-1 mb-3" style={{ color: 'var(--sg-muted)' }}>
          Each file is reviewed on its own.
        </p>
        {loading ? (
          <p className="text-sm" style={{ color: 'var(--sg-muted)' }}>Loading…</p>
        ) : docs.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--sg-muted)' }}>No documents submitted yet.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--sg-border)' }}>
            {docs.map((row) => {
              const status = statusStyle[row.status] ?? statusStyle.pending;
              const Icon = status.icon;
              return (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3 border-t sg-row-border first:border-t-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" style={{ color: 'var(--sg-muted)' }} />
                      <span className="text-sm font-medium sg-text-main">{kycDocLabel(row.docType)}</span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase" style={{ color: status.color }}>
                        <Icon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--sg-muted-2)' }}>
                      {row.fileRemoved ? 'File removed. Record kept for audit.' : row.fileName}
                      {row.submittedAt ? ` · ${row.submittedAt.toLocaleString()}` : ''}
                    </p>
                    {row.reviewNote && (
                      <p className="text-xs mt-1" style={{ color: 'var(--sg-danger)' }}>Notes: {row.reviewNote}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!row.fileRemoved && row.fileUrl && (
                      <a href={row.fileUrl} target="_blank" rel="noopener noreferrer" className="sg-btn-ghost text-xs">
                        View
                      </a>
                    )}
                    <button
                      type="button"
                      className="sg-btn-ghost text-xs"
                      disabled={row.status === 'approved'}
                      onClick={() => remove(row)}
                      aria-label="Remove file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

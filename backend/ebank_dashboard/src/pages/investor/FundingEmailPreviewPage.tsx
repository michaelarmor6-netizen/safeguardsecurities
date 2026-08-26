import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Check, Copy, Mail } from 'lucide-react';
import { useInvestorAuth } from '../../contexts/InvestorAuthContext';
import {
  getFundingRequestById,
  markFundingEmailSent,
  requestReference,
  type FundingRequest,
} from '../../services/investor/fundingService';
import {
  buildFundingEmail,
  buildFundingEmailHtml,
  getFundingDetails,
  renderEmailSubject,
  type FundingDetails,
} from '../../services/investor/fundingDetailsService';
import { getPlatformSettings, DEFAULTS as SETTINGS_DEFAULTS, type PlatformSettings } from '../../services/investor/settingsService';
import { getInvestorProfile } from '../../services/investor/profileService';
import { logAction } from '../../services/investor/auditService';
import '../../styles/safeguardTheme.css';

// Admin-only: renders the professional funding-instructions email (HTML
// template from fundingDetailsService) for one request. mailto: cannot carry
// HTML, so the manual flow is: Copy email -> paste into a Thunderbird HTML
// compose window (rich paste keeps the formatting) -> send -> Mark emailed.
// The plain-text mailto remains as a fallback.

export default function FundingEmailPreviewPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { user, profile, isAdmin, loading: authLoading } = useInvestorAuth();
  const [request, setRequest] = useState<FundingRequest | null>(null);
  const [details, setDetails] = useState<FundingDetails | null>(null);
  const [settings, setSettings] = useState<PlatformSettings>(SETTINGS_DEFAULTS);
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user || !requestId) return;
    Promise.all([getFundingRequestById(requestId), getFundingDetails(), getPlatformSettings()])
      .then(async ([r, d, ps]) => {
        setRequest(r);
        setDetails(d);
        setSettings(ps);
        if (r) {
          const cp = await getInvestorProfile(r.userId).catch(() => null);
          setClientName(cp?.displayName ?? [cp?.firstName, cp?.lastName].filter(Boolean).join(' ') ?? '');
        }
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [user, requestId]);

  const html = useMemo(() => {
    if (!request || !details) return '';
    return buildFundingEmailHtml({
      reference: requestReference(request),
      amount: request.amount,
      clientName: clientName || request.userEmail || 'Investor',
      platformName: settings.platformName,
      requestDate: request.createdAt
        ? request.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '',
      logoUrl: `${window.location.origin}/logo-email.png`,
      portalUrl: `${window.location.origin}/workspace/wallet`,
      details,
    });
  }, [request, details, settings, clientName]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/workspace" replace />;

  if (loading) {
    return <div className="sg-shell flex items-center justify-center py-20" style={{ color: 'var(--sg-muted)' }}>Loading email preview...</div>;
  }
  if (!request || !details) {
    return (
      <div className="sg-shell flex flex-col items-center justify-center py-20 gap-4" style={{ color: 'var(--sg-muted)' }}>
        <p>Funding request not found.</p>
        <button type="button" className="sg-btn-primary" onClick={() => navigate('/admin/funding')}>Back to funding</button>
      </div>
    );
  }

  const subject = renderEmailSubject(details, requestReference(request), settings.platformName);
  const noDetails = !details.bankEnabled && !(details.cryptoEnabled && details.cryptoWallets.some((w) => w.address));

  const copyEmail = async () => {
    try {
      const plain = buildFundingEmail({
        reference: requestReference(request),
        amount: request.amount,
        platformName: settings.platformName,
        details,
      }).body;
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast.success('Email copied - paste into a Thunderbird compose window');
    } catch {
      toast.error('Copy failed - your browser may not allow rich clipboard here');
    }
  };

  const copySubject = async () => {
    try {
      await navigator.clipboard.writeText(subject);
      toast.success('Subject copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  const openMailto = () => {
    if (!request.userEmail) {
      toast.error('No client email on this request');
      return;
    }
    const { body } = buildFundingEmail({
      reference: requestReference(request),
      amount: request.amount,
      platformName: settings.platformName,
      details,
    });
    window.location.href = `mailto:${encodeURIComponent(request.userEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="sg-shell min-h-screen py-8 px-4" style={{ background: 'var(--sg-bg)' }}>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="sg-btn-ghost flex items-center gap-2" onClick={() => navigate('/admin/funding')}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="sg-btn-primary flex items-center gap-2" onClick={copyEmail}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copy email (rich)
            </button>
            <button type="button" className="sg-action-btn flex items-center gap-2" onClick={openMailto}>
              <Mail className="h-4 w-4" />
              Open in mail app (plain)
            </button>
            {!request.emailSentAt && (
              <button
                type="button"
                className="sg-action-btn"
                onClick={async () => {
                  try {
                    await markFundingEmailSent(request.id);
                    if (user) logAction(user.uid, profile?.email ?? '', 'Funding details emailed manually', `${request.userEmail ?? request.userId}: ${requestReference(request)}`);
                    toast.success('Marked as emailed');
                    setRequest({ ...request, emailSentAt: new Date() });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Failed');
                  }
                }}
              >
                Mark emailed
              </button>
            )}
          </div>
        </div>

        <div className="sg-panel p-4 space-y-1 text-sm">
          <p style={{ color: 'var(--sg-muted)' }}>
            To: <span className="sg-text-main">{request.userEmail ?? '(no email on request)'}</span>
          </p>
          <p style={{ color: 'var(--sg-muted)' }}>
            Subject: <span className="sg-text-main">{subject}</span>{' '}
            <button type="button" className="text-xs underline" style={{ color: 'var(--sg-teal)' }} onClick={copySubject}>copy</button>
          </p>
          <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>
            Thunderbird: New Message (HTML mode) → paste the copied email into the body, paste the
            subject, send — then click Mark emailed.
          </p>
          {noDetails && (
            <p className="text-xs font-semibold" style={{ color: 'var(--sg-gold)' }}>
              ⚠️ No payment method is enabled in Settings → Funding Details — this email has no
              bank/crypto section yet.
            </p>
          )}
        </div>

        <iframe
          title="Funding email preview"
          srcDoc={html}
          className="w-full rounded-[14px] border-0"
          style={{ height: '75vh', background: '#f5f5f5' }}
        />
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Check, Copy, Printer } from 'lucide-react';
import { useInvestorAuth } from '../../contexts/InvestorAuthContext';
import { getFundingRequestById, requestReference, type FundingRequest } from '../../services/investor/fundingService';
import { getFundingDetails, bankInstructionRows, paymentReasonLine, type FundingDetails } from '../../services/investor/fundingDetailsService';
import { getPlatformSettings, DEFAULTS as SETTINGS_DEFAULTS, type PlatformSettings } from '../../services/investor/settingsService';
import { getInvestorProfile, type InvestorProfile } from '../../services/investor/profileService';
import '../../styles/safeguardTheme.css';

// Printable funding invoice, generated once a request is approved. Standalone
// route (outside the workspace/admin layouts) so window.print() captures only
// the sheet. Deliberately forced to light colors - a legal-ish document must
// print black-on-white regardless of the app theme.
// Reachable by the request owner and by staff (Firestore rules enforce reads).

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
const fmtDate = (d?: Date) =>
  d ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

const INK = '#101623';
const MUTED = '#5b6472';
const LINE = '#d8dde5';

async function copyValue(value: string, what: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${what} copied`, { duration: 1500 });
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) {
        toast.success(`${what} copied`, { duration: 1500 });
        return true;
      }
    } catch { /* fall through */ }
    toast.error('Copy failed - select the text manually');
    return false;
  }
}

// Every field is click-to-copy on screen (icon hidden when printed) so the
// client can paste bank name / SWIFT / account no. / IBAN straight into
// their banking app without retyping.
function Row({ label, value }: { label: string; value?: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const onCopy = async () => {
    if (await copyValue(value, label)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  return (
    <tr onClick={onCopy} style={{ cursor: 'pointer' }} title={`Copy ${label}`}>
      <td style={{ padding: '3px 16px 3px 0', color: MUTED, whiteSpace: 'nowrap', verticalAlign: 'top' }}>{label}</td>
      <td style={{ padding: '3px 0', color: INK, fontWeight: 600, fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' }}>
        {value}{' '}
        <span className="print:hidden" style={{ verticalAlign: 'middle', display: 'inline-block' }}>
          {copied
            ? <Check style={{ height: 13, width: 13, color: '#0e7a4f' }} />
            : <Copy style={{ height: 13, width: 13, opacity: .45 }} />}
        </span>
      </td>
    </tr>
  );
}

export default function FundingInvoicePage() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useInvestorAuth();
  const [request, setRequest] = useState<FundingRequest | null>(null);
  const [details, setDetails] = useState<FundingDetails | null>(null);
  const [settings, setSettings] = useState<PlatformSettings>(SETTINGS_DEFAULTS);
  const [client, setClient] = useState<InvestorProfile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !requestId) return;
    Promise.all([getFundingRequestById(requestId), getFundingDetails(), getPlatformSettings()])
      .then(async ([r, d, ps]) => {
        setRequest(r);
        setDetails(d);
        setSettings(ps);
        if (r) setClient(await getInvestorProfile(r.userId).catch(() => null));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load invoice'))
      .finally(() => setLoading(false));
  }, [user, requestId]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (loading) {
    return <div className="sg-shell flex items-center justify-center py-20" style={{ color: 'var(--sg-muted)' }}>Loading invoice...</div>;
  }
  if (error || !request || request.status === 'pending' || request.status === 'rejected') {
    return (
      <div className="sg-shell flex flex-col items-center justify-center py-20 gap-4" style={{ color: 'var(--sg-muted)' }}>
        <p>{error || (request ? 'An invoice is only generated once a request is approved.' : 'Funding request not found.')}</p>
        <button type="button" className="sg-btn-primary" onClick={() => navigate(isAdmin ? '/admin/funding' : '/workspace/wallet')}>
          Go back
        </button>
      </div>
    );
  }

  const reference = requestReference(request);
  const issuedAt = request.approvedAt ?? request.createdAt;
  const paid = request.status === 'funded';
  const clientName =
    client?.displayName ??
    [client?.firstName, client?.lastName].filter(Boolean).join(' ') ??
    '';
  const showBank = Boolean(details?.bankEnabled);
  const cryptoWallets = details?.cryptoEnabled ? details.cryptoWallets.filter((w) => w.address) : [];

  return (
    <div className="sg-shell min-h-screen py-8 px-4 print:p-0" style={{ background: 'var(--sg-bg)' }}>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <button
            type="button"
            className="sg-btn-ghost flex items-center gap-2"
            onClick={() => navigate(isAdmin ? '/admin/funding' : '/workspace/wallet')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button type="button" className="sg-btn-primary flex items-center gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </button>
        </div>

        {/* The sheet: fixed light palette for print fidelity */}
        <div
          className="rounded-[14px] p-8 sm:p-10 print:rounded-none print:p-8 print:shadow-none"
          style={{ background: '#ffffff', color: INK, boxShadow: '0 8px 30px rgba(0,0,0,.25)' }}
        >
          <div className="flex items-start justify-between gap-6 pb-6" style={{ borderBottom: `2px solid ${INK}` }}>
            <div>
              <img src="/logo.png" alt="" className="h-9 w-auto mb-2" style={{ filter: 'brightness(.25)' }} />
              <p style={{ fontWeight: 700 }}>{settings.platformName}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tracking-wide" style={{ letterSpacing: '.08em' }}>FUNDING INVOICE</p>
              <p style={{ color: MUTED, fontSize: 13 }}>No. {reference}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-6 py-6" style={{ borderBottom: `1px solid ${LINE}` }}>
            <div>
              <p style={{ color: MUTED, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em' }}>Billed to</p>
              <p style={{ fontWeight: 700 }}>{clientName || request.userEmail || request.userId}</p>
              {request.userEmail && <p style={{ color: MUTED, fontSize: 13 }}>{request.userEmail}</p>}
            </div>
            <div className="sm:text-right">
              <table className="sm:ml-auto" style={{ fontSize: 13 }}>
                <tbody>
                  <tr><td style={{ color: MUTED, paddingRight: 12 }}>Request date</td><td style={{ fontWeight: 600 }}>{fmtDate(request.createdAt)}</td></tr>
                  <tr><td style={{ color: MUTED, paddingRight: 12 }}>Invoice date</td><td style={{ fontWeight: 600 }}>{fmtDate(issuedAt)}</td></tr>
                  <tr>
                    <td style={{ color: MUTED, paddingRight: 12 }}>Status</td>
                    <td style={{ fontWeight: 700, color: paid ? '#0e7a4f' : '#946300' }}>
                      {paid ? `PAID — received ${fmtDate(request.fundedAt)}` : 'AWAITING PAYMENT'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <table className="w-full my-6" style={{ fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${LINE}`, color: MUTED, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                <th className="text-left py-2">Description</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: `1px solid ${LINE}` }}>
                <td className="py-3">Investment account funding — payment reference <strong style={{ fontFamily: 'ui-monospace, monospace' }}>{reference}</strong></td>
                <td className="py-3 text-right" style={{ fontWeight: 600 }}>{fmtMoney(request.amount)}</td>
              </tr>
              <tr>
                <td className="py-3 text-right" style={{ fontWeight: 700 }}>Total due</td>
                <td className="py-3 text-right" style={{ fontWeight: 800, fontSize: 18 }}>{fmtMoney(request.amount)}</td>
              </tr>
            </tbody>
          </table>

          <div className="rounded-[10px] p-5" style={{ background: '#f4f6f9', border: `1px solid ${LINE}` }}>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>Payment instructions</p>
            <p className="print:hidden" style={{ color: MUTED, fontSize: 12, marginBottom: 8 }}>
              Tap any detail below to copy it, then paste it into your banking app.
            </p>
            <p style={{ color: MUTED, fontSize: 13, marginBottom: 12 }}>
              Quote reference <strong style={{ color: INK, fontFamily: 'ui-monospace, monospace' }}>{reference}</strong> in
              your transfer memo so we can match your payment. Your wallet is credited once receipt is confirmed.
            </p>
            {showBank && details && (
              <div className="mb-4">
                <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em', color: MUTED, marginBottom: 4 }}>Bank wire / transfer</p>
                <table style={{ fontSize: 13 }}>
                  <tbody>
                    {bankInstructionRows(details).map(([label, value]) => (
                      <Row key={label} label={label} value={value} />
                    ))}
                    <Row label="Reason for payment" value={paymentReasonLine(details, reference)} />
                  </tbody>
                </table>
              </div>
            )}
            {cryptoWallets.length > 0 && (
              <div className="mb-2">
                <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em', color: MUTED, marginBottom: 4 }}>Crypto</p>
                <table style={{ fontSize: 13 }}>
                  <tbody>
                    {cryptoWallets.map((w, i) => (
                      <Row key={i} label={`${w.asset} (${w.network})`} value={w.memo ? `${w.address} (memo: ${w.memo})` : w.address} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!showBank && cryptoWallets.length === 0 && (
              <p style={{ color: MUTED, fontSize: 13 }}>
                Payment details will be provided by {settings.platformName} staff — please refer to the email
                sent with your approval or contact support.
              </p>
            )}
            {details?.extraInstructions && (
              <p style={{ color: MUTED, fontSize: 13, whiteSpace: 'pre-wrap', marginTop: 8 }}>{details.extraInstructions}</p>
            )}
          </div>

          <p className="pt-6 mt-6 text-center" style={{ borderTop: `1px solid ${LINE}`, color: MUTED, fontSize: 12 }}>
            {settings.statementFooterText}
          </p>
        </div>
      </div>
    </div>
  );
}

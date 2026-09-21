import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { useInvestorAuth } from '../../contexts/InvestorAuthContext';
import { getInvoiceById, formatInvoiceMoney, invoiceSubtotal, invoiceTaxAmount, invoiceTotal, type StaffInvoice } from '../../services/investor/invoiceService';
import { getFundingDetails, bankInstructionRows, paymentReasonLine, type FundingDetails } from '../../services/investor/fundingDetailsService';
import { getPlatformSettings, DEFAULTS as SETTINGS_DEFAULTS, type PlatformSettings } from '../../services/investor/settingsService';
import '../../styles/safeguardTheme.css';

const INK = '#101623';
const MUTED = '#5b6472';
const LINE = '#d8dde5';

const fmtStamp = (d?: Date) =>
  d
    ? d.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      })
    : '—';

const fmtDate = (d?: Date) =>
  d ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

export default function StaffInvoicePage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useInvestorAuth();
  const [invoice, setInvoice] = useState<StaffInvoice | null>(null);
  const [details, setDetails] = useState<FundingDetails | null>(null);
  const [settings, setSettings] = useState<PlatformSettings>(SETTINGS_DEFAULTS);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !invoiceId) return;
    Promise.all([getInvoiceById(invoiceId), getFundingDetails(), getPlatformSettings()])
      .then(([inv, d, ps]) => {
        setInvoice(inv);
        setDetails(d);
        setSettings(ps);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load invoice'))
      .finally(() => setLoading(false));
  }, [user, invoiceId]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (loading) {
    return <div className="sg-shell flex items-center justify-center py-20" style={{ color: 'var(--sg-muted)' }}>Loading invoice...</div>;
  }
  if (error || !invoice || invoice.status === 'void') {
    return (
      <div className="sg-shell flex flex-col items-center justify-center py-20 gap-4" style={{ color: 'var(--sg-muted)' }}>
        <p>{error || (invoice ? 'This invoice has been voided.' : 'Invoice not found.')}</p>
        <button type="button" className="sg-btn-primary" onClick={() => navigate(isAdmin ? '/admin/invoices' : '/workspace/invoices')}>
          Go back
        </button>
      </div>
    );
  }

  const paid = invoice.status === 'paid';
  const showBank = invoice.includePaymentInstructions && Boolean(details?.bankEnabled);

  return (
    <div className="sg-shell min-h-screen py-8 px-4 print:p-0" style={{ background: 'var(--sg-bg)' }}>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <button
            type="button"
            className="sg-btn-ghost flex items-center gap-2"
            onClick={() => navigate(isAdmin ? '/admin/invoices' : '/workspace/invoices')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button type="button" className="sg-btn-primary flex items-center gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </button>
        </div>

        <div
          className="relative rounded-[14px] p-8 sm:p-10 print:rounded-none print:p-8 print:shadow-none overflow-hidden"
          style={{ background: '#ffffff', color: INK, boxShadow: '0 8px 30px rgba(0,0,0,.25)' }}
        >
          <img
            src="/seal-official.svg"
            alt=""
            className="pointer-events-none select-none"
            style={{
              position: 'absolute',
              right: 28,
              bottom: 88,
              width: 148,
              height: 148,
              opacity: 0.22,
            }}
          />

          <div className="flex items-start justify-between gap-6 pb-6" style={{ borderBottom: `2px solid ${INK}` }}>
            <div>
              <img src="/logo.png" alt="SafeGuard Securities" className="h-10 w-auto mb-2" />
              <p style={{ fontWeight: 700 }}>{settings.platformName}</p>
              {details?.companyAddress && (
                <p style={{ color: MUTED, fontSize: 12, whiteSpace: 'pre-wrap', maxWidth: 240 }}>{details.companyAddress}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tracking-wide" style={{ letterSpacing: '.08em' }}>INVOICE</p>
              <p style={{ color: MUTED, fontSize: 13 }}>No. {invoice.number}</p>
              <p style={{ color: MUTED, fontSize: 11, marginTop: 6 }}>Issued {fmtStamp(invoice.issuedAt ?? invoice.createdAt)}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-6 py-6" style={{ borderBottom: `1px solid ${LINE}` }}>
            <div>
              <p style={{ color: MUTED, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em' }}>Billed to</p>
              <p style={{ fontWeight: 700 }}>{invoice.billToName}</p>
              {invoice.billToCompany && <p style={{ fontSize: 13 }}>{invoice.billToCompany}</p>}
              {invoice.billToEmail && <p style={{ color: MUTED, fontSize: 13 }}>{invoice.billToEmail}</p>}
              {invoice.billToAddress && (
                <p style={{ color: MUTED, fontSize: 13, whiteSpace: 'pre-wrap' }}>{invoice.billToAddress}</p>
              )}
            </div>
            <div className="sm:text-right">
              <table className="sm:ml-auto" style={{ fontSize: 13 }}>
                <tbody>
                  <tr><td style={{ color: MUTED, paddingRight: 12 }}>Currency</td><td style={{ fontWeight: 600 }}>{invoice.currency}</td></tr>
                  <tr><td style={{ color: MUTED, paddingRight: 12 }}>Due date</td><td style={{ fontWeight: 600 }}>{fmtDate(invoice.dueDate)}</td></tr>
                  {invoice.paymentTerms && (
                    <tr><td style={{ color: MUTED, paddingRight: 12 }}>Terms</td><td style={{ fontWeight: 600 }}>{invoice.paymentTerms}</td></tr>
                  )}
                  <tr>
                    <td style={{ color: MUTED, paddingRight: 12 }}>Status</td>
                    <td style={{ fontWeight: 700, color: paid ? '#0e7a4f' : invoice.status === 'sent' ? '#0a3d6e' : '#946300' }}>
                      {paid ? 'PAID' : invoice.status === 'sent' ? 'ISSUED & SENT' : 'ISSUED'}
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
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Unit</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${LINE}` }}>
                  <td className="py-3">{item.description}</td>
                  <td className="py-3 text-right">{item.quantity}</td>
                  <td className="py-3 text-right">{formatInvoiceMoney(item.unitPrice, invoice.currency)}</td>
                  <td className="py-3 text-right" style={{ fontWeight: 600 }}>
                    {formatInvoiceMoney(item.quantity * item.unitPrice, invoice.currency)}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} className="py-2 text-right" style={{ color: MUTED }}>Subtotal</td>
                <td className="py-2 text-right">{formatInvoiceMoney(invoiceSubtotal(invoice.lineItems), invoice.currency)}</td>
              </tr>
              {invoice.taxRate > 0 && (
                <tr>
                  <td colSpan={3} className="py-2 text-right" style={{ color: MUTED }}>
                    {invoice.taxLabel} ({invoice.taxRate}%)
                  </td>
                  <td className="py-2 text-right">{formatInvoiceMoney(invoiceTaxAmount(invoice.lineItems, invoice.taxRate), invoice.currency)}</td>
                </tr>
              )}
              <tr>
                <td colSpan={3} className="py-3 text-right" style={{ fontWeight: 700 }}>Total due</td>
                <td className="py-3 text-right" style={{ fontWeight: 800, fontSize: 18 }}>
                  {formatInvoiceMoney(invoiceTotal(invoice.lineItems, invoice.taxRate), invoice.currency)}
                </td>
              </tr>
            </tbody>
          </table>

          {showBank && details && (
            <div className="rounded-[10px] p-5 mb-4" style={{ background: '#f4f6f9', border: `1px solid ${LINE}` }}>
              <p style={{ fontWeight: 700, marginBottom: 8 }}>Payment instructions</p>
              <table style={{ fontSize: 13 }}>
                <tbody>
                  {bankInstructionRows(details).map(([label, value]) => (
                    <tr key={label}>
                      <td style={{ padding: '3px 16px 3px 0', color: MUTED }}>{label}</td>
                      <td style={{ fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>{value}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ padding: '3px 16px 3px 0', color: MUTED }}>Reason for payment</td>
                    <td style={{ fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>{paymentReasonLine(details, invoice.number)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {invoice.notes && (
            <p style={{ color: MUTED, fontSize: 13, whiteSpace: 'pre-wrap', marginBottom: 16 }}>{invoice.notes}</p>
          )}

          <div className="flex items-end justify-between gap-6 pt-6 mt-4" style={{ borderTop: `1px solid ${LINE}` }}>
            <p style={{ color: MUTED, fontSize: 11, maxWidth: 360 }}>
              {settings.statementFooterText}
              <br />
              Electronically issued {fmtStamp(invoice.issuedAt ?? invoice.createdAt)}. Valid with the official digital seal; no wet-ink signature required.
            </p>
            <div className="text-center shrink-0">
              <img src="/seal-official.svg" alt="SafeGuard Securities official digital seal" style={{ width: 92, height: 92 }} />
              <p style={{ fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase', color: MUTED }}>Official digital seal</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

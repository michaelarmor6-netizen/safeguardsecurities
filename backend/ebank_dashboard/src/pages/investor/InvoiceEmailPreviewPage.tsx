import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Check, Copy, FileDown, Mail } from 'lucide-react';
import { useInvestorAuth } from '../../contexts/InvestorAuthContext';
import { getInvoiceById, markInvoiceEmailSent, type StaffInvoice } from '../../services/investor/invoiceService';
import { getFundingDetails, type FundingDetails } from '../../services/investor/fundingDetailsService';
import { getPlatformSettings, DEFAULTS as SETTINGS_DEFAULTS, type PlatformSettings } from '../../services/investor/settingsService';
import { buildInvoiceEmailHtml, buildInvoiceEmailText, invoiceEmailSubject } from '../../services/investor/invoiceEmail';
import { copyHtmlForEmail, copyHtmlSource } from '../../lib/copyHtmlForEmail';
import { downloadInvoicePdf } from '../../services/investor/invoicePdf';
import { logAction } from '../../services/investor/auditService';
import '../../styles/safeguardTheme.css';

export default function InvoiceEmailPreviewPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { user, profile, isAdmin, loading: authLoading } = useInvestorAuth();
  const [invoice, setInvoice] = useState<StaffInvoice | null>(null);
  const [details, setDetails] = useState<FundingDetails | null>(null);
  const [settings, setSettings] = useState<PlatformSettings>(SETTINGS_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (!user || !invoiceId) return;
    Promise.all([getInvoiceById(invoiceId), getFundingDetails(), getPlatformSettings()])
      .then(([inv, d, ps]) => {
        setInvoice(inv);
        setDetails(d);
        setSettings(ps);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [user, invoiceId]);

  const html = useMemo(() => {
    if (!invoice) return '';
    return buildInvoiceEmailHtml({
      invoice,
      platformName: settings.platformName,
      logoUrl: `${window.location.origin}/logo-email.png`,
      portalUrl: `${window.location.origin}/invoice/${invoice.id}`,
      details,
    });
  }, [invoice, details, settings]);

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/workspace" replace />;

  if (loading) {
    return <div className="sg-shell flex items-center justify-center py-20" style={{ color: 'var(--sg-muted)' }}>Loading email preview...</div>;
  }
  if (!invoice) {
    return (
      <div className="sg-shell flex flex-col items-center justify-center py-20 gap-4" style={{ color: 'var(--sg-muted)' }}>
        <p>Invoice not found.</p>
        <button type="button" className="sg-btn-primary" onClick={() => navigate('/admin/invoices')}>Back to invoices</button>
      </div>
    );
  }

  const subject = invoiceEmailSubject(invoice, settings.platformName);
  const plain = buildInvoiceEmailText({ invoice, platformName: settings.platformName, details });

  const copyEmail = async () => {
    try {
      const mode = await copyHtmlForEmail(html, plain);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast.success(
        mode === 'rich'
          ? 'Invoice HTML copied — paste into a Thunderbird HTML compose window (Ctrl+V)'
          : 'HTML source copied — in Thunderbird use Insert → HTML, then paste',
      );
    } catch {
      toast.error('Copy failed');
    }
  };

  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      const file = await downloadInvoicePdf({
        invoice,
        platformName: settings.platformName,
        logoUrl: `${window.location.origin}/logo-email.png`,
        details,
      });
      toast.success(`${file} downloaded — attach it in Thunderbird with the paperclip`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'PDF failed');
    } finally {
      setPdfBusy(false);
    }
  };

  const prepareThunderbird = async () => {
    setPdfBusy(true);
    try {
      const mode = await copyHtmlForEmail(html, plain);
      const file = await downloadInvoicePdf({
        invoice,
        platformName: settings.platformName,
        logoUrl: `${window.location.origin}/logo-email.png`,
        details,
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast.success(
        mode === 'rich'
          ? `HTML copied and ${file} downloaded. Thunderbird: Ctrl+V in HTML compose, then attach the PDF.`
          : `${file} downloaded. Attach it, then Insert → HTML for the body.`,
        { duration: 8000 },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not prepare Thunderbird send');
    } finally {
      setPdfBusy(false);
    }
  };

  const copySource = async () => {
    try {
      await copyHtmlSource(html);
      toast.success('HTML source copied — Thunderbird: Insert → HTML, then paste');
    } catch {
      toast.error('Copy failed');
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
    if (!invoice.billToEmail) {
      toast.error('No bill-to email on this invoice');
      return;
    }
    window.location.href = `mailto:${encodeURIComponent(invoice.billToEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plain)}`;
  };

  return (
    <div className="sg-shell min-h-screen py-8 px-4" style={{ background: 'var(--sg-bg)' }}>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" className="sg-btn-ghost flex items-center gap-2" onClick={() => navigate('/admin/invoices')}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="sg-btn-primary flex items-center gap-2" disabled={pdfBusy} onClick={prepareThunderbird}>
              {copied ? <Check className="h-4 w-4" /> : <FileDown className="h-4 w-4" />}
              {pdfBusy ? 'Preparing…' : 'HTML + PDF for Thunderbird'}
            </button>
            <button type="button" className="sg-action-btn flex items-center gap-2" disabled={pdfBusy} onClick={downloadPdf}>
              <FileDown className="h-4 w-4" />
              Download PDF
            </button>
            <button type="button" className="sg-action-btn flex items-center gap-2" onClick={copyEmail}>
              <Copy className="h-4 w-4" />
              Copy HTML only
            </button>
            <button type="button" className="sg-action-btn flex items-center gap-2" onClick={copySource}>
              <Copy className="h-4 w-4" />
              Copy HTML source
            </button>
            <button type="button" className="sg-action-btn flex items-center gap-2" onClick={openMailto}>
              <Mail className="h-4 w-4" />
              Open in mail app
            </button>
            {!invoice.emailSentAt && (
              <button
                type="button"
                className="sg-action-btn"
                onClick={async () => {
                  try {
                    await markInvoiceEmailSent(invoice.id);
                    if (user) logAction(user.uid, profile?.email ?? '', 'Invoice emailed manually', `${invoice.billToEmail}: ${invoice.number}`);
                    toast.success('Marked as emailed');
                    setInvoice({ ...invoice, emailSentAt: new Date(), status: 'sent' });
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
            To: <span className="sg-text-main">{invoice.billToEmail}</span>
          </p>
          <p style={{ color: 'var(--sg-muted)' }}>
            Subject: <span className="sg-text-main">{subject}</span>{' '}
            <button type="button" className="sg-action-btn text-xs ml-2" onClick={copySubject}>Copy subject</button>
          </p>
          <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>
            Thunderbird cannot receive an attachment from the browser. Download the PDF, compose in HTML, paste the body (Ctrl+V), then attach the file with the paperclip. If paste shows tags, use Insert → HTML.
          </p>
        </div>

        <iframe title="Invoice email preview" srcDoc={html} className="w-full rounded-[14px] border-0" style={{ height: '75vh', background: '#f5f5f5' }} />
      </div>
    </div>
  );
}

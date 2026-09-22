import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FileText } from 'lucide-react';
import { getPlatformSettings, updatePlatformSettings, DEFAULTS } from '../../../../services/investor/settingsService';
import {
  clampInvoicePad,
  formatInvoiceNumber,
  getInvoiceNextSequence,
  sanitizeInvoicePrefix,
  setInvoiceNextSequence,
} from '../../../../services/investor/invoiceService';
import { useInvestorAuth } from '../../../../contexts/InvestorAuthContext';
import { logAction } from '../../../../services/investor/auditService';

export default function SettingsInvoicesSection() {
  const { user, profile } = useInvestorAuth();
  const [prefix, setPrefix] = useState(DEFAULTS.invoicePrefix);
  const [includeYear, setIncludeYear] = useState(DEFAULTS.invoiceIncludeYear);
  const [padLength, setPadLength] = useState(DEFAULTS.invoicePadLength);
  const [nextSequence, setNextSequence] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const settings = await getPlatformSettings();
    setPrefix(settings.invoicePrefix);
    setIncludeYear(settings.invoiceIncludeYear);
    setPadLength(settings.invoicePadLength);
    setNextSequence(await getInvoiceNextSequence(settings.invoiceIncludeYear));
  };

  useEffect(() => {
    load()
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load invoice numbering'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;
    getInvoiceNextSequence(includeYear)
      .then(setNextSequence)
      .catch(() => undefined);
  }, [includeYear, loading]);

  const preview = useMemo(
    () =>
      formatInvoiceNumber(
        { prefix, includeYear, padLength },
        Math.max(1, Math.floor(Number(nextSequence) || 1)),
      ),
    [prefix, includeYear, padLength, nextSequence],
  );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cleanedPrefix = sanitizeInvoicePrefix(prefix);
      const pad = clampInvoicePad(padLength);
      const next = Math.max(1, Math.floor(Number(nextSequence) || 1));
      await updatePlatformSettings({
        invoicePrefix: cleanedPrefix,
        invoiceIncludeYear: includeYear,
        invoicePadLength: pad,
      });
      await setInvoiceNextSequence(includeYear, next);
      setPrefix(cleanedPrefix);
      setPadLength(pad);
      setNextSequence(next);
      if (user) logAction(user.uid, profile?.email ?? '', 'Invoice numbering updated', preview);
      toast.success(`Next invoice will be ${preview}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="sg-text-muted text-sm">Loading...</p>;

  return (
    <form onSubmit={save} className="sg-panel p-5 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4" style={{ color: 'var(--sg-indigo)' }} />
        <h3 className="font-semibold sg-text-main">Invoice number series</h3>
      </div>
      <p className="text-sm sg-text-muted">
        Controls the number assigned when finance issues an invoice. Existing invoices keep their numbers.
        {includeYear
          ? ' Sequence is per calendar year (resets each January unless you set the next value).'
          : ' Sequence is continuous and does not reset with the year.'}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Prefix</label>
          <input
            className="sg-input mt-1.5 font-mono"
            value={prefix}
            maxLength={16}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="SG-INV"
          />
        </div>
        <div>
          <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Sequence digits</label>
          <input
            className="sg-input mt-1.5"
            type="number"
            min={3}
            max={8}
            value={padLength}
            onChange={(e) => setPadLength(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Next sequence</label>
          <input
            className="sg-input mt-1.5 font-mono"
            type="number"
            min={1}
            value={nextSequence}
            onChange={(e) => setNextSequence(Number(e.target.value))}
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm sg-text-main pb-2">
            <input
              type="checkbox"
              checked={includeYear}
              onChange={(e) => setIncludeYear(e.target.checked)}
            />
            Include calendar year (YY)
          </label>
        </div>
      </div>
      <p className="text-sm">
        Next invoice number: <span className="font-mono font-semibold sg-text-main">{preview}</span>
      </p>
      <button type="submit" disabled={saving} className="sg-btn-primary">{saving ? 'Saving...' : 'Save series'}</button>
    </form>
  );
}

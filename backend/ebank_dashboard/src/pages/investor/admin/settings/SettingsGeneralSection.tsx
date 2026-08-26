import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Building2, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import { getPlatformSettings, updatePlatformSettings, DEFAULTS } from '../../../../services/investor/settingsService';
import { previewDataReset, executeDataReset, type DataResetPreview } from '../../../../services/investor/dataResetService';
import { useInvestorAuth } from '../../../../contexts/InvestorAuthContext';
import { logAction } from '../../../../services/investor/auditService';

const TIMEZONES = [
  { value: 'America/New_York', label: 'US Eastern (ET)' },
  { value: 'America/Chicago', label: 'US Central (CT)' },
  { value: 'America/Denver', label: 'US Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'UTC', label: 'UTC' },
];

function DataResetPanel() {
  const { user, profile } = useInvestorAuth();
  const [preview, setPreview] = useState<DataResetPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const runPreview = async () => {
    setLoadingPreview(true);
    try {
      setPreview(await previewDataReset());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to preview data reset');
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => { runPreview(); }, []);

  const confirmDelete = async () => {
    if (!preview || confirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      const count = await executeDataReset(preview.toRemove.map((p) => p.id));
      if (user) logAction(user.uid, profile?.email ?? '', 'Data reset executed', `${count} mock/incomplete profiles removed`);
      toast.success(`${count} profile${count === 1 ? '' : 's'} removed`);
      setConfirmText('');
      runPreview();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Data reset failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="sg-panel p-5 space-y-4" style={{ borderColor: 'rgba(244,114,182,.35)' }}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" style={{ color: 'var(--sg-danger)' }} />
        <h3 className="font-semibold sg-text-main">Data Reset (Danger Zone)</h3>
      </div>
      <p className="text-sm sg-text-muted">
        Remove mock and incomplete client accounts. Staff/admin access and clients who have made any real onboarding
        progress are always preserved.
      </p>

      <div className="rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--sg-gold)', background: 'rgba(234,179,8,.08)' }}>
        <p className="font-semibold" style={{ color: 'var(--sg-gold)' }}>This action permanently deletes profile records.</p>
        <ul className="list-disc list-inside mt-1.5 space-y-0.5" style={{ color: 'var(--sg-muted)' }}>
          <li>Mock/test accounts (e.g. *.test@, *@example.com emails)</li>
          <li>Signups that never progressed past account creation (still pending, no onboarding started)</li>
        </ul>
        <p className="mt-1.5" style={{ color: 'var(--sg-teal)' }}>
          Preserved: all staff/admin roles, plus any client who is active, completed onboarding, or explicitly skipped
          onboarding to browse.
        </p>
      </div>

      {loadingPreview ? (
        <p className="text-sm sg-text-muted">Loading preview...</p>
      ) : preview ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'To Remove', value: preview.toRemove.length, color: 'var(--sg-danger)' },
              { label: 'Preserved', value: preview.preservedClients, color: 'var(--sg-teal)' },
              { label: 'Staff Kept', value: preview.staffKept, color: 'var(--sg-text)' },
              { label: 'Approved Clients Kept', value: preview.approvedClientsKept, color: 'var(--sg-text)' },
            ].map((k) => (
              <div key={k.label} className="sg-card p-3 text-center" style={{ borderRadius: 10 }}>
                <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>{k.label}</p>
                <p className="text-lg font-bold mt-1" style={{ fontFamily: 'var(--sg-font-display)', color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {preview.toRemove.length > 0 && (
            <>
              <div className="max-h-40 overflow-y-auto sg-panel">
                {preview.toRemove.map((p) => (
                  <div key={p.id} className="px-3 py-1.5 text-xs border-b sg-row-border flex justify-between">
                    <span className="sg-text-main">{p.email}</span>
                    <span className="sg-text-faint">{p.accountStatus}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder='Type "DELETE" to confirm'
                  className="sg-input max-w-xs"
                />
                <button
                  type="button"
                  disabled={confirmText !== 'DELETE' || deleting}
                  onClick={confirmDelete}
                  className="sg-danger-btn flex items-center gap-2"
                  style={{ opacity: confirmText === 'DELETE' ? 1 : 0.5 }}
                >
                  <Trash2 className="h-4 w-4" /> {deleting ? 'Removing...' : `Remove ${preview.toRemove.length}`}
                </button>
              </div>
            </>
          )}
          {preview.toRemove.length === 0 && <p className="text-sm sg-text-muted">Nothing to remove — the catalog is clean.</p>}
        </>
      ) : null}
    </div>
  );
}

export default function SettingsGeneralSection() {
  const { user, profile } = useInvestorAuth();
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPlatformSettings()
      .then(setForm)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updatePlatformSettings({
        platformName: form.platformName.trim(),
        defaultCurrency: form.defaultCurrency.trim().toUpperCase(),
        statementFooterText: form.statementFooterText.trim(),
        deskTimezone: form.deskTimezone,
      });
      if (user) logAction(user.uid, profile?.email ?? '', 'Platform identity updated', form.platformName.trim());
      toast.success('Saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="sg-text-muted text-sm">Loading...</p>;

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="sg-panel p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" style={{ color: 'var(--sg-indigo)' }} />
          <h3 className="font-semibold sg-text-main">Platform Identity</h3>
        </div>
        <p className="text-sm sg-text-muted">Company branding, default currency, and statement footer.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Platform Name</label>
            <input className="sg-input mt-1.5" value={form.platformName} onChange={(e) => setForm((f) => ({ ...f, platformName: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Default Currency</label>
            <input className="sg-input mt-1.5" value={form.defaultCurrency} onChange={(e) => setForm((f) => ({ ...f, defaultCurrency: e.target.value }))} maxLength={3} />
          </div>
        </div>
        <div>
          <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Statement Footer Text</label>
          <textarea
            className="sg-input mt-1.5"
            rows={2}
            value={form.statementFooterText}
            onChange={(e) => setForm((f) => ({ ...f, statementFooterText: e.target.value }))}
          />
        </div>
        <button type="submit" disabled={saving} className="sg-btn-primary">{saving ? 'Saving...' : 'Save'}</button>
      </form>

      <form onSubmit={save} className="sg-panel p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" style={{ color: 'var(--sg-indigo)' }} />
          <h3 className="font-semibold sg-text-main">Operations Timezone</h3>
        </div>
        <p className="text-sm sg-text-muted">
          Timestamps on the order book, executed trades ledger, and trade review drawers use this zone for display.
          Stored in UTC in the database.
        </p>
        <div className="max-w-xs">
          <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Desk Timezone</label>
          <select className="sg-input mt-1.5" value={form.deskTimezone} onChange={(e) => setForm((f) => ({ ...f, deskTimezone: e.target.value }))}>
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={saving} className="sg-btn-primary">{saving ? 'Saving...' : 'Save'}</button>
      </form>

      <DataResetPanel />
    </div>
  );
}

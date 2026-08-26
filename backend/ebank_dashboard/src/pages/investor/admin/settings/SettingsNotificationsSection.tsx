import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Megaphone, Bell } from 'lucide-react';
import { getPlatformSettings, updatePlatformSettings, DEFAULTS } from '../../../../services/investor/settingsService';
import { useInvestorAuth } from '../../../../contexts/InvestorAuthContext';
import { logAction } from '../../../../services/investor/auditService';

export default function SettingsNotificationsSection() {
  const { user, profile } = useInvestorAuth();
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [savingAlerts, setSavingAlerts] = useState(false);

  useEffect(() => {
    getPlatformSettings()
      .then(setForm)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const saveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAnnouncement(true);
    try {
      await updatePlatformSettings({ announcementEnabled: form.announcementEnabled, announcementMessage: form.announcementMessage.trim() });
      if (user) {
        logAction(user.uid, profile?.email ?? '', 'Platform announcement updated', form.announcementEnabled ? form.announcementMessage.trim() : 'disabled');
      }
      toast.success('Announcement saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const saveAlerts = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAlerts(true);
    try {
      await updatePlatformSettings({
        notifyOnNewApplicant: form.notifyOnNewApplicant,
        notifyOnFundingRequest: form.notifyOnFundingRequest,
        notifyOnLargeTrade: form.notifyOnLargeTrade,
        largeTradeThreshold: Number(form.largeTradeThreshold) || 0,
      });
      if (user) logAction(user.uid, profile?.email ?? '', 'Admin alert preferences updated');
      toast.success('Saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingAlerts(false);
    }
  };

  if (loading) return <p className="sg-text-muted text-sm">Loading...</p>;

  return (
    <div className="space-y-6">
      <form onSubmit={saveAnnouncement} className="sg-panel p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4" style={{ color: 'var(--sg-indigo)' }} />
          <h3 className="font-semibold sg-text-main">Platform Announcement</h3>
        </div>
        <p className="text-sm sg-text-muted">Shown as a banner to all signed-in clients when enabled.</p>
        <label className="flex items-center gap-2 text-sm sg-text-main">
          <input
            type="checkbox"
            checked={form.announcementEnabled}
            onChange={(e) => setForm((f) => ({ ...f, announcementEnabled: e.target.checked }))}
            style={{ accentColor: 'var(--sg-indigo-deep)' }}
          />
          Show announcement banner
        </label>
        <textarea
          value={form.announcementMessage}
          onChange={(e) => setForm((f) => ({ ...f, announcementMessage: e.target.value }))}
          placeholder="e.g. Scheduled maintenance Sunday 2-4am ET."
          className="sg-input"
          rows={3}
        />
        <button type="submit" disabled={savingAnnouncement} className="sg-btn-primary">{savingAnnouncement ? 'Saving...' : 'Save'}</button>
      </form>

      <form onSubmit={saveAlerts} className="sg-panel p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" style={{ color: 'var(--sg-indigo)' }} />
          <h3 className="font-semibold sg-text-main">Admin Alert Preferences</h3>
        </div>
        <p className="text-sm sg-text-muted">
          Records which desk events should page staff. Delivery (email/SMS) needs a provider wired up — these
          preferences are stored and ready for that once it's connected.
        </p>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm sg-text-main">
            <input type="checkbox" checked={form.notifyOnNewApplicant} onChange={(e) => setForm((f) => ({ ...f, notifyOnNewApplicant: e.target.checked }))} />
            New applicant submits onboarding
          </label>
          <label className="flex items-center gap-2 text-sm sg-text-main">
            <input type="checkbox" checked={form.notifyOnFundingRequest} onChange={(e) => setForm((f) => ({ ...f, notifyOnFundingRequest: e.target.checked }))} />
            New funding request submitted
          </label>
          <label className="flex items-center gap-2 text-sm sg-text-main">
            <input type="checkbox" checked={form.notifyOnLargeTrade} onChange={(e) => setForm((f) => ({ ...f, notifyOnLargeTrade: e.target.checked }))} />
            Trade executed above threshold
          </label>
        </div>
        {form.notifyOnLargeTrade && (
          <div className="max-w-xs">
            <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Large Trade Threshold (USD)</label>
            <input
              type="number"
              min="0"
              className="sg-input mt-1.5"
              value={form.largeTradeThreshold}
              onChange={(e) => setForm((f) => ({ ...f, largeTradeThreshold: Number(e.target.value) }))}
            />
          </div>
        )}
        <button type="submit" disabled={savingAlerts} className="sg-btn-primary">{savingAlerts ? 'Saving...' : 'Save'}</button>
      </form>
    </div>
  );
}

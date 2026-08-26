import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Mail } from 'lucide-react';
import { getPlatformSettings, updatePlatformSettings, DEFAULTS } from '../../../../services/investor/settingsService';
import { generateInvestorWelcomeEmailHtml } from '../../../../utils/investorAccountEmailService';
import { useInvestorAuth } from '../../../../contexts/InvestorAuthContext';
import { logAction } from '../../../../services/investor/auditService';

const SAMPLE = {
  firstName: 'Jordan',
  lastName: 'Lee',
  email: 'jordan.lee@example.com',
  temporaryPassword: 'Tmp-8f3kD91!',
  loginUrl: 'https://app.safeguardsecurities.us/login',
  uid: 'sample-uid-1234',
  accountManager: { name: 'Alex Rivera', email: 'alex.rivera@safeguardsecurities.us' },
};

export default function SettingsEmailTemplatesSection() {
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

  const previewHtml = useMemo(
    () =>
      generateInvestorWelcomeEmailHtml({
        ...SAMPLE,
        subjectOverride: form.welcomeEmailSubjectOverride,
        introOverride: form.welcomeEmailIntroOverride,
      }),
    [form.welcomeEmailSubjectOverride, form.welcomeEmailIntroOverride],
  );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updatePlatformSettings({
        welcomeEmailSubjectOverride: form.welcomeEmailSubjectOverride.trim(),
        welcomeEmailIntroOverride: form.welcomeEmailIntroOverride.trim(),
      });
      if (user) logAction(user.uid, profile?.email ?? '', 'Welcome email template updated');
      toast.success('Saved — new admin-created accounts will use this template');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="sg-text-muted text-sm">Loading...</p>;

  return (
    <div className="sg-panel p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4" style={{ color: 'var(--sg-indigo)' }} />
        <h3 className="font-semibold sg-text-main">Email Templates</h3>
      </div>
      <p className="text-sm sg-text-muted">
        Customize the welcome email sent when staff create a client account (Step 7 of admin trade entry). Layout and
        account details are fixed; the subject and intro line are editable below. Leave blank to use the defaults.
      </p>

      <form onSubmit={save} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <div>
            <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Subject Line</label>
            <input
              className="sg-input mt-1.5"
              value={form.welcomeEmailSubjectOverride}
              onChange={(e) => setForm((f) => ({ ...f, welcomeEmailSubjectOverride: e.target.value }))}
              placeholder="Welcome to SafeGuard Securities - Your Investor Workspace is Ready"
            />
          </div>
          <div>
            <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Intro Message</label>
            <textarea
              className="sg-input mt-1.5"
              rows={4}
              value={form.welcomeEmailIntroOverride}
              onChange={(e) => setForm((f) => ({ ...f, welcomeEmailIntroOverride: e.target.value }))}
              placeholder="Thank you for opening a trading account with SafeGuard Securities..."
            />
          </div>
          <button type="submit" disabled={saving} className="sg-btn-primary">{saving ? 'Saving...' : 'Save'}</button>
        </div>

        <div>
          <p className="text-xs uppercase mb-2" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Live Preview (sample data)</p>
          <iframe
            srcDoc={previewHtml}
            title="Welcome email preview"
            className="w-full"
            style={{ height: 480, border: '1px solid var(--sg-border)', borderRadius: 10, background: '#fff' }}
          />
        </div>
      </form>
    </div>
  );
}

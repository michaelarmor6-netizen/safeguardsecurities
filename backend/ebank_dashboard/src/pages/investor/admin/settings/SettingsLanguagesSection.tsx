import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Globe } from 'lucide-react';
import { getPlatformSettings, updatePlatformSettings, DEFAULTS } from '../../../../services/investor/settingsService';
import { useInvestorAuth } from '../../../../contexts/InvestorAuthContext';
import { logAction } from '../../../../services/investor/auditService';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'zh', label: 'Chinese (Simplified)' },
  { code: 'ar', label: 'Arabic' },
];

export default function SettingsLanguagesSection() {
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

  const toggleLanguage = (code: string) => {
    setForm((f) => {
      const has = f.supportedLanguages.includes(code);
      const next = has ? f.supportedLanguages.filter((c) => c !== code) : [...f.supportedLanguages, code];
      return { ...f, supportedLanguages: next };
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supportedLanguages.includes(form.defaultLanguage)) {
      toast.error('Default language must be one of the supported languages');
      return;
    }
    setSaving(true);
    try {
      await updatePlatformSettings({ defaultLanguage: form.defaultLanguage, supportedLanguages: form.supportedLanguages });
      if (user) logAction(user.uid, profile?.email ?? '', 'Language settings updated', form.supportedLanguages.join(', '));
      toast.success('Saved');
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
        <Globe className="h-4 w-4" style={{ color: 'var(--sg-indigo)' }} />
        <h3 className="font-semibold sg-text-main">Languages</h3>
      </div>
      <p className="text-sm sg-text-muted">
        Choose which languages are on file for the platform. Interface strings are English-only today — this records
        intent for a future localization pass rather than translating live.
      </p>

      <div>
        <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Supported Languages</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
          {LANGUAGES.map((l) => (
            <label key={l.code} className="flex items-center gap-2 text-sm sg-text-main">
              <input type="checkbox" checked={form.supportedLanguages.includes(l.code)} onChange={() => toggleLanguage(l.code)} />
              {l.label}
            </label>
          ))}
        </div>
      </div>

      <div className="max-w-xs">
        <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Default Language</label>
        <select
          className="sg-input mt-1.5"
          value={form.defaultLanguage}
          onChange={(e) => setForm((f) => ({ ...f, defaultLanguage: e.target.value }))}
        >
          {LANGUAGES.filter((l) => form.supportedLanguages.includes(l.code)).map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </div>

      <button type="submit" disabled={saving} className="sg-btn-primary">{saving ? 'Saving...' : 'Save'}</button>
    </form>
  );
}

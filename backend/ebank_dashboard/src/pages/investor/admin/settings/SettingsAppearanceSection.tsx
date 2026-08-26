import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Palette, Image as ImageIcon } from 'lucide-react';
import { getPlatformSettings, updatePlatformSettings, DEFAULTS } from '../../../../services/investor/settingsService';
import { useInvestorAuth } from '../../../../contexts/InvestorAuthContext';
import { logAction } from '../../../../services/investor/auditService';

export default function SettingsAppearanceSection() {
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
        logoUrl: form.logoUrl.trim(),
        brandPrimaryColor: form.brandPrimaryColor,
        brandAccentColor: form.brandAccentColor,
      });
      document.documentElement.style.setProperty('--sg-indigo', form.brandPrimaryColor);
      document.documentElement.style.setProperty('--sg-teal', form.brandAccentColor);
      if (user) logAction(user.uid, profile?.email ?? '', 'Branding updated', `primary ${form.brandPrimaryColor}, accent ${form.brandAccentColor}`);
      toast.success('Branding saved — colors applied immediately, all users see them on next load.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="sg-text-muted text-sm">Loading...</p>;

  return (
    <form onSubmit={save} className="sg-panel p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4" style={{ color: 'var(--sg-indigo)' }} />
        <h3 className="font-semibold sg-text-main">Appearance &amp; Branding</h3>
      </div>
      <p className="text-sm sg-text-muted">
        Logo and accent colors used across the investor and admin console. Colors apply live via CSS variables —
        no rebuild needed.
      </p>

      <div>
        <label className="text-xs uppercase flex items-center gap-1.5" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>
          <ImageIcon className="h-3.5 w-3.5" /> Logo URL
        </label>
        <input
          className="sg-input mt-1.5"
          value={form.logoUrl}
          onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
          placeholder="https://... (leave blank to use the default /logo.png)"
        />
        {form.logoUrl && (
          <div className="mt-2 p-3 rounded-lg inline-block" style={{ background: 'var(--sg-surface)' }}>
            <img src={form.logoUrl} alt="Logo preview" className="h-10 w-auto object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
        )}
        <p className="text-[11px] mt-1" style={{ color: 'var(--sg-muted-2)' }}>
          Stored for reference and welcome-email branding. Swapping the app-wide logo image requires replacing
          /logo.png in the deploy.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Primary Color</label>
          <div className="flex items-center gap-2 mt-1.5">
            <input
              type="color"
              value={form.brandPrimaryColor}
              onChange={(e) => setForm((f) => ({ ...f, brandPrimaryColor: e.target.value }))}
              className="h-9 w-12 rounded cursor-pointer"
              style={{ border: '1px solid var(--sg-border)' }}
            />
            <input
              className="sg-input flex-1 font-mono text-sm"
              value={form.brandPrimaryColor}
              onChange={(e) => setForm((f) => ({ ...f, brandPrimaryColor: e.target.value }))}
            />
          </div>
          <p className="text-[11px] mt-1" style={{ color: 'var(--sg-muted-2)' }}>Used for accents, active nav, and primary buttons.</p>
        </div>
        <div>
          <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Accent / Success Color</label>
          <div className="flex items-center gap-2 mt-1.5">
            <input
              type="color"
              value={form.brandAccentColor}
              onChange={(e) => setForm((f) => ({ ...f, brandAccentColor: e.target.value }))}
              className="h-9 w-12 rounded cursor-pointer"
              style={{ border: '1px solid var(--sg-border)' }}
            />
            <input
              className="sg-input flex-1 font-mono text-sm"
              value={form.brandAccentColor}
              onChange={(e) => setForm((f) => ({ ...f, brandAccentColor: e.target.value }))}
            />
          </div>
          <p className="text-[11px] mt-1" style={{ color: 'var(--sg-muted-2)' }}>Used for positive P/L, buy-side, and success states.</p>
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--sg-surface)' }}>
        <span className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>Preview:</span>
        <span className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white" style={{ background: form.brandPrimaryColor }}>Primary Button</span>
        <span className="text-sm font-semibold" style={{ color: form.brandAccentColor }}>+2.34% Gain</span>
      </div>

      <button type="submit" disabled={saving} className="sg-btn-primary">{saving ? 'Saving...' : 'Save'}</button>
    </form>
  );
}

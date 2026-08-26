import { useSearchParams } from 'react-router-dom';
import SettingsGeneralSection from './settings/SettingsGeneralSection';
import SettingsAppearanceSection from './settings/SettingsAppearanceSection';
import SettingsLanguagesSection from './settings/SettingsLanguagesSection';
import SettingsNotificationsSection from './settings/SettingsNotificationsSection';
import AdminTradingConfigSection from './settings/AdminTradingConfigSection';
import SettingsRolesSection from './settings/SettingsRolesSection';
import SettingsSecuritySection from './settings/SettingsSecuritySection';
import SettingsEmailTemplatesSection from './settings/SettingsEmailTemplatesSection';
import SettingsFundingDetailsSection from './settings/SettingsFundingDetailsSection';

type SectionKey =
  | 'general'
  | 'appearance'
  | 'languages'
  | 'notifications'
  | 'funding-details'
  | 'trading-config'
  | 'roles'
  | 'security'
  | 'email-templates';

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'appearance', label: 'Appearance & Branding' },
  { key: 'languages', label: 'Languages' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'funding-details', label: 'Funding Details' },
  { key: 'trading-config', label: 'Trading Configuration' },
  { key: 'roles', label: 'Roles & Permissions' },
  { key: 'security', label: 'Security' },
  { key: 'email-templates', label: 'Email Templates' },
];

export default function InvestorAdminSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const section = (searchParams.get('section') as SectionKey) || 'general';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="sg-page-title">Settings</h1>
        <p className="sg-page-sub mt-1">System configuration hub — platform identity, trading master data, roles, and security.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <nav className="lg:w-56 shrink-0 space-y-1">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSearchParams({ section: s.key })}
              className="w-full text-left px-3 py-2 rounded-[8px] text-sm transition"
              style={
                section === s.key
                  ? { background: 'rgba(99,102,241,.18)', color: 'var(--sg-indigo)', fontWeight: 600 }
                  : { color: 'var(--sg-muted)' }
              }
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0">
          {section === 'general' && <SettingsGeneralSection />}
          {section === 'appearance' && <SettingsAppearanceSection />}
          {section === 'languages' && <SettingsLanguagesSection />}
          {section === 'notifications' && <SettingsNotificationsSection />}
          {section === 'funding-details' && <SettingsFundingDetailsSection />}
          {section === 'trading-config' && <AdminTradingConfigSection />}
          {section === 'roles' && <SettingsRolesSection />}
          {section === 'security' && <SettingsSecuritySection />}
          {section === 'email-templates' && <SettingsEmailTemplatesSection />}
        </div>
      </div>
    </div>
  );
}

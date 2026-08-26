import { ShieldCheck, UserCog } from 'lucide-react';
import type {
  InvestorAccountManager,
  InvestorAddress,
  InvestorCompliance,
  InvestorEmployment,
  InvestorInvestmentProfile,
} from '../../../../services/investor/profileService';
import type { OnboardingCore, OnboardingErrors, OnboardingMode } from '../onboardingTypes';

interface Props {
  mode: OnboardingMode;
  core: OnboardingCore;
  address: InvestorAddress;
  employment: InvestorEmployment;
  investmentProfile: InvestorInvestmentProfile;
  value: InvestorCompliance;
  onChange: (patch: Partial<InvestorCompliance>) => void;
  accountManager: InvestorAccountManager;
  onAccountManagerChange: (patch: Partial<InvestorAccountManager>) => void;
  errors: OnboardingErrors;
}

function Row({ label, val }: { label: string; val: string }) {
  if (!val) return null;
  return (
    <div className="flex justify-between text-sm py-1">
      <span style={{ color: 'var(--sg-muted-2)' }}>{label}</span>
      <span style={{ color: 'var(--sg-text)' }}>{val}</span>
    </div>
  );
}

export default function Step6ComplianceReview({
  mode,
  core,
  address,
  employment,
  investmentProfile,
  value,
  onChange,
  accountManager,
  onAccountManagerChange,
  errors,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <ShieldCheck className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--sg-indigo)' }} />
        <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          Compliance & Review
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--sg-muted)' }}>Confirm your details and regulatory declarations</p>
      </div>

      <div className="sg-card p-4 space-y-1" style={{ borderRadius: 14 }}>
        <Row label="Name" val={`${core.firstName} ${core.middleName} ${core.lastName}`.replace(/\s+/g, ' ').trim()} />
        <Row label="Email" val={core.email} />
        <Row label="Date of Birth" val={core.dateOfBirth} />
        <Row label="Phone" val={core.phone} />
        <Row label="Address" val={[address.line1, address.city, address.state, address.postalCode, address.country].filter(Boolean).join(', ')} />
        <Row label="Citizenship" val={core.citizenship} />
        <Row label="Residency" val={core.residencyCountry} />
        <Row label="ID" val={core.idNumber ? `${core.idType} · ${core.idNumber}` : ''} />
        <Row label="Employment" val={employment.status} />
        <Row label="Annual Income" val={employment.annualIncome ?? ''} />
        <Row label="Investment Objective" val={investmentProfile.objective} />
        <Row label="Risk Tolerance" val={investmentProfile.riskTolerance} />
      </div>

      {mode === 'admin' && (
        <div className="sg-card p-4 space-y-4" style={{ borderRadius: 14 }}>
          <p className="text-xs uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--sg-muted-2)' }}>
            <UserCog className="h-3.5 w-3.5" /> Account Manager
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Name *</label>
              <input
                type="text"
                value={accountManager.name}
                onChange={(e) => onAccountManagerChange({ name: e.target.value })}
                className="sg-input mt-2"
              />
              {errors.accountManagerName && <p className="text-sm mt-1" style={{ color: 'var(--sg-danger)' }}>{errors.accountManagerName}</p>}
            </div>
            <div>
              <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Email *</label>
              <input
                type="email"
                value={accountManager.email}
                onChange={(e) => onAccountManagerChange({ email: e.target.value })}
                className="sg-input mt-2"
              />
              {errors.accountManagerEmail && <p className="text-sm mt-1" style={{ color: 'var(--sg-danger)' }}>{errors.accountManagerEmail}</p>}
            </div>
          </div>
          <div>
            <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Phone</label>
            <input
              type="tel"
              value={accountManager.phone ?? ''}
              onChange={(e) => onAccountManagerChange({ phone: e.target.value })}
              className="sg-input mt-2"
            />
          </div>
          <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>
            Shown to the client in their welcome email and reassignable later from Users.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>FATCA Status *</label>
          <select value={value.fatcaStatus ?? ''} onChange={(e) => onChange({ fatcaStatus: e.target.value })} className="sg-input mt-2">
            <option value="">Select...</option>
            <option value="us-person">US Person</option>
            <option value="non-us-person">Non-US Person</option>
          </select>
          {errors.fatcaStatus && <p className="text-sm mt-1" style={{ color: 'var(--sg-danger)' }}>{errors.fatcaStatus}</p>}
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-start gap-3 text-sm" style={{ color: 'var(--sg-muted)' }}>
          <input type="checkbox" checked={value.crsReporting} onChange={(e) => onChange({ crsReporting: e.target.checked })} className="mt-0.5" />
          I acknowledge Common Reporting Standard (CRS) tax transparency requirements may apply to my account.
        </label>
        <label className="flex items-start gap-3 text-sm" style={{ color: 'var(--sg-muted)' }}>
          <input type="checkbox" checked={value.pep} onChange={(e) => onChange({ pep: e.target.checked })} className="mt-0.5" />
          I am, or am closely associated with, a Politically Exposed Person (PEP).
        </label>
        <label className="flex items-start gap-3 text-sm" style={{ color: 'var(--sg-muted)' }}>
          <input type="checkbox" checked={value.sanctionsScreening} onChange={(e) => onChange({ sanctionsScreening: e.target.checked })} className="mt-0.5" />
          I consent to sanctions and watchlist screening as required by law.
        </label>
        <label className="flex items-start gap-3 text-sm font-medium" style={{ color: 'var(--sg-text)' }}>
          <input type="checkbox" checked={value.amlAcknowledged} onChange={(e) => onChange({ amlAcknowledged: e.target.checked })} className="mt-0.5" />
          I confirm the information above is accurate and acknowledge AML/KYC requirements. *
        </label>
        {errors.amlAcknowledged && <p className="text-sm" style={{ color: 'var(--sg-danger)' }}>{errors.amlAcknowledged}</p>}
      </div>
    </div>
  );
}

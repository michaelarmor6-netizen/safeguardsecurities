import { Shield } from 'lucide-react';
import SearchableCountrySelect from '../../../../components/ui/SearchableCountrySelect';
import type { OnboardingCore, OnboardingMode, OnboardingErrors } from '../onboardingTypes';

interface Props {
  mode: OnboardingMode;
  value: OnboardingCore;
  onChange: (patch: Partial<OnboardingCore>) => void;
  errors: OnboardingErrors;
  idFile: File | null;
  onIdFileChange: (file: File | null) => void;
}

export default function Step3IdentityResidency({ mode, value, onChange, errors, idFile, onIdFileChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <Shield className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--sg-indigo)' }} />
        <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          Identity & Residency
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--sg-muted)' }}>Citizenship and identification details</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Citizenship *</label>
          <SearchableCountrySelect value={value.citizenship} onChange={(v) => onChange({ citizenship: v })} placeholder="Select country..." className="mt-2" />
          {errors.citizenship && <p className="text-sm mt-1" style={{ color: 'var(--sg-danger)' }}>{errors.citizenship}</p>}
        </div>
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Country of Residence *</label>
          <SearchableCountrySelect value={value.residencyCountry} onChange={(v) => onChange({ residencyCountry: v })} placeholder="Select country..." className="mt-2" />
          {errors.residencyCountry && <p className="text-sm mt-1" style={{ color: 'var(--sg-danger)' }}>{errors.residencyCountry}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>ID Type *</label>
          <select value={value.idType} onChange={(e) => onChange({ idType: e.target.value })} className="sg-input mt-2">
            <option value="passport">Passport</option>
            <option value="drivers_license">Driver's License</option>
            <option value="national_id">National ID</option>
          </select>
        </div>
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>ID Number *</label>
          <input type="text" value={value.idNumber} onChange={(e) => onChange({ idNumber: e.target.value })} className="sg-input mt-2" />
          {errors.idNumber && <p className="text-sm mt-1" style={{ color: 'var(--sg-danger)' }}>{errors.idNumber}</p>}
        </div>
      </div>

      {mode === 'self' && (
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>ID Document (image or PDF, max 10MB)</label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => onIdFileChange(e.target.files?.[0] ?? null)}
            className="sg-input mt-2"
          />
          {idFile && <p className="text-xs mt-1" style={{ color: 'var(--sg-muted-2)' }}>{idFile.name}</p>}
        </div>
      )}
      {mode === 'admin' && (
        <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>
          Document upload isn't available in admin-created accounts yet — the client can upload it later from Verification in their workspace.
        </p>
      )}
    </div>
  );
}

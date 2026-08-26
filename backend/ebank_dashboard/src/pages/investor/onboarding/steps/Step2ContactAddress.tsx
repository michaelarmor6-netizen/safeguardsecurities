import { MapPin } from 'lucide-react';
import type { InvestorAddress } from '../../../../services/investor/profileService';
import type { StepProps } from '../onboardingTypes';

export default function Step2ContactAddress({ value, onChange, errors }: StepProps<InvestorAddress>) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <MapPin className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--sg-indigo)' }} />
        <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          Residential Address
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--sg-muted)' }}>Where the client currently resides</p>
      </div>

      <div>
        <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Street Address *</label>
        <input type="text" value={value.line1} onChange={(e) => onChange({ line1: e.target.value })} className="sg-input mt-2" />
        {errors.line1 && <p className="text-sm mt-1" style={{ color: 'var(--sg-danger)' }}>{errors.line1}</p>}
      </div>
      <div>
        <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Address Line 2</label>
        <input type="text" value={value.line2 ?? ''} onChange={(e) => onChange({ line2: e.target.value })} className="sg-input mt-2" placeholder="Apartment, suite, etc." />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>City *</label>
          <input type="text" value={value.city} onChange={(e) => onChange({ city: e.target.value })} className="sg-input mt-2" />
          {errors.city && <p className="text-sm mt-1" style={{ color: 'var(--sg-danger)' }}>{errors.city}</p>}
        </div>
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>State / Province *</label>
          <input type="text" value={value.state} onChange={(e) => onChange({ state: e.target.value })} className="sg-input mt-2" />
          {errors.state && <p className="text-sm mt-1" style={{ color: 'var(--sg-danger)' }}>{errors.state}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Postal Code *</label>
          <input type="text" value={value.postalCode} onChange={(e) => onChange({ postalCode: e.target.value })} className="sg-input mt-2" />
          {errors.postalCode && <p className="text-sm mt-1" style={{ color: 'var(--sg-danger)' }}>{errors.postalCode}</p>}
        </div>
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Country *</label>
          <input type="text" value={value.country} onChange={(e) => onChange({ country: e.target.value })} className="sg-input mt-2" placeholder="Country of residence" />
          {errors.country && <p className="text-sm mt-1" style={{ color: 'var(--sg-danger)' }}>{errors.country}</p>}
        </div>
      </div>
    </div>
  );
}

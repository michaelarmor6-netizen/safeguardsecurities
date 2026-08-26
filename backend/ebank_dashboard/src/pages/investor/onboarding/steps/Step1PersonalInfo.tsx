import { User } from 'lucide-react';
import type { OnboardingCore, StepProps } from '../onboardingTypes';

function isoDateYearsAgo(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

export default function Step1PersonalInfo({ mode, value, onChange, errors }: StepProps<OnboardingCore>) {
  const minDob = isoDateYearsAgo(120);
  const maxDob = isoDateYearsAgo(18);

  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <User className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--sg-indigo)' }} />
        <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          Personal Information
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--sg-muted)' }}>
          {mode === 'admin' ? "Enter the client's basic details" : 'Please confirm your basic details'}
        </p>
      </div>

      {mode === 'admin' ? (
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Client Email *</label>
          <input
            type="email"
            value={value.email}
            onChange={(e) => onChange({ email: e.target.value })}
            className="sg-input mt-2"
            placeholder="client@example.com"
          />
          {errors.email && <p className="text-sm mt-1" style={{ color: 'var(--sg-danger)' }}>{errors.email}</p>}
        </div>
      ) : (
        <div className="sg-card p-3" style={{ borderRadius: 12 }}>
          <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>Signed in as</p>
          <p className="text-sm font-medium" style={{ color: 'var(--sg-text)' }}>{value.email}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>First Name *</label>
          <input type="text" value={value.firstName} onChange={(e) => onChange({ firstName: e.target.value })} className="sg-input mt-2" />
          {errors.firstName && <p className="text-sm mt-1" style={{ color: 'var(--sg-danger)' }}>{errors.firstName}</p>}
        </div>
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Middle Name</label>
          <input type="text" value={value.middleName} onChange={(e) => onChange({ middleName: e.target.value })} className="sg-input mt-2" />
        </div>
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Last Name *</label>
          <input type="text" value={value.lastName} onChange={(e) => onChange({ lastName: e.target.value })} className="sg-input mt-2" />
          {errors.lastName && <p className="text-sm mt-1" style={{ color: 'var(--sg-danger)' }}>{errors.lastName}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Date of Birth *</label>
          <input
            type="date"
            value={value.dateOfBirth}
            onChange={(e) => onChange({ dateOfBirth: e.target.value })}
            min={minDob}
            max={maxDob}
            className="sg-input mt-2"
          />
          {errors.dateOfBirth && <p className="text-sm mt-1" style={{ color: 'var(--sg-danger)' }}>{errors.dateOfBirth}</p>}
        </div>
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Gender *</label>
          <select value={value.gender} onChange={(e) => onChange({ gender: e.target.value })} className="sg-input mt-2">
            <option value="">Select...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
          {errors.gender && <p className="text-sm mt-1" style={{ color: 'var(--sg-danger)' }}>{errors.gender}</p>}
        </div>
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Phone Number *</label>
          <input type="tel" value={value.phone} onChange={(e) => onChange({ phone: e.target.value })} className="sg-input mt-2" />
          {errors.phone && <p className="text-sm mt-1" style={{ color: 'var(--sg-danger)' }}>{errors.phone}</p>}
        </div>
      </div>
    </div>
  );
}

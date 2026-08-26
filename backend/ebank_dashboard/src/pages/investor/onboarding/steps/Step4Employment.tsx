import { Briefcase } from 'lucide-react';
import type { InvestorEmployment } from '../../../../services/investor/profileService';
import type { StepProps } from '../onboardingTypes';

export default function Step4Employment({ value, onChange, errors }: StepProps<InvestorEmployment>) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <Briefcase className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--sg-indigo)' }} />
        <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          Employment & Income
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--sg-muted)' }}>Used for suitability and compliance checks</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Employment Status *</label>
          <select value={value.status} onChange={(e) => onChange({ status: e.target.value })} className="sg-input mt-2">
            <option value="">Select...</option>
            <option value="employed">Employed</option>
            <option value="self-employed">Self-Employed</option>
            <option value="business-owner">Business Owner</option>
            <option value="unemployed">Unemployed</option>
            <option value="retired">Retired</option>
            <option value="student">Student</option>
            <option value="other">Other</option>
          </select>
          {errors.status && <p className="text-sm mt-1" style={{ color: 'var(--sg-danger)' }}>{errors.status}</p>}
        </div>
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Annual Income (USD) *</label>
          <select value={value.annualIncome ?? ''} onChange={(e) => onChange({ annualIncome: e.target.value })} className="sg-input mt-2">
            <option value="">Select range...</option>
            <option value="under-25k">Under $25,000</option>
            <option value="25k-50k">$25,000 - $50,000</option>
            <option value="50k-100k">$50,000 - $100,000</option>
            <option value="100k-250k">$100,000 - $250,000</option>
            <option value="250k-500k">$250,000 - $500,000</option>
            <option value="over-500k">Over $500,000</option>
          </select>
          {errors.annualIncome && <p className="text-sm mt-1" style={{ color: 'var(--sg-danger)' }}>{errors.annualIncome}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Employer</label>
          <input type="text" value={value.employer ?? ''} onChange={(e) => onChange({ employer: e.target.value })} className="sg-input mt-2" />
        </div>
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Job Title</label>
          <input type="text" value={value.jobTitle ?? ''} onChange={(e) => onChange({ jobTitle: e.target.value })} className="sg-input mt-2" />
        </div>
      </div>

      <div>
        <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Primary Source of Income *</label>
        <select value={value.incomeSource ?? ''} onChange={(e) => onChange({ incomeSource: e.target.value })} className="sg-input mt-2">
          <option value="">Select...</option>
          <option value="salary">Salary/Wages</option>
          <option value="business">Business Income</option>
          <option value="investments">Investment Income</option>
          <option value="retirement">Retirement/Pension</option>
          <option value="other">Other</option>
        </select>
        {errors.incomeSource && <p className="text-sm mt-1" style={{ color: 'var(--sg-danger)' }}>{errors.incomeSource}</p>}
      </div>
    </div>
  );
}

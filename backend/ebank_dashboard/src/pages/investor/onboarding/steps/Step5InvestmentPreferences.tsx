import { TrendingUp } from 'lucide-react';
import type { InvestorInvestmentProfile } from '../../../../services/investor/profileService';
import type { StepProps } from '../onboardingTypes';

export default function Step5InvestmentPreferences({ value, onChange, errors }: StepProps<InvestorInvestmentProfile>) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <TrendingUp className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--sg-indigo)' }} />
        <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          Investment Preferences
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--sg-muted)' }}>Helps us tailor the workspace and suitability checks</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Investment Objective *</label>
          <select value={value.objective} onChange={(e) => onChange({ objective: e.target.value })} className="sg-input mt-2">
            <option value="">Select...</option>
            <option value="growth">Growth</option>
            <option value="income">Income</option>
            <option value="capital-preservation">Capital Preservation</option>
            <option value="speculation">Speculation</option>
          </select>
          {errors.objective && <p className="text-sm mt-1" style={{ color: 'var(--sg-danger)' }}>{errors.objective}</p>}
        </div>
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Risk Tolerance *</label>
          <select value={value.riskTolerance} onChange={(e) => onChange({ riskTolerance: e.target.value })} className="sg-input mt-2">
            <option value="">Select...</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          {errors.riskTolerance && <p className="text-sm mt-1" style={{ color: 'var(--sg-danger)' }}>{errors.riskTolerance}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Investing Experience *</label>
          <select value={value.experienceLevel} onChange={(e) => onChange({ experienceLevel: e.target.value })} className="sg-input mt-2">
            <option value="">Select...</option>
            <option value="none">None</option>
            <option value="limited">Limited</option>
            <option value="moderate">Moderate</option>
            <option value="extensive">Extensive</option>
          </select>
          {errors.experienceLevel && <p className="text-sm mt-1" style={{ color: 'var(--sg-danger)' }}>{errors.experienceLevel}</p>}
        </div>
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Expected Initial Funding</label>
          <select value={value.initialFundingIntent ?? ''} onChange={(e) => onChange({ initialFundingIntent: e.target.value })} className="sg-input mt-2">
            <option value="">Select range...</option>
            <option value="under-1k">Under $1,000</option>
            <option value="1k-10k">$1,000 - $10,000</option>
            <option value="10k-50k">$10,000 - $50,000</option>
            <option value="50k-250k">$50,000 - $250,000</option>
            <option value="over-250k">Over $250,000</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Source of Funds</label>
        <select value={value.sourceOfFunds ?? ''} onChange={(e) => onChange({ sourceOfFunds: e.target.value })} className="sg-input mt-2">
          <option value="">Select...</option>
          <option value="personal-savings">Personal Savings</option>
          <option value="salary">Salary/Income</option>
          <option value="business-income">Business Income</option>
          <option value="investment-gains">Investment Gains</option>
          <option value="inheritance">Inheritance/Gift</option>
          <option value="other">Other</option>
        </select>
      </div>
    </div>
  );
}

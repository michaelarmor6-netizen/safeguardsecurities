import { useState } from 'react';
import { CheckCircle, User, MapPin, Shield, Briefcase, TrendingUp, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import type {
  InvestorAccountManager,
  InvestorAddress,
  InvestorCompliance,
  InvestorEmployment,
  InvestorInvestmentProfile,
} from '../../../services/investor/profileService';
import {
  initialAddress,
  initialCompliance,
  initialCore,
  initialEmployment,
  initialInvestmentProfile,
  type OnboardingCore,
  type OnboardingErrors,
  type OnboardingMode,
} from './onboardingTypes';
import Step1PersonalInfo from './steps/Step1PersonalInfo';
import Step2ContactAddress from './steps/Step2ContactAddress';
import Step3IdentityResidency from './steps/Step3IdentityResidency';
import Step4Employment from './steps/Step4Employment';
import Step5InvestmentPreferences from './steps/Step5InvestmentPreferences';
import Step6ComplianceReview from './steps/Step6ComplianceReview';
import Step7Confirmation from './steps/Step7Confirmation';

export interface OnboardingSubmitPayload {
  core: OnboardingCore;
  address: InvestorAddress;
  employment: InvestorEmployment;
  investmentProfile: InvestorInvestmentProfile;
  compliance: InvestorCompliance;
  accountManager: InvestorAccountManager;
  idFile: File | null;
}

export interface OnboardingSubmitResult {
  firstName: string;
  lastName: string;
  email: string;
  temporaryPassword?: string;
  uid?: string;
}

interface Props {
  mode: OnboardingMode;
  initialEmail?: string;
  adminName?: string;
  adminEmail?: string;
  onSubmit: (payload: OnboardingSubmitPayload) => Promise<OnboardingSubmitResult>;
  onCreateAnother?: () => void;
  onSkip?: () => void;
}

const steps = [
  { id: 1, title: 'Personal', icon: User },
  { id: 2, title: 'Address', icon: MapPin },
  { id: 3, title: 'Identity', icon: Shield },
  { id: 4, title: 'Employment', icon: Briefcase },
  { id: 5, title: 'Investing', icon: TrendingUp },
  { id: 6, title: 'Review', icon: ShieldCheck },
  { id: 7, title: 'Done', icon: CheckCircle },
];

export default function InvestorOnboardingWizard({ mode, initialEmail, adminName, adminEmail, onSubmit, onCreateAnother, onSkip }: Props) {
  const [currentStep, setCurrentStep] = useState(1);
  const [core, setCore] = useState<OnboardingCore>({ ...initialCore, email: initialEmail ?? '' });
  const [address, setAddress] = useState<InvestorAddress>(initialAddress);
  const [employment, setEmployment] = useState<InvestorEmployment>(initialEmployment);
  const [investmentProfile, setInvestmentProfile] = useState<InvestorInvestmentProfile>(initialInvestmentProfile);
  const [compliance, setCompliance] = useState<InvestorCompliance>(initialCompliance);
  const [accountManager, setAccountManager] = useState<InvestorAccountManager>({
    name: adminName ?? '',
    email: adminEmail ?? '',
    phone: '',
  });
  const [idFile, setIdFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<OnboardingErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<OnboardingSubmitResult | null>(null);

  const patchCore = (patch: Partial<OnboardingCore>) => setCore((prev) => ({ ...prev, ...patch }));
  const patchAddress = (patch: Partial<InvestorAddress>) => setAddress((prev) => ({ ...prev, ...patch }));
  const patchEmployment = (patch: Partial<InvestorEmployment>) => setEmployment((prev) => ({ ...prev, ...patch }));
  const patchInvestmentProfile = (patch: Partial<InvestorInvestmentProfile>) => setInvestmentProfile((prev) => ({ ...prev, ...patch }));
  const patchCompliance = (patch: Partial<InvestorCompliance>) => setCompliance((prev) => ({ ...prev, ...patch }));
  const patchAccountManager = (patch: Partial<InvestorAccountManager>) => setAccountManager((prev) => ({ ...prev, ...patch }));

  const validateStep = (step: number): boolean => {
    const next: OnboardingErrors = {};
    if (step === 1) {
      if (mode === 'admin' && !core.email.trim()) next.email = 'Email is required';
      if (!core.firstName.trim()) next.firstName = 'First name is required';
      if (!core.lastName.trim()) next.lastName = 'Last name is required';
      if (!core.dateOfBirth) {
        next.dateOfBirth = 'Date of birth is required';
      } else {
        const dob = new Date(core.dateOfBirth);
        const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (Number.isNaN(dob.getTime()) || age < 18 || age > 120) {
          next.dateOfBirth = 'Enter a valid date of birth (must be 18 or older)';
        }
      }
      if (!core.gender) next.gender = 'Gender is required';
      if (!core.phone.trim()) next.phone = 'Phone number is required';
    } else if (step === 2) {
      if (!address.line1.trim()) next.line1 = 'Address is required';
      if (!address.city.trim()) next.city = 'City is required';
      if (!address.state.trim()) next.state = 'State is required';
      if (!address.postalCode.trim()) next.postalCode = 'Postal code is required';
      if (!address.country.trim()) next.country = 'Country is required';
    } else if (step === 3) {
      if (!core.citizenship) next.citizenship = 'Citizenship is required';
      if (!core.residencyCountry) next.residencyCountry = 'Residency country is required';
      if (!core.idNumber.trim()) next.idNumber = 'ID number is required';
    } else if (step === 4) {
      if (!employment.status) next.status = 'Employment status is required';
      if (!employment.annualIncome) next.annualIncome = 'Annual income is required';
      if (!employment.incomeSource) next.incomeSource = 'Income source is required';
    } else if (step === 5) {
      if (!investmentProfile.objective) next.objective = 'Investment objective is required';
      if (!investmentProfile.riskTolerance) next.riskTolerance = 'Risk tolerance is required';
      if (!investmentProfile.experienceLevel) next.experienceLevel = 'Experience level is required';
    } else if (step === 6) {
      if (!compliance.fatcaStatus) next.fatcaStatus = 'FATCA status is required';
      if (!compliance.amlAcknowledged) next.amlAcknowledged = 'You must acknowledge this to continue';
      if (mode === 'admin' && !accountManager.name.trim()) next.accountManagerName = 'Account manager name is required';
      if (mode === 'admin' && !accountManager.email.trim()) next.accountManagerEmail = 'Account manager email is required';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) setCurrentStep((s) => s + 1);
  };
  const prevStep = () => setCurrentStep((s) => s - 1);

  const handleSubmit = async () => {
    if (!validateStep(6)) return;
    setSubmitting(true);
    try {
      const res = await onSubmit({ core, address, employment, investmentProfile, compliance, accountManager, idFile });
      setResult(res);
      setCurrentStep(7);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForAnother = () => {
    setCurrentStep(1);
    setCore({ ...initialCore });
    setAddress(initialAddress);
    setEmployment(initialEmployment);
    setInvestmentProfile(initialInvestmentProfile);
    setCompliance(initialCompliance);
    setAccountManager({ name: adminName ?? '', email: adminEmail ?? '', phone: '' });
    setIdFile(null);
    setErrors({});
    setResult(null);
    onCreateAnother?.();
  };

  return (
    <div className="max-w-3xl mx-auto">
      {mode === 'self' && currentStep < 7 && onSkip && (
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-medium"
            style={{ color: 'var(--sg-muted-2)' }}
          >
            Skip for now — browse the dashboard first →
          </button>
        </div>
      )}
      <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          return (
            <div key={step.id} className="flex items-center shrink-0">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0"
                style={{
                  background: isCompleted ? 'var(--sg-teal)' : isActive ? 'var(--sg-indigo)' : 'transparent',
                  borderColor: isCompleted ? 'var(--sg-teal)' : isActive ? 'var(--sg-indigo)' : 'var(--sg-border-strong)',
                  color: isCompleted || isActive ? 'white' : 'var(--sg-muted-2)',
                }}
              >
                {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span
                className="ml-2 text-xs font-medium hidden sm:inline"
                style={{ color: isActive ? 'var(--sg-indigo)' : isCompleted ? 'var(--sg-teal)' : 'var(--sg-muted-2)' }}
              >
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className="w-6 sm:w-10 h-0.5 mx-2" style={{ background: currentStep > step.id ? 'var(--sg-teal)' : 'var(--sg-border)' }} />
              )}
            </div>
          );
        })}
      </div>

      <div className="sg-card p-6 sm:p-8" style={{ borderRadius: 18 }}>
        {currentStep === 1 && <Step1PersonalInfo mode={mode} value={core} onChange={patchCore} errors={errors} />}
        {currentStep === 2 && <Step2ContactAddress mode={mode} value={address} onChange={patchAddress} errors={errors} />}
        {currentStep === 3 && (
          <Step3IdentityResidency mode={mode} value={core} onChange={patchCore} errors={errors} idFile={idFile} onIdFileChange={setIdFile} />
        )}
        {currentStep === 4 && <Step4Employment mode={mode} value={employment} onChange={patchEmployment} errors={errors} />}
        {currentStep === 5 && (
          <Step5InvestmentPreferences mode={mode} value={investmentProfile} onChange={patchInvestmentProfile} errors={errors} />
        )}
        {currentStep === 6 && (
          <Step6ComplianceReview
            mode={mode}
            core={core}
            address={address}
            employment={employment}
            investmentProfile={investmentProfile}
            value={compliance}
            onChange={patchCompliance}
            accountManager={accountManager}
            onAccountManagerChange={patchAccountManager}
            errors={errors}
          />
        )}
        {currentStep === 7 && result && (
          <Step7Confirmation
            mode={mode}
            firstName={result.firstName}
            lastName={result.lastName}
            email={result.email}
            temporaryPassword={result.temporaryPassword}
            uid={result.uid}
            accountManager={mode === 'admin' ? accountManager : undefined}
            onCreateAnother={mode === 'admin' ? resetForAnother : undefined}
          />
        )}

        {currentStep < 7 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t" style={{ borderColor: 'var(--sg-border)' }}>
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="sg-btn-ghost"
              style={{ opacity: currentStep === 1 ? 0.4 : 1 }}
            >
              Back
            </button>
            {currentStep < 6 ? (
              <button type="button" onClick={nextStep} className="sg-btn-primary">
                Continue
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={submitting} className="sg-btn-primary">
                {submitting ? 'Submitting...' : mode === 'admin' ? 'Create Account' : 'Submit'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

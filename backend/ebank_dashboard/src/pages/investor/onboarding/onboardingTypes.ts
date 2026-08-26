import type {
  InvestorAddress,
  InvestorCompliance,
  InvestorEmployment,
  InvestorInvestmentProfile,
} from '../../../services/investor/profileService';

export type OnboardingMode = 'self' | 'admin';

export interface OnboardingCore {
  email: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  citizenship: string;
  residencyCountry: string;
  idType: string;
  idNumber: string;
}

export const initialCore: OnboardingCore = {
  email: '',
  firstName: '',
  middleName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  phone: '',
  citizenship: '',
  residencyCountry: '',
  idType: 'passport',
  idNumber: '',
};

export const initialAddress: InvestorAddress = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
};

export const initialEmployment: InvestorEmployment = {
  status: '',
  employer: '',
  jobTitle: '',
  annualIncome: '',
  incomeSource: '',
};

export const initialInvestmentProfile: InvestorInvestmentProfile = {
  objective: '',
  riskTolerance: '',
  experienceLevel: '',
  initialFundingIntent: '',
  sourceOfFunds: '',
};

export const initialCompliance: InvestorCompliance = {
  fatcaStatus: '',
  crsReporting: false,
  pep: false,
  sanctionsScreening: false,
  amlAcknowledged: false,
};

export interface OnboardingErrors {
  [field: string]: string;
}

export interface StepProps<T> {
  mode: OnboardingMode;
  value: T;
  onChange: (patch: Partial<T>) => void;
  errors: OnboardingErrors;
}

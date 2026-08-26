import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import type {
  InvestorAccountManager,
  InvestorAddress,
  InvestorCompliance,
  InvestorEmployment,
  InvestorInvestmentProfile,
} from './profileService';

export interface CreateInvestorAccountPayload {
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  address: InvestorAddress;
  citizenship: string;
  residencyCountry: string;
  idType?: string;
  idNumber?: string;
  employment: InvestorEmployment;
  investmentProfile: InvestorInvestmentProfile;
  compliance: InvestorCompliance;
  accountManager?: InvestorAccountManager;
}

export interface CreateInvestorAccountResult {
  uid: string;
  temporaryPassword: string;
}

const createInvestorAccountFn = httpsCallable<CreateInvestorAccountPayload, CreateInvestorAccountResult>(
  functions,
  'createInvestorAccount',
);

export async function createInvestorAccount(
  payload: CreateInvestorAccountPayload,
): Promise<CreateInvestorAccountResult> {
  const res = await createInvestorAccountFn(payload);
  return res.data;
}

const checkEmailAvailableFn = httpsCallable<{ email: string }, { available: boolean }>(
  functions,
  'checkEmailAvailable',
);

export async function checkEmailAvailable(email: string): Promise<boolean> {
  const res = await checkEmailAvailableFn({ email });
  return res.data.available;
}

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

// ---- staff accounts ----

// Roles a super-admin may create from Settings -> Roles & Permissions.
// 'super_admin' is absent on purpose: it is bootstrapped from the
// SUPER_ADMIN_EMAILS allowlist, and minting one from a form would make that
// allowlist meaningless. 'client' belongs to createInvestorAccount, which
// captures the onboarding record a client needs.
export const CREATABLE_STAFF_ROLES = ['support', 'finance', 'compliance', 'admin'] as const;
export type CreatableStaffRole = (typeof CREATABLE_STAFF_ROLES)[number];

export interface CreateStaffAccountPayload {
  email: string;
  firstName: string;
  lastName: string;
  role: CreatableStaffRole;
}

export interface CreateStaffAccountResult {
  uid: string;
  temporaryPassword: string;
  role: CreatableStaffRole;
}

const createStaffAccountFn = httpsCallable<CreateStaffAccountPayload, CreateStaffAccountResult>(
  functions,
  'createStaffAccount',
);

export async function createStaffAccount(
  payload: CreateStaffAccountPayload,
): Promise<CreateStaffAccountResult> {
  const res = await createStaffAccountFn(payload);
  return res.data;
}

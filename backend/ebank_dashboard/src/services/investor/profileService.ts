import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';
import { resolveInvestorRole, isSuperAdminEmail, type AccountStatus, type InvestorRole } from '../../lib/investorRoles';
import { resolvePlan, type SubscriptionPlan } from '../../lib/subscriptionPlans';

export interface InvestorAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface InvestorEmployment {
  status: string;
  employer?: string;
  jobTitle?: string;
  annualIncome?: string;
  incomeSource?: string;
}

export interface InvestorInvestmentProfile {
  objective: string;
  riskTolerance: string;
  experienceLevel: string;
  initialFundingIntent?: string;
  sourceOfFunds?: string;
}

export interface InvestorCompliance {
  fatcaStatus?: string;
  crsReporting: boolean;
  pep: boolean;
  sanctionsScreening: boolean;
  amlAcknowledged: boolean;
}

export interface InvestorAccountManager {
  name: string;
  email: string;
  phone?: string;
}

// Client eligibility level for the self-managed Trade Desk (buy/sell placed
// by the client themselves). 'standard' clients cannot self-trade - the desk
// is reserved for advanced (long-partner) and institutional clients; staff
// set the tier in Admin -> Users. Enforced in the UI (InvestorTradeDeskPage)
// AND in firestore.rules (adminOrders create) - change both.
export type InvestorTier = 'standard' | 'advanced' | 'institutional';

export const INVESTOR_TIERS: InvestorTier[] = ['standard', 'advanced', 'institutional'];

function resolveTier(value: unknown): InvestorTier {
  return value === 'advanced' || value === 'institutional' ? value : 'standard';
}

// Staff roles always pass; clients need advanced/institutional tier.
export function canSelfTrade(profile: Pick<InvestorProfile, 'role' | 'investorTier'> | null | undefined): boolean {
  if (!profile) return false;
  if (profile.role !== 'client') return true;
  const tier = profile.investorTier ?? 'standard';
  return tier === 'advanced' || tier === 'institutional';
}

export interface InvestorProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phone?: string;
  role: InvestorRole;
  accountStatus: AccountStatus;
  investorTier?: InvestorTier;
  createdAt?: Date;

  // Onboarding
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: Date;
  onboardingSkipped?: boolean;
  onboardingSource?: 'self' | 'admin';
  createdBy?: string;
  middleName?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: InvestorAddress;
  citizenship?: string;
  residencyCountry?: string;
  idType?: string;
  employment?: InvestorEmployment;
  investmentProfile?: InvestorInvestmentProfile;
  compliance?: InvestorCompliance;
  accountManager?: InvestorAccountManager;

  // AI Engine subscription (Phase 1: assigned by staff, no billing yet)
  plan?: SubscriptionPlan;
  planSince?: Date;
}

export interface OnboardingPayload {
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
  employment: InvestorEmployment;
  investmentProfile: InvestorInvestmentProfile;
  compliance: InvestorCompliance;
}

function mapProfile(id: string, data: DocumentData): InvestorProfile {
  const email = String(data.email ?? '');
  return {
    id,
    email,
    firstName: data.firstName,
    lastName: data.lastName,
    displayName: data.displayName,
    phone: data.phone,
    role: resolveInvestorRole(email, data.role),
    accountStatus: (data.accountStatus as AccountStatus) ?? 'pending',
    investorTier: resolveTier(data.investorTier),
    createdAt: data.createdAt?.toDate?.() ?? undefined,

    onboardingCompleted: Boolean(data.onboardingCompleted),
    onboardingCompletedAt: data.onboardingCompletedAt?.toDate?.() ?? undefined,
    onboardingSkipped: Boolean(data.onboardingSkipped),
    onboardingSource: data.onboardingSource,
    createdBy: data.createdBy,
    middleName: data.middleName,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    address: data.address ?? undefined,
    citizenship: data.citizenship,
    residencyCountry: data.residencyCountry,
    idType: data.idType,
    employment: data.employment ?? undefined,
    investmentProfile: data.investmentProfile ?? undefined,
    compliance: data.compliance ?? undefined,
    accountManager: data.accountManager ?? undefined,
    plan: resolvePlan(data.plan),
    planSince: data.planSince?.toDate?.() ?? undefined,
  };
}

export async function getInvestorProfile(uid: string): Promise<InvestorProfile | null> {
  const ref = doc(db, LIVE_COLLECTIONS.profiles, uid);
  // Force a real server read on login so a just-activated account never sees a
  // locally-cached "pending" snapshot from earlier in the session.
  const snap = await getDocFromServer(ref).catch(() => getDoc(ref));
  if (!snap.exists()) return null;
  return mapProfile(snap.id, snap.data());
}

export async function ensureInvestorProfile(uid: string, email: string) {
  const existing = await getInvestorProfile(uid);
  if (existing) {
    // Heal allowlisted super-admins that were saved as client/pending.
    if (isSuperAdminEmail(email) && (existing.role !== 'super_admin' || existing.accountStatus !== 'active')) {
      await updateDoc(doc(db, LIVE_COLLECTIONS.profiles, uid), {
        role: 'super_admin',
        accountStatus: 'active',
        updatedAt: new Date(),
      });
      return {
        ...existing,
        role: 'super_admin' as InvestorRole,
        accountStatus: 'active' as AccountStatus,
      };
    }
    return existing;
  }
  const role = resolveInvestorRole(email);
  const accountStatus: AccountStatus = role === 'super_admin' ? 'active' : 'pending';
  const onboardingCompleted = role === 'super_admin';
  const profile: Omit<InvestorProfile, 'id'> = {
    email,
    role,
    accountStatus,
    firstName: role === 'super_admin' ? 'Super' : '',
    lastName: role === 'super_admin' ? 'Admin' : '',
    displayName: role === 'super_admin' ? 'Super Admin' : email.split('@')[0],
    createdAt: new Date(),
    onboardingCompleted,
  };
  await setDoc(doc(db, LIVE_COLLECTIONS.profiles, uid), {
    ...profile,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { id: uid, ...profile };
}

// Writes the client's own 7-step onboarding submission. Kept separate from
// updateInvestorProfile, whose narrow Pick<...> type intentionally excludes
// role/accountStatus as a defense-in-depth guard against self-escalation.
export async function submitClientOnboarding(uid: string, data: OnboardingPayload) {
  await updateDoc(doc(db, LIVE_COLLECTIONS.profiles, uid), {
    ...data,
    onboardingCompleted: true,
    onboardingCompletedAt: new Date(),
    onboardingSource: 'self',
    updatedAt: new Date(),
  });
}

// Lets a client browse the dashboard before finishing the 7-step wizard.
// Deliberately separate from onboardingCompleted: funding-gated features
// (AI Engine, Trade Desk) stay locked regardless via isFunded, so this only
// ever unlocks read-only browsing, never trading - see InvestorAuthContext.
export async function skipOnboarding(uid: string) {
  await updateDoc(doc(db, LIVE_COLLECTIONS.profiles, uid), {
    onboardingSkipped: true,
    updatedAt: new Date(),
  });
}

export async function getAllInvestorProfiles(): Promise<InvestorProfile[]> {
  const snap = await getDocs(query(collection(db, LIVE_COLLECTIONS.profiles), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => mapProfile(d.id, d.data()));
}

export async function getPendingApplicants(): Promise<InvestorProfile[]> {
  const snap = await getDocs(
    query(collection(db, LIVE_COLLECTIONS.profiles), where('accountStatus', '==', 'pending')),
  );
  return snap.docs.map((d) => mapProfile(d.id, d.data()));
}

export async function updateInvestorProfile(
  uid: string,
  patch: Partial<
    Pick<
      InvestorProfile,
      | 'accountStatus'
      | 'role'
      | 'investorTier'
      | 'firstName'
      | 'lastName'
      | 'phone'
      | 'accountManager'
      | 'address'
      | 'employment'
      | 'investmentProfile'
      | 'plan'
    >
  >,
) {
  await updateDoc(doc(db, LIVE_COLLECTIONS.profiles, uid), { ...patch, updatedAt: new Date() });
}

// Deletes only the Firestore profile document - does NOT delete the
// underlying Firebase Auth user, if one still exists. Safe/expected for
// orphaned profiles left behind by deleted-and-recreated test accounts;
// for a profile with a live Auth user, deleting just the profile means
// ensureInvestorProfile() will silently recreate a blank one on next login.
export async function deleteInvestorProfile(uid: string) {
  await deleteDoc(doc(db, LIVE_COLLECTIONS.profiles, uid));
}

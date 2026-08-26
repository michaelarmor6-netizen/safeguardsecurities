import { useEffect, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Settings as SettingsIcon,
  ShieldAlert,
  ShieldCheck,
  User,
  Mail,
  Lock,
  AlertOctagon,
  MapPin,
  Briefcase,
  TrendingUp,
  UserCog,
  Gift,
  Copy,
} from 'lucide-react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  verifyBeforeUpdateEmail,
} from 'firebase/auth';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import {
  SETTINGS_ITEMS,
  DEFAULT_SETTINGS_SECTION,
  findSettingsItem,
} from '../../../lib/settingsNav';
import { buildReferralLink } from '../../../lib/referralCodes';
import {
  getMyReferrals,
  getOrCreateReferralCode,
  type Referral,
} from '../../../services/investor/referralService';
import { updateInvestorProfile, type InvestorAddress, type InvestorEmployment, type InvestorInvestmentProfile } from '../../../services/investor/profileService';
import { createTicket } from '../../../services/investor/ticketService';
import { getKycSubmissionsForUser, type KycSubmission } from '../../../services/investor/kycService';
import { getFirebaseAuthErrorMessage } from '../../../lib/firebaseAuthErrors';

const kycStatusColor: Record<KycSubmission['status'], string> = {
  pending: 'var(--sg-gold)',
  verified: 'var(--sg-teal)',
  rejected: 'var(--sg-danger)',
};

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  danger,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  description?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className="sg-card p-5 space-y-4"
      style={{ borderRadius: 14, borderColor: danger ? 'rgba(244,114,182,.35)' : undefined }}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: danger ? 'var(--sg-danger)' : 'var(--sg-indigo)' }} />
        <h3 className="font-semibold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          {title}
        </h3>
      </div>
      {description && <p className="text-sm -mt-2" style={{ color: 'var(--sg-muted-2)' }}>{description}</p>}
      {children}
    </div>
  );
}


/**
 * Honest empty state for sub-tabs whose feature does not exist yet.
 * Better than a blank pane or a control that silently does nothing.
 */
function NotYetAvailable({ title, note }: { title: string; note: string }) {
  return (
    <SectionCard icon={SettingsIcon} title={title}>
      <p className="text-sm" style={{ color: 'var(--sg-muted)' }}>{note}</p>
      <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>
        Contact your account manager if you need this before it ships.
      </p>
    </SectionCard>
  );
}

export default function InvestorSettingsPage() {
  const { section } = useParams<{ section?: string }>();

  // Refer a friend
  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [copied, setCopied] = useState(false);
  const { user, profile, accountStatus, refreshProfile } = useInvestorAuth();
  // Profile
  const [firstName, setFirstName] = useState(profile?.firstName ?? '');
  const [lastName, setLastName] = useState(profile?.lastName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Address
  const [address, setAddress] = useState<InvestorAddress>(
    profile?.address ?? { line1: '', line2: '', city: '', state: '', postalCode: '', country: '' },
  );
  const [savingAddress, setSavingAddress] = useState(false);

  // Employment & investment profile
  const [employment, setEmployment] = useState<InvestorEmployment>(
    profile?.employment ?? { status: '', employer: '', jobTitle: '', annualIncome: '', incomeSource: '' },
  );
  const [investmentProfile, setInvestmentProfile] = useState<InvestorInvestmentProfile>(
    profile?.investmentProfile ?? {
      objective: '',
      riskTolerance: '',
      experienceLevel: '',
      initialFundingIntent: '',
      sourceOfFunds: '',
    },
  );
  const [savingInvestment, setSavingInvestment] = useState(false);

  // KYC
  const [kyc, setKyc] = useState<KycSubmission | null>(null);
  const [kycLoading, setKycLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getKycSubmissionsForUser(user.uid)
      .then((subs) => setKyc(subs[0] ?? null))
      .catch(() => setKyc(null))
      .finally(() => setKycLoading(false));
  }, [user]);

  // Email
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Account closure
  const [closureReason, setClosureReason] = useState('');
  const [requestingClosure, setRequestingClosure] = useState(false);
  const [closureRequested, setClosureRequested] = useState(false);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      await updateInvestorProfile(user.uid, { firstName, lastName, phone });
      await refreshProfile();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!address.line1.trim() || !address.city.trim() || !address.state.trim() || !address.postalCode.trim() || !address.country.trim()) {
      toast.error('Please complete all required address fields');
      return;
    }
    setSavingAddress(true);
    try {
      await updateInvestorProfile(user.uid, { address });
      await refreshProfile();
      toast.success('Address updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update address');
    } finally {
      setSavingAddress(false);
    }
  };

  const saveInvestmentDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingInvestment(true);
    try {
      await updateInvestorProfile(user.uid, { employment, investmentProfile });
      await refreshProfile();
      toast.success('Employment & investment profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSavingInvestment(false);
    }
  };

  const changeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;
    if (!newEmail.trim() || !emailPassword) {
      toast.error('Enter your new email and current password');
      return;
    }
    setChangingEmail(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, emailPassword);
      await reauthenticateWithCredential(user, credential);
      await verifyBeforeUpdateEmail(user, newEmail.trim());
      toast.success(`Verification link sent to ${newEmail.trim()}. Your email updates once you confirm it.`);
      setNewEmail('');
      setEmailPassword('');
    } catch (err) {
      toast.error(getFirebaseAuthErrorMessage(err));
    } finally {
      setChangingEmail(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    setChangingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error(getFirebaseAuthErrorMessage(err));
    } finally {
      setChangingPassword(false);
    }
  };

  const requestClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setRequestingClosure(true);
    try {
      await createTicket(
        user.uid,
        profile?.email ?? user.email ?? '',
        'Account Closure Request',
        closureReason.trim() || 'No reason provided.',
      );
      toast.success('Closure request submitted. SafeGuard staff will follow up.');
      setClosureReason('');
      setClosureRequested(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setRequestingClosure(false);
    }
  };

  const lastSignIn = user?.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime) : null;
  const memberSince = profile?.createdAt ?? (user?.metadata.creationTime ? new Date(user.metadata.creationTime) : null);

  const activeSection = section ?? DEFAULT_SETTINGS_SECTION;
  const activeItem = findSettingsItem(activeSection);

  useEffect(() => {
    if (activeSection !== 'refer-a-friend' || !user?.uid) return;
    let cancelled = false;
    getOrCreateReferralCode(user.uid, profile?.displayName, profile?.email).then((code) => {
      if (!cancelled) setReferralCode(code);
    });
    getMyReferrals(user.uid).then((list) => {
      if (!cancelled) setReferrals(list);
    });
    return () => {
      cancelled = true;
    };
  }, [activeSection, user?.uid, profile?.displayName, profile?.email]);

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(buildReferralLink(referralCode));
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — select the link and copy it manually');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="sg-page-title flex items-center gap-2">
          <SettingsIcon className="h-5 w-5" style={{ color: 'var(--sg-indigo)' }} />
          Settings
        </h1>
        <p className="sg-page-sub mt-1">
          {activeItem ? activeItem.label : 'Account preferences, security, and identity.'}
        </p>
      </div>

      {/* Horizontal section tabs - the only settings navigation, so the page
          stays at two panels: workspace sidebar + content. */}
      <div
        className="flex gap-1 overflow-x-auto -mx-1 px-1 pb-px"
        style={{ borderBottom: '1px solid var(--sg-border)', scrollbarWidth: 'thin' }}
        role="tablist"
        aria-label="Settings sections"
      >
        {SETTINGS_ITEMS.map((item) => {
          const isActive = item.slug === activeSection;
          return (
            <NavLink
              key={item.slug}
              to={`/workspace/settings/${item.slug}`}
              role="tab"
              aria-selected={isActive}
              className="shrink-0 whitespace-nowrap px-3 py-2 text-sm transition"
              style={{
                color: isActive ? 'var(--sg-text)' : 'var(--sg-muted)',
                borderBottom: `2px solid ${isActive ? 'var(--sg-indigo)' : 'transparent'}`,
                marginBottom: '-1px',
                fontWeight: isActive ? 600 : 400,
                fontFamily: 'var(--sg-font-display)',
              }}
            >
              {item.short ?? item.label}
            </NavLink>
          );
        })}
      </div>

      <div className="space-y-6">
          {activeSection === 'personal-details' && (
            <>
      <SectionCard icon={User} title="Account Overview">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p style={{ color: 'var(--sg-muted-2)' }}>Email</p>
            <p style={{ color: 'var(--sg-text)' }}>{profile?.email}</p>
          </div>
          <div>
            <p style={{ color: 'var(--sg-muted-2)' }}>Account Status</p>
            <p className="capitalize" style={{ color: accountStatus === 'active' ? 'var(--sg-teal)' : 'var(--sg-gold)' }}>
              {accountStatus}
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--sg-muted-2)' }}>Member Since</p>
            <p style={{ color: 'var(--sg-text)' }}>{memberSince ? memberSince.toLocaleDateString() : '—'}</p>
          </div>
          <div>
            <p style={{ color: 'var(--sg-muted-2)' }}>Last Sign-In</p>
            <p style={{ color: 'var(--sg-text)' }}>{lastSignIn ? lastSignIn.toLocaleString() : '—'}</p>
          </div>
        </div>
      </SectionCard>
      <form onSubmit={saveProfile}>
        <SectionCard icon={User} title="Profile">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>First Name</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="sg-input mt-2" />
            </div>
            <div>
              <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Last Name</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="sg-input mt-2" />
            </div>
          </div>
          <div>
            <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Phone Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="sg-input mt-2" placeholder="Optional" />
          </div>
          <button type="submit" disabled={savingProfile} className="sg-btn-primary">
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </SectionCard>
      </form>
      {(profile?.dateOfBirth || profile?.citizenship || profile?.idType) && (
        <SectionCard icon={ShieldCheck} title="Personal & Identity Details" description="Collected during onboarding. Contact support to update these.">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p style={{ color: 'var(--sg-muted-2)' }}>Date of Birth</p>
              <p style={{ color: 'var(--sg-text)' }}>{profile?.dateOfBirth || '—'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--sg-muted-2)' }}>Gender</p>
              <p className="capitalize" style={{ color: 'var(--sg-text)' }}>{profile?.gender || '—'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--sg-muted-2)' }}>Citizenship</p>
              <p style={{ color: 'var(--sg-text)' }}>{profile?.citizenship || '—'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--sg-muted-2)' }}>Residency</p>
              <p style={{ color: 'var(--sg-text)' }}>{profile?.residencyCountry || '—'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--sg-muted-2)' }}>ID Type</p>
              <p className="capitalize" style={{ color: 'var(--sg-text)' }}>{profile?.idType || '—'}</p>
            </div>
          </div>
        </SectionCard>
      )}
      <form onSubmit={saveAddress}>
        <SectionCard icon={MapPin} title="Residential Address">
          <div>
            <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Street Address</label>
            <input type="text" value={address.line1} onChange={(e) => setAddress((p) => ({ ...p, line1: e.target.value }))} className="sg-input mt-2" />
          </div>
          <div>
            <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Address Line 2</label>
            <input type="text" value={address.line2 ?? ''} onChange={(e) => setAddress((p) => ({ ...p, line2: e.target.value }))} className="sg-input mt-2" placeholder="Apartment, suite, etc." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>City</label>
              <input type="text" value={address.city} onChange={(e) => setAddress((p) => ({ ...p, city: e.target.value }))} className="sg-input mt-2" />
            </div>
            <div>
              <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>State / Province</label>
              <input type="text" value={address.state} onChange={(e) => setAddress((p) => ({ ...p, state: e.target.value }))} className="sg-input mt-2" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Postal Code</label>
              <input type="text" value={address.postalCode} onChange={(e) => setAddress((p) => ({ ...p, postalCode: e.target.value }))} className="sg-input mt-2" />
            </div>
            <div>
              <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Country</label>
              <input type="text" value={address.country} onChange={(e) => setAddress((p) => ({ ...p, country: e.target.value }))} className="sg-input mt-2" />
            </div>
          </div>
          <button type="submit" disabled={savingAddress} className="sg-btn-primary">
            {savingAddress ? 'Saving...' : 'Save Address'}
          </button>
        </SectionCard>
      </form>
            </>
          )}

          {activeSection === 'investment-profile' && (
      <form onSubmit={saveInvestmentDetails}>
        <SectionCard icon={Briefcase} title="Employment & Investment Profile" description="Used for suitability and compliance checks.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Employment Status</label>
              <select value={employment.status} onChange={(e) => setEmployment((p) => ({ ...p, status: e.target.value }))} className="sg-input mt-2">
                <option value="">Select...</option>
                <option value="employed">Employed</option>
                <option value="self-employed">Self-Employed</option>
                <option value="business-owner">Business Owner</option>
                <option value="unemployed">Unemployed</option>
                <option value="retired">Retired</option>
                <option value="student">Student</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Annual Income (USD)</label>
              <select value={employment.annualIncome ?? ''} onChange={(e) => setEmployment((p) => ({ ...p, annualIncome: e.target.value }))} className="sg-input mt-2">
                <option value="">Select range...</option>
                <option value="under-25k">Under $25,000</option>
                <option value="25k-50k">$25,000 - $50,000</option>
                <option value="50k-100k">$50,000 - $100,000</option>
                <option value="100k-250k">$100,000 - $250,000</option>
                <option value="250k-500k">$250,000 - $500,000</option>
                <option value="over-500k">Over $500,000</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Employer</label>
              <input type="text" value={employment.employer ?? ''} onChange={(e) => setEmployment((p) => ({ ...p, employer: e.target.value }))} className="sg-input mt-2" />
            </div>
            <div>
              <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Job Title</label>
              <input type="text" value={employment.jobTitle ?? ''} onChange={(e) => setEmployment((p) => ({ ...p, jobTitle: e.target.value }))} className="sg-input mt-2" />
            </div>
          </div>
          <div>
            <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Primary Source of Income</label>
            <select value={employment.incomeSource ?? ''} onChange={(e) => setEmployment((p) => ({ ...p, incomeSource: e.target.value }))} className="sg-input mt-2">
              <option value="">Select...</option>
              <option value="salary">Salary/Wages</option>
              <option value="business">Business Income</option>
              <option value="investments">Investment Income</option>
              <option value="retirement">Retirement/Pension</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="pt-2 mt-2 border-t flex items-center gap-2" style={{ borderColor: 'var(--sg-border)' }}>
            <TrendingUp className="h-4 w-4" style={{ color: 'var(--sg-indigo)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--sg-text)' }}>Investment Preferences</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Investment Objective</label>
              <select value={investmentProfile.objective} onChange={(e) => setInvestmentProfile((p) => ({ ...p, objective: e.target.value }))} className="sg-input mt-2">
                <option value="">Select...</option>
                <option value="growth">Growth</option>
                <option value="income">Income</option>
                <option value="capital-preservation">Capital Preservation</option>
                <option value="speculation">Speculation</option>
              </select>
            </div>
            <div>
              <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Risk Tolerance</label>
              <select value={investmentProfile.riskTolerance} onChange={(e) => setInvestmentProfile((p) => ({ ...p, riskTolerance: e.target.value }))} className="sg-input mt-2">
                <option value="">Select...</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Investing Experience</label>
              <select value={investmentProfile.experienceLevel} onChange={(e) => setInvestmentProfile((p) => ({ ...p, experienceLevel: e.target.value }))} className="sg-input mt-2">
                <option value="">Select...</option>
                <option value="none">None</option>
                <option value="limited">Limited</option>
                <option value="moderate">Moderate</option>
                <option value="extensive">Extensive</option>
              </select>
            </div>
            <div>
              <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Source of Funds</label>
              <select value={investmentProfile.sourceOfFunds ?? ''} onChange={(e) => setInvestmentProfile((p) => ({ ...p, sourceOfFunds: e.target.value }))} className="sg-input mt-2">
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
          <button type="submit" disabled={savingInvestment} className="sg-btn-primary">
            {savingInvestment ? 'Saving...' : 'Save Employment & Investment Profile'}
          </button>
        </SectionCard>
      </form>
          )}

          {activeSection === 'account-manager' && (
            <>
      {profile?.accountManager?.name && (
        <SectionCard icon={UserCog} title="Your Account Manager">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p style={{ color: 'var(--sg-muted-2)' }}>Name</p>
              <p style={{ color: 'var(--sg-text)' }}>{profile.accountManager.name}</p>
            </div>
            <div>
              <p style={{ color: 'var(--sg-muted-2)' }}>Email</p>
              <p style={{ color: 'var(--sg-text)' }}>{profile.accountManager.email}</p>
            </div>
            <div>
              <p style={{ color: 'var(--sg-muted-2)' }}>Phone</p>
              <p style={{ color: 'var(--sg-text)' }}>{profile.accountManager.phone || '—'}</p>
            </div>
          </div>
        </SectionCard>
      )}
              {!profile?.accountManager?.name && (
                <SectionCard icon={UserCog} title="Account manager">
                  <p className="text-sm" style={{ color: 'var(--sg-muted)' }}>
                    No account manager is assigned to you yet. Support can put you in touch in the
                    meantime.
                  </p>
                </SectionCard>
              )}
            </>
          )}

          {activeSection === 'refer-a-friend' && (
            <>
              <SectionCard
                icon={Gift}
                title="Refer a friend"
                description="Share your link. Anyone who opens an account through it is recorded against your name."
              >
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    readOnly
                    value={referralCode ? buildReferralLink(referralCode) : 'Generating your link…'}
                    onFocus={(e) => e.currentTarget.select()}
                    className="sg-input flex-1 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={copyReferralLink}
                    disabled={!referralCode}
                    className="sg-btn-primary shrink-0 flex items-center justify-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? 'Copied' : 'Copy link'}
                  </button>
                </div>
                <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>
                  Referrals are recorded for your account manager to review. SafeGuard does not pay
                  an automatic reward — any arrangement is agreed with them directly.
                </p>
              </SectionCard>

              <SectionCard icon={Gift} title="People you have referred">
                {referrals.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--sg-muted)' }}>
                    Nobody has joined through your link yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {referrals.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between gap-3 text-sm py-2"
                        style={{ borderBottom: '1px solid var(--sg-border)' }}
                      >
                        <span style={{ color: 'var(--sg-text)' }}>
                          {r.referredEmail || 'Account opened'}
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>
                            {r.createdAt ? r.createdAt.toLocaleDateString() : ''}
                          </span>
                          <span
                            className="text-[10px] uppercase font-semibold px-2 py-0.5"
                            style={{
                              letterSpacing: '0.08em',
                              borderRadius: 4,
                              color: r.status === 'funded' ? 'var(--sg-teal)' : 'var(--sg-muted-2)',
                              border: `1px solid ${r.status === 'funded' ? 'var(--sg-teal)' : 'var(--sg-border-strong)'}`,
                            }}
                          >
                            {r.status === 'signed_up' ? 'signed up' : r.status}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </>
          )}

          {activeSection === 'credentials' && (
            <>
      <form onSubmit={changeEmail}>
        <SectionCard icon={Mail} title="Change Email" description="We'll send a verification link to the new address before it takes effect.">
          <div>
            <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>New Email Address</label>
            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="sg-input mt-2" />
          </div>
          <div>
            <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Current Password</label>
            <input type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} className="sg-input mt-2" />
          </div>
          <button type="submit" disabled={changingEmail} className="sg-btn-primary">
            {changingEmail ? 'Sending...' : 'Send Verification Link'}
          </button>
        </SectionCard>
      </form>
      <form onSubmit={changePassword}>
        <SectionCard icon={Lock} title="Change Password">
          <div>
            <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Current Password</label>
            <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="sg-input mt-2" />
          </div>
          <div>
            <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>New Password</label>
            <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="sg-input mt-2" />
          </div>
          <button type="submit" disabled={changingPassword} className="sg-btn-primary">
            {changingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </SectionCard>
      </form>
            </>
          )}

          {activeSection === 'two-factor' && (
            <NotYetAvailable
              title="Two-factor authentication"
              note="Two-factor authentication is not available on your account yet — your sign-in is currently protected by your password alone. Use a long, unique password until it ships."
            />
          )}

          {activeSection === 'login-activity' && (
            <NotYetAvailable
              title="Login activity"
              note="Sign-in history is not being recorded yet, so there is nothing to show here. Your most recent sign-in is shown under Personal details."
            />
          )}

          {activeSection === 'close-account' && (
      <SectionCard icon={ShieldAlert} title="Danger Zone" danger>
        {closureRequested ? (
          <p className="text-sm" style={{ color: 'var(--sg-muted)' }}>
            Your closure request has been submitted and is under review by SafeGuard staff.
          </p>
        ) : (
          <form onSubmit={requestClosure} className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--sg-muted)' }}>
              Request your account be closed. This submits a request for staff review — it does not close your
              account immediately.
            </p>
            <textarea
              value={closureReason}
              onChange={(e) => setClosureReason(e.target.value)}
              placeholder="Reason (optional)"
              className="sg-input"
              rows={2}
            />
            <button type="submit" disabled={requestingClosure} className="sg-danger-btn flex items-center gap-2">
              <AlertOctagon className="h-4 w-4" />
              {requestingClosure ? 'Submitting...' : 'Request Account Closure'}
            </button>
          </form>
        )}
      </SectionCard>
          )}

          {activeSection === 'identity' && (
            <>
      <SectionCard icon={ShieldCheck} title="Identity Verification" description="Your KYC status with SafeGuard compliance.">
        {kycLoading ? (
          <p className="text-sm" style={{ color: 'var(--sg-muted-2)' }}>Loading...</p>
        ) : kyc ? (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize"
                style={{ background: `${kycStatusColor[kyc.status]}22`, color: kycStatusColor[kyc.status] }}
              >
                {kyc.status}
              </span>
              <span className="text-sm" style={{ color: 'var(--sg-muted)' }}>
                {kyc.idType ? `${kyc.idType} on file` : 'Submitted for review'}
              </span>
            </div>
            {kyc.status === 'rejected' && (
              <Link to="/workspace/kyc" className="sg-btn-primary text-sm">Resubmit Documents</Link>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm" style={{ color: 'var(--sg-muted)' }}>No verification on file yet.</p>
            <Link to="/workspace/kyc" className="sg-btn-primary text-sm">Start Verification</Link>
          </div>
        )}
        {kyc?.reviewNote && kyc.status === 'rejected' && (
          <p className="text-sm" style={{ color: 'var(--sg-danger)' }}>{kyc.reviewNote}</p>
        )}
      </SectionCard>
            </>
          )}
      </div>
    </div>
  );
}

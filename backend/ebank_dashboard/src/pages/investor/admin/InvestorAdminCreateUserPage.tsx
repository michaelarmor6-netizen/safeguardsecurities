import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { createInvestorAccount } from '../../../services/investor/investorAccountService';
import { logAction } from '../../../services/investor/auditService';
import InvestorOnboardingWizard, { type OnboardingSubmitPayload } from '../onboarding/InvestorOnboardingWizard';

export default function InvestorAdminCreateUserPage() {
  const { user, profile } = useInvestorAuth();

  const handleSubmit = async (payload: OnboardingSubmitPayload) => {
    const { core, address, employment, investmentProfile, compliance, accountManager } = payload;

    const { uid, temporaryPassword } = await createInvestorAccount({
      email: core.email.trim().toLowerCase(),
      firstName: core.firstName,
      middleName: core.middleName,
      lastName: core.lastName,
      dateOfBirth: core.dateOfBirth,
      gender: core.gender,
      phone: core.phone,
      address,
      citizenship: core.citizenship,
      residencyCountry: core.residencyCountry,
      idType: core.idType,
      idNumber: core.idNumber,
      employment,
      investmentProfile,
      compliance,
      accountManager,
    });

    if (user) {
      logAction(user.uid, profile?.email ?? '', 'Investor account created', core.email);
    }

    return { firstName: core.firstName, lastName: core.lastName, email: core.email, temporaryPassword, uid };
  };

  const adminName = profile?.displayName || profile?.firstName || profile?.email?.split('@')[0] || 'SafeGuard Team';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="sg-page-title">Create User Account</h1>
        <p className="sg-page-sub mt-1">
          Walk a new client through the 7-step onboarding on their behalf. The account is created and activated immediately.
        </p>
      </div>
      <InvestorOnboardingWizard
        mode="admin"
        adminName={adminName}
        adminEmail={profile?.email}
        onSubmit={handleSubmit}
        onCreateAnother={() => {}}
      />
    </div>
  );
}

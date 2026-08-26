import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useInvestorAuth } from '../../contexts/InvestorAuthContext';
import { skipOnboarding, submitClientOnboarding } from '../../services/investor/profileService';
import { submitKyc, uploadKycDocument } from '../../services/investor/kycService';
import InvestorOnboardingWizard, { type OnboardingSubmitPayload } from './onboarding/InvestorOnboardingWizard';
import ThemeToggle from '../../components/ui/ThemeToggle';

export default function InvestorOnboardingPage() {
  const { user, profile, loading, isAdmin, accountStatus, onboardingCompleted, refreshProfile } = useInvestorAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="sg-shell flex items-center justify-center" style={{ color: 'var(--sg-muted)' }}>Loading...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (onboardingCompleted) {
    return <Navigate to={accountStatus === 'active' ? '/workspace/dashboard' : '/activation'} replace />;
  }

  const handleSubmit = async (payload: OnboardingSubmitPayload) => {
    const { core, address, employment, investmentProfile, compliance, idFile } = payload;

    let idDocumentUrl: string | undefined;
    if (idFile) {
      idDocumentUrl = await uploadKycDocument(user.uid, idFile);
    }

    await submitKyc({
      userId: user.uid,
      userEmail: core.email,
      fullName: `${core.firstName} ${core.lastName}`.trim(),
      dateOfBirth: core.dateOfBirth,
      address: [address.line1, address.city, address.state, address.country].filter(Boolean).join(', '),
      phone: core.phone,
      idType: core.idType,
      idNumber: core.idNumber,
      idDocumentUrl,
    });

    await submitClientOnboarding(user.uid, {
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
      employment,
      investmentProfile,
      compliance,
    });

    await refreshProfile();

    return { firstName: core.firstName, lastName: core.lastName, email: core.email };
  };

  const handleSkip = async () => {
    try {
      await skipOnboarding(user.uid);
      await refreshProfile();
      toast('You can finish your profile anytime from the workspace.');
      navigate('/activation');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not skip right now');
    }
  };

  return (
    <div className="sg-shell sg-shell-grid py-10 px-4">
      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
              Complete Your Profile
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--sg-muted)' }}>
              Signed in as {profile?.email}. A few details before we activate your workspace.
            </p>
          </div>
          <ThemeToggle />
        </div>
        <InvestorOnboardingWizard
          mode="self"
          initialEmail={profile?.email ?? user.email ?? ''}
          onSubmit={handleSubmit}
          onSkip={handleSkip}
        />
      </div>
    </div>
  );
}

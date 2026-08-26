import { Link, Navigate } from 'react-router-dom';
import { useInvestorAuth } from '../../contexts/InvestorAuthContext';
import ThemeToggle from '../../components/ui/ThemeToggle';

export default function InvestorActivationPage() {
  const { user, profile, accountStatus, isAdmin, onboardingCompleted, canBrowseWorkspace, signOut } = useInvestorAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (accountStatus === 'active') return <Navigate to="/workspace/dashboard" replace />;
  if (!canBrowseWorkspace) return <Navigate to="/onboarding" replace />;

  const restricted = accountStatus === 'suspended' || accountStatus === 'locked';

  return (
    <div className="sg-shell sg-shell-grid py-10 px-4">
      <div className="relative z-10 max-w-3xl mx-auto">
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>
        <div
          className="sg-card p-8"
          style={{
            borderColor: restricted ? 'rgba(244,114,182,.35)' : 'rgba(251,191,36,.35)',
          }}
        >
          <div className="sg-badge mb-5">
            {restricted ? 'Access Restricted' : 'Activation Pending'}
          </div>
          <h1
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}
          >
            {restricted ? 'Workspace Access Restricted' : 'Workspace Activation in Progress'}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--sg-muted)' }}>
            {restricted
              ? 'Your account is restricted. Contact support for assistance.'
              : 'Your account is under review. You can preview the workspace while activation completes.'}
          </p>
          <p className="mt-4 text-sm" style={{ color: 'var(--sg-muted-2)' }}>
            Signed in as {profile?.email}
          </p>
          {!restricted && !onboardingCompleted && (
            <p className="mt-3 text-sm rounded-lg px-3 py-2" style={{ background: 'rgba(99,102,241,.1)', color: 'var(--sg-muted)' }}>
              You skipped the full profile setup — {' '}
              <Link to="/onboarding" style={{ color: 'var(--sg-indigo)' }}>complete it</Link>
              {' '} when you're ready to fund your account.
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            {!restricted && (
              <Link to="/workspace/dashboard" className="sg-btn-primary">
                Preview Workspace
              </Link>
            )}
            <button type="button" onClick={() => signOut()} className="sg-btn-ghost">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

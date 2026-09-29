import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Check, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInvestorAuth } from '../../contexts/InvestorAuthContext';
import { getFirebaseAuthErrorMessage } from '../../lib/firebaseAuthErrors';
import { isSuperAdminEmail } from '../../lib/investorRoles';
import ThemeToggle from '../../components/ui/ThemeToggle';
import { auth } from '../../config/firebase';
import { recordReferral } from '../../services/investor/referralService';
import { isPlausibleReferralCode } from '../../lib/referralCodes';
import { isClerkAuthEnabled } from '../../lib/clerk';
import { ClerkSignupForm } from '../../components/auth/ClerkSignupForm';

const bullets = [
  'Quick signup with your email and a password',
  'Encrypted connection - your password is never stored in plain text',
  'Complete identity verification (KYC) securely inside your workspace after signing in',
];

// Standalone signup route (separate from /login) so onboarding emails can
// deep-link straight to account creation instead of the login form.
export default function InvestorSignupPage() {
  const { signUp, loading, user, isAdmin, accountStatus, canBrowseWorkspace } = useInvestorAuth();
  const [searchParams] = useSearchParams();
  // ?ref=<code> on the signup link. Validated for shape here; whether it
  // maps to a real account is resolved after the account exists.
  const referralCode = (searchParams.get('ref') ?? '').trim().toLowerCase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="sg-shell flex items-center justify-center text-sg-muted">
        Loading...
      </div>
    );
  }

  if (user && isAdmin) {
    return <Navigate to="/admin-login" replace />;
  }

  if (user) {
    if (accountStatus === 'active') return <Navigate to="/workspace/dashboard" replace />;
    if (!canBrowseWorkspace) return <Navigate to="/onboarding" replace />;
    return <Navigate to="/activation" replace />;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSuperAdminEmail(email)) {
      toast.error('Admin accounts cannot sign up here.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      // Account creation is Firebase Auth plus a direct Firestore profile write.
      // A taken email comes back as auth/email-already-in-use. Do not call
      // checkEmailAvailable here: that callable runs on Cloud Run, which stays
      // down whenever the Google billing account is closed.
      await signUp(email, password);

      // Attribute the referral once the account exists, so we can prove who is
      // claiming it. Never allowed to fail the signup.
      if (referralCode && isPlausibleReferralCode(referralCode) && auth.currentUser) {
        await recordReferral({
          code: referralCode,
          referredUserId: auth.currentUser.uid,
          referredEmail: auth.currentUser.email ?? undefined,
        });
      }

      toast.success('Account created — pending review');
    } catch (err) {
      toast.error(getFirebaseAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sg-shell sg-shell-grid">
      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        {/* Left panel */}
        <div
          className="hidden lg:flex flex-col justify-between p-10 xl:p-14 border-r"
          style={{ borderColor: 'var(--sg-border)', background: 'var(--sg-bg-panel)' }}
        >
          <div>
            <div className="mb-10 flex items-start justify-between gap-4">
              <div>
                <img src="/logo.png" alt="SafeGuard Securities" className="h-14 w-auto max-w-[320px] object-contain" />
                <p
                  className="text-[11px] uppercase mt-4"
                  style={{ letterSpacing: '0.22em', color: 'var(--sg-muted-2)', fontFamily: 'var(--sg-font-body)' }}
                >
                  Investor Workspace
                </p>
              </div>
              <ThemeToggle />
            </div>

            <h1
              className="text-4xl xl:text-5xl font-bold leading-tight max-w-xl"
              style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}
            >
              Open your account in <em className="sg-title-accent">minutes</em>.
            </h1>
            <p className="mt-5 leading-relaxed max-w-xl" style={{ color: 'var(--sg-muted)', fontFamily: 'var(--sg-font-body)' }}>
              Create your login now. Identity verification and full workspace access follow securely after you sign in.
            </p>

            <ul className="mt-8 space-y-3.5">
              {bullets.map((text) => (
                <li key={text} className="flex gap-3 text-sm leading-relaxed" style={{ color: 'var(--sg-muted)' }}>
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{ background: 'var(--sg-btn-grad)' }}
                  >
                    <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="rounded-[18px] border p-4 flex items-start gap-3"
            style={{ background: 'rgba(16,185,129,.1)', borderColor: 'rgba(16,185,129,.25)' }}
          >
            <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" style={{ color: 'var(--sg-teal)' }} />
            <p className="text-sm" style={{ color: 'var(--sg-muted)' }}>
              Every new client account is reviewed before full workspace access is enabled.
            </p>
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex items-center justify-center p-6 sm:p-10 relative">
          <div className="absolute top-6 right-6 lg:hidden">
            <ThemeToggle />
          </div>
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-8">
              <img src="/logo.png" alt="SafeGuard Securities" className="h-12 w-auto max-w-[280px] object-contain" />
              <p className="text-[11px] uppercase tracking-wider mt-3" style={{ color: 'var(--sg-muted-2)' }}>
                Investor Workspace
              </p>
            </div>

            <h2 className="text-3xl font-bold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
              Create Your Account
            </h2>
            <p className="text-sm mt-2" style={{ color: 'var(--sg-muted)' }}>
              Just your email and a password to get started.
            </p>

            {isClerkAuthEnabled() ? <ClerkSignupForm /> : (
            <form onSubmit={submit} className="mt-8 space-y-5">
              <div>
                <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>
                  Email Address
                </label>
                <div className="relative mt-2">
                  <Mail className="sg-input-icon absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--sg-muted-2)' }} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="sg-input sg-input-icon-left"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>
                  Password
                </label>
                <div className="relative mt-2">
                  <Lock className="sg-input-icon absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--sg-muted-2)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="sg-input sg-input-icon-left sg-input-icon-right"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-[1]"
                    style={{ color: 'var(--sg-muted-2)' }}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>
                  Confirm Password
                </label>
                <div className="relative mt-2">
                  <Lock className="sg-input-icon absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--sg-muted-2)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="sg-input sg-input-icon-left"
                  />
                </div>
              </div>

              <button type="submit" disabled={busy} className="sg-btn-primary w-full">
                {busy ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
            )}

            <p className="text-sm mt-5 text-center" style={{ color: 'var(--sg-muted-2)' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--sg-indigo)' }}>
                Sign in here
              </Link>
            </p>

            <p className="text-xs mt-4 text-center">
              <a
                href="https://safeguardsecurities.us"
                className="underline hover:no-underline"
                style={{ color: 'var(--sg-muted-2)' }}
              >
                ← Back to homepage
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  BarChart3,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useInvestorAuth } from '../../contexts/InvestorAuthContext';
import { getFirebaseAuthErrorMessage } from '../../lib/firebaseAuthErrors';
import { isInvestorAdmin } from '../../lib/investorRoles';
import { ensureInvestorProfile } from '../../services/investor/profileService';
import { auth } from '../../config/firebase';
import ThemeToggle from '../../components/ui/ThemeToggle';
import { isClerkAuthEnabled } from '../../lib/clerk';
import { ClerkLoginForm } from '../../components/auth/ClerkLoginForm';

const features = [
  {
    icon: Sparkles,
    title: 'AI-guided decision support',
    body: 'Signals, portfolio insights, and market context in one client workspace.',
    accent: 'var(--sg-indigo)',
    tint: 'rgba(99,102,241,.12)',
    border: 'rgba(99,102,241,.22)',
  },
  {
    icon: BarChart3,
    title: 'Live market intelligence',
    body: 'Streaming market news, pricing, and portfolio visibility from a single dashboard.',
    accent: 'var(--sg-teal)',
    tint: 'rgba(16,185,129,.12)',
    border: 'rgba(16,185,129,.22)',
  },
  {
    icon: Shield,
    title: 'Controlled client activation',
    body: 'Every new client account is reviewed before full workspace access is enabled.',
    accent: 'var(--sg-gold)',
    tint: 'rgba(251,191,36,.12)',
    border: 'rgba(251,191,36,.22)',
  },
];

export default function InvestorLoginPage() {
  const { signIn, signOut, resetPassword, loading, user, isAdmin, accountStatus, canBrowseWorkspace } = useInvestorAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [legacyPassword, setLegacyPassword] = useState(false);

  if (loading) {
    return (
      <div className="sg-shell flex items-center justify-center text-sg-muted">
        Loading...
      </div>
    );
  }

  // Admins must use the dedicated admin portal login.
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
    setBusy(true);
    try {
      await signIn(email, password);
      const firebaseUser = auth.currentUser;
      if (firebaseUser) {
        const profile = await ensureInvestorProfile(firebaseUser.uid, firebaseUser.email ?? email);
        if (isInvestorAdmin(profile.role)) {
          await signOut();
          toast.error('Staff must sign in at the admin login.');
          return;
        }
      }
      toast.success('Signed in');
    } catch (err) {
      toast.error(getFirebaseAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error('Enter your email first');
      return;
    }
    try {
      await resetPassword(email.trim());
      toast.success('Password reset email sent');
    } catch (err) {
      toast.error(getFirebaseAuthErrorMessage(err));
    }
  };

  return (
    <div className="sg-shell sg-shell-grid">
      <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
        {/* Left marketing panel */}
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
              Built to help serious clients act with more{' '}
              <em className="sg-title-accent">clarity</em>.
            </h1>
            <p className="mt-5 leading-relaxed max-w-xl" style={{ color: 'var(--sg-muted)', fontFamily: 'var(--sg-font-body)' }}>
              SafeGuard combines portfolio visibility, market intelligence, and AI-assisted workflow in one controlled client environment.
            </p>

            <div className="mt-8 space-y-3">
              {features.map(({ icon: Icon, title, body, accent, tint, border }) => (
                <div
                  key={title}
                  className="rounded-[18px] border p-4"
                  style={{ background: tint, borderColor: border }}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 mt-0.5 shrink-0" style={{ color: accent }} />
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--sg-text)', fontFamily: 'var(--sg-font-display)' }}>
                        {title}
                      </p>
                      <p className="text-sm mt-1" style={{ color: 'var(--sg-muted)' }}>
                        {body}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-8">
            {[
              { label: 'Client onboarding', value: 'Review-gated', color: 'var(--sg-indigo)' },
              { label: 'Workspace state', value: 'Status-aware access', color: 'var(--sg-teal)' },
            ].map((item) => (
              <div key={item.label} className="sg-card p-4" style={{ borderRadius: 14 }}>
                <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>
                  {item.label}
                </p>
                <p className="text-sm font-semibold mt-1" style={{ color: item.color, fontFamily: 'var(--sg-font-display)' }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right login panel */}
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
              Welcome Back
            </h2>
            <p className="text-sm mt-2" style={{ color: 'var(--sg-muted)' }}>
              Sign in to review your dashboard, portfolio, and workspace status.
            </p>

            {isClerkAuthEnabled() && !legacyPassword ? (
              <ClerkLoginForm onUseExistingPassword={() => setLegacyPassword(true)} />
            ) : (
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
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

              <div className="flex items-center justify-between gap-3 text-sm">
                <label className="flex items-center gap-2" style={{ color: 'var(--sg-muted)' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded"
                    style={{ accentColor: 'var(--sg-indigo-deep)' }}
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  style={{ color: 'var(--sg-indigo)' }}
                >
                  Forgot password?
                </button>
              </div>

              <button type="submit" disabled={busy} className="sg-btn-primary w-full">
                {busy ? 'Please wait...' : 'Sign In'}
              </button>
            </form>
            )}
            {isClerkAuthEnabled() && legacyPassword && (
              <button
                type="button"
                className="text-sm mt-4 w-full"
                style={{ color: 'var(--sg-indigo)' }}
                onClick={() => setLegacyPassword(false)}
              >
                Use Clerk sign-in
              </button>
            )}

            <p className="text-sm mt-5 text-center" style={{ color: 'var(--sg-muted-2)' }}>
              Don&apos;t have an account?{' '}
              <Link to="/signup" style={{ color: 'var(--sg-indigo)' }}>
                Sign up here
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

            <div className="mt-8 sg-card p-5">
              <h4 className="font-semibold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
                Having trouble signing in?
              </h4>
              <ul className="mt-3 space-y-1 text-sm list-disc pl-5" style={{ color: 'var(--sg-muted)' }}>
                <li>Make sure your email and password are correct</li>
                <li>Check if you&apos;ve confirmed your email address</li>
                <li>Use &quot;Forgot password?&quot; if you can&apos;t remember your password</li>
                <li>Create a new account if you haven&apos;t signed up yet</li>
              </ul>
            </div>

            <div
              className="mt-4 rounded-[18px] border p-5"
              style={{ borderColor: 'rgba(99,102,241,.22)', background: 'rgba(99,102,241,.08)' }}
            >
              <h4 className="font-semibold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-indigo)' }}>
                New client activation
              </h4>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--sg-muted)' }}>
                Newly registered client accounts can sign in and view the dashboard immediately, but full workspace access is enabled only after account review.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

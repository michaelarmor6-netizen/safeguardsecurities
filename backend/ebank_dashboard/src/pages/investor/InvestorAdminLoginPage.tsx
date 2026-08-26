import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInvestorAuth } from '../../contexts/InvestorAuthContext';
import { getFirebaseAuthErrorMessage } from '../../lib/firebaseAuthErrors';
import { isInvestorAdmin } from '../../lib/investorRoles';
import { ensureInvestorProfile } from '../../services/investor/profileService';
import { auth } from '../../config/firebase';
import ThemeToggle from '../../components/ui/ThemeToggle';

export default function InvestorAdminLoginPage() {
  const { signIn, signOut, resetPassword, loading, user, isAdmin } = useInvestorAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="sg-shell flex items-center justify-center" style={{ color: 'var(--sg-muted)' }}>
        Loading...
      </div>
    );
  }

  if (user && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (user && !isAdmin) {
    // Client session on the admin page — send them to client flow
    return <Navigate to="/login" replace />;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signIn(email, password);
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error('Sign-in failed');
      }
      const profile = await ensureInvestorProfile(
        firebaseUser.uid,
        firebaseUser.email ?? email,
      );
      if (!isInvestorAdmin(profile.role)) {
        await signOut();
        toast.error('This portal is for administrators only. Use the client login instead.');
        return;
      }
      toast.success('Signed in to admin portal');
    } catch (err) {
      toast.error(getFirebaseAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error('Enter your admin email first');
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
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img
              src="/logo.png"
              alt="SafeGuard Securities"
              className="h-12 w-auto max-w-[280px] object-contain mx-auto"
            />
            <div className="sg-badge mx-auto mt-5 w-fit">
              <Shield className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5" />
              Super Admin
            </div>
            <h1
              className="text-3xl font-bold mt-4"
              style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}
            >
              Admin Portal
            </h1>
            <p className="text-sm mt-2" style={{ color: 'var(--sg-muted)' }}>
              Sign in with your staff credentials to manage applicants, wallets, and platform settings.
            </p>
          </div>

          <div className="sg-card p-8">
            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>
                  Admin Email
                </label>
                <div className="relative mt-2">
                  <Mail
                    className="sg-input-icon absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4"
                    style={{ color: 'var(--sg-muted-2)' }}
                  />
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@safeguardsecurities.us"
                    className="sg-input sg-input-icon-left"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>
                  Password
                </label>
                <div className="relative mt-2">
                  <Lock
                    className="sg-input-icon absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4"
                    style={{ color: 'var(--sg-muted-2)' }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
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

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm font-medium"
                  style={{ color: 'var(--sg-indigo)' }}
                >
                  Forgot password?
                </button>
              </div>

              <button type="submit" disabled={busy} className="sg-btn-primary w-full disabled:opacity-50">
                {busy ? 'Signing in...' : 'Access Admin Portal'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--sg-muted-2)' }}>
            Client investor?{' '}
            <Link to="/login" className="font-medium" style={{ color: 'var(--sg-indigo)' }}>
              Go to client login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

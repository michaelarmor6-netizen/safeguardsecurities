import { useState } from 'react';
import { useAuth, useSignIn } from '@clerk/react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { isInvestorAdmin } from '../../lib/investorRoles';
import { connectClerkSession, messageFromClerkError } from '../../services/investor/clerkFirebaseSession';
import { useInvestorAuth } from '../../contexts/InvestorAuthContext';

type Step = 'password' | 'code' | 'reset-code' | 'reset-password';

export function ClerkLoginForm({ onUseExistingPassword }: { onUseExistingPassword: () => void }) {
  const { signIn } = useSignIn();
  const { getToken } = useAuth();
  const { signOut } = useInvestorAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<Step>('password');
  const [busy, setBusy] = useState(false);

  const openWorkspace = async () => {
    const finalized = await signIn.finalize();
    if (finalized.error) throw new Error(messageFromClerkError(finalized.error));
    const profile = await connectClerkSession(() => getToken());
    if (isInvestorAdmin(profile.role)) {
      await signOut();
      toast.error('Staff must sign in at the admin login.');
      return;
    }
    toast.success('Signed in');
  };

  const continueAfterPassword = async () => {
    if (signIn.status === 'complete') {
      await openWorkspace();
      return;
    }
    if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
      const sent = await signIn.mfa.sendEmailCode();
      if (sent.error) {
        toast.error(messageFromClerkError(sent.error));
        return;
      }
      setStep('code');
      toast.success('Enter the code sent to your email.');
      return;
    }
    toast.error('Sign-in needs another step this form does not handle yet.');
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await signIn.password({ emailAddress: email.trim(), password });
      if (error) {
        toast.error(messageFromClerkError(error));
        return;
      }
      await continueAfterPassword();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await signIn.mfa.verifyEmailCode({ code: code.trim() });
      if (error) {
        toast.error(messageFromClerkError(error));
        return;
      }
      if (signIn.status !== 'complete') {
        toast.error('That code was not accepted.');
        return;
      }
      await openWorkspace();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not verify the code.');
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    if (!email.trim()) {
      toast.error('Enter your email first');
      return;
    }
    setBusy(true);
    try {
      const created = await signIn.create({ identifier: email.trim() });
      if (created.error) {
        toast.error(messageFromClerkError(created.error));
        return;
      }
      const sent = await signIn.resetPasswordEmailCode.sendCode();
      if (sent.error) {
        toast.error(messageFromClerkError(sent.error));
        return;
      }
      setStep('reset-code');
      toast.success('Password reset code sent.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send a reset code.');
    } finally {
      setBusy(false);
    }
  };

  const submitResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (error) {
        toast.error(messageFromClerkError(error));
        return;
      }
      setPassword('');
      setStep('reset-password');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not verify the code.');
    } finally {
      setBusy(false);
    }
  };

  const submitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await signIn.resetPasswordEmailCode.submitPassword({ password });
      if (error) {
        toast.error(messageFromClerkError(error));
        return;
      }
      await openWorkspace();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reset the password.');
    } finally {
      setBusy(false);
    }
  };

  if (step === 'code' || step === 'reset-code') {
    return (
      <form onSubmit={step === 'code' ? submitCode : submitResetCode} className="mt-8 space-y-5">
        <p className="text-sm" style={{ color: 'var(--sg-muted)' }}>
          Enter the code sent to {email}.
        </p>
        <input
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Verification code"
          className="sg-input"
        />
        <button type="submit" disabled={busy} className="sg-btn-primary w-full">
          {busy ? 'Please wait...' : 'Continue'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={step === 'reset-password' ? submitNewPassword : submitPassword} className="mt-8 space-y-5">
      {step === 'password' && (
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
      )}
      <div>
        <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>
          {step === 'reset-password' ? 'New password' : 'Password'}
        </label>
        <div className="relative mt-2">
          <Lock className="sg-input-icon absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--sg-muted-2)' }} />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            minLength={step === 'reset-password' ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={step === 'reset-password' ? 'Choose a new password' : 'Enter your password'}
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
      {step === 'password' && (
        <div className="flex items-center justify-end text-sm">
          <button type="button" onClick={() => void sendReset()} style={{ color: 'var(--sg-indigo)' }}>
            Forgot password?
          </button>
        </div>
      )}
      <button type="submit" disabled={busy} className="sg-btn-primary w-full">
        {busy ? 'Please wait...' : step === 'reset-password' ? 'Save password and sign in' : 'Sign In'}
      </button>
      <button type="button" className="text-sm w-full" style={{ color: 'var(--sg-muted-2)' }} onClick={onUseExistingPassword}>
        Use an existing SafeGuard password
      </button>
    </form>
  );
}

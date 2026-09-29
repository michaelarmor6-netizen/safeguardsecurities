import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth, useSignUp } from '@clerk/react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '../../config/firebase';
import { isPlausibleReferralCode } from '../../lib/referralCodes';
import { isSuperAdminEmail } from '../../lib/investorRoles';
import { recordReferral } from '../../services/investor/referralService';
import { connectClerkSession, messageFromClerkError } from '../../services/investor/clerkFirebaseSession';

export function ClerkSignupForm() {
  const { signUp } = useSignUp();
  const { getToken } = useAuth();
  const [searchParams] = useSearchParams();
  const referralCode = (searchParams.get('ref') ?? '').trim().toLowerCase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'details' | 'verify'>('details');
  const [busy, setBusy] = useState(false);

  const openWorkspace = async () => {
    const finalized = await signUp.finalize();
    if (finalized.error) throw new Error(messageFromClerkError(finalized.error));
    await connectClerkSession(() => getToken());
    if (referralCode && isPlausibleReferralCode(referralCode) && auth.currentUser) {
      await recordReferral({
        code: referralCode,
        referredUserId: auth.currentUser.uid,
        referredEmail: auth.currentUser.email ?? undefined,
      });
    }
    toast.success('Account created — pending review');
  };

  const submitDetails = async (e: React.FormEvent) => {
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
      const { error } = await signUp.password({ emailAddress: email.trim(), password });
      if (error) {
        toast.error(messageFromClerkError(error));
        return;
      }
      if (signUp.isTransferable) {
        toast.error('This email already has an account. Sign in instead.');
        return;
      }
      if (signUp.status === 'complete') {
        await openWorkspace();
        return;
      }
      const sent = await signUp.verifications.sendEmailCode();
      if (sent.error) {
        toast.error(messageFromClerkError(sent.error));
        return;
      }
      setStep('verify');
      toast.success('Check your email for a verification code.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the account.');
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (error) {
        toast.error(messageFromClerkError(error));
        return;
      }
      if (signUp.status !== 'complete') {
        toast.error('Verification is not finished yet.');
        return;
      }
      await openWorkspace();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not verify the code.');
    } finally {
      setBusy(false);
    }
  };

  if (step === 'verify') {
    return (
      <form onSubmit={submitCode} className="mt-8 space-y-5">
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
          {busy ? 'Verifying...' : 'Verify and create account'}
        </button>
        <button
          type="button"
          className="text-sm w-full"
          style={{ color: 'var(--sg-indigo)' }}
          onClick={() => {
            void signUp.verifications.sendEmailCode();
            toast.success('A new code is on the way.');
          }}
        >
          Send a new code
        </button>
        <div id="clerk-captcha" />
      </form>
    );
  }

  return (
    <form onSubmit={submitDetails} className="mt-8 space-y-5">
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
            minLength={8}
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
            minLength={8}
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
      <div id="clerk-captcha" />
    </form>
  );
}

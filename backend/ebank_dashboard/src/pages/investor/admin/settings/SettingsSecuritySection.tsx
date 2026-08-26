import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Lock, ShieldAlert } from 'lucide-react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useInvestorAuth } from '../../../../contexts/InvestorAuthContext';
import { getFirebaseAuthErrorMessage } from '../../../../lib/firebaseAuthErrors';
import { getPlatformSettings, updatePlatformSettings, DEFAULTS } from '../../../../services/investor/settingsService';
import { logAction } from '../../../../services/investor/auditService';

export default function SettingsSecuritySection() {
  const { user, profile } = useInvestorAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);

  useEffect(() => {
    getPlatformSettings()
      .then(setForm)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;
    if (newPassword.length < form.minPasswordLength) {
      toast.error(`New password must be at least ${form.minPasswordLength} characters`);
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

  const savePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPolicy(true);
    try {
      await updatePlatformSettings({
        sessionTimeoutMinutes: Number(form.sessionTimeoutMinutes) || DEFAULTS.sessionTimeoutMinutes,
        minPasswordLength: Number(form.minPasswordLength) || DEFAULTS.minPasswordLength,
      });
      if (user) logAction(user.uid, profile?.email ?? '', 'Security policy updated', `timeout ${form.sessionTimeoutMinutes}m, min pw ${form.minPasswordLength}`);
      toast.success('Saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingPolicy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sg-panel p-5 space-y-2">
        <p className="text-sm sg-text-muted">Signed in as</p>
        <p className="font-semibold sg-text-main">{profile?.email} · {profile?.role}</p>
      </div>

      <form onSubmit={changePassword} className="sg-panel p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4" style={{ color: 'var(--sg-indigo)' }} />
          <h3 className="font-semibold sg-text-main">Change Password</h3>
        </div>
        <div>
          <label className="text-sm sg-text-muted">Current Password</label>
          <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="sg-input mt-2" />
        </div>
        <div>
          <label className="text-sm sg-text-muted">New Password</label>
          <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="sg-input mt-2" />
        </div>
        <button type="submit" disabled={changingPassword} className="sg-btn-primary">
          {changingPassword ? 'Updating...' : 'Update Password'}
        </button>
      </form>

      {!loading && (
        <form onSubmit={savePolicy} className="sg-panel p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" style={{ color: 'var(--sg-indigo)' }} />
            <h3 className="font-semibold sg-text-main">Session &amp; Password Policy</h3>
          </div>
          <p className="text-sm sg-text-muted">
            Session timeout is enforced client-side (auto sign-out after inactivity). Minimum password length applies
            to new passwords set through this console; Firebase Authentication enforces its own baseline underneath.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Session Timeout (minutes)</label>
              <input
                type="number"
                min="5"
                className="sg-input mt-1.5"
                value={form.sessionTimeoutMinutes}
                onChange={(e) => setForm((f) => ({ ...f, sessionTimeoutMinutes: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Minimum Password Length</label>
              <input
                type="number"
                min="6"
                className="sg-input mt-1.5"
                value={form.minPasswordLength}
                onChange={(e) => setForm((f) => ({ ...f, minPasswordLength: Number(e.target.value) }))}
              />
            </div>
          </div>
          <button type="submit" disabled={savingPolicy} className="sg-btn-primary">{savingPolicy ? 'Saving...' : 'Save'}</button>
        </form>
      )}
    </div>
  );
}

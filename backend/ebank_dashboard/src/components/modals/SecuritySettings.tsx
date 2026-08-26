import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Key, 
  Smartphone, 
  Eye, 
  EyeOff, 
  Copy, 
  Download,
  AlertTriangle,
  CheckCircle,
  Lock,
  Unlock,
  QrCode,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import PasswordSecurityService, { PasswordStrength } from '../../services/PasswordSecurityService';
import toast from 'react-hot-toast';

interface SecuritySettingsProps {
  onClose?: () => void;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('password');
  const [loading, setLoading] = useState(false);
  
  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorCode: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
  
  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  } | null>(null);
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  
  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    loginNotifications: true,
    transactionAlerts: true,
    deviceTracking: true,
    sessionTimeout: 30,
    passwordExpiry: 90
  });

  // Load user security settings
  useEffect(() => {
    if (user?.uid) {
      loadSecuritySettings();
    }
  }, [user]);

  // Update password strength when new password changes
  useEffect(() => {
    if (passwordForm.newPassword) {
      const strength = PasswordSecurityService.validatePasswordStrength(passwordForm.newPassword);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(null);
    }
  }, [passwordForm.newPassword]);

  const loadSecuritySettings = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user!.uid));
      const userData = userDoc.data();
      
      if (userData?.security) {
        setTwoFactorEnabled(userData.security.twoFactorEnabled || false);
        setSecuritySettings({
          loginNotifications: userData.security.loginNotifications ?? true,
          transactionAlerts: userData.security.transactionAlerts ?? true,
          deviceTracking: userData.security.deviceTracking ?? true,
          sessionTimeout: userData.security.sessionTimeout || 30,
          passwordExpiry: userData.security.passwordExpiry || 90
        });
      }
    } catch (error) {
      console.error('Error loading security settings:', error);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!passwordForm.currentPassword.trim()) {
      toast.error('Please enter your current password');
      return;
    }
    
    if (!passwordForm.newPassword.trim()) {
      toast.error('Please enter a new password');
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (!passwordStrength || passwordStrength.score < 6) {
      toast.error('Password is too weak. Please choose a stronger password.');
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('SecuritySettings: Attempting password change...');
      
      const success = await PasswordSecurityService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
        twoFactorCode: twoFactorEnabled ? passwordForm.twoFactorCode : undefined
      });
      
      if (success) {
        console.log('SecuritySettings: Password change successful');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          twoFactorCode: ''
        });
        setPasswordStrength(null);
        toast.success('Password changed successfully! You will be redirected to login.');
        
        // Close modal and redirect to login since user will be signed out
        if (onClose) {
          onClose();
        }
        
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        console.log('SecuritySettings: Password change failed');
        toast.error('Failed to change password. Please check your current password and try again.');
      }
    } catch (error: any) {
      console.error('Password change error:', error);
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/wrong-password') {
        toast.error('Current password is incorrect');
      } else if (error.code === 'auth/invalid-credential') {
        toast.error('Invalid credentials. Please check your current password.');
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error('For security, please log out and log back in before changing your password.');
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    try {
      const setup = await PasswordSecurityService.setup2FA(user.uid);
      setTwoFactorSetup(setup);
      setShowSetup2FA(true);
    } catch (error) {
      console.error('2FA setup error:', error);
      toast.error('Failed to setup two-factor authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    if (!user?.uid || !verificationCode) return;
    
    setLoading(true);
    try {
      const success = await PasswordSecurityService.enable2FA(user.uid, verificationCode);
      if (success) {
        setTwoFactorEnabled(true);
        setShowSetup2FA(false);
        setVerificationCode('');
        setShowBackupCodes(true);
      }
    } catch (error) {
      console.error('2FA enable error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!user?.uid) return;
    
    const password = prompt('Enter your password to disable 2FA:');
    const code = prompt('Enter your current 2FA code:');
    
    if (!password || !code) return;
    
    setLoading(true);
    try {
      const success = await PasswordSecurityService.disable2FA(user.uid, password, code);
      if (success) {
        setTwoFactorEnabled(false);
      }
    } catch (error) {
      console.error('2FA disable error:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard`);
    });
  };

  const downloadBackupCodes = () => {
    if (!twoFactorSetup?.backupCodes) return;
    
    const content = `Digital Banking Platform - Backup Codes\n\nGenerated: ${new Date().toLocaleDateString()}\nAccount: ${user?.email}\n\nBackup Codes (use each code only once):\n${twoFactorSetup.backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}\n\nStore these codes in a safe place. Each code can only be used once.`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'banking-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getPasswordStrengthColor = (score: number): string => {
    if (score < 3) return 'bg-red-500';
    if (score < 5) return 'bg-yellow-500';
    if (score < 6) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthLabel = (score: number): string => {
    if (score < 3) return 'Weak';
    if (score < 5) return 'Fair';
    if (score < 6) return 'Good';
    return 'Strong';
  };

  const tabs = [
    { id: 'password', label: 'Password', icon: Key },
    { id: '2fa', label: 'Two-Factor Auth', icon: Smartphone },
    { id: 'settings', label: 'Security Settings', icon: Shield }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Security Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'password' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-800">Banking Security Standards</h4>
                      <ul className="text-sm text-amber-700 mt-2 space-y-1">
                        <li>• Minimum 12 characters with mixed case, numbers, and symbols</li>
                        <li>• Cannot reuse last 5 passwords</li>
                        <li>• Must change password every 90 days</li>
                        <li>• Avoid personal information and common patterns</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-6">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {passwordStrength && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Password Strength:</span>
                        <span className={`text-sm font-medium ${
                          passwordStrength.score < 3 ? 'text-red-600' :
                          passwordStrength.score < 5 ? 'text-yellow-600' :
                          passwordStrength.score < 6 ? 'text-blue-600' : 'text-green-600'
                        }`}>
                          {getPasswordStrengthLabel(passwordStrength.score)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength.score)}`}
                          style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                        />
                      </div>
                      {passwordStrength.feedback.length > 0 && (
                        <ul className="mt-2 text-sm text-gray-600">
                          {passwordStrength.feedback.map((feedback, index) => (
                            <li key={index} className="flex items-center space-x-2">
                              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                              <span>{feedback}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                    <p className="mt-2 text-sm text-red-600">Passwords do not match</p>
                  )}
                </div>

                {/* 2FA Code (if enabled) */}
                {twoFactorEnabled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Two-Factor Authentication Code *
                    </label>
                    <input
                      type="text"
                      value={passwordForm.twoFactorCode}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, twoFactorCode: e.target.value }))}
                      placeholder="Enter 6-digit code from your authenticator app"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      maxLength={6}
                      required
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !passwordForm.currentPassword || !passwordForm.newPassword || 
                           passwordForm.newPassword !== passwordForm.confirmPassword ||
                           (passwordStrength ? passwordStrength.score < 6 : true)}
                  className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Changing Password...' : 'Change Password'}
                </button>
              </form>
            </div>
          )}

          {activeTab === '2fa' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">Enhanced Security</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Two-factor authentication adds an extra layer of security to your account. 
                        Even if someone knows your password, they won't be able to access your account without your phone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {!twoFactorEnabled && !showSetup2FA && (
                <div className="text-center py-8">
                  <Smartphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Two-Factor Authentication is Disabled</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Enable two-factor authentication to add an extra layer of security to your banking account.
                  </p>
                  <button
                    onClick={handleSetup2FA}
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Setting up...' : 'Enable Two-Factor Authentication'}
                  </button>
                </div>
              )}

              {twoFactorEnabled && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <h4 className="text-lg font-medium text-green-900">Two-Factor Authentication Enabled</h4>
                        <p className="text-sm text-green-700">Your account is protected with 2FA</p>
                      </div>
                    </div>
                    <button
                      onClick={handleDisable2FA}
                      disabled={loading}
                      className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      Disable 2FA
                    </button>
                  </div>
                </div>
              )}

              {showSetup2FA && twoFactorSetup && (
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Step 1: Scan QR Code</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="bg-white p-4 border border-gray-200 rounded-lg inline-block">
                          <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded">
                            <QrCode className="w-12 h-12 text-gray-400" />
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          Scan this QR code with your authenticator app
                        </p>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900 mb-2">Manual Setup</h5>
                        <p className="text-sm text-gray-600 mb-3">
                          If you can't scan the QR code, enter this secret key manually:
                        </p>
                        <div className="bg-gray-50 p-3 rounded border font-mono text-sm break-all">
                          {twoFactorSetup.secret}
                        </div>
                        <button
                          onClick={() => copyToClipboard(twoFactorSetup.secret, 'Secret key')}
                          className="mt-2 flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <Copy className="w-4 h-4" />
                          <span>Copy Secret</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Step 2: Verify Setup</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Enter verification code from your authenticator app
                        </label>
                        <input
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          placeholder="123456"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          maxLength={6}
                        />
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={handleEnable2FA}
                          disabled={loading || verificationCode.length !== 6}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {loading ? 'Verifying...' : 'Enable 2FA'}
                        </button>
                        <button
                          onClick={() => setShowSetup2FA(false)}
                          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showBackupCodes && twoFactorSetup && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                  <div className="flex items-start space-x-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="text-lg font-medium text-amber-900">Save Your Backup Codes</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Store these backup codes in a safe place. Each code can only be used once if you lose access to your authenticator app.
                      </p>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded border">
                    <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                      {twoFactorSetup.backupCodes.map((code, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded">
                          {index + 1}. {code}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex space-x-3 mt-4">
                    <button
                      onClick={downloadBackupCodes}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Codes</span>
                    </button>
                    <button
                      onClick={() => setShowBackupCodes(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                    >
                      I've Saved Them
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Security Preferences</h3>

              <div className="space-y-4">
                {/* Login Notifications */}
                <div className="flex items-center justify-between py-4 border-b border-gray-200">
                  <div>
                    <h4 className="font-medium text-gray-900">Login Notifications</h4>
                    <p className="text-sm text-gray-500">Get notified when someone logs into your account</p>
                  </div>
                  <button
                    onClick={() => setSecuritySettings(prev => ({ ...prev, loginNotifications: !prev.loginNotifications }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                      securitySettings.loginNotifications ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      securitySettings.loginNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Transaction Alerts */}
                <div className="flex items-center justify-between py-4 border-b border-gray-200">
                  <div>
                    <h4 className="font-medium text-gray-900">Transaction Alerts</h4>
                    <p className="text-sm text-gray-500">Instant notifications for all transactions</p>
                  </div>
                  <button
                    onClick={() => setSecuritySettings(prev => ({ ...prev, transactionAlerts: !prev.transactionAlerts }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                      securitySettings.transactionAlerts ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      securitySettings.transactionAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Device Tracking */}
                <div className="flex items-center justify-between py-4 border-b border-gray-200">
                  <div>
                    <h4 className="font-medium text-gray-900">Device Tracking</h4>
                    <p className="text-sm text-gray-500">Monitor devices accessing your account</p>
                  </div>
                  <button
                    onClick={() => setSecuritySettings(prev => ({ ...prev, deviceTracking: !prev.deviceTracking }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                      securitySettings.deviceTracking ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      securitySettings.deviceTracking ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Session Timeout */}
                <div className="py-4 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Session Timeout</h4>
                  <p className="text-sm text-gray-500 mb-3">Automatically log out after inactivity</p>
                  <select
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: Number(e.target.value) }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>

                {/* Password Expiry */}
                <div className="py-4">
                  <h4 className="font-medium text-gray-900 mb-2">Password Expiry</h4>
                  <p className="text-sm text-gray-500 mb-3">Force password change interval</p>
                  <select
                    value={securitySettings.passwordExpiry}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, passwordExpiry: Number(e.target.value) }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                    <option value={180}>180 days</option>
                    <option value={365}>1 year</option>
                  </select>
                </div>
              </div>

              <button
                className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Save Security Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft, Shield, CheckCircle, AlertCircle, RefreshCw, Copy, Shuffle } from 'lucide-react';
import LogoDisplay from '../../components/ui/LogoDisplay';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemConfigContext } from '../../contexts/SystemConfigContext';
import PasswordSecurityService, { PasswordStrength } from '../../services/PasswordSecurityService';
import { PasswordGenerator } from '../../utils/passwordGenerator';
import toast from 'react-hot-toast';

const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { getCompanyName, getPrimaryLogo, loading: configLoading } = useSystemConfigContext();
  
  const isTemporary = location.state?.isTemporary || false;
  
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatedPasswords, setGeneratedPasswords] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/client-login');
    }
  }, [user, navigate]);

  // Update password strength when new password changes
  useEffect(() => {
    if (formData.newPassword) {
      const strength = PasswordSecurityService.validatePasswordStrength(formData.newPassword);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(null);
    }
  }, [formData.newPassword]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getStrengthColor = (score: number) => {
    if (score >= 6) return 'text-green-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStrengthText = (score: number) => {
    if (score >= 6) return 'Strong';
    if (score >= 4) return 'Medium';
    return 'Weak';
  };

  const generatePasswords = () => {
    setIsGenerating(true);
    try {
      const passwords = PasswordGenerator.generatePasswordSuggestions(3, {
        length: 16,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSpecialChars: true,
        excludeSimilar: true,
        minUppercase: 2,
        minLowercase: 2,
        minNumbers: 2,
        minSpecialChars: 2
      });
      setGeneratedPasswords(passwords);
      setShowGenerator(true);
      toast.success('Strong passwords generated!');
    } catch (error) {
      console.error('Password generation error:', error);
      toast.error('Failed to generate passwords. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Password copied to clipboard!');
    } catch (error) {
      console.error('Clipboard error:', error);
      toast.error('Failed to copy password');
    }
  };

  const useGeneratedPassword = (password: string) => {
    setFormData(prev => ({
      ...prev,
      newPassword: password,
      confirmPassword: password
    }));
    setShowGenerator(false);
    toast.success('Password applied! Please review and confirm.');
  };

  const generateMemorablePassword = () => {
    try {
      const password = PasswordGenerator.generateMemorablePassword({
        wordCount: 4,
        separator: '-',
        addNumbers: true
      });
      setFormData(prev => ({
        ...prev,
        newPassword: password,
        confirmPassword: password
      }));
      toast.success('Memorable password generated!');
    } catch (error) {
      console.error('Memorable password generation error:', error);
      toast.error('Failed to generate memorable password');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.newPassword || !formData.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!isTemporary && !formData.currentPassword) {
      toast.error('Please enter your current password');
      return;
    }

    setIsLoading(true);
    
    try {
      let success = false;
      
      if (isTemporary) {
        // Use temporary password change method (no current password required)
        success = await PasswordSecurityService.changeTemporaryPassword(
          formData.newPassword,
          formData.confirmPassword
        );
      } else {
        // Use regular password change method
        success = await PasswordSecurityService.changePassword({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword
        });
      }
      
      if (success) {
        toast.success('Password changed successfully! Please log in with your new password.');
        // Redirect to login page since user will be signed out after password change
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Password change error:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-gray-50">
      <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Enhanced Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-full max-w-xs">
              {!configLoading ? (
                <LogoDisplay 
                  logoUrl={getPrimaryLogo()} 
                  companyName=""
                  fallbackIcon={<Shield className="w-12 h-12 text-green-600" />}
                  className="w-full h-24 object-contain"
                />
              ) : (
                <div className="w-full h-24 flex items-center justify-center">
                  <img 
                    src="/sglogo.png"
                    alt="Logo"
                    className="w-full h-24 object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              {isTemporary ? 'Set New Password' : 'Change Password'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {isTemporary 
                ? 'Please create a secure password to access your account'
                : 'Update your account password for enhanced security'
              }
            </p>
          </div>

          {/* Warning for temporary password */}
          {isTemporary && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Password Change Required</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    You're using a temporary password. Please create a secure password to continue.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100">
            <form className="space-y-6" onSubmit={handleSubmit}>
              
              {/* Current Password - only show for regular password change */}
              {!isTemporary && (
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                    Current Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="currentPassword"
                      type={showPasswords.current ? 'text' : 'password'}
                      value={formData.currentPassword}
                      onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                      className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent focus:z-10 transition-colors"
                      placeholder="Enter your current password"
                      required={!isTemporary}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    >
                      {showPasswords.current ? (
                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* New Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={generateMemorablePassword}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                      title="Generate memorable password"
                    >
                      <Shuffle className="w-3 h-3" />
                      <span>Memorable</span>
                    </button>
                    <button
                      type="button"
                      onClick={generatePasswords}
                      disabled={isGenerating}
                      className="text-xs text-green-600 hover:text-green-800 flex items-center space-x-1"
                      title="Generate strong passwords"
                    >
                      {isGenerating ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      <span>Generate</span>
                    </button>
                  </div>
                </div>
                <div className="mt-1 relative">
                  <input
                    id="newPassword"
                    type={showPasswords.new ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange('newPassword', e.target.value)}
                    className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent focus:z-10 transition-colors"
                    placeholder="Create a secure password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                
                {/* Password Generator */}
                {showGenerator && (
                  <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-900">Generated Strong Passwords</h4>
                      <button
                        type="button"
                        onClick={generatePasswords}
                        disabled={isGenerating}
                        className="text-xs text-green-600 hover:text-green-800 flex items-center space-x-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                      </button>
                    </div>
                    <div className="space-y-2">
                      {generatedPasswords.map((password, index) => {
                        const assessment = PasswordGenerator.assessPasswordStrength(password);
                        return (
                          <div key={index} className="flex items-center space-x-2 p-2 bg-white rounded border">
                            <div className="flex-1">
                              <div className="font-mono text-sm text-gray-900 break-all">{password}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                {assessment.strength} • {Math.round(assessment.entropy)} bits entropy
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(password)}
                                className="p-1 text-gray-400 hover:text-gray-600"
                                title="Copy password"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => useGeneratedPassword(password)}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Use
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      <p>💡 These passwords are generated with banking-grade security requirements.</p>
                    </div>
                  </div>
                )}
                
                {/* Password Strength Indicator */}
                {passwordStrength && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Strength:</span>
                      <span className={`text-sm font-medium ${getStrengthColor(passwordStrength.score)}`}>
                        {getStrengthText(passwordStrength.score)}
                      </span>
                    </div>
                    
                    {/* Requirements checklist */}
                    <div className="space-y-1">
                      {Object.entries(passwordStrength.requirements).map(([req, met]) => (
                        <div key={req} className="flex items-center space-x-2">
                          {met ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <div className="w-4 h-4 border border-gray-300 rounded-full"></div>
                          )}
                          <span className={`text-xs ${met ? 'text-green-700' : 'text-gray-500'}`}>
                            {req === 'length' && '12+ characters'}
                            {req === 'uppercase' && 'Uppercase letter'}
                            {req === 'lowercase' && 'Lowercase letter'}
                            {req === 'numbers' && 'Number'}
                            {req === 'specialChars' && 'Special character'}
                            {req === 'notCommon' && 'Not a common password'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="confirmPassword"
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent focus:z-10 transition-colors"
                    placeholder="Confirm your new password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
                
                {/* Password match indicator */}
                {formData.confirmPassword && (
                  <div className="mt-1 flex items-center space-x-2">
                    {formData.newPassword === formData.confirmPassword ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-green-700">Passwords match</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-xs text-red-700">Passwords do not match</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading || (passwordStrength?.score ? passwordStrength.score < 6 : false)}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Changing Password...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Lock className="w-4 h-4" />
                      <span>{isTemporary ? 'Set Password' : 'Change Password'}</span>
                    </div>
                  )}
                </button>
              </div>
            </form>

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <Link 
                to="/client-login" 
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center space-x-1 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Login</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
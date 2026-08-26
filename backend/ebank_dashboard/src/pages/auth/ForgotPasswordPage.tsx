import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { ArrowLeft, Mail, Shield, CheckCircle } from 'lucide-react';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState('');
  const { resetPassword } = useAuth();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email address is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email);
      setIsEmailSent(true);
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      let errorMessage = 'Failed to send reset email. Please try again.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please wait a moment before trying again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) {
      setError('');
    }
  };

  if (isEmailSent) {
    return (
      <div className="min-h-screen bg-gradient-main flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center animate-fade-in">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              SecureBank
            </h1>
          </div>

          <Card className="glass-card animate-slide-up">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-green-800">Email Sent Successfully</CardTitle>
              <CardDescription>
                We've sent a password reset link to your email address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium">Check your email</p>
                    <p className="mt-1">
                      We sent a password reset link to <strong>{email}</strong>
                    </p>
                    <p className="mt-2">
                      Click the link in the email to reset your password. The link will expire in 1 hour for security reasons.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p className="font-medium">Next steps:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Check your email inbox (and spam folder)</li>
                    <li>Click the "Reset Password" link</li>
                    <li>Create a new strong password</li>
                    <li>Sign in with your new password</li>
                  </ol>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => {
                      setIsEmailSent(false);
                      setEmail('');
                    }}
                    variant="outline"
                    className="btn btn-outline btn-md w-full"
                  >
                    Send Another Email
                  </Button>
                </div>
              </div>

              <div className="text-center pt-4 border-t border-gray-200">
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 text-sm text-primary-600 hover:text-primary-500 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-xs text-gray-500">
            <p>Didn't receive the email? Check your spam folder or contact support.</p>
          </div>
        </div>

        {/* Animated Background Elements */}
        <div className="fixed inset-0 -z-10">
          <div className="bg-gradient-1 absolute top-0 left-0 w-72 h-72 rounded-full opacity-20 animate-float"></div>
          <div className="bg-gradient-2 absolute top-1/2 right-0 w-96 h-96 rounded-full opacity-20 animate-float-delayed"></div>
          <div className="bg-gradient-3 absolute bottom-0 left-1/3 w-80 h-80 rounded-full opacity-20 animate-float"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-main flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center animate-fade-in">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            SecureBank
          </h1>
          <p className="mt-2 text-gray-600">Reset your password securely</p>
        </div>

        <Card className="glass-card animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary-600" />
              Forgot Password
            </CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="form-group">
                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  value={email}
                  onChange={handleChange}
                  placeholder="Enter your registered email address"
                  className={`input ${error ? 'input-error' : ''}`}
                  error={error}
                  required
                  autoFocus
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-800">
                    <p className="font-medium">How password reset works:</p>
                    <ul className="mt-1 space-y-1 list-disc list-inside">
                      <li>We'll send a secure link to your email</li>
                      <li>Click the link to create a new password</li>
                      <li>The link expires in 1 hour for security</li>
                      <li>Your account remains secure throughout</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="btn btn-primary btn-md w-full"
                loading={loading}
                disabled={!email.trim()}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="loading-spinner w-4 h-4 mr-2"></div>
                    Sending Reset Email...
                  </div>
                ) : (
                  'Send Reset Link'
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Remember your password?</span>
                </div>
              </div>

              <Link
                to="/login"
                className="btn btn-outline btn-md w-full flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Link>
                
              <div className="text-center text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  to="/signup"
                  className="text-primary-600 hover:text-primary-500 font-medium transition-colors"
                >
                  Sign up
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-gray-500">
          <p>Need help? Contact our support team for assistance.</p>
          <p className="mt-1">support@bankdashboard.com • 1-800-BANK-HELP</p>
        </div>
      </div>

      {/* Animated Background Elements */}
      <div className="fixed inset-0 -z-10">
        <div className="bg-gradient-1 absolute top-0 left-0 w-72 h-72 rounded-full opacity-20 animate-float"></div>
        <div className="bg-gradient-2 absolute top-1/2 right-0 w-96 h-96 rounded-full opacity-20 animate-float-delayed"></div>
        <div className="bg-gradient-3 absolute bottom-0 left-1/3 w-80 h-80 rounded-full opacity-20 animate-float"></div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemConfigContext } from '../../contexts/SystemConfigContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import LogoDisplay from '../../components/ui/LogoDisplay';
import SystemInitializer from '../../components/dev/SystemInitializer';
import { Shield } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [loading, setLoading] = useState(false);
  const [showInitializer, setShowInitializer] = useState(false);
  const { signIn } = useAuth();
  const { getPrimaryLogo, getCompanyName, loading: configLoading, config } = useSystemConfigContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await signIn(formData.email, formData.password);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Check if system needs initialization
  const needsInitialization = !configLoading && (!config || !getPrimaryLogo() || getPrimaryLogo() === '');

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* System Initializer Modal */}
      {showInitializer && <SystemInitializer />}
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white opacity-10 rounded-full animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white opacity-5 rounded-full animate-pulse-slow"></div>
        <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-white opacity-10 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <div className="mx-auto w-full max-w-xs mb-6">
            {!configLoading ? (
              <LogoDisplay 
                logoUrl={getPrimaryLogo()} 
                companyName=""
                fallbackIcon={<div className="text-2xl">🏦</div>}
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
          <h1 className="logo text-4xl mb-2">Admin Portal</h1>
          <p className="text-white/80 text-lg">Welcome back! Ready to manage your system?</p>
          <p className="text-white/60 text-sm mt-1">Sign in to access your admin dashboard</p>
        </div>

        <Card className="glass">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-800">Sign In</CardTitle>
            <CardDescription className="text-gray-600 text-base">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="form-group">
                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john.doe@example.com"
                  className="input"
                  required
                />
              </div>

              <div className="form-group">
                <Input
                  label="Password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your secure password"
                  className="input"
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    id="remember-me"
                    name="rememberMe"
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="w-4 h-4 text-indigo-600 border-2 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Remember me for 30 days</span>
                </label>

                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="btn btn-primary btn-md w-full"
                loading={loading}
                disabled={!formData.email || !formData.password}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="loading-spinner w-4 h-4 mr-2"></div>
                    Signing In...
                  </div>
                ) : (
                  'Sign In to Dashboard'
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Account Access Only</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-700">
                  <strong>Accounts are created by bank administrators only.</strong><br />
                  Contact support if you need assistance accessing your account.
                </p>
              </div>
            </form>

            {/* Trust indicators */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  256-bit SSL Encryption
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  FDIC Insured
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* System Initialization Button (only show if needed) */}
        {needsInitialization && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowInitializer(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
            >
              🚀 Initialize System
            </button>
            <p className="text-xs text-orange-300 mt-2">
              System configuration required - Click to setup
            </p>
          </div>
        )}

        {/* Discrete Admin Access Link */}
        <div className="mt-8 text-center">
          <Link 
            to="/admin-access" 
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            System Administration
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
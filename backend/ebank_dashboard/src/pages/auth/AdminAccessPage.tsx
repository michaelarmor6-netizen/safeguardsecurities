import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Key, UserPlus, Eye, EyeOff, AlertCircle, Wrench } from 'lucide-react';
import LogoDisplay from '../../components/ui/LogoDisplay';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemConfigContext } from '../../contexts/SystemConfigContext';
import { UserRole } from '../../types';
import AdminUserCreator from '../../components/dev/AdminUserCreator';
import { migrateUserRoles } from '../../utils/migrateUserRoles';
import toast from 'react-hot-toast';

const AdminAccessPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const { getPrimaryLogo, getCompanyName, loading: configLoading } = useSystemConfigContext();
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'create'>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Redirect if already logged in as admin
  React.useEffect(() => {
    if (user && (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN)) {
      navigate('/admin');
    }
  }, [user, navigate]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Please enter both email and password');
      return;
    }

    try {
      await signIn(formData.email, formData.password);
      toast.success('Admin login successful!');
      navigate('/admin');
    } catch (error) {
      console.error('Admin login error:', error);
      if (error instanceof Error) {
        if (error.message.includes('user-not-found')) {
          toast.error('Admin account not found');
        } else if (error.message.includes('wrong-password')) {
          toast.error('Invalid password');
        } else if (error.message.includes('too-many-requests')) {
          toast.error('Too many failed attempts. Please try again later.');
        } else {
          toast.error('Login failed. Please check your credentials.');
        }
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-full max-w-xs">
              {!configLoading ? (
                <LogoDisplay 
                  logoUrl={getPrimaryLogo()} 
                  companyName=""
                  fallbackIcon={<Shield className="w-12 h-12 text-blue-600" />}
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
          <h2 className="text-3xl font-bold text-indigo-900">Admin Access</h2>
          <p className="mt-2 text-indigo-700">
            Administrative Portal
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white/80 rounded-lg p-1 backdrop-blur-sm shadow-sm border border-indigo-200">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'login'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50'
            }`}
          >
            <Key className="w-4 h-4 inline-block mr-2" />
            Admin Login
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'create'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50'
            }`}
          >
            <UserPlus className="w-4 h-4 inline-block mr-2" />
            Create Admin
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-2xl p-8">
          {activeTab === 'login' ? (
            /* Admin Login Form */
            <div>
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Admin Login</h3>
                <p className="text-gray-600">Sign in to access the administrative dashboard</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="admin@example.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors pr-10"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors font-medium"
                >
                  Access System
                </button>
              </form>
            </div>
          ) : (
            /* Admin Creator */
            <div>
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Create Admin Account</h3>
                <p className="text-gray-600">Create a new administrator or super administrator account</p>
              </div>

              {/* Role Migration Tool */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Wrench className="w-5 h-5 text-indigo-600 mr-3" />
                    <div>
                      <h4 className="text-sm font-medium text-indigo-900">Fix User Role Issue</h4>
                      <p className="text-sm text-indigo-700">Fix role mismatch causing login redirect loops</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      toast.loading('Fixing user roles...');
                      const result = await migrateUserRoles();
                      if (result.success) {
                        toast.success(`Fixed ${result.updatedCount} user roles!`);
                      } else {
                        toast.error('Failed to fix user roles');
                      }
                    }}
                    className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors"
                  >
                    Fix Roles
                  </button>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-orange-900">Security Notice</h4>
                    <p className="text-sm text-orange-700 mt-1">
                      Admin account creation should only be performed by authorized personnel. 
                      These accounts have full system access.
                    </p>
                  </div>
                </div>
              </div>

              <AdminUserCreator />

              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  After creating an admin account, use the "Admin Login" tab to sign in.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-indigo-700 text-sm">
            Secure Administrative Access • {getCompanyName()}
          </p>
          <p className="text-indigo-600 text-xs mt-1">
            Protected by enterprise-grade security
          </p>
          
          {/* Client Access Link */}
          <div className="mt-4 pt-4 border-t border-indigo-300/50">
            <Link
              to="/client-login"
              className="inline-flex items-center text-indigo-600 hover:text-indigo-800 text-sm underline"
            >
              Client Account Access
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAccessPage;
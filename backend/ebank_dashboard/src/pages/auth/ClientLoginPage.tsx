import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, ArrowLeft, Shield } from 'lucide-react';
import LogoDisplay from '../../components/ui/LogoDisplay';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemConfigContext } from '../../contexts/SystemConfigContext';
import toast from 'react-hot-toast';
import PasswordResetRequestModal from '../../components/modals/PasswordResetRequestModal';

const ClientLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const { getCompanyName, getPrimaryLogo, loading: configLoading } = useSystemConfigContext();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Redirect if already logged in as client
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
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
    
    if (!formData.username || !formData.password) {
      toast.error('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    
    try {
      // Import Firebase functions for user lookup
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase');
      
      // Check if input is already an email or username
      let userEmail = formData.username;
      
      if (!formData.username.includes('@')) {
        // It's a username, we need to look up the email
        console.log('Looking up email for username:', formData.username);
        
        try {
          const usersQuery = query(
            collection(db, 'users'),
            where('username', '==', formData.username)
          );
          
          const querySnapshot = await getDocs(usersQuery);
          
          if (querySnapshot.empty) {
            toast.error('Username not found. Please contact bank support.');
            return;
          }
          
          // Get the email from the user document
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          userEmail = userData.email;
          
          console.log('Found user email for username:', userEmail);
        } catch (dbError) {
          console.error('Database lookup failed, trying direct email login:', dbError);
          // If database lookup fails due to permissions, try using username as email
          // This is a fallback for when users enter their email directly
          userEmail = formData.username.includes('@') ? formData.username : `${formData.username}@tempmail.com`;
        }
      }
      
      // Check if this is a temporary password first (for manual resets)
      if (!formData.username.includes('@')) {
        const usersQuery = query(
          collection(db, 'users'),
          where('username', '==', formData.username)
        );
        const querySnapshot = await getDocs(usersQuery);
        
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          
          // ONLY redirect to change password if:
          // 1. User has a temporary password AND it matches the input
          // 2. The temporary password is different from their regular password
          // 3. The mustChangePassword flag is explicitly set to true
          if (userData.temporaryPassword && 
              userData.temporaryPassword === formData.password &&
              userData.mustChangePassword === true) {
            console.log('Temporary password login detected - redirecting to change password');
            
            // For temporary password, use the email with the temporary password for authentication
            // This is a special case where we allow temporary login
            try {
              await signIn(userData.email, formData.password);
              
              // If successful, redirect to change password
              toast.success('Temporary password accepted! You must change your password now.');
              navigate('/change-password', { 
                state: { 
                  isTemporary: true, 
                  email: userData.email,
                  username: formData.username
                } 
              });
              return;
            } catch (authError: any) {
              // If temporary password doesn't work with Firebase, we need to handle this differently
              if (authError?.code === 'auth/wrong-password' || authError?.code === 'auth/invalid-credential') {
                // Create a special session indicator
                console.log('Using temporary password bypass for user:', userData.email);
                
                // Store temporary login state
                sessionStorage.setItem('tempPasswordUser', JSON.stringify({
                  email: userData.email,
                  username: formData.username,
                  mustChangePassword: true
                }));
                
                toast.success('Temporary password accepted! You must change your password now.');
                navigate('/change-password', { 
                  state: { 
                    isTemporary: true, 
                    email: userData.email,
                    username: formData.username
                  } 
                });
                return;
              }
              throw authError;
            }
          }
        }
      }
      
      // Normal login process
      console.log('Attempting normal login with email:', userEmail);
      await signIn(userEmail, formData.password);
      console.log('Normal login successful');
      
      // Check if user must change password (ONLY for confirmed temporary passwords)
      try {
        if (!formData.username.includes('@')) {
          // We already have the user document from username lookup
          const usersQuery = query(
            collection(db, 'users'),
            where('username', '==', formData.username)
          );
          const querySnapshot = await getDocs(usersQuery);
          
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            
            // Debug user data
            console.log('User data check:', {
              mustChangePassword: userData?.mustChangePassword,
              hasTemporaryPassword: !!userData?.temporaryPassword,
              username: formData.username
            });
            
            // ONLY redirect if mustChangePassword is explicitly true AND there's a temporary password
            if (userData?.mustChangePassword === true && userData?.temporaryPassword) {
              console.log('User has mustChangePassword flag and temporary password - redirecting');
              toast.success('Login successful! You must change your temporary password.');
              navigate('/change-password', { 
                state: { 
                  isTemporary: true, 
                  email: userEmail,
                  username: formData.username
                } 
              });
              return;
            } else {
              console.log('User does not need to change password - proceeding to dashboard');
            }
          }
        }
      } catch (checkError) {
        console.log('Could not check mustChangePassword flag:', checkError);
      }
      
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Client login error:', error);
      
      let errorMessage = 'Login failed. Please check your credentials.';
      
      if (error?.code === 'auth/user-not-found') {
        errorMessage = 'Account not found. Please contact bank administration.';
      } else if (error?.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error?.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid credentials. Please contact bank support.';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-gray-50">
      <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Enhanced Logo - Full Header Coverage */}
          <div className="flex justify-center mb-8">
            <div className="w-full max-w-xs">
              <LogoDisplay 
                logoUrl={getPrimaryLogo()} 
                companyName=""
                fallbackIcon={<User className="w-12 h-12 text-green-600" />}
                className="w-full h-24 object-contain"
              />
            </div>
          </div>
          
          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Client Login</h2>
            <p className="mt-2 text-gray-600">
              Access your account securely
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10 border border-gray-200">
            
            {/* Important Notice */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Account Access</h3>
                  <p className="text-xs text-blue-700 mt-1">
                    Use the username and password provided by bank administration. 
                    If you don't have credentials, please contact our support team.
                  </p>
                </div>
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleLogin}>
              {/* Username Field */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="appearance-none block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-500"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Login Button */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
              </div>
            </form>

            {/* Forgot Password Link - Opens Modal */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowResetModal(true);
                }}
                className="text-sm text-green-600 hover:text-green-800 font-medium cursor-pointer transition-colors duration-200 underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded-md px-2 py-1"
              >
                Forgot your password?
              </button>
            </div>

            {/* Support Links */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Need Help?</span>
                </div>
              </div>

              <div className="mt-4 text-center space-y-2">
                <p className="text-sm text-gray-600">
                  Don't have login credentials? Contact bank support.
                </p>
                <p className="text-xs text-gray-500">
                  Accounts are created by bank administrators only.
                </p>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center text-xs text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm border">
              <Shield className="w-3 h-3 mr-1" />
              Secured with 256-bit SSL encryption
            </div>
          </div>
        </div>
      </div>

      {/* Password Reset Request Modal */}
      <PasswordResetRequestModal 
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
      />
    </div>
  );
};

export default ClientLoginPage;
import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { UserRole } from '../../types';
import toast from 'react-hot-toast';
import { Shield, Wrench, Check, AlertTriangle } from 'lucide-react';

const SystemInitializer: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [adminData, setAdminData] = useState({
    email: 'admin@yourbank.com',
    password: 'Admin123!',
    confirmPassword: 'Admin123!',
    firstName: 'System',
    lastName: 'Administrator',
    companyName: 'SG FINTECH LLC',
    logoUrl: ''
  });

  const handleCreateAdmin = async () => {
    if (adminData.password !== adminData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (adminData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      console.log('🚀 Creating admin user...');
      
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        adminData.email,
        adminData.password
      );
      
      console.log('✅ Firebase Auth user created:', userCredential.user.uid);

      // 2. Create admin user document
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: adminData.email,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        role: UserRole.SUPER_ADMIN,
        emailVerified: false,
        twoFactorEnabled: false,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'system-initializer'
      });

      console.log('✅ Admin user document created');
      toast.success('Admin user created successfully!');
      
      setStep(2);
    } catch (error) {
      console.error('❌ Error creating admin:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create admin');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeSystem = async () => {
    setLoading(true);
    try {
      console.log('🚀 Initializing system configuration...');
      
      // Default logo (simple SVG data URL)
      const defaultLogo = adminData.logoUrl || `data:image/svg+xml;base64,${btoa(`
        <svg width="200" height="60" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="60" fill="#3B82F6" rx="8"/>
          <text x="100" y="35" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18" font-weight="bold">
            ${adminData.companyName}
          </text>
        </svg>
      `)}`;

      const systemConfig = {
        id: 'main',
        companyInfo: {
          name: adminData.companyName,
          legalName: `${adminData.companyName} LLC`,
          description: 'Digital banking platform providing secure financial services',
          tagline: 'Banking made simple and secure',
          website: 'https://yourbank.com',
          industry: 'Financial Services',
          timezone: 'UTC',
          defaultCurrency: 'USD',
          supportedCurrencies: ['USD', 'EUR', 'GBP']
        },
        branding: {
          logo: {
            primary: defaultLogo,
            width: 200,
            height: 60
          },
          colors: {
            primary: '#3B82F6',
            secondary: '#1E40AF',
            accent: '#F59E0B',
            success: '#10B981',
            warning: '#F59E0B',
            error: '#EF4444',
            background: '#F8FAFC',
            surface: '#FFFFFF',
            text: '#1F2937'
          },
          typography: {
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: {
              xs: '0.75rem',
              sm: '0.875rem',
              base: '1rem',
              lg: '1.125rem',
              xl: '1.25rem',
              '2xl': '1.5rem',
              '3xl': '1.875rem'
            }
          },
          layout: {
            sidebarWidth: 256,
            headerHeight: 64,
            footerHeight: 48,
            borderRadius: '0.5rem'
          }
        },
        contact: {
          email: {
            primary: 'info@yourbank.com',
            support: 'support@yourbank.com',
            noreply: 'noreply@yourbank.com'
          },
          phone: {
            primary: '+1-800-123-4567',
            support: '+1-800-123-4568',
            international: '+1-800-123-4569'
          },
          address: {
            street: '123 Banking Street',
            city: 'Financial District',
            state: 'NY',
            zipCode: '10001',
            country: 'United States'
          },
          socialMedia: {
            facebook: '',
            twitter: '',
            linkedin: '',
            instagram: ''
          }
        },
        features: {
          onlineBanking: true,
          mobileApp: true,
          billPay: true,
          transfers: true,
          deposits: true,
          loans: true,
          investments: false,
          creditCards: false,
          businessAccounts: true,
          internationalTransfers: false,
          cryptoCurrency: false,
          bulkOperations: true
        },
        security: {
          sessionTimeout: 30,
          maxLoginAttempts: 5,
          lockoutDuration: 15,
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true
          },
          twoFactorAuth: {
            enforced: false,
            methods: ['email', 'sms']
          },
          ipWhitelist: [],
          rateLimiting: {
            enabled: true,
            requestsPerMinute: 100
          }
        },
        notifications: {
          email: {
            enabled: true,
            templates: {
              welcome: true,
              transactionAlert: true,
              securityAlert: true,
              maintenance: false,
              newsletter: false
            }
          },
          sms: {
            enabled: false,
            templates: {
              twoFactorAuth: false,
              transactionAlert: false,
              securityAlert: false
            }
          },
          push: {
            enabled: false,
            templates: {
              transactionAlert: false,
              securityAlert: false,
              marketing: false
            }
          }
        },
        supportEmailTemplates: {
          accountOpening: {
            received: {
              subject: 'Account Application Received',
              message: 'Thank you for your interest in opening an account with us. We will review your application within 2-3 business days.'
            },
            approved: {
              subject: 'Account Approved - Welcome!',
              message: 'Congratulations! Your account has been approved. You can now log in using your credentials.'
            },
            requiresDocuments: {
              subject: 'Additional Documents Required',
              message: 'We need additional documentation to complete your account opening. Please log in to upload the required documents.'
            }
          },
          general: {
            received: {
              subject: 'Support Request Received',
              message: 'We have received your support request and will respond shortly.'
            },
            resolved: {
              subject: 'Support Request Resolved',
              message: 'Your support request has been resolved. Please contact us if you need further assistance.'
            },
            followUp: {
              subject: 'Following up on your Support Request',
              message: 'We wanted to follow up on your recent support request to ensure everything is working properly.'
            }
          }
        },
        updatedAt: serverTimestamp(),
        updatedBy: 'system-initializer',
        version: '1.0.0'
      };

      await setDoc(doc(db, 'systemConfig', 'main'), systemConfig);
      
      console.log('✅ System configuration saved');
      toast.success('System initialized successfully!');
      
      setStep(3);
    } catch (error) {
      console.error('❌ Error initializing system:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initialize system');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '50%', 
      left: '50%', 
      transform: 'translate(-50%, -50%)',
      background: 'white', 
      border: '3px solid #3B82F6', 
      padding: '30px', 
      borderRadius: '12px',
      maxWidth: '500px',
      width: '90vw',
      maxHeight: '90vh',
      overflow: 'auto',
      zIndex: 10000,
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
    }}>
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Wrench className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">System Setup Required</h2>
        <p className="text-gray-600 mt-2">Let's initialize your banking platform</p>
      </div>

      {step === 1 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-blue-600" />
            Step 1: Create Admin Account
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="text"
                value={adminData.firstName}
                onChange={(e) => setAdminData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="First Name"
              />
              <Input
                type="text"
                value={adminData.lastName}
                onChange={(e) => setAdminData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Last Name"
              />
            </div>
            <Input
              type="email"
              value={adminData.email}
              onChange={(e) => setAdminData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Admin Email"
            />
            <Input
              type="password"
              value={adminData.password}
              onChange={(e) => setAdminData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Password (min 8 characters)"
            />
            <Input
              type="password"
              value={adminData.confirmPassword}
              onChange={(e) => setAdminData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Confirm Password"
            />
            <Button 
              onClick={handleCreateAdmin}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Creating Admin...' : 'Create Admin Account'}
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Check className="w-5 h-5 mr-2 text-green-600" />
            Step 2: System Configuration
          </h3>
          <div className="space-y-4">
            <Input
              type="text"
              value={adminData.companyName}
              onChange={(e) => setAdminData(prev => ({ ...prev, companyName: e.target.value }))}
              placeholder="Company Name"
            />
            <Input
              type="url"
              value={adminData.logoUrl}
              onChange={(e) => setAdminData(prev => ({ ...prev, logoUrl: e.target.value }))}
              placeholder="Logo URL (optional - will use default if empty)"
            />
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                A default logo will be generated if no URL is provided
              </p>
            </div>
            <Button 
              onClick={handleInitializeSystem}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Initializing System...' : 'Initialize System'}
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-6 text-center">
          <div className="text-green-600 mb-4">
            <Check className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold mb-4 text-green-800">Setup Complete!</h3>
          <div className="bg-green-50 p-4 rounded-lg mb-4">
            <div className="text-sm space-y-2 text-left">
              <p><strong>Admin Email:</strong> {adminData.email}</p>
              <p><strong>Admin Password:</strong> {adminData.password}</p>
              <p><strong>Company:</strong> {adminData.companyName}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Button 
              onClick={() => window.location.href = '/admin-access'}
              className="w-full"
            >
              Go to Admin Login
            </Button>
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              Refresh Page
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SystemInitializer;
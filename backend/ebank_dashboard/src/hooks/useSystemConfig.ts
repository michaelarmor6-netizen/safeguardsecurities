import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SystemConfig } from '../types';

// Default system configuration
const defaultConfig: SystemConfig = {
  id: 'main',
  companyInfo: {
    name: 'Digital Banking Platform',
    legalName: 'Digital Banking Platform LLC',
    description: 'Secure and modern digital banking solutions',
    tagline: 'Banking made simple and secure',
    website: 'https://digitalbanking.com',
    industry: 'Financial Services',
    timezone: 'UTC',
    defaultCurrency: 'USD',
    supportedCurrencies: ['USD', 'EUR', 'GBP']
  },
  branding: {
    logo: {
      primary: '/logo.png',
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
      footerHeight: 80,
      borderRadius: '0.5rem'
    }
  },
  contact: {
    email: {
      primary: 'info@digitalbanking.com',
      support: 'support@digitalbanking.com'
    },
    phone: {
      primary: '+1-800-BANKING',
      support: '+1-800-SUPPORT'
    },
    address: {
      street: '123 Financial District',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'United States'
    },
    businessHours: {
      timezone: 'America/New_York',
      schedule: {
        monday: { open: '09:00', close: '17:00' },
        tuesday: { open: '09:00', close: '17:00' },
        wednesday: { open: '09:00', close: '17:00' },
        thursday: { open: '09:00', close: '17:00' },
        friday: { open: '09:00', close: '17:00' },
        saturday: { closed: true, open: '', close: '' },
        sunday: { closed: true, open: '', close: '' }
      }
    }
  },
  features: {
    multiCurrency: true,
    twoFactorAuth: true,
    emailVerification: true,
    smsNotifications: false,
    pushNotifications: false,
    maintenance: false,
    registration: true,
    passwordReset: true,
    accountRecovery: true,
    auditLogs: true,
    apiAccess: false,
    webhooks: false,
    exportData: true,
    importData: false,
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
        maintenance: false
      }
    },
    inApp: {
      enabled: true,
      retention: 30
    }
  },
  supportEmailTemplates: {
    autoReply: {
      enabled: true,
      subject: 'Thank you for contacting Digital Banking Support',
      message: 'We have received your message and will respond within 24 hours. For urgent matters, please call our support line.'
    },
    accountOpening: {
      acknowledgment: {
        subject: 'Account Application Received',
        message: 'Thank you for your interest in Digital Banking. We have received your account application and will review it shortly.'
      },
      approved: {
        subject: 'Welcome to Digital Banking - Account Approved',
        message: 'Congratulations! Your account has been approved. You can now log in using your credentials.'
      },
      requiresDocuments: {
        subject: 'Additional Documents Required',
        message: 'We need additional documentation to complete your account opening. Please log in to your account to upload the required documents.'
      }
    },
    general: {
      received: {
        subject: 'Support Request Received',
        message: 'We have received your support request and assigned it a ticket number. Our team will respond shortly.'
      },
      resolved: {
        subject: 'Support Request Resolved',
        message: 'Your support request has been resolved. If you need further assistance, please don\'t hesitate to contact us.'
      },
      followUp: {
        subject: 'Following up on your Support Request',
        message: 'We wanted to follow up on your recent support request to ensure everything is working properly for you.'
      }
    }
  },
  updatedAt: new Date(),
  updatedBy: '',
  version: '1.0.0'
};

export const useSystemConfig = () => {
  const [config, setConfig] = useState<SystemConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const configRef = doc(db, 'systemConfig', 'main');
    
    const unsubscribe = onSnapshot(
      configRef, 
      (doc) => {
        try {
          if (doc.exists()) {
            const data = doc.data();
            setConfig({
              ...data,
              updatedAt: data.updatedAt?.toDate() || new Date()
            } as SystemConfig);
          } else {
            // Use default config if no document exists
            setConfig(defaultConfig);
          }
          setError(null);
        } catch (err) {
          console.error('Error processing system config:', err);
          setError('Failed to load system configuration');
          setConfig(defaultConfig); // Fallback to default
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error listening to system config:', err);
        setError('Failed to connect to system configuration');
        setConfig(defaultConfig); // Fallback to default
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Helper functions for easier access to common config values
  const getCompanyName = () => config.companyInfo.name;
  const getPrimaryLogo = () => {
    const logo = config.branding.logo.primary || '/logo.png';
    return logo;
  };
  const getPrimaryColor = () => config.branding.colors.primary;
  const getContactEmail = () => config.contact.email.primary;
  const getContactPhone = () => config.contact.phone.primary;

  return {
    config,
    loading,
    error,
    // Helper functions
    getCompanyName,
    getPrimaryLogo,
    getPrimaryColor,
    getContactEmail,
    getContactPhone
  };
};
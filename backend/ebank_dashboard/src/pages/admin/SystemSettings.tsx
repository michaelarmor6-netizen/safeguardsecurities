import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/Layout/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { SystemConfig } from '../../types';
import toast from 'react-hot-toast';
import { 
  Building2, 
  Palette, 
  Mail, 
  Upload, 
  Save, 
  AlertCircle,
  CheckCircle,
  Settings,
  Shield,
  Bell,
  FileText,
  MessageCircle
} from 'lucide-react';

const SystemSettings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('company');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  
  // File upload states
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const tabs = [
    { id: 'company', label: 'Company Info', icon: Building2 },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'contact', label: 'Contact Details', icon: Mail },
    { id: 'emailTemplates', label: 'Advanced System Setting', icon: Settings }
  ];

  // Test Firestore connection
  const testFirestoreConnection = async () => {
    try {
      console.log('Testing Firestore connection...');
      const testRef = doc(db, 'test', 'connection');
      await setDoc(testRef, { 
        timestamp: serverTimestamp(), 
        userId: user?.uid,
        test: 'connection test'
      }, { merge: true });
      console.log('Firestore connection test successful');
      toast.success('Firestore connection test successful');
    } catch (error) {
      console.error('Firestore connection test failed:', error);
      toast.error(`Firestore connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    loadSystemConfig();
  }, []);

  const loadSystemConfig = async () => {
    try {
      setLoading(true);
      const configRef = doc(db, 'systemConfig', 'main');
      const configSnap = await getDoc(configRef);
      
      if (configSnap.exists()) {
        const data = configSnap.data();
        setConfig({
          ...data,
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as SystemConfig);
      } else {
        // Initialize default config
        const defaultConfig: SystemConfig = {
          id: 'main',
          companyInfo: {
            name: 'Digital Banking Platform',
            legalName: 'Digital Banking Platform LLC',
            description: 'Secure and modern digital banking solutions',
            tagline: 'Banking made simple and secure',
            website: '',
            industry: 'Financial Services',
            timezone: 'UTC',
            defaultCurrency: 'USD',
            supportedCurrencies: ['USD', 'EUR', 'GBP']
          },
          branding: {
            logo: {
              primary: '',
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
              subject: 'Support Request Received - Ticket #{ticketId}',
              message: `Dear {customerName},

Thank you for contacting SG FINTECH LLC support. We have received your request and assigned ticket #{ticketId} to your case.

Our support team will review your request and respond within 24 hours. If this is urgent, please contact us directly at {supportPhone}.

Request Details:
- Category: {category}
- Priority: {priority}
- Subject: {subject}

Best regards,
SG FINTECH LLC Support Team
{supportEmail}
{companyPhone}`
            },
            accountOpening: {
              acknowledgment: {
                subject: 'Account Opening Request Received - Ticket #{ticketId}',
                message: `Dear {customerName},

We have received your request to open a new account with SG FINTECH LLC.

Next Steps:
1. Our team will review your application within 2-3 business days
2. You may be contacted for additional documentation
3. Once approved, you will receive account setup instructions

Required Documents (if not already provided):
- Government-issued ID
- Proof of address
- Initial deposit verification

For questions, please reference ticket #{ticketId} when contacting us.

Best regards,
Account Opening Department
SG FINTECH LLC`
              },
              approved: {
                subject: 'Account Approved - Welcome to SG FINTECH LLC!',
                message: `Congratulations {customerName}!

Your account application has been approved. Welcome to SG FINTECH LLC!

Your new account details will be sent separately via secure email within the next hour.

Next Steps:
1. Complete your profile setup
2. Make your initial deposit
3. Explore our banking services

Thank you for choosing SG FINTECH LLC for your banking needs.

Best regards,
Account Management Team`
              },
              requiresDocuments: {
                subject: 'Additional Documents Required - Ticket #{ticketId}',
                message: `Dear {customerName},

To proceed with your account opening request, we need additional documentation:

Required Documents:
- [Specify required documents]

Please upload these documents through your client portal or email them to {supportEmail} with ticket #{ticketId} in the subject line.

Once we receive the documents, processing will continue within 1-2 business days.

Best regards,
Document Verification Team
SG FINTECH LLC`
              }
            },
            general: {
              received: {
                subject: 'Support Request Received - Ticket #{ticketId}',
                message: `Dear {customerName},

We have received your support request and assigned ticket #{ticketId} to your case.

Our technical team will review your request and respond within 24 hours during business hours.

If this is an urgent matter, please contact our support hotline at {supportPhone}.

Best regards,
Technical Support Team
SG FINTECH LLC`
              },
              resolved: {
                subject: 'Support Request Resolved - Ticket #{ticketId}',
                message: `Dear {customerName},

Your support request (Ticket #{ticketId}) has been resolved.

If you need any additional assistance or if the issue persists, please reply to this email or create a new support request.

Thank you for choosing SG FINTECH LLC.

Best regards,
Customer Support Team`
              },
              followUp: {
                subject: 'Follow-up: Support Request #{ticketId}',
                message: `Dear {customerName},

We wanted to follow up on your recent support request (Ticket #{ticketId}) to ensure everything is working correctly.

If you have any additional questions or concerns, please don't hesitate to contact us.

Your satisfaction is important to us.

Best regards,
Customer Success Team
SG FINTECH LLC`
              }
            }
          },
          updatedAt: new Date(),
          updatedBy: user?.uid || '',
          version: '1.0.0'
        };
        
        await setDoc(configRef, {
          ...defaultConfig,
          updatedAt: serverTimestamp()
        });
        setConfig(defaultConfig);
        toast.success('System configuration initialized');
      }
    } catch (error) {
      console.error('Error loading system config:', error);
      toast.error('Failed to load system configuration');
    } finally {
      setLoading(false);
    }
  };

  // Convert image to base64 data URL (CORS-free solution)
  const convertToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Validate file size (max 1MB for base64 to avoid performance issues)
      const maxSize = 1024 * 1024; // 1MB
      if (file.size > maxSize) {
        reject(new Error('File size too large for base64 conversion. Maximum size is 1MB.'));
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        reject(new Error('Invalid file type. Please upload an image (JPEG, PNG, GIF, or WebP).'));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        console.log('Base64 conversion completed, length:', base64String.length);
        resolve(base64String);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file for base64 conversion.'));
      };
      reader.readAsDataURL(file);
    });
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    // Add timeout to prevent hanging
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Upload timeout - request took too long'));
      }, 40000); // 40 second timeout

      try {
        console.log('Starting file upload:', { fileName: file.name, fileSize: file.size, path });
        
        // First try base64 conversion (CORS-free)
        console.log('Attempting base64 conversion to bypass CORS...');
        try {
          const base64DataUrl = await convertToBase64(file);
          console.log('Base64 conversion successful - using local storage');
          clearTimeout(timeout);
          resolve(base64DataUrl);
          return;
        } catch (base64Error) {
          console.log('Base64 conversion failed, falling back to Firebase Storage:', base64Error);
        }
        
        // Fallback to Firebase Storage if base64 fails
        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          throw new Error('File size too large. Maximum size is 5MB.');
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          throw new Error('Invalid file type. Please upload an image (JPEG, PNG, GIF, or WebP).');
        }

        const fileRef = ref(storage, path);
        
        console.log('Attempting upload to Firebase Storage...');
        
        // Try upload with proper headers for CORS
        const uploadResult = await uploadBytes(fileRef, file, {
          customMetadata: {
            uploadedBy: user?.uid || 'unknown',
            uploadedAt: new Date().toISOString(),
            originalName: file.name
          }
        });
        console.log('Upload completed:', uploadResult);
        
        const downloadURL = await getDownloadURL(fileRef);
        console.log('Download URL obtained:', downloadURL);
        
        clearTimeout(timeout);
        resolve(downloadURL);
      } catch (error) {
        clearTimeout(timeout);
        console.error('File upload error:', error);
        
        // Handle specific Firebase errors
        if (error instanceof Error) {
          if (error.message.includes('cors') || error.message.includes('CORS')) {
            reject(new Error('CORS configuration issue. Browser blocked the request.'));
          } else if (error.message.includes('permission')) {
            reject(new Error('Permission denied. Check Firebase Storage rules.'));
          } else if (error.message.includes('network')) {
            reject(new Error('Network error. Check internet connection.'));
          } else {
            reject(new Error(`Upload failed: ${error.message}`));
          }
        } else {
          reject(new Error('Upload failed: Unknown error'));
        }
      }
    });
  };

  const handleSave = async () => {
    console.log('Save initiated:', { hasConfig: !!config, hasUser: !!user, userId: user?.uid });
    
    if (!config || !user) {
      console.error('Missing config or user:', { config: !!config, user: !!user });
      toast.error('Missing configuration or user authentication');
      return;
    }

    // Set timeout to prevent infinite saving state
    const saveTimeout = setTimeout(() => {
      console.error('Save operation timed out');
      setSaving(false);
      toast.error('Save operation timed out. Please try again.');
    }, 30000); // 30 second timeout

    try {
      setSaving(true);
      console.log('Setting saving to true...');
      
      const configRef = doc(db, 'systemConfig', 'main');
      console.log('Firebase document reference created');
      
      let updatedConfig = { ...config };
      console.log('Config cloned for update');

      // Handle logo upload with timeout protection
      if (logoFile) {
        console.log('Logo file detected, attempting upload with timeout...');
        
        // Show progress toast
        const uploadToast = toast.loading('Uploading logo... Please wait up to 45 seconds.');
        
        try {
          // Race between upload and timeout (extended to 45 seconds)
          const logoUrl = await Promise.race([
            uploadFile(logoFile, `branding/logo-primary-${Date.now()}`),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Upload timeout after 45 seconds')), 45000)
            )
          ]);
          
          toast.dismiss(uploadToast);
          
          updatedConfig.branding.logo.primary = logoUrl;
          setLogoFile(null);
          
          // Check if it's base64 or Firebase URL
          if (logoUrl.startsWith('data:')) {
            toast.success('Logo saved successfully using local storage (CORS-free)!');
          } else {
            toast.success('Logo uploaded successfully to Firebase Storage!');
          }
          console.log('Logo upload completed successfully');
        } catch (uploadError) {
          toast.dismiss(uploadToast);
          console.error('Logo upload failed:', uploadError);
          setLogoFile(null);
          
          // Provide specific error messages
          if (uploadError instanceof Error) {
            if (uploadError.message.includes('CORS')) {
              toast.error('Logo upload blocked by CORS. Other settings will still save.');
            } else if (uploadError.message.includes('timeout')) {
              toast.error('Logo upload timed out after 45 seconds. Try a smaller file. Other settings will still save.');
            } else {
              toast.error(`Logo upload failed: ${uploadError.message}. Other settings will still save.`);
            }
          } else {
            toast.error('Logo upload failed. Other settings will still save.');
          }
          
          // Always continue with saving other settings
          console.log('Continuing with save despite upload failure');
        }
      }

      // Update config in Firestore - use setDoc with merge to avoid updateDoc issues
      console.log('Preparing config data for save...');
      const configToSave = {
        id: 'main',
        companyInfo: updatedConfig.companyInfo,
        branding: updatedConfig.branding,
        contact: updatedConfig.contact,
        features: updatedConfig.features || {},
        security: updatedConfig.security || {},
        notifications: updatedConfig.notifications || {},
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
        version: updatedConfig.version || '1.0.0'
      };
      
      console.log('Config data prepared:', Object.keys(configToSave));
      console.log('Starting Firestore save operation...');

      await setDoc(configRef, configToSave, { merge: true });
      console.log('Firestore save completed successfully');

      setConfig(updatedConfig);
      clearTimeout(saveTimeout);
      toast.success('Configuration saved successfully!');
      console.log('Save operation completed successfully');
    } catch (error) {
      clearTimeout(saveTimeout);
      console.error('Error saving config:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      toast.error(`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      console.log('Setting saving to false...');
      setSaving(false);
    }
  };

  const handleInputChange = (path: string, value: any) => {
    if (!config) return;
    
    const keys = path.split('.');
    const newConfig = { ...config };
    let current: any = newConfig;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setConfig(newConfig);
  };

  const renderCompanyInfo = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Building2 className="w-5 h-5 mr-2" />
          Company Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            <Input
              type="text"
              value={config?.companyInfo.name || ''}
              onChange={(e) => handleInputChange('companyInfo.name', e.target.value)}
              placeholder="Enter company name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Legal Name
            </label>
            <Input
              type="text"
              value={config?.companyInfo.legalName || ''}
              onChange={(e) => handleInputChange('companyInfo.legalName', e.target.value)}
              placeholder="Enter legal company name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website
            </label>
            <Input
              type="url"
              value={config?.companyInfo.website || ''}
              onChange={(e) => handleInputChange('companyInfo.website', e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry
            </label>
            <Input
              type="text"
              value={config?.companyInfo.industry || ''}
              onChange={(e) => handleInputChange('companyInfo.industry', e.target.value)}
              placeholder="e.g., Financial Services"
            />
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={config?.companyInfo.description || ''}
              onChange={(e) => handleInputChange('companyInfo.description', e.target.value)}
              placeholder="Brief company description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tagline
            </label>
            <Input
              type="text"
              value={config?.companyInfo.tagline || ''}
              onChange={(e) => handleInputChange('companyInfo.tagline', e.target.value)}
              placeholder="Company tagline or motto"
            />
          </div>
        </div>
      </Card>
    </div>
  );

  const renderBranding = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Upload className="w-5 h-5 mr-2" />
          Logo Management
        </h3>
        <div className="space-y-4">
          {config?.branding.logo.primary && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Logo
              </label>
              <img
                src={config.branding.logo.primary}
                alt="Current Logo"
                className="w-32 h-16 object-contain border rounded"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload New Logo
            </label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                console.log('File selected:', file ? { name: file.name, size: file.size, type: file.type } : 'No file');
                
                if (file) {
                  // Validate file size (1MB limit for optimal base64 performance)
                  const maxSize = 1024 * 1024; // 1MB
                  if (file.size > maxSize) {
                    toast.error('File too large! Maximum size is 1MB for optimal performance.');
                    e.target.value = ''; // Clear the input
                    return;
                  }

                  // Validate file type
                  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
                  if (!allowedTypes.includes(file.type)) {
                    toast.error('Invalid file type! Please select an image (JPEG, PNG, GIF, or WebP).');
                    e.target.value = ''; // Clear the input
                    return;
                  }

                  setLogoFile(file);
                  toast.success(`Logo file selected: ${file.name}`);
                  toast('⚠️ Note: Upload may fail due to CORS - other settings will still save', { 
                    duration: 4000,
                    style: { background: '#FEF3C7', color: '#92400E' }
                  });
                } else {
                  setLogoFile(null);
                }
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {logoFile && (
              <div className="mt-2 space-y-1">
                <p className="text-sm text-green-600">
                  ✅ Selected: {logoFile.name} ({(logoFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
                <p className="text-xs text-orange-600">
                  ⚠️ Upload may fail due to CORS, but other settings will save
                </p>
              </div>
            )}
            <div className="mt-2">
              <p className="text-xs text-gray-500">
                Supported formats: JPEG, PNG, GIF, WebP • Maximum size: 1MB
              </p>
              <p className="text-xs text-blue-600 mt-1">
                💡 Uses CORS-free local storage for immediate compatibility
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Palette className="w-5 h-5 mr-2" />
          Brand Colors
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(config?.branding.colors || {}).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={value as string}
                  onChange={(e) => handleInputChange(`branding.colors.${key}`, e.target.value)}
                  className="w-10 h-8 rounded border border-gray-300"
                />
                <Input
                  type="text"
                  value={value as string}
                  onChange={(e) => handleInputChange(`branding.colors.${key}`, e.target.value)}
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderContactInfo = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Mail className="w-5 h-5 mr-2" />
          Contact Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Email
            </label>
            <Input
              type="email"
              value={config?.contact.email.primary || ''}
              onChange={(e) => handleInputChange('contact.email.primary', e.target.value)}
              placeholder="info@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Support Email
            </label>
            <Input
              type="email"
              value={config?.contact.email.support || ''}
              onChange={(e) => handleInputChange('contact.email.support', e.target.value)}
              placeholder="support@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Phone
            </label>
            <Input
              type="tel"
              value={config?.contact.phone.primary || ''}
              onChange={(e) => handleInputChange('contact.phone.primary', e.target.value)}
              placeholder="+1-800-123-4567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Support Phone
            </label>
            <Input
              type="tel"
              value={config?.contact.phone.support || ''}
              onChange={(e) => handleInputChange('contact.phone.support', e.target.value)}
              placeholder="+1-800-123-4567"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Street Address
            </label>
            <Input
              type="text"
              value={config?.contact.address.street || ''}
              onChange={(e) => handleInputChange('contact.address.street', e.target.value)}
              placeholder="123 Main Street"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City
            </label>
            <Input
              type="text"
              value={config?.contact.address.city || ''}
              onChange={(e) => handleInputChange('contact.address.city', e.target.value)}
              placeholder="New York"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State/Province
            </label>
            <Input
              type="text"
              value={config?.contact.address.state || ''}
              onChange={(e) => handleInputChange('contact.address.state', e.target.value)}
              placeholder="NY"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Postal Code
            </label>
            <Input
              type="text"
              value={config?.contact.address.postalCode || ''}
              onChange={(e) => handleInputChange('contact.address.postalCode', e.target.value)}
              placeholder="10001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <Input
              type="text"
              value={config?.contact.address.country || ''}
              onChange={(e) => handleInputChange('contact.address.country', e.target.value)}
              placeholder="United States"
            />
          </div>
        </div>
      </Card>
    </div>
  );

  const renderEmailTemplates = () => (
    <div className="space-y-6">
      {/* Auto Reply Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Mail className="w-5 h-5 mr-2" />
          Auto Reply Settings
        </h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config?.supportEmailTemplates?.autoReply?.enabled || false}
              onChange={(e) => handleInputChange('supportEmailTemplates.autoReply.enabled', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="text-sm font-medium text-gray-700">
              Enable automatic reply to support requests
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Auto Reply Subject
            </label>
            <Input
              type="text"
              value={config?.supportEmailTemplates?.autoReply?.subject || ''}
              onChange={(e) => handleInputChange('supportEmailTemplates.autoReply.subject', e.target.value)}
              placeholder="Support Request Received - Ticket #{ticketId}"
            />
            <p className="text-xs text-gray-500 mt-1">
              Available variables: {'{ticketId}'}, {'{customerName}'}, {'{category}'}, {'{priority}'}, {'{subject}'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Auto Reply Message
            </label>
            <textarea
              value={config?.supportEmailTemplates?.autoReply?.message || ''}
              onChange={(e) => handleInputChange('supportEmailTemplates.autoReply.message', e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your automatic reply message template..."
            />
          </div>
        </div>
      </Card>

      {/* Account Opening Templates */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          Account Opening Templates
        </h3>
        <div className="space-y-6">
          {/* Acknowledgment Template */}
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-medium text-gray-900 mb-3">Request Acknowledgment</h4>
            <div className="space-y-3">
              <Input
                type="text"
                value={config?.supportEmailTemplates?.accountOpening?.acknowledgment?.subject || ''}
                onChange={(e) => handleInputChange('supportEmailTemplates.accountOpening.acknowledgment.subject', e.target.value)}
                placeholder="Account Opening Request Received"
              />
              <textarea
                value={config?.supportEmailTemplates?.accountOpening?.acknowledgment?.message || ''}
                onChange={(e) => handleInputChange('supportEmailTemplates.accountOpening.acknowledgment.message', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Approval Template */}
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-medium text-gray-900 mb-3">Account Approved</h4>
            <div className="space-y-3">
              <Input
                type="text"
                value={config?.supportEmailTemplates?.accountOpening?.approved?.subject || ''}
                onChange={(e) => handleInputChange('supportEmailTemplates.accountOpening.approved.subject', e.target.value)}
                placeholder="Account Approved - Welcome!"
              />
              <textarea
                value={config?.supportEmailTemplates?.accountOpening?.approved?.message || ''}
                onChange={(e) => handleInputChange('supportEmailTemplates.accountOpening.approved.message', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Documents Required Template */}
          <div className="border-l-4 border-yellow-500 pl-4">
            <h4 className="font-medium text-gray-900 mb-3">Additional Documents Required</h4>
            <div className="space-y-3">
              <Input
                type="text"
                value={config?.supportEmailTemplates?.accountOpening?.requiresDocuments?.subject || ''}
                onChange={(e) => handleInputChange('supportEmailTemplates.accountOpening.requiresDocuments.subject', e.target.value)}
                placeholder="Additional Documents Required"
              />
              <textarea
                value={config?.supportEmailTemplates?.accountOpening?.requiresDocuments?.message || ''}
                onChange={(e) => handleInputChange('supportEmailTemplates.accountOpening.requiresDocuments.message', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* General Support Templates */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MessageCircle className="w-5 h-5 mr-2" />
          General Support Templates
        </h3>
        <div className="space-y-6">
          {/* Request Received */}
          <div className="border-l-4 border-purple-500 pl-4">
            <h4 className="font-medium text-gray-900 mb-3">Request Received</h4>
            <div className="space-y-3">
              <Input
                type="text"
                value={config?.supportEmailTemplates?.general?.received?.subject || ''}
                onChange={(e) => handleInputChange('supportEmailTemplates.general.received.subject', e.target.value)}
                placeholder="Support Request Received"
              />
              <textarea
                value={config?.supportEmailTemplates?.general?.received?.message || ''}
                onChange={(e) => handleInputChange('supportEmailTemplates.general.received.message', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Request Resolved */}
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-medium text-gray-900 mb-3">Request Resolved</h4>
            <div className="space-y-3">
              <Input
                type="text"
                value={config?.supportEmailTemplates?.general?.resolved?.subject || ''}
                onChange={(e) => handleInputChange('supportEmailTemplates.general.resolved.subject', e.target.value)}
                placeholder="Support Request Resolved"
              />
              <textarea
                value={config?.supportEmailTemplates?.general?.resolved?.message || ''}
                onChange={(e) => handleInputChange('supportEmailTemplates.general.resolved.message', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Available Template Variables:</strong>
          </p>
          <div className="text-xs text-blue-700 mt-1 grid grid-cols-2 gap-2">
            <div>{'{ticketId}'} - Support ticket ID</div>
            <div>{'{customerName}'} - Customer's full name</div>
            <div>{'{category}'} - Request category</div>
            <div>{'{priority}'} - Request priority</div>
            <div>{'{subject}'} - Request subject</div>
            <div>{'{supportEmail}'} - Your support email</div>
            <div>{'{supportPhone}'} - Your support phone</div>
            <div>{'{companyPhone}'} - Main company phone</div>
          </div>
        </div>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <AdminLayout title="System Settings" subtitle="Loading system configuration...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="System Settings" subtitle="Configure platform-wide settings and branding">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your platform's configuration, branding, and contact information
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={testFirestoreConnection}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <AlertCircle className="h-4 w-4" />
              <span>Test DB</span>
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <Card>
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6 py-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'company' && renderCompanyInfo()}
            {activeTab === 'branding' && renderBranding()}
            {activeTab === 'contact' && renderContactInfo()}
            {activeTab === 'emailTemplates' && renderEmailTemplates()}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default SystemSettings;
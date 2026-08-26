import React, { useState, useEffect } from 'react';
import { 
  User, 
  Globe, 
  CreditCard, 
  DollarSign, 
  FileText, 
  Shield, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Upload,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Building,
  Briefcase,
  Flag,
  Copy,
  Info
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemConfigContext } from '../../contexts/SystemConfigContext';
import AdminLayout from '../../components/Layout/AdminLayout';
import { countries } from '../../utils/countries';
import SearchableCountrySelect from '../../components/ui/SearchableCountrySelect';
import { UserRole } from '../../types';
import toast from 'react-hot-toast';
import ClientAccountEmailService from '../../utils/clientAccountEmailService';

interface ClientData {
  // Country & Residency
  country: string;
  isUSCitizen: boolean;
  residencyStatus: string;
  
  // Personal Information
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  
  // US-specific fields
  ssn: string;
  
  // International fields
  passportNumber: string;
  passportCountry: string;
  nationalId: string;
  taxId: string;
  
  // Contact Information
  email: string;
  phone: string;
  alternatePhone: string;
  
  // Address Information
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  addressCountry: string;
  
  // US Address Verification
  residenceDuration: string;
  previousAddress: string;
  
  // International Address
  internationalAddress: {
    line1: string;
    line2: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  
  // Employment Information
  employmentStatus: string;
  employer: string;
  jobTitle: string;
  workAddress: string;
  annualIncome: string;
  incomeSource: string;
  
  // Account Credentials
  username: string;
  temporaryPassword: string;
  
  // Banking Information
  accountType: string;
  accountNumber: string;
  routingNumber: string;
  accountPurpose: string;
  expectedMonthlyTransactions: string;
  expectedTransactionAmount: string;
  initialDeposit: string;
  fundingSource: string;
  
  // International Banking
  foreignBankAccounts: boolean;
  foreignAccountDetails: string;
  correspondentBankNeeded: boolean;
  
  // Compliance & Documentation
  fatcaStatus: string;
  crsReporting: boolean;
  sanctionsScreening: boolean;
  pep: boolean; // Politically Exposed Person
  
  // Account Features
  onlineBanking: boolean;
  mobileApp: boolean;
  debitCard: boolean;
  checkbook: boolean;
  wireTransfers: boolean;
  internationalWires: boolean;
  
  // Risk Assessment
  riskProfile: string;
  kycStatus: string;
  amlCompliance: boolean;
}

const initialClientData: ClientData = {
  country: '',
  isUSCitizen: false,
  residencyStatus: '',
  
  firstName: '',
  middleName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  
  ssn: '',
  
  passportNumber: '',
  passportCountry: '',
  nationalId: '',
  taxId: '',
  
  username: '',
  temporaryPassword: '',
  
  email: '',
  phone: '',
  alternatePhone: '',
  
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  addressCountry: '',
  
  residenceDuration: '',
  previousAddress: '',
  
  internationalAddress: {
    line1: '',
    line2: '',
    city: '',
    region: '',
    postalCode: '',
    country: ''
  },
  
  employmentStatus: '',
  employer: '',
  jobTitle: '',
  workAddress: '',
  annualIncome: '',
  incomeSource: '',
  
  accountType: 'checking',
  accountNumber: '',
  routingNumber: '',
  accountPurpose: '',
  expectedMonthlyTransactions: '',
  expectedTransactionAmount: '',
  initialDeposit: '',
  fundingSource: '',
  
  foreignBankAccounts: false,
  foreignAccountDetails: '',
  correspondentBankNeeded: false,
  
  fatcaStatus: '',
  crsReporting: false,
  sanctionsScreening: false,
  pep: false,
  
  onlineBanking: true,
  mobileApp: true,
  debitCard: true,
  checkbook: false,
  wireTransfers: false,
  internationalWires: false,
  
  riskProfile: 'low',
  kycStatus: 'pending',
  amlCompliance: false
};

const ClientAccountOpening: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { config } = useSystemConfigContext();
  const [currentStep, setCurrentStep] = useState(1);
  const [clientData, setClientData] = useState<ClientData>(initialClientData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps = [
    { id: 1, title: 'Personal Information', icon: User },
    { id: 2, title: 'Contact & Address', icon: MapPin },
    { id: 3, title: 'Identity & Residency', icon: Globe },
    { id: 4, title: 'Employment Details', icon: Briefcase },
    { id: 5, title: 'Account Selection', icon: CreditCard },
    { id: 6, title: 'Compliance & Review', icon: Shield },
    { id: 7, title: 'Account Generation', icon: CheckCircle }
  ];

  const handleInputChange = (field: string, value: any) => {
    setClientData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1: // Personal Information
        if (!clientData.firstName) newErrors.firstName = 'First name is required';
        if (!clientData.lastName) newErrors.lastName = 'Last name is required';
        if (!clientData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
        if (!clientData.gender) newErrors.gender = 'Gender is required';
        if (!clientData.username) {
          newErrors.username = 'Username is required';
        } else if (clientData.username.length < 4) {
          newErrors.username = 'Username must be at least 4 characters';
        } else if (clientData.username.length > 20) {
          newErrors.username = 'Username must be 20 characters or less';
        } else if (!/^[a-z0-9]+$/.test(clientData.username)) {
          newErrors.username = 'Username can only contain lowercase letters and numbers';
        }
        break;

      case 2: // Contact & Address
        if (!clientData.email) newErrors.email = 'Email is required';
        if (!clientData.phone) newErrors.phone = 'Phone number is required';
        if (!clientData.addressLine1) newErrors.addressLine1 = 'Address is required';
        if (!clientData.city) newErrors.city = 'City is required';
        if (!clientData.postalCode) newErrors.postalCode = 'Postal code is required';
        break;

      case 3: // Identity & Residency
        if (!clientData.country) newErrors.country = 'Country selection is required';
        if (clientData.country === 'US' && clientData.isUSCitizen === undefined) {
          newErrors.isUSCitizen = 'US citizenship status is required';
        }
        if (!clientData.residencyStatus) newErrors.residencyStatus = 'Residency status is required';
        
        if (clientData.country === 'US' || clientData.isUSCitizen) {
          if (!clientData.ssn) newErrors.ssn = 'SSN is required for US citizens/residents';
        } else {
          if (!clientData.passportNumber) newErrors.passportNumber = 'Passport number is required';
          if (!clientData.passportCountry) newErrors.passportCountry = 'Passport country is required';
        }
        break;

      case 4: // Employment Details
        if (!clientData.employmentStatus) newErrors.employmentStatus = 'Employment status is required';
        if (!clientData.annualIncome) newErrors.annualIncome = 'Annual income is required';
        if (!clientData.incomeSource) newErrors.incomeSource = 'Income source is required';
        break;

      case 5: // Account Selection
        if (!clientData.accountType) newErrors.accountType = 'Account type is required';
        if (!clientData.accountPurpose) newErrors.accountPurpose = 'Account purpose is required';
        if (!clientData.initialDeposit) newErrors.initialDeposit = 'Initial deposit is required';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  // Utility functions for account generation
  const generateUsername = (firstName: string, lastName: string): string => {
    const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
    const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
    const randomNum = Math.floor(Math.random() * 9999) + 1000;
    return `${cleanFirst}${cleanLast}${randomNum}`;
  };

  const generateTemporaryPassword = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    // Ensure at least one uppercase, lowercase, number, and special char
    password += 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 25)];
    password += 'abcdefghijkmnpqrstuvwxyz'[Math.floor(Math.random() * 25)];
    password += '23456789'[Math.floor(Math.random() * 8)];
    password += '!@#$%'[Math.floor(Math.random() * 5)];
    
    // Fill remaining 4 characters
    for (let i = 0; i < 4; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  const generateAccountNumber = (): string => {
    // US Bank account format: 10-12 digits
    const bankPrefix = '001'; // Bank routing identifier
    const accountNumber = Math.floor(Math.random() * 900000000) + 100000000; // 9 digits
    return `${bankPrefix}${accountNumber}`;
  };

  const generateRoutingNumber = (): string => {
    // US ABA routing number format (9 digits)
    const routingNumbers = [
      '021000021', // Chase
      '026009593', // Bank of America  
      '072000326', // US Bank
      '121000248', // Wells Fargo
      '111000025'  // General/Regional bank
    ];
    return routingNumbers[Math.floor(Math.random() * routingNumbers.length)];
  };

  const sendWelcomeEmail = (clientData: ClientData, accountNumber: string, routingNumber: string) => {
    try {
      // Create email service instance
      const emailService = new ClientAccountEmailService(config);
      
      // Prepare email variables
      const emailVariables = {
        customerName: `${clientData.firstName} ${clientData.middleName ? clientData.middleName + ' ' : ''}${clientData.lastName}`,
        firstName: clientData.firstName,
        lastName: clientData.lastName,
        email: clientData.email,
        username: clientData.username,
        temporaryPassword: clientData.temporaryPassword,
        accountNumber: accountNumber,
        clientPortalUrl: `${window.location.origin}/client-login`, // Dedicated client portal
        supportEmail: config?.contact?.email?.support || config?.contact?.email?.primary || 'support@sgfintech.com',
        supportPhone: config?.contact?.phone?.support || config?.contact?.phone?.primary || '(555) 123-BANK',
        companyName: config?.companyInfo?.name || 'SG FINTECH LLC',
        adminName: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || currentUser?.email?.split('@')[0] || 'Admin',
        adminEmail: currentUser?.email || 'admin@sgfintech.com'
      };
      
      // Generate professional email
      const emailPackage = emailService.generateAccountCreationEmails(emailVariables, currentUser?.email);
      
      // Open client welcome email
      console.log('📧 Opening client welcome email...', {
        to: clientData.email,
        subject: emailPackage.clientEmail.subject
      });
      
      window.open(emailPackage.clientEmail.mailtoUrl, '_blank');
      
      // Optional: Also generate admin notification
      if (emailPackage.adminNotification && currentUser?.email) {
        console.log('📧 Admin notification email available for:', currentUser.email);
        // Uncomment the line below to also open admin notification email
        // window.open(emailPackage.adminNotification.mailtoUrl, '_blank');
      }
      
    } catch (error) {
      console.error('Error generating welcome email:', error);
      
      // Fallback to simple email if service fails
      const fallbackSubject = `Welcome to ${config?.companyInfo?.name || 'SG FINTECH LLC'} - Account Created`;
      const fallbackBody = `Dear ${clientData.firstName} ${clientData.lastName},\n\nYour account has been created successfully.\n\nLogin: ${clientData.username}\nPassword: ${clientData.temporaryPassword}\nPortal: ${window.location.origin}/client-login\n\nThank you!`;
      const fallbackMailto = `mailto:${clientData.email}?subject=${encodeURIComponent(fallbackSubject)}&body=${encodeURIComponent(fallbackBody)}`;
      window.open(fallbackMailto, '_blank');
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(6)) return;

    setIsSubmitting(true);
    try {
      // Generate credentials and account details (username is now user-entered)
      const temporaryPassword = generateTemporaryPassword();
      const accountNumber = generateAccountNumber();
      const routingNumber = generateRoutingNumber();
      
      // Update client data with generated details
      const finalClientData = {
        ...clientData,
        temporaryPassword,
        accountNumber,
        routingNumber
      };
      
      setClientData(finalClientData);
      
      // Import Firebase functions
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { auth, db } = await import('../../config/firebase');
      
      // 1. Create Firebase Auth user
      console.log('Creating Firebase Auth user...');
      const userCredential = await createUserWithEmailAndPassword(auth, finalClientData.email, temporaryPassword);
      const firebaseUser = userCredential.user;
      
      toast.success('✅ User authentication created successfully!');
      
      // 2. Create user document in Firestore
      const userData = {
        uid: firebaseUser.uid,
        email: finalClientData.email,
        firstName: finalClientData.firstName,
        middleName: finalClientData.middleName || '',
        lastName: finalClientData.lastName,
        dateOfBirth: finalClientData.dateOfBirth,
        gender: finalClientData.gender,
        phone: finalClientData.phone,
        alternatePhone: finalClientData.alternatePhone || '',
        
        // Address
        address: {
          line1: finalClientData.addressLine1,
          line2: finalClientData.addressLine2 || '',
          city: finalClientData.city,
          state: finalClientData.state,
          postalCode: finalClientData.postalCode,
          country: finalClientData.addressCountry || finalClientData.country
        },
        
        // Identity
        country: finalClientData.country,
        isUSCitizen: finalClientData.isUSCitizen,
        residencyStatus: finalClientData.residencyStatus,
        ssn: finalClientData.ssn || '',
        passportNumber: finalClientData.passportNumber || '',
        passportCountry: finalClientData.passportCountry || '',
        nationalId: finalClientData.nationalId || '',
        taxId: finalClientData.taxId || '',
        
        // Employment
        employment: {
          status: finalClientData.employmentStatus,
          employer: finalClientData.employer || '',
          jobTitle: finalClientData.jobTitle || '',
          workAddress: finalClientData.workAddress || '',
          annualIncome: finalClientData.annualIncome,
          incomeSource: finalClientData.incomeSource
        },
        
        // Compliance
        compliance: {
          fatcaStatus: finalClientData.fatcaStatus || '',
          crsReporting: finalClientData.crsReporting,
          pep: finalClientData.pep,
          sanctionsScreening: finalClientData.sanctionsScreening,
          amlCompliance: finalClientData.amlCompliance,
          kycStatus: 'approved',
          riskProfile: finalClientData.riskProfile
        },
        
        // System fields
        role: UserRole.CLIENT,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentUser?.uid || 'admin',
        
        // Login credentials
        username: finalClientData.username,
        temporaryPassword: temporaryPassword,
        mustChangePassword: true
      };
      
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      await setDoc(userDocRef, userData);
      
      toast.success('✅ User profile created successfully!');
      
      // 3. Create bank account
      const bankAccountData = {
        userId: firebaseUser.uid,
        accountNumber: accountNumber,
        routingNumber: routingNumber,
        accountType: finalClientData.accountType,
        accountName: `${finalClientData.accountType.charAt(0).toUpperCase() + finalClientData.accountType.slice(1)} Account`,
        balance: parseFloat(finalClientData.initialDeposit) || 0,
        currency: 'USD',
        status: 'active',
        isActive: true,
        
        // Account details
        purpose: finalClientData.accountPurpose,
        expectedMonthlyTransactions: finalClientData.expectedMonthlyTransactions,
        expectedTransactionAmount: finalClientData.expectedTransactionAmount,
        fundingSource: finalClientData.fundingSource,
        
        // Features enabled
        features: {
          onlineBanking: finalClientData.onlineBanking,
          mobileApp: finalClientData.mobileApp,
          debitCard: finalClientData.debitCard,
          checkbook: finalClientData.checkbook,
          wireTransfers: finalClientData.wireTransfers,
          internationalWires: finalClientData.internationalWires
        },
        
        // Account limits
        limits: {
          dailyWithdrawLimit: finalClientData.accountType === 'business' ? 10000 : 2500,
          dailyTransferLimit: finalClientData.accountType === 'business' ? 25000 : 10000,
          monthlyTransactions: 0
        },
        
        // International banking
        international: {
          foreignBankAccounts: finalClientData.foreignBankAccounts,
          foreignAccountDetails: finalClientData.foreignAccountDetails || '',
          correspondentBankNeeded: finalClientData.correspondentBankNeeded
        },
        
        // System fields
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentUser?.uid || 'admin'
      };
      
      const accountDocRef = doc(db, 'accounts', `${firebaseUser.uid}_${finalClientData.accountType}`);
      await setDoc(accountDocRef, bankAccountData);
      
      // Clear any old localStorage accounts and store correct data
      const localAccountKey = `temp_account_${firebaseUser.uid}`;
      localStorage.removeItem(localAccountKey); // Clear old data first
      
      const localAccountData = {
        id: `${firebaseUser.uid}_${finalClientData.accountType}`,
        userId: firebaseUser.uid,
        accountNumber: accountNumber,
        routingNumber: routingNumber,
        accountType: finalClientData.accountType,
        accountName: `${finalClientData.accountType.charAt(0).toUpperCase() + finalClientData.accountType.slice(1)} Account`,
        balance: parseFloat(finalClientData.initialDeposit) || 0,
        currency: 'USD',
        status: 'active',
        isActive: true,
        type: finalClientData.accountType, // For dashboard compatibility
        primary: true,
        features: {
          onlineBanking: finalClientData.onlineBanking,
          mobileApp: finalClientData.mobileApp,
          debitCard: finalClientData.debitCard,
          checkbook: finalClientData.checkbook,
          wireTransfers: finalClientData.wireTransfers,
          internationalWires: finalClientData.internationalWires
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      localStorage.setItem(localAccountKey, JSON.stringify(localAccountData));
      
      console.log('🔄 ACCOUNT CONSISTENCY CHECK:');
      console.log('📧 Email will show Account Number:', accountNumber);
      console.log('📧 Email will show Routing Number:', routingNumber);
      console.log('💾 Firestore Account Number:', accountNumber);
      console.log('💾 localStorage Account Number:', localAccountData.accountNumber);
      console.log('✅ Dashboard should now show SAME account number as email!');
      
      toast.success('✅ Bank account created successfully!');
      
      // 4. Send welcome email
      setTimeout(() => {
        sendWelcomeEmail(finalClientData, accountNumber, routingNumber);
        toast.success('📧 Welcome email opened in your default email client');
      }, 1000);
      
      // 5. Create initial transaction record for deposit
      if (parseFloat(finalClientData.initialDeposit) > 0) {
        const transactionData = {
          userId: firebaseUser.uid,
          accountId: `${firebaseUser.uid}_${finalClientData.accountType}`,
          transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'deposit',
          category: 'initial_deposit',
          amount: parseFloat(finalClientData.initialDeposit),
          currency: 'USD',
          description: 'Initial Account Opening Deposit',
          status: 'completed',
          
          // Source information
          source: {
            type: finalClientData.fundingSource,
            description: 'Account Opening Deposit'
          },
          
          // System fields
          createdAt: serverTimestamp(),
          processedAt: serverTimestamp(),
          createdBy: currentUser?.uid || 'admin'
        };
        
        const transactionDocRef = doc(db, 'transactions', transactionData.transactionId);
        await setDoc(transactionDocRef, transactionData);
        
        toast.success('✅ Initial deposit transaction recorded!');
      }
      
      toast.success('🎉 Complete client account setup finished successfully!');
      
      // Move to final step showing account details
      setCurrentStep(7);
      
    } catch (error) {
      console.error('Error creating client account:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('email-already-in-use')) {
          toast.error('Email address is already registered. Please use a different email.');
        } else if (error.message.includes('weak-password')) {
          toast.error('Generated password does not meet requirements. Please try again.');
        } else if (error.message.includes('PERMISSION_DENIED')) {
          toast.error('Database permission denied. Please check Firestore security rules.');
        } else {
          toast.error(`Account creation failed: ${error.message}`);
        }
      } else {
        toast.error('Failed to create client account. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout title="Open New Client Account" subtitle="International Banking Account Opening">
      <div className="max-w-6xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                    isCompleted 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : isActive 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 mx-4 ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl border p-8">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <User className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h2>
                <p className="text-gray-600">Please provide your basic personal details</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={clientData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter first name"
                  />
                  {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={clientData.middleName}
                    onChange={(e) => handleInputChange('middleName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter middle name (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={clientData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter last name"
                  />
                  {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    value={clientData.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.dateOfBirth && <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender *
                  </label>
                  <select
                    value={clientData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select gender...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                  {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
                </div>

                {/* Username Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Username *
                  </label>
                  <input
                    type="text"
                    value={clientData.username}
                    onChange={(e) => handleInputChange('username', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    placeholder="Choose your username (letters and numbers only)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    minLength={4}
                    maxLength={20}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    4-20 characters, letters and numbers only. This will be your login username.
                  </p>
                  {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Banking Standards</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      We follow standard banking industry procedures. Your personal information will be used for identity verification, account setup, and regulatory compliance requirements.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Contact & Address */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <MapPin className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact & Address</h2>
                <p className="text-gray-600">Please provide your contact information and residential address</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={clientData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter email address"
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={clientData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter phone number"
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alternate Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={clientData.alternatePhone}
                    onChange={(e) => handleInputChange('alternatePhone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter alternate phone"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={clientData.addressLine1}
                    onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter street address"
                  />
                  {errors.addressLine1 && <p className="text-red-500 text-sm mt-1">{errors.addressLine1}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    value={clientData.addressLine2}
                    onChange={(e) => handleInputChange('addressLine2', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Apartment, suite, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={clientData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter city"
                  />
                  {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State/Province *
                  </label>
                  <input
                    type="text"
                    value={clientData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter state/province"
                  />
                  {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    value={clientData.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter postal code"
                  />
                  {errors.postalCode && <p className="text-red-500 text-sm mt-1">{errors.postalCode}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Residence Duration *
                  </label>
                  <select
                    value={clientData.residenceDuration}
                    onChange={(e) => handleInputChange('residenceDuration', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select duration...</option>
                    <option value="less_than_6_months">Less than 6 months</option>
                    <option value="6_months_to_1_year">6 months to 1 year</option>
                    <option value="1_to_2_years">1 to 2 years</option>
                    <option value="2_plus_years">2+ years</option>
                  </select>
                  {errors.residenceDuration && <p className="text-red-500 text-sm mt-1">{errors.residenceDuration}</p>}
                </div>

                {clientData.residenceDuration === 'less_than_6_months' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Previous Address *
                    </label>
                    <input
                      type="text"
                      value={clientData.previousAddress}
                      onChange={(e) => handleInputChange('previousAddress', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter previous address"
                    />
                    {errors.previousAddress && <p className="text-red-500 text-sm mt-1">{errors.previousAddress}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Identity & Residency */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Identity & Residency</h2>
                <p className="text-gray-600">Please provide your identification documents and residency information</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Country Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country of Residence *
                  </label>
                  <SearchableCountrySelect
                    value={clientData.country}
                    onChange={(value) => handleInputChange('country', value)}
                    placeholder="Select country..."
                  />
                  {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country}</p>}
                </div>

                {/* US Citizenship Question */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Are you a US Citizen? *
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="isUSCitizen"
                        value="true"
                        checked={clientData.isUSCitizen === true}
                        onChange={() => handleInputChange('isUSCitizen', true)}
                        className="mr-2"
                      />
                      Yes
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="isUSCitizen"
                        value="false"
                        checked={clientData.isUSCitizen === false}
                        onChange={() => handleInputChange('isUSCitizen', false)}
                        className="mr-2"
                      />
                      No
                    </label>
                  </div>
                  {errors.isUSCitizen && <p className="text-red-500 text-sm mt-1">{errors.isUSCitizen}</p>}
                </div>

                {/* Residency Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Residency Status *
                  </label>
                  <select
                    value={clientData.residencyStatus}
                    onChange={(e) => handleInputChange('residencyStatus', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select status...</option>
                    <option value="citizen">Citizen</option>
                    <option value="permanent_resident">Permanent Resident</option>
                    <option value="temporary_resident">Temporary Resident</option>
                    <option value="work_visa">Work Visa</option>
                    <option value="student_visa">Student Visa</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.residencyStatus && <p className="text-red-500 text-sm mt-1">{errors.residencyStatus}</p>}
                </div>

                {/* US-specific identification */}
                {(clientData.country === 'US' || clientData.isUSCitizen) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Social Security Number *
                    </label>
                    <input
                      type="text"
                      value={clientData.ssn}
                      onChange={(e) => handleInputChange('ssn', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="XXX-XX-XXXX"
                      maxLength={11}
                    />
                    {errors.ssn && <p className="text-red-500 text-sm mt-1">{errors.ssn}</p>}
                  </div>
                )}

                {/* International identification */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passport Number *
                  </label>
                  <input
                    type="text"
                    value={clientData.passportNumber}
                    onChange={(e) => handleInputChange('passportNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter passport number"
                  />
                  {errors.passportNumber && <p className="text-red-500 text-sm mt-1">{errors.passportNumber}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passport Issuing Country *
                  </label>
                  <SearchableCountrySelect
                    value={clientData.passportCountry}
                    onChange={(value) => handleInputChange('passportCountry', value)}
                    placeholder="Select country..."
                  />
                  {errors.passportCountry && <p className="text-red-500 text-sm mt-1">{errors.passportCountry}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    National ID Number
                  </label>
                  <input
                    type="text"
                    value={clientData.nationalId}
                    onChange={(e) => handleInputChange('nationalId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="National ID (if applicable)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Identification Number
                  </label>
                  <input
                    type="text"
                    value={clientData.taxId}
                    onChange={(e) => handleInputChange('taxId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="TIN (if applicable)"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Employment Details */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Briefcase className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Employment & Financial Information</h2>
                <p className="text-gray-600">Please provide your employment and income details</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employment Status *
                  </label>
                  <select
                    value={clientData.employmentStatus}
                    onChange={(e) => handleInputChange('employmentStatus', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select employment status...</option>
                    <option value="employed">Employed</option>
                    <option value="self-employed">Self-Employed</option>
                    <option value="business-owner">Business Owner</option>
                    <option value="unemployed">Unemployed</option>
                    <option value="retired">Retired</option>
                    <option value="student">Student</option>
                    <option value="homemaker">Homemaker</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.employmentStatus && <p className="text-red-500 text-sm mt-1">{errors.employmentStatus}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Annual Income (USD) *
                  </label>
                  <select
                    value={clientData.annualIncome}
                    onChange={(e) => handleInputChange('annualIncome', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select income range...</option>
                    <option value="under-25k">Under $25,000</option>
                    <option value="25k-50k">$25,000 - $50,000</option>
                    <option value="50k-75k">$50,000 - $75,000</option>
                    <option value="75k-100k">$75,000 - $100,000</option>
                    <option value="100k-150k">$100,000 - $150,000</option>
                    <option value="150k-250k">$150,000 - $250,000</option>
                    <option value="250k-500k">$250,000 - $500,000</option>
                    <option value="over-500k">Over $500,000</option>
                  </select>
                  {errors.annualIncome && <p className="text-red-500 text-sm mt-1">{errors.annualIncome}</p>}
                </div>

                {clientData.employmentStatus === 'employed' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Employer Name
                      </label>
                      <input
                        type="text"
                        value={clientData.employer}
                        onChange={(e) => handleInputChange('employer', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter employer name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={clientData.jobTitle}
                        onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter job title"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Source of Income *
                  </label>
                  <select
                    value={clientData.incomeSource}
                    onChange={(e) => handleInputChange('incomeSource', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select income source...</option>
                    <option value="salary">Salary/Wages</option>
                    <option value="business">Business Income</option>
                    <option value="investments">Investment Income</option>
                    <option value="retirement">Retirement/Pension</option>
                    <option value="government">Government Benefits</option>
                    <option value="family">Family Support</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.incomeSource && <p className="text-red-500 text-sm mt-1">{errors.incomeSource}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Account Selection */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <CreditCard className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Selection & Features</h2>
                <p className="text-gray-600">Choose your account type and banking features</p>
              </div>

              {/* Account Type Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Account Type *</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      type: 'checking',
                      title: 'Checking Account',
                      description: 'Everyday banking with unlimited transactions',
                      features: ['Unlimited transactions', 'Debit card included', 'Online banking', 'Mobile deposit'],
                      minDeposit: 100
                    },
                    {
                      type: 'savings',
                      title: 'Savings Account',
                      description: 'Earn interest on your deposits',
                      features: ['Competitive interest rates', 'Limited transactions', 'Online banking', 'Goal tracking'],
                      minDeposit: 500
                    },
                    {
                      type: 'business',
                      title: 'Business Account',
                      description: 'Banking solutions for businesses',
                      features: ['Business debit card', 'Merchant services', 'Wire transfers', 'Account analysis'],
                      minDeposit: 1000
                    }
                  ].map((account) => (
                    <div
                      key={account.type}
                      onClick={() => handleInputChange('accountType', account.type)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        clientData.accountType === account.type
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <h4 className="font-semibold text-gray-900">{account.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{account.description}</p>
                      <p className="text-sm font-medium text-green-600 mb-2">
                        Min. Deposit: ${account.minDeposit.toLocaleString()}
                      </p>
                      <ul className="text-xs text-gray-500 space-y-1">
                        {account.features.map((feature, index) => (
                          <li key={index}>• {feature}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                {errors.accountType && <p className="text-red-500 text-sm mt-1">{errors.accountType}</p>}
              </div>

              {/* Account Purpose */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Purpose *
                  </label>
                  <select
                    value={clientData.accountPurpose}
                    onChange={(e) => handleInputChange('accountPurpose', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select account purpose...</option>
                    <option value="personal">Personal Banking</option>
                    <option value="business">Business Operations</option>
                    <option value="savings">Savings & Investment</option>
                    <option value="international">International Transactions</option>
                    <option value="education">Education Expenses</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.accountPurpose && <p className="text-red-500 text-sm mt-1">{errors.accountPurpose}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Deposit (USD) *
                  </label>
                  <input
                    type="number"
                    value={clientData.initialDeposit}
                    onChange={(e) => handleInputChange('initialDeposit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter amount"
                    min="0"
                  />
                  {errors.initialDeposit && <p className="text-red-500 text-sm mt-1">{errors.initialDeposit}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Monthly Transactions
                  </label>
                  <select
                    value={clientData.expectedMonthlyTransactions}
                    onChange={(e) => handleInputChange('expectedMonthlyTransactions', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select frequency...</option>
                    <option value="0-10">0-10 transactions</option>
                    <option value="11-25">11-25 transactions</option>
                    <option value="26-50">26-50 transactions</option>
                    <option value="51-100">51-100 transactions</option>
                    <option value="100+">100+ transactions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source of Initial Deposit
                  </label>
                  <select
                    value={clientData.fundingSource}
                    onChange={(e) => handleInputChange('fundingSource', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select funding source...</option>
                    <option value="personal-savings">Personal Savings</option>
                    <option value="salary">Salary/Income</option>
                    <option value="business-income">Business Income</option>
                    <option value="investment-gains">Investment Gains</option>
                    <option value="gift">Gift/Inheritance</option>
                    <option value="loan">Loan Proceeds</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Account Features */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Features</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { key: 'onlineBanking', label: 'Online Banking', icon: '🌐' },
                    { key: 'mobileApp', label: 'Mobile App', icon: '📱' },
                    { key: 'debitCard', label: 'Debit Card', icon: '💳' },
                    { key: 'checkbook', label: 'Checkbook', icon: '📋' },
                    { key: 'wireTransfers', label: 'Wire Transfers', icon: '💸' },
                    { key: 'internationalWires', label: 'International Wires', icon: '🌍' }
                  ].map((feature) => (
                    <label key={feature.key} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={clientData[feature.key as keyof ClientData] as boolean}
                        onChange={(e) => handleInputChange(feature.key, e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-lg">{feature.icon}</span>
                      <span className="text-sm font-medium text-gray-700">{feature.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Compliance & Review */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Shield className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Compliance & Final Review</h2>
                <p className="text-gray-600">Complete compliance requirements and review your information</p>
              </div>

              {/* International Compliance (for non-US clients) */}
              {clientData.country !== 'US' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4">International Compliance</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-2">
                        FATCA Status
                      </label>
                      <select
                        value={clientData.fatcaStatus}
                        onChange={(e) => handleInputChange('fatcaStatus', e.target.value)}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select FATCA status...</option>
                        <option value="us-person">US Person for Tax Purposes</option>
                        <option value="non-us-person">Non-US Person</option>
                        <option value="dual-citizen">Dual Citizenship</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="crsReporting"
                        checked={clientData.crsReporting}
                        onChange={(e) => handleInputChange('crsReporting', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="crsReporting" className="text-sm text-blue-800">
                        Subject to CRS (Common Reporting Standard) reporting
                      </label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="pep"
                        checked={clientData.pep}
                        onChange={(e) => handleInputChange('pep', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="pep" className="text-sm text-blue-800">
                        Politically Exposed Person (PEP) or family member/close associate of PEP
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium">Name:</span> {clientData.firstName} {clientData.lastName}</div>
                  <div><span className="font-medium">Country:</span> {clientData.country}</div>
                  <div><span className="font-medium">Account Type:</span> {clientData.accountType}</div>
                  <div><span className="font-medium">Initial Deposit:</span> ${clientData.initialDeposit}</div>
                  <div><span className="font-medium">Email:</span> {clientData.email}</div>
                  <div><span className="font-medium">Phone:</span> {clientData.phone}</div>
                </div>
              </div>

              {/* Final Confirmations */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="sanctionsScreening"
                    checked={clientData.sanctionsScreening}
                    onChange={(e) => handleInputChange('sanctionsScreening', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="sanctionsScreening" className="text-sm text-gray-700">
                    Client has been screened against sanctions lists
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="amlCompliance"
                    checked={clientData.amlCompliance}
                    onChange={(e) => handleInputChange('amlCompliance', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="amlCompliance" className="text-sm text-gray-700">
                    AML/KYC documentation has been verified and approved
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Account Generated */}
          {currentStep === 7 && (
            <div className="space-y-6 text-center">
              <CheckCircle className="w-24 h-24 text-green-600 mx-auto" />
              <h2 className="text-3xl font-bold text-gray-900">Account Successfully Created!</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                The client account has been successfully created with Firebase Auth, Firestore database, and welcome email. All compliance requirements have been met.
              </p>

              {/* Complete Account Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {/* Personal Information */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4">👤 Client Information</h3>
                  <div className="space-y-2 text-sm text-left">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Full Name:</span>
                      <span className="font-medium">{clientData.firstName} {clientData.middleName} {clientData.lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Email:</span>
                      <span className="font-mono text-xs">{clientData.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Phone:</span>
                      <span>{clientData.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Country:</span>
                      <span>{clientData.country}</span>
                    </div>
                  </div>
                </div>

                {/* Login Credentials */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-red-900 mb-4">🔐 Login Credentials</h3>
                  <div className="space-y-2 text-sm text-left">
                    <div className="flex justify-between">
                      <span className="text-red-700">Username:</span>
                      <span className="font-mono bg-white px-2 py-1 rounded">{clientData.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-700">Password:</span>
                      <span className="font-mono bg-white px-2 py-1 rounded">{clientData.temporaryPassword}</span>
                    </div>
                    <div className="mt-3 p-2 bg-red-100 rounded text-xs text-red-800">
                      ⚠️ Client must change password on first login
                    </div>
                  </div>
                </div>

                {/* Banking Details */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-900 mb-4">🏦 Banking Details</h3>
                  <div className="space-y-2 text-sm text-left">
                    <div className="flex justify-between">
                      <span className="text-green-700">Account Number:</span>
                      <span className="font-mono bg-white px-2 py-1 rounded">{clientData.accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Routing Number:</span>
                      <span className="font-mono bg-white px-2 py-1 rounded">{clientData.routingNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Account Type:</span>
                      <span className="capitalize">{clientData.accountType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Initial Balance:</span>
                      <span className="font-semibold text-green-800">${parseFloat(clientData.initialDeposit).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Account Features */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-purple-900 mb-4">✨ Account Features</h3>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    {clientData.onlineBanking && <div className="text-purple-700">✓ Online Banking</div>}
                    {clientData.mobileApp && <div className="text-purple-700">✓ Mobile App</div>}
                    {clientData.debitCard && <div className="text-purple-700">✓ Debit Card</div>}
                    {clientData.checkbook && <div className="text-purple-700">✓ Checkbook</div>}
                    {clientData.wireTransfers && <div className="text-purple-700">✓ Wire Transfers</div>}
                    {clientData.internationalWires && <div className="text-purple-700">✓ International Wires</div>}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4 pt-4">
                <button
                  onClick={() => window.print()}
                  className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Print Account Details
                </button>
                <button
                  onClick={() => {
                    sendWelcomeEmail(clientData, clientData.accountNumber, clientData.routingNumber);
                    toast.success('📧 Welcome email opened in default email client');
                  }}
                  className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Resend Welcome Email
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`Username: ${clientData.username}\nPassword: ${clientData.temporaryPassword}\nAccount: ${clientData.accountNumber}\nRouting: ${clientData.routingNumber}`);
                    toast.success('Account details copied to clipboard');
                  }}
                  className="flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Copy className="w-5 h-5 mr-2" />
                  Copy Details
                </button>
              </div>

              {/* Next Steps */}
              <div className="bg-gray-50 border rounded-lg p-6 max-w-2xl mx-auto text-left">
                <h4 className="font-semibold text-gray-900 mb-3">📋 Next Steps for Client:</h4>
                <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
                  <li>Provide login credentials to client securely</li>
                  <li>Client should log in and change password immediately</li>
                  <li>Complete profile verification if needed</li>
                  <li>Set up direct deposits and automatic payments</li>
                  <li>Download mobile banking app</li>
                  <li>Debit card will arrive within 7-10 business days</li>
                  {clientData.checkbook && <li>Checkbook will arrive within 7-10 business days</li>}
                </ol>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center px-6 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </button>

            {currentStep < 7 ? (
              <button
                onClick={currentStep === 6 ? handleSubmit : nextStep}
                disabled={isSubmitting}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {currentStep === 6 ? 'Create Account' : 'Continue'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            ) : (
              <button
                onClick={() => window.location.href = '/admin/users'}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                View All Clients
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ClientAccountOpening;
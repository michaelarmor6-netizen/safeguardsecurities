import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/Layout/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

import { 
  CreditCard, 
  Search, 
  Filter,
  Plus,
  Eye,
  Edit,
  Lock,
  Unlock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreVertical,
  PiggyBank,
  Building,
  Wallet,
  X,
  ChevronRight,
  ChevronLeft,
  Save,
  User,
  Globe,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  Flag,
  Shield,
  FileText,
  ArrowRight,
  ArrowLeft,
  Info,
  Settings,
  Bell,
  Smartphone,
  Banknote,
  Target,
  Scale,
  UserCheck,
  Trash2
} from 'lucide-react';
import ClientAccountEmailService from '../../utils/clientAccountEmailService';
import { useSystemConfigContext } from '../../contexts/SystemConfigContext';

const ManageAccounts: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [createAccountStep, setCreateAccountStep] = useState(1);
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [editAccountData, setEditAccountData] = useState<any>(null);
  const [newAccountData, setNewAccountData] = useState({
    // Country & Residency
    country: 'US',
    isUSCitizen: true,
    residencyStatus: 'citizen',
    
    // Personal Information
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    
    // Identity Documents
    ssn: '',
    passportNumber: '',
    passportCountry: '',
    nationalId: '',
    taxId: '',
    
    // Contact Information  
    email: '',
    phone: '',
    alternatePhone: '',
    
    // Address Information
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    addressCountry: 'US',
    residenceDuration: '2_plus_years',
    previousAddress: '',
    
    // Employment Information
    employmentStatus: 'employed',
    employer: '',
    jobTitle: '',
    workAddress: '',
    annualIncome: '',
    incomeSource: 'employment',
    
    // Account Credentials (auto-generated)
    username: '',
    temporaryPassword: '',
    
    // Account Details
    accountType: 'checking',
    accountNumber: '',
    routingNumber: '',
    accountPurpose: 'personal_banking',
    expectedMonthlyTransactions: 'low',
    expectedTransactionAmount: 'under_10k',
    initialDeposit: '',
    currency: 'USD',
    branchCode: 'HQ001',
    
    // Banking Features  
    onlineBanking: true,
    mobileApp: true,
    debitCard: true,
    checkbook: false,
    wireTransfers: false,
    internationalWires: false,
    
    // International Banking
    foreignBankAccounts: false,
    foreignAccountDetails: '',
    correspondentBankNeeded: false,
    
    // Compliance & Risk
    fatcaStatus: false,
    crsReporting: false,
    pep: false,
    sanctionsScreening: 'clear',
    amlCompliance: 'standard',
    riskProfile: 'low',
    
    // Funding
    fundingSource: 'personal_savings',
    
    // Authorization
    authorizedBy: '',
    approvalRequired: false,
    reviewNotes: '',
    
    // Additional required fields
    customerId: '',
    userId: '',
    accountHolderName: '',
    userEmail: '',
    customerName: '',
    customerEmail: '',
    overdraftProtection: false,
    
    // Product features
    productFeatures: {
      mobileDeposit: false,
      billPay: false,
      p2pTransfers: false,
      internationalTransfers: false,
      investmentAccess: false,
      creditLineAccess: false
    },
    
    // Notification preferences
    notificationPreferences: {
      emailAlerts: true,
      smsAlerts: false,
      pushNotifications: true,
      transactionAlerts: true,
      securityAlerts: true,
      marketingEmails: false
    },
    
    // Statement preferences
    statementPreference: 'electronic',
    
    // Transaction limits
    dailyTransactionLimit: '2500',
    monthlyTransactionLimit: '10000',
    atmWithdrawalLimit: '500',
    onlineTransferLimit: '5000',
    
    // Additional compliance fields
    sourceOfFunds: 'employment',
    expectedMonthlyActivity: 'moderate',
    riskRating: 'low',
    reportingRequirements: 'standard',
    cddRequired: false,
    taxWithholding: false,
    
    // Document requirements
    documentsRequired: {
      governmentId: true,
      proofOfAddress: true,
      proofOfIncome: false,
      bankStatement: false,
      employmentLetter: false,
      taxReturn: false
    },
    
    // Additional account fields
    minimumBalance: '',
    monthlyFee: ''
  });

  // Account data - load from Firestore
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load accounts from Firestore
  React.useEffect(() => {
    const loadAccounts = async () => {
      try {
        const { collection, getDocs } = await import('firebase/firestore');
        const { db } = await import('../../config/firebase');
        
        const accountsSnapshot = await getDocs(collection(db, 'accounts'));
        const accountsData = accountsSnapshot.docs.map(doc => {
          const data = doc.data();
          
          // Extract or derive userId
          let userId = data.userId || data.createdBy;
          
          // If no userId field, try to extract from document ID pattern (userId_accountType)
          if (!userId && doc.id.includes('_')) {
            userId = doc.id.split('_')[0];
          }
          
          return {
            id: doc.id,
            ...data,
            userId: userId, // Ensure userId is always set
            // Ensure proper display fields
            userName: data.accountHolderName || 'Unknown User',
            userEmail: data.userEmail || 'No email',
            fullAccountNumber: data.accountNumber || 'No account number'
          };
        });
        
        console.log('ManageAccounts: Loaded accounts from Firestore:', accountsData);
        console.log('ManageAccounts: Account User IDs:', accountsData.map(acc => ({ id: acc.id, userId: acc.userId })));
        setAccounts(accountsData);
      } catch (error) {
        console.error('ManageAccounts: Error loading accounts:', error);
        setAccounts([]);
      } finally {
        setLoading(false);
      }
    };

    loadAccounts();
  }, []);

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = 
      account.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.accountNumber?.includes(searchTerm) ||
      account.fullAccountNumber?.includes(searchTerm);
    
    const accountStatus = account.status || (account.isActive ? 'active' : 'inactive');
    const matchesStatus = statusFilter === 'all' || accountStatus === statusFilter;
    const matchesType = typeFilter === 'all' || account.accountType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Calculate stats
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const activeAccounts = accounts.filter(acc => {
    const status = acc.status || (acc.isActive ? 'active' : 'inactive');
    return status === 'active';
  }).length;
  const inactiveAccounts = accounts.filter(acc => {
    const status = acc.status || (acc.isActive ? 'active' : 'inactive');
    return status === 'inactive';
  }).length;
  const frozenAccounts = accounts.filter(acc => acc.status === 'frozen').length;
  const averageBalance = accounts.length > 0 ? totalBalance / accounts.length : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'frozen': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'inactive': return Lock;
      case 'frozen': return Lock;
      case 'pending': return Clock;
      case 'closed': return AlertTriangle;
      default: return AlertTriangle;
    }
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'checking': return Wallet;
      case 'savings': return PiggyBank;
      case 'business': return Building;
      default: return CreditCard;
    }
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'checking': return 'bg-blue-100 text-blue-800';
      case 'savings': return 'bg-green-100 text-green-800';
      case 'business': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAccountAction = async (action: string, accountId: string) => {
    console.log(`${action} account ${accountId}`);
    
    if (action === 'edit') {
      const accountToEdit = accounts.find(acc => acc.id === accountId);
      if (accountToEdit) {
        console.log('🔧 Setting up edit for account:', { 
          id: accountToEdit.id, 
          userId: accountToEdit.userId,
          accountHolderName: accountToEdit.accountHolderName 
        });
        
        setEditAccountData({
          id: accountToEdit.id,
          userId: accountToEdit.userId, // Include userId in edit data
          accountHolderName: accountToEdit.accountHolderName || accountToEdit.userName || '',
          userEmail: accountToEdit.userEmail || accountToEdit.email || '',
          phone: accountToEdit.phone || '',
          accountType: accountToEdit.accountType || 'checking',
          balance: accountToEdit.balance || 0,
          currency: accountToEdit.currency || 'USD',
          accountNumber: accountToEdit.accountNumber || '',
          routingNumber: accountToEdit.routingNumber || '',
          isActive: accountToEdit.isActive,
          status: accountToEdit.status || (accountToEdit.isActive ? 'active' : 'inactive'),
          features: accountToEdit.features || {},
          // Address information
          addressLine1: accountToEdit.addressLine1 || '',
          addressLine2: accountToEdit.addressLine2 || '',
          city: accountToEdit.city || '',
          state: accountToEdit.state || '',
          postalCode: accountToEdit.postalCode || '',
          country: accountToEdit.country || 'US'
        });
        setShowEditAccountModal(true);
      }
      return;
    }
    
    if (action === 'activate' || action === 'deactivate') {
      const newStatus = action === 'activate';
      const statusText = newStatus ? 'active' : 'inactive';
      
      if (!window.confirm(`Are you sure you want to change this account status to ${statusText}?`)) {
        return;
      }

      try {
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../../config/firebase');
        
        // Update Firestore
        const accountRef = doc(db, 'accounts', accountId);
        await updateDoc(accountRef, {
          isActive: newStatus,
          status: statusText,
          updatedAt: new Date().toISOString()
        });
        
        // Update local state
        setAccounts(prevAccounts => 
          prevAccounts.map(account => 
            account.id === accountId 
              ? { ...account, isActive: newStatus, status: statusText }
              : account
          )
        );
        
        console.log(`✅ Account ${accountId} status changed to ${statusText}`);
        alert(`Account status changed to ${statusText} successfully!`);
        
      } catch (error) {
        console.error('Error updating account status:', error);
        alert('Failed to update account status. Please try again.');
      }
    }

    if (action === 'delete') {
      const accountToDelete = accounts.find(acc => acc.id === accountId);
      if (!accountToDelete) {
        alert('Account not found.');
        return;
      }

      // Comprehensive confirmation with account details
      const confirmMessage = `⚠️ PERMANENT DELETE CONFIRMATION ⚠️

Account Details:
• Account Holder: ${accountToDelete.accountHolderName || accountToDelete.userName || 'N/A'}
• Account Number: ${accountToDelete.accountNumber || 'N/A'}
• Balance: $${accountToDelete.balance || 0}
• Type: ${accountToDelete.accountType || 'N/A'}

⚠️ WARNING: This action cannot be undone! ⚠️

This will permanently delete:
✗ The entire account record
✗ All account data and history
✗ User access to this account

Type "DELETE" to confirm permanent deletion:`;

      const userInput = prompt(confirmMessage);
      
      if (userInput !== 'DELETE') {
        alert('Account deletion cancelled. You must type "DELETE" exactly to confirm.');
        return;
      }

      // Final confirmation
      if (!window.confirm('FINAL CONFIRMATION: Are you absolutely sure you want to permanently delete this account? This cannot be undone!')) {
        return;
      }

      try {
        const { doc, deleteDoc } = await import('firebase/firestore');
        const { db } = await import('../../config/firebase');
        
        console.log(`🗑️ Deleting account ${accountId}...`);
        
        // Delete from Firestore
        const accountRef = doc(db, 'accounts', accountId);
        await deleteDoc(accountRef);
        
        // Remove from local state
        setAccounts(prevAccounts => 
          prevAccounts.filter(account => account.id !== accountId)
        );
        
        console.log(`✅ Account ${accountId} deleted successfully`);
        alert(`Account for ${accountToDelete.accountHolderName || accountToDelete.userName} has been permanently deleted.`);
        
      } catch (error) {
        console.error('Error deleting account:', error);
        alert('Failed to delete account. Please try again or contact technical support.');
      }
    }
  };

  const handleEditAccountChange = (field: string, value: any) => {
    setEditAccountData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveAccountChanges = async () => {
    console.log('🔧 handleSaveAccountChanges called');
    console.log('🔧 editAccountData:', editAccountData);
    console.log('🔧 Account User ID:', editAccountData?.userId);
    console.log('🔧 Account Document ID:', editAccountData?.id);
    
    if (!editAccountData) {
      console.log('❌ No editAccountData found, returning');
      return;
    }

    try {
      console.log('🔧 Starting account update process...');
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase');
      
      console.log('🔧 Firebase imports successful');
      console.log('🔧 Account ID to update:', editAccountData.id);
      
      // Get original account to preserve userId
      const originalAccount = accounts.find(acc => acc.id === editAccountData.id);
      
      // Update Firestore
      const accountRef = doc(db, 'accounts', editAccountData.id);
      const updateData = {
        accountHolderName: editAccountData.accountHolderName,
        userEmail: editAccountData.userEmail,
        email: editAccountData.userEmail, // Ensure both email fields are updated
        phone: editAccountData.phone,
        accountType: editAccountData.accountType,
        balance: parseFloat(editAccountData.balance) || 0,
        currency: editAccountData.currency,
        isActive: editAccountData.isActive,
        status: editAccountData.status,
        features: editAccountData.features,
        // Address fields
        addressLine1: editAccountData.addressLine1,
        addressLine2: editAccountData.addressLine2,
        city: editAccountData.city,
        state: editAccountData.state,
        postalCode: editAccountData.postalCode,
        country: editAccountData.country,
        // Preserve userId field
        userId: originalAccount?.userId || editAccountData.userId,
        updatedAt: new Date().toISOString()
      };
      
      console.log('🔧 Update data with userId:', { 
        accountId: editAccountData.id, 
        userId: updateData.userId,
        originalUserId: originalAccount?.userId 
      });

      console.log('🔧 Updating Firestore with data:', updateData);
      await updateDoc(accountRef, updateData);
      console.log('🔧 Firestore update completed successfully');
      
      // Update local state
      setAccounts(prevAccounts => 
        prevAccounts.map(account => 
          account.id === editAccountData.id 
            ? { ...account, ...updateData, userName: editAccountData.accountHolderName }
            : account
        )
      );
      
      console.log('✅ Account updated successfully:', updateData);
      console.log('🔧 Local state updated');
      
      // Force refresh of debug panel by triggering a custom event
      window.dispatchEvent(new Event('accountUpdated'));
      
      // Show detailed success message
      const accountBeforeUpdate = accounts.find(acc => acc.id === editAccountData.id);
      const emailChanged = editAccountData.userEmail !== accountBeforeUpdate?.userEmail;
      const balanceChanged = parseFloat(editAccountData.balance) !== (accountBeforeUpdate?.balance || 0);
      
      let successMessage = 'Account information updated successfully!';
      if (emailChanged) {
        successMessage += `\n✉️ Email changed to: ${editAccountData.userEmail}`;
      }
      if (balanceChanged) {
        successMessage += `\n💰 Balance updated to: $${parseFloat(editAccountData.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      
      alert(successMessage);
      setShowEditAccountModal(false);
      setEditAccountData(null);
      
    } catch (error: any) {
      console.error('🔧 Error updating account:', error);
      console.error('🔧 Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack
      });
      alert(`Failed to update account: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditAccountModal(false);
    setEditAccountData(null);
  };

  const handleBalanceAdjustment = (accountId: string, amount: number) => {
    console.log(`Adjusting balance for account ${accountId} by ${amount}`);
    // In a real app, this would call an API to adjust balance
  };

  const handleCreateAccount = () => {
    // Navigate to comprehensive client account opening process
    navigate('/admin/open-client-account');
  };

  const handleCloseCreateAccountModal = () => {
    setShowCreateAccountModal(false);
    setCreateAccountStep(1);
    // Reset form data to initial state
    setNewAccountData(prev => ({
      ...prev,
      customerId: '',
      customerName: '',
      customerEmail: '',
      accountType: 'checking',
      accountPurpose: 'personal_banking',
      currency: 'USD',
      branchCode: 'HQ001',
      initialDeposit: '',
      minimumBalance: '',
      monthlyFee: '',
      dailyTransactionLimit: '',
      monthlyTransactionLimit: '',
      atmWithdrawalLimit: '',
      onlineTransferLimit: '',
      sourceOfFunds: 'employment',
      expectedMonthlyActivity: 'low',
      riskRating: 'low',
      cddRequired: false,
      statementPreference: 'electronic',
      fatcaStatus: false,
      taxWithholding: false,
      reportingRequirements: 'standard',
      authorizedBy: '',
      approvalRequired: false,
      reviewNotes: ''
    }));
  };

  const handleNextStep = () => {
    if (createAccountStep < 4) {
      setCreateAccountStep(createAccountStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (createAccountStep > 1) {
      setCreateAccountStep(createAccountStep - 1);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setNewAccountData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev] as any,
          [child]: value
        }
      }));
    } else {
      setNewAccountData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const generateAccountNumber = () => {
    // Generate a realistic bank account number
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `${newAccountData.branchCode}-${timestamp}-${random}`;
  };

  const calculateMinimumBalance = () => {
    const minimums = {
      checking: 100,
      savings: 500,
      business: 1000,
      premium: 2500
    };
    return minimums[newAccountData.accountType as keyof typeof minimums] || 100;
  };

  const calculateMonthlyFee = () => {
    const fees = {
      checking: 12,
      savings: 0,
      business: 25,
      premium: 0
    };
    return fees[newAccountData.accountType as keyof typeof fees] || 0;
  };

  const handleSubmitNewAccount = async () => {
    try {
      // Validate required fields
      if (!newAccountData.customerId || !newAccountData.accountType) {
        alert('Please select a customer and account type');
        return;
      }

      if (newAccountData.initialDeposit && parseFloat(newAccountData.initialDeposit) < calculateMinimumBalance()) {
        alert(`Initial deposit must be at least $${calculateMinimumBalance()} for ${newAccountData.accountType} accounts`);
        return;
      }

      // Generate account number
      const accountNumber = generateAccountNumber();

      // ✅ REAL ACCOUNT CREATION: Save to both Firestore and localStorage
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase');

      const accountData = {
        // Account identification
        accountNumber,
        accountHolderName: newAccountData.accountHolderName,
        userEmail: newAccountData.userEmail,
        email: newAccountData.userEmail,
        userId: newAccountData.userId, // This must be the user's UID
        
        // Account details
        accountType: newAccountData.accountType,
        balance: parseFloat(newAccountData.initialDeposit) || 0,
        currency: newAccountData.currency || 'USD',
        status: newAccountData.approvalRequired ? 'pending_approval' : 'active',
        isActive: !newAccountData.approvalRequired,
        
        // Account features
        features: {
          onlineBanking: true,
          mobileDeposit: true,
          billPay: true,
          transfers: true,
          overdraftProtection: newAccountData.overdraftProtection || false
        },
        
        // Account limits
        limits: {
          dailyWithdrawLimit: newAccountData.accountType === 'business' ? 10000 : 2500,
          dailyTransferLimit: newAccountData.accountType === 'business' ? 25000 : 10000,
          monthlyTransactions: 0
        },
        
        // Additional data
        phone: newAccountData.phone || '',
        addressLine1: newAccountData.addressLine1 || '',
        addressLine2: newAccountData.addressLine2 || '',
        city: newAccountData.city || '',
        state: newAccountData.state || '',
        postalCode: newAccountData.postalCode || '',
        country: newAccountData.country || 'US',
        minimumBalance: calculateMinimumBalance(),
        monthlyFee: calculateMonthlyFee(),
        
        // System fields
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.uid || 'admin'
      };

      console.log('🔥 Creating account in Firestore:', accountData);

      // Save to Firestore
      const accountId = `${newAccountData.userId}_${newAccountData.accountType}_${Date.now()}`;
      const accountRef = doc(db, 'accounts', accountId);
      await setDoc(accountRef, accountData);

      // Also save to localStorage for immediate client access
      const localAccountKey = `temp_account_${newAccountData.userId}`;
      const localAccountData = {
        id: accountId,
        ...accountData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(localAccountKey, JSON.stringify(localAccountData));

      console.log('✅ Account created successfully in both Firestore and localStorage');
      
      // Refresh accounts list
      const loadAccounts = async () => {
        const { collection, getDocs } = await import('firebase/firestore');
        const accountsSnapshot = await getDocs(collection(db, 'accounts'));
        const accountsData = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAccounts(accountsData);
      };
      await loadAccounts();

      alert(`✅ Account ${accountNumber} created successfully and saved to database!`);
      handleCloseCreateAccountModal();

    } catch (error) {
      console.error('Error creating account:', error);
      alert('Failed to create account. Please try again.');
    }
  };

  return (
    <AdminLayout 
      title="Account Management" 
      subtitle="Manage user bank accounts and balances"
    >
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Accounts</p>
                <p className="text-2xl font-bold text-gray-900">{accounts.length}</p>
                <p className="text-xs text-blue-500 mt-1">All account types</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900">${totalBalance.toLocaleString()}</p>
                <p className="text-xs text-green-500 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Healthy deposits
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Account Status</p>
                <p className="text-2xl font-bold text-gray-900">{activeAccounts} Active</p>
                <p className="text-xs text-gray-500 flex items-center mt-1">
                  <Lock className="w-3 h-3 mr-1" />
                  {inactiveAccounts} inactive accounts
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Balance</p>
                <p className="text-2xl font-bold text-gray-900">${averageBalance.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{frozenAccounts} frozen accounts</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search accounts, users, or account numbers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="frozen">Frozen</option>
                <option value="pending">Pending</option>
                <option value="closed">Closed</option>
              </select>
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="business">Business</option>
              </select>
            </div>
            
            <Button onClick={handleCreateAccount} className="flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Open Client Account
            </Button>
          </div>
        </Card>

        {/* Accounts Table */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Bank Accounts ({filteredAccounts.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Holder
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                        <span className="ml-2 text-gray-600">Loading accounts...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No accounts found. Create the first client account to get started.
                    </td>
                  </tr>
                ) : filteredAccounts.map((account) => {
                  const StatusIcon = getStatusIcon(account.status);
                  const TypeIcon = getAccountTypeIcon(account.accountType);
                  return (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {account.userName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {account.userEmail}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center mb-1">
                          <TypeIcon className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {account.accountNumber}
                          </span>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAccountTypeColor(account.accountType)}`}>
                          {account.accountType}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          ${account.balance.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {account.interestRate}% APY
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(account.status || (account.isActive ? 'active' : 'inactive'))}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {account.status || (account.isActive ? 'active' : 'inactive')}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="mb-1">
                          <span className="font-medium">{account.monthlyTransactions}</span> transactions
                        </div>
                        <div className="text-xs text-gray-500">
                          Last: {formatDate(account.lastTransaction)}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAccountAction('view', account.id)}
                            className="flex items-center"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          
                          {/* Status Toggle Button */}
                          {account.isActive || account.status === 'active' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAccountAction('deactivate', account.id)}
                              className="flex items-center text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <Lock className="w-3 h-3 mr-1" />
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAccountAction('activate', account.id)}
                              className="flex items-center text-green-600 border-green-200 hover:bg-green-50"
                            >
                              <Unlock className="w-3 h-3 mr-1" />
                              Activate
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAccountAction('edit', account.id)}
                            className="flex items-center"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAccountAction('delete', account.id)}
                            className="flex items-center text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance Adjustment</h3>
            <p className="text-sm text-gray-600 mb-4">Manually adjust account balances for corrections</p>
            <Button variant="outline" className="w-full">
              Adjust Balance
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status Control</h3>
            <p className="text-sm text-gray-600 mb-4">Manage account activation status</p>
            <div className="space-y-2">
              <Button variant="outline" className="w-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                View Active Accounts
              </Button>
              <Button variant="outline" className="w-full flex items-center justify-center text-gray-600">
                <Lock className="w-4 h-4 mr-2" />
                View Inactive Accounts
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Reports</h3>
            <p className="text-sm text-gray-600 mb-4">Generate detailed account reports</p>
            <Button variant="outline" className="w-full">
              Generate Report
            </Button>
          </Card>
        </div>

        {/* Modal removed - now redirects to comprehensive ClientAccountOpening */}
        {false && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Create New Account</h3>
                    <p className="text-sm text-gray-600">Step {createAccountStep} of 6 - Comprehensive Banking Account Opening</p>
                  </div>
                  <button
                    onClick={handleCloseCreateAccountModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Personal Info</span>
                    <span>Address & Contact</span>
                    <span>Employment</span>
                    <span>Account Setup</span>
                    <span>Compliance</span>
                    <span>Review & Create</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(createAccountStep / 6) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {/* Step 1: Personal Information */}
                {createAccountStep === 1 && (
                  <div className="space-y-6">
                    <div className="flex items-center mb-4">
                      <User className="w-5 h-5 text-red-600 mr-2" />
                      <h4 className="text-lg font-medium text-gray-900">Personal Information</h4>
                    </div>
                    
                    {/* Country & Citizenship */}
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <h5 className="text-md font-medium text-gray-800 mb-3 flex items-center">
                        <Globe className="w-4 h-4 mr-2" />
                        Country & Residency
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Country of Residence *
                          </label>
                          <select
                            value={newAccountData.country}
                            onChange={(e) => handleInputChange('country', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                          >
                            <option value="US">United States</option>
                            <option value="CA">Canada</option>
                            <option value="UK">United Kingdom</option>
                            <option value="AU">Australia</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            US Citizen
                          </label>
                          <select
                            value={newAccountData.isUSCitizen.toString()}
                            onChange={(e) => handleInputChange('isUSCitizen', e.target.value === 'true')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                          >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Residency Status
                          </label>
                          <select
                            value={newAccountData.residencyStatus}
                            onChange={(e) => handleInputChange('residencyStatus', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                          >
                            <option value="citizen">Citizen</option>
                            <option value="permanent_resident">Permanent Resident</option>
                            <option value="temporary_resident">Temporary Resident</option>
                            <option value="work_visa">Work Visa</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Personal Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          First Name *
                        </label>
                        <Input
                          type="text"
                          value={newAccountData.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          placeholder="Enter first name"
                          className="w-full"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Middle Name
                        </label>
                        <Input
                          type="text"
                          value={newAccountData.middleName}
                          onChange={(e) => handleInputChange('middleName', e.target.value)}
                          placeholder="Enter middle name (optional)"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Last Name *
                        </label>
                        <Input
                          type="text"
                          value={newAccountData.lastName}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          placeholder="Enter last name"
                          className="w-full"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date of Birth *
                        </label>
                        <Input
                          type="date"
                          value={newAccountData.dateOfBirth}
                          onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                          className="w-full"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Gender
                        </label>
                        <select
                          value={newAccountData.gender}
                          onChange={(e) => handleInputChange('gender', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        >
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                          <option value="prefer_not_to_say">Prefer not to say</option>
                        </select>
                      </div>
                    </div>

                    {/* Identity Documents */}
                    <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                      <h5 className="text-md font-medium text-gray-800 mb-3 flex items-center">
                        <Shield className="w-4 h-4 mr-2" />
                        Identity Documentation
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {newAccountData.isUSCitizen ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Social Security Number *
                            </label>
                            <Input
                              type="text"
                              value={newAccountData.ssn}
                              onChange={(e) => handleInputChange('ssn', e.target.value)}
                              placeholder="XXX-XX-XXXX"
                              className="w-full"
                            />
                          </div>
                        ) : (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Passport Number
                              </label>
                              <Input
                                type="text"
                                value={newAccountData.passportNumber}
                                onChange={(e) => handleInputChange('passportNumber', e.target.value)}
                                placeholder="Enter passport number"
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Passport Country
                              </label>
                              <Input
                                type="text"
                                value={newAccountData.passportCountry}
                                onChange={(e) => handleInputChange('passportCountry', e.target.value)}
                                placeholder="Issuing country"
                                className="w-full"
                              />
                            </div>
                          </>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tax ID (if applicable)
                          </label>
                          <Input
                            type="text"
                            value={newAccountData.taxId}
                            onChange={(e) => handleInputChange('taxId', e.target.value)}
                            placeholder="Enter tax identification number"
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Address & Contact Information */}
                {createAccountStep === 2 && (
                  <div className="space-y-6">
                    <div className="flex items-center mb-4">
                      <Settings className="w-5 h-5 text-red-600 mr-2" />
                      <h4 className="text-lg font-medium text-gray-900">Product Configuration & Features</h4>
                    </div>

                    {/* Product Features */}
                    <div>
                      <h5 className="text-md font-medium text-gray-800 mb-3 flex items-center">
                        <Smartphone className="w-4 h-4 mr-2" />
                        Banking Services & Features
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { key: 'onlineBanking', label: 'Online Banking', desc: 'Web-based banking access' },
                          { key: 'mobileBanking', label: 'Mobile Banking', desc: 'Mobile app access' },
                          { key: 'debitCard', label: 'Debit Card', desc: 'ATM and POS debit card' },
                          { key: 'checkbook', label: 'Checkbook', desc: 'Physical checkbook issuance' },
                          { key: 'overdraftProtection', label: 'Overdraft Protection', desc: 'Overdraft coverage service' },
                          { key: 'interestEarning', label: 'Interest Earning', desc: 'Earn interest on balance' }
                        ].map((feature) => (
                          <div key={feature.key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                            <div>
                              <h6 className="text-sm font-medium text-gray-900">{feature.label}</h6>
                              <p className="text-sm text-gray-600">{feature.desc}</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={newAccountData.productFeatures[feature.key as keyof typeof newAccountData.productFeatures]}
                              onChange={(e) => handleInputChange(`productFeatures.${feature.key}`, e.target.checked)}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Financial Configuration */}
                    <div>
                      <h5 className="text-md font-medium text-gray-800 mb-3 flex items-center">
                        <DollarSign className="w-4 h-4 mr-2" />
                        Financial Configuration
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Initial Deposit (USD)
                          </label>
                          <Input
                            type="number"
                            value={newAccountData.initialDeposit}
                            onChange={(e) => handleInputChange('initialDeposit', e.target.value)}
                            placeholder="1000.00"
                            className="w-full"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Minimum: ${calculateMinimumBalance()}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Minimum Balance (USD)
                          </label>
                          <Input
                            type="number"
                            value={calculateMinimumBalance()}
                            disabled
                            className="w-full bg-gray-50"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Based on account type
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Monthly Fee (USD)
                          </label>
                          <Input
                            type="number"
                            value={calculateMonthlyFee()}
                            disabled
                            className="w-full bg-gray-50"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Standard fee for account type
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Notification Preferences */}
                    <div>
                      <h5 className="text-md font-medium text-gray-800 mb-3 flex items-center">
                        <Bell className="w-4 h-4 mr-2" />
                        Notification Preferences
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { key: 'email', label: 'Email Notifications', desc: 'Account statements and alerts' },
                          { key: 'sms', label: 'SMS Notifications', desc: 'Text message alerts' },
                          { key: 'pushNotifications', label: 'Push Notifications', desc: 'Mobile app notifications' },
                          { key: 'lowBalanceAlerts', label: 'Low Balance Alerts', desc: 'Notify when balance is low' },
                          { key: 'transactionAlerts', label: 'Transaction Alerts', desc: 'Real-time transaction notifications' }
                        ].map((pref, index) => (
                          <div key={pref.key} className={`flex items-center justify-between p-3 border border-gray-200 rounded-lg ${index >= 4 ? 'md:col-span-2' : ''}`}>
                            <div>
                              <h6 className="text-sm font-medium text-gray-900">{pref.label}</h6>
                              <p className="text-sm text-gray-600">{pref.desc}</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={newAccountData.notificationPreferences[pref.key as keyof typeof newAccountData.notificationPreferences]}
                              onChange={(e) => handleInputChange(`notificationPreferences.${pref.key}`, e.target.checked)}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="text-md font-medium text-gray-800 mb-3">
                        Statement Preference
                      </h5>
                      <select
                        value={newAccountData.statementPreference}
                        onChange={(e) => handleInputChange('statementPreference', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                      >
                        <option value="electronic">Electronic Statements (Email/Online)</option>
                        <option value="paper">Paper Statements (Mailed)</option>
                        <option value="both">Both Electronic and Paper</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Step 3: Compliance & Limits */}
                {createAccountStep === 3 && (
                  <div className="space-y-6">
                    <div className="flex items-center mb-4">
                      <Shield className="w-5 h-5 text-red-600 mr-2" />
                      <h4 className="text-lg font-medium text-gray-900">Compliance & Transaction Limits</h4>
                    </div>

                    {/* Transaction Limits */}
                    <div>
                      <h5 className="text-md font-medium text-gray-800 mb-3 flex items-center">
                        <Target className="w-4 h-4 mr-2" />
                        Transaction Limits
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Daily Transaction Limit (USD)
                          </label>
                          <Input
                            type="number"
                            value={newAccountData.dailyTransactionLimit}
                            onChange={(e) => handleInputChange('dailyTransactionLimit', e.target.value)}
                            placeholder="5000"
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Monthly Transaction Limit (USD)
                          </label>
                          <Input
                            type="number"
                            value={newAccountData.monthlyTransactionLimit}
                            onChange={(e) => handleInputChange('monthlyTransactionLimit', e.target.value)}
                            placeholder="50000"
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            ATM Withdrawal Limit (USD/Day)
                          </label>
                          <Input
                            type="number"
                            value={newAccountData.atmWithdrawalLimit}
                            onChange={(e) => handleInputChange('atmWithdrawalLimit', e.target.value)}
                            placeholder="1000"
                            className="w-full"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Online Transfer Limit (USD/Day)
                          </label>
                          <Input
                            type="number"
                            value={newAccountData.onlineTransferLimit}
                            onChange={(e) => handleInputChange('onlineTransferLimit', e.target.value)}
                            placeholder="10000"
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Risk Assessment */}
                    <div>
                      <h5 className="text-md font-medium text-gray-800 mb-3 flex items-center">
                        <Scale className="w-4 h-4 mr-2" />
                        Risk Assessment & Compliance
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Source of Funds
                          </label>
                          <select
                            value={newAccountData.sourceOfFunds}
                            onChange={(e) => handleInputChange('sourceOfFunds', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                          >
                            <option value="employment">Employment Income</option>
                            <option value="business">Business Income</option>
                            <option value="investments">Investment Returns</option>
                            <option value="inheritance">Inheritance</option>
                            <option value="gift">Gift</option>
                            <option value="other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Expected Monthly Activity
                          </label>
                          <select
                            value={newAccountData.expectedMonthlyActivity}
                            onChange={(e) => handleInputChange('expectedMonthlyActivity', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                          >
                            <option value="low">Low (&lt; $10,000)</option>
                            <option value="medium">Medium ($10,000 - $50,000)</option>
                            <option value="high">High (&gt; $50,000)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Risk Rating
                          </label>
                          <select
                            value={newAccountData.riskRating}
                            onChange={(e) => handleInputChange('riskRating', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                          >
                            <option value="low">Low Risk</option>
                            <option value="medium">Medium Risk</option>
                            <option value="high">High Risk</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reporting Requirements
                          </label>
                          <select
                            value={newAccountData.reportingRequirements}
                            onChange={(e) => handleInputChange('reportingRequirements', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                          >
                            <option value="standard">Standard Reporting</option>
                            <option value="enhanced">Enhanced Due Diligence</option>
                            <option value="pep">PEP Monitoring</option>
                            <option value="sanctions">Sanctions Screening</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Compliance Flags */}
                    <div>
                      <h5 className="text-md font-medium text-gray-800 mb-3">Regulatory Compliance</h5>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div>
                            <h6 className="text-sm font-medium text-gray-900">Customer Due Diligence (CDD) Required</h6>
                            <p className="text-sm text-gray-600">Enhanced verification for high-risk customers</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={newAccountData.cddRequired}
                            onChange={(e) => handleInputChange('cddRequired', e.target.checked)}
                            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div>
                            <h6 className="text-sm font-medium text-gray-900">FATCA Status</h6>
                            <p className="text-sm text-gray-600">Foreign Account Tax Compliance Act reporting</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={newAccountData.fatcaStatus}
                            onChange={(e) => handleInputChange('fatcaStatus', e.target.checked)}
                            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div>
                            <h6 className="text-sm font-medium text-gray-900">Tax Withholding Required</h6>
                            <p className="text-sm text-gray-600">Backup withholding for tax reporting</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={newAccountData.taxWithholding}
                            onChange={(e) => handleInputChange('taxWithholding', e.target.checked)}
                            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div>
                            <h6 className="text-sm font-medium text-gray-900">Approval Required</h6>
                            <p className="text-sm text-gray-600">Account requires management approval before activation</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={newAccountData.approvalRequired}
                            onChange={(e) => handleInputChange('approvalRequired', e.target.checked)}
                            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Required Documents */}
                    <div>
                      <h5 className="text-md font-medium text-gray-800 mb-3 flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        Required Documentation
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { key: 'accountAgreement', label: 'Account Agreement', desc: 'Terms and conditions document' },
                          { key: 'signatureCard', label: 'Signature Card', desc: 'Authorized signature verification' },
                          { key: 'initialDepositSlip', label: 'Initial Deposit Slip', desc: 'Deposit documentation' },
                          { key: 'identityVerification', label: 'Identity Verification', desc: 'ID verification documents' }
                        ].map((doc) => (
                          <div key={doc.key} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                            <div>
                              <h6 className="text-sm font-medium text-gray-900">{doc.label}</h6>
                              <p className="text-sm text-gray-600">{doc.desc}</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={newAccountData.documentsRequired[doc.key as keyof typeof newAccountData.documentsRequired]}
                              onChange={(e) => handleInputChange(`documentsRequired.${doc.key}`, e.target.checked)}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Review & Create */}
                {createAccountStep === 4 && (
                  <div className="space-y-6">
                    <div className="flex items-center mb-4">
                      <CheckCircle className="w-5 h-5 text-red-600 mr-2" />
                      <h4 className="text-lg font-medium text-gray-900">Review & Create Account</h4>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-green-800">
                          <p className="font-medium mb-1">Account Ready for Creation</p>
                          <p>Please review all information before creating the account. Once created, this will establish a new banking relationship.</p>
                        </div>
                      </div>
                    </div>

                    {/* Account Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="p-4">
                        <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          Customer Information
                        </h5>
                        <div className="text-sm space-y-1">
                          <p><span className="text-gray-600">Customer ID:</span> {newAccountData.customerId}</p>
                          <p><span className="text-gray-600">Name:</span> {newAccountData.customerName}</p>
                          <p><span className="text-gray-600">Email:</span> {newAccountData.customerEmail}</p>
                          <p><span className="text-gray-600">Branch:</span> {newAccountData.branchCode}</p>
                        </div>
                      </Card>

                      <Card className="p-4">
                        <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                          <CreditCard className="w-4 h-4 mr-2" />
                          Account Details
                        </h5>
                        <div className="text-sm space-y-1">
                          <p><span className="text-gray-600">Type:</span> {newAccountData.accountType}</p>
                          <p><span className="text-gray-600">Purpose:</span> {newAccountData.accountPurpose}</p>
                          <p><span className="text-gray-600">Currency:</span> {newAccountData.currency}</p>
                          <p><span className="text-gray-600">Number:</span> {generateAccountNumber()}</p>
                        </div>
                      </Card>

                      <Card className="p-4">
                        <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                          <DollarSign className="w-4 h-4 mr-2" />
                          Financial Configuration
                        </h5>
                        <div className="text-sm space-y-1">
                          <p><span className="text-gray-600">Initial Deposit:</span> ${newAccountData.initialDeposit || '0'}</p>
                          <p><span className="text-gray-600">Minimum Balance:</span> ${calculateMinimumBalance()}</p>
                          <p><span className="text-gray-600">Monthly Fee:</span> ${calculateMonthlyFee()}</p>
                          <p><span className="text-gray-600">Daily Limit:</span> ${newAccountData.dailyTransactionLimit || 'Standard'}</p>
                        </div>
                      </Card>

                      <Card className="p-4">
                        <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                          <Shield className="w-4 h-4 mr-2" />
                          Risk & Compliance
                        </h5>
                        <div className="text-sm space-y-1">
                          <p><span className="text-gray-600">Risk Rating:</span> {newAccountData.riskRating}</p>
                          <p><span className="text-gray-600">Expected Activity:</span> {newAccountData.expectedMonthlyActivity}</p>
                          <p><span className="text-gray-600">CDD Required:</span> {newAccountData.cddRequired ? 'Yes' : 'No'}</p>
                          <p><span className="text-gray-600">Approval Status:</span> {newAccountData.approvalRequired ? 'Requires Approval' : 'Auto-Approve'}</p>
                        </div>
                      </Card>
                    </div>

                    {/* Features Summary */}
                    <Card className="p-4">
                      <h5 className="font-medium text-gray-900 mb-2">Selected Features & Services</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        {Object.entries(newAccountData.productFeatures).map(([key, enabled]) => (
                          enabled && (
                            <div key={key} className="flex items-center text-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </div>
                          )
                        ))}
                      </div>
                    </Card>

                    {/* Authorization Section */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-3">Authorization & Notes</h5>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Authorized By (Staff Member)
                          </label>
                          <Input
                            type="text"
                            value={newAccountData.authorizedBy}
                            onChange={(e) => handleInputChange('authorizedBy', e.target.value)}
                            placeholder="Enter your staff ID or name"
                            className="w-full"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Review Notes (Optional)
                          </label>
                          <textarea
                            value={newAccountData.reviewNotes}
                            onChange={(e) => handleInputChange('reviewNotes', e.target.value)}
                            placeholder="Add any special notes or instructions..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex">
                        <Info className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">Post-Creation Process</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Account number will be generated automatically</li>
                            <li>Customer will receive welcome materials</li>
                            <li>Required documents will be prepared for signature</li>
                            <li>Online banking access will be activated (if selected)</li>
                            <li>Debit card will be ordered and mailed (if selected)</li>
                            <li>Account will appear in customer's profile immediately</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-between">
                  <Button
                    onClick={handlePrevStep}
                    variant="outline"
                    disabled={createAccountStep === 1}
                    className="flex items-center"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  
                  <div className="flex space-x-3">
                    <Button
                      onClick={handleCloseCreateAccountModal}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    
                    {createAccountStep < 4 ? (
                      <Button
                        onClick={handleNextStep}
                        className="flex items-center"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmitNewAccount}
                        className="flex items-center"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Create Account
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Account Modal */}
        {showEditAccountModal && editAccountData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Edit Account Information</h3>
                    <p className="text-sm text-gray-600">Update account details, email, and contact information</p>
                  </div>
                  <button
                    onClick={handleCloseEditModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-6">
                  {/* Account Holder Information */}
                  <div>
                    <h4 className="text-md font-medium text-gray-800 mb-4 flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Account Holder Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name *
                        </label>
                        <Input
                          type="text"
                          value={editAccountData.accountHolderName}
                          onChange={(e) => handleEditAccountChange('accountHolderName', e.target.value)}
                          placeholder="Enter full name"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address *
                        </label>
                        <Input
                          type="email"
                          value={editAccountData.userEmail}
                          onChange={(e) => handleEditAccountChange('userEmail', e.target.value)}
                          placeholder="Enter email address"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <Input
                          type="tel"
                          value={editAccountData.phone}
                          onChange={(e) => handleEditAccountChange('phone', e.target.value)}
                          placeholder="Enter phone number"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Account Type
                        </label>
                        <select
                          value={editAccountData.accountType}
                          onChange={(e) => handleEditAccountChange('accountType', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        >
                          <option value="checking">Checking Account</option>
                          <option value="savings">Savings Account</option>
                          <option value="business">Business Account</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div>
                    <h4 className="text-md font-medium text-gray-800 mb-4 flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      Address Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Address Line 1
                        </label>
                        <Input
                          type="text"
                          value={editAccountData.addressLine1}
                          onChange={(e) => handleEditAccountChange('addressLine1', e.target.value)}
                          placeholder="Enter address"
                          className="w-full"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Address Line 2
                        </label>
                        <Input
                          type="text"
                          value={editAccountData.addressLine2}
                          onChange={(e) => handleEditAccountChange('addressLine2', e.target.value)}
                          placeholder="Apartment, suite, etc."
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City
                        </label>
                        <Input
                          type="text"
                          value={editAccountData.city}
                          onChange={(e) => handleEditAccountChange('city', e.target.value)}
                          placeholder="Enter city"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          State/Province
                        </label>
                        <Input
                          type="text"
                          value={editAccountData.state}
                          onChange={(e) => handleEditAccountChange('state', e.target.value)}
                          placeholder="Enter state"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Postal Code
                        </label>
                        <Input
                          type="text"
                          value={editAccountData.postalCode}
                          onChange={(e) => handleEditAccountChange('postalCode', e.target.value)}
                          placeholder="Enter postal code"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Country
                        </label>
                        <Input
                          type="text"
                          value={editAccountData.country}
                          onChange={(e) => handleEditAccountChange('country', e.target.value)}
                          placeholder="Enter country"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Account Details */}
                  <div>
                    <h4 className="text-md font-medium text-gray-800 mb-4 flex items-center">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Account Details
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Account Number
                        </label>
                        <Input
                          type="text"
                          value={editAccountData.accountNumber}
                          disabled
                          className="w-full bg-gray-50"
                        />
                        <p className="text-xs text-gray-500 mt-1">Cannot be changed</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Routing Number
                        </label>
                        <Input
                          type="text"
                          value={editAccountData.routingNumber}
                          disabled
                          className="w-full bg-gray-50"
                        />
                        <p className="text-xs text-gray-500 mt-1">Cannot be changed</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Account Balance (USD) 💰
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editAccountData.balance}
                          onChange={(e) => handleEditAccountChange('balance', e.target.value)}
                          placeholder="0.00"
                          className="w-full"
                        />
                        <p className="text-xs text-blue-600 mt-1">
                          💡 Edit the current account balance (supports decimals)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Account Status */}
                  <div>
                    <h4 className="text-md font-medium text-gray-800 mb-4 flex items-center">
                      <Settings className="w-4 h-4 mr-2" />
                      Account Status & Settings
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Account Status
                        </label>
                        <select
                          value={editAccountData.status}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            handleEditAccountChange('status', newStatus);
                            handleEditAccountChange('isActive', newStatus === 'active');
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="frozen">Frozen</option>
                          <option value="pending">Pending</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Currency
                        </label>
                        <select
                          value={editAccountData.currency}
                          onChange={(e) => handleEditAccountChange('currency', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        >
                          <option value="USD">USD - US Dollar</option>
                          <option value="EUR">EUR - Euro</option>
                          <option value="GBP">GBP - British Pound</option>
                          <option value="CAD">CAD - Canadian Dollar</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={handleCloseEditModal}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveAccountChanges}
                    className="flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ManageAccounts;
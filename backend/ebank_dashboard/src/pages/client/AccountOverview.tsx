import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CreditCard, 
  Download, 
  Eye, 
  EyeOff, 
  Calendar, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft,
  Filter,
  Search,
  ChevronRight,
  Copy,
  Shield,
  Clock,
  Settings,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserAccounts } from '../../hooks/useFirestore';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import ContactSupportModal from '../../components/modals/ContactSupportModal';
import toast from 'react-hot-toast';
// Debug utilities removed - client interface is production-ready

const AccountOverview: React.FC = () => {
  const { user } = useAuth();
  
  // Enhanced authentication and loading check
  const isUserReady = user && user.uid && user.uid.trim() !== '';
  
  // Optimized Firebase query for user accounts - only run if user is properly loaded
  const { data: accounts, loading: isLoadingAccounts, error: accountsError, refetch } = useUserAccounts(
    isUserReady ? user.uid : ''
  );
  
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [selectedAccount, setSelectedAccount] = useState('checking');
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [accountData, setAccountData] = useState<Record<string, any>>({});
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Handle accounts data and errors - ALL useEffect hooks must be called before returns
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      // Convert to accountData format for compatibility
      const accountDataMap: Record<string, any> = {};
      accounts.forEach(account => {
        const key = account.accountType || 'checking';
        accountDataMap[key] = account;
      });
      setAccountData(accountDataMap);
      setLastRefresh(new Date());
    }
  }, [accounts]);

  useEffect(() => {
    if (accountsError) {
      console.error('AccountOverview: Error loading accounts:', accountsError);
      
      // Check if this is an authentication-related error
      if (accountsError.includes('unauthenticated') || accountsError.includes('permission-denied') || accountsError.includes('Authentication required')) {
        console.log('AccountOverview: Authentication error detected, user may need to re-login');
        // For auth errors, show specific message
        toast.error('Session expired. Please log in again.');
        return;
      }
      
      // Check if it's a network/connection issue
      if (accountsError.includes('unavailable') || accountsError.includes('connection') || accountsError.includes('offline')) {
        console.log('AccountOverview: Network/connection error detected');
        toast.error('Connection issue. Please check your internet and try again.');
        return;
      }
      
      // Only show toast for other errors with cooldown to prevent spam
      const currentTime = Date.now();
      const lastErrorTime = localStorage.getItem('lastAccountErrorTime');
      const errorKey = `accountError_${user?.uid || 'anonymous'}`;
      const lastErrorMessage = localStorage.getItem(errorKey);
      
      // Show error toast with shorter cooldown (30 seconds) for better UX
      if (!lastErrorTime || 
          !lastErrorMessage || 
          lastErrorMessage !== accountsError ||
          currentTime - parseInt(lastErrorTime) > 30000) { // 30 seconds cooldown
        console.log('AccountOverview: Showing error toast for:', accountsError);
        
        // Show more specific error message
        if (accounts.length === 0 && !isLoadingAccounts) {
          toast.error('No accounts found. Contact support if you believe this is an error.');
        } else {
          toast.error('Unable to load account data. Click refresh to try again.');
        }
        
        localStorage.setItem('lastAccountErrorTime', currentTime.toString());
        localStorage.setItem(errorKey, accountsError);
      } else {
        console.log('AccountOverview: Suppressing duplicate error toast (cooldown active)');
      }
    } else {
      // Clear error state when there's no error
      const errorKey = `accountError_${user?.uid || 'anonymous'}`;
      localStorage.removeItem('lastAccountErrorTime');
      localStorage.removeItem(errorKey);
    }
  }, [accountsError, user?.uid, accounts.length, isLoadingAccounts]);

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Account data refreshed!');
      setLastRefresh(new Date());
    } catch (error) {
      toast.error('Failed to refresh account data');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const currentAccount = accountData[selectedAccount];

  // Don't render anything if user is not authenticated
  if (!user) {
    return (
      <DashboardLayout title="Account Overview" subtitle="View your account details and balances">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-500">Please log in to view your accounts.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  // Show loading if user is authenticating or accounts are loading
  if (!isUserReady || (isLoadingAccounts && !accounts.length)) {
    return (
      <DashboardLayout title="Account Overview" subtitle="View your account details and balances">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading your accounts...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Account Overview" subtitle="View and manage your account details">
      <div className="space-y-6">
        {/* Account Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-blue-800">📊 Account Status</h3>
              <p className="text-xs text-blue-700">Last updated: {lastRefresh.toLocaleTimeString()}</p>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Real-time account information • Auto-refreshes automatically
          </p>
        </div>

        {/* Account Loading State */}
        {isLoadingAccounts && accounts.length === 0 ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading your account information...</p>
          </div>
        ) : accountsError ? (
          /* Error State */
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-red-900 mb-2">Unable to Load Account Data</h3>
            <p className="text-red-700 mb-4">
              {accountsError.includes('unauthenticated') || accountsError.includes('Authentication required')
                ? 'Your session has expired. Please log in again.'
                : accountsError.includes('unavailable') || accountsError.includes('connection')
                ? 'Connection issue detected. Please check your internet connection.'
                : accountsError.includes('permission-denied')
                ? 'Access denied. Please contact support if this continues.'
                : 'There was an issue loading your accounts. This may be temporary.'
              }
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => setIsContactModalOpen(true)}
                className="px-4 py-2 bg-white text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                Contact Support
              </button>
            </div>
          </div>
        ) : accounts.length === 0 && Object.keys(accountData).length === 0 ? (
          /* Empty State */
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-6 h-6 text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Accounts Found</h3>
            <p className="text-gray-600 mb-4">
              You don't have any bank accounts yet. Contact your bank to open an account.
            </p>
            <button
              onClick={() => setIsContactModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Contact Support
            </button>
          </div>
        ) : (
          <>
            {/* Account Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(accountData).map(([key, account]: [string, any]) => (
                <div
                  key={key}
                  onClick={() => setSelectedAccount(key)}
                  className={`bg-white rounded-xl p-6 border-2 cursor-pointer transition-all hover:shadow-lg ${
                    selectedAccount === key
                      ? 'border-blue-500 shadow-lg'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 capitalize">
                          {account.accountName || `${account.accountType} Account`}
                        </h3>
                        <p className="text-sm text-gray-500">{account.accountNumber}</p>
                      </div>
                    </div>
                    {account.status && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        account.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {account.status}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {balanceVisible ? formatCurrency(account.balance || 0) : '••••••••'}
                    </p>
                    <p className="text-sm text-gray-500">Available Balance</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Account Details */}
            {currentAccount && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 capitalize">
                      {currentAccount.accountName || `${currentAccount.accountType} Account Details`}
                    </h2>
                    <button
                      onClick={() => setBalanceVisible(!balanceVisible)}
                      className="flex items-center space-x-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 rounded-md hover:bg-gray-100"
                    >
                      {balanceVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      <span>{balanceVisible ? 'Hide' : 'Show'} Balance</span>
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Account Information */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Account Number</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm">
                            {balanceVisible ? currentAccount.accountNumber : `****${currentAccount.accountNumber?.slice(-4) || '****'}`}
                          </span>
                          <button className="text-gray-400 hover:text-gray-600">
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Account Type</span>
                        <span className="text-sm font-medium capitalize">
                          {currentAccount.accountType || 'Checking'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Currency</span>
                        <span className="text-sm font-medium">
                          {currentAccount.currency || 'USD'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Status</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          currentAccount.status === 'active' || currentAccount.isActive
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {currentAccount.status || (currentAccount.isActive ? 'Active' : 'Inactive')}
                        </span>
                      </div>
                    </div>

                    {/* Balance Information */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Available Balance</span>
                        <span className="text-lg font-bold text-gray-900">
                          {balanceVisible ? formatCurrency(currentAccount.balance || 0) : '••••••••'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Pending Transactions</span>
                        <span className="text-sm text-gray-600">$0.00</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Available Credit</span>
                        <span className="text-sm text-gray-600">Not Applicable</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500">Monthly Fee</span>
                        <span className="text-sm text-green-600">$0.00</span>
                      </div>
                    </div>

                    {/* Account Features */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-900">Account Features</h4>
                      <div className="space-y-2">
                        {currentAccount.features ? Object.entries(currentAccount.features).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <span className={`text-sm ${value ? 'text-green-600' : 'text-gray-400'}`}>
                              {value ? '✓' : '✗'}
                            </span>
                          </div>
                        )) : (
                          <div className="text-sm text-gray-500">No features configured</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* No Accounts State */}
        {!isLoadingAccounts && accounts.length === 0 && (
          <div className="bg-white rounded-lg p-8 text-center border-2 border-dashed border-gray-200">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Accounts Found</h3>
            <p className="text-gray-600 mb-4">You don't have any accounts set up yet.</p>
            <button
              onClick={() => setIsContactModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Contact Support
            </button>
          </div>
        )}
      </div>

      {/* Contact Support Modal */}
      {isContactModalOpen && (
        <ContactSupportModal
          isOpen={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
        />
      )}
    </DashboardLayout>
  );
};

export default AccountOverview;
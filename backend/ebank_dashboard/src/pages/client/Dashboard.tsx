import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownLeft, 
  DollarSign, 
  Eye, 
  EyeOff,
  Plus,
  Send,
  Download,
  Bell,
  Settings,
  LogOut,
  Home,
  History,
  Wallet,
  User,
  Menu,
  X,
  ChevronRight,
  Shield,
  PieChart,
  FileText,
  HelpCircle
} from 'lucide-react';
import LogoDisplay from '../../components/ui/LogoDisplay';
import SecuritySettings from '../../components/modals/SecuritySettings';

import { useAuth } from '../../contexts/AuthContext';
import { useSystemConfigContext } from '../../contexts/SystemConfigContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import toast from 'react-hot-toast';
import ContactSupportModal from '../../components/modals/ContactSupportModal';

const mockTransactions: any[] = [];

// Sidebar navigation items
const navigationItems = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: Home, 
    path: '/dashboard',
    description: 'Overview'
  },
  { 
    id: 'accounts', 
    label: 'Account Details', 
    icon: CreditCard, 
    path: '/account',
    description: 'View account information'
  },
  { 
    id: 'transactions', 
    label: 'Transaction History', 
    icon: History, 
    path: '/transactions',
    description: 'View all transactions'
  },
  { 
    id: 'transfer', 
    label: 'Transfer Money', 
    icon: Send, 
    path: '/transfer',
    description: 'Send funds'
  },
  { 
    id: 'deposit', 
    label: 'Deposit Funds', 
    icon: Plus, 
    path: '/deposit',
    description: 'Add money'
  },
  { 
    id: 'withdraw', 
    label: 'Withdraw Funds', 
    icon: Download, 
    path: '/withdraw',
    description: 'Cash out'
  },
  { 
    id: 'ewallets', 
    label: 'E-Wallets', 
    icon: Wallet, 
    path: '/ewallets',
    description: 'Digital wallets'
  },
  { 
    id: 'profile', 
    label: 'Profile Settings', 
    icon: User, 
    path: '/profile',
    description: 'Manage account'
  }
];

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { config, loading: configLoading, getPrimaryLogo, getCompanyName } = useSystemConfigContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);

  // Load real account data from Firestore with real-time updates
  useEffect(() => {
    if (!user) return;

    let unsubscribe: () => void;

    const setupRealtimeAccounts = async () => {
      try {
        setIsLoadingAccounts(true);
        console.log('Dashboard: Setting up real-time account monitoring for user:', user.uid);
        
        const { collection, query, where, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('../../config/firebase');
        
        // Create query for ALL accounts (not just active ones) so we can see status changes
        const accountsQuery = query(
          collection(db, 'accounts'),
          where('userId', '==', user.uid)
        );
        
        // Set up real-time listener
        unsubscribe = onSnapshot(accountsQuery, (snapshot) => {
          console.log('Dashboard: 🔄 Account data changed, updating...');
          
          if (!snapshot.empty) {
            const userAccounts = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              // Format display fields for compatibility
              type: doc.data().accountType || 'checking',
              primary: true // Mark first account as primary for now
            }));
            
            console.log('Dashboard: ✅ Real-time Firestore accounts updated:', userAccounts);
            setAccounts(userAccounts);
            
            // Update selected account if it was modified
            if (selectedAccount) {
              const updatedSelected = userAccounts.find(acc => acc.id === selectedAccount.id);
              if (updatedSelected) {
                console.log('Dashboard: 📝 Selected account updated:', updatedSelected);
                setSelectedAccount(updatedSelected);
              }
            } else if (userAccounts.length > 0) {
              setSelectedAccount(userAccounts[0]);
            }
          } else {
            console.log('Dashboard: ❌ No accounts found for user - contact support needed');
            setAccounts([]);
            setSelectedAccount(null);
          }
          
          setIsLoadingAccounts(false);
        }, (error) => {
          console.error('Dashboard: Real-time listener error:', error);
          setIsLoadingAccounts(false);
          setAccounts([]);
          setSelectedAccount(null);
        });
        
      } catch (error) {
        console.error('Dashboard: Error setting up real-time accounts:', error);
        setIsLoadingAccounts(false);
      }
    };

    setupRealtimeAccounts();
    
    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        console.log('Dashboard: Cleaning up real-time account listener');
        unsubscribe();
      }
    };
  }, [user?.uid]); // Only depend on user ID to avoid unnecessary re-subscriptions

  const handleSignOut = async () => {
    try {
      // Clear any cached data and sign out
      localStorage.clear(); // Clear any cached client data
      await signOut(auth);
      toast.success('Signed out successfully');
      
      // Redirect to client login page
      navigate('/client-login', { replace: true });
    } catch (error) {
      toast.error('Failed to sign out');
      console.error('Client logout error:', error);
      
      // Still redirect even if there was an error
      navigate('/client-login', { replace: true });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const totalBalance = accounts.reduce((sum: number, account: any) => sum + (account?.balance || 0), 0);

  // Show loading screen while SystemConfig is loading
  if (configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header - Enhanced Logo */}
          <div className="flex items-center justify-between px-6 py-8 border-b bg-white shadow-sm">
            <div className="flex items-center w-full">
              <div className="w-full max-w-xs">
                {!configLoading ? (
                  <LogoDisplay 
                    logoUrl={getPrimaryLogo()} 
                    companyName=""
                    fallbackIcon={<Shield className="w-16 h-16 text-blue-600" />}
                    className="w-full h-20 object-contain"
                  />
                ) : (
                  <div className="w-full h-20 flex items-center justify-center">
                    <img 
                      src="/sglogo.png"
                      alt="Logo"
                      className="w-full h-20 object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-blue-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Section */}
          <div className="px-6 py-4 border-b bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                {user?.firstName?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
                <div className="flex items-center mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-blue-700'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={`mr-4 w-5 h-5 transition-colors ${
                    isActive ? 'text-blue-700' : 'text-gray-500 group-hover:text-blue-700'
                  }`} />
                  <div className="flex-1">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${
                    isActive ? 'text-blue-700 rotate-90' : 'text-gray-400 group-hover:text-blue-700'
                  }`} />
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="px-4 py-4 border-t bg-gray-50">
            <div className="space-y-2">
              <Link 
                to="/dashboard/help" 
                className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <HelpCircle className="mr-4 w-5 h-5 text-gray-500" />
                <span>Help & Support</span>
              </Link>
              <button 
                onClick={handleSignOut}
                className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="mr-4 w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Dashboard Overview</h1>
                  <p className="text-sm text-gray-500">Welcome back, {user?.firstName}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full text-xs"></span>
                </button>
                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <Settings className="w-5 h-5" />
                </button>
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900">Last login</p>
                  <p className="text-xs text-gray-500">Today, 2:30 PM</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6 space-y-6">
          {/* Account Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Total Balance Card */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white col-span-1 md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Portfolio Value</p>
                  <div className="flex items-center space-x-3 mt-2">
                    {balanceVisible ? (
                      <span className="text-3xl font-bold">{formatCurrency(totalBalance)}</span>
                    ) : (
                      <span className="text-3xl font-bold">••••••••</span>
                    )}
                    <button
                      onClick={() => setBalanceVisible(!balanceVisible)}
                      className="p-1.5 hover:bg-blue-500 rounded-lg transition-colors"
                    >
                      {balanceVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-green-300 text-sm">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +2.4%
                  </div>
                  <p className="text-blue-100 text-xs">vs last month</p>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Link
                  to="/deposit"
                  className="bg-blue-500 hover:bg-blue-400 rounded-lg p-3 text-center transition-colors group"
                >
                  <Plus className="w-5 h-5 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">Deposit</span>
                </Link>
                <Link
                  to="/withdraw"
                  className="bg-blue-500 hover:bg-blue-400 rounded-lg p-3 text-center transition-colors group"
                >
                  <Download className="w-5 h-5 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">Withdraw</span>
                </Link>
                <Link
                  to="/transfer"
                  className="bg-blue-500 hover:bg-blue-400 rounded-lg p-3 text-center transition-colors group"
                >
                  <Send className="w-5 h-5 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">Transfer</span>
                </Link>
                <button
                  onClick={() => setShowSecuritySettings(true)}
                  className="bg-blue-500 hover:bg-blue-400 rounded-lg p-3 text-center transition-colors group"
                >
                  <Shield className="w-5 h-5 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">Security</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/transactions"
                  className="bg-blue-500 hover:bg-blue-400 rounded-lg p-3 text-center transition-colors group"
                >
                  <History className="w-5 h-5 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">History</span>
                </Link>
                <Link
                  to="/profile"
                  className="bg-blue-500 hover:bg-blue-400 rounded-lg p-3 text-center transition-colors group"
                >
                  <User className="w-5 h-5 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">Profile</span>
                </Link>
              </div>
            </div>

            {/* Account Cards */}
            {isLoadingAccounts ? (
              <div className="bg-white rounded-xl p-8 border-2 border-dashed border-gray-200 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading your accounts...</p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="bg-white rounded-xl p-8 border-2 border-dashed border-gray-200 text-center">
                <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Accounts Available</h3>
                <p className="text-gray-500 mb-4">Contact support to open your first bank account.</p>
                <button 
                  onClick={() => setIsContactModalOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Contact Support
                </button>
              </div>
            ) : (
              accounts.map((account: any) => (
              <div
                key={account.id}
                className={`bg-white rounded-xl p-6 border-2 transition-all cursor-pointer hover:shadow-lg ${
                  selectedAccount?.id === account.id
                    ? 'border-blue-500 shadow-lg'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => setSelectedAccount(account)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 capitalize">
                        {account.accountName || `${account.accountType || account.type} Account`}
                      </p>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-gray-500">
                          {balanceVisible ? account.accountNumber : `****${account.accountNumber?.slice(-4) || '****'}`}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBalanceVisible(!balanceVisible);
                          }}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          {balanceVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  {account.primary && (
                    <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
                      Primary
                    </span>
                  )}
                </div>
                
                {/* Account Balance */}
                <div className="mb-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {balanceVisible ? formatCurrency(account.balance || 0) : '••••••••'}
                  </p>
                  <p className="text-sm text-gray-500">Available Balance</p>
                </div>
                
                {/* Account Details */}
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Account Type</p>
                      <p className="font-medium capitalize">{account.accountType || account.type}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Status</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        account.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {account.status || 'Active'}
                      </span>
                    </div>
                  </div>
                  
                  {account.routingNumber && (
                    <div>
                      <p className="text-gray-500 text-sm">Routing Number</p>
                      <p className="font-medium text-sm">
                        {balanceVisible ? account.routingNumber : '•••••••••'}
                      </p>
                    </div>
                  )}
                  
                  {/* Account Features */}
                  {account.features && Object.keys(account.features).length > 0 && (
                    <div>
                      <p className="text-gray-500 text-sm mb-2">Account Features</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(account.features).map(([feature, enabled]) => 
                          enabled ? (
                            <span 
                              key={feature}
                              className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full"
                            >
                              {feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </span>
                          ) : null
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              ))
            )}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Recent Transactions */}
            <div className="xl:col-span-2">
              <div className="bg-white rounded-xl border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                  <Link
                    to="/transactions"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                  >
                    View All
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>

                <div className="space-y-4">
                  {mockTransactions.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No recent transactions</p>
                    </div>
                  ) : (
                    mockTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`p-2.5 rounded-lg ${
                          transaction.amount > 0 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {transaction.amount > 0 ? (
                            <ArrowUpRight className="w-5 h-5" />
                          ) : (
                            <ArrowDownLeft className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{transaction.description}</p>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500">{transaction.category}</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            <span className="text-sm text-gray-500">{transaction.date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          transaction.amount > 0 ? 'text-green-600' : 'text-gray-900'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">{transaction.type}</p>
                      </div>
                    </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="space-y-6">
              {/* Account Details */}
              {selectedAccount && (
                <div className="bg-white rounded-xl border p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Account Details</h3>
                    <Shield className="w-5 h-5 text-blue-500" />
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Account Holder</p>
                      <p className="text-gray-900">{user?.firstName} {user?.lastName}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Account Number</p>
                      <div className="flex items-center justify-between">
                        <p className="text-gray-900 font-mono">
                          {balanceVisible 
                            ? selectedAccount.accountNumber 
                            : `****${selectedAccount.accountNumber?.slice(-4) || '****'}`
                          }
                        </p>
                        <button
                          onClick={() => setBalanceVisible(!balanceVisible)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                        >
                          {balanceVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    {selectedAccount.routingNumber && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Routing Number</p>
                        <p className="text-gray-900 font-mono">
                          {balanceVisible ? selectedAccount.routingNumber : '•••••••••'}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Account Type</p>
                      <p className="text-gray-900 capitalize">{selectedAccount.accountType || selectedAccount.type}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Current Balance</p>
                      <p className="text-xl font-bold text-gray-900">
                        {balanceVisible ? formatCurrency(selectedAccount.balance || 0) : '••••••••'}
                      </p>
                    </div>
                    
                    {selectedAccount.features && Object.keys(selectedAccount.features).some(key => selectedAccount.features[key]) && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">Active Features</p>
                        <div className="space-y-1">
                          {Object.entries(selectedAccount.features)
                            .filter(([_, enabled]) => enabled)
                            .map(([feature, _]) => (
                              <div key={feature} className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm text-gray-700">
                                  {feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                </span>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    )}
                    
                    <div className="pt-3 border-t">
                      <p className="text-xs text-gray-500">
                        Account opened: {selectedAccount.createdAt ? 
                          new Date(selectedAccount.createdAt.toDate ? selectedAccount.createdAt.toDate() : selectedAccount.createdAt).toLocaleDateString() 
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly Summary */}
              <div className="bg-white rounded-xl border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Overview
                  </h3>
                  <PieChart className="w-5 h-5 text-gray-400" />
                </div>
                {/* Would calculate from actual transaction data */}
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Monthly Data Yet</h4>
                  <p className="text-gray-500 mb-4">Start making transactions to see your monthly overview</p>
                  <button
                    onClick={() => navigate('/transfer')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Make Your First Transaction
                  </button>
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-white rounded-xl border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Frequently Used</h3>
                <div className="space-y-3">
                  <Link
                    to="/account"
                    className="flex items-center justify-between p-3 hover:bg-blue-50 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-gray-500 group-hover:text-blue-600" />
                      <span className="text-gray-700 group-hover:text-blue-700">Account Statement</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                  </Link>
                  <Link
                    to="/ewallets"
                    className="flex items-center justify-between p-3 hover:bg-blue-50 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <Wallet className="w-5 h-5 text-gray-500 group-hover:text-blue-600" />
                      <span className="text-gray-700 group-hover:text-blue-700">Digital Wallets</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                  </Link>
                  <Link
                    to="/profile"
                    className="flex items-center justify-between p-3 hover:bg-blue-50 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <Settings className="w-5 h-5 text-gray-500 group-hover:text-blue-600" />
                      <span className="text-gray-700 group-hover:text-blue-700">Security Settings</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                  </Link>
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6">
                <div className="flex items-start space-x-3">
                  <Shield className="w-6 h-6 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-2">Security Notice</h4>
                    <p className="text-sm text-amber-800 mb-3">
                      Your account is protected with enterprise-grade security. Last security scan: Today
                    </p>
                    <button className="text-xs font-medium text-amber-700 hover:text-amber-800 underline">
                      Review Security Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Contact Support Modal */}
        <ContactSupportModal
          isOpen={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
          defaultSubject="Request to Open a New Bank Account"
          defaultCategory="account_opening"
        />

        {/* Security Settings Modal */}
        {showSecuritySettings && (
          <SecuritySettings
            onClose={() => setShowSecuritySettings(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
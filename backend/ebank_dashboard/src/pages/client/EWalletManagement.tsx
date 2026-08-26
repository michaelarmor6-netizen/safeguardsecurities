import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Smartphone, 
  CreditCard, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Menu,
  Bell,
  Settings,
  QrCode,
  Link as LinkIcon,
  Unlink,
  Eye,
  EyeOff,
  Zap,
  Wallet,
  Activity
} from 'lucide-react';
import DashboardLayout from '../../components/Layout/DashboardLayout';

// Available wallet providers
const availableWallets = [
  {
    id: 'applepay',
    name: 'Apple Pay',
    description: 'Link your iPhone or Apple Watch',
    logo: '🍎',
    color: 'bg-gray-800'
  },
  {
    id: 'googlepay',
    name: 'Google Pay',
    description: 'Connect your Android device',
    logo: '🔥',
    color: 'bg-blue-600'
  },
  {
    id: 'zelle',
    name: 'Zelle',
    description: 'Send money with just a phone number',
    logo: '⚡',
    color: 'bg-purple-600'
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'Connect your PayPal account',
    logo: '💙',
    color: 'bg-blue-500'
  },
  {
    id: 'venmo',
    name: 'Venmo',
    description: 'Link your Venmo account',
    logo: '💫',
    color: 'bg-sky-500'
  },
  {
    id: 'cashapp',
    name: 'Cash App',
    description: 'Connect your Cash App',
    logo: '💚',
    color: 'bg-green-500'
  }
];

const EWalletManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showBalances, setShowBalances] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDirection, setTransferDirection] = useState<'in' | 'out'>('in');
  
  // State for wallet data
  const [connectedWallets, setConnectedWallets] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load wallet data from Firebase
  React.useEffect(() => {
    const loadWalletData = async () => {
      try {
        // TODO: Load from Firebase
        // For now, set empty arrays to remove mock data
        setConnectedWallets([]);
        setRecentTransactions([]);
      } catch (error) {
        console.error('Error loading wallet data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWalletData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTotalBalance = () => {
    return connectedWallets.reduce((total: number, wallet: any) => total + (wallet.balance || 0), 0);
  };

  const handleWalletConnect = (wallet: any) => {
    setIsConnecting(true);
    // Simulate connection process
    setTimeout(() => {
      setIsConnecting(false);
      // Would typically show success message
    }, 2000);
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Total Balance */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Total E-Wallet Balance</h3>
          <button
            onClick={() => setShowBalances(!showBalances)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            {showBalances ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <div className="text-3xl font-bold">
          {showBalances ? formatCurrency(getTotalBalance()) : '••••••'}
        </div>
        <p className="text-blue-100 mt-2">Across {connectedWallets.length} connected wallets</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveTab('transfer')}
          className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
        >
          <ArrowUpRight className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-900">Transfer</p>
        </button>
        <button
          onClick={() => setActiveTab('receive')}
          className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
        >
          <ArrowDownLeft className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-900">Receive</p>
        </button>
        <button
          onClick={() => setActiveTab('sync')}
          className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
        >
          <RefreshCw className="w-8 h-8 text-purple-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-900">Sync All</p>
        </button>
        <button
          onClick={() => setActiveTab('connect')}
          className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
        >
          <Plus className="w-8 h-8 text-orange-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-900">Add Wallet</p>
        </button>
      </div>

      {/* Connected Wallets */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Connected Wallets</h3>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading wallets...</p>
          </div>
        ) : connectedWallets.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Connected Wallets</h4>
            <p className="text-gray-500 mb-4">Connect your first e-wallet to start managing your digital payments</p>
            <button
              onClick={() => setActiveTab('connect')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectedWallets.map((wallet: any) => (
            <div key={wallet.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-500 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 ${wallet.color} rounded-lg flex items-center justify-center text-white text-xl`}>
                    {wallet.logo}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{wallet.name}</h4>
                    <p className="text-sm text-gray-500">{wallet.email || wallet.username}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  wallet.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {wallet.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Balance:</span>
                  <span className="font-semibold">
                    {showBalances ? formatCurrency(wallet.balance) : '•••••'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Last Sync:</span>
                  <span className="text-xs text-gray-400">{wallet.lastSync}</span>
                </div>
              </div>

              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() => {
                    setSelectedWallet(wallet);
                    setTransferDirection('in');
                    setShowTransferModal(true);
                  }}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Transfer In
                </button>
                <button
                  onClick={() => {
                    setSelectedWallet(wallet);
                    setTransferDirection('out');
                    setShowTransferModal(true);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Transfer Out
                </button>
              </div>
            </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        {recentTransactions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Recent Activity</h4>
            <p className="text-gray-500">E-wallet transactions will appear here once you connect and use wallets</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg">
            {recentTransactions.map((transaction: any, index: number) => (
            <div key={transaction.id} className={`p-4 ${index !== recentTransactions.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <div className="flex items-center space-x-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  transaction.type === 'transfer_in' ? 'bg-green-100' :
                  transaction.type === 'transfer_out' ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                  {transaction.type === 'transfer_in' ? (
                    <ArrowDownLeft className="w-5 h-5 text-green-600" />
                  ) : transaction.type === 'transfer_out' ? (
                    <ArrowUpRight className="w-5 h-5 text-red-600" />
                  ) : (
                    <RefreshCw className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{transaction.description}</p>
                  <p className="text-sm text-gray-500">{transaction.wallet} • {transaction.date} {transaction.time}</p>
                </div>
                {transaction.amount > 0 && (
                  <span className={`font-semibold ${
                    transaction.type === 'transfer_in' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'transfer_in' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </span>
                )}
              </div>
            </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderConnect = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Add New Wallet</h3>
        <p className="text-gray-600">Connect additional e-wallets to manage all your digital money in one place</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableWallets.map((wallet) => (
          <div key={wallet.id} className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 transition-colors">
            <div className="text-center space-y-4">
              <div className={`w-16 h-16 ${wallet.color} rounded-lg flex items-center justify-center mx-auto text-white text-2xl`}>
                {wallet.logo}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{wallet.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{wallet.description}</p>
              </div>
              <button
                onClick={() => handleWalletConnect(wallet)}
                disabled={isConnecting}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isConnecting ? (
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Connecting...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <LinkIcon className="w-4 h-4" />
                    <span>Connect</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900">Secure Connection</p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1">
              <li>• Bank-level encryption for all connections</li>
              <li>• Your login credentials are never stored</li>
              <li>• Read-only access to balance information</li>
              <li>• Revoke access anytime from settings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Wallet Settings</h3>
        <p className="text-gray-600">Manage your connected wallets and preferences</p>
      </div>

      {/* Connected Wallets Management */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4 border-b border-gray-100">
          <h4 className="font-medium text-gray-900">Connected Wallets</h4>
        </div>
        {connectedWallets.length === 0 ? (
          <div className="p-8 text-center">
            <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No wallets connected yet</p>
            <button
              onClick={() => setActiveTab('connect')}
              className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Connect your first wallet
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {connectedWallets.map((wallet: any) => (
            <div key={wallet.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${wallet.color} rounded-lg flex items-center justify-center text-white`}>
                    {wallet.logo}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{wallet.name}</p>
                    <p className="text-sm text-gray-500">{wallet.email || wallet.username}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Unlink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Sync Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Synchronization</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Auto-sync balances</p>
              <p className="text-sm text-gray-500">Automatically update wallet balances every hour</p>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-6" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Push notifications</p>
              <p className="text-sm text-gray-500">Get notified of wallet transactions</p>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout title="E-Wallet Management" subtitle="Manage your digital wallets and transfers">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'overview', label: 'Overview', icon: Wallet },
              { id: 'connect', label: 'Add Wallet', icon: Plus },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'connect' && renderConnect()}
        {activeTab === 'settings' && renderSettings()}
      </div>

      {/* Transfer Modal */}
      {showTransferModal && selectedWallet && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Transfer {transferDirection === 'in' ? 'From' : 'To'} {selectedWallet.name}
                </h3>
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Available in {selectedWallet.name}: {formatCurrency(selectedWallet.balance)}
                  </p>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-800">
                    {transferDirection === 'in' 
                      ? `Transfer money from ${selectedWallet.name} to your bank account`
                      : `Send money from your bank account to ${selectedWallet.name}`
                    }
                  </p>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Process transfer
                    setShowTransferModal(false);
                    setTransferAmount('');
                  }}
                  disabled={!transferAmount || parseFloat(transferAmount) <= 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Transfer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default EWalletManagement;
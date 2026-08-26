import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  CreditCard, 
  MapPin, 
  Building2, 
  Clock, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Menu,
  Bell,
  Settings,
  DollarSign,
  Navigation,
  Phone,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserAccounts } from '../../hooks/useFirestore';
import DashboardLayout from '../../components/Layout/DashboardLayout';

const withdrawalMethods = [
  {
    id: 'atm',
    name: 'ATM Withdrawal',
    icon: CreditCard,
    description: 'Withdraw cash from any ATM in our network',
    fee: 'Free at partner ATMs',
    time: 'Instant',
    limits: 'Up to $500/day'
  },
  {
    id: 'branch',
    name: 'Bank Branch',
    icon: Building2,
    description: 'Visit a branch for cash withdrawal',
    fee: 'Free',
    time: 'During business hours',
    limits: 'No daily limit'
  },
  {
    id: 'debit',
    name: 'Debit Card Purchase',
    icon: CreditCard,
    description: 'Use your debit card for purchases',
    fee: 'Free',
    time: 'Instant',
    limits: 'Up to $2,500/day'
  }
];

// ATM location finder - would typically integrate with geolocation and bank ATM network

const WithdrawFunds: React.FC = () => {
  const { user } = useAuth();
  
  // Load user's real accounts from Firebase
  const { data: userAccounts, loading: accountsLoading, error: accountsError } = useUserAccounts(
    user?.uid || ''
  );

  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState(1); // 1: Method, 2: Details, 3: Confirmation
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState('');
  const [selectedAtm, setSelectedAtm] = useState<any>(null);
  
  // State for ATM data
  const [atmLocations, setAtmLocations] = useState<any[]>([]);
  const [loadingAtms, setLoadingAtms] = useState(false);

  // Set default account when user accounts load
  React.useEffect(() => {
    if (userAccounts && userAccounts.length > 0 && !selectedAccount) {
      setSelectedAccount(userAccounts[0].id || userAccounts[0].accountType || 'checking');
    }
  }, [userAccounts, selectedAccount]);

  // Load ATM locations (would integrate with geolocation and bank network)
  React.useEffect(() => {
    if (selectedMethod === 'atm') {
      setLoadingAtms(true);
      // Simulate loading ATM locations
      setTimeout(() => {
        setAtmLocations([]); // Empty for now - would fetch from API
        setLoadingAtms(false);
      }, 1000);
    }
  }, [selectedMethod]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getAvailableBalance = () => {
    if (!userAccounts) return 0;
    const account = userAccounts.find((acc: any) => (acc.id || acc.accountType) === selectedAccount);
    return account?.balance || 0;
  };

  // Loading state
  if (accountsLoading) {
    return (
      <DashboardLayout title="Withdraw Funds" subtitle="Access your money when you need it">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your accounts...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (accountsError) {
    return (
      <DashboardLayout title="Withdraw Funds" subtitle="Access your money when you need it">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h3 className="text-lg font-semibold text-red-900 mb-2">Unable to Load Account Information</h3>
            <p className="text-red-700 mb-4">Please contact support if this issue persists.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // No accounts state
  if (!userAccounts || userAccounts.length === 0) {
    return (
      <DashboardLayout title="Withdraw Funds" subtitle="Access your money when you need it">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Accounts Available</h3>
            <p className="text-gray-600 mb-4">You don't have any accounts available for withdrawal.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const renderMethodSelection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Choose Withdrawal Method</h2>
        <p className="text-gray-600">Select how you'd like to access your funds</p>
      </div>

      {/* From Account Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Withdraw From</label>
        <select
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {userAccounts?.map((account: any) => (
            <option key={account.id || account.accountType} value={account.id || account.accountType}>
              {account.accountHolderName || account.accountName || `${account.accountType} Account`} 
              {account.accountNumber ? ` ****${account.accountNumber.slice(-4)}` : ''} - {formatCurrency(account.balance || 0)}
            </option>
          ))}
        </select>
      </div>

      {/* Withdrawal Methods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {withdrawalMethods.map((method) => {
          const IconComponent = method.icon;
          return (
            <div
              key={method.id}
              onClick={() => {
                setSelectedMethod(method.id);
                setStep(2);
              }}
              className={`p-6 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-500 hover:bg-blue-50 ${
                selectedMethod === method.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
                  <IconComponent className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{method.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{method.description}</p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>Fee:</span>
                      <span className="text-green-600">{method.fee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time:</span>
                      <span>{method.time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Limit:</span>
                      <span>{method.limits}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Balance Display */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-700">Available Balance</p>
            <p className="text-2xl font-bold text-blue-900">{formatCurrency(getAvailableBalance())}</p>
          </div>
          <DollarSign className="w-8 h-8 text-blue-600" />
        </div>
      </div>
    </div>
  );

  const renderWithdrawalDetails = () => {
    const method = withdrawalMethods.find(m => m.id === selectedMethod);
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">{method?.name}</h2>
            <p className="text-gray-600">{method?.description}</p>
          </div>
          <button
            onClick={() => setStep(1)}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Change Method
          </button>
        </div>

        {/* Selected Account */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {userAccounts?.find((acc: any) => (acc.id || acc.accountType) === selectedAccount)?.accountHolderName || 
                 userAccounts?.find((acc: any) => (acc.id || acc.accountType) === selectedAccount)?.accountName ||
                 `${selectedAccount} Account`}
              </p>
              <p className="text-sm text-gray-500">
                {userAccounts?.find((acc: any) => (acc.id || acc.accountType) === selectedAccount)?.accountNumber ?
                  `****${userAccounts?.find((acc: any) => (acc.id || acc.accountType) === selectedAccount)?.accountNumber?.slice(-4)}` :
                  '****0000'
                } • Available: {formatCurrency(getAvailableBalance())}
              </p>
            </div>
          </div>
        </div>

        {/* Method-specific content */}
        {selectedMethod === 'atm' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Withdrawal Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">Daily ATM limit: $500</p>
            </div>

            {/* Quick Amount Buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quick Amounts</label>
              <div className="grid grid-cols-4 gap-2">
                {[20, 40, 60, 100].map((quickAmount) => (
                  <button
                    key={quickAmount}
                    onClick={() => setAmount(quickAmount.toString())}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    ${quickAmount}
                  </button>
                ))}
              </div>
            </div>

            {/* ATM Locations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Nearby ATM Locations</label>
              {loadingAtms ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Finding nearby ATMs...</p>
                </div>
              ) : atmLocations.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No ATMs Found</h4>
                  <p className="text-gray-500 mb-4">Enable location services or try a different area</p>
                  <button 
                    onClick={() => setLoadingAtms(true)}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Search Again
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {atmLocations.map((atm: any) => (
                  <div
                    key={atm.id}
                    onClick={() => setSelectedAtm(atm)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedAtm?.id === atm.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${!atm.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <MapPin className={`w-5 h-5 mt-0.5 ${atm.available ? 'text-green-600' : 'text-red-500'}`} />
                        <div>
                          <h4 className="font-medium text-gray-900">{atm.name}</h4>
                          <p className="text-sm text-gray-600">{atm.address}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>📍 {atm.distance}</span>
                            <span>🕒 {atm.hours}</span>
                            <span className="text-green-600">💰 {atm.fees}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="p-1 text-blue-600 hover:bg-blue-100 rounded">
                          <Navigation className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-blue-600 hover:bg-blue-100 rounded">
                          <Phone className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {!atm.available && (
                      <p className="text-xs text-red-600 mt-2">🔴 Temporarily out of service</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        {selectedMethod === 'branch' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Withdrawal Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">No daily limit at branch locations</p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-3">Required for Branch Withdrawal</h4>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Government-issued photo ID</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Your debit card or account number</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Signature verification</span>
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Branch Hours</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Monday - Friday: 9:00 AM - 5:00 PM</p>
                <p>Saturday: 9:00 AM - 2:00 PM</p>
                <p>Sunday: Closed</p>
              </div>
              <button className="mt-3 text-blue-600 text-sm hover:underline flex items-center space-x-1">
                <ExternalLink className="w-4 h-4" />
                <span>Find branch locations</span>
              </button>
            </div>
          </div>
        )}

        {selectedMethod === 'debit' && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Use Your Debit Card</h4>
              <p className="text-sm text-blue-800">
                Your debit card is ready to use for purchases and cash back at participating merchants.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">Daily Limits</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Purchases:</span>
                    <span>$2,500</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cash Back:</span>
                    <span>$200</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">PIN Security</h5>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="Enter PIN"
                      maxLength={4}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                    />
                    <button
                      onClick={() => setShowPin(!showPin)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">Verify your 4-digit PIN</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">Security Tips</p>
                  <ul className="text-sm text-amber-800 mt-2 space-y-1">
                    <li>• Never share your PIN with anyone</li>
                    <li>• Cover your PIN when entering at terminals</li>
                    <li>• Report lost or stolen cards immediately</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex space-x-4">
          <button
            onClick={() => setStep(1)}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => setStep(3)}
            disabled={
              (selectedMethod === 'atm' && (!amount || parseFloat(amount) <= 0 || !selectedAtm)) ||
              (selectedMethod === 'branch' && (!amount || parseFloat(amount) <= 0)) ||
              (selectedMethod === 'debit' && (!pin || pin.length !== 4))
            }
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    );
  };

  const renderConfirmation = () => {
    const method = withdrawalMethods.find(m => m.id === selectedMethod);
    
    return (
      <div className="text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            {selectedMethod === 'debit' ? 'Card Ready for Use' : 'Withdrawal Authorized'}
          </h2>
          <p className="text-gray-600 mt-2">
            {selectedMethod === 'debit' 
              ? 'Your debit card is ready for purchases and cash back'
              : selectedMethod === 'atm'
              ? 'You can now withdraw cash from the selected ATM'
              : 'Visit any branch during business hours'
            }
          </p>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          {amount && selectedMethod !== 'debit' && (
            <>
              <p className="text-lg font-semibold text-gray-900 mb-2">{formatCurrency(parseFloat(amount))}</p>
              <p className="text-gray-600">
                Available for withdrawal from {userAccounts?.find((acc: any) => (acc.id || acc.accountType) === selectedAccount)?.accountHolderName || 
                userAccounts?.find((acc: any) => (acc.id || acc.accountType) === selectedAccount)?.accountName ||
                `${selectedAccount} Account`}
              </p>
            </>
          )}
          
          {selectedMethod === 'atm' && selectedAtm && (
            <div className="mt-3 text-sm text-gray-600">
              <p className="font-medium">{selectedAtm.name}</p>
              <p>{selectedAtm.address}</p>
            </div>
          )}
          
          {selectedMethod === 'debit' && (
            <div className="text-gray-600">
              <p className="font-medium">Daily Limits Active</p>
              <p className="text-sm">Purchases: $2,500 • Cash Back: $200</p>
            </div>
          )}

          {selectedMethod !== 'debit' && (
            <p className="text-sm text-gray-500 mt-2">
              Authorization Code: WTH{Date.now()}
            </p>
          )}
        </div>

        <div className="flex space-x-4">
          <Link
            to="/account"
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-center"
          >
            View Account
          </Link>
          <button
            onClick={() => {
              setStep(1);
              setAmount('');
              setSelectedMethod('');
              setSelectedAtm(null);
              setPin('');
            }}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            New Withdrawal
          </button>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout title="Withdraw Funds" subtitle="Access your money when you need it">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= stepNumber ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > stepNumber ? '✓' : stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div className={`w-16 h-0.5 mx-2 ${
                    step > stepNumber ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl border p-8">
          {step === 1 && renderMethodSelection()}
          {step === 2 && renderWithdrawalDetails()}
          {step === 3 && renderConfirmation()}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default WithdrawFunds;
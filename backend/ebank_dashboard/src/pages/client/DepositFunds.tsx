import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  Camera, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  Menu,
  Bell,
  Settings,
  ArrowRight,
  Clock,
  Shield,
  DollarSign,
  FileImage
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserAccounts } from '../../hooks/useFirestore';
import DashboardLayout from '../../components/Layout/DashboardLayout';

const depositMethods = [
  {
    id: 'debit',
    name: 'Debit Card',
    icon: CreditCard,
    description: 'Instant deposit from your debit card',
    fee: '$0.50',
    time: 'Instant',
    limits: 'Up to $2,500/day'
  },
  {
    id: 'mobile-check',
    name: 'Mobile Check Deposit',
    icon: Smartphone,
    description: 'Take a photo of your check',
    fee: 'Free',
    time: '1-2 business days',
    limits: 'Up to $5,000/day'
  },
  {
    id: 'wire',
    name: 'Wire Transfer',
    icon: Building2,
    description: 'Receive wire from another bank',
    fee: '$15.00',
    time: 'Same day',
    limits: 'No limit'
  },
  {
    id: 'ach',
    name: 'External Transfer',
    icon: ArrowRight,
    description: 'Transfer from external account',
    fee: 'Free',
    time: '3-5 business days',
    limits: 'Up to $10,000/day'
  }
];

const DepositFunds: React.FC = () => {
  const { user } = useAuth();
  
  // Load user's real accounts from Firebase
  const { data: userAccounts, loading: accountsLoading, error: accountsError } = useUserAccounts(
    user?.uid || ''
  );

  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState(1); // 1: Method, 2: Details, 3: Confirmation
  const [checkImages, setCheckImages] = useState<{ front: string | null, back: string | null }>({
    front: null,
    back: null
  });

  // Set default account when user accounts load
  React.useEffect(() => {
    if (userAccounts && userAccounts.length > 0 && !selectedAccount) {
      setSelectedAccount(userAccounts[0].id || userAccounts[0].accountType || 'checking');
    }
  }, [userAccounts, selectedAccount]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleImageUpload = (side: 'front' | 'back', event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCheckImages(prev => ({
          ...prev,
          [side]: e.target?.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const renderMethodSelection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Choose Deposit Method</h2>
        <p className="text-gray-600">Select how you'd like to add money to your account</p>
      </div>

      {/* To Account Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Deposit To</label>
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

      {/* Deposit Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {depositMethods.map((method) => {
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
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <IconComponent className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{method.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{method.description}</p>
                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>Fee:</span>
                      <span className={method.fee === 'Free' ? 'text-green-600' : ''}>{method.fee}</span>
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
    </div>
  );

  const renderDepositDetails = () => {
    const method = depositMethods.find(m => m.id === selectedMethod);
    
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
                } •
                Current Balance: {formatCurrency(
                  userAccounts?.find((acc: any) => (acc.id || acc.accountType) === selectedAccount)?.balance || 0
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Method-specific forms */}
        {selectedMethod === 'debit' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
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
              <p className="text-sm text-gray-500 mt-1">Daily limit: $2,500</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Debit Card Number</label>
              <input
                type="text"
                placeholder="1234 5678 9012 3456"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                <input
                  type="text"
                  placeholder="MM/YY"
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">CVV</label>
                <input
                  type="text"
                  placeholder="123"
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {selectedMethod === 'mobile-check' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Check Amount</label>
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
              <p className="text-sm text-gray-500 mt-1">Daily limit: $5,000</p>
            </div>

            {/* Check Image Upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Front of Check */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Front of Check</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                  {checkImages.front ? (
                    <div className="space-y-2">
                      <img
                        src={checkImages.front}
                        alt="Check front"
                        className="w-full h-32 object-cover rounded-lg mx-auto"
                      />
                      <button
                        onClick={() => setCheckImages(prev => ({ ...prev, front: null }))}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Replace Image
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-2">Take a photo or upload image</p>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleImageUpload('front', e)}
                          className="hidden"
                        />
                        <span className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          <Upload className="w-4 h-4" />
                          <span>Upload</span>
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Back of Check */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Back of Check (Endorsed)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                  {checkImages.back ? (
                    <div className="space-y-2">
                      <img
                        src={checkImages.back}
                        alt="Check back"
                        className="w-full h-32 object-cover rounded-lg mx-auto"
                      />
                      <button
                        onClick={() => setCheckImages(prev => ({ ...prev, back: null }))}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Replace Image
                      </button>
                    </div>
                  ) : (
                    <div>
                      <FileImage className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-2">Sign and photograph the back</p>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => handleImageUpload('back', e)}
                          className="hidden"
                        />
                        <span className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                          <Upload className="w-4 h-4" />
                          <span>Upload</span>
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Check Deposit Tips */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Check Deposit Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Endorse the back by signing your name</li>
                <li>• Ensure all four corners are visible</li>
                <li>• Use good lighting and avoid shadows</li>
                <li>• Make sure the check is flat and not folded</li>
              </ul>
            </div>
          </div>
        )}

        {selectedMethod === 'wire' && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Wire Transfer Information</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Bank Name:</strong> SecureBank</p>
                <p><strong>Routing Number:</strong> 123456789</p>
                <p><strong>Account Number:</strong> 
                  {userAccounts?.find((acc: any) => (acc.id || acc.accountType) === selectedAccount)?.accountNumber ?
                    `****${userAccounts?.find((acc: any) => (acc.id || acc.accountType) === selectedAccount)?.accountNumber?.slice(-4)}` :
                    '****0000'
                  }
                </p>
                <p><strong>Account Name:</strong> Your Full Name</p>
                <p><strong>Bank Address:</strong> 123 Banking Street, Financial District, NY 10005</p>
              </div>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">Important Notice</p>
                  <p className="text-sm text-amber-800 mt-1">
                    Provide this information to the sending bank. Wire transfers typically arrive within 1-2 business hours during banking hours.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedMethod === 'ach' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
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
              <p className="text-sm text-gray-500 mt-1">Daily limit: $10,000</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">External Bank Name</label>
              <input
                type="text"
                placeholder="e.g., Chase, Bank of America"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Routing Number</label>
              <input
                type="text"
                placeholder="9 digit routing number"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
              <input
                type="text"
                placeholder="External account number"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
              <select className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
            </div>
          </div>
        )}

        {/* Fee Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-gray-600 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Deposit Information</p>
              <div className="text-sm text-gray-600 mt-2 space-y-1">
                <p>• Fee: <span className={method?.fee === 'Free' ? 'text-green-600' : ''}>{method?.fee}</span></p>
                <p>• Processing time: {method?.time}</p>
                <p>• Daily limit: {method?.limits}</p>
              </div>
            </div>
          </div>
        </div>

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
              !amount || 
              parseFloat(amount) <= 0 || 
              (selectedMethod === 'mobile-check' && (!checkImages.front || !checkImages.back))
            }
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {selectedMethod === 'wire' ? 'Continue' : 'Process Deposit'}
          </button>
        </div>
      </div>
    );
  };

  const renderConfirmation = () => (
    <div className="text-center space-y-6">
      <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle className="w-12 h-12 text-green-600" />
      </div>
      
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">
          {selectedMethod === 'wire' ? 'Wire Instructions Provided' : 'Deposit Submitted Successfully!'}
        </h2>
        <p className="text-gray-600 mt-2">
          {selectedMethod === 'wire' 
            ? 'Share the wire information with your sending bank'
            : 'Your deposit is being processed'
          }
        </p>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        {amount && (
          <>
            <p className="text-lg font-semibold text-gray-900 mb-2">{formatCurrency(parseFloat(amount))}</p>
            <p className="text-gray-600">
              {selectedMethod === 'wire' 
                ? 'Expected amount when wire is received'
                : `Being deposited to ${
                    userAccounts?.find((acc: any) => (acc.id || acc.accountType) === selectedAccount)?.accountHolderName || 
                    userAccounts?.find((acc: any) => (acc.id || acc.accountType) === selectedAccount)?.accountName ||
                    `${selectedAccount} Account`
                  }`
              }
            </p>
          </>
        )}
        
        {selectedMethod !== 'wire' && (
          <p className="text-sm text-gray-500 mt-2">
            Reference ID: DEP{Date.now()}
          </p>
        )}
        
        <div className="flex items-center justify-center space-x-2 mt-3">
          <Clock className="w-4 h-4 text-gray-500" />
          <p className="text-sm text-gray-500">
            {depositMethods.find(m => m.id === selectedMethod)?.time}
          </p>
        </div>
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
            setCheckImages({ front: null, back: null });
          }}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Make Another Deposit
        </button>
      </div>
    </div>
  );

  return (
    <DashboardLayout title="Deposit Funds" subtitle="Add money to your account">
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
          {step === 2 && renderDepositDetails()}
          {step === 3 && renderConfirmation()}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DepositFunds;
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Plus, 
  User, 
  CreditCard, 
  Shield, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Edit,
  Trash2,
  Search
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserAccounts } from '../../hooks/useFirestore';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { db } from '../../config/firebase';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const TransferFunds: React.FC = () => {
  const { user } = useAuth();
  
  // Load user's real accounts from Firebase
  const { data: userAccounts, loading: accountsLoading, error: accountsError } = useUserAccounts(
    user?.uid || ''
  );

  const [step, setStep] = useState(1); // 1: Select recipient, 2: Transfer details, 3: Review, 4: Confirmation
  const [transferType, setTransferType] = useState('existing'); // 'existing' or 'new'
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [fromAccount, setFromAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [transferDate, setTransferDate] = useState('today');
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Recipients state
  const [savedRecipients, setSavedRecipients] = useState<any[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(true);

  // New recipient form
  const [newRecipient, setNewRecipient] = useState({
    name: '',
    email: '',
    accountNumber: '',
    iban: '',
    routingNumber: '',
    swiftCode: '',
    bankName: '',
    bankAddress: '',
    country: 'US',
    currency: 'USD',
    transferType: 'domestic', // 'domestic', 'international'
    type: 'External'
  });

  // Set default account when user accounts load
  useEffect(() => {
    if (userAccounts && userAccounts.length > 0 && !fromAccount) {
      setFromAccount(userAccounts[0].id || userAccounts[0].accountType || 'checking');
    }
  }, [userAccounts, fromAccount]);

  // Load user's saved recipients from Firebase
  useEffect(() => {
    const loadRecipients = async () => {
      if (!user?.uid) return;
      
      try {
        setRecipientsLoading(true);
        const recipientsQuery = query(
          collection(db, 'transfer_recipients'),
          where('userId', '==', user.uid)
        );
        const recipientsSnapshot = await getDocs(recipientsQuery);
        const recipients = recipientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSavedRecipients(recipients);
      } catch (error) {
        console.error('Error loading recipients:', error);
        toast.error('Failed to load recipients');
      } finally {
        setRecipientsLoading(false);
      }
    };

    loadRecipients();
  }, [user?.uid]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const filteredRecipients = savedRecipients.filter(recipient =>
    recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipient.bankName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddRecipient = async () => {
    // Validation based on transfer type
    const isInternational = newRecipient.transferType === 'international';
    
    if (!user?.uid || !newRecipient.name || !newRecipient.bankName) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (isInternational) {
      if (!newRecipient.iban && !newRecipient.accountNumber) {
        toast.error('Please provide either IBAN or Account Number for international transfers');
        return;
      }
      if (!newRecipient.swiftCode) {
        toast.error('SWIFT/BIC code is required for international transfers');
        return;
      }
    } else {
      if (!newRecipient.accountNumber || !newRecipient.routingNumber) {
        toast.error('Account Number and Routing Number are required for domestic transfers');
        return;
      }
    }

    try {
      const recipientData = {
        userId: user.uid,
        name: newRecipient.name,
        email: newRecipient.email,
        accountNumber: newRecipient.accountNumber,
        iban: newRecipient.iban,
        routingNumber: newRecipient.routingNumber,
        swiftCode: newRecipient.swiftCode,
        bankName: newRecipient.bankName,
        bankAddress: newRecipient.bankAddress,
        country: newRecipient.country,
        currency: newRecipient.currency,
        transferType: newRecipient.transferType,
        type: newRecipient.type,
        favorite: false,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'transfer_recipients'), recipientData);
      
      // Add to local state
      setSavedRecipients(prev => [...prev, { id: docRef.id, ...recipientData }]);
      
      // Reset form
      setNewRecipient({
        name: '',
        email: '',
        accountNumber: '',
        iban: '',
        routingNumber: '',
        swiftCode: '',
        bankName: '',
        bankAddress: '',
        country: 'US',
        currency: 'USD',
        transferType: 'domestic',
        type: 'External'
      });
      
      setShowAddRecipient(false);
      toast.success('Recipient added successfully!');
    } catch (error) {
      console.error('Error adding recipient:', error);
      toast.error('Failed to add recipient');
    }
  };

  const handleDeleteRecipient = async (recipientId: string) => {
    try {
      await deleteDoc(doc(db, 'transfer_recipients', recipientId));
      setSavedRecipients(prev => prev.filter(r => r.id !== recipientId));
      toast.success('Recipient deleted successfully!');
    } catch (error) {
      console.error('Error deleting recipient:', error);
      toast.error('Failed to delete recipient');
    }
  };

  const handleTransfer = async () => {
    try {
      // Create transfer record
      const transferData = {
        userId: user?.uid,
        fromAccountId: fromAccount,
        recipientId: selectedRecipient?.id,
        amount: parseFloat(amount),
        memo: memo,
        transferDate: transferDate,
        status: 'completed',
        transactionId: `TXN${Date.now()}`,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'transfers'), transferData);
      toast.success('Transfer completed successfully!');
      setStep(4);
    } catch (error) {
      console.error('Error processing transfer:', error);
      toast.error('Failed to process transfer');
    }
  };

  // Loading state
  if (accountsLoading || recipientsLoading) {
    return (
      <DashboardLayout title="Transfer Money" subtitle="Send money to friends, family, or other accounts">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your accounts and recipients...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (accountsError) {
    return (
      <DashboardLayout title="Transfer Money" subtitle="Send money to friends, family, or other accounts">
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
      <DashboardLayout title="Transfer Money" subtitle="Send money to friends, family, or other accounts">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Accounts Available</h3>
            <p className="text-gray-600 mb-4">You don't have any accounts available for transfers.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const renderRecipientSelection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Select Recipient</h2>
        <button
          onClick={() => setShowAddRecipient(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Recipient</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search recipients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Recipients List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredRecipients.map((recipient) => (
          <div
            key={recipient.id}
            onClick={() => {
              setSelectedRecipient(recipient);
              setStep(2);
            }}
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  recipient.type === 'Internal' ? 'bg-green-100' : 'bg-blue-100'
                }`}>
                  {recipient.type === 'Internal' ? (
                    <CreditCard className="w-6 h-6 text-green-600" />
                  ) : (
                    <User className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{recipient.name}</h3>
                  <p className="text-sm text-gray-500">{recipient.bankName} • {recipient.accountNumber}</p>
                  <p className="text-xs text-gray-400">{recipient.type} Account</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {recipient.favorite && (
                  <span className="text-yellow-500">⭐</span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this recipient?')) {
                      handleDeleteRecipient(recipient.id);
                    }
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTransferDetails = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Transfer Details</h2>
        <button
          onClick={() => setStep(1)}
          className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          Change Recipient
        </button>
      </div>

      {/* Selected Recipient */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            selectedRecipient?.type === 'Internal' ? 'bg-green-100' : 'bg-blue-100'
          }`}>
            {selectedRecipient?.type === 'Internal' ? (
              <CreditCard className="w-5 h-5 text-green-600" />
            ) : (
              <User className="w-5 h-5 text-blue-600" />
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{selectedRecipient?.name}</p>
            <p className="text-sm text-gray-500">{selectedRecipient?.bankName} • {selectedRecipient?.accountNumber}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* From Account */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">From Account</label>
          <select
            value={fromAccount}
            onChange={(e) => setFromAccount(e.target.value)}
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

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Transfer Amount</label>
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
          <p className="text-sm text-gray-500 mt-1">
            Available: {formatCurrency(
              userAccounts?.find((acc: any) => (acc.id || acc.accountType) === fromAccount)?.balance || 0
            )}
          </p>
        </div>
      </div>

      {/* When */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">When to Send</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setTransferDate('today')}
            className={`p-3 border-2 rounded-lg text-left transition-colors ${
              transferDate === 'today'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <div>
                <p className="font-medium">Send Now</p>
                <p className="text-sm text-gray-500">Instant transfer</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => setTransferDate('scheduled')}
            className={`p-3 border-2 rounded-lg text-left transition-colors ${
              transferDate === 'scheduled'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <div>
                <p className="font-medium">Schedule Later</p>
                <p className="text-sm text-gray-500">Choose date & time</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Memo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Memo (Optional)</label>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="What's this transfer for?"
          className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Transfer Fee Info */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900">Transfer Information</p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1">
              <li>• Internal transfers are free and instant</li>
              <li>• External transfers may take 1-3 business days</li>
              <li>• Daily limit: $5,000 per account</li>
            </ul>
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
          disabled={!amount || parseFloat(amount) <= 0}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Review Transfer
        </button>
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900">Review Transfer</h2>

      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <div className="text-center mb-6">
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(parseFloat(amount))}</p>
          <p className="text-gray-500 mt-1">Transfer Amount</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">From</span>
            <span className="font-medium">
              {userAccounts?.find((acc: any) => (acc.id || acc.accountType) === fromAccount)?.accountHolderName || 
               userAccounts?.find((acc: any) => (acc.id || acc.accountType) === fromAccount)?.accountName ||
               `${fromAccount} Account`}
              {userAccounts?.find((acc: any) => (acc.id || acc.accountType) === fromAccount)?.accountNumber ?
                ` ****${userAccounts?.find((acc: any) => (acc.id || acc.accountType) === fromAccount)?.accountNumber?.slice(-4)}` :
                ''
              }
            </span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">To</span>
            <span className="font-medium">{selectedRecipient?.name}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">Bank</span>
            <span className="font-medium">{selectedRecipient?.bankName}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-100">
            <span className="text-gray-600">When</span>
            <span className="font-medium">{transferDate === 'today' ? 'Now' : 'Scheduled'}</span>
          </div>
          {memo && (
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">Memo</span>
              <span className="font-medium">{memo}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-3">
            <span className="text-gray-600">Fee</span>
            <span className="font-medium text-green-600">Free</span>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">Please Review Carefully</p>
            <p className="text-sm text-amber-800 mt-1">
              Make sure all details are correct before confirming. Transfers cannot be cancelled once processed.
            </p>
          </div>
        </div>
      </div>

      <div className="flex space-x-4">
        <button
          onClick={() => setStep(2)}
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Edit Details
        </button>
        <button
          onClick={handleTransfer}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Confirm Transfer
        </button>
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="text-center space-y-6">
      <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle className="w-12 h-12 text-green-600" />
      </div>
      
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Transfer Successful!</h2>
        <p className="text-gray-600 mt-2">Your transfer has been processed successfully.</p>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        <p className="text-lg font-semibold text-gray-900 mb-2">{formatCurrency(parseFloat(amount))}</p>
        <p className="text-gray-600">sent to {selectedRecipient?.name}</p>
        <p className="text-sm text-gray-500 mt-2">Transaction ID: TXN{Date.now()}</p>
      </div>

      <div className="flex space-x-4">
        <Link
          to="/transactions"
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-center"
        >
          View Transaction
        </Link>
        <button
          onClick={() => {
            setStep(1);
            setAmount('');
            setMemo('');
            setSelectedRecipient(null);
          }}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Send Another
        </button>
      </div>
    </div>
  );

  return (
    <DashboardLayout title="Transfer Money" subtitle="Send money to friends, family, or other accounts">
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
          {step === 1 && renderRecipientSelection()}
          {step === 2 && renderTransferDetails()}
          {step === 3 && renderReview()}
          {step === 4 && renderConfirmation()}
        </div>
      </div>

      {/* Add Recipient Modal */}
      {showAddRecipient && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Recipient</h3>
              
              {/* Transfer Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Transfer Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setNewRecipient({...newRecipient, transferType: 'domestic'})}
                    className={`p-3 border rounded-lg text-left transition-colors ${
                      newRecipient.transferType === 'domestic'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium">Domestic Transfer</div>
                    <div className="text-sm text-gray-600">Within the same country</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRecipient({...newRecipient, transferType: 'international'})}
                    className={`p-3 border rounded-lg text-left transition-colors ${
                      newRecipient.transferType === 'international'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium">International Transfer</div>
                    <div className="text-sm text-gray-600">Cross-border transfers</div>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Recipient Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newRecipient.name}
                      onChange={(e) => setNewRecipient({...newRecipient, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter recipient's full name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={newRecipient.email}
                      onChange={(e) => setNewRecipient({...newRecipient, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="recipient@example.com"
                    />
                  </div>
                </div>

                {/* Country Selection for International */}
                {newRecipient.transferType === 'international' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={newRecipient.country}
                        onChange={(e) => setNewRecipient({...newRecipient, country: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="US">United States</option>
                        <option value="GB">United Kingdom</option>
                        <option value="DE">Germany</option>
                        <option value="FR">France</option>
                        <option value="IT">Italy</option>
                        <option value="ES">Spain</option>
                        <option value="NL">Netherlands</option>
                        <option value="CH">Switzerland</option>
                        <option value="CA">Canada</option>
                        <option value="AU">Australia</option>
                        <option value="JP">Japan</option>
                        <option value="SG">Singapore</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                      <select
                        value={newRecipient.currency}
                        onChange={(e) => setNewRecipient({...newRecipient, currency: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="CHF">CHF - Swiss Franc</option>
                        <option value="CAD">CAD - Canadian Dollar</option>
                        <option value="AUD">AUD - Australian Dollar</option>
                        <option value="JPY">JPY - Japanese Yen</option>
                        <option value="SGD">SGD - Singapore Dollar</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Account Information */}
                {newRecipient.transferType === 'international' ? (
                  <>
                    {/* International Fields */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        IBAN <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newRecipient.iban}
                        onChange={(e) => setNewRecipient({...newRecipient, iban: e.target.value.toUpperCase()})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="GB82 WEST 1234 5698 7654 32"
                        maxLength={34}
                      />
                      <p className="text-xs text-gray-500 mt-1">International Bank Account Number (34 characters max)</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SWIFT/BIC Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newRecipient.swiftCode}
                        onChange={(e) => setNewRecipient({...newRecipient, swiftCode: e.target.value.toUpperCase()})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="DEUTDEFF"
                        maxLength={11}
                      />
                      <p className="text-xs text-gray-500 mt-1">Bank Identifier Code (8 or 11 characters)</p>
                    </div>

                    {/* Alternative Account Number for non-IBAN countries */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={newRecipient.accountNumber}
                        onChange={(e) => setNewRecipient({...newRecipient, accountNumber: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="For non-IBAN countries"
                      />
                      <p className="text-xs text-gray-500 mt-1">Required if IBAN is not available</p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Domestic Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Account Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newRecipient.accountNumber}
                          onChange={(e) => setNewRecipient({...newRecipient, accountNumber: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="1234567890"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Routing Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newRecipient.routingNumber}
                          onChange={(e) => setNewRecipient({...newRecipient, routingNumber: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="021000021"
                          maxLength={9}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Bank Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newRecipient.bankName}
                    onChange={(e) => setNewRecipient({...newRecipient, bankName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter bank name"
                  />
                </div>

                {newRecipient.transferType === 'international' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Address</label>
                    <textarea
                      value={newRecipient.bankAddress}
                      onChange={(e) => setNewRecipient({...newRecipient, bankAddress: e.target.value})}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Bank's full address including city and country"
                    />
                  </div>
                )}
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowAddRecipient(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRecipient}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Recipient
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TransferFunds;
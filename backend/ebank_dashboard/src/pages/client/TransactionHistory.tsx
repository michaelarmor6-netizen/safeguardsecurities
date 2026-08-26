import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  DollarSign,
  CreditCard,
  Smartphone,
  MapPin,
  Clock
} from 'lucide-react';
import DashboardLayout from '../../components/Layout/DashboardLayout';

// Transaction data - initially empty, will be populated from database/API
const allTransactions: any[] = [];

const categories = [
  'All Categories',
  'Food & Dining',
  'Income',
  'Utilities',
  'Transfer',
  'Groceries',
  'Shopping',
  'Cash Withdrawal',
  'Interest'
];

const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState(allTransactions);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

  const itemsPerPage = 8;
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentTransactions = transactions.slice(startIndex, startIndex + itemsPerPage);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount));
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTransactionIcon = (category: string) => {
    const icons: { [key: string]: any } = {
      'Food & Dining': '🍽️',
      'Income': '💰',
      'Utilities': '⚡',
      'Transfer': '🔄',
      'Groceries': '🛒',
      'Shopping': '🛍️',
      'Cash Withdrawal': '🏧',
      'Interest': '📈'
    };
    return icons[category] || '💳';
  };

  const exportTransactions = () => {
    // This would implement CSV export functionality
    console.log('Exporting transactions...');
  };

  const filterTransactions = () => {
    let filtered = allTransactions;

    if (searchTerm) {
      filtered = filtered.filter(
        tx => 
          tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tx.merchant.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'All Categories') {
      filtered = filtered.filter(tx => tx.category === selectedCategory);
    }

    setTransactions(filtered);
    setCurrentPage(1);
  };

  React.useEffect(() => {
    filterTransactions();
  }, [searchTerm, selectedCategory]);

  return (
    <DashboardLayout title="Transaction History" subtitle="View and manage all transactions">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Export Button */}
        <div className="flex justify-end mb-6">
          <button 
            onClick={exportTransactions}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Transactions</span>
          </button>
        </div>
        {/* Filters */}
        <div className="bg-white rounded-xl border p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              {/* Date Range */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Last 7 Days">Last 7 Days</option>
                <option value="Last 30 Days">Last 30 Days</option>
                <option value="Last 90 Days">Last 90 Days</option>
                <option value="This Year">This Year</option>
              </select>
            </div>

            <div className="text-sm text-gray-500">
              Showing {currentTransactions.length} of {transactions.length} transactions
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="divide-y divide-gray-200">
            {currentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                onClick={() => setSelectedTransaction(transaction)}
                className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Transaction Icon */}
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      transaction.amount > 0 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {transaction.amount > 0 ? (
                        <ArrowDownLeft className="w-6 h-6" />
                      ) : (
                        <ArrowUpRight className="w-6 h-6" />
                      )}
                    </div>

                    {/* Transaction Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {transaction.description}
                        </p>
                        <div className="text-right">
                          <p className={`text-lg font-semibold ${
                            transaction.amount > 0 ? 'text-green-600' : 'text-gray-900'
                          }`}>
                            {transaction.amount > 0 ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {transaction.account}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-1 flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{transaction.merchant}</span>
                          <span>•</span>
                          <span>{transaction.category}</span>
                          <span>•</span>
                          <span>{formatDate(transaction.date)} at {transaction.time}</span>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {transaction.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Transaction Detail Modal */}
        {selectedTransaction && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Transaction Details</h3>
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Amount & Status */}
                  <div className="text-center">
                    <p className={`text-3xl font-bold ${
                      selectedTransaction.amount > 0 ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {selectedTransaction.amount > 0 ? '+' : '-'}{formatCurrency(selectedTransaction.amount)}
                    </p>
                    <p className="text-gray-500 mt-1">{selectedTransaction.description}</p>
                  </div>

                  {/* Transaction Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Merchant</label>
                        <p className="text-gray-900">{selectedTransaction.merchant}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Category</label>
                        <p className="text-gray-900">{selectedTransaction.category}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Payment Method</label>
                        <p className="text-gray-900">{selectedTransaction.method}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Date & Time</label>
                        <p className="text-gray-900">{formatDate(selectedTransaction.date)} at {selectedTransaction.time}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Account</label>
                        <p className="text-gray-900">{selectedTransaction.account}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Location</label>
                        <p className="text-gray-900">{selectedTransaction.location}</p>
                      </div>
                    </div>
                  </div>

                  {/* Transaction ID */}
                  <div className="pt-4 border-t">
                    <label className="text-sm font-medium text-gray-500">Transaction ID</label>
                    <p className="text-gray-900 font-mono text-sm">{selectedTransaction.id}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4">
                    <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      Download Receipt
                    </button>
                    <button className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      Report Issue
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TransactionHistory;
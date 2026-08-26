import React, { useState } from 'react';
import AdminLayout from '../../components/Layout/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { 
  Activity, 
  Search, 
  Filter,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  Flag,
  Shield
} from 'lucide-react';

const ManageTransactions: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');

  // Transaction data - initially empty, will be populated from database/API
  const transactions: any[] = [];

  const filteredTransactions = transactions.filter(txn => {
    const matchesSearch = 
      txn.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (txn.fromUser && txn.fromUser.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (txn.toUser && txn.toUser.toLowerCase().includes(searchTerm.toLowerCase())) ||
      txn.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || txn.status === statusFilter;
    const matchesType = typeFilter === 'all' || txn.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Calculate stats
  const totalAmount = filteredTransactions.reduce((sum, txn) => sum + txn.amount, 0);
  const completedTxns = filteredTransactions.filter(txn => txn.status === 'completed').length;
  const flaggedTxns = filteredTransactions.filter(txn => txn.isFlagged).length;
  const pendingTxns = filteredTransactions.filter(txn => txn.status === 'pending' || txn.status === 'review').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'review': return 'bg-orange-100 text-orange-800';
      case 'flagged': return 'bg-red-100 text-red-800';
      case 'failed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'pending': return Clock;
      case 'review': return AlertTriangle;
      case 'flagged': return Flag;
      case 'failed': return XCircle;
      default: return AlertTriangle;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit': return ArrowDownRight;
      case 'withdrawal': return ArrowUpRight;
      case 'transfer': return RefreshCw;
      case 'payment': return DollarSign;
      default: return Activity;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'deposit': return 'text-green-600';
      case 'withdrawal': return 'text-red-600';
      case 'transfer': return 'text-blue-600';
      case 'payment': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleTransactionAction = (action: string, txnId: string) => {
    console.log(`${action} transaction ${txnId}`);
    // In a real app, this would call an API
  };

  return (
    <AdminLayout 
      title="Transaction Management" 
      subtitle="Monitor and manage all system transactions"
    >
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{filteredTransactions.length}</p>
                <p className="text-xs text-blue-500 mt-1">All transaction types</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Volume</p>
                <p className="text-2xl font-bold text-gray-900">${totalAmount.toLocaleString()}</p>
                <p className="text-xs text-green-500 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Transaction value
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
                <p className="text-sm font-medium text-gray-600">Flagged/Review</p>
                <p className="text-2xl font-bold text-gray-900">{flaggedTxns + pendingTxns}</p>
                <p className="text-xs text-red-500 flex items-center mt-1">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Requires attention
                </p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                <Flag className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {((completedTxns / filteredTransactions.length) * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-green-500 flex items-center mt-1">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Completion rate
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
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
                  placeholder="Search transactions, users, or references..."
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
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="review">Under Review</option>
                <option value="flagged">Flagged</option>
                <option value="failed">Failed</option>
              </select>
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="deposit">Deposits</option>
                <option value="withdrawal">Withdrawals</option>
                <option value="transfer">Transfers</option>
                <option value="payment">Payments</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" className="flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" className="flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Advanced Filters
              </Button>
            </div>
          </div>
        </Card>

        {/* Transactions Table */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Transactions ({filteredTransactions.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participants
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date/Time
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((txn) => {
                  const StatusIcon = getStatusIcon(txn.status);
                  const TypeIcon = getTypeIcon(txn.type);
                  return (
                    <tr key={txn.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center`}>
                            <TypeIcon className={`h-5 w-5 ${getTypeColor(txn.type)}`} />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 flex items-center">
                              {txn.id}
                              {txn.isFlagged && <Flag className="w-4 h-4 text-red-500 ml-2" />}
                            </div>
                            <div className="text-sm text-gray-500">
                              {txn.type} • {txn.reference}
                            </div>
                            <div className="text-xs text-gray-400">
                              {txn.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          {txn.fromUser && (
                            <div className="text-gray-900 mb-1">
                              From: <span className="font-medium">{txn.fromUser}</span>
                              <div className="text-xs text-gray-500">{txn.fromAccount}</div>
                            </div>
                          )}
                          {txn.toUser && (
                            <div className="text-gray-900">
                              To: <span className="font-medium">{txn.toUser}</span>
                              <div className="text-xs text-gray-500">{txn.toAccount}</div>
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          ${txn.amount.toLocaleString()}
                        </div>
                        {txn.fee > 0 && (
                          <div className="text-xs text-gray-500">
                            Fee: ${txn.fee}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(txn.status)}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {txn.status}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskColor(txn.riskScore)}`}>
                          <Shield className="w-3 h-3 mr-1" />
                          {txn.riskScore}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {txn.location}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 text-gray-400 mr-1" />
                          {formatDate(txn.timestamp)}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTransactionAction('view', txn.id)}
                            className="flex items-center"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          {(txn.status === 'pending' || txn.status === 'review') && (
                            <Button
                              size="sm"
                              onClick={() => handleTransactionAction('approve', txn.id)}
                              className="flex items-center"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                          )}
                          {txn.status === 'flagged' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTransactionAction('investigate', txn.id)}
                              className="flex items-center text-red-600"
                            >
                              <Ban className="w-3 h-3 mr-1" />
                              Investigate
                            </Button>
                          )}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Fraud Detection</h3>
            <p className="text-sm text-gray-600 mb-4">Monitor suspicious activities</p>
            <Button variant="outline" className="w-full">
              View Alerts
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Approval</h3>
            <p className="text-sm text-gray-600 mb-4">Approve multiple transactions</p>
            <Button variant="outline" className="w-full">
              Bulk Actions
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Limits</h3>
            <p className="text-sm text-gray-600 mb-4">Configure transaction limits</p>
            <Button variant="outline" className="w-full">
              Set Limits
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Reports</h3>
            <p className="text-sm text-gray-600 mb-4">Generate transaction reports</p>
            <Button variant="outline" className="w-full">
              Generate Report
            </Button>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManageTransactions;
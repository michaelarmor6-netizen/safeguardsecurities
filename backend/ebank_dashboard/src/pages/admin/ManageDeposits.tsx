import React, { useState } from 'react';
import AdminLayout from '../../components/Layout/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { 
  Plus, 
  Search, 
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Upload,
  FileText,
  Image,
  Calendar,
  DollarSign,
  TrendingUp,
  Filter,
  Download,
  User,
  CreditCard
} from 'lucide-react';

const ManageDeposits: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');

  // Deposit data - initially empty, will be populated from database/API
  const deposits: any[] = [];

  const filteredDeposits = deposits.filter(deposit => {
    const matchesSearch = 
      deposit.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deposit.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deposit.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deposit.reference.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || deposit.status === statusFilter;
    const matchesMethod = methodFilter === 'all' || deposit.method === methodFilter;
    
    return matchesSearch && matchesStatus && matchesMethod;
  });

  // Calculate stats
  const totalAmount = filteredDeposits.reduce((sum, dep) => sum + dep.amount, 0);
  const pendingCount = filteredDeposits.filter(dep => dep.status === 'pending').length;
  const approvedCount = filteredDeposits.filter(dep => dep.status === 'approved').length;
  const flaggedCount = filteredDeposits.filter(dep => dep.status === 'flagged').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-orange-100 text-orange-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'flagged': return 'bg-red-100 text-red-800';
      case 'rejected': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'under_review': return AlertTriangle;
      case 'approved': return CheckCircle;
      case 'flagged': return AlertTriangle;
      case 'rejected': return XCircle;
      default: return AlertTriangle;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'wire_transfer': return 'Wire Transfer';
      case 'check': return 'Check';
      case 'mobile_deposit': return 'Mobile Deposit';
      case 'international_wire': return 'International Wire';
      case 'cash': return 'Cash Deposit';
      case 'ach': return 'ACH Transfer';
      default: return method;
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDepositAction = (action: string, depositId: string) => {
    console.log(`${action} deposit ${depositId}`);
    // In a real app, this would call an API
  };

  return (
    <AdminLayout 
      title="Deposit Management" 
      subtitle="Review and approve deposit requests"
    >
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                <p className="text-xs text-yellow-500 mt-1">Requires attention</p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">${totalAmount.toLocaleString()}</p>
                <p className="text-xs text-green-500 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Deposit value
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
                <p className="text-sm font-medium text-gray-600">Approved Today</p>
                <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
                <p className="text-xs text-green-500 flex items-center mt-1">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Successfully processed
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
                <p className="text-sm font-medium text-gray-600">Flagged/Risk</p>
                <p className="text-2xl font-bold text-gray-900">{flaggedCount}</p>
                <p className="text-xs text-red-500 flex items-center mt-1">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Needs investigation
                </p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
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
                  placeholder="Search deposits, users, or references..."
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
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="flagged">Flagged</option>
                <option value="rejected">Rejected</option>
              </select>
              
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">All Methods</option>
                <option value="wire_transfer">Wire Transfer</option>
                <option value="check">Check</option>
                <option value="mobile_deposit">Mobile Deposit</option>
                <option value="international_wire">International Wire</option>
                <option value="cash">Cash Deposit</option>
                <option value="ach">ACH Transfer</option>
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

        {/* Deposits Table */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Deposit Requests ({filteredDeposits.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deposit Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount & Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attachments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDeposits.map((deposit) => {
                  const StatusIcon = getStatusIcon(deposit.status);
                  return (
                    <tr key={deposit.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            {deposit.id}
                          </div>
                          <div className="text-sm text-gray-600 mb-1">
                            {deposit.description}
                          </div>
                          <div className="text-xs text-gray-500">
                            Ref: {deposit.reference}
                          </div>
                          {deposit.notes && (
                            <div className="text-xs text-red-600 mt-1 font-medium">
                              Note: {deposit.notes}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {deposit.userName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {deposit.userEmail}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center">
                              <CreditCard className="w-3 h-3 mr-1" />
                              {deposit.accountNumber}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          ${deposit.amount.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">
                          {getMethodLabel(deposit.method)}
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${getRiskColor(deposit.riskScore)}`}>
                          {deposit.riskScore} risk
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(deposit.status)}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {deposit.status.replace('_', ' ')}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          Verification: {deposit.verificationStatus}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {deposit.attachments?.map((attachment: any, index: number) => (
                            <div key={index} className="flex items-center">
                              {attachment.type === 'document' ? (
                                <FileText className="w-4 h-4 text-blue-500" />
                              ) : (
                                <Image className="w-4 h-4 text-green-500" />
                              )}
                            </div>
                          ))}
                          <span className="text-xs text-gray-500">
                            {deposit.attachments.length} file(s)
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 text-gray-400 mr-1" />
                          {formatDate(deposit.submittedAt)}
                        </div>
                        {deposit.expectedProcessingDate && (
                          <div className="text-xs text-gray-500 mt-1">
                            Expected: {formatDate(deposit.expectedProcessingDate)}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDepositAction('view', deposit.id)}
                            className="flex items-center"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          {deposit.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleDepositAction('approve', deposit.id)}
                                className="flex items-center"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDepositAction('reject', deposit.id)}
                                className="flex items-center text-red-600"
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Reject
                              </Button>
                            </>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Approval</h3>
            <p className="text-sm text-gray-600 mb-4">Approve multiple low-risk deposits</p>
            <Button variant="outline" className="w-full">
              Bulk Approve
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification Queue</h3>
            <p className="text-sm text-gray-600 mb-4">Review verification pending items</p>
            <Button variant="outline" className="w-full">
              Review Queue
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">AML Compliance</h3>
            <p className="text-sm text-gray-600 mb-4">Run compliance checks</p>
            <Button variant="outline" className="w-full">
              Run Checks
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Report</h3>
            <p className="text-sm text-gray-600 mb-4">Generate deposit reports</p>
            <Button variant="outline" className="w-full">
              Generate Report
            </Button>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManageDeposits;
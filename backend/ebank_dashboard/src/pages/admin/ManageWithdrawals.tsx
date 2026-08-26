import React, { useState } from 'react';
import AdminLayout from '../../components/Layout/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { 
  ArrowUpRight, 
  Search, 
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Shield,
  Calendar,
  DollarSign,
  TrendingDown,
  Filter,
  Download,
  User,
  CreditCard,
  MapPin,
  Smartphone,
  Globe,
  Flag
} from 'lucide-react';

const ManageWithdrawals: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');

  // Withdrawal data - initially empty, will be populated from database/API
  const withdrawals: any[] = [];

  const filteredWithdrawals = withdrawals.filter(withdrawal => {
    const matchesSearch = 
      withdrawal.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.reference.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || withdrawal.status === statusFilter;
    const matchesMethod = methodFilter === 'all' || withdrawal.method === methodFilter;
    const matchesRisk = riskFilter === 'all' || withdrawal.riskScore === riskFilter;
    
    return matchesSearch && matchesStatus && matchesMethod && matchesRisk;
  });

  // Calculate stats
  const totalAmount = filteredWithdrawals.reduce((sum, wth) => sum + wth.amount, 0);
  const pendingCount = filteredWithdrawals.filter(wth => wth.status === 'pending' || wth.status === 'under_review').length;
  const approvedCount = filteredWithdrawals.filter(wth => wth.status === 'approved').length;
  const flaggedCount = filteredWithdrawals.filter(wth => wth.status === 'flagged').length;

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
      case 'flagged': return Flag;
      case 'rejected': return XCircle;
      default: return AlertTriangle;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'atm': return 'ATM Withdrawal';
      case 'wire_transfer': return 'Wire Transfer';
      case 'international_wire': return 'International Wire';
      case 'check': return 'Check';
      case 'debit_card': return 'Debit Card';
      case 'online_transfer': return 'Online Transfer';
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

  const handleWithdrawalAction = (action: string, withdrawalId: string) => {
    console.log(`${action} withdrawal ${withdrawalId}`);
    // In a real app, this would call an API
  };

  const getFraudScore = (checks: any) => {
    const passed = Object.values(checks).filter(v => v === true || v === 'passed').length;
    const total = Object.keys(checks).length;
    return (passed / total * 100).toFixed(0);
  };

  return (
    <AdminLayout 
      title="Withdrawal Management" 
      subtitle="Review and approve withdrawal requests"
    >
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                <p className="text-xs text-yellow-500 mt-1">Awaiting approval</p>
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
                <p className="text-xs text-red-500 flex items-center mt-1">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  Withdrawal value
                </p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-red-600" />
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
                  Fraud detection
                </p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                <Shield className="h-6 w-6 text-red-600" />
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
                  placeholder="Search withdrawals, users, or references..."
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
                <option value="atm">ATM</option>
                <option value="wire_transfer">Wire Transfer</option>
                <option value="international_wire">International Wire</option>
                <option value="check">Check</option>
                <option value="debit_card">Debit Card</option>
              </select>

              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="all">All Risk Levels</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" className="flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" className="flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Fraud Dashboard
              </Button>
            </div>
          </div>
        </Card>

        {/* Withdrawals Table */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Withdrawal Requests ({filteredWithdrawals.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Withdrawal Details
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
                    Fraud Analysis
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
                {filteredWithdrawals.map((withdrawal) => {
                  const StatusIcon = getStatusIcon(withdrawal.status);
                  const fraudScore = getFraudScore(withdrawal.fraudChecks);
                  return (
                    <tr key={withdrawal.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 mb-1 flex items-center">
                            {withdrawal.id}
                            {withdrawal.status === 'flagged' && <Flag className="w-4 h-4 text-red-500 ml-2" />}
                          </div>
                          <div className="text-sm text-gray-600 mb-1">
                            {withdrawal.description}
                          </div>
                          <div className="text-xs text-gray-500">
                            Ref: {withdrawal.reference}
                          </div>
                          {withdrawal.notes && (
                            <div className="text-xs text-red-600 mt-1 font-medium">
                              {withdrawal.notes}
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
                              {withdrawal.userName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {withdrawal.userEmail}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center">
                              <CreditCard className="w-3 h-3 mr-1" />
                              {withdrawal.accountNumber}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          ${withdrawal.amount.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">
                          {getMethodLabel(withdrawal.method)}
                        </div>
                        {withdrawal.fee > 0 && (
                          <div className="text-xs text-gray-500">
                            Fee: ${withdrawal.fee}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {withdrawal.status.replace('_', ' ')}
                        </span>
                        <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${getRiskColor(withdrawal.riskScore)}`}>
                          {withdrawal.riskScore} risk
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="flex items-center mb-1">
                            <Shield className="w-3 h-3 text-gray-400 mr-1" />
                            <span className="font-medium">{fraudScore}% confidence</span>
                          </div>
                          <div className="text-xs space-y-1">
                            <div className="flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              <span className={withdrawal.fraudChecks.locationMatch ? 'text-green-600' : 'text-red-600'}>
                                Location {withdrawal.fraudChecks.locationMatch ? '✓' : '✗'}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Smartphone className="w-3 h-3 mr-1" />
                              <span className={withdrawal.fraudChecks.deviceMatch ? 'text-green-600' : 'text-red-600'}>
                                Device {withdrawal.fraudChecks.deviceMatch ? '✓' : '✗'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 text-gray-400 mr-1" />
                          {formatDate(withdrawal.submittedAt)}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center mt-1">
                          <Globe className="w-3 h-3 mr-1" />
                          {withdrawal.location}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleWithdrawalAction('view', withdrawal.id)}
                            className="flex items-center"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          {(withdrawal.status === 'pending' || withdrawal.status === 'under_review') && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleWithdrawalAction('approve', withdrawal.id)}
                                className="flex items-center"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleWithdrawalAction('reject', withdrawal.id)}
                                className="flex items-center text-red-600"
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {withdrawal.status === 'flagged' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleWithdrawalAction('investigate', withdrawal.id)}
                              className="flex items-center text-orange-600"
                            >
                              <AlertTriangle className="w-3 h-3 mr-1" />
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Fraud Monitoring</h3>
            <p className="text-sm text-gray-600 mb-4">Advanced fraud detection alerts</p>
            <Button variant="outline" className="w-full">
              Fraud Dashboard
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Velocity Limits</h3>
            <p className="text-sm text-gray-600 mb-4">Configure withdrawal limits</p>
            <Button variant="outline" className="w-full">
              Set Limits
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Processing</h3>
            <p className="text-sm text-gray-600 mb-4">Process multiple low-risk withdrawals</p>
            <Button variant="outline" className="w-full">
              Bulk Approve
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Report</h3>
            <p className="text-sm text-gray-600 mb-4">Generate AML/KYC reports</p>
            <Button variant="outline" className="w-full">
              Generate Report
            </Button>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManageWithdrawals;
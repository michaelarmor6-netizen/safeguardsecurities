import React from 'react';
import AdminLayout from '../../components/Layout/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  Users, 
  CreditCard, 
  Activity, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Settings,
  Shield,
  FileText,
  BarChart3
} from 'lucide-react';

const Dashboard: React.FC = () => {
  // Dashboard data - initially empty/default values, will be populated from database/API
  const stats = {
    totalUsers: 0,
    activeUsers: 0,
    totalAccounts: 0,
    totalBalance: 0,
    pendingTransactions: 0,
    completedTransactions: 0,
    monthlyGrowth: 0,
    systemHealth: 100
  };

  const recentActivities: any[] = [];

  const pendingApprovals: any[] = [];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_signup': return Users;
      case 'transaction': return Activity;
      case 'account': return CreditCard;
      case 'security': return Shield;
      case 'system': return Settings;
      default: return AlertTriangle;
    }
  };

  const getActivityColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'info': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <AdminLayout 
      title="System Dashboard" 
      subtitle="Comprehensive overview of your banking platform"
    >
      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
                <p className="text-xs text-green-500 flex items-center mt-1">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  +{stats.monthlyGrowth}% this month
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900">${stats.totalBalance.toLocaleString()}</p>
                <p className="text-xs text-green-500 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Healthy growth
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
                <p className="text-sm font-medium text-gray-600">Active Accounts</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAccounts.toLocaleString()}</p>
                <p className="text-xs text-blue-500 flex items-center mt-1">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}% active
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Health</p>
                <p className="text-2xl font-bold text-gray-900">{stats.systemHealth}%</p>
                <p className="text-xs text-green-500 flex items-center mt-1">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  All systems operational
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentActivities.map((activity) => {
                    const IconComponent = getActivityIcon(activity.type);
                    return (
                      <div key={activity.id} className="flex items-center space-x-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getActivityColor(activity.status)}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{activity.description}</p>
                          <p className="text-xs text-gray-500">{activity.timestamp}</p>
                        </div>
                        <Button variant="outline" size="sm" className="flex items-center">
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6">
                  <Button variant="outline" className="w-full">
                    View All Activity
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Pending Approvals */}
          <div>
            <Card className="h-full">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {pendingApprovals.length}
                </span>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {pendingApprovals.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-medium text-gray-900">{item.type}</h4>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          item.priority === 'high' ? 'bg-red-100 text-red-800' :
                          item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">User: {item.user}</p>
                      {item.amount && <p className="text-sm text-gray-600 mb-2">Amount: {item.amount}</p>}
                      <p className="text-xs text-gray-500 mb-3">{item.submittedAt}</p>
                      <div className="flex space-x-2">
                        <Button size="sm" className="flex-1">Approve</Button>
                        <Button variant="outline" size="sm" className="flex-1">Review</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="text-center">
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Manage Users</h3>
              <p className="text-sm text-gray-600 mb-4">View and manage user accounts</p>
              <Button className="w-full">Go to Users</Button>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="text-center">
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Transactions</h3>
              <p className="text-sm text-gray-600 mb-4">Monitor all transactions</p>
              <Button className="w-full">View Transactions</Button>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="text-center">
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Analytics</h3>
              <p className="text-sm text-gray-600 mb-4">View detailed reports</p>
              <Button className="w-full">View Analytics</Button>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="text-center">
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">System Settings</h3>
              <p className="text-sm text-gray-600 mb-4">Configure system settings</p>
              <Button className="w-full">Open Settings</Button>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
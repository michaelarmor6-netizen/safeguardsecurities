import React, { useState } from 'react';
import AdminLayout from '../../components/Layout/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft,
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart,
  LineChart,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Eye,
  FileText,
  Globe,
  Smartphone,
  MapPin,
  Shield,
  Activity,
  Zap
} from 'lucide-react';

const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [reportType, setReportType] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analytics data state
  const [overviewMetrics, setOverviewMetrics] = useState({
    totalBalance: 0,
    totalUsers: 0,
    activeAccounts: 0,
    totalTransactions: 0,
    monthlyGrowth: 0,
    transactionVolume: 0,
    newCustomers: 0,
    averageBalance: 0
  });

  const [chartData, setChartData] = useState({
    dailyTransactions: [] as any[],
    accountTypes: [] as any[],
    transactionMethods: [] as any[]
  });

  const [riskMetrics, setRiskMetrics] = useState({
    fraudDetections: 0,
    suspiciousTransactions: 0,
    accountLockouts: 0,
    securityAlerts: 0,
    complianceFlags: 0,
    fraudPrevented: 0
  });

  const [performanceMetrics, setPerformanceMetrics] = useState({
    systemUptime: 100,
    avgResponseTime: 0,
    peakTransactions: 0,
    errorRate: 0,
    customerSatisfaction: 0
  });

  // Load analytics data from Firebase
  React.useEffect(() => {
    const loadAnalyticsData = async () => {
      try {
        setLoading(true);
        // TODO: Implement Firebase aggregation queries
        // For now, simulate loading
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Would fetch real data from Firestore aggregations
        // setOverviewMetrics({ ... real data ... });
        // setChartData({ ... real data ... });
        
      } catch (err) {
        console.error('Error loading analytics:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    loadAnalyticsData();
  }, [timeRange]);

  const getGrowthIcon = (value: number) => {
    return value >= 0 ? TrendingUp : TrendingDown;
  };

  const getGrowthColor = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value}%`;
  };

  return (
    <AdminLayout 
      title="Analytics & Reports" 
      subtitle="Comprehensive financial insights and reporting"
    >
      <div className="p-6 space-y-6">
        {/* Control Panel */}
        <Card className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last Year</option>
              </select>
              
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="overview">Overview Dashboard</option>
                <option value="financial">Financial Performance</option>
                <option value="customer">Customer Analytics</option>
                <option value="risk">Risk & Security</option>
                <option value="operational">Operational Metrics</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" className="flex items-center">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" className="flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button className="flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading analytics data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12 bg-red-50 rounded-lg">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-red-900 mb-2">Error Loading Analytics</h4>
            <p className="text-red-700 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {/* Overview Metrics */}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(overviewMetrics.totalBalance)}
                </p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {formatPercentage(overviewMetrics.monthlyGrowth)} this month
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
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overviewMetrics.totalUsers.toLocaleString()}
                </p>
                <p className="text-xs text-blue-600 flex items-center mt-1">
                  <Users className="w-3 h-3 mr-1" />
                  {overviewMetrics.newCustomers} new this week
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
                <p className="text-sm font-medium text-gray-600">Active Accounts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overviewMetrics.activeAccounts.toLocaleString()}
                </p>
                <p className="text-xs text-purple-600 flex items-center mt-1">
                  <CreditCard className="w-3 h-3 mr-1" />
                  85.2% activation rate
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
                <p className="text-sm font-medium text-gray-600">Transactions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overviewMetrics.totalTransactions.toLocaleString()}
                </p>
                <p className="text-xs text-orange-600 flex items-center mt-1">
                  <Activity className="w-3 h-3 mr-1" />
                  Today's volume
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transaction Trends */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Transaction Trends</h3>
              <LineChart className="w-5 h-5 text-gray-400" />
            </div>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Interactive Chart Placeholder</p>
                <p className="text-sm text-gray-500">7-day transaction volume trend</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">387</p>
                <p className="text-xs text-gray-500">Deposits</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">237</p>
                <p className="text-xs text-gray-500">Withdrawals</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">703</p>
                <p className="text-xs text-gray-500">Transfers</p>
              </div>
            </div>
          </Card>

          {/* Account Distribution */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Account Distribution</h3>
              <PieChart className="w-5 h-5 text-gray-400" />
            </div>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center mb-4">
              <div className="text-center">
                <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Pie Chart Placeholder</p>
                <p className="text-sm text-gray-500">Account type distribution</p>
              </div>
            </div>
            <div className="space-y-2">
              {chartData.accountTypes.map((type, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${
                      index === 0 ? 'bg-blue-500' : 
                      index === 1 ? 'bg-green-500' : 
                      index === 2 ? 'bg-orange-500' : 'bg-purple-500'
                    }`}></div>
                    <span className="text-sm text-gray-600">{type.type}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{type.count.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{type.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Transaction Methods Analysis */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Transaction Methods Performance</h3>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Method</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Transactions</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Volume</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Average</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Growth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {chartData.transactionMethods.map((method, index) => (
                  <tr key={index}>
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                          {method.method.includes('Mobile') ? <Smartphone className="w-4 h-4 text-gray-600" /> :
                           method.method.includes('Online') ? <Globe className="w-4 h-4 text-gray-600" /> :
                           method.method.includes('ATM') ? <CreditCard className="w-4 h-4 text-gray-600" /> :
                           method.method.includes('Wire') ? <ArrowUpRight className="w-4 h-4 text-gray-600" /> :
                           <MapPin className="w-4 h-4 text-gray-600" />}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{method.method}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900">{method.count.toLocaleString()}</td>
                    <td className="py-4 px-4 text-sm text-gray-900">{formatCurrency(method.amount)}</td>
                    <td className="py-4 px-4 text-sm text-gray-900">
                      {formatCurrency(method.amount / method.count)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                        <span className="text-sm text-green-600">
                          +{(Math.random() * 15 + 5).toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Risk & Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Security & Risk Metrics */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Security & Risk Metrics</h3>
              <Shield className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Fraud Detected</p>
                    <p className="text-xs text-gray-600">Prevented: {formatCurrency(riskMetrics.fraudPrevented)}</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-red-600">{riskMetrics.fraudDetections}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-yellow-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Suspicious Activity</p>
                    <p className="text-xs text-gray-600">Under investigation</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-yellow-600">{riskMetrics.suspiciousTransactions}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <Shield className="w-5 h-5 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Account Lockouts</p>
                    <p className="text-xs text-gray-600">Security measures</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-blue-600">{riskMetrics.accountLockouts}</span>
              </div>
            </div>
          </Card>

          {/* System Performance */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">System Performance</h3>
              <Zap className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">System Uptime</p>
                    <p className="text-xs text-gray-600">Last 30 days</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-green-600">{performanceMetrics.systemUptime}%</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <Activity className="w-5 h-5 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Response Time</p>
                    <p className="text-xs text-gray-600">Average (ms)</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-blue-600">{performanceMetrics.avgResponseTime}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center">
                  <Target className="w-5 h-5 text-purple-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Customer Satisfaction</p>
                    <p className="text-xs text-gray-600">Survey ratings</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-purple-600">{performanceMetrics.customerSatisfaction}%</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Automated Reports</h3>
            <p className="text-sm text-gray-600 mb-4">Schedule and manage automated reporting</p>
            <Button variant="outline" className="w-full">
              Configure Reports
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Export</h3>
            <p className="text-sm text-gray-600 mb-4">Export analytics data for external analysis</p>
            <Button variant="outline" className="w-full">
              Export Data
            </Button>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Dashboards</h3>
            <p className="text-sm text-gray-600 mb-4">Create personalized dashboard views</p>
            <Button variant="outline" className="w-full">
              Customize View
            </Button>
          </Card>
        </div>
        </>
        )}
      </div>
    </AdminLayout>
  );
};

export default Analytics;
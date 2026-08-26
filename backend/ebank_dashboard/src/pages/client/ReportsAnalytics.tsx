import React from 'react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Download,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Target
} from 'lucide-react';

const ReportsAnalytics: React.FC = () => {
  return (
    <DashboardLayout 
      title="Reports & Analytics" 
      subtitle="View your financial insights and spending patterns"
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Income</p>
                <p className="text-2xl font-bold text-green-600">$12,450</p>
                <p className="text-xs text-green-500 flex items-center mt-1">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  +12.5% from last month
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Expenses</p>
                <p className="text-2xl font-bold text-red-600">$8,230</p>
                <p className="text-xs text-red-500 flex items-center mt-1">
                  <ArrowDownRight className="w-3 h-3 mr-1" />
                  +3.2% from last month
                </p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Savings Rate</p>
                <p className="text-2xl font-bold text-blue-600">34%</p>
                <p className="text-xs text-blue-500 flex items-center mt-1">
                  <Target className="w-3 h-3 mr-1" />
                  Above target (30%)
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <PieChart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Worth</p>
                <p className="text-2xl font-bold text-gray-900">$145,680</p>
                <p className="text-xs text-green-500 flex items-center mt-1">
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  +8.7% YTD
                </p>
              </div>
              <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Reports Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spending Analysis */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Spending Analysis</h3>
              <button className="flex items-center text-sm text-blue-600 hover:text-blue-700">
                <Download className="w-4 h-4 mr-1" />
                Export
              </button>
            </div>
            
            <div className="space-y-4">
              {[
                { category: 'Food & Dining', amount: '$2,450', percentage: 30, color: 'bg-red-500' },
                { category: 'Transportation', amount: '$1,680', percentage: 20, color: 'bg-blue-500' },
                { category: 'Entertainment', amount: '$1,230', percentage: 15, color: 'bg-green-500' },
                { category: 'Shopping', amount: '$1,640', percentage: 20, color: 'bg-yellow-500' },
                { category: 'Utilities', amount: '$820', percentage: 10, color: 'bg-purple-500' },
                { category: 'Others', amount: '$410', percentage: 5, color: 'bg-gray-500' },
              ].map((item) => (
                <div key={item.category} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${item.color} mr-3`}></div>
                    <span className="text-sm text-gray-600">{item.category}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${item.color}`}
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-16 text-right">
                      {item.amount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Monthly Trends */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Monthly Trends</h3>
              <select className="text-sm border border-gray-300 rounded-md px-3 py-1">
                <option>Last 6 months</option>
                <option>Last 12 months</option>
                <option>This year</option>
              </select>
            </div>
            
            {/* Simplified chart representation */}
            <div className="space-y-4">
              {[
                { month: 'Nov 2024', income: '$12,450', expenses: '$8,230', savings: '$4,220' },
                { month: 'Oct 2024', income: '$11,080', expenses: '$7,960', savings: '$3,120' },
                { month: 'Sep 2024', income: '$12,200', expenses: '$8,450', savings: '$3,750' },
                { month: 'Aug 2024', income: '$10,950', expenses: '$7,890', savings: '$3,060' },
                { month: 'Jul 2024', income: '$11,800', expenses: '$8,100', savings: '$3,700' },
                { month: 'Jun 2024', income: '$12,100', expenses: '$8,350', savings: '$3,750' },
              ].map((item) => (
                <div key={item.month} className="border-b border-gray-100 pb-3 last:border-b-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600">{item.month}</span>
                    <span className="text-sm text-green-600 font-medium">{item.savings}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                    <div>Income: {item.income}</div>
                    <div>Expenses: {item.expenses}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Available Reports */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: 'Monthly Statement',
                description: 'Detailed monthly financial summary',
                icon: Calendar,
                action: 'Generate Report'
              },
              {
                title: 'Tax Summary',
                description: 'Annual tax-ready financial summary',
                icon: BarChart3,
                action: 'Generate Report'
              },
              {
                title: 'Spending Report',
                description: 'Category-wise expense breakdown',
                icon: PieChart,
                action: 'Generate Report'
              },
              {
                title: 'Investment Summary',
                description: 'Portfolio performance analysis',
                icon: TrendingUp,
                action: 'Generate Report'
              },
              {
                title: 'Cash Flow Analysis',
                description: 'Money in vs money out analysis',
                icon: DollarSign,
                action: 'Generate Report'
              },
              {
                title: 'Custom Report',
                description: 'Build your own custom report',
                icon: Target,
                action: 'Create Custom'
              },
            ].map((report) => (
              <div key={report.title} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <report.icon className="h-6 w-6 text-blue-600" />
                  <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    {report.action}
                  </button>
                </div>
                <h4 className="font-medium text-gray-900 mb-1">{report.title}</h4>
                <p className="text-sm text-gray-600">{report.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ReportsAnalytics;
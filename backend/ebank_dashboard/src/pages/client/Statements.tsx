import React, { useState } from 'react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  FileText, 
  Download, 
  Eye,
  Calendar,
  Filter,
  Search,
  ChevronDown
} from 'lucide-react';

const Statements: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedType, setSelectedType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [statements, setStatements] = useState<any[]>([]);

  // Load statements from Firebase or generate them
  React.useEffect(() => {
    const loadStatements = async () => {
      try {
        setLoading(true);
        // TODO: Load from Firebase or generate statements
        // For now, simulate loading
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Would fetch real statements or generate them from transaction history
        setStatements([]);
      } catch (error) {
        console.error('Error loading statements:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStatements();
  }, [selectedYear]);

  const filteredStatements = statements.filter(statement => {
    const matchesSearch = statement.period.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         statement.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || statement.type.toLowerCase().includes(selectedType.toLowerCase());
    const matchesYear = statement.date.includes(selectedYear);
    
    return matchesSearch && matchesType && matchesYear;
  });

  const handleDownload = (statementId: string, period: string) => {
    // Simulate download
    console.log(`Downloading statement ${statementId} for ${period}`);
    // In a real app, this would trigger a file download
  };

  const handlePreview = (statementId: string, period: string) => {
    // Simulate preview
    console.log(`Previewing statement ${statementId} for ${period}`);
    // In a real app, this would open a modal or new tab with the statement
  };

  return (
    <DashboardLayout 
      title="Statements" 
      subtitle="Download and view your account statements"
    >
      <div className="space-y-6">
        {/* Quick Actions */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Generate New Statement</h3>
              <p className="text-sm text-gray-600">Create custom statements for specific date ranges</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Custom Range
              </Button>
              <Button className="flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Generate Statement
              </Button>
            </div>
          </div>
        </Card>

        {/* Filters */}
        <Card className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search statements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2022">2022</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              </div>
              
              <div className="relative">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                  <option value="tax">Tax</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              </div>
            </div>
          </div>
        </Card>

        {/* Statements List */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Available Statements</h3>
            <p className="text-sm text-gray-600 mt-1">
              {filteredStatements.length} statement(s) found
            </p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-4">Loading statements...</p>
              </div>
            ) : statements.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Statements Available</h4>
                <p className="text-gray-500 mb-4">Statements will be generated monthly based on your account activity</p>
                <Button variant="outline">
                  Generate Statement
                </Button>
              </div>
            ) : filteredStatements.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No statements found matching your criteria</p>
              </div>
            ) : (
              filteredStatements.map((statement) => (
                <div key={statement.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 mb-1">
                          {statement.type}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">{statement.period}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Generated: {new Date(statement.date).toLocaleDateString()}</span>
                          <span>Size: {statement.size}</span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {statement.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(statement.id, statement.period)}
                        className="flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDownload(statement.id, statement.period)}
                        className="flex items-center"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Statement Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statement Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">What's Included</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Account balance information</li>
                <li>• All transactions for the period</li>
                <li>• Interest earned and fees charged</li>
                <li>• Transfer and payment history</li>
                <li>• Account summary and totals</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Statement Schedule</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Monthly statements: Available by the 5th of each month</li>
                <li>• Quarterly statements: Available within 10 business days</li>
                <li>• Annual statements: Available by January 31st</li>
                <li>• Tax statements: Available by February 15th</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Need Help?</h4>
            <p className="text-sm text-blue-700">
              If you need statements older than what's shown here, or have questions about your statements, 
              please contact customer support or visit our Help & Support section.
            </p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Statements;
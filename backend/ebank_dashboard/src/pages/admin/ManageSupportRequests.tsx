import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  User, 
  Calendar,
  Filter,
  Search,
  Eye,
  Mail,
  Phone,
  ExternalLink,
  Zap
} from 'lucide-react';
import AdminLayout from '../../components/Layout/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import QuickActionsModal from '../../components/modals/QuickActionsModal';
import { db } from '../../config/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc,
  Timestamp 
} from 'firebase/firestore';
import toast from 'react-hot-toast';

interface SupportRequest {
  id: string;
  ticketId: string;
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  contactMethod: string;
  user: {
    email: string;
    uid: string;
    name: string;
  };
  timestamp: string;
  status: 'new' | 'in-progress' | 'resolved' | 'closed';
  assignedTo?: string;
  responseCount?: number;
}

const ManageSupportRequests: React.FC = () => {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [quickActionsModalOpen, setQuickActionsModalOpen] = useState(false);
  const [quickActionsRequest, setQuickActionsRequest] = useState<SupportRequest | null>(null);

  useEffect(() => {
    // Real-time listener for support requests
    const q = query(
      collection(db, 'support_requests'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsData: SupportRequest[] = [];
      snapshot.forEach((doc) => {
        requestsData.push({
          id: doc.id,
          ...doc.data()
        } as SupportRequest);
      });
      setRequests(requestsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching support requests:', error);
      setLoading(false);
      toast.error('Failed to load support requests');
    });

    return () => unsubscribe();
  }, []);

  const openQuickActions = (request: SupportRequest) => {
    setQuickActionsRequest(request);
    setQuickActionsModalOpen(true);
  };

  const handleQuickActionsUpdate = () => {
    // The real-time listener will automatically update the UI
    setQuickActionsModalOpen(false);
    setQuickActionsRequest(null);
  };

  const handleStatusUpdate = async (requestId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'support_requests', requestId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      toast.success('Status updated successfully');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.ticketId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.message.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || request.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Statistics
  const stats = {
    total: requests.length,
    new: requests.filter(r => r.status === 'new').length,
    inProgress: requests.filter(r => r.status === 'in-progress').length,
    resolved: requests.filter(r => r.status === 'resolved').length,
    critical: requests.filter(r => r.priority === 'critical').length
  };

  if (loading) {
    return (
      <AdminLayout title="Support Requests" subtitle="Manage customer support requests">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Support Requests" subtitle="Manage customer support requests">
      <div className="p-6 space-y-6">
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="p-6">
            <div className="flex items-center">
              <MessageSquare className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Total Requests</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
                <p className="text-sm text-gray-500">New</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
                <p className="text-sm text-gray-500">In Progress</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                <p className="text-sm text-gray-500">Resolved</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
                <p className="text-sm text-gray-500">Critical</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </Card>

        {/* Support Requests Table */}
        <Card className="overflow-hidden">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Support Requests Found</h3>
              <p className="text-gray-500">No support requests match your current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900">Ticket</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900">Subject</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900">User</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900">Priority</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900">Status</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-900">Date</th>
                    <th className="text-center py-4 px-6 font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <div>
                          <div className="font-medium text-gray-900">#{request.ticketId}</div>
                          <div className="text-sm text-gray-500">{request.category}</div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-gray-900">{request.subject}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {request.message.substring(0, 60)}...
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{request.user.name}</div>
                            <div className="text-sm text-gray-500">{request.user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(request.priority)}`}>
                          {request.priority}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <select
                          value={request.status}
                          onChange={(e) => handleStatusUpdate(request.id, e.target.value)}
                          className={`text-xs font-medium rounded-full px-2 py-1 border-none ${getStatusColor(request.status)}`}
                        >
                          <option value="new">New</option>
                          <option value="in-progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500">
                        {formatDate(request.timestamp)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRequest(request)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openQuickActions(request)}
                            className="flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <Zap className="w-4 h-4" />
                            Quick
                          </Button>
                          {request.contactMethod === 'email' && (
                            <a
                              href={`mailto:${request.user.email}?subject=Re: ${request.subject} [#${request.ticketId}]`}
                              className="p-1 text-gray-400 hover:text-blue-600"
                            >
                              <Mail className="w-4 h-4" />
                            </a>
                          )}
                          {request.contactMethod === 'phone' && (
                            <button className="p-1 text-gray-400 hover:text-green-600">
                              <Phone className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Request Detail Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Support Request #{selectedRequest.ticketId}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">{selectedRequest.category}</p>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-5 h-5 text-gray-500 transform rotate-45" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Priority</label>
                    <p className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getPriorityColor(selectedRequest.priority)}`}>
                      {selectedRequest.priority}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <p className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getStatusColor(selectedRequest.status)}`}>
                      {selectedRequest.status}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Subject</label>
                  <p className="text-gray-900 font-medium mt-1">{selectedRequest.subject}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Customer Information</label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    <p><strong>Name:</strong> {selectedRequest.user.name}</p>
                    <p><strong>Email:</strong> {selectedRequest.user.email}</p>
                    <p><strong>User ID:</strong> {selectedRequest.user.uid}</p>
                    <p><strong>Preferred Contact:</strong> {selectedRequest.contactMethod}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Message</label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap">{selectedRequest.message}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Submitted</label>
                  <p className="text-gray-900 mt-1">{formatDate(selectedRequest.timestamp)}</p>
                </div>

                <div className="flex space-x-3">
                  <Button
                    onClick={() => handleStatusUpdate(selectedRequest.id, 'in-progress')}
                    className="flex-1"
                  >
                    Mark In Progress
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate(selectedRequest.id, 'resolved')}
                    variant="outline"
                    className="flex-1"
                  >
                    Mark Resolved
                  </Button>
                  <a
                    href={`mailto:${selectedRequest.user.email}?subject=Re: ${selectedRequest.subject} [#${selectedRequest.ticketId}]&body=Dear ${selectedRequest.user.name},%0D%0A%0D%0AThank you for contacting support regarding: ${selectedRequest.subject}%0D%0A%0D%0A`}
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full">
                      <Mail className="w-4 h-4 mr-2" />
                      Reply via Email
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions Modal */}
        {quickActionsModalOpen && quickActionsRequest && (
          <QuickActionsModal
            request={quickActionsRequest}
            isOpen={quickActionsModalOpen}
            onClose={() => setQuickActionsModalOpen(false)}
            onUpdate={handleQuickActionsUpdate}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default ManageSupportRequests;
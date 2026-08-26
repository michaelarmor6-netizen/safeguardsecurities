import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/Layout/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getPasswordResetRequests, 
  updatePasswordResetRequest, 
  PasswordResetRequest 
} from '../../services/PasswordResetService';
import { PasswordGenerator } from '../../utils/passwordGenerator';
import { 
  doc, 
  updateDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import toast from 'react-hot-toast';
import PasswordResetApprovalModal from '../../components/modals/PasswordResetApprovalModal';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Key, 
  Mail, 
  Phone, 
  User,
  Calendar,
  MessageSquare,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

const ManagePasswordResets: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PasswordResetRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const fetchedRequests = await getPasswordResetRequests();
      setRequests(fetchedRequests);
    } catch (error) {
      toast.error('Failed to load password reset requests');
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (request: PasswordResetRequest) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  const handleApproveRequest = (request: PasswordResetRequest) => {
    setSelectedRequest(request);
    setShowApprovalModal(true);
  };

  const processPasswordReset = async (method: 'email' | 'manual', tempPassword?: string) => {
    if (!selectedRequest || !currentUser?.email) {
      toast.error('Admin user not authenticated');
      return;
    }
    
    setProcessingRequest(selectedRequest.id!);
    
    try {
      console.log('Starting password reset approval for:', selectedRequest.username);
      console.log('Current admin user:', currentUser.email);
      console.log('Reset method:', method);
      console.log('Request details:', selectedRequest);
      
      // Generate new temporary password (used for both methods)
      const newTempPassword = tempPassword || PasswordGenerator.generateSecurePassword({
        length: 12,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSpecialChars: true
      });
      
      console.log('Generated temporary password for user:', selectedRequest.username);

      // Find the user document by username first, then update it
      const usersQuery = query(
        collection(db, 'users'),
        where('username', '==', selectedRequest.username)
      );
      
      const userSnapshot = await getDocs(usersQuery);
      if (userSnapshot.empty) {
        throw new Error(`User with username ${selectedRequest.username} not found`);
      }
      
      // Update the user document with the correct document ID
      const userDoc = userSnapshot.docs[0];
      console.log('Found user document with ID:', userDoc.id);
      
      const userRef = doc(db, 'users', userDoc.id);
      const userData = userDoc.data();
      
      if (method === 'email') {
        // Method 1: Send Firebase password reset email
        const { sendPasswordResetEmail } = await import('firebase/auth');
        const { auth } = await import('../../config/firebase');
        
        console.log('Sending password reset email to:', userData.email);
        await sendPasswordResetEmail(auth, userData.email);
        
        // Update user document to track email method
        await updateDoc(userRef, {
          mustChangePassword: true,
          passwordResetBy: currentUser.email,
          passwordResetAt: serverTimestamp(),
          passwordResetRequestId: selectedRequest.requestId,
          passwordResetEmailSent: true,
          passwordResetMethod: 'email'
        });
        
        console.log('Password reset email sent and user document updated');
        
      } else if (method === 'manual') {
        // Method 2: Manual password reset (Admin must communicate password)
        console.log('Processing manual password reset for:', userData.email);
        
        // Update user document with temporary password information
        await updateDoc(userRef, {
          mustChangePassword: true,
          passwordResetBy: currentUser.email,
          passwordResetAt: serverTimestamp(),
          passwordResetRequestId: selectedRequest.requestId,
          temporaryPassword: newTempPassword,
          passwordResetMethod: 'manual',
          adminMustCommunicatePassword: true
        });
        
        console.log('Manual password reset processed - Admin must communicate password to user');
      }
      
      console.log('Successfully updated user document');

      // Verify request ID exists
      if (!selectedRequest.id) {
        throw new Error('Request ID is missing');
      }

      // Update the request status
      await updatePasswordResetRequest(selectedRequest.id, {
        status: 'approved',
        adminNotes: `Password reset approved. Firebase password reset email sent to ${userData.email}. User can now reset their password using the email link.`
      }, currentUser.email);
      
      console.log('Successfully updated request status to approved');

      const successMessage = method === 'email' 
        ? `Password reset email sent to ${selectedRequest.firstName} ${selectedRequest.lastName}`
        : `Manual password reset processed for ${selectedRequest.firstName} ${selectedRequest.lastName}`;
        
      toast.success(successMessage, {
        duration: 8000
      });
      
      // Show method-specific console output
      if (method === 'email') {
        console.log('=== PASSWORD RESET EMAIL SENT ===');
        console.log(`User: ${selectedRequest.firstName} ${selectedRequest.lastName}`);
        console.log(`Username: ${selectedRequest.username}`);
        console.log(`Email: ${userData.email}`);
        console.log(`Password reset email sent to: ${userData.email}`);
        console.log(`Request ID: ${selectedRequest.requestId}`);
        console.log('User will receive Firebase password reset email');
        console.log('=====================================');
      } else {
        console.log('=== MANUAL PASSWORD RESET ===');
        console.log(`User: ${selectedRequest.firstName} ${selectedRequest.lastName}`);
        console.log(`Username: ${selectedRequest.username}`);
        console.log(`Email: ${userData.email}`);
        console.log(`TEMPORARY PASSWORD: ${newTempPassword}`);
        console.log(`Request ID: ${selectedRequest.requestId}`);
        console.log('🚨 IMPORTANT: Communicate this password securely to the user');
        console.log('🚨 User must change password on next login');
        console.log('==============================');
      }

      setShowApprovalModal(false);
      setSelectedRequest(null);
      await loadRequests(); // Refresh the list
      
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to approve password reset request';
      toast.error(errorMessage);
      console.error('Error approving request:', error);
      console.error('Request details:', {
        requestId: selectedRequest.id,
        username: selectedRequest.username,
        email: selectedRequest.email
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (request: PasswordResetRequest, reason: string) => {
    if (!currentUser?.email) return;
    
    setProcessingRequest(request.id!);
    
    try {
      await updatePasswordResetRequest(request.id!, {
        status: 'rejected',
        adminNotes: reason
      }, currentUser.email);

      toast.success(`Password reset request rejected`);
      await loadRequests(); // Refresh the list
      
    } catch (error) {
      toast.error('Failed to reject password reset request');
      console.error('Error rejecting request:', error);
    } finally {
      setProcessingRequest(null);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      request.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requestId.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock;
      case 'approved': return CheckCircle;
      case 'rejected': return XCircle;
      case 'completed': return CheckCircle;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-orange-600 bg-orange-100';
      case 'approved': return 'text-green-600 bg-green-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (reason: string) => {
    switch (reason) {
      case 'account_compromised': return 'text-red-600';
      case 'security_concern': return 'text-red-600';
      case 'password_not_working': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Password Reset Requests</h1>
            <p className="text-gray-600">Review and manage client password reset requests</p>
          </div>
          <Button onClick={loadRequests} variant="outline" className="flex items-center">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-lg font-bold text-gray-900">
                  {requests.filter(r => r.status === 'pending').length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-lg font-bold text-gray-900">
                  {requests.filter(r => r.status === 'approved').length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-lg font-bold text-gray-900">
                  {requests.filter(r => r.status === 'rejected').length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-lg font-bold text-gray-900">{requests.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <input
                type="text"
                placeholder="Search by username, name, or request ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
              />
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Requests Table */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Password Reset Requests ({filteredRequests.length})
            </h3>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-8 text-center">
              <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No password reset requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
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
                  {filteredRequests.map((request) => {
                    const StatusIcon = getStatusIcon(request.status);
                    const isProcessing = processingRequest === request.id;
                    
                    return (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {request.firstName} {request.lastName}
                              </div>
                              <div className="text-sm text-gray-500">@{request.username}</div>
                              <div className="text-xs text-gray-400">{request.requestId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm ${getPriorityColor(request.reason)}`}>
                            {request.reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {request.submittedAt?.toDate ? 
                            new Date(request.submittedAt.toDate()).toLocaleDateString() : 
                            'Unknown'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleViewDetails(request)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            
                            {request.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => handleApproveRequest(request)}
                                  disabled={isProcessing}
                                >
                                  {isProcessing ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                  ) : (
                                    <Key className="w-3 h-3 mr-1" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => handleRejectRequest(request, 'Request denied by administrator')}
                                  disabled={isProcessing}
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
          )}
        </Card>

        {/* Details Modal */}
        {showDetailsModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Password Reset Request Details
                  </h3>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-4">User Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">
                          {selectedRequest.firstName} {selectedRequest.lastName}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600">@{selectedRequest.username}</span>
                      </div>
                      {selectedRequest.email && (
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">{selectedRequest.email}</span>
                        </div>
                      )}
                      {selectedRequest.phoneNumber && (
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-600">{selectedRequest.phoneNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-4">Request Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">
                          {selectedRequest.submittedAt?.toDate ? 
                            new Date(selectedRequest.submittedAt.toDate()).toLocaleString() : 
                            'Unknown'
                          }
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Reason:</span>
                        <p className="text-sm text-gray-600 mt-1">
                          {selectedRequest.reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Request ID:</span>
                        <p className="text-sm font-mono text-gray-600 mt-1">{selectedRequest.requestId}</p>
                      </div>
                    </div>
                  </div>
                  
                  {selectedRequest.additionalInfo && (
                    <div className="md:col-span-2">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Additional Information</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start">
                          <MessageSquare className="w-4 h-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-gray-600">{selectedRequest.additionalInfo}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {selectedRequest.adminNotes && (
                    <div className="md:col-span-2">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Admin Notes</h4>
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-blue-800">{selectedRequest.adminNotes}</p>
                        {selectedRequest.reviewedBy && (
                          <p className="text-xs text-blue-600 mt-2">
                            Reviewed by: {selectedRequest.reviewedBy}
                            {selectedRequest.reviewedAt?.toDate && 
                              ` on ${new Date(selectedRequest.reviewedAt.toDate()).toLocaleString()}`
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Password Reset Approval Modal */}
        <PasswordResetApprovalModal
          isOpen={showApprovalModal}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedRequest(null);
          }}
          onApprove={processPasswordReset}
          request={selectedRequest}
          isProcessing={processingRequest !== null}
        />
      </div>
    </AdminLayout>
  );
};

export default ManagePasswordResets;
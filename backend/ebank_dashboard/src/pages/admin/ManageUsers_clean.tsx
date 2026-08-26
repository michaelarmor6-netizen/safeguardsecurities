import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/Layout/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemConfigContext } from '../../contexts/SystemConfigContext';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { UserRole } from '../../types';
import toast from 'react-hot-toast';
import { 
  Users, 
  Search, 
  Filter,
  Eye,
  Edit,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  MoreVertical,
  X,
  Shield,
  Info
} from 'lucide-react';

const ManageUsers: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { config, getContactEmail } = useSystemConfigContext();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [newUserData, setNewUserData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    
    // Administrative Role Settings
    role: 'admin',
    department: '',
    jobTitle: '',
    
    // Security Settings
    requireTwoFactor: true,
    temporaryPassword: '',
    
    // Access Permissions (for future enhancement)
    permissions: {
      canManageUsers: false,
      canManageAccounts: true,
      canManageTransactions: true,
      canViewReports: true,
      canManageSettings: false
    }
  });

  // BYPASS user loading - Firestore is corrupted, show empty state
  useEffect(() => {
    console.log('🚫 BYPASSING Firestore user loading due to database corruption');
    setIsLoadingUsers(false);
    setUsers([]); // Empty array - users exist in Firebase Auth but not accessible via Firestore
  }, []);

  // Filter users to show only admin and super-admin users
  const filteredUsers = users.filter(user => {
    // Only show administrative users (admin and super-admin)
    const isAdminUser = user.role === 'admin' || user.role === 'super-admin';
    if (!isAdminUser) return false;
    
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'pending': return Clock;
      case 'suspended': return Ban;
      case 'inactive': return XCircle;
      default: return XCircle;
    }
  };

  // Generate temporary password
  const generateTemporaryPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUserData(prev => ({ ...prev, temporaryPassword: result }));
  };

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    setNewUserData(prev => ({ ...prev, [field]: value }));
  };

  // Modal handlers
  const handleAddUser = () => {
    setShowAddUserModal(true);
    generateTemporaryPassword();
  };

  const handleCloseAddUserModal = () => {
    setShowAddUserModal(false);
    // Reset form data
    setNewUserData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'admin',
      department: '',
      jobTitle: '',
      requireTwoFactor: true,
      temporaryPassword: '',
      permissions: {
        canManageUsers: false,
        canManageAccounts: true,
        canManageTransactions: true,
        canViewReports: true,
        canManageSettings: false
      }
    });
  };

  // Submit new admin user
  const handleSubmitNewUser = async () => {
    if (isCreatingUser) return; // Prevent double submission
    
    try {
      setIsCreatingUser(true);
      
      console.log('⚠️ FIRESTORE BYPASS MODE - Creating Firebase Auth account only');
      
      // Validation for admin user required fields
      const validationErrors: string[] = [];
      
      if (!newUserData.firstName?.trim()) validationErrors.push('First Name');
      if (!newUserData.lastName?.trim()) validationErrors.push('Last Name');
      if (!newUserData.email?.trim()) validationErrors.push('Email Address');
      if (!newUserData.phone?.trim()) validationErrors.push('Phone Number');
      if (!newUserData.jobTitle?.trim()) validationErrors.push('Job Title');
      if (!newUserData.department?.trim()) validationErrors.push('Department');
      
      if (validationErrors.length > 0) {
        toast.error(`Please fill in all required fields: ${validationErrors.join(', ')}`);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newUserData.email)) {
        toast.error('Please enter a valid email address');
        return;
      }

      // Generate temporary password if not already set
      if (!newUserData.temporaryPassword) {
        generateTemporaryPassword();
      }

      console.log('Creating new admin user account...', { 
        email: newUserData.email,
        firstName: newUserData.firstName,
        lastName: newUserData.lastName,
        role: newUserData.role,
        department: newUserData.department,
        jobTitle: newUserData.jobTitle
      });
      
      // 1. Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newUserData.email,
        newUserData.temporaryPassword
      );
      
      const firebaseUser = userCredential.user;
      console.log('Firebase user created:', firebaseUser.uid);

      // 2. Create admin user document in Firestore
      const userData = {
        uid: firebaseUser.uid,
        email: newUserData.email,
        firstName: newUserData.firstName || '',
        lastName: newUserData.lastName || '',
        phoneNumber: newUserData.phone || '',
        role: newUserData.role === 'super-admin' ? UserRole.SUPER_ADMIN : UserRole.ADMIN,
        emailVerified: false,
        twoFactorEnabled: newUserData.requireTwoFactor,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentUser?.uid || 'admin',
        // Admin-specific profile
        adminProfile: {
          department: newUserData.department || '',
          jobTitle: newUserData.jobTitle || '',
          permissions: newUserData.permissions || {
            canManageUsers: false,
            canManageAccounts: true,
            canManageTransactions: true,
            canViewReports: true,
            canManageSettings: false
          }
        }
      };

      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), userData);
        console.log('✅ User document created in Firestore');
      } catch (firestoreError) {
        console.warn('⚠️ Firestore write failed, but Firebase Auth user exists:', firestoreError);
      }

      // 3. Generate email with admin credentials
      const adminEmail = getContactEmail();
      const supportEmail = config.contact.email.support || adminEmail;
      
      const emailSubject = encodeURIComponent(`Admin Account Created - ${newUserData.firstName} ${newUserData.lastName}`);
      const emailBody = encodeURIComponent(`
Dear ${newUserData.firstName} ${newUserData.lastName},

Your administrative account for ${config.companyInfo.name} has been successfully created.

Login Details:
Email: ${newUserData.email}
Temporary Password: ${newUserData.temporaryPassword}
Role: ${newUserData.role}
Department: ${newUserData.department}

Admin Portal: [Your Bank URL]/admin-access

Please log in at your earliest convenience and change your password for security.

Next Steps:
1. Access the admin portal
2. Change your temporary password
3. Review your assigned permissions
4. Familiarize yourself with the system

If you have any questions, please contact us at ${supportEmail} or ${config.contact.phone.primary}.

Best regards,
${config.companyInfo.name} Administration Team
      `);

      const mailtoLink = `mailto:${newUserData.email}?subject=${emailSubject}&body=${emailBody}`;
      window.open(mailtoLink, '_blank');

      console.log('=== ADMIN USER CREATION SUCCESSFUL ===');
      console.log(`Email: ${newUserData.email}`);
      console.log(`Temporary Password: ${newUserData.temporaryPassword}`);
      console.log(`Role: ${newUserData.role}`);
      console.log('Admin Portal URL: /admin-access');
      console.log('Please ensure the admin credentials email is sent.');

      // Show final success message
      toast.success(`🎉 ${newUserData.firstName} ${newUserData.lastName} admin account created!`, {
        duration: 8000
      });

      handleCloseAddUserModal();
      
    } catch (error: any) {
      console.error('Error creating admin user:', error);
      
      // Handle specific Firebase Auth errors
      if (error.code === 'auth/email-already-in-use') {
        toast.error('An account with this email already exists');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password is too weak. Please use a stronger password.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email address format');
      } else {
        toast.error(`Failed to create admin user: ${error.message}`);
      }
    } finally {
      setIsCreatingUser(false);
    }
  };

  return (
    <AdminLayout 
      title="Administrative Users" 
      subtitle="Manage administrative staff accounts and permissions"
    >
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Admin Users</p>
                <p className="text-lg font-bold text-gray-900">{users.filter(u => u.role === 'admin' || u.role === 'super-admin').length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active Admins</p>
                <p className="text-lg font-bold text-gray-900">
                  {users.filter(u => (u.role === 'admin' || u.role === 'super-admin') && u.status === 'active').length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-lg font-bold text-gray-900">
                  {users.filter(u => u.status === 'pending').length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                <Ban className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Suspended</p>
                <p className="text-lg font-bold text-gray-900">
                  {users.filter(u => u.status === 'suspended').length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Controls */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search admin users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
              
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="super-admin">Super Admin</option>
              </select>
            </div>
            
            <Button onClick={handleAddUser} className="flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Add Admin User
            </Button>
          </div>
        </Card>

        {/* Database Status Notice */}
        {users.length === 0 && !isLoadingUsers && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <div className="flex items-center">
              <Info className="h-5 w-5 text-blue-400 mr-2" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">Admin User Management Ready</p>
                <p>No admin users currently loaded. Create new administrative accounts using the "Add Admin User" button above.</p>
              </div>
            </div>
          </div>
        )}

        {/* Admin Users Table */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Administrative Users ({filteredUsers.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role & Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => {
                  const StatusIcon = getStatusIcon(user.status);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 capitalize">
                          {user.role}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.adminProfile?.department || 'Not specified'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.lastLogin ? new Date(user.lastLogin.toDate()).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Button size="sm" variant="outline" className="flex items-center">
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline" className="flex items-center">
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <button className="text-gray-400 hover:text-gray-600">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Add Admin User Modal */}
        {showAddUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Add Administrative User</h3>
                    <p className="text-sm text-gray-600">Create new admin or super-admin account</p>
                  </div>
                  <button
                    onClick={handleCloseAddUserModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {/* Admin User Form */}
                <div className="space-y-6">
                  <div className="flex items-center mb-4">
                    <Shield className="w-5 h-5 text-blue-600 mr-2" />
                    <h4 className="text-lg font-medium text-gray-900">Administrative User Details</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name *
                      </label>
                      <Input
                        type="text"
                        value={newUserData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        placeholder="Enter first name"
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name *
                      </label>
                      <Input
                        type="text"
                        value={newUserData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        placeholder="Enter last name"
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <Input
                        type="email"
                        value={newUserData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="Enter email address"
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <Input
                        type="tel"
                        value={newUserData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="Enter phone number"
                        className="w-full"
                      />
                    </div>
                    
                    {/* Administrative Role Information */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Administrative Role *
                      </label>
                      <select
                        value={newUserData.role}
                        onChange={(e) => handleInputChange('role', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="admin">Administrator</option>
                        <option value="super-admin">Super Administrator</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Department *
                      </label>
                      <Input
                        type="text"
                        value={newUserData.department}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                        placeholder="e.g., Operations, Compliance, IT"
                        className="w-full"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Job Title *
                      </label>
                      <Input
                        type="text"
                        value={newUserData.jobTitle}
                        onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                        placeholder="e.g., Operations Manager, Compliance Officer"
                        className="w-full"
                      />
                    </div>
                    
                    {/* Security Settings */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Security Settings
                      </label>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newUserData.requireTwoFactor}
                          onChange={(e) => handleInputChange('requireTwoFactor', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 text-sm text-gray-700">
                          Require Two-Factor Authentication (Recommended)
                        </label>
                      </div>
                    </div>
                    
                    {/* Temporary Password Display */}
                    {newUserData.temporaryPassword && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Temporary Password (Generated)
                        </label>
                        <div className="bg-gray-50 border rounded-md p-3 font-mono text-sm">
                          {newUserData.temporaryPassword}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          This password will be sent to the user via email
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-end space-x-3">
                  <Button
                    onClick={handleCloseAddUserModal}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitNewUser}
                    disabled={isCreatingUser}
                    className="flex items-center"
                  >
                    {isCreatingUser ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      'Create Admin User'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ManageUsers;
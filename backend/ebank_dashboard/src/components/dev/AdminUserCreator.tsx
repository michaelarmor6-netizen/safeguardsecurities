import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { createAdminUser } from '../../utils/adminUtils';
import { Shield, AlertTriangle, Crown } from 'lucide-react';
import toast from 'react-hot-toast';
import { UserRole } from '../../types';

const AdminUserCreator: React.FC = () => {
  const [userId, setUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.ADMIN);
  const [loading, setLoading] = useState(false);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) {
      toast.error('Please enter a user ID');
      return;
    }

    setLoading(true);
    try {
      const success = await createAdminUser(userId.trim(), selectedRole);
      if (success) {
        const roleLabel = selectedRole === UserRole.SUPER_ADMIN ? 'Super Admin' : 'Admin';
        toast.success(`${roleLabel} privileges granted successfully!`);
        setUserId('');
      } else {
        toast.error('Failed to grant privileges');
      }
    } catch (error) {
      toast.error('Error granting privileges');
    } finally {
      setLoading(false);
    }
  };

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <Card className="p-6 border-2 border-yellow-200 bg-yellow-50">
      <div className="flex items-center mb-4">
        <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
        <h3 className="text-lg font-semibold text-yellow-800">Development Tool: Admin Creator</h3>
      </div>
      
      <p className="text-sm text-yellow-700 mb-4">
        This tool is for development purposes only. Use it to grant admin or super admin privileges to existing users.
      </p>
      
      <form onSubmit={handleCreateAdmin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            User ID (Firebase UID)
          </label>
          <Input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter Firebase User ID"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            You can find the User ID in the browser console after login or in Firebase Auth console
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role Level
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={UserRole.ADMIN}>Admin - Standard admin privileges</option>
            <option value={UserRole.SUPER_ADMIN}>Super Admin - Full system control</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Super Admin can access system settings, branding, and company configuration
          </p>
        </div>
        
        <Button 
          type="submit" 
          disabled={loading}
          className="flex items-center"
        >
          {selectedRole === UserRole.SUPER_ADMIN ? (
            <Crown className="w-4 h-4 mr-2" />
          ) : (
            <Shield className="w-4 h-4 mr-2" />
          )}
          {loading ? 'Granting Privileges...' : `Grant ${selectedRole === UserRole.SUPER_ADMIN ? 'Super Admin' : 'Admin'} Privileges`}
        </Button>
      </form>
      
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>How to use:</strong>
        </p>
        <ol className="text-sm text-blue-600 mt-1 space-y-1">
          <li>1. Sign up a new user account normally</li>
          <li>2. Check browser console for the User ID after login</li>
          <li>3. Enter the User ID above and click "Grant Admin Privileges"</li>
          <li>4. Sign out and sign back in to see admin interface</li>
        </ol>
      </div>
    </Card>
  );
};

export default AdminUserCreator;
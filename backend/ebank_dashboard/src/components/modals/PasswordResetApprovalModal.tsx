import React, { useState } from 'react';
import { X, Mail, Key, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface PasswordResetApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (method: 'email' | 'manual', tempPassword?: string) => Promise<void>;
  request: {
    firstName: string;
    lastName: string;
    username: string;
    email?: string;
    requestId: string;
  } | null;
  isProcessing: boolean;
}

const PasswordResetApprovalModal: React.FC<PasswordResetApprovalModalProps> = ({
  isOpen,
  onClose,
  onApprove,
  request,
  isProcessing
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'manual'>('email');
  const [tempPassword, setTempPassword] = useState('');

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTempPassword(result);
  };

  const handleApprove = async () => {
    if (selectedMethod === 'manual' && !tempPassword) {
      return;
    }
    await onApprove(selectedMethod, tempPassword);
  };

  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Approve Password Reset</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">User Information</h4>
            <p className="text-sm text-gray-600">
              <strong>Name:</strong> {request.firstName} {request.lastName}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Username:</strong> @{request.username}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Email:</strong> {request.email}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Request ID:</strong> {request.requestId}
            </p>
          </div>

          {/* Reset Method Selection */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Choose Password Reset Method:</h4>
            
            {/* Email Method */}
            <div 
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                selectedMethod === 'email' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedMethod('email')}
            >
              <div className="flex items-start">
                <input
                  type="radio"
                  name="resetMethod"
                  value="email"
                  checked={selectedMethod === 'email'}
                  onChange={() => setSelectedMethod('email')}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <Mail className="w-4 h-4 text-blue-600 mr-2" />
                    <span className="font-medium text-gray-900">Send Reset Email</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Send a Firebase password reset email to the user. They can reset their own password securely.
                  </p>
                  <div className="mt-2 text-xs text-green-600 flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Recommended - Most secure
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Method */}
            <div 
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                selectedMethod === 'manual' 
                  ? 'border-orange-500 bg-orange-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedMethod('manual')}
            >
              <div className="flex items-start">
                <input
                  type="radio"
                  name="resetMethod"
                  value="manual"
                  checked={selectedMethod === 'manual'}
                  onChange={() => setSelectedMethod('manual')}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <Key className="w-4 h-4 text-orange-600 mr-2" />
                    <span className="font-medium text-gray-900">Manual Temporary Password</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Set a temporary password for the user. You'll need to communicate this securely.
                  </p>
                  <div className="mt-2 text-xs text-orange-600 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Requires secure communication
                  </div>
                </div>
              </div>
            </div>

            {/* Manual Password Input */}
            {selectedMethod === 'manual' && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temporary Password
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Enter temporary password"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generatePassword}
                    className="px-3"
                  >
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  User will be required to change this password on next login
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end space-x-3">
            <Button onClick={onClose} variant="outline" disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isProcessing || (selectedMethod === 'manual' && !tempPassword)}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Reset
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetApprovalModal;
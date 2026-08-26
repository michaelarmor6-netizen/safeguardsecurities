import React, { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { X, CheckCircle, Clock, AlertTriangle, XCircle, Users, Mail } from 'lucide-react';
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
  status: 'new' | 'in-progress' | 'resolved' | 'closed';
  timestamp: string;
  assignedTo?: string;
  responses?: any[];
  updatedAt?: string;
  resolvedAt?: string;
  tags?: string[];
}

interface QuickActionsModalProps {
  request: SupportRequest;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const QuickActionsModal: React.FC<QuickActionsModalProps> = ({ 
  request, 
  isOpen, 
  onClose, 
  onUpdate 
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(request.status);
  const [assignedTo, setAssignedTo] = useState(request.assignedTo || '');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState(request.priority);

  if (!isOpen) return null;

  const statusOptions = [
    { value: 'new', label: 'New', icon: Clock, color: 'text-blue-600 bg-blue-100' },
    { value: 'in-progress', label: 'In Progress', icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-100' },
    { value: 'resolved', label: 'Resolved', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
    { value: 'closed', label: 'Closed', icon: XCircle, color: 'text-gray-600 bg-gray-100' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'text-green-600 bg-green-100' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-100' },
    { value: 'high', label: 'High', color: 'text-orange-600 bg-orange-100' },
    { value: 'critical', label: 'Critical', color: 'text-red-600 bg-red-100' },
  ];

  const adminUsers = [
    { id: 'admin1', name: 'John Smith', email: 'john@bank.com' },
    { id: 'admin2', name: 'Sarah Wilson', email: 'sarah@bank.com' },
    { id: 'admin3', name: 'Mike Johnson', email: 'mike@bank.com' },
    { id: 'support1', name: 'Lisa Brown', email: 'lisa@bank.com' },
  ];

  const handleSave = async () => {
    if (!request.id) return;

    setLoading(true);
    try {
      const updates: any = {
        status: selectedStatus,
        priority: priority,
        updatedAt: serverTimestamp(),
      };

      if (assignedTo) {
        updates.assignedTo = assignedTo;
      }

      if (selectedStatus === 'resolved') {
        updates.resolvedAt = serverTimestamp();
      }

      if (notes.trim()) {
        updates.lastNote = notes.trim();
        updates.noteAddedAt = serverTimestamp();
      }

      await updateDoc(doc(db, 'support_requests', request.id), updates);

      toast.success('Support request updated successfully');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating support request:', error);
      toast.error('Failed to update support request');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    setLoading(true);
    try {
      let updates: any = {
        updatedAt: serverTimestamp(),
      };

      switch (action) {
        case 'assign-to-me':
          updates.assignedTo = 'current-admin-id'; // Replace with actual admin ID
          updates.status = 'in-progress';
          toast.success('Request assigned to you');
          break;
        case 'mark-high-priority':
          updates.priority = 'high';
          toast.success('Priority set to high');
          break;
        case 'mark-resolved':
          updates.status = 'resolved';
          updates.resolvedAt = serverTimestamp();
          toast.success('Request marked as resolved');
          break;
        case 'send-email':
          // This would integrate with your email system
          toast.success('Email notification sent to customer');
          return; // Don't update the document for email actions
      }

      await updateDoc(doc(db, 'support_requests', request.id), updates);
      onUpdate();
    } catch (error) {
      console.error('Error performing quick action:', error);
      toast.error('Failed to perform action');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Quick Actions - {request.ticketId}
              </h2>
              <p className="text-sm text-gray-600 mt-1">{request.subject}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Quick Action Buttons */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => handleQuickAction('assign-to-me')}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors disabled:opacity-50"
              >
                <Users size={16} />
                Assign to Me
              </button>
              <button
                onClick={() => handleQuickAction('mark-high-priority')}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg border border-orange-200 transition-colors disabled:opacity-50"
              >
                <AlertTriangle size={16} />
                Mark High Priority
              </button>
              <button
                onClick={() => handleQuickAction('mark-resolved')}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg border border-green-200 transition-colors disabled:opacity-50"
              >
                <CheckCircle size={16} />
                Mark Resolved
              </button>
              <button
                onClick={() => handleQuickAction('send-email')}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border border-purple-200 transition-colors disabled:opacity-50"
              >
                <Mail size={16} />
                Send Email
              </button>
            </div>
          </div>

          {/* Detailed Updates */}
          <div className="space-y-6">
            {/* Status Update */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Status
              </label>
              <div className="grid grid-cols-2 gap-3">
                {statusOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setSelectedStatus(option.value as any)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
                        selectedStatus === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`p-1 rounded ${option.color}`}>
                        <IconComponent size={16} />
                      </div>
                      <span className="font-medium">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority Update */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Priority Level
              </label>
              <div className="grid grid-cols-2 gap-3">
                {priorityOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setPriority(option.value as any)}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                      priority === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${option.color.replace('text-', 'bg-').replace('bg-bg-', 'bg-')}`}></div>
                    <span className="font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Assignment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Assign To
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Unassigned</option>
                {adminUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Internal Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Internal Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes about this update..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Save Changes'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickActionsModal;
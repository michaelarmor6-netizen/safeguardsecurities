import React, { useState, useEffect } from 'react';
import { X, Phone, Mail, MessageCircle, Clock, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemConfigContext } from '../../contexts/SystemConfigContext';
import { db } from '../../config/firebase';
import { collection, addDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { EmailTemplateProcessor } from '../../utils/emailTemplates';

interface ContactSupportModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Default subject line for the support request */
  defaultSubject?: string;
  /** Default category for the support request */
  defaultCategory?: string;
}

const ContactSupportModal: React.FC<ContactSupportModalProps> = ({
  isOpen,
  onClose,
  defaultSubject = '',
  defaultCategory = 'account_opening'
}) => {
  const { user } = useAuth();
  const { config, getContactEmail } = useSystemConfigContext();
  const [formData, setFormData] = useState({
    subject: defaultSubject,
    category: defaultCategory,
    priority: 'medium',
    message: '',
    contactMethod: 'email'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        subject: defaultSubject,
        category: defaultCategory
      }));
    }
  }, [isOpen, defaultSubject, defaultCategory]);

  const categories = [
    { value: 'account_opening', label: 'Account Opening' },
    { value: 'technical', label: 'Technical Support' },
    { value: 'transactions', label: 'Transaction Issues' },
    { value: 'security', label: 'Security Concerns' },
    { value: 'billing', label: 'Billing & Fees' },
    { value: 'general', label: 'General Inquiry' }
  ];

  const priorities = [
    { value: 'low', label: 'Low - General Question' },
    { value: 'medium', label: 'Medium - Account Issue' },
    { value: 'high', label: 'High - Urgent Support' },
    { value: 'critical', label: 'Critical - Security Issue' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create support request object
      const supportRequest = {
        ...formData,
        user: {
          email: user?.email,
          uid: user?.uid,
          name: user?.firstName ? `${user.firstName} ${user.lastName}` : user?.email
        },
        timestamp: new Date().toISOString(),
        status: 'new',
        ticketId: `SUP-${Date.now().toString().slice(-6)}`
      };

      // 1. Save to Firestore
      const docRef = await addDoc(collection(db, 'support_requests'), supportRequest);
      console.log('Support request saved to Firestore with ID:', docRef.id);

      // 2. Prepare email notification details
      const adminEmail = getContactEmail(); // Get admin email from system config
      const supportEmail = config.contact.email.support || adminEmail;
      
      console.log('📧 Support request details:');
      console.log(`   Ticket ID: ${supportRequest.ticketId}`);
      console.log(`   Admin Email: ${adminEmail}`);
      console.log(`   Support Email: ${supportEmail}`);
      console.log(`   User: ${supportRequest.user.name} (${supportRequest.user.email})`);
      console.log(`   Category: ${supportRequest.category}`);
      console.log(`   Subject: ${supportRequest.subject}`);
      
      // 3. Process email templates
      const templateProcessor = new EmailTemplateProcessor(config);
      
      // 4. Generate auto-reply email (if enabled)
      const autoReplyUrl = templateProcessor.generateAutoReply(supportRequest, config);
      
      // 5. Success notification
      toast.success(`Support request submitted! Ticket ${supportRequest.ticketId} created.`, {
        duration: 6000,
      });
      
      // 6. Open email clients for both admin notification and auto-reply
      if (navigator.userAgent.includes('Windows') || navigator.userAgent.includes('Mac')) {
        try {
          // Admin notification email (existing functionality)
          const adminEmailSubject = encodeURIComponent(`New Support Request: ${supportRequest.subject} [${supportRequest.ticketId}]`);
          const adminEmailBody = encodeURIComponent(`
New support request received:

Ticket ID: ${supportRequest.ticketId}
From: ${supportRequest.user.name} (${supportRequest.user.email})
Category: ${supportRequest.category}
Priority: ${supportRequest.priority}
Contact Method: ${supportRequest.contactMethod}

Subject: ${supportRequest.subject}

Message:
${supportRequest.message}

---
View full details in Admin Dashboard → Support Requests

${autoReplyUrl ? '\n📧 Auto-reply email prepared. Check your email client for the customer response.' : ''}
          `);
          
          // Open admin notification
          window.open(`mailto:${supportEmail}?subject=${adminEmailSubject}&body=${adminEmailBody}`, '_blank');
          
          // If auto-reply is enabled, also prepare customer response
          if (autoReplyUrl) {
            setTimeout(() => {
              toast.success('Auto-reply email prepared! Check your email client.', {
                duration: 4000,
              });
              window.open(autoReplyUrl, '_blank');
            }, 1000); // Delay to avoid popup blocking
          }
        } catch (emailError) {
          console.log('Email client failed, but request saved to database');
        }
      }
      
      setSubmittedTicketId(supportRequest.ticketId);
      setIsSubmitted(true);
      
      // Auto-close after showing success
      setTimeout(() => {
        handleClose();
      }, 4000);
      
    } catch (error) {
      toast.error('Failed to submit support request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      subject: defaultSubject,
      category: defaultCategory,
      priority: 'medium',
      message: '',
      contactMethod: 'email'
    });
    setIsSubmitted(false);
    setIsSubmitting(false);
    setSubmittedTicketId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {isSubmitted ? (
          // Success State
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Request Submitted!</h2>
            <p className="text-gray-600 mb-4">
              We've received your support request and will get back to you within 24 hours.
            </p>
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Ticket ID:</strong> #{submittedTicketId}
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Save this ID for your records. You'll receive a confirmation email shortly.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          // Form State
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Contact Support</h2>
                <p className="text-sm text-gray-500 mt-1">Get help from our support team</p>
                {user?.email && (
                  <p className="text-xs text-blue-600 mt-1">Logged in as: {user.email}</p>
                )}
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Contact Options */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Contact Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                  <Phone className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Call Us</p>
                    <p className="text-sm text-blue-600">{config.contact.phone.support || config.contact.phone.primary}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Live Chat</p>
                    <p className="text-sm text-green-600">Submit form below</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                  <Mail className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <p className="text-sm text-purple-600">{config.contact.email.support || getContactEmail()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Support Form */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <Input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Brief description of your issue"
                    className="w-full"
                    required
                  />
                </div>

                {/* Category and Priority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {categories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {priorities.map((priority) => (
                        <option key={priority.value} value={priority.value}>
                          {priority.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Please provide detailed information about your request..."
                    rows={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Preferred Contact Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Contact Method
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="contactMethod"
                        value="email"
                        checked={formData.contactMethod === 'email'}
                        onChange={(e) => setFormData({ ...formData, contactMethod: e.target.value })}
                        className="mr-2"
                      />
                      Email
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="contactMethod"
                        value="phone"
                        checked={formData.contactMethod === 'phone'}
                        onChange={(e) => setFormData({ ...formData, contactMethod: e.target.value })}
                        className="mr-2"
                      />
                      Phone
                    </label>
                  </div>
                </div>
              </div>

              {/* Response Time Info */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <p className="text-sm text-gray-600">
                    <strong>Expected Response Time:</strong>
                  </p>
                </div>
                <ul className="mt-2 text-sm text-gray-600 space-y-1">
                  <li>• Account Opening: Within 2-4 business hours</li>
                  <li>• General Inquiries: Within 24 hours</li>
                  <li>• Technical Issues: Within 4-8 hours</li>
                  <li>• Critical/Security: Within 1 hour</li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="mt-6 flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ContactSupportModal;
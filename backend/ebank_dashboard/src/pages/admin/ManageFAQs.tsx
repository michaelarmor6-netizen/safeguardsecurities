import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Eye,
  EyeOff,
  Filter,
  Users,
  RefreshCw,
  Shield,
  CreditCard,
  Phone,
  FileText,
  MessageCircle
} from 'lucide-react';
import AdminLayout from '../../components/Layout/AdminLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { db } from '../../config/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import toast from 'react-hot-toast';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
}

const ManageFAQs: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);

  // Form state for adding/editing
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'account',
    isActive: true,
    order: 1
  });

  const categories = [
    { id: 'all', name: 'All Categories', icon: HelpCircle },
    { id: 'account', name: 'Account Management', icon: Users },
    { id: 'transfers', name: 'Transfers & Payments', icon: RefreshCw },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'fees', name: 'Fees & Charges', icon: CreditCard },
    { id: 'mobile', name: 'Mobile Banking', icon: Phone },
    { id: 'deposits', name: 'Deposits & Withdrawals', icon: FileText },
    { id: 'support', name: 'Customer Service', icon: MessageCircle }
  ];

  useEffect(() => {
    // Listen for FAQs from Firestore
    const q = query(
      collection(db, 'faqs'),
      orderBy('order', 'asc'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const faqsData: FAQ[] = [];
      snapshot.forEach((doc) => {
        faqsData.push({
          id: doc.id,
          ...doc.data()
        } as FAQ);
      });
      setFaqs(faqsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching FAQs:', error);
      // If collection doesn't exist or is empty, initialize with default FAQs
      initializeDefaultFAQs();
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const initializeDefaultFAQs = async () => {
    const defaultFAQs = [
      {
        question: 'How do I change my account password?',
        answer: 'You can change your password by going to Profile Settings > Security > Change Password. You\'ll need to enter your current password and then create a new one. Passwords must be at least 8 characters and include uppercase, lowercase, numbers, and special characters.',
        category: 'account',
        isActive: true,
        order: 1
      },
      {
        question: 'What are the transfer limits?',
        answer: 'Daily transfer limits are $10,000 for standard accounts and $50,000 for premium accounts. Monthly limits are $100,000 and $500,000 respectively. You can request higher limits by contacting support.',
        category: 'transfers',
        isActive: true,
        order: 2
      },
      {
        question: 'How do I enable two-factor authentication?',
        answer: 'Go to Profile Settings > Security > Two-Factor Authentication. You can enable it using SMS, email, or an authenticator app like Google Authenticator. We strongly recommend using an authenticator app for enhanced security.',
        category: 'security',
        isActive: true,
        order: 3
      },
      {
        question: 'What fees are associated with my account?',
        answer: 'Standard accounts have no monthly fees with a $500 minimum balance. Premium accounts have a $15 monthly fee but include unlimited ATM reimbursements and other benefits. See our fee schedule for details.',
        category: 'fees',
        isActive: true,
        order: 4
      },
      {
        question: 'Is there a mobile app available?',
        answer: 'Yes! Our mobile app is available for iOS and Android devices. Download it from the App Store or Google Play Store. The app includes all online banking features plus mobile check deposit.',
        category: 'mobile',
        isActive: true,
        order: 5
      }
    ];

    try {
      for (const faq of defaultFAQs) {
        await addDoc(collection(db, 'faqs'), {
          ...faq,
          createdAt: serverTimestamp(),
          createdBy: 'system'
        });
      }
      toast.success('Default FAQs initialized');
    } catch (error) {
      console.error('Error initializing FAQs:', error);
    }
  };

  const handleAddFAQ = async () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error('Question and answer are required');
      return;
    }

    try {
      await addDoc(collection(db, 'faqs'), {
        ...formData,
        createdAt: serverTimestamp(),
        createdBy: 'admin', // In real app, use current admin ID
      });

      toast.success('FAQ added successfully');
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error adding FAQ:', error);
      toast.error('Failed to add FAQ');
    }
  };

  const handleEditFAQ = async () => {
    if (!editingFAQ || !formData.question.trim() || !formData.answer.trim()) {
      toast.error('Question and answer are required');
      return;
    }

    try {
      await updateDoc(doc(db, 'faqs', editingFAQ.id), {
        ...formData,
        updatedAt: serverTimestamp()
      });

      toast.success('FAQ updated successfully');
      setEditingFAQ(null);
      resetForm();
    } catch (error) {
      console.error('Error updating FAQ:', error);
      toast.error('Failed to update FAQ');
    }
  };

  const handleDeleteFAQ = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'faqs', id));
      toast.success('FAQ deleted successfully');
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      toast.error('Failed to delete FAQ');
    }
  };

  const handleToggleStatus = async (faq: FAQ) => {
    try {
      await updateDoc(doc(db, 'faqs', faq.id), {
        isActive: !faq.isActive,
        updatedAt: serverTimestamp()
      });
      toast.success(`FAQ ${faq.isActive ? 'deactivated' : 'activated'} successfully`);
    } catch (error) {
      console.error('Error updating FAQ status:', error);
      toast.error('Failed to update FAQ status');
    }
  };

  const resetForm = () => {
    setFormData({
      question: '',
      answer: '',
      category: 'account',
      isActive: true,
      order: faqs.length + 1
    });
  };

  const openEditModal = (faq: FAQ) => {
    setEditingFAQ(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      isActive: faq.isActive,
      order: faq.order
    });
    setShowAddModal(true);
  };

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || faq.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && faq.isActive) || 
      (statusFilter === 'inactive' && !faq.isActive);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || categoryId;
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.icon || HelpCircle;
  };

  return (
    <AdminLayout 
      title="Manage FAQs" 
      subtitle="Manage frequently asked questions for customer support"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col lg:flex-row justify-between gap-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full lg:w-80"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <Button 
            onClick={() => {
              resetForm();
              setEditingFAQ(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New FAQ
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <HelpCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total FAQs</p>
                <p className="text-2xl font-bold text-gray-900">{faqs.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">
                  {faqs.filter(faq => faq.isActive).length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg mr-3">
                <EyeOff className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-900">
                  {faqs.filter(faq => !faq.isActive).length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <Filter className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(faqs.map(faq => faq.category)).size}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* FAQ List */}
        <Card className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading FAQs...</p>
            </div>
          ) : filteredFAQs.length === 0 ? (
            <div className="text-center py-8">
              <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No FAQs found</p>
              {searchQuery && (
                <p className="text-sm text-gray-400 mt-2">
                  Try adjusting your search or filters
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFAQs.map((faq) => {
                const CategoryIcon = getCategoryIcon(faq.category);
                return (
                  <div
                    key={faq.id}
                    className={`border rounded-lg p-4 transition-all ${
                      faq.isActive 
                        ? 'border-gray-200 bg-white' 
                        : 'border-gray-100 bg-gray-50 opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-1 bg-gray-100 rounded">
                            <CategoryIcon className="w-4 h-4 text-gray-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-600">
                            {getCategoryName(faq.category)}
                          </span>
                          {!faq.isActive && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>
                        
                        <h3 className="font-medium text-gray-900 mb-2">
                          {faq.question}
                        </h3>
                        
                        <p className="text-gray-600 text-sm leading-relaxed mb-3">
                          {faq.answer.length > 200 
                            ? `${faq.answer.substring(0, 200)}...` 
                            : faq.answer}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Order: {faq.order}</span>
                          <span>Created: {new Date(faq.createdAt).toLocaleDateString()}</span>
                          {faq.updatedAt && (
                            <span>Updated: {new Date(faq.updatedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(faq)}
                          className={`flex items-center gap-1 ${
                            faq.isActive 
                              ? 'text-yellow-600 border-yellow-200 hover:bg-yellow-50' 
                              : 'text-green-600 border-green-200 hover:bg-green-50'
                          }`}
                        >
                          {faq.isActive ? (
                            <>
                              <EyeOff className="w-4 h-4" />
                              Hide
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" />
                              Show
                            </>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(faq)}
                          className="flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteFAQ(faq.id)}
                          className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingFAQ ? 'Edit FAQ' : 'Add New FAQ'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingFAQ(null);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-4">
                {/* Question */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question *
                  </label>
                  <Input
                    type="text"
                    value={formData.question}
                    onChange={(e) => setFormData({...formData, question: e.target.value})}
                    placeholder="Enter the question customers might ask..."
                    className="w-full"
                  />
                </div>

                {/* Answer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Answer *
                  </label>
                  <textarea
                    value={formData.answer}
                    onChange={(e) => setFormData({...formData, answer: e.target.value})}
                    placeholder="Provide a clear, helpful answer..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Category and Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {categories.filter(cat => cat.id !== 'all').map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Display Order
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.order}
                      onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 1})}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Active (visible to customers)
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
              <Button
                onClick={editingFAQ ? handleEditFAQ : handleAddFAQ}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingFAQ ? 'Update FAQ' : 'Add FAQ'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingFAQ(null);
                  resetForm();
                }}
                className="px-6"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ManageFAQs;
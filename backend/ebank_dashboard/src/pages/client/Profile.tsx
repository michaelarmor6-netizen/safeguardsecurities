import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  Bell, 
  CreditCard, 
  Eye, 
  EyeOff, 
  Edit3, 
  Save, 
  X,
  Camera,
  Upload,
  Check,
  AlertTriangle,
  Menu,
  Settings,
  Key,
  Download,
  Trash2,
  Lock,
  Calendar,
  Building,
  Home,
  Briefcase
} from 'lucide-react';
import SecuritySettings from '../../components/modals/SecuritySettings';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import SearchableCountrySelect from '../../components/ui/SearchableCountrySelect';
import { useAuth } from '../../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import toast from 'react-hot-toast';

const Profile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showSecuritySettings, setShowSecuritySettings] = useState(false);
  
  // Enhanced user information with international address support
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    nationality: '',
    occupation: '',
    
    // Home Address (International)
    homeAddress: {
      street: '',
      streetNumber: '',
      apartment: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      region: ''
    },
    
    // Office Address (International)
    officeAddress: {
      companyName: '',
      street: '',
      streetNumber: '',
      floor: '',
      suite: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      region: ''
    },
    
    // Emergency Contact
    emergencyContact: {
      name: '',
      relationship: '',
      phoneNumber: '',
      email: ''
    }
  });

  // Initialize form data when user data is loaded
  useEffect(() => {
    if (user) {
      setFormData(prevData => ({
        ...prevData,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        // Initialize other fields with existing data or empty strings
        dateOfBirth: (user as any).dateOfBirth || '',
        nationality: (user as any).nationality || '',
        occupation: (user as any).occupation || '',
        homeAddress: (user as any).homeAddress || prevData.homeAddress,
        officeAddress: (user as any).officeAddress || prevData.officeAddress,
        emergencyContact: (user as any).emergencyContact || prevData.emergencyContact,
      }));
    }
  }, [user]);

  // Handle form input changes
  const handleInputChange = (section: string, field: string, value: string) => {
    if (section === 'personal') {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else if (section === 'homeAddress') {
      setFormData(prev => ({
        ...prev,
        homeAddress: { ...prev.homeAddress, [field]: value }
      }));
    } else if (section === 'officeAddress') {
      setFormData(prev => ({
        ...prev,
        officeAddress: { ...prev.officeAddress, [field]: value }
      }));
    } else if (section === 'emergencyContact') {
      setFormData(prev => ({
        ...prev,
        emergencyContact: { ...prev.emergencyContact, [field]: value }
      }));
    }
  };

  // Save profile changes
  const handleSave = async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      // Update user document in Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        dateOfBirth: formData.dateOfBirth,
        nationality: formData.nationality,
        occupation: formData.occupation,
        homeAddress: formData.homeAddress,
        officeAddress: formData.officeAddress,
        emergencyContact: formData.emergencyContact,
        updatedAt: new Date()
      });

      // Update auth context
      await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
      });

      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };



  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        // Handle profile image upload here
        console.log('Image uploaded:', e.target?.result);
        toast.success('Profile picture updated successfully');
      };
      reader.readAsDataURL(file);
    }
  };

  const renderPersonalInfo = () => (
    <div className="space-y-8">
      {/* Header with Edit/Save Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Profile Picture */}
      <div className="flex items-center space-x-6 p-6 bg-gray-50 rounded-lg">
        <div className="relative">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
            {user?.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-gray-400" />
            )}
          </div>
          {isEditing && (
            <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
              <Camera className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          )}
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 text-lg">
            {formData.firstName} {formData.lastName}
          </h4>
          <p className="text-sm text-gray-500 mb-2">
            Account ID: {user?.uid.substring(0, 8).toUpperCase()}
          </p>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1 text-green-600">
              <Check className="w-4 h-4" />
              <span>Verified Account</span>
            </div>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
          <div className="relative">
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange('personal', 'firstName', e.target.value)}
              disabled={!isEditing}
              className={`w-full px-4 py-3 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            />
            <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
          <div className="relative">
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange('personal', 'lastName', e.target.value)}
              disabled={!isEditing}
              className={`w-full px-4 py-3 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            />
            <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
          <div className="relative">
            <input
              type="email"
              value={formData.email}
              disabled={true}
              className="w-full px-4 py-3 pl-10 border border-gray-200 bg-gray-50 rounded-lg"
            />
            <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
          </div>
          <p className="text-xs text-gray-500 mt-1">Contact support to change email address</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
          <div className="relative">
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange('personal', 'phoneNumber', e.target.value)}
              disabled={!isEditing}
              placeholder="+1 (555) 123-4567"
              className={`w-full px-4 py-3 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            />
            <Phone className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
          <div className="relative">
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleInputChange('personal', 'dateOfBirth', e.target.value)}
              disabled={!isEditing}
              className={`w-full px-4 py-3 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            />
            <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nationality</label>
          <SearchableCountrySelect
            value={formData.nationality}
            onChange={(value) => handleInputChange('personal', 'nationality', value)}
            placeholder="Select nationality"
            disabled={!isEditing}
            className={isEditing ? '' : 'border-gray-200 bg-gray-50'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Occupation</label>
          <div className="relative">
            <input
              type="text"
              value={formData.occupation}
              onChange={(e) => handleInputChange('personal', 'occupation', e.target.value)}
              disabled={!isEditing}
              placeholder="e.g., Software Engineer, Doctor, Teacher"
              className={`w-full px-4 py-3 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            />
            <Briefcase className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Home Address */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Home className="w-5 h-5 text-gray-600" />
          <h4 className="text-md font-semibold text-gray-900">Home Address</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Street Number</label>
            <input
              type="text"
              value={formData.homeAddress.streetNumber}
              onChange={(e) => handleInputChange('homeAddress', 'streetNumber', e.target.value)}
              disabled={!isEditing}
              placeholder="123"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Street Name *</label>
            <input
              type="text"
              value={formData.homeAddress.street}
              onChange={(e) => handleInputChange('homeAddress', 'street', e.target.value)}
              disabled={!isEditing}
              placeholder="Main Street"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Apartment/Unit</label>
            <input
              type="text"
              value={formData.homeAddress.apartment}
              onChange={(e) => handleInputChange('homeAddress', 'apartment', e.target.value)}
              disabled={!isEditing}
              placeholder="Apt 4B"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
            <input
              type="text"
              value={formData.homeAddress.city}
              onChange={(e) => handleInputChange('homeAddress', 'city', e.target.value)}
              disabled={!isEditing}
              placeholder="New York"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State/Province *</label>
            <input
              type="text"
              value={formData.homeAddress.state}
              onChange={(e) => handleInputChange('homeAddress', 'state', e.target.value)}
              disabled={!isEditing}
              placeholder="NY"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code *</label>
            <input
              type="text"
              value={formData.homeAddress.postalCode}
              onChange={(e) => handleInputChange('homeAddress', 'postalCode', e.target.value)}
              disabled={!isEditing}
              placeholder="10001"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
            <SearchableCountrySelect
              value={formData.homeAddress.country}
              onChange={(value) => handleInputChange('homeAddress', 'country', value)}
              placeholder="Select country"
              disabled={!isEditing}
              className={isEditing ? '' : 'border-gray-200 bg-gray-50'}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
            <input
              type="text"
              value={formData.homeAddress.region}
              onChange={(e) => handleInputChange('homeAddress', 'region', e.target.value)}
              disabled={!isEditing}
              placeholder="North America, Europe, etc."
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Office Address */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Building className="w-5 h-5 text-gray-600" />
          <h4 className="text-md font-semibold text-gray-900">Office Address (Optional)</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
            <input
              type="text"
              value={formData.officeAddress.companyName}
              onChange={(e) => handleInputChange('officeAddress', 'companyName', e.target.value)}
              disabled={!isEditing}
              placeholder="Company Name Inc."
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Street Number</label>
            <input
              type="text"
              value={formData.officeAddress.streetNumber}
              onChange={(e) => handleInputChange('officeAddress', 'streetNumber', e.target.value)}
              disabled={!isEditing}
              placeholder="456"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Street Name</label>
            <input
              type="text"
              value={formData.officeAddress.street}
              onChange={(e) => handleInputChange('officeAddress', 'street', e.target.value)}
              disabled={!isEditing}
              placeholder="Business Boulevard"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Floor</label>
            <input
              type="text"
              value={formData.officeAddress.floor}
              onChange={(e) => handleInputChange('officeAddress', 'floor', e.target.value)}
              disabled={!isEditing}
              placeholder="12th"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Suite/Unit</label>
            <input
              type="text"
              value={formData.officeAddress.suite}
              onChange={(e) => handleInputChange('officeAddress', 'suite', e.target.value)}
              disabled={!isEditing}
              placeholder="Suite 1200"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            <input
              type="text"
              value={formData.officeAddress.city}
              onChange={(e) => handleInputChange('officeAddress', 'city', e.target.value)}
              disabled={!isEditing}
              placeholder="New York"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State/Province</label>
            <input
              type="text"
              value={formData.officeAddress.state}
              onChange={(e) => handleInputChange('officeAddress', 'state', e.target.value)}
              disabled={!isEditing}
              placeholder="NY"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
            <input
              type="text"
              value={formData.officeAddress.postalCode}
              onChange={(e) => handleInputChange('officeAddress', 'postalCode', e.target.value)}
              disabled={!isEditing}
              placeholder="10001"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
          <SearchableCountrySelect
            value={formData.officeAddress.country}
            onChange={(value) => handleInputChange('officeAddress', 'country', value)}
            placeholder="Select country"
            disabled={!isEditing}
            className={isEditing ? '' : 'border-gray-200 bg-gray-50'}
          />
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-gray-600" />
          <h4 className="text-md font-semibold text-gray-900">Emergency Contact</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              value={formData.emergencyContact.name}
              onChange={(e) => handleInputChange('emergencyContact', 'name', e.target.value)}
              disabled={!isEditing}
              placeholder="Emergency Contact Name"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
            <select
              value={formData.emergencyContact.relationship}
              onChange={(e) => handleInputChange('emergencyContact', 'relationship', e.target.value)}
              disabled={!isEditing}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <option value="">Select relationship</option>
              <option value="Spouse">Spouse</option>
              <option value="Parent">Parent</option>
              <option value="Child">Child</option>
              <option value="Sibling">Sibling</option>
              <option value="Friend">Friend</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
            <input
              type="tel"
              value={formData.emergencyContact.phoneNumber}
              onChange={(e) => handleInputChange('emergencyContact', 'phoneNumber', e.target.value)}
              disabled={!isEditing}
              placeholder="+1 (555) 123-4567"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              value={formData.emergencyContact.email}
              onChange={(e) => handleInputChange('emergencyContact', 'email', e.target.value)}
              disabled={!isEditing}
              placeholder="emergency@example.com"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Information Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h5 className="font-medium text-blue-900">Important Information</h5>
            <p className="text-sm text-blue-700 mt-1">
              All personal information is encrypted and stored securely. Fields marked with * are required.
              Contact support if you need assistance updating restricted fields like email address.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
        <p className="text-sm text-gray-600 mb-6">Manage your account security preferences including password, two-factor authentication, and more.</p>
      </div>

      {/* Security Settings Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Advanced Security Settings</h4>
              <p className="text-sm text-gray-500">Manage passwords, two-factor authentication, and security preferences</p>
            </div>
          </div>
          <button
            onClick={() => setShowSecuritySettings(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Settings className="w-4 h-4" />
            <span>Manage Security</span>
          </button>
        </div>
      </div>

      {/* Quick Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Key className="w-5 h-5 text-green-600" />
            <div>
              <h5 className="font-medium text-gray-900">Password</h5>
              <p className="text-sm text-gray-500">Last updated 30 days ago</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-orange-600" />
            <div>
              <h5 className="font-medium text-gray-900">Two-Factor Auth</h5>
              <p className="text-sm text-gray-500">Not configured</p>
            </div>
          </div>
        </div>
      </div>

      {/* Account Activity */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Recent Security Activity</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Successful login</p>
                <p className="text-sm text-gray-500">Today at 2:30 PM from Chrome on Windows</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Profile updated</p>
                <p className="text-sm text-gray-500">Yesterday at 4:15 PM</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => {
    const [notificationSettings, setNotificationSettings] = useState({
      loginNotifications: true,
      transactionAlerts: true,
      monthlyStatements: true,
      marketingEmails: false
    });

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {[
            {
              key: 'loginNotifications',
              title: 'Login Notifications',
              description: 'Get notified when someone logs into your account',
              icon: Shield
            },
            {
              key: 'transactionAlerts',
              title: 'Transaction Alerts',
              description: 'Receive alerts for all account transactions',
              icon: CreditCard
            },
            {
              key: 'monthlyStatements',
              title: 'Monthly Statements',
              description: 'Email monthly account statements',
              icon: Mail
            },
            {
              key: 'marketingEmails',
              title: 'Marketing Emails',
              description: 'Receive updates about new features and offers',
              icon: Bell
            }
          ].map((setting) => {
            const IconComponent = setting.icon;
            return (
              <div key={setting.key} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{setting.title}</h4>
                      <p className="text-sm text-gray-500">{setting.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNotificationSettings(prev => ({
                      ...prev,
                      [setting.key]: !prev[setting.key as keyof typeof prev]
                    }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                      notificationSettings[setting.key as keyof typeof notificationSettings] ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      notificationSettings[setting.key as keyof typeof notificationSettings] ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPreferences = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Preferences</h3>
      </div>

      {/* Data Export */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-3">Export Account Data</h4>
        <p className="text-sm text-gray-600 mb-4">
          Download a copy of your account data including transactions, statements, and profile information.
        </p>
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Download className="w-4 h-4" />
          <span>Request Data Export</span>
        </button>
      </div>

      {/* Account Closure */}
      <div className="bg-white border border-red-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-red-900 mb-2">Close Account</h4>
            <p className="text-sm text-red-700 mb-4">
              Permanently close your account. This action cannot be undone and you will lose access to all your data.
            </p>
            <button className="flex items-center space-x-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4" />
              <span>Close Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout title="Profile Settings" subtitle="Manage your account information and preferences">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'personal', label: 'Personal Info', icon: User },
              { id: 'security', label: 'Security', icon: Shield },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'preferences', label: 'Preferences', icon: Settings }
            ].map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl border p-8">
          {activeTab === 'personal' && renderPersonalInfo()}
          {activeTab === 'security' && renderSecurity()}
          {activeTab === 'notifications' && renderNotifications()}
          {activeTab === 'preferences' && renderPreferences()}
        </div>
      </div>

      {/* Security Settings Modal */}
      {showSecuritySettings && (
        <SecuritySettings
          onClose={() => setShowSecuritySettings(false)}
        />
      )}
    </DashboardLayout>
  );
};

export default Profile;
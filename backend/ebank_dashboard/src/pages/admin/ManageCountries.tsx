import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Upload, 
  Download, 
  Globe, 
  Eye, 
  EyeOff,
  Save,
  X,
  AlertTriangle,
  Check,
  Filter,
  SortAsc,
  SortDesc,
  MoreVertical
} from 'lucide-react';
import AdminLayout from '../../components/Layout/AdminLayout';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import toast from 'react-hot-toast';
import { countries as defaultCountries } from '../../utils/countries';

interface Country {
  id?: string;
  code: string;
  name: string;
  enabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const ManageCountries: React.FC = () => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'name' | 'code' | 'enabled'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterEnabled, setFilterEnabled] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    enabled: true
  });

  // Load countries from Firestore
  const loadCountries = async () => {
    try {
      setLoading(true);
      const countriesRef = collection(db, 'countries');
      const q = query(countriesRef, orderBy('name'));
      const querySnapshot = await getDocs(q);
      
      const loadedCountries = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Country[];

      setCountries(loadedCountries);
    } catch (error) {
      console.error('Error loading countries:', error);
      toast.error('Failed to load countries');
    } finally {
      setLoading(false);
    }
  };

  // Initialize with default countries if none exist
  const initializeCountries = async () => {
    try {
      const countriesRef = collection(db, 'countries');
      const querySnapshot = await getDocs(countriesRef);
      
      if (querySnapshot.empty) {
        const batch = writeBatch(db);
        
        defaultCountries.forEach((country) => {
          const countryRef = doc(countriesRef);
          batch.set(countryRef, {
            code: country.code,
            name: country.name,
            enabled: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        });

        await batch.commit();
        toast.success(`Initialized ${defaultCountries.length} countries`);
        loadCountries();
      } else {
        loadCountries();
      }
    } catch (error) {
      console.error('Error initializing countries:', error);
      toast.error('Failed to initialize countries');
      loadCountries();
    }
  };

  useEffect(() => {
    initializeCountries();
  }, []);

  // Filter and sort countries
  const filteredCountries = countries
    .filter(country => {
      const matchesSearch = country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          country.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterEnabled === 'all' || 
                          (filterEnabled === 'enabled' && country.enabled) ||
                          (filterEnabled === 'disabled' && !country.enabled);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      const direction = sortDirection === 'asc' ? 1 : -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * direction;
      }
      return (aValue < bValue ? -1 : aValue > bValue ? 1 : 0) * direction;
    });

  // Add new country
  const handleAddCountry = async () => {
    try {
      if (!formData.code || !formData.name) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Check for duplicate code
      const existingCountry = countries.find(c => c.code.toUpperCase() === formData.code.toUpperCase());
      if (existingCountry) {
        toast.error('Country code already exists');
        return;
      }

      const countriesRef = collection(db, 'countries');
      await addDoc(countriesRef, {
        code: formData.code.toUpperCase(),
        name: formData.name,
        enabled: formData.enabled,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      toast.success('Country added successfully');
      setShowAddModal(false);
      setFormData({ code: '', name: '', enabled: true });
      loadCountries();
    } catch (error) {
      console.error('Error adding country:', error);
      toast.error('Failed to add country');
    }
  };

  // Edit country
  const handleEditCountry = async () => {
    try {
      if (!editingCountry || !editingCountry.id) return;

      const countryRef = doc(db, 'countries', editingCountry.id);
      await updateDoc(countryRef, {
        code: editingCountry.code.toUpperCase(),
        name: editingCountry.name,
        enabled: editingCountry.enabled,
        updatedAt: new Date()
      });

      toast.success('Country updated successfully');
      setEditingCountry(null);
      loadCountries();
    } catch (error) {
      console.error('Error updating country:', error);
      toast.error('Failed to update country');
    }
  };

  // Delete country
  const handleDeleteCountry = async (countryId: string, countryName: string) => {
    if (!confirm(`Are you sure you want to delete "${countryName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const countryRef = doc(db, 'countries', countryId);
      await deleteDoc(countryRef);
      toast.success('Country deleted successfully');
      loadCountries();
    } catch (error) {
      console.error('Error deleting country:', error);
      toast.error('Failed to delete country');
    }
  };

  // Bulk enable/disable
  const handleBulkToggle = async (enable: boolean) => {
    if (selectedCountries.length === 0) {
      toast.error('No countries selected');
      return;
    }

    try {
      const batch = writeBatch(db);
      selectedCountries.forEach(countryId => {
        const countryRef = doc(db, 'countries', countryId);
        batch.update(countryRef, { 
          enabled: enable,
          updatedAt: new Date()
        });
      });

      await batch.commit();
      toast.success(`${selectedCountries.length} countries ${enable ? 'enabled' : 'disabled'}`);
      setSelectedCountries([]);
      loadCountries();
    } catch (error) {
      console.error('Error updating countries:', error);
      toast.error('Failed to update countries');
    }
  };

  // Export countries
  const handleExport = () => {
    const dataStr = JSON.stringify(countries, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `countries_export_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('Countries exported successfully');
  };

  // Handle sorting
  const handleSort = (field: 'name' | 'code' | 'enabled') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <AdminLayout title="Manage Countries" subtitle="Loading countries...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Manage Countries" subtitle="Manage supported countries for dropdown selections">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search countries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
              />
            </div>

            {/* Filter */}
            <select
              value={filterEnabled}
              onChange={(e) => setFilterEnabled(e.target.value as 'all' | 'enabled' | 'disabled')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Countries</option>
              <option value="enabled">Enabled Only</option>
              <option value="disabled">Disabled Only</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Country
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedCountries.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">
                {selectedCountries.length} countries selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkToggle(true)}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Enable Selected
                </button>
                <button
                  onClick={() => handleBulkToggle(false)}
                  className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                >
                  Disable Selected
                </button>
                <button
                  onClick={() => setSelectedCountries([])}
                  className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Countries Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedCountries.length === filteredCountries.length && filteredCountries.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCountries(filteredCountries.map(c => c.id!));
                        } else {
                          setSelectedCountries([]);
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('code')}
                  >
                    <div className="flex items-center gap-1">
                      Code
                      {getSortIcon('code')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Country Name
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('enabled')}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {getSortIcon('enabled')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCountries.map((country) => (
                  <tr key={country.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedCountries.includes(country.id!)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCountries([...selectedCountries, country.id!]);
                          } else {
                            setSelectedCountries(selectedCountries.filter(id => id !== country.id));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingCountry?.id === country.id ? (
                        <input
                          type="text"
                          value={editingCountry?.code || ''}
                          onChange={(e) => editingCountry && setEditingCountry({...editingCountry, code: e.target.value})}
                          className="px-2 py-1 border border-gray-300 rounded text-sm w-16"
                          maxLength={3}
                        />
                      ) : (
                        <span className="text-sm font-mono font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                          {country.code}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingCountry?.id === country.id ? (
                        <input
                          type="text"
                          value={editingCountry?.name || ''}
                          onChange={(e) => editingCountry && setEditingCountry({...editingCountry, name: e.target.value})}
                          className="px-2 py-1 border border-gray-300 rounded text-sm w-full"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{country.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingCountry?.id === country.id ? (
                        <select
                          value={editingCountry?.enabled ? 'enabled' : 'disabled'}
                          onChange={(e) => editingCountry && setEditingCountry({...editingCountry, enabled: e.target.value === 'enabled'})}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="enabled">Enabled</option>
                          <option value="disabled">Disabled</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          country.enabled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {country.enabled ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Enabled
                            </>
                          ) : (
                            <>
                              <X className="w-3 h-3 mr-1" />
                              Disabled
                            </>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingCountry?.id === country.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={handleEditCountry}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingCountry(null)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setEditingCountry(country)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCountry(country.id!, country.name)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCountries.length === 0 && (
            <div className="text-center py-12">
              <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No countries found</h3>
              <p className="text-gray-500 mb-4">
                {searchQuery ? 'Try adjusting your search terms.' : 'Get started by adding a new country.'}
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add First Country
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <Globe className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Countries</p>
                <p className="text-2xl font-semibold text-gray-900">{countries.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <Check className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Enabled</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {countries.filter(c => c.enabled).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <EyeOff className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Disabled</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {countries.filter(c => !c.enabled).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Country Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Country</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="e.g., US, GB, DE"
                  maxLength={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., United States"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({...formData, enabled: e.target.checked})}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="enabled" className="ml-2 text-sm text-gray-700">
                  Enable this country
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddCountry}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Country
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({ code: '', name: '', enabled: true });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ManageCountries;
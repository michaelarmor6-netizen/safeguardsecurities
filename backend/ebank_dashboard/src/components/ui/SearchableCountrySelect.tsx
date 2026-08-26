import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Globe } from 'lucide-react';
import { Country, countries as staticCountries } from '../../utils/countries';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface SearchableCountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

const SearchableCountrySelect: React.FC<SearchableCountrySelectProps> = ({
  value,
  onChange,
  placeholder = "Select country",
  disabled = false,
  className = "",
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load countries from Firestore with static fallback
  const loadCountries = async () => {
    try {
      setLoading(true);
      const countriesRef = collection(db, 'countries');
      const q = query(
        countriesRef, 
        where('enabled', '==', true),
        orderBy('name')
      );
      const querySnapshot = await getDocs(q);
      
      const loadedCountries = querySnapshot.docs.map(doc => ({
        id: doc.id,
        code: doc.data().code,
        name: doc.data().name,
        enabled: doc.data().enabled
      })) as Country[];

      if (loadedCountries.length > 0) {
        setCountries(loadedCountries);
        console.log('Loaded countries from Firestore:', loadedCountries.length);
      } else {
        // Use static countries if Firestore is empty
        setCountries(staticCountries);
        console.log('Using static countries fallback:', staticCountries.length);
      }
    } catch (error) {
      console.error('Error loading countries from Firestore:', error);
      // Fallback to static countries if Firestore fails
      setCountries(staticCountries);
      console.log('Using static countries due to Firestore error:', staticCountries.length);
    } finally {
      setLoading(false);
    }
  };

  // Load countries on component mount with immediate static fallback
  useEffect(() => {
    // Immediately set static countries for instant availability
    setCountries(staticCountries);
    
    // Then try to load from Firestore (will replace static if successful)
    loadCountries();
  }, []);

  // Get selected country display name
  const selectedCountry = countries.find(country => 
    country.name === value || country.code === value
  );

  // Search countries function
  const searchCountries = (query: string): Country[] => {
    if (!query || query.length < 1) return countries.slice(0, 10); // Show first 10 if no query
    
    const searchTerm = query.toLowerCase().trim();
    
    return countries.filter(country => 
      country.name.toLowerCase().includes(searchTerm) ||
      country.code.toLowerCase().includes(searchTerm)
    ).slice(0, 20); // Return top 20 matches
  };

  // Handle search query changes
  useEffect(() => {
    if (searchQuery.length >= 1) {
      const results = searchCountries(searchQuery);
      setFilteredCountries(results);
      setHighlightedIndex(0);
    } else if (searchQuery.length === 0 && isOpen) {
      // Show top 20 most common countries when no search
      const commonCountries = countries.filter(country => 
        ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'SG', 'CH', 'NL'].includes(country.code)
      );
      setFilteredCountries(commonCountries);
      setHighlightedIndex(0);
    } else {
      setFilteredCountries([]);
      setHighlightedIndex(-1);
    }
  }, [searchQuery, isOpen, countries]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredCountries.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredCountries[highlightedIndex]) {
          handleSelectCountry(filteredCountries[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSelectCountry = (country: Country) => {
    onChange(country.name);
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
  };

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const handleToggleDropdown = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main Input Display */}
      <div
        onClick={handleToggleDropdown}
        className={`
          w-full px-4 py-3 pl-10 border rounded-lg cursor-pointer transition-colors
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}
          ${className.includes('border-gray-200 bg-gray-50') ? 'bg-gray-50 border-gray-200' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1">
            <Globe className="w-4 h-4 text-gray-400 absolute left-3" />
            <span className={selectedCountry ? 'text-gray-900' : 'text-gray-500'}>
              {selectedCountry ? selectedCountry.name : placeholder}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {selectedCountry && !disabled && (
              <button
                onClick={handleClearSelection}
                className="text-gray-400 hover:text-gray-600 p-1"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <ChevronDown 
              className={`w-4 h-4 text-gray-400 transition-transform ${
                isOpen ? 'transform rotate-180' : ''
              }`} 
            />
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type 3+ characters to search countries..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Country List */}
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-sm text-gray-500 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                Loading countries...
              </div>
            ) : searchQuery.length > 0 && searchQuery.length < 3 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                Type at least 3 characters to search
              </div>
            ) : filteredCountries.length > 0 ? (
              filteredCountries.map((country, index) => (
                <div
                  key={country.code}
                  onClick={() => handleSelectCountry(country)}
                  className={`
                    px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-gray-50
                    ${index === highlightedIndex ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}
                    ${selectedCountry?.code === country.code ? 'bg-blue-100 font-medium' : ''}
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-mono text-gray-500 w-8">
                      {country.code}
                    </span>
                    <span className="text-sm">{country.name}</span>
                  </div>
                  {selectedCountry?.code === country.code && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  )}
                </div>
              ))
            ) : searchQuery.length >= 3 ? (
              <div className="px-4 py-6 text-sm text-gray-500 text-center">
                <Globe className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                No countries found matching "{searchQuery}"
              </div>
            ) : countries.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-500 text-center">
                <Globe className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                No countries available
              </div>
            ) : (
              <div className="px-4 py-3 text-xs text-gray-400 text-center bg-gray-50">
                Popular Countries
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableCountrySelect;
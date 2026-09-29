import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Globe } from 'lucide-react';
import { Country, countries as staticCountries, matchCountries } from '../../utils/countries';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface SearchableCountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

const POPULAR_CODES = ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'AE', 'JP', 'SG', 'IN', 'PH', 'CN'];

const SearchableCountrySelect: React.FC<SearchableCountrySelectProps> = ({
  value,
  onChange,
  placeholder = 'Select country',
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [countries, setCountries] = useState<Country[]>(staticCountries);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // The built-in list is always shown. Firestore only hides countries an admin
  // turned off, and a failed read leaves the full list in place.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'countries'), where('enabled', '==', false)));
        if (cancelled) return;
        const disabledCodes = new Set(
          snap.docs.map((row) => String(row.data().code ?? '').toUpperCase()).filter(Boolean),
        );
        if (disabledCodes.size > 0) {
          setCountries(staticCountries.filter((country) => !disabledCodes.has(country.code)));
        }
      } catch {
        // Keep the static list. A slow or denied countries read must not blank the menu.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCountry = countries.find(
    (country) => country.name === value || country.code === value,
  );

  const visibleCountries = useMemo(() => {
    const term = searchQuery.trim();
    if (term) return matchCountries(countries, term).slice(0, 30);
    const popular = POPULAR_CODES
      .map((code) => countries.find((country) => country.code === code))
      .filter((country): country is Country => Boolean(country));
    const rest = countries.filter((country) => !POPULAR_CODES.includes(country.code));
    return [...popular, ...rest];
  }, [countries, searchQuery]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const row = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    row?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen]);

  const handleSelectCountry = (country: Country) => {
    onChange(country.name);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, visibleCountries.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (visibleCountries[highlightedIndex]) handleSelectCountry(visibleCountries[highlightedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        break;
      default:
        break;
    }
  };

  const open = () => {
    if (disabled) return;
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-expanded={isOpen}
        onClick={() => {
          if (disabled) return;
          if (isOpen) setIsOpen(false);
          else open();
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isOpen) setIsOpen(false);
            else open();
          }
        }}
        className="sg-input flex w-full cursor-pointer items-center justify-between text-left"
        style={{
          background: 'var(--sg-bg-input, #ffffff)',
          color: 'var(--sg-text, #111827)',
          borderColor: isOpen ? 'var(--sg-indigo-deep, #2563eb)' : 'var(--sg-border-strong, #d1d5db)',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Globe className="h-4 w-4 shrink-0" style={{ color: 'var(--sg-muted, #6b7280)' }} />
          <span className="truncate" style={{ color: selectedCountry ? 'var(--sg-text, #111827)' : 'var(--sg-muted, #6b7280)' }}>
            {selectedCountry ? selectedCountry.name : value || placeholder}
          </span>
        </span>
        <span className="flex items-center gap-1">
          {selectedCountry && !disabled && (
            <button
              type="button"
              aria-label="Clear country"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="rounded p-1"
              style={{ color: 'var(--sg-muted, #6b7280)' }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--sg-muted, #6b7280)' }}
          />
        </span>
      </div>

      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border shadow-lg"
          style={{
            background: 'var(--sg-bg-elevated, #ffffff)',
            borderColor: 'var(--sg-border-strong, #d1d5db)',
            color: 'var(--sg-text, #111827)',
          }}
        >
          <div className="border-b p-2" style={{ borderColor: 'var(--sg-border, #e5e7eb)' }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--sg-muted, #6b7280)' }} />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search by name or code, such as USA"
                className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none"
                style={{
                  background: 'var(--sg-bg-input, #ffffff)',
                  color: 'var(--sg-text, #111827)',
                  borderColor: 'var(--sg-border-strong, #d1d5db)',
                }}
              />
            </div>
          </div>

          <div ref={listRef} className="max-h-60 overflow-y-auto">
            {visibleCountries.length > 0 ? (
              visibleCountries.map((country, index) => {
                const active = index === highlightedIndex;
                const selected = selectedCountry?.code === country.code;
                return (
                  <div
                    key={country.code}
                    data-active={active ? 'true' : 'false'}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectCountry(country);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className="flex cursor-pointer items-center justify-between px-3 py-2.5"
                    style={{
                      background: active || selected ? 'var(--sg-badge-bg, #eff6ff)' : 'transparent',
                      color: 'var(--sg-text, #111827)',
                    }}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="w-8 shrink-0 font-mono text-xs" style={{ color: 'var(--sg-muted, #6b7280)' }}>
                        {country.code}
                      </span>
                      <span className="truncate text-sm">{country.name}</span>
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--sg-muted, #6b7280)' }}>
                No countries found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableCountrySelect;

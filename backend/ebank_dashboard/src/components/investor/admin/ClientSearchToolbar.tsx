import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import {
  CLIENT_SEARCH_FIELDS,
  clientSearchPlaceholder,
  type ClientSearchField,
} from '../../../lib/clientSearch';

type Props = {
  search: string;
  searchField: ClientSearchField;
  onSearch: (value: string) => void;
  onField: (field: ClientSearchField) => void;
  onClear?: () => void;
  showClear?: boolean;
  children?: ReactNode;
};

export default function ClientSearchToolbar({
  search,
  searchField,
  onSearch,
  onField,
  onClear,
  showClear,
  children,
}: Props) {
  return (
    <div className="sg-desk-tools">
      <div className="sg-desk-field sg-desk-field-fixed">
        <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Search by</label>
        <select
          className="sg-input"
          value={searchField}
          onChange={(e) => onField(e.target.value as ClientSearchField)}
        >
          {CLIENT_SEARCH_FIELDS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>
      <div className="sg-desk-field sg-desk-field-grow">
        <label className="text-xs block mb-1" style={{ color: 'var(--sg-muted-2)' }}>Search</label>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 sg-input-icon" style={{ color: 'var(--sg-muted-2)' }} />
          <input
            className="sg-input sg-input-icon-left"
            placeholder={clientSearchPlaceholder(searchField)}
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>
      {children}
      {showClear && onClear && (
        <button type="button" className="sg-btn-ghost" onClick={onClear}>Clear</button>
      )}
    </div>
  );
}

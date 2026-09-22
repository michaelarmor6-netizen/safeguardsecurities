import type { InvestorProfile } from '../services/investor/profileService';

export type ClientSearchField = 'all' | 'username' | 'email' | 'name';

export const CLIENT_SEARCH_FIELDS: { value: ClientSearchField; label: string }[] = [
  { value: 'all', label: 'Any field' },
  { value: 'username', label: 'Username' },
  { value: 'email', label: 'Email' },
  { value: 'name', label: 'Name' },
];

export function profileUsername(u: InvestorProfile): string {
  const stored = u.username?.trim();
  if (stored) return stored;
  const handle = u.displayName?.trim();
  if (handle && !handle.includes(' ')) return handle;
  return (u.email ?? '').split('@')[0] || '';
}

export function profileFullName(u: InvestorProfile): string {
  return [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' ').trim()
    || (u.displayName?.includes(' ') ? u.displayName.trim() : '')
    || '';
}

export function matchesClientSearch(
  u: InvestorProfile,
  query: string,
  field: ClientSearchField = 'all',
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const username = profileUsername(u).toLowerCase();
  const email = (u.email ?? '').toLowerCase();
  const name = profileFullName(u).toLowerCase();
  if (field === 'username') return username.includes(q);
  if (field === 'email') return email.includes(q);
  if (field === 'name') return name.includes(q);
  return username.includes(q) || email.includes(q) || name.includes(q) || u.id.toLowerCase().includes(q);
}

export function clientSearchPlaceholder(field: ClientSearchField): string {
  if (field === 'username') return 'Search by username';
  if (field === 'email') return 'Search by email';
  if (field === 'name') return 'Search by first or last name';
  return 'Search username, email, or name';
}

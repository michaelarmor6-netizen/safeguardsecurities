export type InvestorRole =
  | 'client'
  | 'support'
  | 'admin'
  | 'finance'
  | 'compliance'
  | 'super_admin';

export type AccountStatus = 'pending' | 'active' | 'suspended' | 'locked';

export const SUPER_ADMIN_EMAILS = ['admin@safeguardsecurities.us'];

export function isSuperAdminEmail(email?: string | null): boolean {
  return SUPER_ADMIN_EMAILS.includes((email ?? '').trim().toLowerCase());
}

export function resolveInvestorRole(email?: string | null, stored?: string): InvestorRole {
  const normalized = (email ?? '').trim().toLowerCase();
  // Allowlisted emails always win over a stale Firestore role (e.g. client/pending).
  if (isSuperAdminEmail(normalized)) return 'super_admin';
  if (stored && isInvestorRole(stored)) return stored;
  if (normalized.includes('support')) return 'support';
  if (normalized.includes('admin')) return 'admin';
  return 'client';
}

export function isInvestorRole(value: string): value is InvestorRole {
  return ['client', 'support', 'admin', 'finance', 'compliance', 'super_admin'].includes(value);
}

export function isInvestorAdmin(role: InvestorRole): boolean {
  return role !== 'client';
}

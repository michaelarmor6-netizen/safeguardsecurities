import { getAllInvestorProfiles, deleteInvestorProfile, type InvestorProfile } from './profileService';

const MOCK_EMAIL_PATTERN = /(\.test@|\+test@|@example\.com$|^test@|^mock@|@test\.local$)/i;

export interface DataResetPreview {
  toRemove: InvestorProfile[];
  preservedClients: number;
  staffKept: number;
  approvedClientsKept: number;
}

function isRemovalCandidate(p: InvestorProfile): boolean {
  if (p.role !== 'client') return false;
  if (MOCK_EMAIL_PATTERN.test(p.email)) return true;
  // Abandoned signup: never made any onboarding progress at all. Anything
  // that completed onboarding (even pending review) or was explicitly
  // skipped is a real user action and is deliberately NOT touched here.
  return p.accountStatus === 'pending' && !p.onboardingCompleted && !p.onboardingSkipped;
}

// Read-only - never deletes anything. Always call this first and show the
// admin exactly what would be removed before executeDataReset can run.
export async function previewDataReset(): Promise<DataResetPreview> {
  const all = await getAllInvestorProfiles();
  const toRemove = all.filter(isRemovalCandidate);
  const staffKept = all.filter((p) => p.role !== 'client').length;
  const approvedClientsKept = all.filter((p) => p.role === 'client' && p.accountStatus === 'active').length;
  const preservedClients = all.length - toRemove.length - staffKept;
  return { toRemove, preservedClients, staffKept, approvedClientsKept };
}

// Deletes only the Firestore profile documents in the given id list (never
// the underlying Firebase Auth user - same safe semantics as
// deleteInvestorProfile elsewhere in this app). Re-derives the removal set
// server-side... actually client-side here, but re-validates each id against
// isRemovalCandidate() before deleting, so a stale/tampered id list can
// never delete more than the original preview would have allowed.
export async function executeDataReset(candidateIds: string[]): Promise<number> {
  const all = await getAllInvestorProfiles();
  const allowed = new Set(all.filter(isRemovalCandidate).map((p) => p.id));
  const toDelete = candidateIds.filter((id) => allowed.has(id));
  await Promise.all(toDelete.map((id) => deleteInvestorProfile(id)));
  return toDelete.length;
}

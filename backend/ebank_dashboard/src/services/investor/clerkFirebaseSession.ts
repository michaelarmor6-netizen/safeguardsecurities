import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { clerkSessionUrl } from '../../lib/clerk';
import { ensureInvestorProfile, type InvestorProfile } from './profileService';

// Clerk holds the password. Firestore rules still require a Firebase Auth
// session, so the Worker verifies the Clerk token and returns a Firebase
// custom token for the same email.
export async function connectClerkSession(getToken: () => Promise<string | null>): Promise<InvestorProfile> {
  const url = clerkSessionUrl();
  if (!url) {
    throw new Error('Clerk is on, but the session exchange URL is not configured.');
  }

  const clerkToken = (await getToken()) ?? (await getToken());
  if (!clerkToken) {
    throw new Error('Clerk did not return a session.');
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${clerkToken}` },
  });
  const body = (await res.json().catch(() => ({}))) as { token?: unknown; error?: unknown };
  if (!res.ok || typeof body.token !== 'string') {
    const message = typeof body.error === 'string' ? body.error : 'Could not open your SafeGuard session.';
    throw new Error(message);
  }

  const cred = await signInWithCustomToken(auth, body.token);
  const email = cred.user.email ?? '';
  if (!email) {
    throw new Error('Signed in, but no email was attached to the account.');
  }
  return ensureInvestorProfile(cred.user.uid, email);
}

export function messageFromClerkError(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Could not continue.';
  const record = error as {
    message?: string;
    longMessage?: string;
    errors?: { message?: string; longMessage?: string }[];
  };
  const first = record.errors?.[0];
  return first?.longMessage || first?.message || record.longMessage || record.message || 'Could not continue.';
}

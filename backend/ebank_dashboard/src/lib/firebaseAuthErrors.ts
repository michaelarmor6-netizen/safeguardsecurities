import { FirebaseError } from 'firebase/app';

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password. Use the same account that works on app.safeguardsecurities.us.',
  'auth/wrong-password': 'Incorrect email or password. Use the same account that works on app.safeguardsecurities.us.',
  'auth/user-not-found': 'No account found for this email in SafeGuard Firebase (e-bank-dashboard).',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
  'auth/user-disabled': 'This account has been disabled. Contact support.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/unauthorized-domain': 'This site is not authorized in Firebase. Add sggwebs.com (and www) under Authentication → Settings → Authorized domains.',
  'auth/operation-not-allowed': 'Email/password sign-in is disabled in Firebase Authentication.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/missing-password': 'Please enter your password.',
};

function getAuthErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code.startsWith('auth/')) return code;
  }
  if (error instanceof Error) {
    const match = error.message.match(/\(auth\/[^)]+\)/);
    if (match) return match[0].slice(1, -1);
  }
  return null;
}

export function getFirebaseAuthErrorMessage(error: unknown): string {
  const code = getAuthErrorCode(error);
  if (code && AUTH_ERROR_MESSAGES[code]) return AUTH_ERROR_MESSAGES[code];
  if (error instanceof FirebaseError && AUTH_ERROR_MESSAGES[error.code]) {
    return AUTH_ERROR_MESSAGES[error.code];
  }
  if (error instanceof Error) return error.message;
  return 'Authentication failed';
}

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

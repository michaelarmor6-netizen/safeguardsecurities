import { ClerkProvider } from '@clerk/react';
import { clerkPublishableKey, isClerkAuthEnabled } from '../../lib/clerk';

export function ClerkGate({ children }: { children: React.ReactNode }) {
  if (!isClerkAuthEnabled()) return children;
  return <ClerkProvider publishableKey={clerkPublishableKey()}>{children}</ClerkProvider>;
}

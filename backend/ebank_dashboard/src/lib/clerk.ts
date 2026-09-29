export function clerkPublishableKey(): string {
  return (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? '').trim();
}

export function isClerkAuthEnabled(): boolean {
  return clerkPublishableKey().startsWith('pk_');
}

export function clerkSessionUrl(): string {
  return (import.meta.env.VITE_CLERK_SESSION_URL ?? '').trim();
}

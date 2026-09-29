import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from 'jose';

// Secrets are set with `wrangler secret put` and are not in wrangler.jsonc.
// Names must match the keys read below.
type SessionEnv = Env & {
  CLERK_SECRET_KEY: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
};

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
let signingKey: CryptoKey | undefined;
let googleToken: { value: string; exp: number } | undefined;

function json(body: unknown, status: number, origin: string | null, allowed: string[]): Response {
  const allow = origin && allowed.includes(origin) ? origin : '';
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    vary: 'Origin',
  };
  if (allow) headers['access-control-allow-origin'] = allow;
  return new Response(JSON.stringify(body), { status, headers });
}

function allowedOrigins(env: Env): string[] {
  return env.ALLOWED_ORIGINS.split(',').map((item) => item.trim()).filter(Boolean);
}

function normalizePem(value: string): string {
  return value.includes('\\n') ? value.replace(/\\n/g, '\n') : value;
}

async function firebaseSigningKey(env: SessionEnv): Promise<CryptoKey> {
  if (!signingKey) {
    signingKey = await importPKCS8(normalizePem(env.FIREBASE_PRIVATE_KEY), 'RS256');
  }
  return signingKey;
}

async function googleAccessToken(env: SessionEnv): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (googleToken && googleToken.exp > now + 60) return googleToken.value;
  const key = await firebaseSigningKey(env);
  const assertion = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/firebase',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(env.FIREBASE_CLIENT_EMAIL)
    .setSubject(env.FIREBASE_CLIENT_EMAIL)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const body = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !body.access_token) {
    throw new Error(body.error || 'Google auth failed');
  }
  googleToken = { value: body.access_token, exp: now + (body.expires_in ?? 3600) };
  return body.access_token;
}

async function firebaseUidForEmail(env: SessionEnv, email: string): Promise<string> {
  const access = await googleAccessToken(env);
  const headers = { authorization: `Bearer ${access}`, 'content-type': 'application/json' };
  const lookup = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts:lookup`,
    { method: 'POST', headers, body: JSON.stringify({ email: [email] }) },
  );
  const lookedUp = (await lookup.json()) as { users?: { localId?: string }[]; error?: { message?: string } };
  const existing = lookedUp.users?.[0]?.localId;
  if (existing) return existing;

  const created = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts`,
    { method: 'POST', headers, body: JSON.stringify({ email, emailVerified: true }) },
  );
  const account = (await created.json()) as { localId?: string; error?: { message?: string } };
  if (!created.ok || !account.localId) {
    throw new Error(account.error?.message || 'Could not create the Firebase user');
  }
  return account.localId;
}

async function clerkEmail(env: SessionEnv, token: string, origin: string): Promise<string> {
  if (!env.CLERK_FRONTEND_API) throw new Error('CLERK_FRONTEND_API is not set');
  if (!jwks) jwks = createRemoteJWKSet(new URL(`${env.CLERK_FRONTEND_API}/.well-known/jwks.json`));
  const { payload } = await jwtVerify(token, jwks, { issuer: env.CLERK_FRONTEND_API });
  const azp = typeof payload.azp === 'string' ? payload.azp : '';
  if (azp && azp !== origin) throw new Error('Session origin was rejected');
  const userId = typeof payload.sub === 'string' ? payload.sub : '';
  if (!userId) throw new Error('Clerk session has no user');

  const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: { authorization: `Bearer ${env.CLERK_SECRET_KEY}` },
  });
  const user = (await res.json()) as {
    primary_email_address_id?: string;
    email_addresses?: { id?: string; email_address?: string; verification?: { status?: string } }[];
    errors?: { message?: string }[];
  };
  if (!res.ok) throw new Error(user.errors?.[0]?.message || 'Could not read the Clerk user');
  const primary = user.email_addresses?.find((item) => item.id === user.primary_email_address_id);
  if (!primary?.email_address || primary.verification?.status !== 'verified') {
    throw new Error('Verify your email before continuing');
  }
  return primary.email_address.trim().toLowerCase();
}

async function firebaseCustomToken(env: SessionEnv, uid: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const key = await firebaseSigningKey(env);
  return new SignJWT({ uid })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(env.FIREBASE_CLIENT_EMAIL)
    .setSubject(env.FIREBASE_CLIENT_EMAIL)
    .setAudience('https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);
}

export default {
  async fetch(request, env): Promise<Response> {
    const sessionEnv = env as SessionEnv;
    const origin = request.headers.get('Origin');
    const allowed = allowedOrigins(env);

    if (request.method === 'OPTIONS') {
      const headers = new Headers({ vary: 'Origin' });
      if (origin && allowed.includes(origin)) {
        headers.set('access-control-allow-origin', origin);
        headers.set('access-control-allow-headers', 'Authorization, Content-Type');
        headers.set('access-control-allow-methods', 'POST, OPTIONS');
      }
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== 'POST') {
      return json({ error: 'POST only' }, 405, origin, allowed);
    }

    const header = request.headers.get('Authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token || !origin || !allowed.includes(origin)) {
      return json({ error: 'Unauthorized' }, 401, origin, allowed);
    }

    try {
      const email = await clerkEmail(sessionEnv, token, origin);
      const uid = await firebaseUidForEmail(sessionEnv, email);
      const customToken = await firebaseCustomToken(sessionEnv, uid);
      return json({ token: customToken }, 200, origin, allowed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Session exchange failed';
      console.error(JSON.stringify({ message: 'clerk session exchange failed', error: message }));
      const status = message === 'Verify your email before continuing' ? 403 : 401;
      return json({ error: message }, status, origin, allowed);
    }
  },
} satisfies ExportedHandler<Env>;

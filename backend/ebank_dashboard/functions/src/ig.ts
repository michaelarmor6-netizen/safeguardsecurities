import { getFirestore } from 'firebase-admin/firestore';

export interface IgCredentials {
  apiKey: string;
  username: string;
  password: string;
  accountType: 'demo' | 'live';
}

interface IgSession {
  cst: string;
  xSecurityToken: string;
  expiresAtMs: number;
}

const SESSION_DOC_PATH = 'internal/igSession';
// IG tokens are valid at least 6h; refresh a bit early to be safe.
const SESSION_TTL_MS = 5 * 60 * 60 * 1000;

function baseUrl(accountType: IgCredentials['accountType']): string {
  return accountType === 'live' ? 'https://api.ig.com/gateway/deal' : 'https://demo-api.ig.com/gateway/deal';
}

async function loginToIg(creds: IgCredentials): Promise<IgSession> {
  const res = await fetch(`${baseUrl(creds.accountType)}/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      Accept: 'application/json; charset=UTF-8',
      'X-IG-API-KEY': creds.apiKey,
      Version: '2',
    },
    body: JSON.stringify({ identifier: creds.username, password: creds.password }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`IG login failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const cst = res.headers.get('cst');
  const xSecurityToken = res.headers.get('x-security-token');
  if (!cst || !xSecurityToken) {
    throw new Error('IG login succeeded but session headers were missing');
  }

  return { cst, xSecurityToken, expiresAtMs: Date.now() + SESSION_TTL_MS };
}

async function getSession(creds: IgCredentials): Promise<IgSession> {
  const db = getFirestore();
  const ref = db.doc(SESSION_DOC_PATH);
  const snap = await ref.get();
  const cached = snap.exists ? (snap.data() as IgSession) : null;

  if (cached && cached.expiresAtMs > Date.now()) {
    return cached;
  }

  const fresh = await loginToIg(creds);
  await ref.set(fresh);
  return fresh;
}

async function igGet(creds: IgCredentials, path: string, version: string): Promise<any> {
  const session = await getSession(creds);
  const doFetch = (s: IgSession) =>
    fetch(`${baseUrl(creds.accountType)}${path}`, {
      headers: {
        Accept: 'application/json; charset=UTF-8',
        'X-IG-API-KEY': creds.apiKey,
        CST: s.cst,
        'X-SECURITY-TOKEN': s.xSecurityToken,
        Version: version,
      },
    });

  let res = await doFetch(session);
  if (res.status === 401) {
    // Session expired earlier than our cached TTL assumed - re-login once and retry.
    const fresh = await loginToIg(creds);
    await getFirestore().doc(SESSION_DOC_PATH).set(fresh);
    res = await doFetch(fresh);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`IG request failed (${res.status}) for ${path}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

export async function getMarketSnapshot(creds: IgCredentials, epic: string) {
  const data = await igGet(creds, `/markets/${encodeURIComponent(epic)}`, '3');
  const snapshot = data.snapshot ?? {};
  const instrument = data.instrument ?? {};
  return {
    epic,
    name: instrument.name ?? epic,
    bid: snapshot.bid ?? null,
    offer: snapshot.offer ?? null,
    high: snapshot.high ?? null,
    low: snapshot.low ?? null,
    netChange: snapshot.netChange ?? null,
    percentageChange: snapshot.percentageChange ?? null,
    updateTime: snapshot.updateTime ?? null,
    marketStatus: snapshot.marketStatus ?? null,
  };
}

export async function getMarketHistory(creds: IgCredentials, epic: string, resolution: string, max: number) {
  const data = await igGet(
    creds,
    `/prices/${encodeURIComponent(epic)}?resolution=${encodeURIComponent(resolution)}&max=${max}`,
    '3',
  );
  const prices = Array.isArray(data.prices) ? data.prices : [];
  return prices.map((p: any) => ({
    time: p.snapshotTimeUTC ?? p.snapshotTime,
    open: p.openPrice?.bid ?? null,
    high: p.highPrice?.bid ?? null,
    low: p.lowPrice?.bid ?? null,
    close: p.closePrice?.bid ?? null,
  }));
}

export async function searchMarkets(creds: IgCredentials, searchTerm: string) {
  const data = await igGet(creds, `/markets?searchTerm=${encodeURIComponent(searchTerm)}`, '1');
  const markets = Array.isArray(data.markets) ? data.markets : [];
  return markets.map((m: any) => ({
    epic: m.epic,
    instrumentName: m.instrumentName,
    instrumentType: m.instrumentType,
    expiry: m.expiry,
  }));
}

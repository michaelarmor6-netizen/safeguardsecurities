import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// These cover the two privilege findings the rules were changed for:
//
//   C3 - profile creation placed no constraint on `role`, so a user could
//        write their own profile as super_admin on first sign-in.
//   C4 - isInvestorAdmin() meant "not a client", so a support agent could
//        credit wallets, approve funding and delete profiles.
//
// Requires the Firestore emulator: `npm run test:rules` wraps this in
// `firebase emulators:exec`, which starts and stops it around the run.

let env: RulesTestEnvironment;

const SUPER_ADMIN_EMAIL = 'admin@safeguardsecurities.us';

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'safeguard-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => { await env?.cleanup(); });

beforeEach(async () => {
  await env.clearFirestore();
  // Seed one profile per role, plus a wallet and a funding request to act on.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const roles = ['client', 'support', 'finance', 'compliance', 'admin', 'super_admin'];
    for (const role of roles) {
      await setDoc(doc(db, 'profiles', `u_${role}`), {
        email: `${role}@example.com`,
        role,
        accountStatus: 'active',
        plan: 'free',
      });
    }
    await setDoc(doc(db, 'wallets', 'w1'), { userId: 'u_client', balance: 5000, currency: 'USD' });
    await setDoc(doc(db, 'fundingRequests', 'f1'), {
      userId: 'u_client',
      amount: 1000,
      status: 'approved',
      awaitingPayment: true,
      reference: 'SG-FUND2600001',
    });
    await setDoc(doc(db, 'kycSubmissions', 'k1'), {
      userId: 'u_client',
      status: 'pending',
      fullName: 'Test Client',
    });
  });
});

/** A signed-in session for one of the seeded profiles. */
const as = (role: string, email?: string) =>
  env.authenticatedContext(`u_${role}`, { email: email ?? `${role}@example.com` }).firestore();

describe('C3 - profile creation cannot grant privilege', () => {
  it('refuses a self-created profile claiming super_admin', async () => {
    const db = env.authenticatedContext('newcomer', { email: 'attacker@example.com' }).firestore();
    await assertFails(
      setDoc(doc(db, 'profiles', 'newcomer'), {
        email: 'attacker@example.com',
        role: 'super_admin',
        accountStatus: 'active',
      }),
    );
  });

  it('refuses any other staff role too', async () => {
    const db = env.authenticatedContext('newcomer', { email: 'attacker@example.com' }).firestore();
    for (const role of ['support', 'finance', 'compliance', 'admin']) {
      await assertFails(
        setDoc(doc(db, 'profiles', 'newcomer'), { email: 'attacker@example.com', role }),
      );
    }
  });

  it('refuses a self-activated account or a free plan upgrade', async () => {
    const db = env.authenticatedContext('newcomer', { email: 'attacker@example.com' }).firestore();
    await assertFails(
      setDoc(doc(db, 'profiles', 'newcomer'), { email: 'a@b.com', role: 'client', accountStatus: 'active' }),
    );
    await assertFails(
      setDoc(doc(db, 'profiles', 'newcomer'), { email: 'a@b.com', role: 'client', plan: 'pro' }),
    );
  });

  it('still allows the ordinary client signup it exists for', async () => {
    const db = env.authenticatedContext('newcomer', { email: 'real@example.com' }).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'profiles', 'newcomer'), {
        email: 'real@example.com',
        role: 'client',
        accountStatus: 'pending',
        plan: 'free',
      }),
    );
  });

  it('lets the allowlisted bootstrap admin self-provision', async () => {
    const db = env.authenticatedContext('bootstrap', { email: SUPER_ADMIN_EMAIL }).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'profiles', 'bootstrap'), {
        email: SUPER_ADMIN_EMAIL,
        role: 'super_admin',
        accountStatus: 'active',
      }),
    );
  });

  it('refuses someone else claiming the bootstrap email as their profile id', async () => {
    const db = env.authenticatedContext('impostor', { email: 'impostor@example.com' }).firestore();
    await assertFails(
      setDoc(doc(db, 'profiles', 'someone_else'), { email: 'x@y.com', role: 'client' }),
    );
  });

  it('still blocks self-escalation on update', async () => {
    const db = as('client');
    await assertFails(updateDoc(doc(db, 'profiles', 'u_client'), { role: 'super_admin' }));
    await assertFails(updateDoc(doc(db, 'profiles', 'u_client'), { accountStatus: 'active', role: 'admin' }));
  });
});

describe('C4 - money is a finance decision, not a staff one', () => {
  it('refuses a support agent updating a funding request', async () => {
    await assertFails(updateDoc(doc(as('support'), 'fundingRequests', 'f1'), { status: 'approved' }));
  });

  it('refuses a compliance officer updating a funding request', async () => {
    await assertFails(updateDoc(doc(as('compliance'), 'fundingRequests', 'f1'), { status: 'rejected' }));
  });

  it('allows finance to approve', async () => {
    await assertSucceeds(updateDoc(doc(as('finance'), 'fundingRequests', 'f1'), { status: 'approved' }));
  });

  it('allows super_admin to approve', async () => {
    await assertSucceeds(updateDoc(doc(as('super_admin'), 'fundingRequests', 'f1'), { status: 'rejected' }));
  });

  it('lets the owner claim payment but never touch the amount', async () => {
    const db = as('client');
    await assertSucceeds(updateDoc(doc(db, 'fundingRequests', 'f1'), { paymentClaimedAt: new Date(), updatedAt: new Date() }));
    await assertFails(updateDoc(doc(db, 'fundingRequests', 'f1'), { amount: 999999 }));
    await assertFails(updateDoc(doc(db, 'fundingRequests', 'f1'), { status: 'funded' }));
  });
});

describe('C2 - wallet balances are unwritable from a browser', () => {
  it('refuses a balance update from every role, super_admin included', async () => {
    for (const role of ['client', 'support', 'finance', 'compliance', 'admin', 'super_admin']) {
      await assertFails(updateDoc(doc(as(role), 'wallets', 'w1'), { balance: 999999 }));
    }
  });

  it('refuses a client creating a wallet with money already in it', async () => {
    await assertFails(
      setDoc(doc(as('finance'), 'wallets', 'w2'), { userId: 'u_client', balance: 10000, currency: 'USD' }),
    );
  });

  it('allows finance to open an empty wallet for Wallet Setup', async () => {
    await assertSucceeds(
      setDoc(doc(as('finance'), 'wallets', 'w2'), { userId: 'u_client', balance: 0, currency: 'USD' }),
    );
  });

  it('refuses support opening a wallet at all', async () => {
    await assertFails(
      setDoc(doc(as('support'), 'wallets', 'w3'), { userId: 'u_client', balance: 0, currency: 'USD' }),
    );
  });

  it('keeps the cash ledger unwritable by anyone', async () => {
    for (const role of ['client', 'finance', 'super_admin']) {
      await assertFails(
        setDoc(doc(as(role), 'cashLedger', 'e1'), { userId: 'u_client', amount: 100, entryType: 'deposit' }),
      );
    }
  });

  it('still lets a client read their own wallet and ledger', async () => {
    const db = as('client');
    await assertSucceeds(getDoc(doc(db, 'wallets', 'w1')));
  });
});

describe('C4 - KYC outcomes belong to compliance', () => {
  it('refuses a support agent verifying an identity', async () => {
    await assertFails(updateDoc(doc(as('support'), 'kycSubmissions', 'k1'), { status: 'verified' }));
  });

  it('refuses a finance officer verifying an identity', async () => {
    await assertFails(updateDoc(doc(as('finance'), 'kycSubmissions', 'k1'), { status: 'verified' }));
  });

  it('allows compliance to verify', async () => {
    await assertSucceeds(updateDoc(doc(as('compliance'), 'kycSubmissions', 'k1'), { status: 'verified' }));
  });
});

describe('C4 - deleting and role-granting are super-admin acts', () => {
  it('refuses support and finance deleting a profile', async () => {
    await assertFails(deleteDoc(doc(as('support'), 'profiles', 'u_client')));
    await assertFails(deleteDoc(doc(as('finance'), 'profiles', 'u_client')));
  });

  it('allows super_admin to delete a profile', async () => {
    await assertSucceeds(deleteDoc(doc(as('super_admin'), 'profiles', 'u_client')));
  });

  it('refuses support granting someone a role', async () => {
    await assertFails(updateDoc(doc(as('support'), 'profiles', 'u_client'), { role: 'finance' }));
  });

  it('allows support the everyday edits that do not grant privilege', async () => {
    await assertSucceeds(
      updateDoc(doc(as('support'), 'profiles', 'u_client'), {
        role: 'client', // unchanged
        accountManager: { name: 'Sam', email: 'sam@example.com' },
      }),
    );
  });

  it('allows super_admin to grant a role', async () => {
    await assertSucceeds(updateDoc(doc(as('super_admin'), 'profiles', 'u_client'), { role: 'finance' }));
  });
});

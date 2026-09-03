/**
 * Seeds the local emulator suite with enough data to exercise every part of
 * the money path end to end. Emulators start completely empty, so without this
 * the admin console is a set of blank tables.
 *
 * It lives in functions-trading because firebase-admin is already a dependency
 * here; the app package has no need for it. Run it through `npm run seed` at
 * the dashboard root, which points it at the emulator first.
 *
 * REFUSES TO RUN against real Firebase - it only ever talks to localhost.
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Pinned here rather than read from the environment, and set BEFORE the Admin
// SDK initialises. The SDK routes to an emulator purely on these variables, so
// hardcoding loopback makes it impossible for this script to write to the live
// project - a missing or mistyped env var cannot turn a seed run into a
// production write.
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST;
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST;

initializeApp({ projectId: 'e-bank-dashboard' });
const db = getFirestore();
const auth = getAuth();

const PASSWORD = 'Passw0rd!23';

/** Everyone signs in with the same password - this is a throwaway local database. */
const PEOPLE = [
  { uid: 'u_super',      email: 'admin@safeguardsecurities.us', role: 'super_admin', first: 'Super',  last: 'Admin' },
  { uid: 'u_finance',    email: 'finance@safeguard.test',       role: 'finance',     first: 'Fiona',  last: 'Finance' },
  { uid: 'u_support',    email: 'support@safeguard.test',       role: 'support',     first: 'Sam',    last: 'Support' },
  { uid: 'u_compliance', email: 'compliance@safeguard.test',    role: 'compliance',  first: 'Cara',   last: 'Compliance' },
  { uid: 'u_alice',      email: 'alice@example.test',           role: 'client',      first: 'Alice',  last: 'Nakamura', balance: 42500 },
  { uid: 'u_ben',        email: 'ben@example.test',             role: 'client',      first: 'Ben',    last: 'Okafor',   balance: 7500 },
  { uid: 'u_chen',       email: 'chen@example.test',            role: 'client',      first: 'Chen',   last: 'Wei',      balance: 0 },
];

const now = new Date();
const daysAgo = (n) => Timestamp.fromDate(new Date(now.getTime() - n * 864e5));

async function seedPeople() {
  for (const p of PEOPLE) {
    await auth
      .createUser({ uid: p.uid, email: p.email, password: PASSWORD, displayName: `${p.first} ${p.last}` })
      .catch((e) => {
        if (e.code !== 'auth/uid-already-exists') throw e;
      });

    await db.doc(`profiles/${p.uid}`).set({
      email: p.email,
      role: p.role,
      accountStatus: 'active',
      plan: 'free',
      investorTier: 'standard',
      firstName: p.first,
      lastName: p.last,
      displayName: `${p.first} ${p.last}`,
      phone: '+64 9 235 9874',
      onboardingCompleted: p.role === 'client',
      onboardingCompletedAt: daysAgo(30),
      onboardingSource: 'self',
      dateOfBirth: '1985-04-12',
      gender: 'female',
      citizenship: 'New Zealand',
      residencyCountry: 'New Zealand',
      idType: 'passport',
      address: {
        line1: '8 Hosking Place',
        city: 'Waiuku',
        state: 'Auckland',
        postalCode: '2123',
        country: 'New Zealand',
      },
      employment: {
        status: 'employed',
        employer: 'Rattrie Construction',
        jobTitle: 'Managing Director',
        annualIncome: '100k-250k',
        incomeSource: 'business',
      },
      investmentProfile: {
        objective: 'growth',
        riskTolerance: 'medium',
        experienceLevel: 'moderate',
        initialFundingIntent: '10k-50k',
        sourceOfFunds: 'business_income',
      },
      compliance: {
        fatcaStatus: 'us_person',
        crsReporting: true,
        pep: false,
        sanctionsScreening: true,
        amlAcknowledged: true,
      },
      createdAt: daysAgo(45),
    });

    if (p.role === 'client') {
      await db.collection('wallets').add({
        userId: p.uid,
        balance: p.balance ?? 0,
        currency: 'USD',
        label: 'Primary Wallet',
        status: 'active',
        createdAt: daysAgo(40),
      });
    }
  }
}

async function seedFunding() {
  await db.doc('counters/funding-2026').set({ value: 3 });

  // 1. Pending - exercises Approve & send details.
  await db.doc('fundingRequests/f_pending').set({
    userId: 'u_ben',
    userEmail: 'ben@example.test',
    amount: 5000,
    status: 'pending',
    reference: 'SG-FUND2600001',
    createdAt: daysAgo(2),
  });

  // 2. Approved, awaiting payment, client says they have paid - exercises
  //    Confirm receipt, which now credits the wallet AND posts to the ledger.
  await db.doc('fundingRequests/f_awaiting').set({
    userId: 'u_alice',
    userEmail: 'alice@example.test',
    amount: 12500,
    status: 'approved',
    awaitingPayment: true,
    reference: 'SG-FUND2600002',
    createdAt: daysAgo(6),
    approvedAt: daysAgo(5),
    paymentClaimedAt: daysAgo(1),
    emailSentAt: daysAgo(5),
  });

  // 3. Already funded, and deliberately WITHOUT a cashLedger entry - this is
  //    the pre-fix state. Alice's statement has no closing balance until you
  //    press "Repair statement ledger" in her details drawer.
  await db.doc('fundingRequests/f_legacy').set({
    userId: 'u_alice',
    userEmail: 'alice@example.test',
    amount: 42500,
    status: 'funded',
    awaitingPayment: false,
    reference: 'SG-FUND2600003',
    createdAt: daysAgo(35),
    approvedAt: daysAgo(34),
    fundedAt: daysAgo(33),
  });
}

async function main() {
  console.log(`Seeding emulators at firestore=${FIRESTORE_HOST} auth=${AUTH_HOST}`);
  await seedPeople();
  await seedFunding();
  console.log(`
Seeded.

  Sign in at http://localhost:5173/admin-login
    admin@safeguardsecurities.us   super_admin   (sees everything)
    finance@safeguard.test         finance       (may move money)
    support@safeguard.test         support       (may NOT move money)
    compliance@safeguard.test      compliance    (KYC only)
  Clients: alice@example.test, ben@example.test, chen@example.test
  Password for all of them: ${PASSWORD}

  Things worth trying:
    - Funding Requests -> Confirm receipt on Alice's SG-FUND2600002.
      Check the Firestore UI at localhost:4200: wallets AND cashLedger both moved.
    - Funding Requests -> Add funds to a client. Same - two writes, one commit.
    - Users -> Alice -> Details -> Repair statement ledger.
      Her old 42,500 deposit had no ledger row; now it does.
    - Sign in as support@safeguard.test and try to confirm a receipt.
      It fails. That is the role separation working.
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

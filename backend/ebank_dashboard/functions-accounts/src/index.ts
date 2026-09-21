import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';

initializeApp();

function requireAuth(request: CallableRequest): string {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  return request.auth.uid;
}

// Roles live in Firestore (profiles/{uid}.role), not Auth custom claims - so
// admin gating here must read Firestore directly (Admin SDK bypasses rules).
async function requireInvestorAdmin(request: CallableRequest): Promise<void> {
  const uid = requireAuth(request);
  const snap = await getFirestore().doc(`profiles/${uid}`).get();
  const role = snap.exists ? (snap.data()?.role as string | undefined) : undefined;
  if (!role || role === 'client') {
    throw new HttpsError('permission-denied', 'Admins only.');
  }
}

// Firestore profile docs for deleted/orphaned Auth users linger after account
// deletion (Auth frees the email for reuse; the profiles/{uid} doc does not
// auto-delete). Checking Auth alone lets a freed email re-signup into a NEW
// uid, producing a second profiles doc with the same email - the "duplicate"
// bug seen in the admin Users list. Checking Firestore by email closes that.
async function emailInUse(email: string): Promise<boolean> {
  const snap = await getFirestore().collection('profiles').where('email', '==', email).limit(1).get();
  return !snap.empty;
}

// Public pre-signup check (no auth required - the caller doesn't have an
// account yet). Used by the signup form to flag a taken email before the
// client ever calls createUserWithEmailAndPassword.
export const checkEmailAvailable = onCall(async (request) => {
  const email = String((request.data as { email?: string } | undefined)?.email ?? '')
    .trim()
    .toLowerCase();
  if (!email || !email.includes('@')) {
    return { available: false };
  }

  if (await emailInUse(email)) {
    return { available: false };
  }

  try {
    await getAuth().getUserByEmail(email);
    return { available: false };
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/user-not-found') {
      return { available: true };
    }
    throw new HttpsError('internal', 'Could not verify email right now.');
  }
});

function generateTemporaryPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%';
  const all = upper + lower + digits + symbols;
  let password =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    symbols[Math.floor(Math.random() * symbols.length)];
  for (let i = 0; i < 4; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

interface CreateInvestorAccountData {
  email?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  citizenship?: string;
  residencyCountry?: string;
  idType?: string;
  idNumber?: string;
  employment?: {
    status?: string;
    employer?: string;
    jobTitle?: string;
    annualIncome?: string;
    incomeSource?: string;
  };
  investmentProfile?: {
    objective?: string;
    riskTolerance?: string;
    experienceLevel?: string;
    initialFundingIntent?: string;
    sourceOfFunds?: string;
  };
  compliance?: {
    fatcaStatus?: string;
    crsReporting?: boolean;
    pep?: boolean;
    sanctionsScreening?: boolean;
    amlAcknowledged?: boolean;
  };
  accountManager?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

// Admin-initiated client account creation for the investor platform. Uses the
// Admin SDK (not client-side createUserWithEmailAndPassword) specifically so
// creating the new Auth user never swaps the calling admin's own session -
// a real, unhandled side effect the bank app's client-side equivalent has.
//
// Kept in its own Cloud Functions codebase (see firebase.json "accounts"
// entry) deliberately - the CLI resolves every defineSecret() in a codebase's
// source file before deploying anything from it, even with --only
// functions:<name>. Splitting codebases keeps this deployable independent of
// the IG market-data / AI Engine secrets. Since 2026-08-24 this codebase has
// ONE secret of its own (RESEND_API_KEY, for the funding-details email below);
// create it before deploying: firebase functions:secrets:set RESEND_API_KEY
export const createInvestorAccount = onCall(async (request) => {
  await requireInvestorAdmin(request);

  const data = (request.data ?? {}) as CreateInvestorAccountData;
  const email = String(data.email ?? '').trim().toLowerCase();
  const firstName = String(data.firstName ?? '').trim();
  const lastName = String(data.lastName ?? '').trim();

  if (!email) throw new HttpsError('invalid-argument', 'email is required');
  if (!firstName) throw new HttpsError('invalid-argument', 'firstName is required');
  if (!lastName) throw new HttpsError('invalid-argument', 'lastName is required');

  if (await emailInUse(email)) {
    throw new HttpsError('already-exists', 'An account with this email already exists.');
  }

  const temporaryPassword = generateTemporaryPassword();

  let userRecord;
  try {
    userRecord = await getAuth().createUser({ email, password: temporaryPassword, emailVerified: false });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'An account with this email already exists.');
    }
    throw new HttpsError('internal', err instanceof Error ? err.message : 'Failed to create account');
  }

  const uid = userRecord.uid;
  const now = FieldValue.serverTimestamp();

  await getFirestore()
    .doc(`profiles/${uid}`)
    .set({
      email,
      role: 'client',
      accountStatus: 'active',
      firstName,
      middleName: data.middleName ?? '',
      lastName,
      displayName: `${firstName} ${lastName}`.trim(),
      dateOfBirth: data.dateOfBirth ?? '',
      gender: data.gender ?? '',
      phone: data.phone ?? '',
      address: data.address ?? null,
      citizenship: data.citizenship ?? '',
      residencyCountry: data.residencyCountry ?? '',
      idType: data.idType ?? '',
      employment: data.employment ?? null,
      investmentProfile: data.investmentProfile ?? null,
      compliance: data.compliance ?? null,
      accountManager: data.accountManager ?? null,
      onboardingCompleted: true,
      onboardingCompletedAt: now,
      onboardingSource: 'admin',
      createdBy: request.auth!.uid,
      createdAt: now,
      updatedAt: now,
    });

  if (data.idType && data.idNumber) {
    await getFirestore()
      .collection('kycSubmissions')
      .add({
        userId: uid,
        userEmail: email,
        fullName: `${firstName} ${lastName}`.trim(),
        dateOfBirth: data.dateOfBirth ?? '',
        address: data.address
          ? [data.address.line1, data.address.city, data.address.state, data.address.country].filter(Boolean).join(', ')
          : '',
        phone: data.phone ?? '',
        idType: data.idType,
        idNumber: data.idNumber,
        status: 'verified',
        reviewNote: 'Verified at account creation by admin',
        createdAt: now,
      });
  }

  return { uid, temporaryPassword };
});


// ---------------------------------------------------------------------------
// Staff account creation.
//
// createInvestorAccount above hardcodes role:'client', so until now the only
// way to get a finance officer onto the platform was to create them as a
// client and then promote them from the Users page. That works, but it leaves
// a window where a staff hire exists as an ordinary client, and it hides the
// act of granting privilege inside a table of dropdowns.
//
// Creating staff IS granting privilege, so this is gated on super-admin -
// matching isSuperAdmin() in firestore.rules, which is what governs changing
// somebody's role. A finance officer cannot mint another finance officer.

/** Roles that may be created here. */
const CREATABLE_STAFF_ROLES = ['support', 'finance', 'compliance', 'admin'] as const;
type CreatableStaffRole = (typeof CREATABLE_STAFF_ROLES)[number];

interface CreateStaffAccountData {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

async function requireSuperAdmin(request: CallableRequest): Promise<string> {
  const uid = requireAuth(request);
  const snap = await getFirestore().doc(`profiles/${uid}`).get();
  const role = snap.exists ? (snap.data()?.role as string | undefined) : undefined;
  if (role !== 'admin' && role !== 'super_admin') {
    throw new HttpsError('permission-denied', 'Only an administrator can create staff accounts.');
  }
  return uid;
}

export const createStaffAccount = onCall(async (request) => {
  const actorUid = await requireSuperAdmin(request);

  const data = (request.data ?? {}) as CreateStaffAccountData;
  const email = String(data.email ?? '').trim().toLowerCase();
  const firstName = String(data.firstName ?? '').trim();
  const lastName = String(data.lastName ?? '').trim();
  const role = String(data.role ?? '') as CreatableStaffRole;

  if (!email) throw new HttpsError('invalid-argument', 'Email is required.');
  if (!firstName) throw new HttpsError('invalid-argument', 'First name is required.');
  if (!lastName) throw new HttpsError('invalid-argument', 'Last name is required.');

  // super_admin is deliberately absent: that role is bootstrapped from the
  // SUPER_ADMIN_EMAILS allowlist, and minting one from a form would make the
  // allowlist meaningless. 'client' belongs to createInvestorAccount, which
  // captures the onboarding record a client needs and this does not.
  if (!CREATABLE_STAFF_ROLES.includes(role)) {
    throw new HttpsError(
      'invalid-argument',
      `Role must be one of: ${CREATABLE_STAFF_ROLES.join(', ')}.`,
    );
  }

  if (await emailInUse(email)) {
    throw new HttpsError('already-exists', 'An account with this email already exists.');
  }

  const temporaryPassword = generateTemporaryPassword();

  let userRecord;
  try {
    userRecord = await getAuth().createUser({ email, password: temporaryPassword, emailVerified: false });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'An account with this email already exists.');
    }
    throw new HttpsError('internal', err instanceof Error ? err.message : 'Failed to create account');
  }

  const uid = userRecord.uid;
  const now = FieldValue.serverTimestamp();

  await getFirestore()
    .doc(`profiles/${uid}`)
    .set({
      email,
      role,
      accountStatus: 'active',
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`.trim(),
      // Staff never go through the client onboarding flow; marking it complete
      // keeps them out of the applicant queue and the onboarding redirect.
      onboardingCompleted: true,
      onboardingCompletedAt: now,
      onboardingSource: 'admin',
      isStaff: true,
      createdBy: actorUid,
      createdAt: now,
      updatedAt: now,
    });

  // Granting privilege is the single most audit-worthy act in the console.
  await getFirestore().collection('auditLogs').add({
    actorId: actorUid,
    actorEmail: String(request.auth?.token?.email ?? ''),
    action: 'Staff account created',
    details: `${email} created with role '${role}'`,
    createdAt: now,
  });

  return { uid, temporaryPassword, role };
});


// ---------------------------------------------------------------------------
// Funding-details email: fires when an admin approves a funding request
// (status pending -> approved with awaitingPayment=true, see
// src/services/investor/fundingService.ts). Emails the client the deposit
// instructions configured at platformSettings/fundingDetails, then stamps
// emailSentAt (or emailError) back onto the request doc so the admin Funding
// page can show delivery state. The in-app instructions card works even when
// this email fails - email here is best-effort and never throws.
//
// Provider: Resend HTTP API (https://resend.com) via Node 20 global fetch -
// no npm dependency. Requires the RESEND_API_KEY secret and a verified
// sending domain in Resend; MAIL_FROM is a plain deploy-time param.
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const MAIL_FROM = defineString('MAIL_FROM', {
  default: 'SafeGuard Securities <finance@safeguardsecurities.us>',
});

// DUPLICATED in src/services/investor/fundingDetailsService.ts - change both.
function fundingReference(requestId: string): string {
  return 'SG-' + requestId.slice(0, 8).toUpperCase();
}

interface CryptoWallet { asset?: string; network?: string; address?: string; memo?: string }

function esc(v: unknown): string {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// MIRROR of buildFundingEmailHtml() in src/services/investor/
// fundingDetailsService.ts (owner's approved welcome-template look: navy
// #003d82, green accents, logo in header AND footer) - change both.
function buildFundingEmailHtmlMirror(p: {
  reference: string;
  amountFmt: string;
  clientName: string;
  platformName: string;
  requestDate: string;
  logoUrl: string;
  d: Record<string, unknown>;
}): string {
  const d = p.d as {
    bankEnabled?: boolean; bankName?: string; bankAddress?: string; bankSwift?: string;
    bankAccountName?: string; bankAccountNumber?: string; beneficiaryAddress?: string;
    bankRoutingOrIban?: string; paymentReason?: string; cryptoEnabled?: boolean;
    cryptoWallets?: CryptoWallet[]; extraInstructions?: string; emailIntro?: string;
    supportEmail?: string; supportPhone?: string; companyAddress?: string;
  };
  // All styles INLINE (no <style> block, no classes) - Gmail/Outlook and the
  // rich-paste manual path all strip <style>, so only inline survives.
  const ROW_L = 'padding:10px 12px 10px 0;font-size:14px;color:#003d82;font-weight:700;vertical-align:top;text-align:left;border-bottom:1px solid #dddddd;';
  const ROW_V = "padding:10px 0;font-size:14px;color:#003d82;text-align:right;font-family:'Courier New',monospace;word-break:break-all;border-bottom:1px solid #dddddd;";
  const infoRow = (label: string, value: unknown) =>
    value
      ? `<tr><td style="${ROW_L}">${esc(label)}:</td><td style="${ROW_V}">${esc(value)}</td></tr>`
      : '';
  const section = (title: string, inner: string) =>
    `<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f0f0;border:1px solid #dddddd;border-radius:4px;margin:30px 0;"><tr><td style="padding:20px;">
      <div style="font-size:14px;font-weight:700;color:#003d82;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;"><span style="color:#00cc00;">&#9679;</span>&nbsp;${esc(title)}</div>
      <table width="100%" cellpadding="0" cellspacing="0">${inner}</table>
    </td></tr></table>`;
  const reasonBase = String(d.paymentReason ?? '').trim();
  const reason = reasonBase ? `${reasonBase} — ${p.reference}` : p.reference;
  const bankRows: Array<[string, unknown]> = [
    ['Bank name', d.bankName], ['Bank address', d.bankAddress],
    ['Bank ID / SWIFT code', d.bankSwift], ['Beneficiary account', d.bankAccountName],
    ['Beneficiary account no.', d.bankAccountNumber], ['Beneficiary address', d.beneficiaryAddress],
    ['Routing / IBAN', d.bankRoutingOrIban], ['Reason for payment', reason],
  ];
  const bankSection = d.bankEnabled === true
    ? section('Bank Wire / Transfer', bankRows.map(([l, v]) => infoRow(l, v)).join(''))
    : '';
  const wallets = (d.cryptoEnabled === true && Array.isArray(d.cryptoWallets) ? d.cryptoWallets : []).filter((w) => w?.address);
  const cryptoSection = wallets.length > 0
    ? section('Crypto Deposit', wallets
        .map((w) => infoRow(`${w.asset ?? ''} (${w.network ?? ''})`, w.memo ? `${w.address} (memo: ${w.memo})` : w.address)).join(''))
    : '';
  const intro = String(d.emailIntro ?? '').trim() ||
    'Your funding request has been approved. Please find your payment instructions below. Once your payment is received and confirmed, the funds will be credited to your wallet and available on your trading account.';
  const supportEmail = String(d.supportEmail ?? 'finance@safeguardsecurities.us');
  const supportPhone = String(d.supportPhone ?? '+1 216 250-7891');
  const companyAddress = String(d.companyAddress ?? '6060 Parkland Boulevard, Suite 200, Mayfield Heights, OH 44124');
  const portalUrl = 'https://app.safeguardsecurities.us/workspace/wallet';
  const extra = d.extraInstructions
    ? `<p style="color:#003d82;font-size:14px;line-height:1.8;white-space:pre-wrap;margin:0 0 20px;">${esc(d.extraInstructions)}</p>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(p.platformName)} — Funding Instructions</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;"><tr><td align="center" style="padding:20px 10px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
  <tr><td align="left" style="padding:26px 30px;border-bottom:1px solid #e5e7eb;">
    <img src="${esc(p.logoUrl)}" alt="${esc(p.platformName)}" height="48" style="height:48px;width:auto;display:block;border:0;" />
  </td></tr>
  <tr><td style="padding:40px 30px;">
    <div style="font-size:18px;font-weight:600;color:#003d82;margin-bottom:20px;">Hello, ${esc(p.clientName)}!</div>
    <p style="color:#003d82;margin:0 0 30px;font-size:14px;line-height:1.8;">${esc(intro)}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#003d82;border-radius:4px;margin:25px 0;"><tr><td align="center" style="padding:22px 20px;">
      <div style="font-size:12px;color:#ffffff;text-transform:uppercase;letter-spacing:1px;">Amount to transfer</div>
      <div style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:.5px;">${esc(p.amountFmt)}</div>
      <div style="font-size:13px;margin-top:4px;color:#9fd5a7;font-family:'Courier New',monospace;">Reference: ${esc(p.reference)}</div>
    </td></tr></table>
    ${section('Funding Request Details',
      infoRow('Payment reference', p.reference) +
      infoRow('Amount', p.amountFmt) +
      infoRow('Request date', p.requestDate) +
      infoRow('Status', 'Approved — awaiting payment'))}
    ${bankSection}
    ${cryptoSection}
    <div style="background-color:#e8f4f8;border:2px solid #003d82;padding:15px;border-radius:4px;margin:20px 0;font-size:13px;color:#003d82;">
      <strong>Important:</strong> quote reference <strong>${esc(p.reference)}</strong> in your
      transfer memo${wallets.length > 0 ? ' (or transaction memo/tag for crypto)' : ''} so we can match
      your payment. Your wallet is credited once receipt is confirmed by our finance desk.
    </div>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 0 8px;">
      <a href="${esc(portalUrl)}" style="display:inline-block;background-color:#003d82;color:#ffffff;padding:14px 40px;text-decoration:none;border-radius:4px;font-weight:600;font-size:14px;">Open in your client portal</a>
      <p style="font-size:12px;color:#5b6472;margin:8px 0 0;">In the portal, just tap any detail to copy it — then paste it straight into your banking app. No retyping.</p>
    </td></tr></table>
    ${extra}
    <div style="background-color:#ffe8e8;border-left:4px solid #e74c3c;padding:15px;margin:20px 0;border-radius:4px;font-size:13px;color:#003d82;">
      <strong style="color:#c0392b;">Security notice:</strong><br>
      &bull; ${esc(p.platformName)} will never ask you to send funds to details other than those in this email or your client portal<br>
      &bull; Verify the payment details in your portal before transferring<br>
      &bull; Be cautious of emails asking you to change payment instructions<br>
      &bull; Questions? Contact us only via the details in the footer below
    </div>
  </td></tr>
  <tr><td align="center" style="background-color:#f0f0f0;padding:30px;border-top:1px solid #dddddd;font-size:12px;color:#003d82;">
    <img src="${esc(p.logoUrl)}" alt="${esc(p.platformName)}" height="36" style="height:36px;width:auto;border:0;" /><br>
    <div style="font-weight:600;margin:12px 0 5px;">Contact Information</div>
    <div style="margin:8px 0;font-size:13px;">
      <strong>Address:</strong> ${esc(companyAddress)}<br>
      <strong>Phone:</strong> <a href="tel:${esc(supportPhone.replace(/\s/g, ''))}" style="color:#003d82;text-decoration:none;">${esc(supportPhone)}</a><br>
      <strong>Email:</strong> <a href="mailto:${esc(supportEmail)}" style="color:#003d82;text-decoration:none;">${esc(supportEmail)}</a><br>
      <strong>Website:</strong> <a href="https://safeguardsecurities.us" style="color:#003d82;text-decoration:none;">safeguardsecurities.us</a>
    </div>
    <div style="height:1px;background-color:#dddddd;margin:15px 0;"></div>
    <div style="font-size:10px;color:#666666;margin-top:15px;">
      ${esc(p.platformName)}, Inc. | Professional Trading Platform<br>
      &copy; ${new Date().getFullYear()} ${esc(p.platformName)}. All rights reserved.<br><br>
      This message contains your personal funding instructions — do not forward it.
    </div>
  </td></tr>
</table>
</td></tr></table>
</body>
</html>`;
}

export const sendFundingDetailsOnApproval = onDocumentUpdated(
  { document: 'fundingRequests/{requestId}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (!(before.status === 'pending' && after.status === 'approved' && after.awaitingPayment === true)) return;

    const requestRef = event.data!.after.ref;
    const stamp = (fields: Record<string, unknown>) =>
      requestRef.update({ ...fields, updatedAt: FieldValue.serverTimestamp() }).catch(() => undefined);

    const to = String(after.userEmail ?? '').trim();
    if (!to || !to.includes('@')) {
      await stamp({ emailError: 'No client email on the request' });
      return;
    }
    const apiKey = RESEND_API_KEY.value().trim();
    if (!apiKey) {
      await stamp({ emailError: 'Email not configured (RESEND_API_KEY empty)' });
      return;
    }

    const db = getFirestore();
    const [detailsSnap, settingsSnap, profileSnap] = await Promise.all([
      db.doc('platformSettings/fundingDetails').get(),
      db.doc('platformSettings/global').get(),
      db.doc(`profiles/${String(after.userId ?? '')}`).get(),
    ]);
    const d = detailsSnap.exists ? detailsSnap.data() ?? {} : {};
    const platformName = String(settingsSnap.data()?.platformName ?? 'SafeGuard Securities');
    const prof = profileSnap.exists ? profileSnap.data() ?? {} : {};
    const clientName = String(
      prof.displayName ?? [prof.firstName, prof.lastName].filter(Boolean).join(' ') ?? '',
    ).trim() || to;
    // public/logo-email.png = light-background wordmark supplied 2026-08-24 for the
    // white email header/footer (the app's /logo.png is the dark-background version).
    const logoUrl = 'https://app.safeguardsecurities.us/logo-email.png';
    const requestDate = after.createdAt?.toDate?.()
      ? (after.createdAt.toDate() as Date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';

    const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
      .format(Number(after.amount ?? 0));
    const reference = typeof after.reference === 'string' && after.reference
      ? after.reference
      : fundingReference(event.params.requestId);

    const textLines: string[] = [
      `Your funding request for ${amount} has been approved.`,
      '',
      `Payment reference (quote this in your transfer memo): ${reference}`,
      '',
    ];

    if (d.bankEnabled === true) {
      // Mirrors bankInstructionRows() in src/services/investor/fundingDetailsService.ts - change both.
      const reasonBase = String(d.paymentReason ?? '').trim();
      const reason = reasonBase ? `${reasonBase} — ${reference}` : reference;
      const rows: Array<[string, unknown]> = [
        ['Bank name', d.bankName], ['Bank address', d.bankAddress],
        ['Bank ID / SWIFT code', d.bankSwift], ['Beneficiary account', d.bankAccountName],
        ['Beneficiary account no.', d.bankAccountNumber], ['Beneficiary address', d.beneficiaryAddress],
        ['Routing / IBAN', d.bankRoutingOrIban], ['Reason for payment', reason],
      ];
      textLines.push('Bank wire / transfer:');
      for (const [label, value] of rows) {
        if (!value) continue;
        textLines.push(`  ${label}: ${value}`);
      }
      textLines.push('');
    }

    const wallets: CryptoWallet[] = Array.isArray(d.cryptoWallets) ? d.cryptoWallets : [];
    if (d.cryptoEnabled === true && wallets.length > 0) {
      textLines.push('Crypto:');
      for (const w of wallets) {
        if (!w?.address) continue;
        const addr = w.memo ? `${w.address} (memo: ${w.memo})` : w.address;
        textLines.push(`  ${w.asset ?? ''} (${w.network ?? ''}): ${addr}`);
      }
      textLines.push('  Include the reference code in the transaction memo where supported.', '');
    }

    if (d.extraInstructions) {
      textLines.push(String(d.extraInstructions), '');
    }
    textLines.push('Your wallet will be credited once we confirm receipt of your payment.', '', platformName);

    const html = buildFundingEmailHtmlMirror({
      reference,
      amountFmt: amount,
      clientName,
      platformName,
      requestDate,
      logoUrl,
      d,
    });
    const subjectTemplate = String(d.emailSubject ?? '').trim() || `${platformName} — Funding Instructions ({{reference}})`;
    const subject = subjectTemplate.split('{{reference}}').join(reference);

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: MAIL_FROM.value(),
          to: [to],
          subject,
          text: textLines.join('\n'),
          html,
        }),
      });
      if (!res.ok) {
        const body = (await res.text()).slice(0, 300);
        await stamp({ emailError: `Resend ${res.status}: ${body}` });
        return;
      }
      await stamp({ emailSentAt: FieldValue.serverTimestamp(), emailError: FieldValue.delete() });
    } catch (err) {
      await stamp({ emailError: err instanceof Error ? err.message.slice(0, 300) : 'Send failed' });
    }
  },
);

// Official finance invoices: when finance issues a document with sendMode=auto,
// email it via the same Resend mailbox as funding instructions. Manual invoices
// skip this trigger so staff can compose in Thunderbird / Outlook.
export const sendInvoiceOnCreate = onDocumentCreated(
  { document: 'invoices/{invoiceId}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    if (String(data.sendMode ?? '') !== 'auto') return;
    if (String(data.status ?? '') === 'void') return;

    const invoiceRef = event.data!.ref;
    const stamp = (fields: Record<string, unknown>) =>
      invoiceRef.update({ ...fields, updatedAt: FieldValue.serverTimestamp() }).catch(() => undefined);

    const to = String(data.billToEmail ?? '').trim();
    if (!to || !to.includes('@')) {
      await stamp({ emailError: 'No bill-to email on the invoice' });
      return;
    }
    const apiKey = RESEND_API_KEY.value().trim();
    if (!apiKey) {
      await stamp({ emailError: 'Email not configured (RESEND_API_KEY empty)' });
      return;
    }

    const db = getFirestore();
    const [detailsSnap, settingsSnap] = await Promise.all([
      db.doc('platformSettings/fundingDetails').get(),
      db.doc('platformSettings/global').get(),
    ]);
    const d = detailsSnap.exists ? detailsSnap.data() ?? {} : {};
    const platformName = String(settingsSnap.data()?.platformName ?? 'SafeGuard Securities');
    const number = String(data.number ?? event.params.invoiceId);
    const currency = String(data.currency ?? 'USD');
    const items: Array<{ description?: string; quantity?: number; unitPrice?: number }> =
      Array.isArray(data.lineItems) ? data.lineItems : [];
    const taxRate = Number(data.taxRate ?? 0);
    const subtotal = items.reduce((s, i) => s + Number(i.quantity ?? 0) * Number(i.unitPrice ?? 0), 0);
    const tax = subtotal * taxRate / 100;
    const money = (n: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
    const issued = data.issuedAt?.toDate?.()
      ? (data.issuedAt.toDate() as Date).toLocaleString('en-US', {
          dateStyle: 'long',
          timeStyle: 'short',
          timeZone: 'America/New_York',
        })
      : '';
    const logoUrl = 'https://app.safeguardsecurities.us/logo-email.png';
    const sealUrl = 'https://app.safeguardsecurities.us/seal-official.svg';
    const portalUrl = `https://app.safeguardsecurities.us/invoice/${event.params.invoiceId}`;
    const name = String(data.billToName ?? to);

    const itemRows = items.map((i) => {
      const amt = Number(i.quantity ?? 0) * Number(i.unitPrice ?? 0);
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #dddddd;color:#003d82;font-size:14px;">${esc(i.description)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #dddddd;color:#003d82;font-size:14px;text-align:right;">${esc(i.quantity)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #dddddd;color:#003d82;font-size:14px;text-align:right;">${esc(money(amt))}</td>
      </tr>`;
    }).join('');

    let pay = '';
    if (data.includePaymentInstructions === true && d.bankEnabled === true) {
      const reasonBase = String(d.paymentReason ?? '').trim();
      const reason = reasonBase ? `${reasonBase} — ${number}` : number;
      const rows: Array<[string, unknown]> = [
        ['Bank name', d.bankName], ['Bank address', d.bankAddress],
        ['Bank ID / SWIFT code', d.bankSwift], ['Beneficiary account', d.bankAccountName],
        ['Beneficiary account no.', d.bankAccountNumber], ['Beneficiary address', d.beneficiaryAddress],
        ['Routing / IBAN', d.bankRoutingOrIban], ['Reason for payment', reason],
      ];
      pay = `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;border:1px solid #dddddd;margin:24px 0;"><tr><td style="padding:18px;">
        <div style="font-size:13px;font-weight:700;color:#003d82;text-transform:uppercase;">Payment instructions</div>
        <table width="100%">${rows.filter(([, v]) => v).map(([l, v]) =>
          `<tr><td style="padding:6px 12px 6px 0;color:#003d82;font-weight:700;font-size:13px;">${esc(l)}</td><td style="padding:6px 0;font-family:'Courier New',monospace;font-size:13px;color:#003d82;">${esc(v)}</td></tr>`
        ).join('')}</table></td></tr></table>`;
    }

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;background:#f5f5f5;">
<table width="100%"><tr><td align="center" style="padding:20px 10px;">
<table width="600" style="max-width:600px;width:100%;background:#fff;font-family:Arial,Helvetica,sans-serif;">
  <tr><td style="padding:26px 30px;border-bottom:1px solid #e5e7eb;">
    <img src="${esc(logoUrl)}" alt="${esc(platformName)}" height="48" style="height:48px;width:auto;border:0;" />
  </td></tr>
  <tr><td style="padding:36px 30px;color:#003d82;">
    <div style="font-size:18px;font-weight:600;">Invoice ${esc(number)}</div>
    <p style="font-size:14px;line-height:1.7;">Hello ${esc(name)}, please find your official ${esc(platformName)} invoice.
    This document is time-stamped and bears the firm digital seal.</p>
    <p style="font-size:13px;color:#5b6472;">Issued: ${esc(issued)}</p>
    <table width="100%">${itemRows}
      <tr><td colspan="2" style="padding-top:12px;text-align:right;color:#5b6472;">Subtotal</td><td style="padding-top:12px;text-align:right;font-weight:600;">${esc(money(subtotal))}</td></tr>
      ${taxRate > 0 ? `<tr><td colspan="2" style="padding-top:4px;text-align:right;color:#5b6472;">${esc(data.taxLabel ?? 'Tax')} (${esc(taxRate)}%)</td><td style="padding-top:4px;text-align:right;">${esc(money(tax))}</td></tr>` : ''}
      <tr><td colspan="2" style="padding-top:8px;text-align:right;font-weight:700;">Total due</td><td style="padding-top:8px;text-align:right;font-size:20px;font-weight:800;">${esc(money(subtotal + tax))}</td></tr>
    </table>
    ${pay}
    ${data.notes ? `<p style="font-size:13px;white-space:pre-wrap;">${esc(data.notes)}</p>` : ''}
    <div style="text-align:center;padding:20px 0 8px;">
      <a href="${esc(portalUrl)}" style="display:inline-block;background:#003d82;color:#fff;padding:12px 32px;text-decoration:none;border-radius:4px;font-weight:600;">View invoice in portal</a>
    </div>
    <div style="text-align:center;margin-top:12px;">
      <img src="${esc(sealUrl)}" alt="Official digital seal" width="96" height="96" style="width:96px;height:96px;" />
      <div style="font-size:10px;color:#5b6472;letter-spacing:.08em;text-transform:uppercase;">Official digital seal</div>
    </div>
  </td></tr>
  <tr><td align="center" style="background:#f0f0f0;padding:24px;font-size:11px;color:#666;">
    <img src="${esc(logoUrl)}" alt="" height="32" /><br/>
    ${esc(platformName)} · Confidential invoice · Electronically issued and sealed
  </td></tr>
</table></td></tr></table></body></html>`;

    const text = [
      `Invoice ${number}`,
      `Issued: ${issued}`,
      `Amount due: ${money(subtotal + tax)}`,
      '',
      `Billed to: ${name}`,
      ...items.map((i) => `  ${i.description}  ${i.quantity} × ${money(Number(i.unitPrice ?? 0))}`),
      '',
      platformName,
    ].join('\n');

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: MAIL_FROM.value(),
          to: [to],
          subject: `${platformName} — Invoice ${number}`,
          text,
          html,
        }),
      });
      if (!res.ok) {
        const body = (await res.text()).slice(0, 300);
        await stamp({ emailError: `Resend ${res.status}: ${body}` });
        return;
      }
      await stamp({
        emailSentAt: FieldValue.serverTimestamp(),
        emailError: FieldValue.delete(),
        status: 'sent',
      });
    } catch (err) {
      await stamp({ emailError: err instanceof Error ? err.message.slice(0, 300) : 'Send failed' });
    }
  },
);


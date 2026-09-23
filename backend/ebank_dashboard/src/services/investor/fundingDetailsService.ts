import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';

// Admin-configurable funding (deposit) instructions shown to clients and
// emailed by the functions-accounts trigger after a request is approved.
// Stored at platformSettings/fundingDetails - readable by any signed-in
// user (rules), writable by admins only.
const FUNDING_DETAILS_DOC_ID = 'fundingDetails';

export interface CryptoWallet {
  asset: string;    // e.g. 'USDT'
  network: string;  // e.g. 'TRC20' - or 'Binance Pay' for exchange transfers
  address: string;  // on-chain address, or Binance Pay ID / UID / registered email
  memo?: string;    // memo/tag some networks & exchange deposits require
}

export interface FundingDetails {
  bankEnabled: boolean;
  bankName: string;
  bankAddress: string;
  bankSwift: string;           // Bank ID / SWIFT code
  bankAccountName: string;     // Beneficiary account (name)
  bankAccountNumber: string;   // Beneficiary account no.
  beneficiaryAddress: string;  // Beneficiary's address
  bankRoutingOrIban: string;
  paymentReason: string;       // "Reason for payment" line; reference is appended per request
  cryptoEnabled: boolean;
  cryptoWallets: CryptoWallet[];
  extraInstructions: string;
  // Funding email template (admin-configurable copy; layout is fixed code).
  // {{reference}} in the subject is replaced per request.
  emailSubject: string;
  emailIntro: string;
  supportEmail: string;
  supportPhone: string;
  companyAddress: string;
}

export const FUNDING_DETAILS_DEFAULTS: FundingDetails = {
  bankEnabled: false,
  bankName: '',
  bankAddress: '',
  bankSwift: '',
  bankAccountName: '',
  bankAccountNumber: '',
  beneficiaryAddress: '',
  bankRoutingOrIban: '',
  paymentReason: 'Investment account funding',
  cryptoEnabled: false,
  cryptoWallets: [],
  extraInstructions: '',
  emailSubject: 'SafeGuard Securities — Funding Instructions ({{reference}})',
  emailIntro:
    'Your funding request has been approved. Please find your payment instructions below. ' +
    'Once your payment is received and confirmed, the funds will be credited to your wallet ' +
    'and available on your trading account.',
  supportEmail: 'finance@safeguardsecurities.us',
  supportPhone: '+1 216 250-7891',
  companyAddress: '6060 Parkland Boulevard, Suite 200, Mayfield Heights, OH 44124',
};

// Human-facing reference the client must quote on their wire/transfer memo so
// finance can match the incoming payment to the request. Derived from the
// Firestore doc id so it needs no extra field and works for legacy rows.
// DUPLICATED in functions-accounts/src/index.ts (fundingReference) - change both.
export function fundingReference(requestId: string): string {
  return 'SG-' + requestId.slice(0, 8).toUpperCase();
}

export async function getFundingDetails(): Promise<FundingDetails> {
  const snap = await getDoc(doc(db, LIVE_COLLECTIONS.settings, FUNDING_DETAILS_DOC_ID));
  if (!snap.exists()) return FUNDING_DETAILS_DEFAULTS;
  const data = snap.data();
  return {
    bankEnabled: Boolean(data.bankEnabled),
    bankName: data.bankName ?? '',
    bankAddress: data.bankAddress ?? '',
    bankSwift: data.bankSwift ?? '',
    bankAccountName: data.bankAccountName ?? '',
    bankAccountNumber: data.bankAccountNumber ?? '',
    beneficiaryAddress: data.beneficiaryAddress ?? '',
    bankRoutingOrIban: data.bankRoutingOrIban ?? '',
    paymentReason: data.paymentReason ?? FUNDING_DETAILS_DEFAULTS.paymentReason,
    cryptoEnabled: Boolean(data.cryptoEnabled),
    cryptoWallets: Array.isArray(data.cryptoWallets)
      ? data.cryptoWallets.map((w: Partial<CryptoWallet>) => ({
          asset: w.asset ?? '',
          network: w.network ?? '',
          address: w.address ?? '',
          memo: w.memo ?? '',
        }))
      : [],
    extraInstructions: data.extraInstructions ?? '',
    emailSubject: data.emailSubject ?? FUNDING_DETAILS_DEFAULTS.emailSubject,
    emailIntro: data.emailIntro ?? FUNDING_DETAILS_DEFAULTS.emailIntro,
    supportEmail: data.supportEmail ?? FUNDING_DETAILS_DEFAULTS.supportEmail,
    supportPhone: data.supportPhone ?? FUNDING_DETAILS_DEFAULTS.supportPhone,
    companyAddress: data.companyAddress ?? FUNDING_DETAILS_DEFAULTS.companyAddress,
  };
}

// Ordered label/value pairs matching the owner's wire-instructions template.
// Single source for the wallet card, the invoice, and the manual email.
export function bankInstructionRows(d: FundingDetails): Array<[string, string]> {
  return [
    ['Bank name', d.bankName],
    ['Bank address', d.bankAddress],
    ['Bank ID / SWIFT code', d.bankSwift],
    ['Beneficiary account', d.bankAccountName],
    ['Beneficiary account no.', d.bankAccountNumber],
    ['Beneficiary address', d.beneficiaryAddress],
    ['Routing / IBAN', d.bankRoutingOrIban],
  ];
}

// Blank base text => the reference alone; otherwise "text — reference".
export function paymentReasonLine(d: FundingDetails, reference: string): string {
  const reason = d.paymentReason.trim();
  return reason ? `${reason} — ${reference}` : reference;
}

export async function updateFundingDetails(details: FundingDetails): Promise<void> {
  await setDoc(
    doc(db, LIVE_COLLECTIONS.settings, FUNDING_DETAILS_DOC_ID),
    { ...details, updatedAt: new Date() },
    { merge: true },
  );
}

// Plain-text email body for the manual send path: the admin Funding page
// builds a mailto: link from this so the email opens pre-filled in the
// admin's own mail client (e.g. Thunderbird) and is sent from there.
// Keep the content in sync with the auto-send trigger in
// functions-accounts/src/index.ts (sendFundingDetailsOnApproval).
export function buildFundingEmail(params: {
  reference: string;
  amount: number;
  platformName: string;
  details: FundingDetails;
}): { subject: string; body: string } {
  const { reference, amount, platformName, details: d } = params;
  const fmtAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  const lines: string[] = [
    `Your funding request for ${fmtAmount} has been approved.`,
    '',
    `Payment reference (quote this in your transfer memo): ${reference}`,
    '',
  ];
  if (d.bankEnabled) {
    lines.push('Bank wire / transfer:');
    for (const [label, value] of bankInstructionRows(d)) {
      if (value) lines.push(`  ${label}: ${value}`);
    }
    lines.push(`  Reason for payment: ${paymentReasonLine(d, reference)}`, '');
  }
  if (d.cryptoEnabled && d.cryptoWallets.length > 0) {
    lines.push('Crypto:');
    for (const w of d.cryptoWallets) {
      if (w.address) lines.push(`  ${w.asset} (${w.network}): ${w.address}${w.memo ? ` — memo/tag: ${w.memo}` : ''}`);
    }
    lines.push('  Include the reference code in the transaction memo where supported.', '');
  }
  if (d.extraInstructions) lines.push(d.extraInstructions, '');
  lines.push('Your wallet will be credited once we confirm receipt of your payment.', '', platformName);

  return {
    subject: renderEmailSubject(d, reference, platformName),
    body: lines.join('\n'),
  };
}

export function renderEmailSubject(d: FundingDetails, reference: string, platformName: string): string {
  const template = d.emailSubject.trim() || `${platformName} — Funding Instructions ({{reference}})`;
  return template.split('{{reference}}').join(reference);
}

// ---------------------------------------------------------------------------
// Funding email - full HTML template, patterned on the owner's approved
// SafeGuard welcome-email template (navy #003d82 / green accents, logo in
// header AND footer). Layout is fixed here; the copy (subject, intro, contact
// block) comes from the admin-configurable FundingDetails fields above.
// MIRRORED in functions-accounts/src/index.ts (buildFundingEmailHtml) for the
// auto-send trigger - change both.
function escHtml(v: unknown): string {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface FundingEmailHtmlParams {
  reference: string;
  amount: number;
  clientName: string;
  platformName: string;
  requestDate: string;
  logoUrl: string; // absolute URL - email clients cannot resolve relative paths
  portalUrl: string; // wallet page - where the tap-to-copy details live
  details: FundingDetails;
}

export function buildFundingEmailHtml(p: FundingEmailHtmlParams): string {
  // EVERY style is inline (no <style> block, no classes): rich-copy from the
  // preview page into Thunderbird and delivery through Gmail/Outlook all strip
  // <style> blocks, so only inline styles survive. Table-based layout for the
  // same reason. Explicit height attributes keep the logo from rendering at
  // natural size when styles are dropped by an aggressive client.
  const d = p.details;
  const fmtAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.amount);
  const ROW_L = 'padding:10px 12px 10px 0;font-size:14px;color:#003d82;font-weight:700;vertical-align:top;text-align:left;border-bottom:1px solid #dddddd;';
  const ROW_V = "padding:10px 0;font-size:14px;color:#003d82;text-align:right;font-family:'Courier New',monospace;word-break:break-all;border-bottom:1px solid #dddddd;";
  const infoRow = (label: string, value: string) =>
    value
      ? `<tr><td style="${ROW_L}">${escHtml(label)}:</td><td style="${ROW_V}">${escHtml(value)}</td></tr>`
      : '';
  const section = (title: string, inner: string) =>
    `<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f0f0;border:1px solid #dddddd;border-radius:4px;margin:30px 0;"><tr><td style="padding:20px;">
      <div style="font-size:14px;font-weight:700;color:#003d82;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;"><span style="color:#00cc00;">&#9679;</span>&nbsp;${escHtml(title)}</div>
      <table width="100%" cellpadding="0" cellspacing="0">${inner}</table>
    </td></tr></table>`;

  const bankSection = d.bankEnabled
    ? section('Bank Wire / Transfer',
        bankInstructionRows(d).map(([label, value]) => infoRow(label, value)).join('') +
        infoRow('Reason for payment', paymentReasonLine(d, p.reference)))
    : '';
  const wallets = d.cryptoEnabled ? d.cryptoWallets.filter((w) => w.address) : [];
  const cryptoSection = wallets.length > 0
    ? section('Crypto Deposit',
        wallets.map((w) => infoRow(`${w.asset} (${w.network})`, w.memo ? `${w.address} (memo: ${w.memo})` : w.address)).join(''))
    : '';
  const extra = d.extraInstructions
    ? `<p style="color:#003d82;font-size:14px;line-height:1.8;white-space:pre-wrap;margin:0 0 20px;">${escHtml(d.extraInstructions)}</p>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(p.platformName)} — Funding Instructions</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;"><tr><td align="center" style="padding:20px 10px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
  <tr><td align="left" style="padding:26px 30px;border-bottom:1px solid #e5e7eb;">
    <a href="https://safeguardsecurities.us" target="_blank" rel="noopener noreferrer" style="text-decoration:none;border:0;">
      <img src="${escHtml(p.logoUrl)}" alt="${escHtml(p.platformName)}" height="48" style="height:48px;width:auto;display:block;border:0;" />
    </a>
  </td></tr>
  <tr><td style="padding:40px 30px;">
    <div style="font-size:18px;font-weight:600;color:#003d82;margin-bottom:20px;">Hello, ${escHtml(p.clientName)}!</div>
    <p style="color:#003d82;margin:0 0 30px;font-size:14px;line-height:1.8;">${escHtml(d.emailIntro)}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#003d82;border-radius:4px;margin:25px 0;"><tr><td align="center" style="padding:22px 20px;">
      <div style="font-size:12px;color:#ffffff;text-transform:uppercase;letter-spacing:1px;">Amount to transfer</div>
      <div style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:.5px;">${escHtml(fmtAmount)}</div>
      <div style="font-size:13px;margin-top:4px;color:#9fd5a7;font-family:'Courier New',monospace;">Reference: ${escHtml(p.reference)}</div>
    </td></tr></table>
    ${section('Funding Request Details',
      infoRow('Payment reference', p.reference) +
      infoRow('Amount', fmtAmount) +
      infoRow('Request date', p.requestDate) +
      infoRow('Status', 'Approved — awaiting payment'))}
    ${bankSection}
    ${cryptoSection}
    <div style="background-color:#e8f4f8;border:2px solid #003d82;padding:15px;border-radius:4px;margin:20px 0;font-size:13px;color:#003d82;">
      <strong>Important:</strong> quote reference <strong>${escHtml(p.reference)}</strong> in your
      transfer memo${wallets.length > 0 ? ' (or transaction memo/tag for crypto)' : ''} so we can match
      your payment. Your wallet is credited once receipt is confirmed by our finance desk.
    </div>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 0 8px;">
      <a href="${escHtml(p.portalUrl)}" style="display:inline-block;background-color:#003d82;color:#ffffff;padding:14px 40px;text-decoration:none;border-radius:4px;font-weight:600;font-size:14px;">Open in your client portal</a>
      <p style="font-size:12px;color:#5b6472;margin:8px 0 0;">In the portal, just tap any detail to copy it — then paste it straight into your banking app. No retyping.</p>
    </td></tr></table>
    ${extra}
    <div style="background-color:#ffe8e8;border-left:4px solid #e74c3c;padding:15px;margin:20px 0;border-radius:4px;font-size:13px;color:#003d82;">
      <strong style="color:#c0392b;">Security notice:</strong><br>
      &bull; ${escHtml(p.platformName)} will never ask you to send funds to details other than those in this email or your client portal<br>
      &bull; Verify the payment details in your portal before transferring<br>
      &bull; Be cautious of emails asking you to change payment instructions<br>
      &bull; Questions? Contact us only via the details in the footer below
    </div>
  </td></tr>
  <tr><td align="center" style="background-color:#f0f0f0;padding:30px;border-top:1px solid #dddddd;font-size:12px;color:#003d82;">
    <a href="https://safeguardsecurities.us" target="_blank" rel="noopener noreferrer" style="text-decoration:none;border:0;">
      <img src="${escHtml(p.logoUrl)}" alt="${escHtml(p.platformName)}" height="36" style="height:36px;width:auto;border:0;" />
    </a><br>
    <div style="font-weight:600;margin:12px 0 5px;">Contact Information</div>
    <div style="margin:8px 0;font-size:13px;">
      <strong>Address:</strong> ${escHtml(d.companyAddress)}<br>
      <strong>Phone:</strong> <a href="tel:${escHtml(d.supportPhone.replace(/\s/g, ''))}" style="color:#003d82;text-decoration:none;">${escHtml(d.supportPhone)}</a><br>
      <strong>Email:</strong> <a href="mailto:${escHtml(d.supportEmail)}" style="color:#003d82;text-decoration:none;">${escHtml(d.supportEmail)}</a><br>
      <strong>Website:</strong> <a href="https://safeguardsecurities.us" style="color:#003d82;text-decoration:none;">safeguardsecurities.us</a>
    </div>
    <div style="height:1px;background-color:#dddddd;margin:15px 0;"></div>
    <div style="font-size:10px;color:#666666;margin-top:15px;">
      ${escHtml(p.platformName)}, Inc. | Professional Trading Platform<br>
      &copy; ${new Date().getFullYear()} ${escHtml(p.platformName)}. All rights reserved.<br><br>
      This message contains your personal funding instructions — do not forward it.
    </div>
  </td></tr>
</table>
</td></tr></table>
</body>
</html>`;
}


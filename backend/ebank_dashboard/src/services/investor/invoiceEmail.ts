import type { FundingDetails } from './fundingDetailsService';
import { bankInstructionRows, paymentReasonLine } from './fundingDetailsService';
import {
  formatInvoiceMoney,
  invoiceSubtotal,
  invoiceTaxAmount,
  invoiceTotal,
  type StaffInvoice,
} from './invoiceService';

function esc(v: unknown): string {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function invoiceEmailSubject(invoice: StaffInvoice, platformName: string): string {
  return `${platformName} — Invoice ${invoice.number}`;
}

export function buildInvoiceEmailText(params: {
  invoice: StaffInvoice;
  platformName: string;
  details?: FundingDetails | null;
}): string {
  const { invoice, platformName, details } = params;
  const total = formatInvoiceMoney(invoiceTotal(invoice.lineItems, invoice.taxRate), invoice.currency);
  const lines = [
    `Invoice ${invoice.number}`,
    `Issued: ${invoice.issuedAt?.toISOString() ?? ''}`,
    `Amount due: ${total}`,
    '',
    `Billed to: ${invoice.billToName}`,
    invoice.billToCompany ? invoice.billToCompany : '',
    invoice.billToAddress ?? '',
    '',
    ...invoice.lineItems.map(
      (item) =>
        `  ${item.description}  ${item.quantity} × ${formatInvoiceMoney(item.unitPrice, invoice.currency)} = ${formatInvoiceMoney(item.quantity * item.unitPrice, invoice.currency)}`,
    ),
    '',
    invoice.paymentTerms ? `Terms: ${invoice.paymentTerms}` : '',
    invoice.notes ? invoice.notes : '',
  ];
  if (invoice.includePaymentInstructions && details) {
    lines.push('', 'Payment instructions:');
    if (details.bankEnabled) {
      for (const [label, value] of bankInstructionRows(details)) {
        if (value) lines.push(`  ${label}: ${value}`);
      }
      lines.push(`  Reason for payment: ${paymentReasonLine(details, invoice.number)}`);
    }
  }
  lines.push('', platformName);
  return lines.filter((l) => l !== undefined).join('\n');
}

export function buildInvoiceEmailHtml(params: {
  invoice: StaffInvoice;
  platformName: string;
  logoUrl: string;
  portalUrl: string;
  details?: FundingDetails | null;
}): string {
  const { invoice, platformName, logoUrl, portalUrl, details } = params;
  const subtotal = formatInvoiceMoney(invoiceSubtotal(invoice.lineItems), invoice.currency);
  const tax = formatInvoiceMoney(invoiceTaxAmount(invoice.lineItems, invoice.taxRate), invoice.currency);
  const total = formatInvoiceMoney(invoiceTotal(invoice.lineItems, invoice.taxRate), invoice.currency);
  const issued = invoice.issuedAt
    ? invoice.issuedAt.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/New_York' })
    : '—';
  const due = invoice.dueDate
    ? invoice.dueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const itemRows = invoice.lineItems
    .map(
      (item) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #dddddd;color:#101623;font-size:14px;">${esc(item.description)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #dddddd;color:#101623;font-size:14px;text-align:right;">${esc(item.quantity)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #dddddd;color:#101623;font-size:14px;text-align:right;">${esc(formatInvoiceMoney(item.unitPrice, invoice.currency))}</td>
        <td style="padding:10px 0;border-bottom:1px solid #dddddd;color:#101623;font-size:14px;text-align:right;font-weight:600;">${esc(formatInvoiceMoney(item.quantity * item.unitPrice, invoice.currency))}</td>
      </tr>`,
    )
    .join('');

  let payBlock = '';
  if (invoice.includePaymentInstructions && details?.bankEnabled) {
    const rows = bankInstructionRows(details)
      .concat([['Reason for payment', paymentReasonLine(details, invoice.number)]])
      .filter(([, v]) => v)
      .map(
        ([l, v]) =>
          `<tr><td style="padding:6px 12px 6px 0;color:#003d82;font-weight:700;font-size:13px;">${esc(l)}</td><td style="padding:6px 0;font-family:'Courier New',monospace;font-size:13px;color:#003d82;">${esc(v)}</td></tr>`,
      )
      .join('');
    payBlock = `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;border:1px solid #dddddd;border-radius:4px;margin:24px 0;"><tr><td style="padding:18px;">
      <div style="font-size:13px;font-weight:700;color:#003d82;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Payment instructions</div>
      <table width="100%">${rows}</table>
    </td></tr></table>`;
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(platformName)} — Invoice ${esc(invoice.number)}</title></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;"><tr><td align="center" style="padding:20px 10px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#101623;">
  <tr><td style="padding:26px 30px;border-bottom:2px solid #101623;">
    <table width="100%"><tr>
      <td valign="top">
        <img src="${esc(logoUrl)}" alt="${esc(platformName)}" height="56" style="height:56px;width:auto;max-width:280px;display:block;border:0;" />
        <div style="font-weight:700;margin-top:10px;">${esc(platformName)}</div>
      </td>
      <td valign="top" align="right">
        <div style="font-size:22px;font-weight:800;letter-spacing:.08em;">INVOICE</div>
        <div style="font-size:13px;color:#5b6472;">No. ${esc(invoice.number)}</div>
        <div style="font-size:12px;color:#5b6472;margin-top:6px;">Issued ${esc(issued)}</div>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:24px 30px;">
    <table width="100%"><tr>
      <td valign="top" style="padding-right:16px;">
        <div style="font-size:11px;color:#5b6472;text-transform:uppercase;letter-spacing:.06em;">Billed to</div>
        <div style="font-weight:700;">${esc(invoice.billToName)}</div>
        ${invoice.billToCompany ? `<div style="font-size:13px;">${esc(invoice.billToCompany)}</div>` : ''}
        ${invoice.billToEmail ? `<div style="font-size:13px;color:#5b6472;">${esc(invoice.billToEmail)}</div>` : ''}
        ${invoice.billToAddress ? `<div style="font-size:13px;color:#5b6472;white-space:pre-wrap;">${esc(invoice.billToAddress)}</div>` : ''}
      </td>
      <td valign="top" align="right" style="font-size:13px;">
        <div>Currency: <strong>${esc(invoice.currency)}</strong></div>
        ${due ? `<div>Due date: <strong>${esc(due)}</strong></div>` : ''}
        ${invoice.paymentTerms ? `<div>Terms: <strong>${esc(invoice.paymentTerms)}</strong></div>` : ''}
      </td>
    </tr></table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">
      <tr style="color:#5b6472;font-size:12px;text-transform:uppercase;letter-spacing:.06em;">
        <th align="left" style="padding-bottom:8px;border-bottom:1px solid #d8dde5;">Description</th>
        <th align="right" style="padding-bottom:8px;border-bottom:1px solid #d8dde5;">Qty</th>
        <th align="right" style="padding-bottom:8px;border-bottom:1px solid #d8dde5;">Unit</th>
        <th align="right" style="padding-bottom:8px;border-bottom:1px solid #d8dde5;">Amount</th>
      </tr>
      ${itemRows}
      <tr><td colspan="3" style="padding-top:12px;text-align:right;color:#5b6472;font-size:13px;">Subtotal</td><td style="padding-top:12px;text-align:right;font-weight:600;">${esc(subtotal)}</td></tr>
      ${invoice.taxRate > 0 ? `<tr><td colspan="3" style="padding-top:4px;text-align:right;color:#5b6472;font-size:13px;">${esc(invoice.taxLabel)} (${esc(invoice.taxRate)}%)</td><td style="padding-top:4px;text-align:right;">${esc(tax)}</td></tr>` : ''}
      <tr><td colspan="3" style="padding-top:8px;text-align:right;font-weight:700;">Total due</td><td style="padding-top:8px;text-align:right;font-size:20px;font-weight:800;">${esc(total)}</td></tr>
    </table>
    ${payBlock}
    ${invoice.notes ? `<p style="color:#5b6472;font-size:13px;white-space:pre-wrap;">${esc(invoice.notes)}</p>` : ''}
    <table width="100%"><tr>
      <td align="center" style="padding:20px 0 8px;">
        <a href="${esc(portalUrl)}" style="display:inline-block;background:#003d82;color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:4px;font-weight:600;font-size:14px;">View invoice in portal</a>
      </td>
    </tr></table>
  </td></tr>
  <tr><td align="center" style="background:#f0f0f0;padding:24px;font-size:11px;color:#666;">
    ${esc(platformName)} · Confidential invoice
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

import { jsPDF } from 'jspdf';
import { bankInstructionRows, paymentReasonLine, type FundingDetails } from './fundingDetailsService';
import {
  formatInvoiceMoney,
  invoiceSubtotal,
  invoiceTaxAmount,
  invoiceTotal,
  type StaffInvoice,
} from './invoiceService';

const PAGE_W = 612;
const MARGIN = 48;
const INK: [number, number, number] = [16, 22, 35];
const MUTED: [number, number, number] = [91, 100, 114];
const LINE: [number, number, number] = [216, 221, 229];
const NAVY: [number, number, number] = [0, 61, 130];

export function invoicePdfFilename(number: string): string {
  const safe = number.replace(/[^\w.-]+/g, '-').replace(/^-|-$/g, '') || 'invoice';
  return `${safe}.pdf`;
}

async function logoDataUrl(url: string): Promise<{ data: string; w: number; h: number; format: 'PNG' | 'JPEG' } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = data;
    });
    const format = blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'JPEG' : 'PNG';
    return { data, w: img.naturalWidth || img.width, h: img.naturalHeight || img.height, format };
  } catch {
    return null;
  }
}

function fmtStamp(d?: Date): string {
  return d
    ? d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    : '—';
}

function fmtDate(d?: Date): string {
  return d ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
}

export async function downloadInvoicePdf(params: {
  invoice: StaffInvoice;
  platformName: string;
  logoUrl: string;
  details?: FundingDetails | null;
}): Promise<string> {
  const { invoice, platformName, logoUrl, details } = params;
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
  const right = PAGE_W - MARGIN;
  let y = MARGIN;

  const logo = await logoDataUrl(logoUrl);
  if (logo) {
    const h = 42;
    const w = (logo.w / logo.h) * h;
    pdf.addImage(logo.data, logo.format, MARGIN, y, Math.min(w, 220), h);
    y += h + 10;
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...INK);
  pdf.text(platformName, MARGIN, y);
  pdf.setFontSize(18);
  pdf.text('INVOICE', right, y, { align: 'right' });
  y += 16;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(...MUTED);
  pdf.text(`No. ${invoice.number}`, right, y, { align: 'right' });
  y += 14;
  pdf.text(`Issued ${fmtStamp(invoice.issuedAt ?? invoice.createdAt)}`, right, y, { align: 'right' });
  y += 18;
  pdf.setDrawColor(...INK);
  pdf.setLineWidth(1.5);
  pdf.line(MARGIN, y, right, y);
  y += 22;

  const colTop = y;
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  pdf.text('BILLED TO', MARGIN, colTop);
  let leftY = colTop + 14;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(...INK);
  pdf.text(invoice.billToName, MARGIN, leftY);
  leftY += 14;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  if (invoice.billToCompany) {
    pdf.text(invoice.billToCompany, MARGIN, leftY);
    leftY += 13;
  }
  if (invoice.billToEmail) {
    pdf.setTextColor(...MUTED);
    pdf.text(invoice.billToEmail, MARGIN, leftY);
    leftY += 13;
  }
  if (invoice.billToAddress) {
    pdf.setTextColor(...MUTED);
    const lines = pdf.splitTextToSize(invoice.billToAddress, 280);
    pdf.text(lines, MARGIN, leftY);
    leftY += lines.length * 13;
  }

  let rightY = colTop;
  pdf.setFontSize(10);
  const meta = [
    ['Currency', invoice.currency],
    ['Due date', fmtDate(invoice.dueDate)],
    invoice.paymentTerms ? ['Terms', invoice.paymentTerms] : null,
  ].filter(Boolean) as [string, string][];
  for (const [k, v] of meta) {
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...MUTED);
    pdf.text(`${k}:`, 360, rightY);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...INK);
    pdf.text(v, right, rightY, { align: 'right' });
    rightY += 14;
  }

  y = Math.max(leftY, rightY) + 20;

  const cols = { desc: MARGIN, qty: 360, unit: 430, amt: right };
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  pdf.text('DESCRIPTION', cols.desc, y);
  pdf.text('QTY', cols.qty, y, { align: 'right' });
  pdf.text('UNIT', cols.unit, y, { align: 'right' });
  pdf.text('AMOUNT', cols.amt, y, { align: 'right' });
  y += 6;
  pdf.setDrawColor(...LINE);
  pdf.setLineWidth(0.6);
  pdf.line(MARGIN, y, right, y);
  y += 16;

  pdf.setFontSize(10);
  pdf.setTextColor(...INK);
  const ensureSpace = (need: number) => {
    if (y + need > 740) {
      pdf.addPage();
      y = MARGIN;
    }
  };

  for (const item of invoice.lineItems) {
    const desc = pdf.splitTextToSize(item.description || '—', 250);
    ensureSpace(desc.length * 13 + 10);
    pdf.text(desc, cols.desc, y);
    pdf.text(String(item.quantity), cols.qty, y, { align: 'right' });
    pdf.text(formatInvoiceMoney(item.unitPrice, invoice.currency), cols.unit, y, { align: 'right' });
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatInvoiceMoney(item.quantity * item.unitPrice, invoice.currency), cols.amt, y, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    y += Math.max(18, desc.length * 13);
    pdf.setDrawColor(...LINE);
    pdf.line(MARGIN, y - 6, right, y - 6);
  }

  y += 8;
  const totals: Array<[string, string, boolean]> = [
    ['Subtotal', formatInvoiceMoney(invoiceSubtotal(invoice.lineItems), invoice.currency), false],
  ];
  if (invoice.taxRate > 0) {
    totals.push([
      `${invoice.taxLabel} (${invoice.taxRate}%)`,
      formatInvoiceMoney(invoiceTaxAmount(invoice.lineItems, invoice.taxRate), invoice.currency),
      false,
    ]);
  }
  totals.push([
    'Total due',
    formatInvoiceMoney(invoiceTotal(invoice.lineItems, invoice.taxRate), invoice.currency),
    true,
  ]);
  for (const [label, value, strong] of totals) {
    ensureSpace(20);
    pdf.setFont('helvetica', strong ? 'bold' : 'normal');
    pdf.setFontSize(strong ? 13 : 10);
    pdf.setTextColor(...(strong ? NAVY : MUTED));
    pdf.text(label, cols.unit, y, { align: 'right' });
    pdf.setTextColor(...INK);
    pdf.text(value, cols.amt, y, { align: 'right' });
    y += strong ? 20 : 16;
  }

  if (invoice.includePaymentInstructions && details?.bankEnabled) {
    y += 10;
    ensureSpace(80);
    pdf.setFillColor(244, 246, 249);
    const rows = bankInstructionRows(details).concat([
      ['Reason for payment', paymentReasonLine(details, invoice.number)],
    ]).filter(([, v]) => v);
    const boxH = 28 + rows.length * 14;
    pdf.rect(MARGIN, y, right - MARGIN, boxH, 'F');
    y += 16;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...INK);
    pdf.text('Payment instructions', MARGIN + 12, y);
    y += 16;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    for (const [label, value] of rows) {
      ensureSpace(16);
      pdf.setTextColor(...MUTED);
      pdf.text(label, MARGIN + 12, y);
      pdf.setTextColor(...INK);
      pdf.setFont('courier', 'normal');
      pdf.text(String(value), MARGIN + 170, y);
      pdf.setFont('helvetica', 'normal');
      y += 14;
    }
    y += 8;
  }

  if (invoice.notes) {
    ensureSpace(40);
    pdf.setFontSize(9);
    pdf.setTextColor(...MUTED);
    const notes = pdf.splitTextToSize(invoice.notes, right - MARGIN);
    pdf.text(notes, MARGIN, y);
    y += notes.length * 12 + 8;
  }

  ensureSpace(30);
  pdf.setDrawColor(...LINE);
  pdf.line(MARGIN, y, right, y);
  y += 16;
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  pdf.text(`${platformName} · Confidential invoice · Electronically issued ${fmtStamp(invoice.issuedAt ?? invoice.createdAt)}`, MARGIN, y);

  const filename = invoicePdfFilename(invoice.number);
  pdf.save(filename);
  return filename;
}

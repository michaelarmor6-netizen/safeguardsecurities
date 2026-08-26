// Import pipeline: file -> rows -> mapped -> reviewed -> committed.
// Parsing happens entirely in the browser on purpose: no lead PII leaves the
// admin's machine before a human has looked at the review grid, and there is
// no server to deploy for phase 1. Originals are archived to Storage for the
// audit trail - best-effort, because an archive failure should not block an
// import the admin has already reviewed.
import { addDoc, collection, getDocs, orderBy, query, type DocumentData } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../../../config/firebase';
import { LIVE_COLLECTIONS } from '../../../config/liveCollections';
import { guessField, normalizeEmail, normalizePhone, splitFullName } from './leadNormalizer';
import { extractFromText } from './crmTextExtract';
import type { ConsentBasis, CrmField, CrmImportBatch, ReviewRow } from './crmTypes';

export interface ParsedFile {
  name: string;
  size: number;
  headers: string[];
  rows: Record<string, string>[];
}

// ---------------------------------------------------------------- parsing --

// Small CSV parser handling quotes, embedded commas/newlines, CR/LF - the
// dialect Excel and Sheets actually emit. A dependency would not handle more.
export function parseCsvText(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else { inQuotes = false; }
      } else cell += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(cell); cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.length > 1 || row[0] !== '') out.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length > 0) { row.push(cell); if (row.length > 1 || row[0] !== '') out.push(row); }
  return out;
}

function gridToRecords(grid: string[][]): { headers: string[]; rows: Record<string, string>[] } {
  if (grid.length === 0) return { headers: [], rows: [] };
  const headers = grid[0].map((h, i) => (h?.trim() ? h.trim() : `Column ${i + 1}`));
  const rows = grid.slice(1)
    .filter((r) => r.some((c) => (c ?? '').trim() !== ''))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])));
  return { headers, rows };
}

export async function parseLeadFile(file: File): Promise<ParsedFile> {
  const name = file.name;
  const lower = name.toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    // SheetJS is ~400KB minified - loaded only when someone actually drops
    // an Excel file, so the live site's main bundle does not pay for it.
    const XLSX = await import('xlsx');
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const grid = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' }) as unknown as string[][];
    const { headers, rows } = gridToRecords(grid.map((r) => r.map((c) => String(c ?? ''))));
    return { name, size: file.size, headers, rows };
  }
  if (lower.endsWith('.csv') || lower.endsWith('.txt') || lower.endsWith('.tsv')) {
    let text = await file.text();
    // Tab-separated sheets pasted into a .txt are common; detect and convert.
    if (lower.endsWith('.tsv') || (text.includes('\t') && !text.includes(','))) {
      text = text.split('\t').join(',');
    }
    const { headers, rows } = gridToRecords(parseCsvText(text));
    // A "table" that collapsed to a single column is not a table - it is a
    // prose list ("1. MR. SO AND SO ... email ... phone"). Hand it to the
    // text extractor instead of pretending one giant column is data.
    if (headers.length <= 1) {
      const ex = extractFromText(text);
      return { name, size: file.size, headers: ex.headers, rows: ex.rows };
    }
    return { name, size: file.size, headers, rows };
  }
  // Word / PDF / images are phase 2 (mammoth / pdfjs / tesseract). Refusing
  // loudly beats pretending: the admin learns the boundary on the spot.
  throw new Error(`"${name}": this format lands in phase 2. Today: .csv, .xlsx, .xls, .tsv, .txt (tabular).`);
}

// --------------------------------------------------------------- mapping ---

export function autoMap(headers: string[]): Record<string, CrmField | null> {
  const mapping: Record<string, CrmField | null> = {};
  const taken = new Set<CrmField>();
  for (const h of headers) {
    const guess = guessField(h);
    // Single-target fields keep only their first match ('tag' may repeat).
    if (guess && guess !== 'tag' && taken.has(guess)) { mapping[h] = null; continue; }
    if (guess && guess !== 'tag') taken.add(guess);
    mapping[h] = guess;
  }
  return mapping;
}

export function buildReviewRows(
  rows: Record<string, string>[],
  mapping: Record<string, CrmField | null>,
): ReviewRow[] {
  const seenPhones = new Set<string>();
  const seenEmails = new Set<string>();
  return rows.map((raw, index) => {
    const get = (field: CrmField) =>
      Object.entries(mapping).filter(([, f]) => f === field).map(([h]) => raw[h] ?? '').join(field === 'tag' ? '|' : ' ').trim();

    let firstName = get('firstName');
    let lastName = get('lastName');
    const fullName = get('fullName');
    if (!firstName && !lastName && fullName) ({ firstName, lastName } = splitFullName(fullName));

    const phoneRaw = get('phone') || get('altPhone');
    const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
    const emailRaw = get('email');
    const email = emailRaw ? normalizeEmail(emailRaw) : null;

    const problems: string[] = [];
    if (!firstName && !lastName && !get('company')) problems.push('no name or company');
    if (phoneRaw && !phone) problems.push(`phone "${phoneRaw}" did not parse`);
    if (emailRaw && !email) problems.push(`email "${emailRaw}" is invalid`);
    if (!phone && !email) problems.push('no usable phone or email');

    const duplicateInBatch =
      (phone ? seenPhones.has(phone.e164) : false) || (email ? seenEmails.has(email) : false);
    if (phone) seenPhones.add(phone.e164);
    if (email) seenEmails.add(email);

    return {
      index,
      raw,
      firstName,
      lastName,
      company: get('company') || undefined,
      phoneE164: phone?.e164,
      email: email ?? undefined,
      country: phone?.country,
      notes: get('notes') || undefined,
      tags: get('tag') ? get('tag').split('|').map((t) => t.trim()).filter(Boolean) : [],
      problems,
      duplicateInBatch,
      include: problems.length === 0 && !duplicateInBatch,
    };
  });
}

// --------------------------------------------------------------- batches ---

function mapBatch(id: string, data: DocumentData): CrmImportBatch {
  return {
    id,
    files: data.files ?? [],
    mapping: data.mapping ?? {},
    consentBasis: data.consentBasis ?? 'unknown',
    counts: data.counts ?? { parsed: 0, kept: 0, rejected: 0, deduped: 0, suppressed: 0 },
    confirmedBy: data.confirmedBy ?? '',
    confirmedByEmail: data.confirmedByEmail ?? '',
    createdAt: data.createdAt?.toDate?.(),
  };
}

export async function listImportBatches(): Promise<CrmImportBatch[]> {
  const snap = await getDocs(query(collection(db, LIVE_COLLECTIONS.crmImports), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => mapBatch(d.id, d.data()));
}

export async function recordImportBatch(
  batch: Omit<CrmImportBatch, 'id' | 'createdAt'>,
  originals: File[],
): Promise<string> {
  const docRef = await addDoc(collection(db, LIVE_COLLECTIONS.crmImports), { ...batch, createdAt: new Date() });
  // Archive originals - best-effort, never blocking.
  await Promise.all(originals.map(async (f) => {
    try {
      await uploadBytes(ref(storage, `crm-imports/${docRef.id}/${f.name}`), f);
    } catch (e) {
      console.error('crm import archive failed (continuing):', e);
    }
  }));
  return docRef.id;
}

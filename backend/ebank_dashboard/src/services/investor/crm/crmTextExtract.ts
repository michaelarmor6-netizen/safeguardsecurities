// Unstructured-text lead extraction - for the files that are lists, not
// tables: "1. MR. WILLIAM GILLHAM AUSTRALIA name@host.com +61 428589047
// --NI Hung up". The first real-world import was one of these, so this
// arrived ahead of its phase.
//
// Approach: split the text into records, then pull the unambiguous things
// out of each record first (emails and phone numbers - machines are good at
// those), and treat what is left as name / country / notes. Anything with
// no email AND no phone is not a lead record (it is a heading like "AUSSIE
// LEADS FROM ROBERT") and is dropped. The review grid remains the judge of
// everything this file guesses.
import { findPhoneNumbersInText, type CountryCode } from 'libphonenumber-js';
import { DEFAULT_REGION } from './leadNormalizer';

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

// Enough countries to cover the lead lists this desk actually sees; a miss
// just leaves the word in Notes, it never breaks a row.
const COUNTRY_WORDS: Record<string, string> = {
  AUSTRALIA: 'AU', 'NEW ZEALAND': 'NZ', PHILIPPINES: 'PH', SINGAPORE: 'SG',
  MALAYSIA: 'MY', 'HONG KONG': 'HK', JAPAN: 'JP', 'UNITED STATES': 'US',
  USA: 'US', AMERICA: 'US', CANADA: 'CA', 'UNITED KINGDOM': 'GB', UK: 'GB',
  ENGLAND: 'GB', IRELAND: 'IE', GERMANY: 'DE', FRANCE: 'FR', SPAIN: 'ES',
  ITALY: 'IT', SWITZERLAND: 'CH', UAE: 'AE', DUBAI: 'AE', INDIA: 'IN',
  CHINA: 'CN', TAIWAN: 'TW', 'SOUTH KOREA': 'KR', KOREA: 'KR',
  INDONESIA: 'ID', THAILAND: 'TH', VIETNAM: 'VN',
};

const HONORIFIC_RE = /^(MR|MS|MRS|DR|ENGR|ATTY|PROF|SIR|MADAM)\.?$/i;

export interface ExtractedRecord {
  Name: string;
  Phone: string;
  'Alt Phone': string;
  Email: string;
  Country: string;
  Notes: string;
}

// Split into records: numbered items ("1. ... 2. ...") when the file uses
// them, otherwise one record per non-empty line.
export function splitRecords(text: string): string[] {
  const numbered = text.split(/(?:^|\n|\s)(?=\d{1,4}\.\s)/g).map((s) => s.trim()).filter(Boolean);
  // Require at least two numbered items to trust that structure.
  if (numbered.filter((s) => /^\d{1,4}\.\s/.test(s)).length >= 2) {
    return numbered;
  }
  return text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

export function extractRecord(raw: string, region: CountryCode = DEFAULT_REGION): ExtractedRecord | null {
  const working = raw.replace(/^\d{1,4}\.\s*/, ''); // strip the list index

  // Emails first, with positions; then mask them so a country word or digit
  // run inside an address can never be mistaken for a country or phone.
  const emailMatches = [...working.matchAll(EMAIL_RE)];
  let masked = working;
  for (const m of emailMatches) {
    masked = masked.slice(0, m.index) + '#'.repeat(m[0].length) + masked.slice(m.index + m[0].length);
  }

  // Country next, BEFORE phones - "0412 345 678" is only a valid number once
  // we know the record says AUSTRALIA. Longest matching word wins.
  let country = '';
  let countrySpan: { start: number; end: number } | null = null;
  for (const [word, iso] of Object.entries(COUNTRY_WORDS).sort((a, b) => b[0].length - a[0].length)) {
    const m = masked.match(new RegExp(`\\b${word}\\b`, 'i'));
    if (m && m.index !== undefined) {
      country = iso;
      countrySpan = { start: m.index, end: m.index + m[0].length };
      break;
    }
  }

  const phones = findPhoneNumbersInText(masked, (country || region) as CountryCode);
  if (emailMatches.length === 0 && phones.length === 0) return null; // heading, not a lead

  const phoneNumbers = phones.map((p) => p.number.number as string);

  // Replace every extracted entity with a sentinel, by position. What sits
  // BEFORE the first entity is the name; everything from the first entity on
  // (minus the entities themselves) is notes - dispositions like "--NI Hung
  // up" or "call back thursday" are context an agent wants to see.
  const spans = [
    ...emailMatches.map((m) => ({ start: m.index, end: m.index + m[0].length })),
    ...phones.map((p) => ({ start: p.startsAt, end: p.endsAt })),
    ...(countrySpan ? [countrySpan] : []),
  ].sort((a, b) => b.start - a.start);
  let cut = working;
  for (const s of spans) cut = cut.slice(0, s.start) + '' + cut.slice(s.end);

  const parts = cut.split('');
  const nameRegion = parts[0] ?? '';
  const notesRegion = parts.slice(1).join(' ');

  const nameTokens = nameRegion.split(/\s+/).filter(Boolean)
    .map((t) => t.replace(/[,;·|]+$/, ''))
    .filter((t) => !HONORIFIC_RE.test(t))
    .filter((t) => /^[A-Za-z][A-Za-z.'-]*$/.test(t))
    .slice(0, 6);
  const notes = notesRegion.replace(/[-–—]{2,}/g, ' ').replace(/\s+/g, ' ')
    .replace(/^[-–—,;\s]+|[,;\s]+$/g, '').trim();

  const titleCase = (w: string) => w.length > 1 && w === w.toUpperCase()
    ? w[0] + w.slice(1).toLowerCase() : w;

  return {
    Name: nameTokens.map(titleCase).join(' '),
    Phone: phoneNumbers[0] ?? '',
    'Alt Phone': phoneNumbers[1] ?? '',
    Email: emailMatches[0]?.[0].toLowerCase() ?? '',
    Country: country,
    Notes: notes,
  };
}

export function extractFromText(text: string, region: CountryCode = DEFAULT_REGION): {
  headers: string[]; rows: Record<string, string>[]; skippedNonRecords: number;
} {
  const records = splitRecords(text);
  const rows: Record<string, string>[] = [];
  let skipped = 0;
  for (const r of records) {
    const rec = extractRecord(r, region);
    if (rec) rows.push(rec as unknown as Record<string, string>);
    else skipped++;
  }
  return { headers: ['Name', 'Phone', 'Alt Phone', 'Email', 'Country', 'Notes'], rows, skippedNonRecords: skipped };
}

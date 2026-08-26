// Vicidial standard lead-loader CSV.
//
// The column order below is Vicidial's own "standard format", so the admin
// loads the file with zero column fiddling. Three rules are enforced HERE so
// they cannot depend on anyone's memory:
//   1. suppressed / phone-less leads never leave (funnel-only leads are not
//      dialer leads);
//   2. E.164 is split into phone_code + national digits, which is how the
//      loader wants it;
//   3. vendor_lead_code carries our lead id (or the GI lead id when the lead
//      came through the webhook) so dispositions can be matched back later.
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import type { CrmLead } from './crmTypes';

export const VICIDIAL_HEADERS = [
  'vendor_lead_code', 'source_id', 'list_id', 'phone_code', 'phone_number',
  'title', 'first_name', 'middle_initial', 'last_name',
  'address1', 'address2', 'address3', 'city', 'state', 'province',
  'postal_code', 'country_code', 'gender', 'date_of_birth', 'alt_phone',
  'email', 'security_phrase', 'comments', 'rank', 'owner',
] as const;

function csvCell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export interface VicidialExportResult {
  csv: string;            // CRLF, UTF-8, no BOM
  included: CrmLead[];
  skippedNoPhone: number;
}

export function buildVicidialCsv(leads: CrmLead[], listId = ''): VicidialExportResult {
  const included: CrmLead[] = [];
  let skippedNoPhone = 0;
  const lines: string[] = [VICIDIAL_HEADERS.join(',')];

  for (const lead of leads) {
    if (!lead.phoneE164) { skippedNoPhone++; continue; }
    const parsed = parsePhoneNumberFromString(lead.phoneE164);
    if (!parsed) { skippedNoPhone++; continue; }

    const row: Record<(typeof VICIDIAL_HEADERS)[number], string> = {
      vendor_lead_code: lead.giLeadId ?? lead.id,
      source_id: lead.source.kind === 'gi' ? (lead.source.mission ?? 'gi') : 'safeguard-crm',
      list_id: listId,
      phone_code: parsed.countryCallingCode,
      phone_number: parsed.nationalNumber,
      title: '',
      first_name: lead.firstName,
      middle_initial: '',
      last_name: lead.lastName,
      address1: '', address2: '', address3: '',
      city: '', state: '', province: '', postal_code: '',
      country_code: lead.country ?? parsed.country ?? '',
      gender: 'U',
      date_of_birth: '',
      alt_phone: '',
      email: lead.email ?? '',
      security_phrase: '',
      comments: lead.company ? `Company: ${lead.company}` : '',
      rank: '', owner: '',
    };
    lines.push(VICIDIAL_HEADERS.map((h) => csvCell(row[h])).join(','));
    included.push(lead);
  }
  return { csv: lines.join('\r\n') + '\r\n', included, skippedNoPhone };
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

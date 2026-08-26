// Shared types for the CRM lead store.
//
// One deliberate rule shapes everything here: a lead is only as good as its
// provenance. Every lead carries where it came from (source) and why we are
// allowed to contact this person (consentBasis) - both are set at import time
// and are required, because "unknown" chosen explicitly is honest data while
// a silent default is a compliance hole.

export type CrmLeadStatus = 'new' | 'working' | 'customer' | 'dead';

export type ConsentBasis =
  | 'inquiry'            // they asked us something (form, call-in, referral)
  | 'existing_business'  // current or past client relationship
  | 'purchased_list'     // bought data - the segment counsel cares about
  | 'unknown';           // explicitly unknown - filterable, never emailed by default

export const CONSENT_BASIS_LABELS: Record<ConsentBasis, string> = {
  inquiry: 'Inquiry / opt-in',
  existing_business: 'Existing business relationship',
  purchased_list: 'Purchased list',
  unknown: 'Unknown',
};

export interface CrmLeadSource {
  kind: 'file' | 'gi' | 'manual';
  batchId?: string;
  file?: string;
  mission?: string; // gi:{mission} - populated by the phase-3 webhook
}

export interface CrmLead {
  id: string;
  firstName: string;
  lastName: string;
  company?: string;
  phoneE164?: string;    // E.164 or absent - never a half-normalised string
  email?: string;        // lowercased or absent
  country?: string;      // ISO-3166 alpha-2 when known
  tags: string[];
  status: CrmLeadStatus;
  source: CrmLeadSource;
  consentBasis: ConsentBasis;
  consentNote?: string;
  giLeadId?: string;     // preserved end-to-end; becomes Vicidial vendor_lead_code
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastExportedAt?: Date;
}

export interface CrmImportBatch {
  id: string;
  files: { name: string; size: number; storagePath?: string }[];
  mapping: Record<string, CrmField | null>;
  consentBasis: ConsentBasis;
  counts: { parsed: number; kept: number; rejected: number; deduped: number; suppressed: number };
  confirmedBy: string;
  confirmedByEmail: string;
  createdAt?: Date;
}

export interface CrmSuppressionEntry {
  id: string;
  type: 'email' | 'phone';
  value: string; // lowercased email or E.164 phone
  reason: 'unsubscribe' | 'bounce' | 'complaint' | 'manual';
  source?: string;
  addedAt?: Date;
}

// The fields the import wizard can map a column onto.
export type CrmField =
  | 'firstName' | 'lastName' | 'fullName' | 'company'
  | 'phone' | 'altPhone' | 'email' | 'country' | 'notes' | 'tag';

export const CRM_FIELD_LABELS: Record<CrmField, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  fullName: 'Full name (will be split)',
  company: 'Company',
  phone: 'Phone',
  altPhone: 'Alt phone',
  email: 'Email',
  country: 'Country',
  notes: 'Notes',
  tag: 'Tag',
};

// A parsed-but-not-yet-committed row in the review grid. Nothing reaches
// Firestore until an admin has seen these and pressed Commit - that is the
// human-led gate, and it is the same for every intake door.
export interface ReviewRow {
  index: number;
  raw: Record<string, string>;
  firstName: string;
  lastName: string;
  company?: string;
  phoneE164?: string;
  email?: string;
  country?: string;
  notes?: string;
  tags: string[];
  problems: string[];        // human-readable validation failures
  duplicateOfLeadId?: string; // existing store match (phone or email)
  duplicateInBatch?: boolean;
  suppressed?: boolean;      // matches crmSuppression - locked out of commit
  include: boolean;          // admin's checkbox
}

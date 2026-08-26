// The lead store. After wallets, this becomes the most sensitive collection
// in the app - it is names, numbers and consent records for people who have
// not signed up for anything. Staff-only by Firestore rule, and every bulk
// exit (Vicidial CSV, campaigns later) goes through the audit log.
import {
  collection, deleteDoc, doc, getDocs, limit as fsLimit, orderBy, query,
  serverTimestamp, updateDoc, where, writeBatch, type DocumentData,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { LIVE_COLLECTIONS } from '../../../config/liveCollections';
import type { ConsentBasis, CrmLead, CrmLeadSource, CrmLeadStatus, ReviewRow } from './crmTypes';

function mapLead(id: string, data: DocumentData): CrmLead {
  return {
    id,
    firstName: data.firstName ?? '',
    lastName: data.lastName ?? '',
    company: data.company ?? undefined,
    phoneE164: data.phoneE164 ?? undefined,
    email: data.email ?? undefined,
    country: data.country ?? undefined,
    tags: Array.isArray(data.tags) ? data.tags : [],
    status: (data.status ?? 'new') as CrmLeadStatus,
    source: data.source ?? { kind: 'manual' },
    consentBasis: (data.consentBasis ?? 'unknown') as ConsentBasis,
    consentNote: data.consentNote ?? undefined,
    giLeadId: data.giLeadId ?? undefined,
    notes: data.notes ?? undefined,
    createdAt: data.createdAt?.toDate?.(),
    updatedAt: data.updatedAt?.toDate?.(),
    lastExportedAt: data.lastExportedAt?.toDate?.(),
  };
}

export interface LeadFilter {
  status?: CrmLeadStatus;
  consentBasis?: ConsentBasis;
  tag?: string;
  hasPhone?: boolean;
  hasEmail?: boolean;
  search?: string; // client-side substring match on name/company/email/phone
}

// Firestore composite-index appetite is kept deliberately small: one ordered
// scan (bounded) + client-side filtering. At CRM volumes (thousands, not GI
// millions - that line is drawn in the plan) this is simpler and fast enough.
export async function listLeads(filter: LeadFilter = {}, max = 2000): Promise<CrmLead[]> {
  const snap = await getDocs(query(
    collection(db, LIVE_COLLECTIONS.crmLeads),
    orderBy('createdAt', 'desc'),
    fsLimit(max),
  ));
  let leads = snap.docs.map((d) => mapLead(d.id, d.data()));
  if (filter.status) leads = leads.filter((l) => l.status === filter.status);
  if (filter.consentBasis) leads = leads.filter((l) => l.consentBasis === filter.consentBasis);
  if (filter.tag) leads = leads.filter((l) => l.tags.includes(filter.tag!));
  if (filter.hasPhone) leads = leads.filter((l) => !!l.phoneE164);
  if (filter.hasEmail) leads = leads.filter((l) => !!l.email);
  if (filter.search) {
    const s = filter.search.toLowerCase();
    leads = leads.filter((l) =>
      `${l.firstName} ${l.lastName} ${l.company ?? ''} ${l.email ?? ''} ${l.phoneE164 ?? ''}`.toLowerCase().includes(s));
  }
  return leads;
}

// Which of these phones/emails already exist in the store? Returns value ->
// existing lead id. Used by the review grid so duplicates are decided by a
// person, not silently merged.
export async function findExisting(phones: string[], emails: string[]): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  const lookup = async (field: 'phoneE164' | 'email', values: string[]) => {
    const unique = [...new Set(values.filter(Boolean))];
    for (let i = 0; i < unique.length; i += 30) {
      const chunk = unique.slice(i, i + 30);
      const snap = await getDocs(query(collection(db, LIVE_COLLECTIONS.crmLeads), where(field, 'in', chunk)));
      snap.docs.forEach((d) => found.set(d.data()[field], d.id));
    }
  };
  await lookup('phoneE164', phones);
  await lookup('email', emails);
  return found;
}

// Commit the reviewed rows. Only rows the admin left included, that are not
// suppressed, not duplicates, and problem-free make it in - the caller has
// already shown every exclusion to a human.
export async function commitLeads(
  rows: ReviewRow[],
  source: CrmLeadSource,
  consentBasis: ConsentBasis,
): Promise<number> {
  const eligible = rows.filter((r) =>
    r.include && !r.suppressed && !r.duplicateOfLeadId && !r.duplicateInBatch && r.problems.length === 0);
  // Firestore batch cap is 500 writes.
  for (let i = 0; i < eligible.length; i += 450) {
    const batch = writeBatch(db);
    for (const r of eligible.slice(i, i + 450)) {
      const ref = doc(collection(db, LIVE_COLLECTIONS.crmLeads));
      batch.set(ref, {
        firstName: r.firstName,
        lastName: r.lastName,
        company: r.company ?? null,
        phoneE164: r.phoneE164 ?? null,
        email: r.email ?? null,
        country: r.country ?? null,
        tags: r.tags,
        status: 'new',
        source,
        consentBasis,
        notes: r.notes ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  }
  return eligible.length;
}

export async function updateLead(id: string, patch: Partial<Pick<CrmLead, 'status' | 'tags' | 'notes' | 'consentNote'>>): Promise<void> {
  await updateDoc(doc(db, LIVE_COLLECTIONS.crmLeads, id), { ...patch, updatedAt: serverTimestamp() });
}

export async function deleteLead(id: string): Promise<void> {
  await deleteDoc(doc(db, LIVE_COLLECTIONS.crmLeads, id));
}

export async function markExported(ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i += 450) {
    const batch = writeBatch(db);
    ids.slice(i, i + 450).forEach((id) =>
      batch.update(doc(db, LIVE_COLLECTIONS.crmLeads, id), { lastExportedAt: serverTimestamp() }));
    await batch.commit();
  }
}

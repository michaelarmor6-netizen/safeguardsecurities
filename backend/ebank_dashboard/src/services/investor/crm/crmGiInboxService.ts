// The GI Inbox: pending batches pushed by Guma Intelligence, awaiting the
// same human decision every other intake gets. Accepting writes crmLeads
// with the GI provenance preserved (source gi:{mission}, giLeadId intact -
// the join key that lets dispositions flow back to GI in phase 4, and the
// value Vicidial exports carry as vendor_lead_code).
import {
  collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where,
  writeBatch, type DocumentData,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { LIVE_COLLECTIONS } from '../../../config/liveCollections';
import { findExisting } from './crmLeadService';
import type { ConsentBasis } from './crmTypes';

export interface GiInboundLead {
  id: string;
  giLeadId: string;
  mission: string;
  segment: string;
  lead: {
    firstName: string; lastName: string; company?: string;
    phoneE164?: string; email?: string; country?: string;
    consentBasis: ConsentBasis; consentSource: string; tags: string[];
  };
  dossier: Record<string, unknown>;
  status: 'pending' | 'accepted' | 'declined';
  receivedAt?: Date;
  reviewedByEmail?: string;
  declineReason?: string;
}

function mapInbound(id: string, d: DocumentData): GiInboundLead {
  return {
    id,
    giLeadId: d.giLeadId ?? '',
    mission: d.mission ?? 'unspecified',
    segment: d.segment ?? 'investor-prospect',
    lead: {
      firstName: d.lead?.firstName ?? '',
      lastName: d.lead?.lastName ?? '',
      company: d.lead?.company ?? undefined,
      phoneE164: d.lead?.phoneE164 ?? undefined,
      email: d.lead?.email ?? undefined,
      country: d.lead?.country ?? undefined,
      consentBasis: (d.lead?.consentBasis ?? 'unknown') as ConsentBasis,
      consentSource: d.lead?.consentSource ?? '',
      tags: Array.isArray(d.lead?.tags) ? d.lead.tags : [],
    },
    dossier: d.dossier ?? {},
    status: d.status ?? 'pending',
    receivedAt: d.receivedAt?.toDate?.(),
    reviewedByEmail: d.reviewedByEmail,
    declineReason: d.declineReason,
  };
}

export async function listGiInbox(status: GiInboundLead['status'] = 'pending'): Promise<GiInboundLead[]> {
  const snap = await getDocs(query(
    collection(db, LIVE_COLLECTIONS.crmInbound),
    where('status', '==', status),
    orderBy('receivedAt', 'desc'),
  ));
  return snap.docs.map((d) => mapInbound(d.id, d.data()));
}

export interface GiAcceptResult { accepted: number; duplicates: number; }

// Accept pending GI leads into crmLeads. Store-level dedupe runs here (by
// phone and email against the whole store) - the webhook already handled
// batch idempotency and suppression at the door.
export async function acceptGiLeads(items: GiInboundLead[], reviewerEmail: string): Promise<GiAcceptResult> {
  const pending = items.filter((i) => i.status === 'pending');
  const existing = await findExisting(
    pending.map((i) => i.lead.phoneE164 ?? ''),
    pending.map((i) => i.lead.email ?? ''),
  );

  let accepted = 0, duplicates = 0;
  for (let i = 0; i < pending.length; i += 200) {   // 2 writes per item, cap 500/batch
    const batch = writeBatch(db);
    for (const item of pending.slice(i, i + 200)) {
      const isDup =
        (item.lead.phoneE164 && existing.has(item.lead.phoneE164)) ||
        (item.lead.email && existing.has(item.lead.email));
      const inboundRef = doc(db, LIVE_COLLECTIONS.crmInbound, item.id);
      if (isDup) {
        duplicates++;
        batch.update(inboundRef, {
          status: 'declined', declineReason: 'already in the CRM',
          reviewedByEmail: reviewerEmail, reviewedAt: serverTimestamp(),
        });
        continue;
      }
      const leadRef = doc(collection(db, LIVE_COLLECTIONS.crmLeads));
      batch.set(leadRef, {
        firstName: item.lead.firstName,
        lastName: item.lead.lastName,
        company: item.lead.company ?? null,
        phoneE164: item.lead.phoneE164 ?? null,
        email: item.lead.email ?? null,
        country: item.lead.country ?? null,
        tags: [...new Set([...item.lead.tags, item.segment])],
        status: 'new',
        source: { kind: 'gi', mission: item.mission },
        consentBasis: item.lead.consentBasis,
        consentNote: item.lead.consentSource,
        giLeadId: item.giLeadId,
        payload: item.dossier,          // becomes the screen-pop / context object
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.update(inboundRef, {
        status: 'accepted', reviewedByEmail: reviewerEmail, reviewedAt: serverTimestamp(),
      });
      accepted++;
    }
    await batch.commit();
  }
  return { accepted, duplicates };
}

export async function declineGiLeads(items: GiInboundLead[], reviewerEmail: string, reason: string): Promise<number> {
  const pending = items.filter((i) => i.status === 'pending');
  for (const item of pending) {
    await updateDoc(doc(db, LIVE_COLLECTIONS.crmInbound, item.id), {
      status: 'declined', declineReason: reason,
      reviewedByEmail: reviewerEmail, reviewedAt: serverTimestamp(),
    });
  }
  return pending.length;
}

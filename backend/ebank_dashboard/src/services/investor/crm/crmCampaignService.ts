// Campaign + enrollment store. The client creates and edits campaigns and
// enrolls leads; the ONLY thing that ever sends an email is the scheduled
// worker in functions-crm. The console cannot send - the same separation
// that keeps origination out of the dialer's web console.
import {
  collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp,
  setDoc, updateDoc, where, writeBatch, type DocumentData,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { LIVE_COLLECTIONS } from '../../../config/liveCollections';
import { buildTrack, trackLabel } from './crmFunnelTemplates';
import { findSuppressed } from './crmSuppressionService';
import { getInstrument } from './crmInstrumentService';
import type { CrmLead } from './crmTypes';
import {
  EMPTY_STATS,
  type CampaignStatus, type CampaignTrack, type CrmCampaign, type CrmEnrollment,
} from './crmCampaignTypes';
import type { FunnelStage } from './crmInstrumentTypes';

function mapCampaign(id: string, d: DocumentData): CrmCampaign {
  return {
    id,
    name: d.name ?? '',
    track: (d.instrumentSlug ?? d.track ?? 'gold') as CampaignTrack,
    instrumentSlug: d.instrumentSlug ?? d.track ?? 'gold',
    status: (d.status ?? 'draft') as CampaignStatus,
    steps: Array.isArray(d.steps) ? d.steps : [],
    settings: d.settings ?? {
      fromName: 'SafeGuard Securities', appointmentUrl: '', demoUrl: '',
      companyName: 'SafeGuard Securities', companyAddress: '',
    },
    stats: { ...EMPTY_STATS, ...(d.stats ?? {}) },
    createdBy: d.createdBy,
    createdAt: d.createdAt?.toDate?.(),
    updatedAt: d.updatedAt?.toDate?.(),
  };
}

function mapEnrollment(id: string, d: DocumentData): CrmEnrollment {
  return {
    id,
    campaignId: d.campaignId ?? '',
    leadId: d.leadId ?? '',
    email: d.email ?? '',
    firstName: d.firstName ?? '',
    step: d.step ?? 0,
    nextSendAt: d.nextSendAt?.toDate?.() ?? new Date(0),
    status: d.status ?? 'active',
    lastError: d.lastError,
    enrolledAt: d.enrolledAt?.toDate?.(),
    lastSentAt: d.lastSentAt?.toDate?.(),
    funnelStage: d.funnelStage,
  };
}

export async function listCampaigns(): Promise<CrmCampaign[]> {
  const snap = await getDocs(query(collection(db, LIVE_COLLECTIONS.crmCampaigns), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => mapCampaign(d.id, d.data()));
}

export async function getCampaign(id: string): Promise<CrmCampaign | null> {
  const snap = await getDoc(doc(db, LIVE_COLLECTIONS.crmCampaigns, id));
  return snap.exists() ? mapCampaign(snap.id, snap.data()) : null;
}

export async function createCampaignFromTrack(
  track: CampaignTrack,
  createdBy: string,
  settings: CrmCampaign['settings'],
): Promise<string> {
  return createCampaignFromInstrument(track, createdBy, settings);
}

export async function createCampaignFromInstrument(
  slug: string,
  createdBy: string,
  settings?: Partial<CrmCampaign['settings']>,
): Promise<string> {
  const instrument = await getInstrument(slug);
  const steps = instrument?.defaultSteps?.length ? instrument.defaultSteps : buildTrack(slug);
  const name = instrument?.name ?? trackLabel(slug);
  const merged: CrmCampaign['settings'] = {
    fromName: 'SafeGuard Securities',
    appointmentUrl: instrument?.defaultAppointmentUrl ?? 'https://safeguardsecurities.us/appointments',
    demoUrl: instrument?.defaultDemoUrl ?? 'https://global.safeguardsecurities.us/signup?demo=1',
    companyName: 'SafeGuard Securities',
    companyAddress: '',
    ...settings,
  };
  const ref = doc(collection(db, LIVE_COLLECTIONS.crmCampaigns));
  await setDoc(ref, {
    name: `${name} — ${new Date().toLocaleDateString()}`,
    track: slug,
    instrumentSlug: slug,
    status: 'draft',
    steps,
    settings: merged,
    stats: EMPTY_STATS,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCampaign(
  id: string,
  patch: Partial<Pick<CrmCampaign, 'name' | 'status' | 'steps' | 'settings'>>,
): Promise<void> {
  await updateDoc(doc(db, LIVE_COLLECTIONS.crmCampaigns, id), { ...patch, updatedAt: serverTimestamp() });
}

export interface EnrollResult { enrolled: number; skippedNoEmail: number; skippedSuppressed: number; alreadyEnrolled: number; }

// Enroll leads into a campaign. Suppression is checked HERE and again by the
// worker at send time - both ends, like DNC in the dialer. Enrollment ids are
// `${campaignId}_${leadId}` so re-enrolling the same lead is a no-op, not a
// duplicate email stream.
export async function enrollLeads(campaign: CrmCampaign, leads: CrmLead[]): Promise<EnrollResult> {
  const result: EnrollResult = { enrolled: 0, skippedNoEmail: 0, skippedSuppressed: 0, alreadyEnrolled: 0 };
  const withEmail = leads.filter((l) => {
    if (!l.email) result.skippedNoEmail++;
    return !!l.email;
  });
  const suppressed = await findSuppressed(withEmail.map((l) => l.email!));

  // read existing enrollment ids in chunks (documentId 'in' also caps at 30,
  // so just getDoc them in parallel batches - counts here are hundreds, not GI-scale)
  const candidates = withEmail.filter((l) => {
    if (suppressed.has(l.email!)) { result.skippedSuppressed++; return false; }
    return true;
  });
  const existing = await Promise.all(candidates.map((l) =>
    getDoc(doc(db, LIVE_COLLECTIONS.crmEnrollments, `${campaign.id}_${l.id}`))));

  const batchable = candidates.filter((_, i) => {
    if (existing[i].exists()) { result.alreadyEnrolled++; return false; }
    return true;
  });

  for (let i = 0; i < batchable.length; i += 450) {
    const batch = writeBatch(db);
    for (const lead of batchable.slice(i, i + 450)) {
      batch.set(doc(db, LIVE_COLLECTIONS.crmEnrollments, `${campaign.id}_${lead.id}`), {
        campaignId: campaign.id,
        leadId: lead.id,
        email: lead.email,
        firstName: lead.firstName || 'there',
        step: 0,
        nextSendAt: new Date(),      // step 0 goes out on the worker's next tick
        status: 'active',
        funnelStage: 'sequenced' as FunnelStage,
        enrolledAt: serverTimestamp(),
      });
    }
    await batch.commit();
    result.enrolled += Math.min(450, batchable.length - i);
  }

  if (result.enrolled > 0) {
    await updateDoc(doc(db, LIVE_COLLECTIONS.crmCampaigns, campaign.id), {
      'stats.enrolled': (campaign.stats.enrolled ?? 0) + result.enrolled,
      updatedAt: serverTimestamp(),
    });
  }
  return result;
}

export async function setEnrollmentStage(enrollmentId: string, funnelStage: FunnelStage): Promise<void> {
  const patch: Record<string, unknown> = { funnelStage };
  if (funnelStage === 'converted') patch.status = 'completed';
  if (funnelStage === 'exited') patch.status = 'unsubscribed';
  await updateDoc(doc(db, LIVE_COLLECTIONS.crmEnrollments, enrollmentId), patch);
}

export async function listEnrollments(campaignId: string): Promise<CrmEnrollment[]> {
  const snap = await getDocs(query(
    collection(db, LIVE_COLLECTIONS.crmEnrollments),
    where('campaignId', '==', campaignId),
  ));
  return snap.docs.map((d) => mapEnrollment(d.id, d.data()));
}

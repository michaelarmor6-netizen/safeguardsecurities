// CRM funnel worker - the ONLY thing in the platform that sends campaign
// email. Three functions:
//
//   processCampaignQueue  scheduled: drains due enrollments at a bounded
//                         pace, sends via Resend, advances each lead's step
//   unsubscribe           HTTPS GET: tokenised one-click opt-out
//   resendWebhook         HTTPS POST: delivery/bounce/complaint/open/click
//                         events -> stats + automatic suppression
//
// Design rules carried over from the rest of the platform:
//   * Suppression is checked at enrollment AND at send time (both ends).
//   * Hard bounces and complaints auto-suppress - not optional; it is what
//     keeps the domain the funding emails also depend on sendable.
//   * The pace is a knob (CRM_SEND_BATCH per 5-min run), not a loop.
//   * Send marks the enrollment BEFORE calling Resend - a crash between the
//     two costs us one unsent email, never a double-send. (Money-adjacent
//     systems choose their failure mode; this one chooses under-delivery.)
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { onRequest, type Request } from 'firebase-functions/v2/https';
import type { Response } from 'express';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineInt, defineSecret, defineString } from 'firebase-functions/params';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import {
  GI_MAX_BATCH, giVerify, validateGiLead, type GiLeadIn,
} from './giValidation';
import { renderCampaignLanding } from './landingHtml';

initializeApp();
const db = () => getFirestore();

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
// Shared secret with the Guma Intelligence push. Any long random string, the
// same value configured on the GI side:
//   firebase functions:secrets:set GI_WEBHOOK_SECRET
const GI_WEBHOOK_SECRET = defineSecret('GI_WEBHOOK_SECRET');
// HMAC key for unsubscribe tokens and the webhook path key. Any long random
// string:  firebase functions:secrets:set CRM_LINK_SECRET
const CRM_LINK_SECRET = defineSecret('CRM_LINK_SECRET');
const MAIL_FROM = defineString('CRM_MAIL_FROM', { default: 'SafeGuard Securities <no-reply@safeguardsecurities.us>' });
const PUBLIC_BASE = defineString('CRM_PUBLIC_BASE', { default: 'https://us-central1-e-bank-dashboard.cloudfunctions.net' });
const SEND_BATCH = defineInt('CRM_SEND_BATCH', { default: 40 }); // per 5-min run => pace knob

// ---------------------------------------------------------------- merge ---
// Hand-copied twin of src/services/investor/crm/crmMerge.ts. CHANGE BOTH.
function renderMerge(template: string, ctx: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => ctx[key] ?? '');
}
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|tr|h1|h2|h3|li|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&sect;/g, 'S')
    .replace(/&middot;|&#183;|·/g, '-').replace(/&mdash;|—/g, '-')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------------------------------------------------------------- tokens --
function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex').slice(0, 32);
}
function unsubscribeToken(enrollmentId: string, secret: string): string {
  return `${enrollmentId}.${sign(`unsub:${enrollmentId}`, secret)}`;
}
function verifyUnsubscribeToken(token: string, secret: string): string | null {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const id = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = sign(`unsub:${id}`, secret);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return id;
}

async function suppressEmail(email: string, reason: string, source: string): Promise<void> {
  const existing = await db().collection('crmSuppression')
    .where('value', '==', email).limit(1).get();
  if (existing.empty) {
    await db().collection('crmSuppression').add({
      type: 'email', value: email, reason, source, addedAt: FieldValue.serverTimestamp(),
    });
  }
}

// ---------------------------------------------------------------- worker --
export const processCampaignQueue = onSchedule(
  { schedule: 'every 5 minutes', secrets: [RESEND_API_KEY, CRM_LINK_SECRET], timeoutSeconds: 300 },
  async () => {
    const apiKey = RESEND_API_KEY.value();
    if (!apiKey) {
      console.log('RESEND_API_KEY empty - campaigns are parked, nothing sends.');
      return;
    }
    const linkSecret = CRM_LINK_SECRET.value();
    const now = Timestamp.now();

    const due = await db().collection('crmEnrollments')
      .where('status', '==', 'active')
      .where('nextSendAt', '<=', now)
      .limit(SEND_BATCH.value())
      .get();
    if (due.empty) return;

    // Cache campaigns per run; skip anything not active.
    const campaigns = new Map<string, FirebaseFirestore.DocumentData | null>();
    const getCampaign = async (id: string) => {
      if (!campaigns.has(id)) {
        const snap = await db().collection('crmCampaigns').doc(id).get();
        campaigns.set(id, snap.exists ? snap.data()! : null);
      }
      return campaigns.get(id) ?? null;
    };

    let sent = 0;
    for (const docSnap of due.docs) {
      const e = docSnap.data();
      try {
        const campaign = await getCampaign(e.campaignId);
        if (!campaign || campaign.status !== 'active') continue; // paused: leave queued as-is

        const steps: { subject: string; html: string; dayOffset: number }[] = campaign.steps ?? [];
        const step = steps[e.step];
        if (!step) {
          await docSnap.ref.update({ status: 'completed' });
          continue;
        }

        // Send-time suppression check - the second end of the both-ends rule.
        const sup = await db().collection('crmSuppression')
          .where('value', '==', e.email).limit(1).get();
        if (!sup.empty) {
          await docSnap.ref.update({ status: 'suppressed' });
          continue;
        }

        const unsubUrl = `${PUBLIC_BASE.value()}/unsubscribe?t=${unsubscribeToken(docSnap.id, linkSecret)}`;
        const exit = (kind: 'appointment' | 'demo') =>
          `${PUBLIC_BASE.value()}/funnelExit?kind=${kind}&eid=${encodeURIComponent(docSnap.id)}&t=${sign(`exit:${kind}:${docSnap.id}`, linkSecret)}`;
        const ctx = {
          firstName: e.firstName || 'there',
          appointmentUrl: exit('appointment'),
          demoUrl: exit('demo'),
          companyName: campaign.settings?.companyName ?? 'SafeGuard Securities',
          companyAddress: campaign.settings?.companyAddress ?? '',
          unsubscribeUrl: unsubUrl,
        };
        const html = renderMerge(step.html, ctx);
        const subject = renderMerge(step.subject, ctx);

        // Advance the cursor BEFORE the API call: crash-safe toward
        // under-delivery, never double-send.
        const isLast = e.step + 1 >= steps.length;
        const nextOffsetDays = isLast ? 0 : (steps[e.step + 1].dayOffset || 1);
        await docSnap.ref.update({
          step: e.step + 1,
          status: isLast ? 'completed' : 'active',
          nextSendAt: Timestamp.fromMillis(Date.now() + nextOffsetDays * 86_400_000),
          lastSentAt: FieldValue.serverTimestamp(),
          lastError: FieldValue.delete(),
        });

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: MAIL_FROM.value(),
            to: [e.email],
            subject,
            html,
            text: htmlToText(html),
            headers: {
              'List-Unsubscribe': `<${unsubUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
            tags: [
              { name: 'campaign', value: String(e.campaignId) },
              { name: 'enrollment', value: docSnap.id },
            ],
          }),
        });
        if (!res.ok) {
          const body = await res.text();
          await docSnap.ref.update({ lastError: `resend ${res.status}: ${body.slice(0, 200)}` });
          console.error(`send failed for ${docSnap.id}: ${res.status} ${body.slice(0, 200)}`);
          continue;
        }
        sent++;
        await db().collection('crmCampaigns').doc(e.campaignId)
          .update({ 'stats.sent': FieldValue.increment(1) });
        await db().collection('crmEmailEvents').add({
          enrollmentId: docSnap.id, campaignId: e.campaignId, leadId: e.leadId,
          type: 'sent', step: e.step, at: FieldValue.serverTimestamp(),
        });
      } catch (err) {
        console.error(`enrollment ${docSnap.id} failed:`, err);
        await docSnap.ref.update({ lastError: String(err).slice(0, 300) }).catch(() => undefined);
      }
    }
    console.log(`campaign queue: ${sent}/${due.size} sent`);
  },
);

// ----------------------------------------------------------- unsubscribe --
export const unsubscribe = onRequest({ secrets: [CRM_LINK_SECRET] }, async (req: Request, res: Response) => {
  const token = String(req.query.t ?? '');
  const id = token ? verifyUnsubscribeToken(token, CRM_LINK_SECRET.value()) : null;
  if (!id) {
    res.status(400).send('Invalid unsubscribe link.');
    return;
  }
  const snap = await db().collection('crmEnrollments').doc(id).get();
  if (snap.exists) {
    const e = snap.data()!;
    await snap.ref.update({ status: 'unsubscribed' });
    await suppressEmail(e.email, 'unsubscribe', 'unsubscribe-link');
    await db().collection('crmCampaigns').doc(e.campaignId)
      .update({ 'stats.unsubscribed': FieldValue.increment(1) }).catch(() => undefined);
    // Also stop every OTHER active sequence for this address - an opt-out
    // is from the sender, not from one campaign.
    const others = await db().collection('crmEnrollments')
      .where('email', '==', e.email).where('status', '==', 'active').get();
    await Promise.all(others.docs.map((d) => d.ref.update({ status: 'unsubscribed' })));
  }
  res.status(200).send(
    '<html><body style="font-family:sans-serif;text-align:center;padding:60px 20px;">' +
    '<h2>You are unsubscribed.</h2><p>No further emails from this list will be sent to you.</p>' +
    '</body></html>');
});

// -------------------------------------------------------------- webhook ---
// Configure in Resend: POST {PUBLIC_BASE}/resendWebhook?k={sign('webhook', CRM_LINK_SECRET)}
// The key-in-URL is the auth (webhook URLs are secrets by nature); events
// carry our enrollment id in tags.
export const resendWebhook = onRequest({ secrets: [CRM_LINK_SECRET] }, async (req: Request, res: Response) => {
  const expected = sign('webhook', CRM_LINK_SECRET.value());
  const provided = String(req.query.k ?? '');
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(401).send('bad key');
    return;
  }

  const event = req.body as {
    type?: string;
    data?: { to?: string[]; tags?: { name: string; value: string }[] | Record<string, string> };
  };
  const type = event?.type ?? '';
  const tagsRaw = event?.data?.tags;
  const tags: Record<string, string> = Array.isArray(tagsRaw)
    ? Object.fromEntries(tagsRaw.map((t) => [t.name, t.value]))
    : (tagsRaw ?? {});
  const enrollmentId = tags['enrollment'];
  const campaignId = tags['campaign'];
  const email = event?.data?.to?.[0];

  const statMap: Record<string, string> = {
    'email.delivered': 'delivered',
    'email.opened': 'opened',
    'email.clicked': 'clicked',
    'email.bounced': 'bounced',
    'email.complained': 'complained',
  };
  const stat = statMap[type];
  if (stat && campaignId) {
    await db().collection('crmCampaigns').doc(campaignId)
      .update({ [`stats.${stat}`]: FieldValue.increment(1) }).catch(() => undefined);
  }
  if (enrollmentId) {
    await db().collection('crmEmailEvents').add({
      enrollmentId, campaignId: campaignId ?? null, type: stat ?? type,
      at: FieldValue.serverTimestamp(),
    });
    if (type === 'email.opened' || type === 'email.clicked') {
      await advanceFunnel(enrollmentId, 'engaged');
    }
  }

  // The non-negotiable: bounces and complaints suppress, automatically.
  if ((type === 'email.bounced' || type === 'email.complained') && email) {
    await suppressEmail(email, type === 'email.bounced' ? 'bounce' : 'complaint', 'resend-webhook');
    const active = await db().collection('crmEnrollments')
      .where('email', '==', email).where('status', '==', 'active').get();
    await Promise.all(active.docs.map((d) => d.ref.update({ status: 'suppressed' })));
  }

  res.status(200).json({ ok: true });
});

// ------------------------------------------------------------ GI intake ---
// POST /giLeadsWebhook - Guma Intelligence pushes curated investor-prospect
// dossiers here. Everything lands in crmInbound as PENDING; a person accepts
// or declines from the GI Inbox tab. Third intake door, same human-led gate.
//
// Idempotent by construction: the inbound doc id is a hash of giLeadId, so
// GI can retry a whole batch and every already-received row answers
// 'duplicate' instead of duplicating. Per-row results go back in the
// response so GI's side reconciles instead of guessing.
export const giLeadsWebhook = onRequest({ secrets: [GI_WEBHOOK_SECRET] }, async (req: Request, res: Response) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const secret = GI_WEBHOOK_SECRET.value();
  if (!secret) { res.status(503).json({ error: 'GI intake not configured' }); return; }

  // Kill switch: crmSources/gi with active=false refuses the whole batch
  // without touching the secret. Absent doc = active (created on first use).
  const sourceRef = db().collection('crmSources').doc('gi');
  const sourceSnap = await sourceRef.get();
  if (sourceSnap.exists && sourceSnap.data()?.active === false) {
    res.status(403).json({ error: 'source disabled' });
    return;
  }

  const verdict = giVerify(
    String(req.get('X-GI-Timestamp') ?? ''),
    req.rawBody ?? Buffer.from(''),
    String(req.get('X-GI-Signature') ?? ''),
    secret,
    Date.now(),
  );
  if (!verdict.ok) { res.status(401).json({ error: verdict.reason }); return; }

  const body = req.body as { leads?: GiLeadIn[] } | undefined;
  const leads = Array.isArray(body?.leads) ? body!.leads! : null;
  if (!leads || leads.length === 0) { res.status(400).json({ error: 'leads[] required' }); return; }
  if (leads.length > GI_MAX_BATCH) {
    res.status(400).json({ error: `max ${GI_MAX_BATCH} leads per batch` });
    return;
  }

  const results: { giLeadId: string; status: string; reason?: string }[] = [];
  for (const raw of leads) {
    const giLeadId = String(raw?.giLeadId ?? '');
    const v = validateGiLead(raw ?? {});
    if (!v.ok) { results.push({ giLeadId, status: 'rejected', reason: v.reason }); continue; }
    const lead = v.lead;

    try {
      // Suppression outranks everything - a suppressed contact is reported
      // back so GI stops resending it, and it never even reaches the inbox.
      const supValues = [lead.email, lead.phoneE164].filter(Boolean) as string[];
      if (supValues.length) {
        const sup = await db().collection('crmSuppression')
          .where('value', 'in', supValues).limit(1).get();
        if (!sup.empty) { results.push({ giLeadId, status: 'suppressed' }); continue; }
      }

      const inboundId = createHash('sha256').update(`gi:${lead.giLeadId}`).digest('hex').slice(0, 40);
      const inboundRef = db().collection('crmInbound').doc(inboundId);
      const existing = await inboundRef.get();
      if (existing.exists) { results.push({ giLeadId, status: 'duplicate' }); continue; }

      await inboundRef.set({
        giLeadId: lead.giLeadId,
        mission: lead.mission,
        segment: lead.segment,
        lead: {
          firstName: lead.firstName, lastName: lead.lastName,
          company: lead.company ?? null, phoneE164: lead.phoneE164 ?? null,
          email: lead.email ?? null, country: lead.country ?? null,
          consentBasis: lead.consentBasis, consentSource: lead.consentSource,
          tags: lead.tags,
        },
        dossier: lead.dossier,
        status: 'pending',
        receivedAt: FieldValue.serverTimestamp(),
      });
      results.push({ giLeadId, status: 'accepted' });
    } catch (err) {
      console.error(`gi lead ${giLeadId} failed:`, err);
      results.push({ giLeadId, status: 'rejected', reason: 'internal error' });
    }
  }

  await sourceRef.set({
    name: 'Guma Intelligence', active: true,
    lastSeenAt: FieldValue.serverTimestamp(),
    lastBatch: { size: leads.length, at: FieldValue.serverTimestamp() },
  }, { merge: true });

  const counts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1; return acc;
  }, {});
  console.log(`gi batch: ${JSON.stringify(counts)}`);
  res.status(200).json({ results, counts });
});

// ----------------------------------------------------------- lead capture --
// POST /leadCapture - the campaign landing pages submit here. This is the
// ONE public write path into the CRM, and it is narrow on purpose:
//   * self-submitted = explicit consent (the form's checkbox is required),
//     so the lead goes straight to crmLeads as consentBasis 'inquiry' -
//     the person themselves is the human in this loop;
//   * with consent given, the lead is auto-enrolled into the active campaign
//     for their track, so the first funnel email goes out on the worker's
//     next tick - that is what makes the landing page KICKSTART the funnel
//     instead of just collecting addresses;
//   * bot resistance: honeypot field, minimum dwell time, payload caps, and
//     suppression respected even here (an unsubscribed address that
//     re-submits is re-consented and un-suppressed - a fresh form fill IS
//     fresh consent, and refusing it would be wrong the other way).
export const leadCapture = onRequest({ cors: true }, async (req: Request, res: Response) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const b = (req.body ?? {}) as Record<string, unknown>;
  const name = String(b.name ?? '').trim().slice(0, 120);
  const email = String(b.email ?? '').trim().toLowerCase().slice(0, 160);
  const phone = String(b.phone ?? '').trim().slice(0, 24);
  const track = String(b.track ?? '').trim();
  const honeypot = String(b.website ?? '');
  const dwellMs = Number(b.dwellMs ?? 0);
  const page = String(b.page ?? '').slice(0, 300);

  // Bots fill hidden fields and submit instantly; humans do neither.
  // Answer 200 so the bot learns nothing.
  if (honeypot || (Number.isFinite(dwellMs) && dwellMs > 0 && dwellMs < 2500)) {
    res.status(200).json({ ok: true });
    return;
  }

  if (!name) { res.status(400).json({ error: 'Please tell us your name.' }); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    res.status(400).json({ error: 'That email address does not look right.' });
    return;
  }
  try {
    const instrument = await db().collection('crmInstruments').doc(track).get();
    const legacy = track === 'gold' || track === 'preipo' || track === 'gold-options';
    if (!legacy && (!instrument.exists || instrument.data()?.status === 'archived')) {
      res.status(400).json({ error: 'Unknown campaign track.' });
      return;
    }

    const nameParts = name.split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ');

    // A fresh form submission is fresh, explicit consent: clear any old
    // email suppression for this address and let the sequence restart.
    const sup = await db().collection('crmSuppression')
      .where('value', '==', email).limit(20).get();
    await Promise.all(
      sup.docs.filter((d) => d.data()?.type === 'email').map((d) => d.ref.delete()),
    );

    // One lead per email from this path - resubmits update, never duplicate.
    const existing = await db().collection('crmLeads')
      .where('email', '==', email).limit(1).get();
    let leadRef;
    if (existing.empty) {
      leadRef = db().collection('crmLeads').doc();
      await leadRef.set({
        firstName, lastName, company: null,
        phoneE164: /^\+[1-9][0-9]{6,14}$/.test(phone) ? phone : null,
        email, country: null,
        tags: [`${track}-landing`],
        status: 'new',
        source: { kind: 'manual', file: `landing:${track}`, page },
        consentBasis: 'inquiry',
        consentNote: `self-submitted on landing page (${page || track})`,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      leadRef = existing.docs[0].ref;
      await leadRef.update({
        consentBasis: 'inquiry',
        consentNote: `re-consented via landing page (${page || track})`,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Auto-enroll into the newest ACTIVE campaign for this track. If none is
    // active the lead is still captured - the admin sees it on the Leads
    // page and can enroll by hand; the form never fails over campaign state.
    // Single-field query only so a missing composite index cannot 500 the form.
    let enrolled = false;
    try {
      const campaigns = await db().collection('crmCampaigns')
        .where('track', '==', track).limit(40).get();
      const campaign = campaigns.docs
        .filter((d) => d.data()?.status === 'active')
        .sort((a, b) => {
          const ta = a.data()?.createdAt?.toMillis?.() ?? 0;
          const tb = b.data()?.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        })[0];
      if (campaign) {
        const enrollRef = db().collection('crmEnrollments').doc(`${campaign.id}_${leadRef.id}`);
        const already = await enrollRef.get();
        if (!already.exists) {
          await enrollRef.set({
            campaignId: campaign.id, leadId: leadRef.id, email,
            firstName: firstName || 'there',
            step: 0, nextSendAt: Timestamp.now(), status: 'active',
            funnelStage: 'sequenced',
            enrolledAt: FieldValue.serverTimestamp(),
          });
          await campaign.ref.update({ 'stats.enrolled': FieldValue.increment(1) });
          enrolled = true;
        }
      }
    } catch (enrollErr) {
      console.error('leadCapture enroll skipped:', enrollErr);
    }

    console.log(`leadCapture: ${track} lead ${leadRef.id} (${existing.empty ? 'new' : 'returning'}, enrolled=${enrolled})`);
    res.status(200).json({ ok: true, enrolled });
  } catch (err) {
    console.error('leadCapture failed:', err);
    res.status(500).json({ error: 'Something went wrong on our side — please try again.' });
  }
});

const STAGE_RANK: Record<string, number> = {
  captured: 1, sequenced: 2, engaged: 3, appointment: 4, demo: 4, converted: 5, exited: 6,
};

async function advanceFunnel(enrollmentId: string, next: string): Promise<void> {
  const ref = db().collection('crmEnrollments').doc(enrollmentId);
  const snap = await ref.get();
  if (!snap.exists) return;
  const current = String(snap.data()?.funnelStage ?? 'captured');
  if (current === 'exited' || current === 'converted') return;
  if (current === 'appointment' && next === 'demo') {
    await ref.update({ funnelStage: 'demo' });
    return;
  }
  if (current === 'demo' && next === 'appointment') {
    await ref.update({ funnelStage: 'appointment' });
    return;
  }
  if ((STAGE_RANK[next] ?? 0) >= (STAGE_RANK[current] ?? 0)) {
    await ref.update({ funnelStage: next });
  }
}

export const funnelExit = onRequest({ secrets: [CRM_LINK_SECRET], cors: true }, async (req: Request, res: Response) => {
  const kind = String(req.query.kind ?? '');
  const eid = String(req.query.eid ?? '');
  const token = String(req.query.t ?? '');
  if (kind !== 'appointment' && kind !== 'demo') {
    res.status(400).send('Unknown exit.');
    return;
  }
  const expected = sign(`exit:${kind}:${eid}`, CRM_LINK_SECRET.value());
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (!eid || a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(400).send('Invalid funnel link.');
    return;
  }
  const enroll = await db().collection('crmEnrollments').doc(eid).get();
  if (enroll.exists) {
    await advanceFunnel(eid, kind);
  }
  const campaignId = enroll.data()?.campaignId;
  let dest = kind === 'appointment'
    ? 'https://safeguardsecurities.us/appointments'
    : 'https://global.safeguardsecurities.us/signup?demo=1';
  if (campaignId) {
    const c = await db().collection('crmCampaigns').doc(campaignId).get();
    const settings = c.data()?.settings ?? {};
    dest = kind === 'appointment'
      ? (settings.appointmentUrl || dest)
      : (settings.demoUrl || dest);
  }
  res.redirect(302, dest);
});

export const campaignLanding = onRequest({ cors: true }, async (req: Request, res: Response) => {
  const slug = String(req.query.slug ?? '').trim();
  if (!slug) {
    res.status(400).send('Missing instrument slug.');
    return;
  }
  const inst = await db().collection('crmInstruments').doc(slug).get();
  if (!inst.exists || inst.data()?.status === 'archived') {
    res.status(404).send('This campaign page is not available.');
    return;
  }
  const d = inst.data()!;
  const html = renderCampaignLanding({
    slug,
    name: String(d.name ?? slug),
    landing: d.landing ?? { tag: '', headline: slug, subhead: '', bullets: [], quote: '', formTitle: 'Register', formBody: '', submitLabel: 'Continue', consentLabel: 'Email me this series.' },
    riskDisclosure: String(d.riskDisclosure ?? ''),
    captureUrl: `${PUBLIC_BASE.value()}/leadCapture`,
  });
  res.set('Cache-Control', 'public, max-age=60');
  res.status(200).send(html);
});

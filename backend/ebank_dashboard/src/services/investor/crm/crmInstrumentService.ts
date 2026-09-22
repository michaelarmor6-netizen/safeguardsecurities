import {
  collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { LIVE_COLLECTIONS } from '../../../config/liveCollections';
import { buildTrack } from './crmFunnelTemplates';
import type {
  CrmInstrument, InstrumentAssetClass, InstrumentLanding, InstrumentStatus,
} from './crmInstrumentTypes';
import type { CampaignStep } from './crmCampaignTypes';

const DEFAULT_APPT = 'https://safeguardsecurities.us/appointments';
const DEFAULT_DEMO = 'https://global.safeguardsecurities.us/signup?demo=1';

const GOLD_OPTIONS_DISCLOSURE =
  'Options and futures involve substantial risk of loss and are not suitable for every investor. A long option can expire worthless; you can lose the entire premium. Margined futures or short-option positions can cost more than the amount you first commit. Nothing in this funnel is a recommendation, a forecast, or a promise of income or performance. Demo results are simulated and do not predict live outcomes.';

const GOLD_DISCLOSURE =
  'Investing involves risk, including the possible loss of the amount you commit. Nothing here is a recommendation or a guarantee of performance. Demo accounts use simulated funds and simulated results.';

const PREIPO_DISCLOSURE =
  'Pre-IPO positions are high-risk and illiquid. Capital can be committed for years, and some companies never list. Eligibility is assessed case by case. This is not a recommendation or a forecast of listing or return.';

function landingGoldOptions(): InstrumentLanding {
  return {
    tag: 'FUTURES · GOLD OPTIONS',
    headline: 'Gold options on futures, without the slogan.',
    subhead: 'A defined-expiry right to gold-futures exposure. You know the premium and the date the right ends — before you commit.',
    bullets: [
      {
        title: 'Defined premium, known expiry',
        body: 'A long gold option’s maximum cost is the premium. Expiry is on the ticket. That is the product — not “upside.”',
      },
      {
        title: 'An analyst that never sleeps',
        body: 'The AI engine reads the metal around the clock. Your account manager reviews the note with you. The machine does not place the trade.',
      },
      {
        title: 'Desk-managed from day one',
        body: 'Standard accounts are executed by professionals. You keep visibility and the final say. Options are not sized like a savings product.',
      },
    ],
    quote: 'AI-powered, human-led: the engine maps the market, the desk walks the strike and expiry, and nothing happens without your say-so.',
    formTitle: 'See the ticket before you fund it',
    formBody: 'Register for the Gold Options series and a free demo — the same dashboards and AI panel, with simulated funds. Or book a consultation first.',
    submitLabel: 'Send me the series',
    consentLabel: 'Email me the Gold Options series and platform updates. I can unsubscribe any time. My details stay with SafeGuard Securities.',
  };
}

function landingGold(): InstrumentLanding {
  return {
    tag: 'GOLD INVESTMENTS',
    headline: 'Gold in the book — without the mythology.',
    subhead: 'A measured gold sleeve, structured as a ticket you can read: known cost, a desk on every decision, and an AI engine that reads the metal around the clock.',
    bullets: [
      { title: 'Diversification, not decoration', body: 'Gold is there to behave differently from equities. Sizing is about the rest of your book — not a headline.' },
      { title: 'Physical, funds, or instruments', body: 'Each route has a cost. Most of our gold clients use defined-risk, gold-linked tickets on the desk.' },
      { title: 'AI-assisted, desk-led', body: 'The engine writes the note. Your manager reviews it with you. The machine does not place the trade.' },
    ],
    quote: 'AI-powered, human-led: the engine surfaces the map, your desk manager walks the ticket, and nothing happens without your say-so.',
    formTitle: 'See it before you fund it',
    formBody: 'Four short emails on how experienced investors approach gold — then a demo on live data with simulated funds.',
    submitLabel: 'Send me the series',
    consentLabel: 'Email me the Gold Investments series and platform updates. I can unsubscribe any time.',
  };
}

function landingPreipo(): InstrumentLanding {
  return {
    tag: 'PRE-IPO ACCESS',
    headline: 'Before the bell rings.',
    subhead: 'Structured pre-IPO access for investors who can commit a measured, illiquid slice of their book. High risk. Eligibility first.',
    bullets: [
      { title: 'Honest about illiquidity', body: 'Capital can sit for years. Some companies never list. We say that in the first conversation.' },
      { title: 'One counterparty, one dashboard', body: 'Sourcing, paperwork, and administration through SafeGuard — with a manager on every term.' },
      { title: 'AI first read, human judgment', body: 'The engine filters. The desk decides what is worth your time. You decide everything after that.' },
    ],
    quote: 'Eligibility is assessed case by case — jurisdiction, investor profile, and the offering. The consultation is where that starts.',
    formTitle: 'Register your interest',
    formBody: 'Join the pre-IPO series. We will only contact you about access that fits a measured allocation.',
    submitLabel: 'Register interest',
    consentLabel: 'Email me the Pre-IPO series. I can unsubscribe any time. My details stay with SafeGuard Securities.',
  };
}

export const BUILTIN_INSTRUMENTS: Omit<CrmInstrument, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'gold-options',
    slug: 'gold-options',
    name: 'Futures — Gold Options',
    assetClass: 'futures',
    status: 'active',
    landing: landingGoldOptions(),
    riskDisclosure: GOLD_OPTIONS_DISCLOSURE,
    defaultAppointmentUrl: DEFAULT_APPT,
    defaultDemoUrl: DEFAULT_DEMO,
    defaultSteps: buildTrack('gold-options'),
  },
  {
    id: 'gold',
    slug: 'gold',
    name: 'Gold Investments',
    assetClass: 'other',
    status: 'active',
    landing: landingGold(),
    riskDisclosure: GOLD_DISCLOSURE,
    defaultAppointmentUrl: DEFAULT_APPT,
    defaultDemoUrl: DEFAULT_DEMO,
    defaultSteps: buildTrack('gold'),
  },
  {
    id: 'preipo',
    slug: 'preipo',
    name: 'Pre-IPO Access',
    assetClass: 'preipo',
    status: 'active',
    landing: landingPreipo(),
    riskDisclosure: PREIPO_DISCLOSURE,
    defaultAppointmentUrl: DEFAULT_APPT,
    defaultDemoUrl: DEFAULT_DEMO,
    defaultSteps: buildTrack('preipo'),
  },
];

function mapInstrument(id: string, d: DocumentData): CrmInstrument {
  const slug = String(d.slug ?? id);
  return {
    id,
    slug,
    name: d.name ?? slug,
    assetClass: (d.assetClass ?? 'other') as InstrumentAssetClass,
    status: (d.status ?? 'active') as InstrumentStatus,
    landing: d.landing ?? landingGold(),
    riskDisclosure: String(d.riskDisclosure ?? GOLD_DISCLOSURE),
    defaultAppointmentUrl: d.defaultAppointmentUrl ?? DEFAULT_APPT,
    defaultDemoUrl: d.defaultDemoUrl ?? DEFAULT_DEMO,
    defaultSteps: Array.isArray(d.defaultSteps) ? d.defaultSteps as CampaignStep[] : buildTrack(slug),
    createdAt: d.createdAt?.toDate?.(),
    updatedAt: d.updatedAt?.toDate?.(),
  };
}

export async function listInstruments(): Promise<CrmInstrument[]> {
  const snap = await getDocs(collection(db, LIVE_COLLECTIONS.crmInstruments));
  return snap.docs.map((d) => mapInstrument(d.id, d.data()))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getInstrument(slug: string): Promise<CrmInstrument | null> {
  const snap = await getDoc(doc(db, LIVE_COLLECTIONS.crmInstruments, slug));
  return snap.exists() ? mapInstrument(snap.id, snap.data()) : null;
}

export async function ensureBuiltinInstruments(): Promise<CrmInstrument[]> {
  const existing = await listInstruments();
  const have = new Set(existing.map((i) => i.slug));
  for (const seed of BUILTIN_INSTRUMENTS) {
    if (have.has(seed.slug)) continue;
    await setDoc(doc(db, LIVE_COLLECTIONS.crmInstruments, seed.slug), {
      ...seed,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  return listInstruments();
}

export async function upsertInstrument(input: {
  slug: string;
  name: string;
  assetClass: InstrumentAssetClass;
  status?: InstrumentStatus;
  landing: InstrumentLanding;
  riskDisclosure: string;
  defaultAppointmentUrl: string;
  defaultDemoUrl: string;
  defaultSteps?: CampaignStep[];
}): Promise<string> {
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
  if (!slug) throw new Error('Instrument slug is required');
  if (!input.riskDisclosure.trim()) throw new Error('Risk disclosure cannot be empty');
  const ref = doc(db, LIVE_COLLECTIONS.crmInstruments, slug);
  const prior = await getDoc(ref);
  const steps = input.defaultSteps?.length
    ? input.defaultSteps
    : (prior.exists() ? (prior.data()?.defaultSteps as CampaignStep[] | undefined) : undefined)
      ?? buildTrack(slug);
  await setDoc(ref, {
    slug,
    name: input.name.trim(),
    assetClass: input.assetClass,
    status: input.status ?? 'active',
    landing: input.landing,
    riskDisclosure: input.riskDisclosure.trim(),
    defaultAppointmentUrl: input.defaultAppointmentUrl.trim(),
    defaultDemoUrl: input.defaultDemoUrl.trim(),
    defaultSteps: steps,
    createdAt: prior.exists() ? prior.data()?.createdAt ?? serverTimestamp() : serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return slug;
}

export async function updateInstrument(
  slug: string,
  patch: Partial<Pick<CrmInstrument, 'name' | 'assetClass' | 'status' | 'landing' | 'riskDisclosure' | 'defaultAppointmentUrl' | 'defaultDemoUrl' | 'defaultSteps'>>,
): Promise<void> {
  if (patch.riskDisclosure !== undefined && !patch.riskDisclosure.trim()) {
    throw new Error('Risk disclosure cannot be empty');
  }
  await updateDoc(doc(db, LIVE_COLLECTIONS.crmInstruments, slug), { ...patch, updatedAt: serverTimestamp() });
}

export function blankLanding(): InstrumentLanding {
  return {
    tag: '',
    headline: '',
    subhead: '',
    bullets: [
      { title: '', body: '' },
      { title: '', body: '' },
      { title: '', body: '' },
    ],
    quote: '',
    formTitle: 'Register your interest',
    formBody: '',
    submitLabel: 'Continue',
    consentLabel: 'Email me this series. I can unsubscribe any time.',
  };
}

export function landingUrl(slug: string): string {
  if (slug === 'gold-options') return 'https://app.safeguardsecurities.us/campaign/gold-options.html';
  if (slug === 'gold') return 'https://app.safeguardsecurities.us/campaign/gold.html';
  if (slug === 'preipo') return 'https://safeguardsecurities.us/campaign/preipo.html';
  return `https://us-central1-e-bank-dashboard.cloudfunctions.net/campaignLanding?slug=${encodeURIComponent(slug)}`;
}

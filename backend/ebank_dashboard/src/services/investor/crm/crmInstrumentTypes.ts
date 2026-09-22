import type { CampaignStep } from './crmCampaignTypes';

export type InstrumentAssetClass =
  | 'futures'
  | 'options'
  | 'preipo'
  | 'forex'
  | 'equity'
  | 'other';

export type InstrumentStatus = 'active' | 'archived';

export interface InstrumentLanding {
  tag: string;
  headline: string;
  subhead: string;
  bullets: { title: string; body: string }[];
  quote: string;
  formTitle: string;
  formBody: string;
  submitLabel: string;
  consentLabel: string;
}

export interface CrmInstrument {
  id: string; // same as slug
  slug: string;
  name: string;
  assetClass: InstrumentAssetClass;
  status: InstrumentStatus;
  landing: InstrumentLanding;
  riskDisclosure: string;
  defaultAppointmentUrl: string;
  defaultDemoUrl: string;
  defaultSteps: CampaignStep[];
  createdAt?: Date;
  updatedAt?: Date;
}

export const ASSET_CLASS_LABELS: Record<InstrumentAssetClass, string> = {
  futures: 'Futures',
  options: 'Options',
  preipo: 'Pre-IPO',
  forex: 'Forex',
  equity: 'Equity',
  other: 'Other',
};

export const FUNNEL_STAGES = [
  'captured',
  'sequenced',
  'engaged',
  'appointment',
  'demo',
  'converted',
  'exited',
] as const;

export type FunnelStage = (typeof FUNNEL_STAGES)[number];

export const FUNNEL_STAGE_LABELS: Record<FunnelStage, string> = {
  captured: 'Captured',
  sequenced: 'In sequence',
  engaged: 'Engaged',
  appointment: 'Appointment',
  demo: 'Demo',
  converted: 'Converted',
  exited: 'Exited',
};

export const STAGE_RANK: Record<FunnelStage, number> = {
  captured: 1,
  sequenced: 2,
  engaged: 3,
  appointment: 4,
  demo: 4,
  converted: 5,
  exited: 6,
};

export function canAdvanceStage(current: FunnelStage | undefined, next: FunnelStage): boolean {
  if (next === 'exited' || next === 'converted') return true;
  if (!current) return true;
  if (current === 'exited' || current === 'converted') return false;
  if (current === 'appointment' && next === 'demo') return true;
  if (current === 'demo' && next === 'appointment') return true;
  return STAGE_RANK[next] >= STAGE_RANK[current];
}

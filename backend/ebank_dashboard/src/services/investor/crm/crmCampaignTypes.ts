// Funnel campaign model.
//
// A campaign is an ordered SEQUENCE of emails (a "track"), not a single
// blast: step 0 goes out on enrollment day, step 1 after its dayOffset, and
// so on. Enrollments carry the per-lead cursor. The content lives ON the
// campaign document - copied from the built-in track templates at creation -
// so admins can edit any step's subject or body without a deploy, and the
// send worker in functions-crm needs no template code at all.

export type CampaignTrack = 'gold' | 'preipo';

export interface CampaignStep {
  key: string;          // stable id within the campaign ('g1'..'g5')
  dayOffset: number;    // days after the PREVIOUS step (0 for the first)
  subject: string;
  html: string;         // full email HTML with {{mergeFields}}
}

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface CampaignSettings {
  fromName: string;
  appointmentUrl: string;   // where "Book a consultation" points
  demoUrl: string;          // where "Open a demo account" points
  companyName: string;
  companyAddress: string;   // CAN-SPAM: a real postal address, required
}

export interface CrmCampaign {
  id: string;
  name: string;
  track: CampaignTrack;
  status: CampaignStatus;
  steps: CampaignStep[];
  settings: CampaignSettings;
  stats: {
    enrolled: number; sent: number; delivered: number; opened: number;
    clicked: number; bounced: number; complained: number; unsubscribed: number;
  };
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type EnrollmentStatus =
  | 'active'        // waiting for nextSendAt
  | 'completed'     // every step sent
  | 'unsubscribed'
  | 'suppressed'    // was on / landed on the do-not-contact list
  | 'error';

export interface CrmEnrollment {
  id: string;               // `${campaignId}_${leadId}` - natural idempotency
  campaignId: string;
  leadId: string;
  email: string;
  firstName: string;
  step: number;             // next step index to send
  nextSendAt: Date;
  status: EnrollmentStatus;
  lastError?: string;
  enrolledAt?: Date;
  lastSentAt?: Date;
}

export const EMPTY_STATS: CrmCampaign['stats'] = {
  enrolled: 0, sent: 0, delivered: 0, opened: 0,
  clicked: 0, bounced: 0, complained: 0, unsubscribed: 0,
};

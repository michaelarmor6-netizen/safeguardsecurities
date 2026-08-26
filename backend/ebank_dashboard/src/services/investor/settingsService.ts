import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LIVE_COLLECTIONS } from '../../config/liveCollections';

const GLOBAL_DOC_ID = 'global';

export interface PlatformSettings {
  // Notifications (announcement banner)
  announcementEnabled: boolean;
  announcementMessage: string;

  // General
  platformName: string;
  defaultCurrency: string;
  statementFooterText: string;
  deskTimezone: string;

  // Appearance & Branding
  logoUrl: string;
  brandPrimaryColor: string;
  brandAccentColor: string;

  // Languages
  defaultLanguage: string;
  supportedLanguages: string[];

  // Notifications (admin alert preferences)
  notifyOnNewApplicant: boolean;
  notifyOnFundingRequest: boolean;
  notifyOnLargeTrade: boolean;
  largeTradeThreshold: number;

  // Security
  sessionTimeoutMinutes: number;
  minPasswordLength: number;

  // Email Templates
  welcomeEmailSubjectOverride: string;
  welcomeEmailIntroOverride: string;
}

export const DEFAULTS: PlatformSettings = {
  announcementEnabled: false,
  announcementMessage: '',

  platformName: 'SafeGuard Securities',
  defaultCurrency: 'USD',
  statementFooterText: 'SafeGuard Securities · Confidential client statement',
  deskTimezone: 'America/New_York',

  logoUrl: '',
  brandPrimaryColor: '#6366f1',
  brandAccentColor: '#10b981',

  defaultLanguage: 'en',
  supportedLanguages: ['en'],

  notifyOnNewApplicant: true,
  notifyOnFundingRequest: true,
  notifyOnLargeTrade: false,
  largeTradeThreshold: 50000,

  sessionTimeoutMinutes: 60,
  minPasswordLength: 6,

  welcomeEmailSubjectOverride: '',
  welcomeEmailIntroOverride: '',
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const snap = await getDoc(doc(db, LIVE_COLLECTIONS.settings, GLOBAL_DOC_ID));
  if (!snap.exists()) return DEFAULTS;
  const data = snap.data();
  return {
    announcementEnabled: Boolean(data.announcementEnabled),
    announcementMessage: data.announcementMessage ?? DEFAULTS.announcementMessage,
    platformName: data.platformName ?? DEFAULTS.platformName,
    defaultCurrency: data.defaultCurrency ?? DEFAULTS.defaultCurrency,
    statementFooterText: data.statementFooterText ?? DEFAULTS.statementFooterText,
    deskTimezone: data.deskTimezone ?? DEFAULTS.deskTimezone,
    logoUrl: data.logoUrl ?? DEFAULTS.logoUrl,
    brandPrimaryColor: data.brandPrimaryColor ?? DEFAULTS.brandPrimaryColor,
    brandAccentColor: data.brandAccentColor ?? DEFAULTS.brandAccentColor,
    defaultLanguage: data.defaultLanguage ?? DEFAULTS.defaultLanguage,
    supportedLanguages: Array.isArray(data.supportedLanguages) ? data.supportedLanguages : DEFAULTS.supportedLanguages,
    notifyOnNewApplicant: data.notifyOnNewApplicant ?? DEFAULTS.notifyOnNewApplicant,
    notifyOnFundingRequest: data.notifyOnFundingRequest ?? DEFAULTS.notifyOnFundingRequest,
    notifyOnLargeTrade: data.notifyOnLargeTrade ?? DEFAULTS.notifyOnLargeTrade,
    largeTradeThreshold: Number(data.largeTradeThreshold ?? DEFAULTS.largeTradeThreshold),
    sessionTimeoutMinutes: Number(data.sessionTimeoutMinutes ?? DEFAULTS.sessionTimeoutMinutes),
    minPasswordLength: Number(data.minPasswordLength ?? DEFAULTS.minPasswordLength),
    welcomeEmailSubjectOverride: data.welcomeEmailSubjectOverride ?? DEFAULTS.welcomeEmailSubjectOverride,
    welcomeEmailIntroOverride: data.welcomeEmailIntroOverride ?? DEFAULTS.welcomeEmailIntroOverride,
  };
}

export async function updatePlatformSettings(patch: Partial<PlatformSettings>) {
  await setDoc(
    doc(db, LIVE_COLLECTIONS.settings, GLOBAL_DOC_ID),
    { ...patch, updatedAt: new Date() },
    { merge: true },
  );
}

// Subscription plan definitions for the AI Engine.
//
// Pure config + helpers only - no Firestore, no React - so profileService can
// import the type without a cycle (same pattern as investorRoles.ts).
//
// IMPORTANT: quotas here are for display and client-side UX only. Every limit
// must ALSO be enforced inside the generateTradingSignal Cloud Function - a
// callable can be invoked directly with the Firebase SDK using config that
// ships in our own bundle, so a client-side check is a courtesy, not a gate.

export type SubscriptionPlan = 'free' | 'pro';

export interface PlanFeatures {
  /** Phase 3: multi-timeframe indicators, levels, invalidation point. */
  deepAnalysis: boolean;
  /** Phase 3: signal reasons over the client's own holdings + risk profile. */
  personalizedAnalysis: boolean;
  /** Phase 4: scheduled scans that push alerts without the client asking. */
  proactiveMonitoring: boolean;
  /** Phase 4: how many watchlist symbols may be AI-monitored. */
  monitoredSymbols: number;
  /** Phase 4: Monday summary across holdings + watchlist. */
  weeklyDigest: boolean;
}

export interface PlanDefinition {
  id: SubscriptionPlan;
  label: string;
  blurb: string;
  /**
   * Monthly fee in account currency, charged in Phase 5.
   * TODO: set from real unit economics before billing ships - every signal
   * costs an Anthropic call plus Finnhub history, and monitoring multiplies it.
   */
  monthlyPrice: number;
  /** Hard ceiling, including on paid tiers - see note above about runaway cost. */
  aiSignalsPerMonth: number;
  features: PlanFeatures;
}

export const PLANS: Record<SubscriptionPlan, PlanDefinition> = {
  free: {
    id: 'free',
    label: 'Standard',
    blurb: 'On-demand technical signals for a funded account.',
    monthlyPrice: 0,
    aiSignalsPerMonth: 5,
    features: {
      deepAnalysis: false,
      personalizedAnalysis: false,
      proactiveMonitoring: false,
      monitoredSymbols: 0,
      weeklyDigest: false,
    },
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    blurb: 'Deeper analysis, portfolio-aware signals, and always-on monitoring.',
    monthlyPrice: 0, // TODO: price before Phase 5 billing ships
    aiSignalsPerMonth: 100,
    features: {
      deepAnalysis: true,
      personalizedAnalysis: true,
      proactiveMonitoring: true,
      monitoredSymbols: 10,
      weeklyDigest: true,
    },
  },
};

export const DEFAULT_PLAN: SubscriptionPlan = 'free';

export const PLAN_IDS = Object.keys(PLANS) as SubscriptionPlan[];

/** Narrows an unknown Firestore value to a valid plan, defaulting safely. */
export function resolvePlan(value: unknown): SubscriptionPlan {
  return value === 'pro' || value === 'free' ? value : DEFAULT_PLAN;
}

export function getPlanDefinition(plan: SubscriptionPlan): PlanDefinition {
  return PLANS[plan] ?? PLANS[DEFAULT_PLAN];
}

/**
 * Usage period key, e.g. "2026-08". UTC so a client travelling across
 * timezones can't roll their own quota over early.
 */
export function currentPeriodKey(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Firestore doc id for one user's usage in one period. */
export function usageDocId(userId: string, period: string = currentPeriodKey()): string {
  return `${userId}_${period}`;
}

import { useCallback, useEffect, useState } from 'react';
import { useInvestorAuth } from '../contexts/InvestorAuthContext';
import { getSubscriptionState, type SubscriptionState } from '../services/investor/subscriptionService';
import {
  DEFAULT_PLAN,
  getPlanDefinition,
  resolvePlan,
  type PlanFeatures,
  type SubscriptionPlan,
} from '../lib/subscriptionPlans';

// One place the UI asks: what is this client allowed to do right now?
//
// Every downstream AI Engine feature reads from here, so gating stays in one
// file instead of scattering `profile.plan === 'pro'` checks through the app.
//
// This is presentation only. The Cloud Function enforces the real limits;
// this hook decides what to show, what to disable, and when to prompt.

export interface Entitlements {
  plan: SubscriptionPlan;
  planLabel: string;
  isPro: boolean;
  features: PlanFeatures;

  /** Signal allowance for the current UTC month. */
  signalQuota: number;
  signalsUsed: number;
  signalsRemaining: number;

  /** Funded AND has allowance left. The AI page should disable generate when false. */
  canGenerateSignal: boolean;
  /** Out of allowance rather than unfunded - the case worth an upgrade prompt. */
  quotaExhausted: boolean;

  loading: boolean;
  /** Call after a signal is generated so the meter reflects it. */
  refresh: () => void;
}

export function useEntitlements(): Entitlements {
  const { user, profile, isFunded } = useInvestorAuth();
  const plan = resolvePlan(profile?.plan);
  const definition = getPlanDefinition(plan);

  const [state, setState] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!user?.uid) {
      setState(null);
      setLoading(false);
      return () => {};
    }

    let cancelled = false;
    setLoading(true);

    getSubscriptionState(user.uid, plan)
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch(() => {
        // getSubscriptionState already degrades to zero-usage on failure;
        // this only catches an unexpected throw.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.uid, plan]);

  useEffect(() => load(), [load]);

  const signalsUsed = state?.signalsUsed ?? 0;
  const signalQuota = definition.aiSignalsPerMonth;
  const signalsRemaining = state?.signalsRemaining ?? signalQuota;
  const quotaExhausted = state?.quotaExhausted ?? false;

  return {
    plan,
    planLabel: definition.label,
    isPro: plan === 'pro',
    features: definition.features,

    signalQuota,
    signalsUsed,
    signalsRemaining,

    canGenerateSignal: isFunded && !quotaExhausted,
    quotaExhausted,

    loading,
    refresh: load,
  };
}

/** Default entitlements for contexts with no signed-in investor. */
export const ANONYMOUS_ENTITLEMENTS: Pick<Entitlements, 'plan' | 'planLabel' | 'features'> = {
  plan: DEFAULT_PLAN,
  planLabel: getPlanDefinition(DEFAULT_PLAN).label,
  features: getPlanDefinition(DEFAULT_PLAN).features,
};

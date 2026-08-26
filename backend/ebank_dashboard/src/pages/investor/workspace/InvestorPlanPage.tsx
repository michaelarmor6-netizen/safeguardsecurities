import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Layers, Check } from 'lucide-react';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { useEntitlements } from '../../../hooks/useEntitlements';
import { PLAN_IDS, getPlanDefinition, type SubscriptionPlan } from '../../../lib/subscriptionPlans';
import {
  getPendingPlanRequest,
  requestPlanChange,
  type PlanRequest,
} from '../../../services/investor/subscriptionService';

function planBullets(def: ReturnType<typeof getPlanDefinition>): string[] {
  const f = def.features;
  return [
    `${def.aiSignalsPerMonth} AI signals per month`,
    f.deepAnalysis ? 'Multi-timeframe analysis with key levels' : 'Core indicators (SMA, RSI, MACD)',
    f.personalizedAnalysis ? 'Signals weighed against your holdings' : 'Instrument-level analysis',
    f.proactiveMonitoring
      ? `Monitors up to ${f.monitoredSymbols} watchlist symbols`
      : 'On-demand analysis only',
    f.weeklyDigest ? 'Weekly portfolio digest' : '',
  ].filter(Boolean);
}

export default function InvestorPlanPage() {
  const { user, profile } = useInvestorAuth();
  const entitlements = useEntitlements();

  const [planRequest, setPlanRequest] = useState<PlanRequest | null>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    getPendingPlanRequest(user.uid).then((r) => {
      if (!cancelled) setPlanRequest(r);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const askForPlan = async (requestedPlan: SubscriptionPlan) => {
    if (!user?.uid) return;
    setRequesting(true);
    try {
      await requestPlanChange({
        userId: user.uid,
        userEmail: profile?.email,
        currentPlan: entitlements.plan,
        requestedPlan,
      });
      setPlanRequest(await getPendingPlanRequest(user.uid));
      toast.success('Request sent — your account manager will be in touch.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send the request');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="sg-page-title flex items-center gap-2">
          <Layers className="h-5 w-5" style={{ color: 'var(--sg-indigo)' }} />
          Subscription
        </h1>
        <p className="sg-page-sub mt-1">
          Your AI Engine plan, what it includes, and how much of this month's allowance you have used.
        </p>
      </div>

      {/* Current usage */}
      <div className="sg-card p-5" style={{ borderRadius: 14 }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p style={{ color: 'var(--sg-muted-2)' }}>Current plan</p>
            <p className="text-lg font-semibold" style={{ color: 'var(--sg-text)', fontFamily: 'var(--sg-font-display)' }}>
              {entitlements.planLabel}
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--sg-muted-2)' }}>Signals used this month</p>
            <p
              className="text-lg font-semibold tabular-nums"
              style={{
                color: entitlements.quotaExhausted ? 'var(--sg-danger)' : 'var(--sg-text)',
                fontFamily: 'var(--sg-font-display)',
              }}
            >
              {entitlements.signalsUsed} / {entitlements.signalQuota}
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--sg-muted-2)' }}>Remaining</p>
            <p
              className="text-lg font-semibold tabular-nums"
              style={{ color: 'var(--sg-teal)', fontFamily: 'var(--sg-font-display)' }}
            >
              {entitlements.signalsRemaining}
            </p>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PLAN_IDS.map((id) => {
          const def = getPlanDefinition(id);
          const isCurrent = id === entitlements.plan;
          return (
            <div
              key={id}
              className="sg-card p-5 space-y-4 flex flex-col"
              style={{
                borderRadius: 14,
                borderColor: isCurrent ? 'var(--sg-teal)' : undefined,
                background: isCurrent ? 'rgba(16,185,129,0.06)' : undefined,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <p
                  className="text-lg font-semibold"
                  style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}
                >
                  {def.label}
                </p>
                {isCurrent && (
                  <span
                    className="text-[10px] uppercase font-semibold px-2 py-0.5"
                    style={{
                      letterSpacing: '0.1em',
                      borderRadius: 4,
                      color: 'var(--sg-teal)',
                      border: '1px solid var(--sg-teal)',
                    }}
                  >
                    Current
                  </span>
                )}
              </div>

              <p className="text-sm" style={{ color: 'var(--sg-muted-2)' }}>{def.blurb}</p>

              <ul className="space-y-2 flex-1">
                {planBullets(def).map((line) => (
                  <li
                    key={line}
                    className="flex items-start gap-2 text-sm"
                    style={{ color: 'var(--sg-muted)' }}
                  >
                    <Check className="h-3.5 w-3.5 mt-1 shrink-0" style={{ color: 'var(--sg-teal)' }} />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              {!isCurrent && (
                <button
                  type="button"
                  disabled={requesting || Boolean(planRequest)}
                  onClick={() => askForPlan(id)}
                  className="sg-btn-primary w-full"
                >
                  {planRequest ? 'Request pending' : requesting ? 'Sending…' : `Ask about ${def.label}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="sg-card p-5" style={{ borderRadius: 14 }}>
        {planRequest ? (
          <p className="text-sm" style={{ color: 'var(--sg-muted)' }}>
            You asked about the {getPlanDefinition(planRequest.requestedPlan).label} plan
            {planRequest.createdAt ? ` on ${planRequest.createdAt.toLocaleDateString()}` : ''}. Your
            account manager will contact you to confirm pricing and terms before anything changes.
          </p>
        ) : (
          <p className="text-sm" style={{ color: 'var(--sg-muted-2)' }}>
            Plan changes are arranged with your account manager — nothing is charged to your account
            automatically, and your plan will not change until you confirm with them.
          </p>
        )}
      </div>
    </div>
  );
}

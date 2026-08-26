import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { createStrategy, deleteStrategy, getAllStrategies, type Strategy } from '../../../services/investor/strategyService';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { logAction } from '../../../services/investor/auditService';

const riskColor: Record<Strategy['riskLevel'], string> = {
  low: 'var(--sg-teal)',
  medium: 'var(--sg-gold)',
  high: 'var(--sg-danger)',
};

export default function InvestorAdminStrategiesPage() {
  const { user, profile: adminProfile } = useInvestorAuth();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [riskLevel, setRiskLevel] = useState<Strategy['riskLevel']>('medium');
  const [targetAllocation, setTargetAllocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => getAllStrategies().then(setStrategies).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Enter a strategy name');
      return;
    }
    setSubmitting(true);
    try {
      await createStrategy({ name: name.trim(), description: description.trim(), riskLevel, targetAllocation: targetAllocation.trim() });
      if (user) logAction(user.uid, adminProfile?.email ?? '', 'Strategy created', name.trim());
      toast.success('Strategy created');
      setName('');
      setDescription('');
      setTargetAllocation('');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create strategy');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="sg-page-title">Strategies</h1>

      <form onSubmit={submit} className="sg-panel p-5 space-y-4">
        <h3 className="font-semibold sg-text-main">New Strategy</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Strategy name" className="sg-input" />
          <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value as Strategy['riskLevel'])} className="sg-input">
            <option value="low">Low risk</option>
            <option value="medium">Medium risk</option>
            <option value="high">High risk</option>
          </select>
        </div>
        <input
          type="text"
          value={targetAllocation}
          onChange={(e) => setTargetAllocation(e.target.value)}
          placeholder="Target allocation (e.g. 60% equities, 30% bonds, 10% cash)"
          className="sg-input"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="sg-input"
          rows={3}
        />
        <button type="submit" disabled={submitting} className="sg-btn-primary">
          {submitting ? 'Creating...' : 'Create Strategy'}
        </button>
      </form>

      <div className="space-y-3">
        {strategies.map((s) => (
          <div key={s.id} className="sg-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold sg-text-main">{s.name}</p>
                <p className="text-xs sg-text-faint">{s.targetAllocation}</p>
              </div>
              <span className="text-xs font-semibold uppercase shrink-0" style={{ color: riskColor[s.riskLevel] }}>
                {s.riskLevel} risk
              </span>
            </div>
            {s.description && <p className="text-sm mt-2 sg-text-muted">{s.description}</p>}
            <button
              type="button"
              className="sg-danger-btn mt-3"
              onClick={async () => {
                try {
                  await deleteStrategy(s.id);
                  if (user) logAction(user.uid, adminProfile?.email ?? '', 'Strategy deleted', s.name);
                  toast.success('Strategy deleted');
                  load();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Failed to delete strategy');
                }
              }}
            >
              Delete
            </button>
          </div>
        ))}
        {strategies.length === 0 && <div className="sg-panel p-8 text-center sg-text-muted">No strategies defined.</div>}
      </div>
    </div>
  );
}

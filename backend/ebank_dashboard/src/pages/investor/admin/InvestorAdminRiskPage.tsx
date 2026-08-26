import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllHoldingsRaw } from '../../../services/investor/portfolioService';
import { getAllInvestorProfiles } from '../../../services/investor/profileService';

interface ClientExposure {
  userId: string;
  email: string;
  totalExposure: number;
  holdingsCount: number;
  largestSymbol: string;
  largestPercent: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n);

export default function InvestorAdminRiskPage() {
  const [rows, setRows] = useState<ClientExposure[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllHoldingsRaw(), getAllInvestorProfiles()])
      .then(([holdings, profiles]) => {
        const emailByUserId = new Map(profiles.map((p) => [p.id, p.email]));
        const byUser = new Map<string, { symbol: string; value: number }[]>();
        for (const h of holdings) {
          const value = h.shares * h.currentPrice;
          const list = byUser.get(h.userId) ?? [];
          list.push({ symbol: h.symbol, value });
          byUser.set(h.userId, list);
        }
        const computed: ClientExposure[] = Array.from(byUser.entries()).map(([userId, positions]) => {
          const totalExposure = positions.reduce((sum, p) => sum + p.value, 0);
          const largest = positions.reduce((max, p) => (p.value > max.value ? p : max), positions[0]);
          return {
            userId,
            email: emailByUserId.get(userId) ?? userId,
            totalExposure,
            holdingsCount: positions.length,
            largestSymbol: largest?.symbol ?? '—',
            largestPercent: totalExposure > 0 ? ((largest?.value ?? 0) / totalExposure) * 100 : 0,
          };
        });
        computed.sort((a, b) => b.totalExposure - a.totalExposure);
        setRows(computed);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load risk summary'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="sg-page-title">Risk Summary</h1>
      <p className="sg-page-sub">
        Per-client exposure and concentration, computed from current holdings. Concentration above 50% in a single
        position is flagged.
      </p>
      <div className="sg-panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sg-text-muted">
            <tr>
              <th className="text-left p-4">Client</th>
              <th className="text-right p-4">Total Exposure</th>
              <th className="text-right p-4">Holdings</th>
              <th className="text-left p-4">Largest Position</th>
              <th className="text-left p-4">Flag</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId} className="border-t sg-row-border">
                <td className="p-4 sg-text-main">{r.email}</td>
                <td className="p-4 text-right sg-text-main">{fmt(r.totalExposure)}</td>
                <td className="p-4 text-right sg-text-muted">{r.holdingsCount}</td>
                <td className="p-4 sg-text-muted">
                  {r.largestSymbol} ({r.largestPercent.toFixed(0)}%)
                </td>
                <td className="p-4">
                  {r.largestPercent > 50 && (
                    <span className="text-xs font-semibold uppercase" style={{ color: 'var(--sg-danger)' }}>
                      High concentration
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && <p className="p-6 text-center sg-text-muted">No holdings to assess yet.</p>}
      </div>
    </div>
  );
}

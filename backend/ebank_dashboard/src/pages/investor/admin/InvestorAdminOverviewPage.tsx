import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getAdminStats } from '../../../services/investor/portfolioService';
import type { FundingRequest } from '../../../services/investor/fundingService';
import type { InvestorProfile } from '../../../services/investor/profileService';

export default function InvestorAdminOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getAdminStats>> | null>(null);

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  if (loading) return <p className="sg-text-muted">Loading dashboard...</p>;
  if (!stats) return null;

  const accents = ['var(--sg-indigo)', 'var(--sg-teal)', 'var(--sg-pink)', 'var(--sg-gold)', 'var(--sg-indigo-deep)', 'var(--sg-violet)'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="sg-page-title">Super Admin Dashboard</h1>
        <p className="sg-page-sub mt-1">
          Manage users, orders, funding requests, platform settings, and privileged operations.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[
          ['Total Users', String(stats.totalUsers), `+${stats.activeUsers} active`],
          ['Total Wallet Balance', fmt(stats.totalWalletBalance), 'Across all users'],
          ["Today's Volume", fmt(stats.todayVolume), `${stats.todayTrades} trades`],
          ['Pending Orders', String(stats.pendingOrders), 'Require attention'],
          ['Funding Requests', String(stats.pendingFunding), 'Awaiting review'],
          ['New Applicants', String(stats.pendingApplicants), 'Awaiting approval'],
        ].map(([label, value, hint], i) => (
          <div key={label} className="sg-panel p-5">
            <p className="text-sm sg-text-muted">{label}</p>
            <p className="mt-2 text-2xl font-semibold" style={{ fontFamily: 'var(--sg-font-display)', color: accents[i] }}>
              {value}
            </p>
            <p className="text-xs sg-text-faint mt-1">{hint}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="sg-panel p-5">
          <h2 className="font-semibold sg-text-main mb-4" style={{ fontFamily: 'var(--sg-font-display)' }}>
            Recent Users
          </h2>
          {stats.recentUsers.map((u: InvestorProfile) => (
            <div key={u.id} className="flex justify-between py-2 border-b sg-row-border text-sm last:border-0">
              <span className="sg-text-main">{u.email}</span>
              <span className="sg-text-muted">{u.accountStatus}</span>
            </div>
          ))}
        </div>
        <div className="sg-panel p-5">
          <h2 className="font-semibold sg-text-main mb-4" style={{ fontFamily: 'var(--sg-font-display)' }}>
            Pending Funding
          </h2>
          {stats.recentFunding.length === 0 ? (
            <p className="sg-text-muted text-sm">No pending funding requests.</p>
          ) : (
            stats.recentFunding.map((f: FundingRequest) => (
              <div key={f.id} className="flex justify-between py-2 text-sm border-b sg-row-border last:border-0">
                <span className="sg-text-main">{f.userEmail ?? f.userId}</span>
                <span style={{ color: 'var(--sg-teal)' }}>{fmt(f.amount)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

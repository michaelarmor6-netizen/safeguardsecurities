import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getAuditLog, type AuditLogEntry } from '../../../services/investor/auditService';

export default function InvestorAdminAuditPage() {
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLog()
      .then(setRows)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load audit log'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="sg-page-title">Audit Log</h1>
      <p className="sg-page-sub">A record of admin actions taken across the platform.</p>
      <div className="sg-panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sg-text-muted">
            <tr>
              <th className="text-left p-4">Time</th>
              <th className="text-left p-4">Admin</th>
              <th className="text-left p-4">Action</th>
              <th className="text-left p-4">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t sg-row-border">
                <td className="p-4 sg-text-muted whitespace-nowrap">
                  {r.createdAt ? r.createdAt.toLocaleString() : '—'}
                </td>
                <td className="p-4 sg-text-main">{r.actorEmail}</td>
                <td className="p-4 sg-text-main">{r.action}</td>
                <td className="p-4 sg-text-muted">{r.details ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && <p className="p-6 text-center sg-text-muted">No audit entries yet.</p>}
      </div>
    </div>
  );
}

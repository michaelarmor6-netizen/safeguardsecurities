import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { closeTicket, getAllTickets, replyToTicket, type SupportTicket } from '../../../services/investor/ticketService';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { logAction } from '../../../services/investor/auditService';

const statusColor: Record<SupportTicket['status'], string> = {
  open: 'var(--sg-gold)',
  answered: 'var(--sg-teal)',
  closed: 'var(--sg-muted-2)',
};

export default function InvestorAdminSupportPage() {
  const { user, profile: adminProfile } = useInvestorAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const load = () => getAllTickets().then(setTickets).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const submitReply = async (id: string, ticket: SupportTicket) => {
    const reply = (replyDrafts[id] ?? '').trim();
    if (!reply) {
      toast.error('Enter a reply');
      return;
    }
    try {
      await replyToTicket(id, reply);
      if (user) logAction(user.uid, adminProfile?.email ?? '', 'Ticket replied', `${ticket.userEmail ?? ticket.userId}: ${ticket.subject}`);
      toast.success('Reply sent');
      setReplyDrafts((prev) => ({ ...prev, [id]: '' }));
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send reply');
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="sg-page-title">Support Tickets</h1>
      <div className="space-y-3">
        {tickets.map((t) => (
          <div key={t.id} className="sg-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold sg-text-main">{t.subject}</p>
                <p className="text-xs sg-text-faint">{t.userEmail ?? t.userId}</p>
              </div>
              <span className="text-xs font-semibold uppercase shrink-0" style={{ color: statusColor[t.status] }}>
                {t.status}
              </span>
            </div>
            <p className="text-sm mt-2 sg-text-muted">{t.message}</p>
            {t.adminReply && (
              <div className="mt-3 pt-3 border-t sg-row-border">
                <p className="text-xs font-semibold" style={{ color: 'var(--sg-teal)' }}>Your reply</p>
                <p className="text-sm mt-1 sg-text-muted">{t.adminReply}</p>
              </div>
            )}
            {t.status !== 'closed' && (
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  className="sg-input flex-1"
                  placeholder="Write a reply..."
                  value={replyDrafts[t.id] ?? ''}
                  onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))}
                />
                <button type="button" className="sg-action-btn" onClick={() => submitReply(t.id, t)}>
                  Reply
                </button>
                <button
                  type="button"
                  className="sg-danger-btn"
                  onClick={async () => {
                    try {
                      await closeTicket(t.id);
                      if (user) logAction(user.uid, adminProfile?.email ?? '', 'Ticket closed', `${t.userEmail ?? t.userId}: ${t.subject}`);
                      toast.success('Ticket closed');
                      load();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Failed to close ticket');
                    }
                  }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        ))}
        {tickets.length === 0 && <div className="sg-panel p-8 text-center sg-text-muted">No support tickets.</div>}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { LifeBuoy } from 'lucide-react';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { createTicket, getTicketsForUser, type SupportTicket } from '../../../services/investor/ticketService';

const statusColor: Record<SupportTicket['status'], string> = {
  open: 'var(--sg-gold)',
  answered: 'var(--sg-teal)',
  closed: 'var(--sg-muted-2)',
};

export default function InvestorSupportPage() {
  const { user, profile } = useInvestorAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    if (!user) return;
    getTicketsForUser(user.uid)
      .then(setTickets)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load support tickets'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subject.trim() || !message.trim()) {
      toast.error('Enter a subject and message');
      return;
    }
    setSubmitting(true);
    try {
      await createTicket(user.uid, profile?.email ?? user.email ?? '', subject.trim(), message.trim());
      toast.success('Support ticket submitted');
      setSubject('');
      setMessage('');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center" style={{ color: 'var(--sg-muted)' }}>Loading support...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="sg-page-title flex items-center gap-2">
          <LifeBuoy className="h-5 w-5" style={{ color: 'var(--sg-indigo)' }} />
          Support
        </h1>
        <p className="sg-page-sub mt-1">Get help from the SafeGuard team.</p>
      </div>

      <form onSubmit={submit} className="sg-card p-5 space-y-4" style={{ borderRadius: 14 }}>
        <h3 className="font-semibold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          New Ticket
        </h3>
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="sg-input mt-2"
            placeholder="What do you need help with?"
          />
        </div>
        <div>
          <label className="text-sm" style={{ color: 'var(--sg-muted)' }}>Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="sg-input mt-2"
            rows={4}
            placeholder="Describe the issue..."
          />
        </div>
        <button type="submit" disabled={submitting} className="sg-btn-primary">
          {submitting ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </form>

      <div className="space-y-3">
        <h3 className="font-semibold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          Your Tickets
        </h3>
        {tickets.length === 0 && (
          <div className="sg-panel p-8 text-center sg-text-muted">No support tickets yet.</div>
        )}
        {tickets.map((t) => (
          <div key={t.id} className="sg-card p-4" style={{ borderRadius: 14 }}>
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold" style={{ color: 'var(--sg-text)' }}>{t.subject}</p>
              <span className="text-xs font-semibold uppercase shrink-0" style={{ color: statusColor[t.status] }}>
                {t.status}
              </span>
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--sg-muted)' }}>{t.message}</p>
            {t.adminReply && (
              <div className="mt-3 pt-3 border-t sg-row-border">
                <p className="text-xs font-semibold" style={{ color: 'var(--sg-teal)' }}>SafeGuard Support</p>
                <p className="text-sm mt-1" style={{ color: 'var(--sg-muted)' }}>{t.adminReply}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

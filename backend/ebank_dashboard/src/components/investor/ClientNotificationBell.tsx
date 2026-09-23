import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useInvestorAuth } from '../../contexts/InvestorAuthContext';
import {
  markAllNoticesRead,
  markNoticeRead,
  subscribeNoticesForUser,
  type ClientNotice,
} from '../../services/investor/clientNotificationService';

export default function ClientNotificationBell() {
  const { user } = useInvestorAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ClientNotice[]>([]);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    return subscribeNoticesForUser(user.uid, setRows);
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const unread = rows.filter((r) => !r.read).length;

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2"
        style={{ color: 'var(--sg-muted)' }}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[14px] h-3.5 px-1 rounded-full bg-red-500 text-[9px] leading-[14px] text-white text-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 w-80 max-w-[90vw] rounded-[12px] shadow-xl z-50 overflow-hidden"
          style={{ background: 'var(--sg-bg-elevated)', border: '1px solid var(--sg-border-strong)' }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--sg-border)' }}>
            <p className="text-sm font-semibold sg-text-main">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                className="text-xs"
                style={{ color: 'var(--sg-indigo)' }}
                onClick={() => markAllNoticesRead(rows).catch(() => undefined)}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {rows.length === 0 ? (
              <p className="p-4 text-sm" style={{ color: 'var(--sg-muted)' }}>No notifications yet.</p>
            ) : (
              rows.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className="w-full text-left px-3 py-2.5 border-b last:border-0"
                  style={{
                    borderColor: 'var(--sg-border)',
                    background: n.read ? 'transparent' : 'rgba(99,102,241,.08)',
                  }}
                  onClick={async () => {
                    if (!n.read) await markNoticeRead(n.id).catch(() => undefined);
                    setOpen(false);
                    navigate(n.href);
                  }}
                >
                  <p className="text-sm font-medium sg-text-main">{n.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--sg-muted)' }}>{n.body}</p>
                  {n.createdAt && (
                    <p className="text-[10px] mt-1" style={{ color: 'var(--sg-muted-2)' }}>
                      {n.createdAt.toLocaleString()}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

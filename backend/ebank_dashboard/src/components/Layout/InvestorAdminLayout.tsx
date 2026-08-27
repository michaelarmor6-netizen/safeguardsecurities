import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Wallet,
  Settings,
  LogOut,
  Banknote,
  Package,
  UserPlus,
  UserCog,
  Wrench,
  LifeBuoy,
  ShieldCheck,
  ScrollText,
  Receipt,
  Target,
  AlertTriangle,
  Contact,
  FileUp,
  Send,
  Mail,
} from 'lucide-react';
import { useInvestorAuth } from '../../contexts/InvestorAuthContext';
import ThemeToggle from '../ui/ThemeToggle';

const nav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/applicants', label: 'New Applicants', icon: UserPlus },
  { to: '/admin/create-user', label: 'Create User', icon: UserCog },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/orders', label: 'Trading Operations', icon: ClipboardList },
  { to: '/admin/wallet-setup', label: 'Wallet Setup', icon: Wrench },
  { to: '/admin/wallets', label: 'Wallets', icon: Wallet },
  { to: '/admin/funding', label: 'Funding Requests', icon: Banknote },
  { to: '/admin/transactions', label: 'Transactions', icon: Receipt },
  { to: '/admin/assets', label: 'Asset Management', icon: Package },
  { to: '/admin/support', label: 'Support Tickets', icon: LifeBuoy },
  { to: '/admin/kyc', label: 'KYC Review', icon: ShieldCheck },
  { to: '/admin/strategies', label: 'Strategies', icon: Target },
  { to: '/admin/risk', label: 'Risk Summary', icon: AlertTriangle },
  { to: '/admin/crm-leads', label: 'CRM Leads', icon: Contact },
  { to: '/admin/crm-imports', label: 'CRM Imports', icon: FileUp },
  { to: '/admin/crm-campaigns', label: 'CRM Campaigns', icon: Send },
  { to: '/admin/email-templates', label: 'Email Builder', icon: Mail },
  { to: '/admin/audit', label: 'Audit Log', icon: ScrollText },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function InvestorAdminLayout() {
  const { profile, signOut } = useInvestorAuth();

  return (
    <div className="sg-shell flex">
      <aside
        className="w-64 border-r flex flex-col shrink-0"
        style={{ borderColor: 'var(--sg-border)', background: 'var(--sg-bg-panel)' }}
      >
        <div className="p-5 border-b" style={{ borderColor: 'var(--sg-border)' }}>
          <img src="/logo.png" alt="SafeGuard Securities" className="h-12 w-auto max-w-full object-contain mb-3" />
          <p
            className="text-xs uppercase tracking-wider"
            style={{ color: 'var(--sg-teal)', fontFamily: 'var(--sg-font-body)', letterSpacing: '0.15em' }}
          >
            Super Admin
          </p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm transition ${
                  isActive ? 'sg-nav-active' : ''
                }`
              }
              style={({ isActive }) => (isActive ? undefined : { color: 'var(--sg-muted)' })}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t space-y-3" style={{ borderColor: 'var(--sg-border)' }}>
          <ThemeToggle className="w-full justify-center" />
          <p className="text-sm truncate" style={{ color: 'var(--sg-text)' }}>
            {profile?.email}
          </p>
          <button
            type="button"
            onClick={() => signOut()}
            className="flex items-center gap-2 text-sm"
            style={{ color: 'var(--sg-muted)' }}
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div
          className="border-b px-6 py-2 text-xs"
          style={{ borderColor: 'var(--sg-border)', background: 'var(--sg-bg-elevated)', color: 'var(--sg-muted-2)' }}
        >
          Local rebuild · Firebase project: {import.meta.env.VITE_FIREBASE_PROJECT_ID}
        </div>
        <div className="p-6 relative z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

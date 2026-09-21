import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
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
  FileSpreadsheet,
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
  { to: '/admin/invoices', label: 'Invoices', icon: FileSpreadsheet },
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
  const location = useLocation();
  // The sidebar was `w-64 shrink-0` unconditionally, so on a 390px phone it
  // took 256px and left ~134px for the page. Below lg it is now an off-canvas
  // drawer; from lg up it is the fixed column it always was.
  const [navOpen, setNavOpen] = useState(false);

  // Close on navigation - otherwise tapping a link leaves the drawer covering
  // the page you just asked for.
  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNavOpen(false); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [navOpen]);

  return (
    <div className="sg-shell lg:flex">
      {/* Mobile chrome. Sticky so the menu is reachable however far you scroll. */}
      <header
        className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-2.5 border-b"
        style={{ borderColor: 'var(--sg-border)', background: 'var(--sg-bg-panel)' }}
      >
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          aria-label="Open menu"
          aria-expanded={navOpen}
          className="sg-tap-target -ml-2"
          style={{ color: 'var(--sg-text)' }}
        >
          <Menu className="h-5 w-5" />
        </button>
        <img src="/logo.png" alt="SafeGuard Securities" className="h-7 w-auto object-contain" />
        <span
          className="text-[10px] uppercase tracking-wider"
          style={{ color: 'var(--sg-teal)', letterSpacing: '0.15em' }}
        >
          Admin
        </span>
        <ThemeToggle className="ml-auto" />
      </header>

      {navOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(2,6,23,.65)' }}
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] border-r flex flex-col
          transition-transform duration-200 ease-out
          lg:static lg:z-auto lg:translate-x-0 lg:max-w-none lg:shrink-0
          ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ borderColor: 'var(--sg-border)', background: 'var(--sg-bg-panel)' }}
      >
        <button
          type="button"
          onClick={() => setNavOpen(false)}
          aria-label="Close menu"
          className="lg:hidden absolute top-3 right-3 sg-tap-target"
          style={{ color: 'var(--sg-muted)' }}
        >
          <X className="h-5 w-5" />
        </button>
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
                `flex items-center gap-3 rounded-[10px] px-3 py-2.5 lg:py-2 text-sm transition ${
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
          {/* Already in the mobile header - showing it twice is just clutter. */}
          <ThemeToggle className="w-full justify-center hidden lg:flex" />
          <p className="text-sm truncate" style={{ color: 'var(--sg-text)' }}>
            {profile?.email}
          </p>
          <button
            type="button"
            onClick={() => signOut()}
            className="flex items-center gap-2 text-sm py-1"
            style={{ color: 'var(--sg-muted)' }}
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* min-w-0 matters: without it a wide table forces this flex child to
          grow past the viewport and the whole page scrolls sideways. */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div
          className="border-b px-4 sm:px-6 py-2 text-[11px] sm:text-xs truncate"
          style={{ borderColor: 'var(--sg-border)', background: 'var(--sg-bg-elevated)', color: 'var(--sg-muted-2)' }}
        >
          Local rebuild · Firebase project: {import.meta.env.VITE_FIREBASE_PROJECT_ID}
        </div>
        <div className="p-4 sm:p-6 relative z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

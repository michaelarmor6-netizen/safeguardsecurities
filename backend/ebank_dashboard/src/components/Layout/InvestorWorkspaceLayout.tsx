import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  LayoutDashboard,
  History,
  Briefcase,
  Wallet,
  TrendingUp,
  Sparkles,
  Bot,
  Settings,
  Bell,
  Star,
  Newspaper,
  BookOpen,
  LogOut,
  ExternalLink,
  Radio,
  LifeBuoy,
  FileText,
  ShieldCheck,
  Megaphone,
  Layers,
  ChevronRight,
  Lock,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useInvestorAuth } from '../../contexts/InvestorAuthContext';
import { canSelfTrade } from '../../services/investor/profileService';
import { getAllAssets, type Asset } from '../../services/investor/assetCatalogService';
import { getPlatformSettings, type PlatformSettings } from '../../services/investor/settingsService';
import { SETTINGS_NAV, DEFAULT_SETTINGS_SECTION } from '../../lib/settingsNav';
import { getAlertsForUser } from '../../services/investor/priceAlertService';
import ThemeToggle from '../ui/ThemeToggle';
import ClientNotificationBell from '../investor/ClientNotificationBell';

const mainNav = [
  { to: '/workspace/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/workspace/trades', label: 'Trade History', icon: History },
  { to: '/workspace/portfolio', label: 'Portfolio', icon: Briefcase },
  { to: '/workspace/watchlist', label: 'Watchlist', icon: Star },
  { to: '/workspace/wallet', label: 'Wallet', icon: Wallet },
  { to: '/workspace/performance', label: 'Performance', icon: TrendingUp },
  { to: '/workspace/statement', label: 'Statement', icon: FileText },
  { to: '/workspace/invoices', label: 'Invoices', icon: FileText },
  { to: '/workspace/ai-insights', label: 'AI Insights', icon: Sparkles },
  { to: '/workspace/ai-engine', label: 'AI Engine', icon: Bot, badge: 'NEW' },
  { to: '/workspace/plan', label: 'Subscription', icon: Layers },
  { to: '/workspace/kyc', label: 'Verification', icon: ShieldCheck },
];

const footerNav = [
  { to: '/workspace/support', label: 'Support', icon: LifeBuoy },
  { to: '/workspace/alerts', label: 'Alerts', icon: Bell },
  { to: '/workspace/news', label: 'Market News', icon: Newspaper },
  { to: '/workspace/research', label: 'Research', icon: BookOpen },
];

function canPreviewWorkspace(status: string | undefined, canBrowseWorkspace: boolean): boolean {
  // Pending clients may preview once onboarding is done or deliberately
  // skipped; active always has full access. Block restricted accounts and
  // anyone who hasn't finished (or skipped) the 7-step onboarding yet.
  if (!canBrowseWorkspace) return false;
  return status === 'active' || status === 'pending';
}

function WorkspaceGuard({ children }: { children: React.ReactNode }) {
  const { loading, user, isAdmin, accountStatus, canBrowseWorkspace } = useInvestorAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate('/login', { replace: true });
    else if (isAdmin) navigate('/admin', { replace: true });
    else if (!canPreviewWorkspace(accountStatus, canBrowseWorkspace)) navigate('/activation', { replace: true });
  }, [loading, user, isAdmin, accountStatus, canBrowseWorkspace, navigate]);

  if (loading || !user || isAdmin || !canPreviewWorkspace(accountStatus, canBrowseWorkspace)) {
    return (
      <div className="sg-shell flex items-center justify-center" style={{ color: 'var(--sg-muted)' }}>
        Loading workspace...
      </div>
    );
  }
  return <>{children}</>;
}

function formatTickerPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price < 10) return price.toFixed(4);
  return price.toFixed(2);
}

/**
 * Settings entry with a hover/focus flyout of its sections.
 *
 * Positioned `fixed` off the trigger's rect rather than absolutely, because the
 * sidebar <nav> is overflow-y-auto and would clip an absolutely positioned
 * panel. Opens on hover and on keyboard focus, and closes on Escape.
 */
function SettingsFlyout() {
  const location = useLocation();
  const onSettings = location.pathname.startsWith('/workspace/settings');
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  // The Settings page already has the same sections as a tab strip. Opening
  // this menu there paints it on top of that strip and the form.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const show = () => {
    if (onSettings) return;
    window.clearTimeout(closeTimer.current);
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      // Keep the panel on screen when the trigger sits near the bottom.
      const estimatedHeight = 340;
      const top = Math.min(rect.top, Math.max(8, window.innerHeight - estimatedHeight - 8));
      setAnchor({ top, left: rect.right + 8 });
    }
    setOpen(true);
  };

  // Small delay so the pointer can cross the gap between rail and panel.
  const hide = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={show}
      onBlurCapture={hide}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      <NavLink
        to={`/workspace/settings/${DEFAULT_SETTINGS_SECTION}`}
        className={({ isActive }) =>
          `flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 lg:py-2 text-sm transition ${
            isActive ? 'sg-nav-active' : ''
          }`
        }
      >
        <Settings className="h-4 w-4" />
        <span className="flex-1">Settings</span>
        <ChevronRight className="h-3.5 w-3.5 opacity-60" />
      </NavLink>

      {open && anchor && (
        // Hidden below lg: it is positioned off the sidebar's right edge, which
        // on a phone lands past the viewport. Tapping Settings navigates to the
        // default section instead, which is the useful outcome anyway.
        <div
          className="hidden lg:block fixed z-[80] w-60 p-3 space-y-4 shadow-xl"
          style={{
            top: anchor.top,
            left: anchor.left,
            borderRadius: 12,
            background: 'var(--sg-bg-panel)',
            border: '1px solid var(--sg-border-strong)',
          }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          {SETTINGS_NAV.map((group) => (
            <div key={group.label}>
              <p
                className="text-[10px] uppercase font-semibold mb-1.5"
                style={{
                  letterSpacing: '0.12em',
                  color: 'var(--sg-muted-2)',
                  fontFamily: 'var(--sg-font-display)',
                }}
              >
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.slug}
                    to={`/workspace/settings/${item.slug}`}
                    onClick={() => setOpen(false)}
                    className="block rounded-[8px] px-2 py-1.5 text-sm transition"
                    style={({ isActive }) => ({
                      color: isActive ? 'var(--sg-text)' : 'var(--sg-muted)',
                      background: isActive ? 'var(--sg-bg-panel)' : 'transparent',
                    })}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InvestorWorkspaceLayout() {
  const { user, profile, accountStatus, onboardingCompleted, signOut } = useInvestorAuth();
  const navigate = useNavigate();
  const [ticker, setTicker] = useState<Asset[]>([]);
  const [tickerAt, setTickerAt] = useState<Date | null>(null);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [unseenAlerts, setUnseenAlerts] = useState(0);
  // Same fix as the admin console: the 224px sidebar was unconditional, so on a
  // phone it took most of the screen. Off-canvas below lg, unchanged above it.
  // This matters more here than in admin - most retail clients are on a phone.
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
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
  const displayName = profile?.displayName ?? profile?.firstName ?? profile?.email?.split('@')[0] ?? 'Investor';
  const initial = displayName.charAt(0).toUpperCase();
  const isPreview = accountStatus === 'pending';
  const showSkippedNudge = isPreview && !onboardingCompleted;

  useEffect(() => {
    let cancelled = false;
    const loadTicker = () =>
      getAllAssets()
        .then((assets) => {
          if (cancelled) return;
          const priced = assets
            .filter((a) => a.quote && a.quote.price > 0)
            .sort(
              (a, b) =>
                (a.priority === 'core' ? 0 : 1) - (b.priority === 'core' ? 0 : 1) ||
                (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
                a.symbol.localeCompare(b.symbol),
            );
          setTicker(priced);
          const newest = priced
            .map((a) => a.quote?.fetchedAt)
            .filter((d): d is Date => d instanceof Date)
            .sort((x, y) => y.getTime() - x.getTime())[0];
          setTickerAt(newest ?? new Date());
        })
        .catch(() => {});

    loadTicker();
    getPlatformSettings().then(setPlatformSettings).catch(() => {});

    const id = setInterval(loadTicker, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const refreshUnseen = () => {
      getAlertsForUser(user.uid)
        .then((alerts) => setUnseenAlerts(alerts.filter((a) => a.status === 'triggered' && !a.seen).length))
        .catch(() => {});
    };
    refreshUnseen();
    const interval = setInterval(refreshUnseen, 60_000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <WorkspaceGuard>
      <div className="sg-shell lg:flex">
        {navOpen && (
          <div
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: 'rgba(2,6,23,.65)' }}
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-56 max-w-[80vw] border-r flex flex-col
            transition-transform duration-200 ease-out
            lg:static lg:z-auto lg:transform-none lg:max-w-none lg:shrink-0
            ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}
          style={{ borderColor: 'var(--sg-border)', background: 'var(--sg-bg-panel)' }}
        >
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            aria-label="Close menu"
            className="lg:hidden absolute top-2 right-2 sg-tap-target"
            style={{ color: 'var(--sg-muted)' }}
          >
            <X className="h-5 w-5" />
          </button>
          <div className="p-4 border-b" style={{ borderColor: 'var(--sg-border)' }}>
            <img src="/logo.png" alt="SafeGuard Securities" className="h-10 w-auto max-w-full object-contain" />
            <p
              className="text-[10px] uppercase mt-3"
              style={{ letterSpacing: '0.2em', color: 'var(--sg-muted-2)', fontFamily: 'var(--sg-font-body)' }}
            >
              Workspace
            </p>
          </div>

          <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
            {mainNav.map(({ to, label, icon: Icon, end, badge }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 lg:py-2 text-sm transition ${
                    isActive ? 'sg-nav-active' : ''
                  }`
                }
                style={({ isActive }) =>
                  isActive
                    ? undefined
                    : { color: 'var(--sg-muted)' }
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1" style={{ fontFamily: 'var(--sg-font-body)' }}>
                  {label}
                </span>
                {badge && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded border"
                    style={{
                      background: 'rgba(251,191,36,.15)',
                      color: 'var(--sg-gold)',
                      borderColor: 'rgba(251,191,36,.3)',
                      fontFamily: 'var(--sg-font-display)',
                    }}
                  >
                    {badge}
                  </span>
                )}
              </NavLink>
            ))}

            <SettingsFlyout />
          </nav>

          <div className="p-2 border-t space-y-0.5" style={{ borderColor: 'var(--sg-border)' }}>
            {footerNav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 lg:py-2 text-sm transition ${
                    isActive ? 'sg-nav-active' : ''
                  }`
                }
                style={({ isActive }) => (isActive ? undefined : { color: 'var(--sg-muted-2)' })}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={async () => {
                await signOut();
                window.location.href = 'https://safeguardsecurities.us';
              }}
              className="w-full flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 lg:py-2 text-sm transition"
              style={{ color: 'var(--sg-muted-2)' }}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign Out
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header
            className="border-b px-3 sm:px-5 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30"
            style={{ borderColor: 'var(--sg-border)', background: 'var(--sg-bg-panel)' }}
          >
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Open menu"
              aria-expanded={navOpen}
              className="sg-tap-target lg:hidden -ml-2"
              style={{ color: 'var(--sg-text)' }}
            >
              <Menu className="h-5 w-5" />
            </button>
            <img src="/logo.png" alt="" className="h-7 sm:h-8 w-auto max-w-[130px] sm:max-w-[160px] object-contain" />
            <div className="flex items-center gap-3 ml-auto">
              <ThemeToggle />
              {/* Trade Desk entry: always visible; standard-tier clients see a
                  gold lock and land on the "by invitation" screen. */}
              <button
                type="button"
                onClick={() => navigate('/trade-desk')}
                title={canSelfTrade(profile) ? undefined : 'Reserved for Advanced & Institutional clients'}
                className="hidden md:flex items-center gap-2 text-xs rounded-[10px] px-3 py-1.5 border"
                style={{ color: 'var(--sg-muted)', borderColor: 'var(--sg-border-strong)' }}
              >
                {canSelfTrade(profile)
                  ? <ExternalLink className="h-3.5 w-3.5" />
                  : <Lock className="h-3.5 w-3.5" style={{ color: 'var(--sg-gold)' }} />}
                Trade Desk
              </button>
              <ClientNotificationBell />
              {unseenAlerts > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/workspace/alerts')}
                  className="relative p-2"
                  style={{ color: 'var(--sg-muted)' }}
                  title="Price alerts"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500" />
                </button>
              )}
              <div className="flex items-center gap-2 pl-2 border-l" style={{ borderColor: 'var(--sg-border)' }}>
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold text-white"
                  style={{ background: 'var(--sg-btn-grad)', fontFamily: 'var(--sg-font-display)' }}
                >
                  {initial}
                </div>
                <span className="text-sm hidden sm:block" style={{ color: 'var(--sg-muted)' }}>
                  {displayName}
                </span>
              </div>
            </div>
          </header>

          {isPreview && (
            <div
              className="border-b px-5 py-2.5 text-sm flex flex-wrap items-center justify-between gap-2"
              style={{
                borderColor: 'rgba(251,191,36,.35)',
                background: 'rgba(251,191,36,.12)',
                color: 'var(--sg-text)',
              }}
            >
              <span>
                <strong>Preview mode</strong> — your account is still under review.
                {showSkippedNudge
                  ? ' Complete your profile setup to fund your account once approved.'
                  : ' Full trading access unlocks after activation.'}
              </span>
              <div className="flex items-center gap-3">
                {showSkippedNudge && (
                  <NavLink to="/onboarding" className="underline text-sm" style={{ color: 'var(--sg-gold)' }}>
                    Complete profile
                  </NavLink>
                )}
                <NavLink to="/activation" className="underline text-sm" style={{ color: 'var(--sg-gold)' }}>
                  Activation status
                </NavLink>
              </div>
            </div>
          )}

          {platformSettings?.announcementEnabled && platformSettings.announcementMessage && (
            <div
              className="border-b px-3 sm:px-5 py-2.5 text-sm flex items-start gap-2"
              style={{
                borderColor: 'rgba(99,102,241,.3)',
                background: 'rgba(99,102,241,.1)',
                color: 'var(--sg-text)',
              }}
            >
              <Megaphone className="h-4 w-4 shrink-0" style={{ color: 'var(--sg-indigo)' }} />
              <span>{platformSettings.announcementMessage}</span>
            </div>
          )}

          {ticker.length > 0 && (
            <div
              className="border-b px-3 sm:px-5 py-2 flex items-center gap-3 sm:gap-4 overflow-hidden text-xs"
              style={{ borderColor: 'var(--sg-border)', background: 'var(--sg-bg-elevated)' }}
            >
              <span
                className="flex items-center gap-1.5 shrink-0 font-medium"
                style={{ color: 'var(--sg-teal)', fontFamily: 'var(--sg-font-display)' }}
              >
                <Radio className="h-3 w-3" />
                Live Data
              </span>
              <div className="sg-ticker-viewport">
                <div
                  className="sg-ticker-track"
                  style={{ animationDuration: `${Math.max(30, ticker.length * 3)}s` }}
                >
                  {[0, 1].map((copy) =>
                    ticker.map((a) => (
                      <span
                        key={`${copy}-${a.symbol}`}
                        aria-hidden={copy === 1}
                        title={a.name}
                        style={{ color: 'var(--sg-muted)' }}
                      >
                        <span className="font-medium" style={{ color: 'var(--sg-text)' }}>
                          {a.symbol}
                        </span>{' '}
                        {formatTickerPrice(a.quote!.price)}{' '}
                        <span
                          style={{
                            color: a.quote!.changePercent >= 0 ? 'var(--sg-teal)' : 'var(--sg-danger)',
                          }}
                        >
                          {a.quote!.changePercent >= 0 ? '+' : ''}
                          {a.quote!.changePercent.toFixed(2)}%
                        </span>
                      </span>
                    )),
                  )}
                </div>
              </div>

              {tickerAt && (
                <span
                  className="shrink-0 tabular-nums"
                  style={{ color: 'var(--sg-muted-2)' }}
                  title="Time of last quote refresh"
                >
                  {tickerAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          )}

          <main className="flex-1 overflow-auto p-4 sm:p-5 md:p-6 relative z-10">
            <Outlet context={{ displayName }} />
          </main>
        </div>
      </div>
    </WorkspaceGuard>
  );
}

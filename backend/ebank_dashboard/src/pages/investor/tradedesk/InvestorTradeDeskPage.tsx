import { Fragment, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Search,
  Star,
  TrendingUp,
  Wallet,
  ClipboardList,
  History as HistoryIcon,
  Bell,
  Newspaper,
  Calendar,
  SlidersHorizontal,
  Settings as SettingsIcon,
  LogOut,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Lock,
  Flame,
} from 'lucide-react';
import { useInvestorAuth } from '../../../contexts/InvestorAuthContext';
import { canSelfTrade } from '../../../services/investor/profileService';
import { termsForSet } from '../../../lib/assetTerminology';
import FundingRequiredNotice from '../../../components/investor/FundingRequiredNotice';
import TradingRecord from '../../../components/investor/TradingRecord';
import ThemeToggle from '../../../components/ui/ThemeToggle';
import {
  getPortfolioStatsForUser,
  getUserPortfolio,
  PORTFOLIO_MARK_REFRESH_MS,
  type PortfolioHolding,
  type PortfolioStats,
} from '../../../services/investor/portfolioService';
import { getUserWallet, type InvestorWallet } from '../../../services/investor/walletService';
import { createOrder, getOrdersForUser, type InvestorOrder } from '../../../services/investor/orderService';
import { getTradesForUser, type Trade } from '../../../services/investor/tradesService';
import { getFundingRequestsForUser, type FundingRequest } from '../../../services/investor/fundingService';
import { getQuote, type MarketQuote } from '../../../services/investor/marketService';
import { getWatchlistSymbols, addToWatchlist, removeFromWatchlist } from '../../../services/investor/watchlistService';
import {
  getAllAssets,
  getAssetGroups,
  type Asset,
  type AssetClass,
  type AssetGroup,
} from '../../../services/investor/assetCatalogService';
import '../../../styles/safeguardTheme.css';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

type MarketCategoryKey = 'indices' | 'fx' | 'crypto' | 'shares' | 'commodities' | 'etfs' | 'options';

type Panel =
  | { kind: 'positions' }
  | { kind: 'orders' }
  | { kind: 'history' }
  | { kind: 'market'; category: MarketCategoryKey };

// assetClass: null means no Asset Management catalog exists for this market
// yet (no data source), so it stays locked. The unlocked ones are backed by
// the live `assets` Firestore collection (see assetCatalogService.ts).
const MARKET_CATEGORIES: { key: MarketCategoryKey; label: string; assetClass: AssetClass | null }[] = [
  { key: 'indices', label: 'Indices', assetClass: 'benchmark_index' },
  { key: 'fx', label: 'FX', assetClass: 'fx' },
  { key: 'crypto', label: 'Cryptocurrency', assetClass: 'crypto' },
  { key: 'shares', label: 'Shares', assetClass: 'equity' },
  { key: 'commodities', label: 'Commodities', assetClass: 'commodity_future' },
  { key: 'etfs', label: 'ETFs', assetClass: 'etf' },
  { key: 'options', label: 'Options', assetClass: null },
];

// Kept in sync with InvestorWorkspaceLayout's canPreviewWorkspace - this page
// sits outside the /workspace layout tree so it doesn't inherit that guard.
function canPreviewWorkspace(status: string | undefined, canBrowseWorkspace: boolean): boolean {
  if (!canBrowseWorkspace) return false;
  return status === 'active' || status === 'pending';
}

export default function InvestorTradeDeskPage() {
  const { user, isAdmin, accountStatus, canBrowseWorkspace, isFunded, profile, loading, signOut } = useInvestorAuth();
  const navigate = useNavigate();

  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [wallet, setWallet] = useState<InvestorWallet | null>(null);
  const [orders, setOrders] = useState<InvestorOrder[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [fundingRequests, setFundingRequests] = useState<FundingRequest[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [panel, setPanel] = useState<Panel>({ kind: 'positions' });

  const [searchSymbol, setSearchSymbol] = useState('');
  const [searchResult, setSearchResult] = useState<MarketQuote | null>(null);
  const [searching, setSearching] = useState(false);

  const [orderSymbol, setOrderSymbol] = useState('');
  const [orderSide, setOrderSide] = useState<InvestorOrder['side']>('buy');
  const [orderQty, setOrderQty] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>([]);
  const [marketAssets, setMarketAssets] = useState<Partial<Record<MarketCategoryKey, Asset[]>>>({});
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);

  useEffect(() => {
    getAssetGroups().catch(() => []).then((g) => setAssetGroups(g ?? []));
  }, []);

  useEffect(() => {
    if (!user) return;
    getWatchlistSymbols(user.uid).then(setWatchlistSymbols).catch(() => {});
  }, [user]);

  const toggleWatchlist = async (symbol: string) => {
    if (!user) return;
    const isWatched = watchlistSymbols.includes(symbol);
    setWatchlistSymbols((prev) => (isWatched ? prev.filter((s) => s !== symbol) : [...prev, symbol]));
    try {
      if (isWatched) await removeFromWatchlist(user.uid, symbol);
      else await addToWatchlist(user.uid, symbol);
    } catch (err) {
      setWatchlistSymbols((prev) => (isWatched ? [...prev, symbol] : prev.filter((s) => s !== symbol)));
      toast.error(err instanceof Error ? err.message : 'Failed to update watchlist');
    }
  };

  const groupLabelMap = useMemo(() => new Map(assetGroups.map((g) => [g.id, g.label])), [assetGroups]);

  const openMarketCategory = (key: MarketCategoryKey) => {
    const cat = MARKET_CATEGORIES.find((c) => c.key === key)!;
    if (!cat.assetClass) {
      toast('This market is locked for now.');
      return;
    }
    setPanel({ kind: 'market', category: key });
    if (marketAssets[key]) return;
    setLoadingMarket(true);
    getAllAssets(cat.assetClass)
      .then((assets) => setMarketAssets((prev) => ({ ...prev, [key]: assets })))
      .catch(() => toast.error('Failed to load market catalog'))
      .finally(() => setLoadingMarket(false));
  };

  const quickTrade = (symbol: string) => {
    setOrderSymbol(symbol);
    setPanel({ kind: 'orders' });
  };

  const load = () => {
    if (!user) return;
    Promise.all([
      getUserPortfolio(user.uid),
      getPortfolioStatsForUser(user.uid),
      getUserWallet(user.uid),
      getOrdersForUser(user.uid),
      getTradesForUser(user.uid),
      getFundingRequestsForUser(user.uid),
    ])
      .then(([h, s, w, o, t, f]) => {
        setHoldings(h);
        setStats(s);
        setWallet(w);
        setOrders(o);
        setTrades(t);
        setFundingRequests(f);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load trade desk'))
      .finally(() => setDataLoading(false));
  };

  useEffect(load, [user]);

  useEffect(() => {
    if (!user) return;
    const timer = window.setInterval(load, PORTFOLIO_MARK_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [user]);

  if (loading) {
    return (
      <div className="sg-shell flex items-center justify-center" style={{ color: 'var(--sg-muted)' }}>
        Loading...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (!canPreviewWorkspace(accountStatus, canBrowseWorkspace)) return <Navigate to="/activation" replace />;

  // Self-managed trading is reserved for advanced / institutional clients
  // (profile.investorTier, set by staff in Admin -> Users). Standard clients
  // keep their full /workspace (wallet, funding, portfolio, statements) -
  // only this desk is gated. Mirrored server-side in firestore.rules
  // (adminOrders create) so the block is not just cosmetic.
  if (!canSelfTrade(profile)) {
    return (
      <div className="sg-shell sg-shell-grid py-10 px-4">
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <img src="/logo.png" alt="SafeGuard Securities" className="h-8 w-auto" />
            <ThemeToggle />
          </div>
          <div className="sg-panel p-8 text-center space-y-4" style={{ borderRadius: 18 }}>
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: 'rgba(212,175,55,.14)' }}
            >
              <Lock className="h-6 w-6" style={{ color: 'var(--sg-gold)' }} />
            </div>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
              Self-managed trading is by invitation
            </h1>
            <p className="text-sm" style={{ color: 'var(--sg-muted)' }}>
              The Trade Desk — placing your own buy and sell orders — is reserved for our
              Advanced partners and Institutional-level investors. Your portfolio is
              professionally managed by the SafeGuard desk in the meantime, and everything
              else in your workspace remains available.
            </p>
            <p className="text-sm" style={{ color: 'var(--sg-muted)' }}>
              Interested in qualifying? Contact your account manager
              {profile?.accountManager?.email ? (
                <> at <span style={{ color: 'var(--sg-teal)' }}>{profile.accountManager.email}</span></>
              ) : (
                <> or our support team</>
              )}{' '}
              about Advanced or Institutional access.
            </p>
            <button type="button" className="sg-btn-primary" onClick={() => navigate('/workspace/dashboard')}>
              Back to my workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isFunded) {
    return (
      <div className="sg-shell sg-shell-grid py-10 px-4">
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <img src="/logo.png" alt="SafeGuard Securities" className="h-8 w-auto" />
            <ThemeToggle />
          </div>
          <FundingRequiredNotice
            title="Fund your account to open the trading workspace"
            description="Live order entry, positions, and market tools activate once your account has a funded balance."
          />
          <div className="text-center mt-6">
            <button type="button" onClick={() => signOut()} className="sg-btn-ghost">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const symbol = searchSymbol.trim().toUpperCase();
    if (!symbol) return;
    setSearching(true);
    try {
      const quote = await getQuote(symbol);
      setSearchResult(quote);
    } catch {
      toast.error('Failed to fetch quote');
    } finally {
      setSearching(false);
    }
  };

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(orderQty);
    if (!user || !orderSymbol.trim() || !qty || qty <= 0) {
      toast.error('Enter a symbol and quantity');
      return;
    }
    setSubmittingOrder(true);
    try {
      await createOrder(user.uid, profile?.email ?? user.email ?? '', orderSymbol.trim(), orderSide, qty);
      toast.success('Order submitted for execution');
      setOrderSymbol('');
      setOrderQty('');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit order');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const s = stats ?? { totalValue: 0, totalGain: 0, totalGainPercent: 0, dayChange: 0, dayChangePercent: 0, holdingsCount: 0 };
  const posTerms = termsForSet(holdings.map((h) => h.assetClass));
  const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'working');

  const navItem = (
    active: boolean,
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
    badge?: number,
    locked?: boolean,
  ) => (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm transition text-left"
      style={
        active
          ? { background: 'rgba(99,102,241,.18)', color: 'var(--sg-indigo)' }
          : { color: locked ? 'var(--sg-muted-2)' : 'var(--sg-muted)', opacity: locked ? 0.65 : 1 }
      }
    >
      {icon}
      <span className="flex-1">{label}</span>
      {locked && <Lock className="h-3 w-3 shrink-0" />}
      {badge !== undefined && badge > 0 && (
        <span
          className="text-[10px] font-bold px-1.5 rounded-full"
          style={{ background: 'var(--sg-btn-grad)', color: '#fff' }}
        >
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div className="sg-shell sg-shell-grid flex flex-col h-screen overflow-hidden">
      {/* Top account bar */}
      <header
        className="border-b px-4 py-2 flex items-center gap-4 shrink-0 flex-wrap"
        style={{ borderColor: 'var(--sg-border)', background: 'var(--sg-bg-panel)' }}
      >
        <img src="/logo.png" alt="SafeGuard Securities" className="h-7 w-auto max-w-[140px] object-contain" />
        <span className="text-sm font-semibold hidden sm:block" style={{ color: 'var(--sg-text)', fontFamily: 'var(--sg-font-display)' }}>
          Trading Desk
        </span>

        <div className="flex items-center gap-6 ml-2 text-xs">
          <div>
            <p style={{ color: 'var(--sg-muted-2)' }}>Funds</p>
            <p className="font-semibold" style={{ color: 'var(--sg-text)' }}>{fmt(wallet?.balance ?? 0)}</p>
          </div>
          <div>
            <p style={{ color: 'var(--sg-muted-2)' }}>Total P/L</p>
            <p className="font-semibold" style={{ color: s.totalGain >= 0 ? 'var(--sg-teal)' : 'var(--sg-danger)' }}>
              {fmt(s.totalGain)}
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--sg-muted-2)' }}>Portfolio Value</p>
            <p className="font-semibold" style={{ color: 'var(--sg-text)' }}>{fmt(s.totalValue)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button type="button" onClick={() => navigate('/workspace/wallet')} className="sg-btn-ghost !px-3 !py-1.5 text-xs">
            Manage Funds
          </button>
          <button type="button" onClick={() => navigate('/workspace/wallet')} className="sg-btn-primary !px-3 !py-1.5 text-xs">
            Add Funds
          </button>
          <button
            type="button"
            onClick={() => navigate('/workspace/dashboard')}
            className="text-xs px-3 py-1.5 rounded-[8px] border"
            style={{ color: 'var(--sg-muted)', borderColor: 'var(--sg-border-strong)' }}
          >
            Exit Desk
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Left sidebar */}
        <aside
          className="w-56 border-r flex flex-col shrink-0 overflow-y-auto"
          style={{ borderColor: 'var(--sg-border)', background: 'var(--sg-bg-panel)' }}
        >
          <form onSubmit={runSearch} className="p-3 border-b" style={{ borderColor: 'var(--sg-border)' }}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: 'var(--sg-muted-2)' }} />
              <input
                type="text"
                value={searchSymbol}
                onChange={(e) => setSearchSymbol(e.target.value)}
                placeholder="Quick quote (e.g. AAPL)"
                className="sg-input !py-1.5 !pl-8 text-xs"
              />
            </div>
            {searchResult && (
              <div className="mt-2 text-xs flex items-center justify-between">
                <span className="font-semibold" style={{ color: 'var(--sg-text)' }}>{searchResult.symbol}</span>
                <span style={{ color: 'var(--sg-text)' }}>{fmt(searchResult.price)}</span>
                <span
                  className="flex items-center gap-0.5"
                  style={{ color: searchResult.changePercent >= 0 ? 'var(--sg-teal)' : 'var(--sg-danger)' }}
                >
                  {searchResult.changePercent >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {pct(searchResult.changePercent)}
                </span>
              </div>
            )}
            {searching && <p className="mt-2 text-xs" style={{ color: 'var(--sg-muted-2)' }}>Fetching...</p>}
          </form>

          <div className="p-2">
            <p className="text-[10px] uppercase px-2 mt-2 mb-1" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.12em' }}>
              Markets
            </p>
            {MARKET_CATEGORIES.map((cat) => {
              const locked = !cat.assetClass;
              return navItem(
                !locked && panel.kind === 'market' && panel.category === cat.key,
                locked ? <TrendingUp className="h-4 w-4 shrink-0" /> : <Flame className="h-4 w-4 shrink-0" />,
                cat.label,
                () => openMarketCategory(cat.key),
                undefined,
                locked,
              );
            })}

            <p className="text-[10px] uppercase px-2 mt-4 mb-1" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.12em' }}>
              Watchlists
            </p>
            {navItem(false, <Star className="h-4 w-4 shrink-0" />, 'My Watchlist', () =>
              navigate('/workspace/watchlist'),
            )}

            <p className="text-[10px] uppercase px-2 mt-4 mb-1" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.12em' }}>
              Account
            </p>
            {navItem(
              panel.kind === 'positions',
              <Wallet className="h-4 w-4 shrink-0" />,
              'Positions',
              () => setPanel({ kind: 'positions' }),
              holdings.length,
            )}
            {navItem(
              panel.kind === 'orders',
              <ClipboardList className="h-4 w-4 shrink-0" />,
              'Orders',
              () => setPanel({ kind: 'orders' }),
              pendingOrders.length,
            )}
            {navItem(
              panel.kind === 'history',
              <HistoryIcon className="h-4 w-4 shrink-0" />,
              'History',
              () => setPanel({ kind: 'history' }),
            )}
            {navItem(false, <Bell className="h-4 w-4 shrink-0" />, 'Alerts', () => navigate('/workspace/alerts'))}

            <p className="text-[10px] uppercase px-2 mt-4 mb-1" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.12em' }}>
              Research
            </p>
            {navItem(false, <Newspaper className="h-4 w-4 shrink-0" />, 'News', () => toast('News is coming soon.'))}
            {navItem(false, <Calendar className="h-4 w-4 shrink-0" />, 'Economic Calendar', () =>
              toast('Economic calendar is coming soon.'),
            )}
            {navItem(false, <SlidersHorizontal className="h-4 w-4 shrink-0" />, 'Stock Screener', () =>
              toast('Stock screener is coming soon.'),
            )}
          </div>

          <div className="mt-auto p-2 border-t" style={{ borderColor: 'var(--sg-border)' }}>
            {navItem(false, <SettingsIcon className="h-4 w-4 shrink-0" />, 'Settings', () => navigate('/workspace/settings'))}
            <button
              type="button"
              onClick={async () => {
                await signOut();
                window.location.href = 'https://safeguardsecurities.us';
              }}
              className="w-full flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm"
              style={{ color: 'var(--sg-muted-2)' }}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main canvas */}
        <main className="flex-1 overflow-y-auto p-5">
          {dataLoading ? (
            <p style={{ color: 'var(--sg-muted)' }}>Loading...</p>
          ) : panel.kind === 'market' ? (
            (() => {
              const cat = MARKET_CATEGORIES.find((c) => c.key === panel.category)!;
              const assets = marketAssets[panel.category] ?? [];
              const grouped = new Map<string, Asset[]>();
              for (const a of assets) {
                const list = grouped.get(a.groupId) ?? [];
                list.push(a);
                grouped.set(a.groupId, list);
              }
              return (
                <div className="space-y-2">
                  <div>
                    <h2 className="font-semibold text-sm" style={{ color: 'var(--sg-text)', fontFamily: 'var(--sg-font-display)' }}>
                      {cat.label}
                    </h2>
                    <p className="text-[11px]" style={{ color: 'var(--sg-muted-2)' }}>
                      Live prices refresh automatically every few minutes. Click a row to trade.
                    </p>
                  </div>
                  {loadingMarket ? (
                    <p style={{ color: 'var(--sg-muted)' }}>Loading live prices...</p>
                  ) : assets.length === 0 ? (
                    <p style={{ color: 'var(--sg-muted)' }}>No instruments in this catalog yet.</p>
                  ) : (
                    <div className="sg-panel overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="sg-text-muted">
                          <tr>
                            <th className="py-1.5 px-3 w-8"></th>
                            <th className="text-left py-1.5 px-3">Instrument</th>
                            <th className="text-right py-1.5 px-3">Price</th>
                            <th className="text-right py-1.5 px-3">Change</th>
                            <th className="text-right py-1.5 px-3">% Change</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from(grouped.entries()).map(([groupId, groupAssets]) => (
                            <Fragment key={groupId}>
                              <tr className="border-t sg-row-border">
                                <td
                                  colSpan={5}
                                  className="py-1 px-3 text-[10px] uppercase font-semibold"
                                  style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.1em', background: 'var(--sg-surface)' }}
                                >
                                  {groupLabelMap.get(groupId) ?? groupId}
                                </td>
                              </tr>
                              {groupAssets.map((asset) => {
                                const q = asset.quote;
                                const up = (q?.changePercent ?? 0) >= 0;
                                const tradeSymbol = asset.quoteSymbol ?? asset.symbol;
                                const canTrade = Boolean(asset.isTradable && asset.quoteSymbol);
                                return (
                                  <tr
                                    key={asset.id}
                                    className="border-t sg-row-border"
                                    style={canTrade ? { cursor: 'pointer' } : undefined}
                                    onClick={() => canTrade && quickTrade(tradeSymbol)}
                                  >
                                    <td className="py-1 px-3" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        onClick={() => toggleWatchlist(asset.symbol)}
                                        className="p-0.5"
                                        title={watchlistSymbols.includes(asset.symbol) ? 'Remove from watchlist' : 'Add to watchlist'}
                                      >
                                        <Star
                                          className="h-3.5 w-3.5"
                                          style={
                                            watchlistSymbols.includes(asset.symbol)
                                              ? { fill: 'var(--sg-gold)', color: 'var(--sg-gold)' }
                                              : { color: 'var(--sg-muted-2)' }
                                          }
                                        />
                                      </button>
                                    </td>
                                    <td className="py-1 px-3 sg-text-main">
                                      <span
                                        className="inline-block h-1.5 w-1.5 rounded-full mr-2"
                                        style={{ background: q ? (up ? 'var(--sg-teal)' : 'var(--sg-danger)') : 'var(--sg-muted-2)' }}
                                      />
                                      {asset.name}{' '}
                                      <span style={{ color: 'var(--sg-muted-2)' }}>
                                        ({asset.symbol}{asset.quoteSymbol && asset.quoteSymbol !== asset.symbol ? ` · ${asset.quoteSymbol}` : ''})
                                      </span>
                                      {!asset.quoteSymbol && (
                                        <span
                                          className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded"
                                          style={{ background: 'rgba(148,163,184,.15)', color: 'var(--sg-muted-2)' }}
                                        >
                                          REFERENCE
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-1 px-3 text-right sg-text-main">{q ? fmt(q.price) : '—'}</td>
                                    <td className="py-1 px-3 text-right" style={{ color: q ? (up ? 'var(--sg-teal)' : 'var(--sg-danger)') : 'var(--sg-muted-2)' }}>
                                      {q ? fmt(q.change) : '—'}
                                    </td>
                                    <td className="py-1 px-3 text-right" style={{ color: q ? (up ? 'var(--sg-teal)' : 'var(--sg-danger)') : 'var(--sg-muted-2)' }}>
                                      <span className="inline-flex items-center gap-0.5">
                                        {q && (up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />)}
                                        {q ? pct(q.changePercent) : '—'}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()
          ) : panel.kind === 'positions' ? (
            <div className="space-y-4">
              <h2 className="font-semibold" style={{ color: 'var(--sg-text)', fontFamily: 'var(--sg-font-display)' }}>Positions</h2>
              <div className="sg-panel overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="sg-text-muted">
                    <tr>
                      <th className="text-left p-3">Symbol</th>
                      <th className="text-left p-3">Name</th>
                      <th className="text-right p-3">{posTerms.quantityLabel}</th>
                      <th className="text-right p-3">{posTerms.costLabel}</th>
                      <th className="text-right p-3">Mark</th>
                      <th className="text-right p-3">Change</th>
                      <th className="text-right p-3">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((h) => (
                      <tr key={h.id} className="border-t sg-row-border">
                        <td className="p-3 font-semibold sg-text-main">{h.symbol}</td>
                        <td className="p-3 sg-text-muted">{h.name}</td>
                        <td className="p-3 text-right sg-text-main">{h.shares.toLocaleString()}</td>
                        <td className="p-3 text-right sg-text-muted">{fmt(h.averagePrice)}</td>
                        <td className="p-3 text-right sg-text-main">
                          {fmt(h.price)}
                          {h.markedAtCost && (
                            <span className="block text-[10px]" style={{ color: 'var(--sg-muted-2)' }}
                              title="No live market price for this instrument — valued at entry cost">
                              at cost
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right" style={{ color: h.changePercent >= 0 ? 'var(--sg-teal)' : 'var(--sg-danger)' }}>
                          {pct(h.changePercent)}
                        </td>
                        <td className="p-3 text-right sg-text-main">{fmt(h.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {holdings.length === 0 && <p className="p-8 text-center sg-text-muted">No open positions.</p>}
              </div>
            </div>
          ) : panel.kind === 'orders' ? (
            <div className="space-y-4">
              <h2 className="font-semibold" style={{ color: 'var(--sg-text)', fontFamily: 'var(--sg-font-display)' }}>Orders</h2>
              <form onSubmit={submitOrder} className="sg-card p-4 flex flex-col sm:flex-row gap-3" style={{ borderRadius: 12 }}>
                <input
                  type="text"
                  value={orderSymbol}
                  onChange={(e) => setOrderSymbol(e.target.value)}
                  placeholder="Symbol"
                  className="sg-input"
                />
                <select value={orderSide} onChange={(e) => setOrderSide(e.target.value as InvestorOrder['side'])} className="sg-input sm:w-32">
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
                <input
                  type="number"
                  min="1"
                  value={orderQty}
                  onChange={(e) => setOrderQty(e.target.value)}
                  placeholder="Quantity"
                  className="sg-input sm:w-32"
                />
                <button type="submit" disabled={submittingOrder} className="sg-btn-primary sm:w-auto">
                  {submittingOrder ? 'Submitting...' : 'Place Order'}
                </button>
              </form>
              <div className="sg-panel overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="sg-text-muted">
                    <tr>
                      <th className="text-left p-3">Symbol</th>
                      <th className="text-left p-3">Side</th>
                      <th className="text-right p-3">Qty</th>
                      <th className="text-left p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingOrders.map((o) => (
                      <tr key={o.id} className="border-t sg-row-border">
                        <td className="p-3 font-semibold sg-text-main">{o.symbol}</td>
                        <td className="p-3 uppercase sg-text-muted">{o.side}</td>
                        <td className="p-3 text-right sg-text-main">{o.quantity}</td>
                        <td className="p-3" style={{ color: 'var(--sg-gold)' }}>Pending</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pendingOrders.length === 0 && <p className="p-8 text-center sg-text-muted">No open orders.</p>}
              </div>
            </div>
          ) : (
            <TradingRecord trades={trades} refreshLabel="Opens with this desk session" />
          )}
        </main>

        {/* Right panel - real activity feed, not fake notifications */}
        <aside
          className="w-72 border-l shrink-0 overflow-y-auto hidden xl:block"
          style={{ borderColor: 'var(--sg-border)', background: 'var(--sg-bg-panel)' }}
        >
          <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--sg-border)' }}>
            <Sparkles className="h-4 w-4" style={{ color: 'var(--sg-indigo)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--sg-text)' }}>Recent Activity</p>
          </div>
          <div className="p-3 space-y-2">
            {[...orders.map((o) => ({
              id: `o-${o.id}`,
              text: `${o.side.toUpperCase()} ${o.quantity} ${o.symbol} — ${o.status}`,
              date: o.createdAt,
            })), ...fundingRequests.map((f) => ({
              id: `f-${f.id}`,
              text: `Funding request ${fmt(f.amount)} — ${f.status}`,
              date: f.createdAt,
            }))]
              .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
              .slice(0, 15)
              .map((item) => (
                <div key={item.id} className="sg-card p-3 text-xs" style={{ borderRadius: 10 }}>
                  <p style={{ color: 'var(--sg-text)' }}>{item.text}</p>
                  <p className="mt-1" style={{ color: 'var(--sg-muted-2)' }}>
                    {item.date ? item.date.toLocaleString() : '—'}
                  </p>
                </div>
              ))}
            {orders.length === 0 && fundingRequests.length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: 'var(--sg-muted-2)' }}>No activity yet.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { TrendingUp } from 'lucide-react';
import { getAllInvestorProfiles, type InvestorProfile } from '../../../../services/investor/profileService';
import { getAllAssets, getAssetGroups, type Asset, type AssetClass, type AssetGroup } from '../../../../services/investor/assetCatalogService';
import { placeOrderOnBehalf, fillOrder } from '../../../../services/investor/tradingService';
import { getSubPortfoliosForUser, type SubPortfolio } from '../../../../services/investor/subPortfolioService';
import { useInvestorAuth } from '../../../../contexts/InvestorAuthContext';
import { logAction } from '../../../../services/investor/auditService';
import { CONTRACT_MONTH_COMMODITIES, generateFuturesContractMonths } from '../../../../lib/futuresContractMonths';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const MAX_COMMISSION_PERCENT = 5;

const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  commodity_future: 'Commodities & Futures',
  equity: 'Equities',
  etf: 'ETFs',
  benchmark_index: 'Indices',
  fx: 'Forex',
  crypto: 'Cryptocurrency',
  option: 'Options',
  warrant: 'Warrants',
  bond: 'Bonds',
  other: 'Other',
};

// Options contracts are only offered as an overlay on Commodities & Futures
// (matching how the underlying instrument works in practice) - every other
// asset class gets a lean, class-appropriate field set instead of a generic
// one-size-fits-all form.
const SHARE_LIKE_CLASSES: AssetClass[] = ['equity', 'etf', 'benchmark_index'];

interface Props {
  onOrderPlaced: () => void;
}

export default function AdminTradeEntryPanel({ onOrderPlaced }: Props) {
  const { user: adminUser, profile: adminProfile } = useInvestorAuth();
  const [investors, setInvestors] = useState<InvestorProfile[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetGroups, setAssetGroups] = useState<AssetGroup[]>([]);

  const [investorId, setInvestorId] = useState('');
  const [sleeves, setSleeves] = useState<SubPortfolio[]>([]);
  const [subPortfolioId, setSubPortfolioId] = useState('');
  const [assetClass, setAssetClass] = useState<AssetClass>('equity');
  const [assetId, setAssetId] = useState('');
  const [instrumentQuery, setInstrumentQuery] = useState('');

  // Commodities & Futures cascade: Commodity Class (group) -> Sub-Category
  // (specific commodity) -> Contract/Symbol (generated month, where wired).
  const [commodityGroupId, setCommodityGroupId] = useState('');
  const [contractMonthSymbol, setContractMonthSymbol] = useState('');
  const [contractMonthLabel, setContractMonthLabel] = useState('');

  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop' | 'stop_limit'>('limit');
  const [timeInForce, setTimeInForce] = useState<'day' | 'gtc' | 'ioc' | 'fok'>('day');
  const [deliveryType, setDeliveryType] = useState<'' | 'cash_settled' | 'physical'>('');

  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [contractPrice, setContractPrice] = useState('');
  const [entryUnderlyingPrice, setEntryUnderlyingPrice] = useState('');
  const [fees, setFees] = useState('0');
  const [commissionPercent, setCommissionPercent] = useState('2');
  const [optionType, setOptionType] = useState<'' | 'call' | 'put'>('');
  const [strikePrice, setStrikePrice] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [busy, setBusy] = useState<'queue' | 'execute' | null>(null);

  useEffect(() => {
    getAllInvestorProfiles()
      .then((rows) => setInvestors(rows.filter((r) => r.role === 'client')))
      .catch(() => toast.error('Failed to load investors'));
    getAllAssets()
      .then(setAssets)
      .catch(() => toast.error('Failed to load asset catalog'));
    getAssetGroups()
      .then(setAssetGroups)
      .catch(() => toast.error('Failed to load asset taxonomy'));
  }, []);

  useEffect(() => {
    setSubPortfolioId('');
    if (!investorId) {
      setSleeves([]);
      return;
    }
    getSubPortfoliosForUser(investorId)
      .then(setSleeves)
      .catch(() => setSleeves([]));
  }, [investorId]);

  const investor = investors.find((i) => i.id === investorId);
  const asset = assets.find((a) => a.id === assetId);
  // Options reach the desk two ways: as their own asset class, and as an
  // overlay on a Commodities & Futures instrument. They are the same product,
  // so both paths must get the same fields and the same maths. Checking only
  // optionType meant an `option` asset class silently fell through to the
  // plain-instrument path with no strike, no expiry, and no premium.
  const isOption = asset?.assetClass === 'option';
  const isOptionsContract = isOption || optionType !== '';

  const filteredAssets = useMemo(() => {
    const needle = instrumentQuery.trim().toLowerCase();
    return assets
      .filter((a) => a.assetClass === assetClass && a.isTradable)
      .filter((a) => !needle || a.symbol.toLowerCase().includes(needle) || a.name.toLowerCase().includes(needle))
      .slice(0, 25);
  }, [assets, assetClass, instrumentQuery]);

  // Commodity Class options - the real taxonomy groups (Energies, Metals,
  // Grains, ...) already built for Asset Management, so this cascade covers
  // every seeded commodity, not just the ones with a contract-month picker.
  const commodityGroups = useMemo(
    () => assetGroups.filter((g) => g.assetClass === 'commodity_future').sort((a, b) => a.sortOrder - b.sortOrder),
    [assetGroups],
  );
  const subCategoryOptions = useMemo(
    () => assets.filter((a) => a.groupId === commodityGroupId && a.isTradable).sort((a, b) => a.symbol.localeCompare(b.symbol)),
    [assets, commodityGroupId],
  );
  const commodityConfig = asset ? CONTRACT_MONTH_COMMODITIES.find((c) => c.root === asset.symbol) : undefined;
  const contractMonthOptions = useMemo(
    () => (commodityConfig ? generateFuturesContractMonths(commodityConfig.root, { includeCash: commodityConfig.includeCash }) : []),
    [commodityConfig],
  );

  const qtyNum = Number(quantity);
  const priceNum = Number(price);
  const contractPriceNum = Number(contractPrice);
  const feesNum = Number(fees) || 0;
  const isFuture = asset?.assetClass === 'commodity_future';

  // What the client actually pays per unit.
  //
  // For an option that is the CONTRACT PRICE - the premium, ~$1,008 - and
  // never the entry price. Entry price is the underlying gold reference
  // (~$4,300) and exists only to measure P/L against. Billing ten $1,008
  // contracts at the entry price charged $43,000 instead of $10,080.
  const unitCostNum = isOptionsContract ? contractPriceNum : priceNum;

  // Units of underlying controlled per contract - 100 troy oz for gold - parsed
  // from the catalog's free-text contract unit. Without it the limited-risk
  // payoff has no multiplier and the position can only ever be marked at cost,
  // so the desk needs to see that before placing the trade rather than after.
  const contractMultiplier = asset?.contractUnit
    ? Number(String(asset.contractUnit).replace(/[^0-9.]/g, '')) || null
    : null;

  // Trade value is always quantity x unit cost - no contract-size multiplier.
  // Multiplying by contract size (e.g. 100 for options) silently inflated
  // this by 100x, so contract size was dropped from the calculation and
  // from the form entirely.
  const grossValue = qtyNum > 0 && unitCostNum > 0 ? qtyNum * unitCostNum : null;
  const commissionPercentNum = Math.min(MAX_COMMISSION_PERCENT, Math.max(0, Number(commissionPercent) || 0));
  const commissionAmount = grossValue != null ? (commissionPercentNum / 100) * grossValue : 0;
  const netValue =
    grossValue != null ? (side === 'buy' ? -(grossValue + feesNum + commissionAmount) : grossValue - feesNum - commissionAmount) : null;

  // An option without a premium cannot be priced, and one without a call/put
  // cannot be valued at all - so both are required, not optional.
  const optionFieldsValid =
    !isOptionsContract ||
    (optionType !== '' && strikePrice.trim() !== '' && expiryDate.trim() !== '' && contractPriceNum > 0);
  const commodityFieldValid = !commodityGroupId || !commodityConfig || contractMonthSymbol !== '';
  const canSubmit = Boolean(
    investorId && asset && qtyNum > 0 && priceNum > 0 && unitCostNum > 0 && optionFieldsValid && commodityFieldValid,
  );

  const resetForm = () => {
    setQuantity('');
    setPrice('');
    setContractPrice('');
    setFees('0');
    setEntryUnderlyingPrice('');
    setCommissionPercent('2');
    setOptionType('');
    setStrikePrice('');
    setExpiryDate('');
    setCommodityGroupId('');
    setContractMonthSymbol('');
    setContractMonthLabel('');
    setDeliveryType('');
    setOrderType('limit');
    setTimeInForce('day');
  };

  const displaySymbol = contractMonthSymbol || asset?.symbol || '';
  const contractQtyLabel =
    isFuture || isOptionsContract ? 'Number of Contracts'
    : assetClass === 'crypto' ? 'Number of Coins'
    : assetClass === 'fx' ? 'Number of Units'
    : SHARE_LIKE_CLASSES.includes(assetClass) ? 'Number of Shares'
    : 'Quantity';
  // For an option, "entry price" means the underlying at entry - the premium
  // lives in its own Contract Price field.
  const priceFieldLabel = isOptionsContract ? 'Entry Price (Underlying)' : isFuture ? 'Contract Price' : 'Entry Price';

  const submit = async (mode: 'queue' | 'execute') => {
    if (!canSubmit || !investor || !asset) {
      toast.error('Select an investor, instrument, quantity, and price');
      return;
    }
    setBusy(mode);

    // entryUnderlyingPrice is the price of the UNDERLYING at entry, not the
    // premium. Limited-risk option P/L is measured against it, so a position
    // saved without it can only ever be marked at cost. For an option the
    // Entry Price field IS that underlying, so there is no second field to
    // fill in - only non-option instruments use the standalone one.
    const entryUnderlyingNum = Number(isOptionsContract ? price : entryUnderlyingPrice);
    const contractFields = {
      // Checking optionType here as well as isOptionsContract is not
      // redundant: it narrows away the '' case, which the payload types
      // reject. canSubmit already blocks an option with no call/put.
      ...(isOptionsContract && optionType ? { optionType, strikePrice: Number(strikePrice), expiryDate } : {}),
      ...(isFuture && deliveryType ? { deliveryType } : {}),
      ...(Number.isFinite(entryUnderlyingNum) && entryUnderlyingNum > 0
        ? { entryUnderlyingPrice: entryUnderlyingNum }
        : {}),
      // Units of underlying controlled per contract (100 troy oz for gold),
      // taken from the catalog so the payoff maths has a multiplier to use.
      ...(contractMultiplier ? { contractSize: contractMultiplier } : {}),
    };
    const contractLabel = isOptionsContract ? ` ${optionType.toUpperCase()} $${strikePrice} exp ${expiryDate}` : '';

    // Step 1: place the order. If this fails, nothing was created - a plain
    // error is correct and there's nothing to refresh.
    let orderId: string;
    try {
      const placed = await placeOrderOnBehalf({
        userId: investor.id,
        userEmail: investor.email,
        assetId: asset.id,
        side,
        orderType,
        timeInForce,
        quantity: qtyNum,
        limitPrice: unitCostNum,
        fees: feesNum,
        commission: commissionAmount,
        subPortfolioId: subPortfolioId || undefined,
        symbolOverride: contractMonthSymbol || undefined,
        ...contractFields,
      });
      orderId = placed.orderId;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to place order');
      setBusy(null);
      return;
    }

    if (adminUser) logAction(adminUser.uid, adminProfile?.email ?? '', 'Order placed', `${investor.email}: ${side} ${qtyNum} ${displaySymbol}${contractLabel}`);

    if (mode === 'queue') {
      toast.success(`Order queued for ${displaySymbol}`);
      resetForm();
      onOrderPlaced();
      setBusy(null);
      return;
    }

    // Step 2 (Execute Immediately only): the order above was created either
    // way. If the fill is rejected (e.g. insufficient brokerage cash), the
    // order is NOT lost - it sits in the queue exactly like "Add to Pending
    // Queue" would have, so always refresh the list and say so explicitly
    // rather than leaving a stale queue and a generic error.
    try {
      const result = await fillOrder({
        orderId,
        quantity: qtyNum,
        price: unitCostNum,
        fees: feesNum,
        commission: commissionAmount,
        clientStatus: 'active',
        ...contractFields,
      });
      if (adminUser) {
        logAction(
          adminUser.uid,
          adminProfile?.email ?? '',
          'Order executed',
          `${investor.email}: ${side} ${qtyNum} ${displaySymbol}${contractLabel} @ ${fmt(unitCostNum)} (${result.tradeRef})`,
        );
      }
      toast.success(`Executed — ${result.tradeRef}`);
      resetForm();
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'fill failed';
      toast.error(`Order placed but not filled — ${reason}. It's waiting in the Pending Approval queue below.`, { duration: 8000 });
    } finally {
      onOrderPlaced();
      setBusy(null);
    }
  };

  const clearInstrument = () => {
    setAssetId('');
    setInstrumentQuery('');
    setCommodityGroupId('');
    setContractMonthSymbol('');
    setContractMonthLabel('');
  };

  return (
    <div className="sg-card p-5 space-y-5" style={{ borderRadius: 14 }}>
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4" style={{ color: 'var(--sg-indigo)' }} />
        <div>
          <h3 className="font-semibold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
            Admin Trade Entry
          </h3>
          <p className="text-xs" style={{ color: 'var(--sg-muted-2)' }}>
            Place an order on behalf of any investor — select investor, instrument, contract terms, and execute.
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.1em' }}>1. Investor</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Investor</label>
            <select className="sg-input mt-1.5" value={investorId} onChange={(e) => setInvestorId(e.target.value)}>
              <option value="">— Select investor —</option>
              {investors.map((i) => (
                <option key={i.id} value={i.id}>{i.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>
              Portfolio Sleeve (optional)
            </label>
            <select className="sg-input mt-1.5" value={subPortfolioId} onChange={(e) => setSubPortfolioId(e.target.value)} disabled={!investorId}>
              <option value="">— None —</option>
              {sleeves.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {investorId && sleeves.length === 0 && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--sg-muted-2)' }}>No sleeves yet — set up in Portfolio Structure.</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.1em' }}>2. Order Direction</p>
        <div className="flex gap-2 max-w-xs">
          <button
            type="button"
            onClick={() => setSide('buy')}
            className="flex-1 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: side === 'buy' ? 'rgba(16,185,129,.16)' : 'transparent',
              border: `1px solid ${side === 'buy' ? 'var(--sg-teal)' : 'var(--sg-border)'}`,
              color: side === 'buy' ? 'var(--sg-teal)' : 'var(--sg-muted)',
            }}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => setSide('sell')}
            className="flex-1 py-2 rounded-lg text-sm font-semibold"
            style={{
              background: side === 'sell' ? 'rgba(239,68,68,.14)' : 'transparent',
              border: `1px solid ${side === 'sell' ? 'var(--sg-danger)' : 'var(--sg-border)'}`,
              color: side === 'sell' ? 'var(--sg-danger)' : 'var(--sg-muted)',
            }}
          >
            Sell
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.1em' }}>3. Instrument</p>
        <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Asset Class</label>
        <select
          className="sg-input mt-1.5"
          value={assetClass}
          onChange={(e) => {
            setAssetClass(e.target.value as AssetClass);
            clearInstrument();
          }}
        >
          {(Object.keys(ASSET_CLASS_LABEL) as AssetClass[]).map((c) => (
            <option key={c} value={c}>{ASSET_CLASS_LABEL[c]}</option>
          ))}
        </select>

        {assetClass === 'commodity_future' ? (
          <>
            <p className="text-[11px] mt-1" style={{ color: 'var(--sg-muted-2)' }}>
              {subCategoryOptions.length > 0 ? `${subCategoryOptions.length} contracts for ${commodityGroups.find((g) => g.id === commodityGroupId)?.label ?? ''}` : `${commodityGroups.length} commodity classes`}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div>
                <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Commodity Class</label>
                <select
                  className="sg-input mt-1.5"
                  value={commodityGroupId}
                  onChange={(e) => {
                    setCommodityGroupId(e.target.value);
                    setAssetId('');
                    setContractMonthSymbol('');
                    setContractMonthLabel('');
                  }}
                >
                  <option value="">— Select —</option>
                  {commodityGroups.map((g) => (
                    <option key={g.id} value={g.id}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Sub-Category</label>
                <select
                  className="sg-input mt-1.5"
                  value={assetId}
                  onChange={(e) => {
                    setAssetId(e.target.value);
                    setContractMonthSymbol('');
                    setContractMonthLabel('');
                  }}
                  disabled={!commodityGroupId}
                >
                  <option value="">— Select —</option>
                  {subCategoryOptions.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {asset && (
              <div className="mt-2">
                {contractMonthOptions.length > 0 ? (
                  <>
                    <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Contract / Symbol</label>
                    <select
                      className="sg-input mt-1.5"
                      value={contractMonthSymbol}
                      onChange={(e) => {
                        const opt = contractMonthOptions.find((o) => o.symbol === e.target.value);
                        setContractMonthSymbol(opt?.symbol ?? '');
                        setContractMonthLabel(opt?.label ?? '');
                      }}
                    >
                      <option value="">— Select contract —</option>
                      {contractMonthOptions.map((o) => (
                        <option key={o.symbol} value={o.symbol}>{o.symbol} ({o.label})</option>
                      ))}
                    </select>
                  </>
                ) : null}
                <p className="text-[11px] mt-1" style={{ color: 'var(--sg-muted-2)' }}>
                  {asset.exchange ?? '—'} · Symbol: {displaySymbol}
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-[11px] mt-1" style={{ color: 'var(--sg-muted-2)' }}>
              {filteredAssets.length} tradable instruments in {ASSET_CLASS_LABEL[assetClass]}
            </p>
            <input
              type="text"
              value={instrumentQuery}
              onChange={(e) => setInstrumentQuery(e.target.value)}
              placeholder="Type symbol or name..."
              className="sg-input mt-2"
            />
            {instrumentQuery && !asset && (
              <div className="mt-1 max-h-40 overflow-y-auto sg-panel">
                {filteredAssets.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:opacity-80 border-b sg-row-border"
                    onClick={() => {
                      setAssetId(a.id);
                      setInstrumentQuery(`${a.symbol} — ${a.name}`);
                    }}
                  >
                    <span className="font-semibold sg-text-main">{a.symbol}</span>{' '}
                    <span className="sg-text-faint">{a.name}</span>
                  </button>
                ))}
                {filteredAssets.length === 0 && <p className="px-3 py-2 text-sm sg-text-faint">No matches.</p>}
              </div>
            )}
          </>
        )}

        {asset && (
          <p className="text-xs mt-1.5" style={{ color: 'var(--sg-teal)' }}>
            Selected: {displaySymbol} — {contractMonthLabel ? `${asset.name} (${contractMonthLabel})` : asset.name}
            <button type="button" className="ml-2 underline" onClick={clearInstrument}>Change</button>
          </p>
        )}
      </div>

      {asset && (
        <div>
          <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.1em' }}>
            4. {isFuture
              ? 'Commodity Contract'
              : assetClass === 'fx'
                ? 'Currency Pair Details'
                : assetClass === 'crypto'
                  ? 'Crypto Details'
                  : SHARE_LIKE_CLASSES.includes(assetClass)
                    ? 'Equity Details'
                    : 'Instrument Details'}
          </p>

          {isFuture ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Commodity Class</label>
                <input className="sg-input mt-1.5" value={commodityGroups.find((g) => g.id === commodityGroupId)?.label ?? ''} disabled />
              </div>
              <div>
                <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Commodity</label>
                <input className="sg-input mt-1.5" value={asset.name} disabled />
              </div>
              <div>
                <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Exchange</label>
                <input className="sg-input mt-1.5" value={asset.exchange ?? '—'} disabled />
              </div>
              <div>
                <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Settlement Currency</label>
                <input className="sg-input mt-1.5" value="USD" disabled />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>
                  {assetClass === 'fx' ? 'Currency Pair' : assetClass === 'crypto' ? 'Coin / Token' : 'Symbol'}
                </label>
                <input className="sg-input mt-1.5" value={asset.name} disabled />
              </div>
              <div>
                <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Exchange</label>
                <input className="sg-input mt-1.5" value={asset.exchange ?? '—'} disabled />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Order Type</label>
              <select className="sg-input mt-1.5" value={orderType} onChange={(e) => setOrderType(e.target.value as typeof orderType)}>
                <option value="market">Market</option>
                <option value="limit">Limit</option>
                <option value="stop">Stop</option>
                <option value="stop_limit">Stop Limit</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Time in Force</label>
              <select className="sg-input mt-1.5" value={timeInForce} onChange={(e) => setTimeInForce(e.target.value as typeof timeInForce)}>
                <option value="day">Day</option>
                <option value="gtc">GTC</option>
                <option value="ioc">IOC</option>
                <option value="fok">FOK</option>
              </select>
            </div>
            {(isFuture || isOption) && (
              <>
                <div>
                  <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>
                    Type of Options{isOption ? ' *' : ''}
                  </label>
                  <select className="sg-input mt-1.5" value={optionType} onChange={(e) => setOptionType(e.target.value as typeof optionType)}>
                    <option value="">— {isOption ? 'Select' : 'None'} —</option>
                    <option value="call">Call</option>
                    <option value="put">Put</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>
                    Strike Price{isOptionsContract ? ' *' : ''}
                  </label>
                  <input type="number" min="0" step="any" value={strikePrice} onChange={(e) => setStrikePrice(e.target.value)} placeholder="e.g. 200" className="sg-input mt-1.5" />
                </div>
              </>
            )}
          </div>

          {(isFuture || isOption) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              <div>
                <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>
                  Expiry Date{isOptionsContract ? ' *' : ''}
                </label>
                <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="sg-input mt-1.5" />
                {isOptionsContract && (
                  <p className="text-[10px] mt-1" style={{ color: 'var(--sg-muted-2)' }}>
                    Typically 3-6 months out, per the client's preference.
                  </p>
                )}
              </div>
              <div className={isFuture ? undefined : 'hidden'}>
                <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Delivery Type</label>
                <select className="sg-input mt-1.5" value={deliveryType} onChange={(e) => setDeliveryType(e.target.value as typeof deliveryType)}>
                  <option value="">— Select —</option>
                  <option value="cash_settled">Cash settled</option>
                  <option value="physical">Physical</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {asset && (
        <div>
          <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.1em' }}>5. Economics</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>{contractQtyLabel}</label>
              <input type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="sg-input mt-1.5" />
            </div>
            <div>
              <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>{priceFieldLabel}</label>
              <input type="number" min="0" step="any" value={price} onChange={(e) => setPrice(e.target.value)} className="sg-input mt-1.5" />
              {isOptionsContract && (
                <p className="text-[10px] mt-1" style={{ color: 'var(--sg-muted-2)' }}>
                  Market price of the underlying at entry, per unit (e.g. 4300 per troy oz). P/L is
                  measured against this — it does not affect what the client is charged.
                </p>
              )}
            </div>
            {isOptionsContract && (
              <div>
                <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>
                  Contract Price *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={contractPrice}
                  onChange={(e) => setContractPrice(e.target.value)}
                  placeholder="e.g. 1008"
                  className="sg-input mt-1.5"
                />
                <p className="text-[10px] mt-1" style={{ color: 'var(--sg-muted-2)' }}>
                  Premium per contract. Trade value is contracts × this price, and it is the client's
                  maximum loss.
                </p>
              </div>
            )}
            {isOptionsContract && (
              <div>
                <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>
                  Units per Contract
                </label>
                <input
                  className="sg-input mt-1.5"
                  value={contractMultiplier ? `${contractMultiplier.toLocaleString()} (${asset?.contractUnit})` : 'Not set'}
                  disabled
                  style={{ color: contractMultiplier ? undefined : 'var(--sg-danger)' }}
                />
                <p className="text-[10px] mt-1" style={{ color: contractMultiplier ? 'var(--sg-muted-2)' : 'var(--sg-danger)' }}>
                  {contractMultiplier
                    ? `Each $1 move in the underlying pays ${fmt(contractMultiplier)} per contract.`
                    : 'No contract unit on this instrument — P/L cannot be calculated and the position will mark at cost. Set it in Asset Management first.'}
                </p>
              </div>
            )}
            <div className={isOptionsContract ? 'hidden' : undefined}>
              <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>
                Underlying price at entry
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={entryUnderlyingPrice}
                onChange={(e) => setEntryUnderlyingPrice(e.target.value)}
                placeholder="e.g. 4300"
                className="sg-input mt-1.5"
              />
              <p className="text-[10px] mt-1" style={{ color: 'var(--sg-muted-2)' }}>
                Market price of the underlying, per unit. P/L is measured against this — leave
                blank and the position can only be marked at cost.
              </p>
            </div>
            <div>
              <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Fees</label>
              <input type="number" min="0" step="any" value={fees} onChange={(e) => setFees(e.target.value)} className="sg-input mt-1.5" />
            </div>
            <div>
              <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>
                Commission (% of trade value, max {MAX_COMMISSION_PERCENT}%)
              </label>
              <div className="relative mt-1.5">
                <input
                  type="number"
                  min="0"
                  max={MAX_COMMISSION_PERCENT}
                  step="0.1"
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(e.target.value)}
                  className="sg-input pr-7"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--sg-muted-2)' }}>%</span>
              </div>
              <p className="text-[11px] mt-1" style={{ color: 'var(--sg-muted-2)' }}>{fmt(commissionAmount)}</p>
            </div>
            <div>
              <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Estimated Trade Value</label>
              <input className="sg-input mt-1.5" value={grossValue != null ? fmt(grossValue) : '—'} disabled />
            </div>
            <div>
              <label className="text-xs uppercase" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.08em' }}>Net Debit/Credit to Client</label>
              <input
                className="sg-input mt-1.5"
                style={{ color: netValue != null ? (netValue >= 0 ? 'var(--sg-teal)' : 'var(--sg-danger)') : undefined }}
                value={netValue != null ? fmt(netValue) : '—'}
                disabled
              />
            </div>
          </div>
        </div>
      )}

      {/* Client Statement Preview — exactly what the client will see */}
      <div className="rounded-lg border p-3" style={{ borderColor: 'var(--sg-border)', background: 'var(--sg-surface)' }}>
        <p className="text-[10px] uppercase font-semibold mb-2" style={{ color: 'var(--sg-muted-2)', letterSpacing: '0.1em' }}>
          6. Client Statement Preview — exactly what the client will see
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {[
            ['Status', 'Pending'],
            ['Trade Ref', 'SG-TRD-YYYY-NNNNNN (auto on fill)'],
            ['Symbol', displaySymbol || '—'],
            ['Side', side.toUpperCase()],
            ['Order Type', orderType.replace('_', ' ').toUpperCase()],
            ['Time in Force', timeInForce.toUpperCase()],
            [contractQtyLabel, qtyNum > 0 ? qtyNum.toLocaleString() : '—'],
            [priceFieldLabel, priceNum > 0 ? fmt(priceNum) : '—'],
            ...(isOptionsContract
              ? ([
                  ['Contract Price (premium)', contractPriceNum > 0 ? fmt(contractPriceNum) : '—'],
                  ['Type of Options', optionType ? optionType.toUpperCase() : '—'],
                  ['Strike', strikePrice ? fmt(Number(strikePrice)) : '—'],
                  ['Expiry', expiryDate || '—'],
                  ['Maximum Loss', grossValue != null ? fmt(grossValue) : '—'],
                ] as const)
              : []),
            ...(isFuture && deliveryType ? ([['Delivery Type', deliveryType === 'cash_settled' ? 'Cash settled' : 'Physical']] as const) : []),
            ['Trade Value (gross)', grossValue != null ? fmt(grossValue) : '—'],
            ['Fee', fmt(feesNum)],
            ['Commission', `${fmt(commissionAmount)} (${commissionPercentNum}%)`],
            ['Net Debit/Credit', netValue != null ? fmt(netValue) : '—'],
            ['Remarks', 'OPEN (derived at fill)'],
          ].map(([label, value]) => (
            <div key={label} className="contents">
              <span style={{ color: 'var(--sg-muted-2)' }}>{label}</span>
              <span className="font-medium" style={{ color: 'var(--sg-text)' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!canSubmit || busy !== null} onClick={() => submit('queue')} className="sg-btn-ghost">
          {busy === 'queue' ? 'Queuing...' : 'Add to Pending Queue'}
        </button>
        <button type="button" disabled={!canSubmit || busy !== null} onClick={() => submit('execute')} className="sg-btn-primary">
          {busy === 'execute' ? 'Executing...' : 'Execute Immediately'}
        </button>
      </div>
      <p className="text-[11px]" style={{ color: 'var(--sg-muted-2)' }}>
        Add to queue creates a pending order for later approval/fill. Execute immediately places and fills in one step —
        client records update instantly.
      </p>
    </div>
  );
}

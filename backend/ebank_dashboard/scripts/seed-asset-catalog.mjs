// One-time (idempotent) seed for the Asset Management module.
// Run with: GOOGLE_APPLICATION_CREDENTIALS=<path-to-service-account.json> node scripts/seed-asset-catalog.mjs
// Safe to re-run - every write is an upsert keyed by symbol/group id.

import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: 'e-bank-dashboard',
  });
}

const db = getFirestore();

const ASSET_GROUPS = [
  { id: 'energies', label: 'Energies', assetClass: 'commodity_future', parentLabel: 'Commodities & Futures', sortOrder: 1 },
  { id: 'metals', label: 'Metals', assetClass: 'commodity_future', parentLabel: 'Commodities & Futures', sortOrder: 2 },
  { id: 'grains', label: 'Grains', assetClass: 'commodity_future', parentLabel: 'Commodities & Futures', sortOrder: 3 },
  { id: 'softs', label: 'Softs', assetClass: 'commodity_future', parentLabel: 'Commodities & Futures', sortOrder: 4 },
  { id: 'livestock', label: 'Livestock', assetClass: 'commodity_future', parentLabel: 'Commodities & Futures', sortOrder: 5 },
  { id: 'financials', label: 'Financials', assetClass: 'commodity_future', parentLabel: 'Commodities & Futures', sortOrder: 6 },
  { id: 'currencies', label: 'Currencies', assetClass: 'commodity_future', parentLabel: 'Commodities & Futures', sortOrder: 7 },
  { id: 'futures-indices', label: 'Indices', assetClass: 'commodity_future', parentLabel: 'Commodities & Futures', sortOrder: 8 },
  { id: 'benchmark-index', label: 'Benchmark Indices', assetClass: 'benchmark_index', parentLabel: 'Stocks & Shares', sortOrder: 9 },
  { id: 'dow30', label: 'Dow 30', assetClass: 'equity', parentLabel: 'Stocks & Shares', sortOrder: 10 },
  { id: 'sector-leader', label: 'Sector Leaders', assetClass: 'equity', parentLabel: 'Stocks & Shares', sortOrder: 11 },
  { id: 'etf', label: 'ETFs', assetClass: 'etf', parentLabel: 'Stocks & Shares', sortOrder: 12 },
  { id: 'fx-majors', label: 'FX Majors', assetClass: 'fx', parentLabel: 'Forex', sortOrder: 13 },
  { id: 'fx-crosses', label: 'FX Crosses', assetClass: 'fx', parentLabel: 'Forex', sortOrder: 14 },
  { id: 'crypto-major', label: 'Major Cryptocurrencies', assetClass: 'crypto', parentLabel: 'Cryptocurrency', sortOrder: 15 },
  { id: 'crypto-alt', label: 'Altcoins', assetClass: 'crypto', parentLabel: 'Cryptocurrency', sortOrder: 16 },
];

// Core-tier futures/commodities, sourced from barchart.com contract
// specifications. quoteSymbol is the liquid ETF/ETN proxy Finnhub can
// actually quote (raw futures contracts aren't Finnhub-quotable); null
// means no reliable proxy exists yet - seeded as reference-only.
const FUTURES = [
  { id: 'CL', symbol: 'CL', name: 'Crude Oil WTI', groupId: 'energies', exchange: 'NYMEX', contractUnit: '1,000 barrels', quoteSymbol: 'USO' },
  { id: 'BZ', symbol: 'BZ', name: 'Crude Oil Brent', groupId: 'energies', exchange: 'NYMEX', contractUnit: '1,000 barrels', quoteSymbol: 'BNO' },
  { id: 'NG', symbol: 'NG', name: 'Natural Gas', groupId: 'energies', exchange: 'NYMEX', contractUnit: '10,000 MMBtu', quoteSymbol: 'UNG' },
  { id: 'GC', symbol: 'GC', name: 'Gold', groupId: 'metals', exchange: 'COMEX', contractUnit: '100 troy oz', quoteSymbol: 'GLD' },
  { id: 'SI', symbol: 'SI', name: 'Silver', groupId: 'metals', exchange: 'COMEX', contractUnit: '5,000 troy oz', quoteSymbol: 'SLV' },
  { id: 'HG', symbol: 'HG', name: 'High Grade Copper', groupId: 'metals', exchange: 'COMEX', contractUnit: '25,000 lbs', quoteSymbol: 'CPER' },
  { id: 'PL', symbol: 'PL', name: 'Platinum', groupId: 'metals', exchange: 'NYMEX', contractUnit: '50 troy oz', quoteSymbol: 'PPLT' },
  { id: 'ZC', symbol: 'ZC', name: 'Corn', groupId: 'grains', exchange: 'CBOT', contractUnit: '5,000 bushels', quoteSymbol: 'CORN' },
  { id: 'ZW', symbol: 'ZW', name: 'Wheat (Chicago SRW)', groupId: 'grains', exchange: 'CBOT', contractUnit: '5,000 bushels', quoteSymbol: 'WEAT' },
  { id: 'ZS', symbol: 'ZS', name: 'Soybeans', groupId: 'grains', exchange: 'CBOT', contractUnit: '5,000 bushels', quoteSymbol: 'SOYB' },
  { id: 'KC', symbol: 'KC', name: 'Coffee', groupId: 'softs', exchange: 'ICE US', contractUnit: '37,500 lbs', quoteSymbol: 'JO' },
  { id: 'CC', symbol: 'CC', name: 'Cocoa', groupId: 'softs', exchange: 'ICE US', contractUnit: '10 metric tons', quoteSymbol: 'NIB' },
  { id: 'SB', symbol: 'SB', name: 'Sugar #11', groupId: 'softs', exchange: 'ICE US', contractUnit: '112,000 lbs', quoteSymbol: 'CANE' },
  { id: 'CT', symbol: 'CT', name: 'Cotton #2', groupId: 'softs', exchange: 'ICE US', contractUnit: '50,000 lbs', quoteSymbol: 'BAL' },
  { id: 'LE', symbol: 'LE', name: 'Live Cattle', groupId: 'livestock', exchange: 'CME', contractUnit: '40,000 lbs', quoteSymbol: 'COW' },
  { id: 'GF', symbol: 'GF', name: 'Feeder Cattle', groupId: 'livestock', exchange: 'CME', contractUnit: '50,000 lbs', quoteSymbol: null },
  { id: 'HE', symbol: 'HE', name: 'Lean Hogs', groupId: 'livestock', exchange: 'CME', contractUnit: '40,000 lbs', quoteSymbol: null },
  { id: 'ZB', symbol: 'ZB', name: '30-Year T-Bond', groupId: 'financials', exchange: 'CBOT', contractUnit: '$100,000 face', quoteSymbol: 'TLT' },
  { id: 'ZN', symbol: 'ZN', name: '10-Year T-Note', groupId: 'financials', exchange: 'CBOT', contractUnit: '$100,000 face', quoteSymbol: 'IEF' },
  { id: 'DX', symbol: 'DX', name: 'US Dollar Index', groupId: 'currencies', exchange: 'ICE US', contractUnit: '$1,000 x Index', quoteSymbol: 'UUP' },
  { id: 'E6', symbol: 'E6', name: 'Euro FX', groupId: 'currencies', exchange: 'CME', contractUnit: '€125,000', quoteSymbol: 'FXE' },
  { id: 'B6', symbol: 'B6', name: 'British Pound', groupId: 'currencies', exchange: 'CME', contractUnit: '£62,500', quoteSymbol: 'FXB' },
  { id: 'J6', symbol: 'J6', name: 'Japanese Yen', groupId: 'currencies', exchange: 'CME', contractUnit: '¥12,500,000', quoteSymbol: 'FXY' },
  { id: 'ES', symbol: 'ES', name: 'S&P 500 E-Mini', groupId: 'futures-indices', exchange: 'CME Globex', contractUnit: '$50 x Index', quoteSymbol: 'SPY' },
  { id: 'NQ', symbol: 'NQ', name: 'Nasdaq 100 E-Mini', groupId: 'futures-indices', exchange: 'CME Globex', contractUnit: '$20 x Index', quoteSymbol: 'QQQ' },
  { id: 'YM', symbol: 'YM', name: 'Dow Futures Mini', groupId: 'futures-indices', exchange: 'CBOT', contractUnit: '$5 x Index', quoteSymbol: 'DIA' },
].map((a) => ({ ...a, assetClass: 'commodity_future', priority: 'core', isTradable: true, dataProvider: 'finnhub' }));

const BENCHMARK_INDICES = [
  { id: '^GSPC', symbol: '^GSPC', name: 'S&P 500', quoteSymbol: 'SPY' },
  { id: '^DJI', symbol: '^DJI', name: 'Dow Jones Industrial Average', quoteSymbol: 'DIA' },
  { id: '^IXIC', symbol: '^IXIC', name: 'Nasdaq Composite', quoteSymbol: 'QQQ' },
  { id: '^RUT', symbol: '^RUT', name: 'Russell 2000', quoteSymbol: 'IWM' },
].map((a) => ({
  ...a, assetClass: 'benchmark_index', groupId: 'benchmark-index', priority: 'core', isTradable: false, dataProvider: 'finnhub',
}));

const DOW30 = [
  ['AAPL', 'Apple Inc.', 'Information Technology'],
  ['MSFT', 'Microsoft Corporation', 'Information Technology'],
  ['NVDA', 'NVIDIA Corporation', 'Information Technology'],
  ['CRM', 'Salesforce, Inc.', 'Information Technology'],
  ['CSCO', 'Cisco Systems, Inc.', 'Information Technology'],
  ['IBM', 'International Business Machines Corp.', 'Information Technology'],
  ['AMZN', 'Amazon.com, Inc.', 'Consumer Discretionary'],
  ['HD', 'The Home Depot, Inc.', 'Consumer Discretionary'],
  ['MCD', "McDonald's Corporation", 'Consumer Discretionary'],
  ['NKE', 'Nike, Inc.', 'Consumer Discretionary'],
  ['AMGN', 'Amgen Inc.', 'Health Care'],
  ['JNJ', 'Johnson & Johnson', 'Health Care'],
  ['MRK', 'Merck & Co., Inc.', 'Health Care'],
  ['UNH', 'UnitedHealth Group Incorporated', 'Health Care'],
  ['AXP', 'American Express Company', 'Financials'],
  ['GS', 'The Goldman Sachs Group, Inc.', 'Financials'],
  ['JPM', 'JPMorgan Chase & Co.', 'Financials'],
  ['TRV', 'The Travelers Companies, Inc.', 'Financials'],
  ['V', 'Visa Inc.', 'Financials'],
  ['BA', 'The Boeing Company', 'Industrials'],
  ['CAT', 'Caterpillar Inc.', 'Industrials'],
  ['HON', 'Honeywell International Inc.', 'Industrials'],
  ['MMM', '3M Company', 'Industrials'],
  ['CVX', 'Chevron Corporation', 'Energy'],
  ['DIS', 'The Walt Disney Company', 'Communication Services'],
  ['VZ', 'Verizon Communications Inc.', 'Communication Services'],
  ['KO', 'The Coca-Cola Company', 'Consumer Staples'],
  ['PG', 'The Procter & Gamble Company', 'Consumer Staples'],
  ['WMT', 'Walmart Inc.', 'Consumer Staples'],
  ['SHW', 'The Sherwin-Williams Company', 'Materials'],
].map(([symbol, name, sector]) => ({
  id: symbol, symbol, name, sector, assetClass: 'equity', groupId: 'dow30', quoteSymbol: symbol,
  priority: 'core', isTradable: true, dataProvider: 'finnhub',
}));

const SECTOR_LEADERS = [
  ['AVGO', 'Broadcom Inc.', 'Information Technology'],
  ['ORCL', 'Oracle Corporation', 'Information Technology'],
  ['LLY', 'Eli Lilly and Company', 'Health Care'],
  ['ABBV', 'AbbVie Inc.', 'Health Care'],
  ['PFE', 'Pfizer Inc.', 'Health Care'],
  ['MA', 'Mastercard Incorporated', 'Financials'],
  ['BAC', 'Bank of America Corporation', 'Financials'],
  ['WFC', 'Wells Fargo & Company', 'Financials'],
  ['TSLA', 'Tesla, Inc.', 'Consumer Discretionary'],
  ['LOW', "Lowe's Companies, Inc.", 'Consumer Discretionary'],
  ['COST', 'Costco Wholesale Corporation', 'Consumer Staples'],
  ['PEP', 'PepsiCo, Inc.', 'Consumer Staples'],
  ['XOM', 'Exxon Mobil Corporation', 'Energy'],
  ['COP', 'ConocoPhillips', 'Energy'],
  ['GE', 'GE Aerospace', 'Industrials'],
  ['RTX', 'RTX Corporation', 'Industrials'],
  ['NEE', 'NextEra Energy, Inc.', 'Utilities'],
  ['SO', 'The Southern Company', 'Utilities'],
  ['PLD', 'Prologis, Inc.', 'Real Estate'],
  ['AMT', 'American Tower Corporation', 'Real Estate'],
  ['LIN', 'Linde plc', 'Materials'],
  ['FCX', 'Freeport-McMoRan Inc.', 'Materials'],
  ['GOOGL', 'Alphabet Inc. (Class A)', 'Communication Services'],
  ['META', 'Meta Platforms, Inc.', 'Communication Services'],
  ['NFLX', 'Netflix, Inc.', 'Communication Services'],
].map(([symbol, name, sector]) => ({
  id: symbol, symbol, name, sector, assetClass: 'equity', groupId: 'sector-leader', quoteSymbol: symbol,
  priority: 'core', isTradable: true, dataProvider: 'finnhub',
}));

const ETFS = [
  ['SPY', 'SPDR S&P 500 ETF Trust', 'Broad market'],
  ['VOO', 'Vanguard S&P 500 ETF', 'Broad market'],
  ['VTI', 'Vanguard Total Stock Market ETF', 'Broad market'],
  ['QQQ', 'Invesco QQQ Trust', 'Nasdaq-100 growth/tech'],
  ['DIA', 'SPDR Dow Jones Industrial Average ETF', 'Broad market'],
  ['IWM', 'iShares Russell 2000 ETF', 'Small-cap'],
  ['XLE', 'Energy Select Sector SPDR Fund', 'Energy sector'],
  ['XLF', 'Financial Select Sector SPDR Fund', 'Financials sector'],
  ['XLK', 'Technology Select Sector SPDR Fund', 'Technology sector'],
  ['XLV', 'Health Care Select Sector SPDR Fund', 'Health care sector'],
  ['XLY', 'Consumer Discretionary Select Sector SPDR', 'Consumer discretionary sector'],
  ['XLI', 'Industrial Select Sector SPDR Fund', 'Industrials sector'],
  ['ARKK', 'ARK Innovation ETF', 'Thematic/innovation'],
  ['GLD', 'SPDR Gold Shares', 'Gold/commodities'],
].map(([symbol, name, sector]) => ({
  id: symbol, symbol, name, sector, assetClass: 'etf', groupId: 'etf', quoteSymbol: symbol,
  priority: 'core', isTradable: true, dataProvider: 'finnhub',
}));

// Finnhub quote symbols: forex uses OANDA:BASE_QUOTE, crypto uses
// BINANCE:BASEUSDT - both per Finnhub's documented /quote symbol format.
const FX_MAJORS = [
  ['EURUSD', 'Euro / US Dollar'],
  ['GBPUSD', 'British Pound / US Dollar'],
  ['USDJPY', 'US Dollar / Japanese Yen'],
  ['USDCHF', 'US Dollar / Swiss Franc'],
  ['USDCAD', 'US Dollar / Canadian Dollar'],
  ['AUDUSD', 'Australian Dollar / US Dollar'],
  ['NZDUSD', 'New Zealand Dollar / US Dollar'],
].map(([symbol, name]) => ({
  id: symbol, symbol, name, assetClass: 'fx', groupId: 'fx-majors', exchange: 'FOREX',
  quoteSymbol: `OANDA:${symbol.slice(0, 3)}_${symbol.slice(3)}`, priority: 'core', isTradable: true, dataProvider: 'finnhub',
}));

const FX_CROSSES = [
  ['EURGBP', 'Euro / British Pound'],
  ['EURJPY', 'Euro / Japanese Yen'],
  ['GBPJPY', 'British Pound / Japanese Yen'],
  ['EURAUD', 'Euro / Australian Dollar'],
  ['AUDJPY', 'Australian Dollar / Japanese Yen'],
].map(([symbol, name]) => ({
  id: symbol, symbol, name, assetClass: 'fx', groupId: 'fx-crosses', exchange: 'FOREX',
  quoteSymbol: `OANDA:${symbol.slice(0, 3)}_${symbol.slice(3)}`, priority: 'core', isTradable: true, dataProvider: 'finnhub',
}));

const CRYPTO_MAJOR = [
  ['BTCUSD', 'Bitcoin'],
  ['ETHUSD', 'Ethereum'],
  ['SOLUSD', 'Solana'],
  ['XRPUSD', 'XRP'],
  ['BNBUSD', 'BNB'],
].map(([symbol, name]) => ({
  id: symbol, symbol, name, assetClass: 'crypto', groupId: 'crypto-major', exchange: 'CRYPTO',
  quoteSymbol: `BINANCE:${symbol.replace('USD', 'USDT')}`, priority: 'core', isTradable: true, dataProvider: 'finnhub',
}));

const CRYPTO_ALT = [
  ['ADAUSD', 'Cardano'],
  ['DOGEUSD', 'Dogecoin'],
  ['DOTUSD', 'Polkadot'],
  ['AVAXUSD', 'Avalanche'],
  ['LINKUSD', 'Chainlink'],
].map(([symbol, name]) => ({
  id: symbol, symbol, name, assetClass: 'crypto', groupId: 'crypto-alt', exchange: 'CRYPTO',
  quoteSymbol: `BINANCE:${symbol.replace('USD', 'USDT')}`, priority: 'core', isTradable: true, dataProvider: 'finnhub',
}));

const ASSETS = [...FUTURES, ...BENCHMARK_INDICES, ...DOW30, ...SECTOR_LEADERS, ...ETFS, ...FX_MAJORS, ...FX_CROSSES, ...CRYPTO_MAJOR, ...CRYPTO_ALT];

async function run() {
  console.log(`Seeding ${ASSET_GROUPS.length} asset groups...`);
  for (const group of ASSET_GROUPS) {
    await db.collection('assetGroups').doc(group.id).set(group, { merge: true });
  }

  console.log(`Seeding ${ASSETS.length} assets...`);
  let count = 0;
  for (const asset of ASSETS) {
    await db.collection('assets').doc(asset.id).set(
      {
        ...asset,
        isActive: true,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    count++;
    if (count % 20 === 0) console.log(`  ${count}/${ASSETS.length}`);
  }

  console.log(`Done. ${ASSET_GROUPS.length} groups, ${ASSETS.length} assets seeded/updated.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

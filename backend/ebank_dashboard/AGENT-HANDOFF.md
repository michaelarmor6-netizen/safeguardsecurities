# Agent Handoff — SafeGuard investor platform

Written 2026-08-22 at the end of a long working session. Read this before touching
anything. It is written for the next agent, not for marketing.

Repo: `D:\safeguardsecurities\backend\ebank_dashboard`
Branch: `wip/checkpoint-2026-08-21` · last commit `e7c7781`
**There is uncommitted work. See "State of the tree".**

---

## 1. The product model — read this first

SafeGuard is the **counterparty**. The limited-risk option payoff below is not an
approximation of exchange option pricing; it **is** the contract:

```
P/L    = (mark - entry) x multiplier x contracts,  floored at -premiumPaid
Value  = premiumPaid + P/L,                        floored at 0
```

Worked example the owner defined, and the regression test for any change:
10 contracts of gold, premium $1,008/contract, entry $4,300/oz, multiplier 100.

| Gold | Value | P/L |
|---|---|---|
| 4,300 | $10,080 | $0 |
| 4,350 | $60,080 | +$50,000 |
| 4,400 | $110,080 | +$100,000 |
| 3,000 | $0 | -$10,080 (floored) |

**The loss floor must live in code, not marketing copy.** Without it a $500
adverse move renders as -$500,000 against a client whose real exposure was
$10,080.

Three numbers are easy to conflate. They are different:

- **Contract Price / premium** (~$1,008) — what the client pays. Drives trade
  value, cash, `avgCost`. Also the maximum loss.
- **Entry Price / underlying at entry** (~$4,300) — gold per troy oz at the fill.
  Drives P/L only. Stored as `entryUnderlyingPrice`.
- **Multiplier** (100) — troy oz controlled per contract. Parsed from the asset's
  free-text `contractUnit`.

Source of truth: `src/lib/optionValuation.ts`. It is **deliberately duplicated**
at `functions-trading/src/optionValuation.ts` because Cloud Functions codebases
cannot import from the app's `src/`. **Change both.** A workspace and a statement
that disagree about a client's P/L is the worst outcome available here.

`valueOptionPosition` returns `null` when it cannot value a position. Callers
**must** fall back to marking at cost. Never substitute a guess.

---

## 2. Architecture

Four separate Cloud Functions codebases (`firebase.json`), each with its own
`package.json`, `node_modules`, and build:

| codebase | dir | contains |
|---|---|---|
| `default` | `functions/` | IG proxy: `igMarketSnapshot`, `igMarketHistory`, `igSearchMarkets` |
| `accounts` | `functions-accounts/` | account opening |
| `market` | `functions-market/` | AI Engine, quotes, entitlements, underlying prices |
| `trading` | `functions-trading/` | orders, fills, holdings, statements, snapshots |

Scheduled jobs:

- `refreshAssetQuotes` — every 5 min (Finnhub, catalog quotes)
- `refreshUnderlyingPricesDaily` — 20:45 (Massive Futures → `marketPrices`)
- `snapshotPortfolios` — 21:05 (writes `portfolioSnapshots`, drives the
  Performance chart)

Order lifecycle is two-step: **place → work → fill**. Positions, cash and trades
are created **only at fill**, inside a Firestore transaction.

---

## 3. State of the tree — UNCOMMITTED

```
 M firebase.json
 M functions-market/src/index.ts
 M functions-trading/src/index.ts
 M src/pages/investor/admin/InvestorAdminAssetsPage.tsx
 M src/pages/investor/admin/settings/AdminTradingConfigSection.tsx
 M src/pages/investor/admin/trading/AdminTradeEntryPanel.tsx
 M src/pages/investor/workspace/InvestorDashboardPage.tsx
 M src/pages/investor/workspace/InvestorStatementPage.tsx
 M src/services/investor/assetCatalogService.ts
?? functions-market/src/underlyingPrices.ts
?? functions-trading/src/optionValuation.ts
?? src/pages/investor/admin/AdminUnderlyingPricesPanel.tsx
?? src/services/investor/underlyingPriceService.ts
```

All five codebases type-check clean. **Not yet deployed.**

### What this work does

1. **Options asset class reached the options code path for the first time.**
   `isOptionsContract` used to be `optionType !== ''`, which only ever fired for
   the futures *overlay*. An `option` asset class fell through to the plain path:
   no strike, no expiry, no premium field. Now
   `isOption = asset?.assetClass === 'option'` feeds it.
2. **Trade value is contracts x Contract Price**, not x Entry Price. Ten $1,008
   contracts billed $43,000 before this.
3. **`snapshotAllPortfolios` values options via the payoff** instead of
   `qty x price`, reading a daily mark from `marketPrices`. This is why the
   Performance chart was a flat line — the job ran fine, it just valued a
   limited-risk option like a stock.
4. **Daily underlying marks**, two interchangeable routes into the same
   `marketPrices` collection: the Massive Futures feed (automatic), or admin
   entry via the new **Underlying Daily Marks** panel on Asset Management.
5. **Predeploy hooks** on all four codebases + hosting.

---

## 4. Deploy

```powershell
firebase deploy --only hosting,functions:market,functions:trading
```

Predeploy hooks now build each target, so the stale-`lib/` trap is closed.
Backup of the pre-hook config: `/tmp/firebase.json.bak` (ephemeral — re-create
from git if needed).

**Historical trap, now fixed but worth understanding:** `firebase deploy` uploads
whatever sits in `dist/` and `lib/`. There were no predeploy hooks, so deploying
without building shipped days-old output. This cost three separate rounds of
"why hasn't anything changed" in one session. If you remove the hooks, you own
this again.

**Diagnosing a suspected stale deploy:** compare `lib/index.js` mtime against
`src/index.ts`, and grep the compiled output for the function you expect:

```bash
grep -c refreshUnderlyingPricesDaily functions-market/lib/index.js
```

Firebase's own output helps too — `functions:secrets:set` lists which deployed
functions use a secret. If a function you wrote is missing from that list, it was
never deployed.

---

## 5. Landmines — do not re-break these

**`avgCost` vs `averagePrice`.** `fillOrder` writes `avgCost`. Readers that only
check `averagePrice ?? avgPrice` silently get `0`, which renders as "Avg Price
$0.00" and makes cost basis zero — so the entire position value reads as profit.
Fixed in `portfolioService.ts` (both `mapRawHolding` and
`getPortfolioStatsForUser`). **Any new reader must accept both names.**

**Proxy quote symbols.** Root commodities carry a `quoteSymbol` that is a *proxy*
— gold's is `GLD`, an ETF holding roughly 1/10 oz. Marking a $4,300 gold position
against a $424 ETF produced a fabricated **58% loss** on a client screen. Guarded
by `isSameInstrument` in `portfolioService.ts`. Never reach for
`asset?.quote?.price` as a fallback for a derivative.

**Spot is not futures.** Massive's forex API serves gold as `C:XAUUSD` (spot).
COMEX contracts settle against futures, which differ by the basis — tens of
dollars an ounce. The implementation uses the **Futures** API
(`/futures/v1/aggs/{ticker}?resolution=1session`) and prefers `settlement_price`
over `close`. If you switch series, entry prices must move with it or you
manufacture a P/L equal to the basis on day one.

**Rules guard on `plan`.** `firestore.rules` compares
`request.resource.data.get('plan','free') == resource.data.get('plan','free')`.
Without it, a client can grant themselves Pro. Any new privileged profile field
needs the same treatment.

**Verifying a type-check.** `tsc --noEmit | head -20; echo $?` reports **head's**
exit code, not tsc's — it always says 0. Redirect to a file and read `$?`:

```bash
./node_modules/.bin/tsc -b > /tmp/out.txt 2>&1; echo "EXIT=$?"; cat /tmp/out.txt
```

This mistake shipped a broken build to the owner. Don't repeat it.

**Line endings.** Repo files are CRLF. Python edits must use
`io.open(..., newline='')` and operate on `\r\n`, or the whole file shows as
changed.

**`device_bash` cannot delete.** `rm` fails with "Operation not permitted".
Running `git status` from an agent session leaves a `.git/index.lock` the agent
cannot remove, which then blocks the owner's git. **Avoid running git from the
agent side.** If a lock is left behind, tell the owner to delete
`.git/index.lock` manually.

---

## 6. Outstanding

**Blocking the Performance chart:**

- The live `GCZ27` holding has no `entryUnderlyingPrice` — it predates the field,
  so `valueOptionPosition` returns `null` and it marks at cost permanently. The
  owner has said he will create the position himself. Do not invent an entry
  price; it lands on a client statement.
- No underlying mark exists yet in `marketPrices`. Needs either a manual post or
  a futures ticker + subscription.

**Massive subscriptions.** Products are sold per asset class, each with a free
tier. Owner is on **Options Basic** and **Stocks**. Stocks powers the AI Engine
(`fetchDailyCloses`, `/v2/aggs`). **Futures Basic is free but not subscribed**, so
the automatic feed will return 401/403 until it is — the error text says so
explicitly. Massive's *Options* product is US-listed equity options and is not
useful for this platform's OTC contracts.

**Security / ops:**

- The IG API key was exposed in a screenshot and has **not been rotated**.
  Rotating needs `secrets:set` **plus** a `functions:default` redeploy — deploys
  pin secret versions.
- `MASSIVE_API_KEY` is set (version 2, enabled).
- All four `gh` accounts have invalid tokens; `git push` fails with "Repository
  not found" (private repo + anonymous = 404). Needs `gh auth login`.
- **Node 20 decommission 2026-10-30.**

**Unaudited:** `generateAccountStatement` in `functions-trading`. It was never
checked against the `avgCost` / proxy-mark bugs. The fill path and snapshot path
both handle options correctly now; the statement generator has not been reviewed.

**Never built:** admin visibility for referral records. Referral codes, links and
attribution exist (`src/lib/referralCodes.ts`,
`src/services/investor/referralService.ts`); nothing surfaces them to staff.

---

## 7. Working with the owner

- He is technical, moves fast, and reads the screen carefully. He personally
  caught the fabricated 58% loss by comparing a stated prediction against the UI,
  and diagnosed the ticker not scrolling. Take his observations seriously.
- **Read the code before proposing.** A plan written from assumption once
  duplicated features that already existed, and that memory persists.
- Patterns he supplies (IG's settings nav, Firebase's console nav) are
  **patterns**, not content to copy literally. Populate them from this codebase.
- Say a correctness concern **once**, clearly, then do it his way. Repeating the
  same caveat across four replies is what made a good session end badly.
- He runs all git, firebase and npm commands himself. The agent has no network
  from `device_bash` and no Firebase credentials.

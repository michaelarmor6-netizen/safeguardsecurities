# Research: Market-Data Backups & Execution-Model Reference

Written 2026-08-23. Parked for later — this is a decision memo, not yet implemented.
Companion to `AGENT-HANDOFF.md`. Nothing here has been coded or deployed.

**The question this answers:** IG is a CFD dealing venue focused on forex/shares, not an
options data source. What do we use as a backup price feed for the underlyings that drive
our option payoffs, and whose trade-execution model should we pattern our improvements after?

---

## 1. What IG is, and where it falls short for us

`functions/ig.ts` uses IG's **dealing API** (`/gateway/deal`) for three jobs:

- candlestick history — `/prices/{epic}?resolution=…&max=…`
- live bid/offer snapshot — `/markets/{epic}`
- epic search (admin instrument lookup)

IG does carry gold, indices and commodities as **CFD epics**, so it is not literally
forex-and-shares-only. But it is the wrong tool for our authoritative marks:

- **It is a dealing venue, not a data vendor.** Needs live/demo account credentials,
  rate-limits hard, and serves IG's own CFD book. Fine for a *chart on the trade desk*;
  wrong for *the daily mark that settles a client's contract*.
- **The basis problem (already in the handoff).** IG's gold is spot/CFD; our COMEX
  contracts settle against **futures**, which differ by the basis (tens of $/oz). Marking
  one against the other manufactures P/L equal to the basis on day one.

**Decision:** keep IG as the *trade-desk chart + live quote* feed. Source the *daily
underlying mark* (which drives P/L in `optionValuation.ts`) from a **futures** feed, kept
separate from IG.

**Still open (from handoff):** the IG API key was exposed in a screenshot and never
rotated. Rotating needs `secrets:set` **plus** a `functions:default` redeploy — deploys pin
secret versions.

---

## 2. Data-source backups

**Key fact:** "Massive" is **Polygon.io rebranded (2026)** — the feed we already use *is*
Polygon. Endpoints/docs/pricing now live at massive.com; product is the same. So our backup
strategy is really "what sits behind Polygon if its futures tier lapses."

| Source | Free tier | Covers our underlyings? | Best used for |
|---|---|---|---|
| **Polygon / Massive** (current) | Basic = **EOD OHLC free**; real-time futures ~$199/mo | Futures, indices, FX, stocks (per-class subscription) | Primary daily marks — the free EOD tier is likely enough since we mark once/day |
| **Yahoo Finance** (`yfinance`, ticker `GC=F`) | Free, unofficial | Gold futures, FX, indices; EOD + intraday | Zero-cost **daily-mark fallback**. Caveat: unofficial, can break without notice / ToS grey area |
| **Stooq** | Free EOD CSV | Futures, indices, FX | Dead-simple secondary fallback |
| **Alpha Vantage** | Free, ~25 req/day | FX + commodities (WTI, Brent, copper, wheat… **no gold**) | FX / oil marks only |
| **Twelve Data** | Free, 800/day, 8/min | FX, indices, stocks — **no commodities/futures** | Backup for FX/index underlyings, not metals |
| **goldapi.io / metals.dev / API Ninjas** | Free spot-gold tiers | Spot XAU (some futures) | Emergency gold mark only — spot ≠ futures, same basis caveat |
| **Databento** | $125 credits; real-time futures from ~$1,399/mo | Institutional futures/tick | Overkill + too expensive for a backup |

**Recommendation**

1. Subscribe Polygon/Massive **Futures Basic** (the free EOD tier). This is the 401/403 the
   handoff mentions — the automatic feed can't work until this is enabled on the account.
2. Wire **Yahoo `GC=F` or Stooq as a free fallback** inside `refreshUnderlyingPricesDaily`:
   if the primary returns non-200, try the fallback before giving up.
3. **Stamp the source** on each `marketPrices` row (e.g. `source: 'massive' | 'yahoo' |
   'manual'`) so a silently-degraded feed is visible.
4. We only need **one mark per day**, so EOD-free tiers are genuinely sufficient. Do **not**
   pay for the $199/mo real-time plan for this.

---

## 3. Execution-model reference: pattern after Deriv

**Deriv** (deriv.com / developers.deriv.com) is the closest analog that exists to SafeGuard:
a broker that **is the counterparty**, selling **limited-risk contracts** (fixed stake,
capped payout) — exactly our model — with a public, well-documented API. Its lifecycle maps
almost 1:1 onto our existing place → work → fill.

**Deriv contract lifecycle**

1. **Proposal** — stateless price quote for a contract (stake, payout, barriers) *before*
   committing. Returns a `proposal_id`. No auth required.
2. **Buy** — executes against that `proposal_id` (or raw params). Authenticated,
   transactional.
3. **Open Contract Status** — live state of an active contract.
4. **Update Contract** + **Contract Update History** — modify an open position *and log
   every change* for compliance.
5. **Sell / Cancel** — early close before expiry, or terminate.

**Two patterns worth stealing directly**

- **The Proposal step.** We currently place → fill with no "here is the exact premium,
  payout and max loss — confirm?" quote object the client accepts. Adding a server-computed
  proposal (premium / payout / break-even from `optionValuation.ts`), which the client then
  buys, closes the gap where a workspace and a statement can disagree: the accepted terms are
  captured at quote time.
- **Contract Update History as an audit spine.** We already have an audit page. Deriv's
  pattern of logging every mutation to an open contract (with a reason) is the right shape
  for a platform where the operator is the counterparty and must defend every number on a
  statement.

**Secondary references (one specific thing each)**

- **Tradier** — a real options broker REST API. Clean order lifecycle; multi-leg order JSON
  if we ever go beyond single contracts.
- **Alpaca** — the gold standard for readable order-state modeling
  (`new → accepted → filled / partially_filled → canceled`) and paper trading. Good model
  for how to document state transitions.

---

## 4. Action items (when we pick this back up)

- [ ] Enable Polygon/Massive **Futures Basic** on the account (stops the auto-feed 401/403).
- [ ] Add **Yahoo/Stooq fallback** + `source` stamping in `refreshUnderlyingPricesDaily`.
- [ ] Rotate the exposed **IG API key** (`secrets:set` + `functions:default` redeploy).
- [ ] Evaluate adding a **Proposal/quote step** to `functions-trading` (server-authoritative
      premium/payout/break-even) before Buy, patterned on Deriv.
- [ ] Consider a **Contract Update History** log for open positions (compliance/audit).

---

## Sources

- Twelve Data 2026 review — https://www.codewords.ai/blog/twelve-data-api
- Futures API comparison (Polygon/Massive vs Databento) — https://www.edgeful.com/blog/posts/futures-data-api-polygon-databento-edgeful-comparison
- Deriv Trading Operations API — https://developers.deriv.com/docs/trading/
- Deriv Price Proposal API — https://developers.deriv.com/docs/trading/proposal/
- Alpha Vantage — https://www.alphavantage.co/
- Finnhub — https://finnhub.io/
- GoldAPI.io — https://www.goldapi.io/
- metals.dev — https://metals.dev/docs

# Lead Sourcing Playbook — SafeGuard CRM / Funnel

Decision log + working playbook for where leads come from, what they cost,
and how quality is verified. Companion to `CRM-LEADS-PLAN.md` (the build
plan for the CRM itself). Last updated: 2026-08-25.

---

## 1. Current decision (2026-08-25)

- Trial **Apollo.io free tier** first. If it shows signs of life, try one
  month of the $49 plan. Anything at the $119/mo (70k credits/yr) tier is
  judged **not sustainable** for our volume.
- In parallel: place a **small test order ($50–100) with an investor list
  broker** as Vicidial/GumaDial fuel.
- Long-term source of record: **GUMA Intelligence (GI)** pushing curated
  leads into the CRM webhook (Phase 3, already live).

## 2. Apollo — what to know before judging the trial

| Plan | Price | Catch |
|---|---|---|
| Free | $0 | ~1,200 email credits/yr, 5 mobile/mo, **only ~10 CSV exports/mo** — enough to prove the import→export pipeline, not volume |
| Basic | $49/mo | **No mobile/phone credits at all** — email-only; weak for a dialer-first funnel |
| Professional | $79/mo | ~100 phone reveals/mo (phone lookups cost 8 credits); overages $0.20/credit |
| Organization | $119/mo | Still only ~200 phones/mo |

- Real-world spend reportedly runs 2–3× sticker once overages hit.
- Credits do not roll over.
- Verdict: Apollo economics are tuned for **email-first B2B** teams. For a
  dialer-first funnel it is one of the weakest values on the market.
- The free trial's purpose here: validate Apollo CSV → CRM import wizard →
  Vicidial export mechanics. 10 exports is enough for that test.

## 3. Cheaper B2B database alternatives (for email prospecting)

| Tool | Entry price | Allowance | Note |
|---|---|---|---|
| RocketReach | ~$33/mo (annual) | 1,200 exports/yr | Cheapest entry |
| Snov.io | $39/mo | ~1,000 credits/mo | Includes campaigns/verification; add-ons push real cost up |
| Skrapp.io | $39/mo | 1,000 credits/mo | No charge for invalid emails |
| Hunter.io | $49/mo | 2,000 searches/mo | Simple, honest pricing |
| Lusha | $49.90/mo | Phones cost 10 credits each | Phone-expensive |
| Kaspr | €59/mo | Unlimited B2B emails + 100 phones/mo | LinkedIn-focused |
| UpLead | $99/mo | 170 contacts w/ mobile | Accuracy guarantee, pricey |

All of these are **B2B databases** (work emails, job titles). They suit
prospecting professionals/HNW by title — not retail investor lists.

## 4. The key market split

Our funnel needs two different supply chains:

- **B2B databases** (Apollo class, above): $33–79/mo, good emails,
  expensive phones. Use for targeted email prospecting only.
- **Consumer/investor list brokers** (InvestorLeads.com, JAD Enterprises,
  BrokersData, etc.): **pay-per-record ≈ $0.03–0.50** depending on
  freshness/exclusivity; accredited-investor and investor-interest lists
  **with phone numbers**. This is the sustainable dialing fuel — thousands
  of dialable records for the price of one Apollo month.
- The AUSSIE LEADS file (personal emails: hotmail/bigpond + mobiles) is
  consumer-lead supply, i.e. broker-class data — Apollo cannot produce it.

## 5. Recycled-lead reality + vetting checklist

There is **no guarantee** a purchased lead isn't recycled — no registry
exists of who was sold what. Price tiers ARE the disclosure: $0.03 aged
records have been dialed by several shops already; $5–50 "real-time
exclusive" leads cost that because they haven't. Buy on **terms**, then
verify **empirically**:

Contract terms to demand:
- [ ] Exclusivity window (30/60/90-day exclusive before resale)
- [ ] Replacement policy (credit back disconnects / wrong numbers / DNC hits)
- [ ] Provenance: origin of each lead (co-reg survey, webinar, prior offer)
      with consent trail (timestamp + source URL). No provenance = recycler.

Empirical vetting (before any big order):
- [ ] Buy the smallest batch they'll sell
- [ ] Run phones through a line-type/disconnect lookup (Twilio Lookup,
      ~half a cent per number). "Fresh" list with 20%+ disconnected =
      relabeled aged stock
- [ ] Wash against DNC before dialing (AU: Do Not Call Register wash
      services; US: national DNC)
- [ ] Dial the sample; read dispositions. Connect rate, AM rate,
      disconnect rate, "not interested — again?!" rate are the only
      quality metrics that can't be faked
- [ ] CRM dedupe (`findExisting`) across vendors: heavy collision between
      two brokers = same recycled pool
- [ ] Track **cost-per-CONNECT per vendor**, not cost-per-record. A $0.40
      list connecting at 25% beats a $0.05 list connecting at 3%. Reorder
      decisions come from this number only.

## 6. Hard rule — email vs phones

**Never load purchased lists into the Resend funnel.** Resend (like every
reputable ESP) prohibits mailing bought lists; violation = account
suspension + burned safeguardsecurities.us domain reputation (which the
funding emails depend on).

The designed flow:

    purchased list → Vicidial/GumaDial call → agent gets interest
      → points to gold/pre-IPO landing page → self-registration
      → leadCapture consent event → funnel email track enrolls

Bought data feeds the phones. Only opted-in people get emails. This is
exactly what the CRM's mandatory `consentBasis` enforces.

## 7. GumaDial readiness for this use case

Software side is ready (takes the same Vicidial-format CSV the CRM
exports). Blocked on the §1 operator-checklist decisions in
`D:\All Apps\AiPowerDialer\docs\OPERATOR_CHECKLIST.md`:
1. First market to dial (determines caller-ID + DNC compliance setup)
2. Carrier / SIP trunk account
3. VM to host Asterisk

## 8. GI — the long-term escape hatch

The recycling problem exists because everyone buys from the same finite
pool of resold consent. GI curating its own prospects, with provenance
controlled end-to-end, pushed free into the CRM webhook (contract in
`CRM-LEADS-PLAN.md`), is the only version where lead quality **compounds**
instead of decaying. Purchased lists are a bridge to keep agents busy
while GI matures.

Flywheel: GumaDial/Vicidial disposition data becomes GI's training signal
for what a good lead looks like → dial, learn, curate better. That loop is
the moat no list broker can sell.

## 9. OpenClaw note

The paid sources the OpenClaw bot once mentioned are almost certainly the
same vendor classes above (B2B databases + lead brokers — there is no
secret catalog). Its fast credit burn is a separate issue: it meters LLM
API calls; point it at a cheaper/local model to fix, independent of lead
sourcing.

## 10. Regulatory caveat

Cold outreach for securities offerings carries regulatory weight in both
AU and the US (AU DNC Register + Spam Act; US general-solicitation rules).
Check with compliance before scaling. (Not legal advice.)

## Next actions

- [ ] Apollo free account → test CSV export → CRM import → Vicidial export
- [ ] Small test order with one investor list broker; run §5 checklist
- [ ] Answer GumaDial §1 checklist (market, carrier, VM)
- [ ] Stand up GI curation mission (webhook contract in CRM-LEADS-PLAN.md)
- [ ] Re-set rotated RESEND_API_KEY + Namecheap `send` MX (blockers to any
      email sending at all)

# SafeGuard CRM — leads intake → Vicidial CSV + email funnel

**Date:** 2026-08-25 · **Status:** implementation plan, awaiting JL's go ·
**Lives in:** `backend/ebank_dashboard` (the live Firebase app) · **Owner runs
all git/firebase/npm commands** — this plan assumes that split throughout.

---

## 0. The shape of the thing, in one paragraph

A new **Admin → CRM** section: drop in lead documents of any kind (Excel, CSV,
Word, PDF, scans, plain text), the system extracts and normalises the contacts,
an admin reviews the mapping before anything is saved — AI-powered, human-led,
same as GumaDial — and from the resulting lead store two outputs flow: a
**Vicidial-ready CSV download** for the dialer, and **bulk email campaigns**
sent through Resend. Leads with phones go to the dialer; leads with emails go
to the funnel; both from one table. A third intake exists beside the file drop: a **webhook
receiver for Guma Intelligence**, so GI can push curated investor-prospect
dossiers straight into the same review queue. This is the SafeGuard-local
instance of the same three-door model GI/GumaDial uses, and the contract is
kept compatible on purpose (E.164 + consent fields, GI lead ids preserved),
so nothing here is throwaway when the ecosystem converges.

## 1. Recommendations, decided up front

| Decision | Recommendation | Why |
|---|---|---|
| Email provider | **Resend** (keep) | Already integrated in `functions-accounts` (funding emails); one provider, one suppression list, one DNS fight. SES is cheaper past ~50k/mo — revisit only at that volume. |
| Structured parsing | **Client-side**: SheetJS (xlsx/csv), mammoth (docx), pdfjs-dist (text PDFs), plain text | Zero new infra, zero PII leaving the browser before review, instant preview. |
| OCR for scans | **Tesseract.js in the browser first**; Cloud Vision API (~$1.50/1k pages) as a phase-2 upgrade behind the same interface | Free, private, good enough for typed lists. Vision only if real scan volume shows up. |
| Entity extraction from messy text | **Heuristics first** (regex email/phone + line-shape rules), optional LLM-assisted mapping later | The review grid catches misses either way; don't buy a model until the heuristics measurably fail. |
| Where the backend lives | **New codebase `functions-crm`** | Matches the existing four-codebase split; campaign sending must never share a deploy unit with trading or funding. |
| Where leads live | **Firestore** (`crmLeads`, `crmImports`, `crmCampaigns`, `crmSuppression`) | It's what the app has. Volumes here are thousands, not millions — GI-scale lead-gen stays in GI. |
| Phone normalisation | **libphonenumber-js**, default region PH, store E.164 | Same rule as GumaDial: normalise once at the boundary or fail the row. |
| GI inbound | **HMAC-signed webhook into `functions-crm`, landing in a staging inbox — never directly into `crmLeads`** | Push beats pull (GI already has mission gates and knows when a dossier is ready); the staging inbox keeps the human-led review gate identical across all three intakes. |

## 2. Admin UI (4 new pages under `src/pages/investor/admin/crm/`)

```
Admin → CRM
├── Leads       table: search/filter/tag/status, bulk select,
│               [Export Vicidial CSV] [Add to campaign] [Suppress]
├── Imports     the wizard (below) + batch history + **GI Inbox** tab (§4)
├── Campaigns   list + builder + per-campaign stats
└── Settings    sender identity, physical address for footer,
                default country for phone parsing, suppression manager
```

**Import wizard — the heart of it, 4 steps:**

1. **Drop files** (multi-file, mixed types OK). Files land in Firebase Storage
   `crm-imports/{batchId}/…` for the audit trail; parsing runs in the browser.
2. **Extract & map.** Structured files → column-mapping table (auto-guess
   headers: "mobile/cell/telepono" → phone, etc.; admin corrects; mapping saved
   per-source for reuse). Unstructured text/OCR → candidate contacts from
   heuristics, each with the source line shown beside it.
3. **Review grid** — every row, with per-row validation: phone parses to E.164
   or row is flagged; email RFC-valid or flagged; duplicates (against the batch
   AND the store, by phone/email) pre-checked for merge-vs-skip; rows matching
   `crmSuppression` shown struck-through and locked out. Admin unticks junk.
   **Nothing writes to Firestore until this step is confirmed** — that is the
   human-led gate, and it is the same pattern as campaign preflight in GumaDial.
4. **Commit** → `crmLeads` rows + `crmImports` batch record (file refs, mapping
   used, counts kept/rejected/deduped, who confirmed). Every lead carries
   `source` (batch + filename) and `consentBasis` (admin picks one per batch:
   inquiry / existing-business / purchased-list / unknown — mandatory field,
   because "why were you allowed to contact this person" must survive import).

## 3. Vicidial export

Button on the Leads table (current filter or selection) → CSV in Vicidial's
**standard lead-loader layout**, so the admin loads it with zero column
fiddling:

```
vendor_lead_code,source_id,list_id,phone_code,phone_number,title,first_name,
middle_initial,last_name,address1,address2,address3,city,state,province,
postal_code,country_code,gender,date_of_birth,alt_phone,email,security_phrase,
comments,rank,owner
```

Rules applied at export, not left to the admin's memory: E.164 split into
`phone_code` (e.g. `63`) + national `phone_number` digits; `vendor_lead_code` =
our `crmLeads` doc id (so dispositions can ever be matched back);
`list_id` left blank or set from a prompt; suppressed/DNC leads excluded
unconditionally; rows without a parseable phone excluded (they're funnel-only
leads, not dialer leads); UTF-8, CRLF, no BOM. Export events are logged to the
existing audit trail (`InvestorAdminAuditPage` infrastructure) — a CSV of PII
leaving the system should always answer who/when/what filter.

(If Vicidial's loader is used in "custom layout" mode instead, any column
order works anyway — but shipping the standard template costs nothing.)

## 4. GI inbound webhook — curated investor leads

GI's whole point is producing CRM-ready dossiers; SafeGuard is a consumer of
that output for one specific segment: **business owners with investor
potential** (GI curates; SafeGuard declares the appetite, GI does the
filtering — scoring stays GI's job, per the scope rule in §8).

**Endpoint.** `POST /gi/leads` — an HTTPS function in `functions-crm`.

- **Auth:** HMAC-SHA256 over the raw body with a shared secret
  (`GI_WEBHOOK_SECRET`, a Firebase secret), sent as `X-GI-Signature`, plus an
  `X-GI-Timestamp` bound into the signature with a ±5-minute window — replay-
  and tamper-proof with zero OAuth ceremony. Per-source secrets live in a
  `crmSources` collection so a second producer later (GumaDial dispositions,
  a partner feed) gets its own key and its own kill switch.
- **Payload:** a batch of up to 100 leads. Per lead: `giLeadId` (required —
  becomes the idempotency key AND is preserved so GI's id survives all the
  way into Vicidial's `vendor_lead_code`), `mission` (e.g. `mission-008`),
  name/company/phone/email/country, `consentBasis` + `consentSource`
  (required — a GI lead without consent provenance is rejected per-row, not
  silently defaulted), `segment` (e.g. `investor-prospect`), `dossier` (the
  screen-pop/context object, stored verbatim), `tags[]`.
- **Response:** per-lead results — `accepted | duplicate | suppressed |
  rejected(reason)` — so GI's side can reconcile instead of guessing.
- **Idempotency:** inbound doc id is derived from `giLeadId`; redelivery of
  the same batch is a no-op. GI can retry freely.

**Where it lands: `crmInbound`, not `crmLeads`.** The Imports page gets a
**GI Inbox** tab showing pending batches by mission, with the same review
grid as file imports — dedupe against the store, suppression pre-checked,
dossier visible per row. Admin accepts (→ `crmLeads` with
`source = gi:{mission}`) or declines with a reason. Same human-led gate,
third door. An **auto-accept toggle per source** exists in Settings but ships
OFF — earn it with a few clean batches first, exactly like predictive mode
was earned in the dialer.

**The return path (flywheel, phase 4):** what SafeGuard learns — converted,
not interested, wrong party, funded — is intelligence GI should eat. A
mirrored outbound webhook (same HMAC pattern, GI hosts the receiver) posting
disposition events keyed by `giLeadId`. Not built now; the id discipline
above is what makes it a small job later instead of a migration.

## 5. Email funnel

**Prerequisite that blocks everything: the Resend domain verification.** The
08-24 finding stands — SPF on `send.safeguardsecurities.us` is correct, the MX
row is missing at Namecheap, and `RESEND_API_KEY` was never set. Fix those two
(re-adding mx1/mx2.privateemail.com alongside, per the handoff caution) and
both the funding emails and this whole funnel light up. Until then the
campaign builder can ship and simply refuse to send, exactly like the funding
page does today.

**Campaign model, deliberately simple in v1:** one campaign = one email to one
segment. (Drip sequences are phase 4; most "funnels" die of over-modelling
before the first send.)

- **Builder:** name, segment (saved filter over `crmLeads`: tags, source,
  has-email, status), subject, HTML body with merge fields
  (`{{firstName}}`, `{{company}}`), plain-text alternative auto-derived,
  mandatory footer block (physical address + unsubscribe — the builder will
  not save a template without both; CAN-SPAM is a checkbox here, not a memo).
- **Test send** to the admin's own address before Launch is enabled.
- **Sending worker** in `functions-crm`: a scheduled function drains a
  `crmCampaignQueue` at a configured rate using Resend's batch endpoint (100
  per call), stamping per-recipient status. Queue-drain, not a big loop in one
  invocation — survives timeouts, resumes safely, and respects plan limits
  (free tier is ~100/day; sending pace is a Settings knob).
- **Resend webhooks** (`delivered / bounced / complained / opened / clicked`)
  → an HTTPS endpoint in `functions-crm` → per-lead events + campaign stat
  counters. **Hard bounces and complaints auto-write to `crmSuppression`** —
  that is not optional; it is what keeps the domain sendable.
- **Unsubscribe:** tokenised link to a tiny hosted page + `List-Unsubscribe`
  one-click header. Lands in `crmSuppression` immediately; suppression is
  checked at queue-build AND at send time (same both-ends pattern as DNC in
  the dialer).
- One caution flag, honestly: SafeGuard is an investor-facing counterparty.
  Bulk email to purchased lists is where marketing law and securities-adjacent
  rules intersect — the `consentBasis` field exists so counsel can draw the
  line per segment ("existing-business only" is a one-filter policy).

## 6. Data model (Firestore)

```
crmLeads/{id}         firstName lastName company phoneE164? email? country
                      tags[] status(new|working|customer|dead) source{batchId,file}
                      consentBasis consentNote createdAt updatedAt
                      lastEmailedAt? lastExportedAt? notes
crmImports/{batchId}  files[{storagePath,name,type}] mapping{} consentBasis
                      counts{parsed,kept,rejected,deduped,suppressed}
                      confirmedBy confirmedAt
crmCampaigns/{id}     name segment{} subject html text status(draft|testing|
                      sending|sent|paused) stats{queued,sent,delivered,bounced,
                      complained,opened,clicked,unsubscribed} createdBy timestamps
crmCampaignQueue/{id} campaignId leadId email renderedAt sendAfter status attempts
crmSuppression/{id}   type(email|phone) value reason(unsub|bounce|complaint|manual)
                      source addedAt            ← mirrors dialer DNC semantics
crmEvents/{id}        leadId campaignId? type payload at   (webhook + audit fan-in)
crmInbound/{id}       giLeadId mission segment dossier{} lead{...} status(pending|
                      accepted|declined) result reviewedBy reviewedAt receivedAt
crmSources/{id}       name secretVersion active autoAccept(false) lastSeenAt
```

`crmLeads.source` gains the `gi:{mission}` form, and `crmLeads.giLeadId` is
indexed — it is the join key for the phase-4 return path and the value that
flows into Vicidial's `vendor_lead_code` unchanged.

Firestore rules: everything `crm*` is **staff-only** (same admin-role
predicate the other admin collections use); `crmSuppression` writes also
allowed to the two functions (unsub endpoint, webhook). The unsubscribe page
itself goes through a function, never direct client writes.

## 7. Build order and effort

| Phase | Scope | Size |
|---|---|---|
| **1. Lead store + structured import + Vicidial CSV** | Firestore collections + rules, Leads/Imports pages, wizard for CSV/XLSX (SheetJS), validation + dedupe + suppression, export button. **Immediately useful on day one.** | 3–4 days |
| **2. Unstructured intake** | TXT + DOCX (mammoth) + text-PDF (pdfjs) + scans (tesseract.js), heuristic extraction, review-grid polish, per-source saved mappings. | 2–3 days |
| **3. Funnel v1 + GI intake** | `functions-crm` codebase: campaign builder + test send, queue worker, Resend webhooks, unsubscribe page, suppression enforcement, stats — plus the GI `POST /gi/leads` receiver and the GI Inbox tab (they share the codebase and the deploy, and the inbox reuses phase 1's review grid). | 4–5 days |
| **4. Later, on evidence** | Drip sequences; Vision OCR; LLM-assisted mapping; Vicidial API push (skip the manual CSV step); disposition import back from Vicidial; the disposition webhook back to GI (the flywheel's return half); per-source auto-accept. | — |

Phases 1–2 have **no deploy dependencies at all** (pure hosting + Firestore
rules). Phase 3 needs the Resend DNS fix and one new secret.

**Your side (unchanged from the 08-24 handoff, plus one):** add the missing MX
on `send` at Namecheap (keeping privateemail rows), set `RESEND_API_KEY`
(paste the real key — the CLI rejects blanks), and when phase 3 deploys:
`firebase deploy --only hosting,functions:crm` alongside the
`functions:accounts` deploy you already owe. For the GI hookup, two more:
generate the shared secret (`firebase functions:secrets:set GI_WEBHOOK_SECRET`)
and hand GI the endpoint URL + secret — the GI side then implements the
mission-gated push against the payload contract in §4 (a natural Mission
deliverable on that repo).

## 8. Risks, named

- **Deliverability is earned slowly.** A fresh domain blasting a purchased
  list gets junked and burns the domain the funding emails use. Mitigation:
  the pace knob, starting small, suppression discipline, and honestly —
  segmenting purchased-list sends behind a separate subdomain if they ever
  happen at volume.
- **OCR quality on phone-camera scans** will disappoint; the review grid is
  the safety net, Vision the upgrade path. Don't promise magic on step 1.
- **PII concentration**: `crmLeads` becomes the most sensitive collection in
  the app after wallets. Staff-only rules from commit one, and exports audited.
- **Scope creep toward GI.** This CRM is intake + two outputs. Scoring,
  enrichment, dossiers — that's Guma Intelligence's job; the §4 webhook IS
  the sanctioned way GI's output arrives here. The moment someone proposes
  building enrichment inside SafeGuard, the answer is "add it to a GI
  mission and push it through the webhook".

---

## STATUS 2026-08-25: Phase 1 SHIPPED (uncommitted)

Built and installed into the repo this session:

- `src/services/investor/crm/` — crmTypes, leadNormalizer (libphonenumber-js,
  PH default), crmLeadService, crmImportService (CSV parser + lazy-loaded
  SheetJS for Excel), crmSuppressionService, vicidialExport
- `src/pages/investor/admin/crm/` — Leads page (filter/select/status/suppress/
  delete/export) and the 4-step Imports wizard with the review-grid gate
- Routes `/admin/crm-leads` + `/admin/crm-imports`, nav entries, three new
  collections in liveCollections, staff-only blocks in firestore.rules and a
  `crm-imports/**` block in storage.rules, `xlsx` + `libphonenumber-js` in
  package.json/lock

Verified in the cloud container against this exact tree: `tsc --noEmit` clean,
full `vite build` clean, and 40+ logic assertions green (CSV quoting/multiline,
PH + intl phone normalisation, header guessing incl. Tagalog, batch dedupe,
include/exclude defaults, Vicidial column layout, phone_code/national split,
GI id -> vendor_lead_code, CRLF + no BOM). Device copies are byte-identical
(aggregate sha e9e7983c…). Device tsc currently fails ONLY on the two
not-yet-installed packages — expected.

**Owner steps to light it up:**
1. `npm install`               (pulls xlsx + libphonenumber-js per the lockfile)
2. `npm run type-check`        (should now be clean)
3. `npm run deploy:rules`      (crm* Firestore blocks + crm-imports Storage block)
4. `npm run deploy:hosting`    (whenever the next hosting deploy goes out)

Nothing in this phase touches functions, trading, funding, or existing pages
beyond two routes and two nav lines. Phase 2 (Word/PDF/scans) and phase 3
(funnel + GI webhook) per the plan above.

## STATUS 2026-08-25 (later): Phase 3 funnel SHIPPED (uncommitted)

- Campaign sequences: `crmCampaignTypes/Service`, `crmMerge` (CHANGE-BOTH twin
  in functions-crm), `crmFunnelTemplates` — two built-in tracks, five emails
  each: **Gold Investments** and **Pre-IPO Access**, every email ending in the
  two funnel exits (book a consultation / demo-account registration), with
  risk disclosures and unsubscribe in every footer. Copy is stored ON the
  campaign doc, so subjects/bodies are editable in the console without deploys.
- `/admin/crm-campaigns`: create-from-track, per-step subject editing, live
  iframe preview, settings (appointment URL, demo URL, postal address —
  activation refuses without the address), pause/activate, funnel counts.
- Leads page: "Add to campaign…" enrolls the selection (suppression checked,
  idempotent per campaign+lead).
- `functions-crm` (5th codebase, registered in firebase.json): 5-minute queue
  worker (advance-before-send = crash-safe toward under-delivery, never
  double-send; CRM_SEND_BATCH pace knob), tokenised one-click unsubscribe
  (opt-out kills every active sequence for that address), Resend webhook
  (delivered/opened/clicked stats; bounces + complaints auto-suppress).
- Verified in container: web tsc + vite build clean; functions-crm tsc clean;
  10 emails pass structural + compliance assertions (balanced HTML, both CTAs,
  unsubscribe + risk text present, no unrendered merge fields, no
  return-promise language). Device copies byte-identical (sha 0081a1ab…).

**Owner steps to light the funnel up (in order):**
1. Namecheap: add the missing MX on `send` (keep privateemail rows) → Resend verifies.
2. `firebase functions:secrets:set RESEND_API_KEY` and `firebase functions:secrets:set CRM_LINK_SECRET` (any long random string).
3. `cd functions-crm && npm install` (once), then `firebase deploy --only functions:crm,firestore:rules,hosting`.
4. In Resend: add webhook POST {functions-url}/resendWebhook?k=<hmac 'webhook' with CRM_LINK_SECRET — ask Claude to compute it, or grab it from the function logs on first 401>.
5. Console: create the campaign, set the postal address + real appointment/demo URLs, enroll a SMALL test list, activate. CRM_SEND_BATCH (default 40/5min) is the pace knob.

## STATUS 2026-08-25 (final): Phase 3 COMPLETE — GI webhook + inbox (uncommitted)

- `giLeadsWebhook` in functions-crm: HMAC-SHA256 over `${timestamp}.${rawBody}`
  (X-GI-Signature / X-GI-Timestamp, ±5-min window), batches ≤100, per-row
  validation (giLeadId + consentBasis + consentSource mandatory, E.164/email
  format enforced), suppression refused at the door, idempotent inbound ids
  (sha256 of giLeadId), per-row results returned so GI reconciles.
  Kill switch: crmSources/gi.active=false refuses batches without secret churn.
- GI Inbox tab on /admin/crm-imports: pending rows with mission, consent
  provenance and dossier preview; Accept (store-level dedupe, giLeadId +
  dossier preserved into crmLeads.payload, source gi:{mission}) or Decline
  with reason. Same human-led gate as the other two intake doors.
- Verified: functions-crm + web tsc clean, vite build clean, 20 assertions on
  the signature scheme (tamper/replay/window/wrong-secret) and row validation.
  Device copies byte-identical (sha 6f92d59f…).

**GI-side contract (for the mission on guma_intelligence):**
POST {functions-url}/giLeadsWebhook with JSON `{leads:[{giLeadId, mission,
firstName, lastName, company?, phoneE164?, email?, country?, consentBasis,
consentSource, segment?, tags?, dossier?}]}` — sign hex(HMAC_SHA256(secret,
timestamp + "." + rawBody)) into X-GI-Signature, unix-seconds into
X-GI-Timestamp. Response: per-lead accepted|duplicate|suppressed|rejected(reason).
Secret: `firebase functions:secrets:set GI_WEBHOOK_SECRET` (same value both sides).

## STATUS 2026-08-25 (evening): campaign landing pages + capture endpoint (uncommitted)

- `D:\safeguardsecurities\campaign\gold.html` + `preipo.html` — self-contained
  static landing pages (no external assets), message-matched to the two email
  tracks, two exits each (register form / book consultation), demo link, risk
  footers, explicit consent checkbox.
- `leadCapture` in functions-crm — the ONE public write path into the CRM:
  honeypot + min-dwell bot screen, validates, writes/updates crmLeads
  (consentBasis 'inquiry', one lead per email), clears suppression on a fresh
  form fill (a resubmission IS fresh consent), and auto-enrolls into the
  newest ACTIVE campaign of the matching track so the first email goes out on
  the worker's next tick. No active campaign = lead still captured, form
  never fails over campaign state.
- Placeholders to update before launch (in both HTML files + campaign
  settings): the functions URL in the form fetch (region/project), the
  appointments URL, the demo/signup URL.
- Deploy: pages go out with the marketing site; endpoint ships with
  `firebase deploy --only functions:crm` (no new secrets).

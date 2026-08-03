# Investor Side — Feature Inventory (Stage B draft)

*Every investor-side feature: status, vertical, user stories, acceptance criteria, data/routes
touched, and a build order with its dependency chain. Companion to `docs/INVESTOR_PRD.md`. Status
values: **exists (old-quality)** · **rebuild** · **new** · **dead — delete** · **deferred**.*

---

## Vertical 1 — Sourcing / signal

### F1.1 — Inbound Q-Score-ranked deal flow
**Status:** exists (old-quality). **Data/routes:** `app/investor/deal-flow/page.tsx`,
`app/api/investor/deal-flow/route.ts` (reads `founder_profiles`, `qscore_history` via
`get_latest_qscores` RPC, `createAdminClient()`).

- *As an investor, I want to see founders ranked by investment-readiness, so I don't have to
  manually triage every profile on the platform.*
  - **Given** an authenticated investor with no filters applied, **when** they open Deal Flow,
    **then** founders with `visibility_gated = false` appear sorted by time-decayed Q-Score.

### F1.2 — First-party trajectory ranking (the differentiator)
**Status:** new. **Data/routes:** new query over existing `qscore_history` (trend, not snapshot)
+ `asset_versions`/`agent_artifacts` (activity signal) once available; no new ingestion.

- *As an investor, I want to see which founders are actively improving, not just who currently
  scores highest, so I catch momentum before it's obvious to everyone else.*
  - **Given** two founders with the same current Q-Score, **when** one has gained 12 points over
    the last 3 cycles and the other has been flat, **then** the improving founder ranks higher (or
    is visibly flagged as "trending") in deal flow.
  - **Given** a founder has shipped 3 asset revisions this cycle, **when** an investor views their
    card, **then** that activity is visible as a signal distinct from the Q-Score itself.
- **Blocked on:** real founder activity on the new engine (per `INVESTOR_SIDE_PLAN.md` §6 — "no
  first-party signal exists until founders actually operate on the new model"). Cannot ship ahead
  of the founder pilot producing real data, independent of any investor-side engineering.

### F1.3 — Lightweight external enrichment
**Status:** deferred (plan doc's own Phase 4-I; audit found no existing wiring to build on —
Apollo/Hunter are founder-side tools, not investor enrichment, contra the plan doc's implication).
**Data/routes:** none yet; would be new integration work.

---

## Vertical 2 — Screening / triage

### F2.1 — Thesis PDF/text upload + extraction
**Status:** exists (old-quality, one bug). **Data/routes:**
`app/api/investor/thesis-upload/route.ts`, writes `investor_profiles.thesis` + parsed
sectors/stages/check-sizes.

- *As an investor, I want to upload my fund's thesis document and have my focus criteria
  pre-filled, so I don't have to manually re-enter what's already written down.*
  - **Given** an investor uploads a text-based PDF thesis, **when** extraction completes, **then**
    sectors/stages/check-sizes are pre-populated for review before saving.
  - **Given** an investor uploads a scanned/image-only PDF, **when** the vision-extraction path
    runs, **then** it must go through `lib/llm/router.ts` like the text path — **currently
    hardcodes the model directly, bypassing the router** (audit §1, CLAUDE.md §2 violation). Bug,
    not a missing feature.

### F2.2 — Thesis-weighted parameter scoring
**Status:** exists (old-quality). **Data/routes:** `app/api/investor/weights/route.ts`,
`investor_parameter_weights` table.

- *As an investor, I want to weight the six Q-Score dimensions to match what my fund actually
  cares about, so ranking reflects my thesis, not a generic default.*
  - **Given** an investor sets Team weight higher than Financials, **when** deal flow re-renders,
    **then** founders with stronger team scores rank higher relative to the generic Q-Score order.

### F2.3 — `deal-flow-with-dimensions`
**Status:** **dead — delete.** Zero callers anywhere in the codebase; queries `founder_profiles`
with the RLS-scoped client (not admin), so it silently returns empty even if called (audit §1, §2
M-1). **Action:** remove the route in Stage C's cleanup pass rather than carry it forward as "to
rebuild" — it represents no working functionality today.

### F2.4 — Explainable thesis-fit reasoning
**Status:** new. **Data/routes:** proposed `AssetDef` per `docs/INVESTOR_PRD.md` §7 — "why this
deal fits your thesis," Composer-generated the same way founder briefings are.

- *As an investor, I want a plain-language reason a deal matches my thesis, not just a number, so
  I can trust the ranking enough to act on it.*
  - **Given** a founder scores 78 and matches 4 of 5 thesis criteria, **when** an investor views the
    card, **then** a short generated explanation names which criteria matched and which didn't —
    versioned as an Asset, provenance-tracked, never re-generated silently on re-view.
- **Blocked on:** `docs/INVESTOR_PRD.md` §6b (identity-substrate decision) — this is the first
  genuinely Registry-shaped investor feature.

---

## Vertical 3 — Diligence acceleration

### F3.1 — AI investment memo generation
**Status:** exists (old-quality, one bug). **Data/routes:**
`app/api/investor/startup/[id]/memo/route.ts`, reads + **writes** `agent_artifacts` via
`lib/claude.ts` (`callClaude()`, hardcoded model — bypasses the router, audit §1).

- *As an investor, I want a generated investment memo for a founder I'm evaluating, so I don't
  have to manually synthesize their profile, financials, and materials myself.*
  - **Given** an investor with a paid tier requests a memo for a founder, **when** generation
    completes, **then** the memo is persisted and re-fetchable without regenerating.
  - **Given** the model call goes through `callClaude()`, **when** Stage C rebuilds this route,
    **then** it must call `routedText()`/`lib/llm/router.ts` like `startup/[id]/chat` already does
    correctly — this is a fix, not new functionality.
  - **Missing today, real gap:** no `visibility_gated` check (audit §2, H-1) — any investor with a
    `founderId` can generate a memo for a founder the platform has hidden from listing. **Security
    fix, not a feature request** — tracked in Stage C, not here.

### F3.2 — Founder-specific diligence chat
**Status:** exists (old-quality, correctly routed). **Data/routes:**
`app/api/investor/startup/[id]/chat/route.ts`, uses `routedText('reasoning', ...)` correctly.

- *As an investor, I want to ask follow-up questions about a specific founder's profile, so I can
  clarify details without re-reading the whole deep-dive page.*
  - **Given** an investor asks "what's their burn rate," **when** the chat responds, **then** the
    answer is grounded in that founder's actual `startup_profile_data`/artifacts, not invented.
  - **Missing today:** same `visibility_gated` gap as F3.1 (audit H-1), and no max-length
    validation on the free-text question (audit H-3) — both Stage C fixes.

### F3.3 — 4-agent readiness synthesis (financial/GTM/market/product → Sage synthesis)
**Status:** rebuild (backend exists and is well-engineered; **zero UI wiring** — audit §1, §4).
**Data/routes:** `app/api/investor/ai-analysis/readiness/route.ts` (properly routed through
`llmChat(modelTier:'fast'|'capable')`), consumer hook `useReadinessReport.ts` has no component
importers anywhere.

- *As an investor, I want a synthesized readiness report across financial/GTM/market/product
  dimensions, so I get a diligence-quality analysis without commissioning one manually.*
  - **Given** the backend already produces this analysis correctly, **when** Stage C work begins,
    **then** the task is "add a UI entry point that calls this existing route" — **not** "build the
    readiness synthesis." This is the single fastest, cheapest win in the entire inventory.
  - **Given** the route currently takes `founderId` from `request.json()` unchecked (audit H-1),
    **when** it's wired up, **then** the `visibility_gated` check must be added at the same time —
    don't ship the UI before the gate.

### F3.4 — Evidence-backed diligence from real operating data
**Status:** new — "the killer feature" per `INVESTOR_SIDE_PLAN.md` §3 Vertical 3. **Data/routes:**
would read `asset_versions` (once populated) instead of `agent_artifacts`/`profile_builder_data`.

- *As an investor, I want a founder's claims (e.g. "11 pilots") backed by their actual on-platform
  GTM asset history, so I'm diligencing verified activity, not a self-reported claim.*
  - **Given** a founder claims "11 pilot customers" in their profile, **when** they're also
    operating on the new engine, **then** the memo/readiness report can cite the specific
    `asset_versions` entries that substantiate (or fail to substantiate) the claim.
- **Blocked on:** §6b (identity substrate) **and** real founder asset-version data existing — this
  is the clearest "two-sided data" feature and cannot be faked with current data.

---

## Vertical 4 — CRM / relationship (keep thin, per PRD §3 — not a scope gap, a deliberate ceiling)

### F4.1 — Pipeline stage tracking
**Status:** exists (old-quality). **Data/routes:** `app/investor/pipeline/page.tsx`,
`app/api/investor/pipeline/route.ts`, `investor_pipeline` table (RLS sound).

- *As an investor, I want to track which stage each founder is in (watching/meeting/DD/portfolio),
  so my pipeline reflects where I actually am with each relationship.*
  - **Given** an investor moves a founder from "watching" to "meeting," **when** they save, **then**
    the stage persists and is reflected in dashboard stage counts.

### F4.2 — Watchlist (score-threshold alerts)
**Status:** exists (old-quality, embedded feature, not a standalone page). **Data/routes:**
embedded in `deal-flow/page.tsx`, `investor_watchlist` table.

- *As an investor, I want to be alerted when a founder I'm watching crosses a Q-Score threshold, so
  I don't have to keep manually re-checking.*
  - **Given** an investor sets a watch threshold of 70, **when** the founder's score crosses 70,
    **then** an alert fires (mechanism: `cron/investor-match-alerts`).

### F4.3 — Connection requests
**Status:** exists (old-quality). **Data/routes:** `app/api/investor/connections/route.ts`,
`connection_requests` table (app-enforced ownership, correct pattern per audit §2).

- *As an investor, I want to request a connection with a founder and see the status of that
  request, so I know whether I can message them yet.*
  - **Given** an investor sends a connection request, **when** the founder accepts, **then**
    `messages` becomes available for that pair.
  - **Missing today:** no enum validation on `action` in the accept/decline body (audit H-3) —
    Stage C fix.

### F4.4 — Messaging
**Status:** exists (old-quality). **Data/routes:** `app/api/investor/messages/route.ts`,
`messages` table.

- *As an investor, I want to message a founder I'm connected with, so I can move the relationship
  forward without leaving the platform.*
  - **Given** two parties have an accepted connection, **when** either sends a message, **then**
    it's persisted and visible to both, ordered by timestamp.

### F4.5 — Outreach action
**Status:** exists (old-quality) → **rebuild onto the Connector/approval-gate engine.**
**Data/routes:** `app/api/investor/outreach/route.ts`, writes `connection_requests`.

- *As an investor, I want to send an outreach message to a founder through the platform (eventually
  via email), so my first touch doesn't require leaving the app.*
  - **Given** outreach becomes an email send (not just an in-app message), **when** it's rebuilt,
    **then** it must be modeled as an `ActionDef` with `irreversible: true, connector: 'gmail'`,
    reusing the exact Story 3 approval-gate chain (`lib/actions/generate.ts` → `approve.ts` →
    `execute.ts`) verbatim — this is the cleanest, lowest-risk engine-reuse case in the whole
    inventory because the gate logic is already provider-neutral (audit §3 Part A).

### F4.6 — `investor_contacts`
**Status:** **not an investor feature — remove from this inventory's scope.** Confirmed to be a
founder-side table ("Founders manage own investor contacts"), unused by any query (audit §1,
Vertical 4). Listed here only to close the loop on `INVESTOR_SIDE_PLAN.md`'s original claim.

---

## Vertical 5 — Portfolio monitoring / LP reporting

### F5.1 — Portfolio companies tracking (+ import, bulk-invite)
**Status:** exists (old-quality, substantial). **Data/routes:**
`app/investor/portfolio-companies/page.tsx` (850 lines), 5 API routes,
`investor_portfolio_companies` table.

- *As an investor, I want to track my existing portfolio companies on the platform and invite their
  founders to join, so my portfolio view isn't limited to platform-native deals.*
  - **Given** an investor CSV-imports 20 portfolio companies, **when** import completes, **then**
    each becomes a trackable row with an invite-status field, and matching by founder email
    auto-links a company once its founder registers.

### F5.2 — Portfolio health as a weekly Rhythm
**Status:** new. **Data/routes:** proposed `ProgramTemplate` ("Monitor Portfolio") running weekly,
reading each portfolio company's on-platform operating data.

- *As an investor, I want each portfolio company's status auto-refreshed weekly from their actual
  platform activity, so I'm not relying on a quarterly founder-survey scramble for basic health.*
  - **Given** a portfolio company is operating on the new engine, **when** the weekly Rhythm cycle
    runs, **then** their health status updates automatically and any material change (e.g. a Q-Score
    drop) is flagged to the investor.
  - **Given** a portfolio company is NOT on the new engine (or not on-platform at all), **when**
    the cycle runs, **then** that company is explicitly marked "no live data" — never silently
    stale-but-unflagged.
- **Blocked on:** §6b (identity substrate), and — like F1.2/F3.4 — real operating data existing.

### F5.3 — LP reports as a generated, versioned Asset
**Status:** new — closes a real, currently-total gap (audit §1, Vertical 5: not thin, absent).
**Data/routes:** proposed `AssetDef`, persisted via `asset_versions` (or its investor-equivalent),
sent via the approval-gated connector (reusing F4.5's exact pattern).

- *As an investor, I want to generate an LP report from real portfolio data and send it through an
  approval-gated flow, so I'm not manually compiling numbers or risking an accidental send.*
  - **Given** an investor requests an LP report, **when** it's generated, **then** every number in
    it must trace to a real source (`sourceRefs`, the existing no-invented-evidence provenance rule
    — CLAUDE.md, already built for founder Assets) — an LP report with a fabricated number is a
    trust-destroying failure mode unique to this feature; the rule already exists, it just needs to
    apply here too.
  - **Given** the report is ready, **when** the investor sends it, **then** it goes through the same
    connector approval gate as F4.5 — sending an LP report is exactly the kind of irreversible
    external action ADR-004 exists for.

### F5.4 — `investor_updates` / `portfolio_views`
**Status:** **dead — delete or repurpose, don't build on.** Both tables exist but are unused and
were built for the founder side (founders sending updates to *their* investors), not for F5.3
(audit §1, Vertical 5). **Action for Stage C:** confirm nothing references them, then either drop
them or explicitly document them as founder-side-only so a future session doesn't mistake them for
LP-reporting infrastructure again.

---

## Build order — dependency chain

1. **Phase 0-I gate (prerequisite, not a feature).** C-1 (public PII) is already fixed. H-1
   (visibility-gate bypass on F3.1/F3.2/F3.4-precursor routes), H-2 (spoofable share
   notification), H-3 (Zod coverage) must close **before** any of these routes carry real
   investor-facing traffic at higher volume — detailed in Stage C, not this document.
2. **F2.3 delete, F5.4 delete-or-document.** Free — removes dead code and dead schema before it
   confuses a future build-order decision. Zero dependencies, zero risk.
3. **F2.1 fix, F3.1 fix (router hardcoding).** Cheap, isolated, no architectural dependency —
   ship alongside the Phase 0-I pass since they're touching the same routes anyway.
4. **F3.3 (wire the readiness UI).** No engine dependency, no data dependency, backend already
   correct. **The single highest-ROI item in this inventory** — do it before any new-build work
   starts, since it's shipping something real for near-zero cost.
5. **§6b — the identity-substrate decision (architecture, not a feature).** Must be resolved before
   F2.4, F3.4, F5.2, or F5.3 can start, because all four are Registry/Rhythm/Asset-shaped and the
   engine's identity layer doesn't yet support an investor owner. This is a **design decision
   checkpoint**, not implementation work — flagged in `docs/INVESTOR_PRD.md` §6b for Mo/Roman.
6. **F4.5 rebuild (outreach → Connector).** Can proceed in parallel with step 5 — it's the
   lowest-risk engine-reuse case (the Connector/approval-gate interface is already generic per the
   audit) and doesn't depend on the identity-substrate decision the way Assets/Rhythm do.
7. **F1.1/F4.1-4.4 rebuild-to-standard** (Zod, typed responses, consistent auth-helper usage). Can
   happen anytime after step 1 — no architectural blocker, just execution capacity. Lowest
   strategic priority (audit + PRD both confirm CRM/generic-screening are commodity, not moat).
8. **F2.4, F3.4, F5.2, F5.3** — the genuinely new, engine-shaped, two-sided-data features. Blocked
   on step 5 (architecture) **and**, separately and non-negotiably, on real founder operating data
   existing on the new engine — which is itself blocked on the founder pilot (Phase 4 in
   `docs/Roadmap.md`) succeeding. **These cannot ship before the founder side proves out**, no
   matter how fast investor-side engineering moves — restated from `INVESTOR_SIDE_PLAN.md` §6, and
   confirmed independently by the audit.
9. **F1.2 (trajectory ranking)** — technically just a query change over existing data, so it's
   *implementable* early, but its value is proportional to how much real founder activity exists to
   rank by. Sequenced late for the same reason as step 8, even though its engineering cost is low.
10. **F1.3 (external enrichment)** — deliberately last. Per the PRD's own thesis (§0), doing this
    before the first-party position is proven risks becoming "another mediocre Harmonic clone"
    instead of "the platform with uncopyable signal." No technical blocker; a strategic one.

**Why this order:** it separates four independent kinds of blocker — *security* (step 1, must-fix
regardless of everything else), *free cleanup* (step 2, no reason to delay), *cheap fixes and one
free win* (steps 3–4, ship before any new building starts), *architecture decisions that gate
entire feature classes* (step 5), and *data availability that no amount of investor-side
engineering speed can shortcut* (steps 8–9, gated on the founder pilot). Collapsing these into one
undifferentiated backlog is how a team ends up building F3.4 before realizing step 5 was never
decided, or building F5.3 before there's any real portfolio-company operating data to report on.
Ordering by blocker-type, not by vertical or by "moat," is what makes this sequence executable
rather than aspirational.

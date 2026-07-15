# Edge Alpha — Feature Inventory & Build Spec

*Every feature, written to be built. Each entry is self-contained: purpose, user stories, a use case as a numbered build flow, acceptance criteria (Given/When/Then), the data + API it touches, edge cases, and a definition of done. Lift any feature out and hand it to an engineer.*

**Canonical spec:** `EDGE_ALPHA_PRD.md` · **Rules:** `CLAUDE.md` · **Layout:** `Starthere.md` · **Order:** `Roadmap.md` · **Locked decisions:** `DecisionLog.md`
**Status:** 🟢 exists · 🟡 exists, adapt · 🔵 new · ⛔ **deferred — do not build**
**Priority:** P0 must · P1 should · P2 later
**IDs:** feature `F##`, story `US-##.n`, use case `UC-##`.

## Inventory

| # | Feature | Status | Story |
|---|---|---|---|
| F01 | Q-Score Engine (separate diagnostic) | 🟢 reuse | Phase 0 |
| F02 | Founder Onboarding | 🟢 | — |
| F03 | Profile Builder / Company Builder | 🟢 | — |
| F04 | Founder Dashboard | 🟡 adapt | 1 |
| F05 | Registry (Executive/Program/Asset/Action) | 🔵 | **1** |
| F06 | Prompt Composer | 🔵 | **1** |
| F07 | Strategy Session (S001) | 🔵 | **1** |
| F08 | Executive Contract / Mandate (S002) | 🔵 | **1** |
| F09 | Executive Command View | 🔵 | **1** |
| F10 | Operating Rhythm Engine | 🔵 | **2** |
| F11 | Asset Persistence & Versioning (+ founder editing) | 🔵 | **2** |
| F12 | Executive Briefings | 🔵 | **2** |
| F13 | Connector Layer | 🔵 | **3** |
| F14 | Actions + just-in-time approval | 🔵 | **3** |
| F15 | ~~Outcome Loop~~ | ⛔ **deferred** | after pilot |
| F16 | ~~Evidence Pack~~ | ⛔ **deferred** | after pilot |
| F17 | Investor Side | ⛔ **deferred** | later |
| F18 | Billing (harden) | 🟢 | Phase 0 |
| F19 | Admin / Registry Management | 🟡 | later |

**Build order (the dependency chain):** `F05 → F06 → F07 → F08 → F09` (Story 1) → `F11 → F12 → F10` (Story 2) → `F13 → F14` (Story 3). F15/F16/F17 are **not built** in this release (ADR-009).

---

# F01 — Q-Score Engine 🟢 (reuse; separate diagnostic)

**Purpose.** Score fundability across 6 dimensions with confidence. It is a **separate diagnostic**, fed by **Company Builder artefacts** — *not* part of the execution loop (ADR-005).

**User stories.**
- **US-01.1 (P0)** As a founder, I want a Q-Score with a "why," so I understand where I stand.
- **US-01.2 (P0)** As the system, scoring must be append-only, so history is never lost.

**UC-01 — build flow.**
1. Do not modify the calculator.
2. **Verified mechanism:** the boost is `ARTIFACT_BOOST` + `applyAgentScoreSignal()` in `features/qscore/services/agent-signal.ts`, called from routes under `app/api/agents/**`. (`qscoreBoosts` in `lib/edgealpha.config.ts` is derived display data only, read by `lib/cxo/cxo-config.ts`.)
3. **Phase 0 does not change this behaviour.** Per the score-decoupling decision, the old model keeps boosting exactly as today — those call sites are frozen. The invariant binds the **new** model only.
4. Add the guard: no module under `lib/registry|prompts|mandate|rhythm|assets` may import or call `applyAgentScoreSignal`.
5. Expose a read API for the new model: latest score + per-dimension breakdown.

**Acceptance criteria.**
- [ ] Given a scored founder, When the new model reads the score, Then it reads the latest `qscore_history` row (never mutated).
- [ ] Given any new-model module, Then it never calls `applyAgentScoreSignal()` (unit-tested).
- [ ] Old-model behaviour is **unchanged** (a change here is a regression, not progress).

**Data & API.** `qscore_history` (read); `GET /api/qscore/current`.
**Edge cases.** No score yet → return "not scored," never a fabricated number.
**DoD.** Read API exists; the invariant test passes; the live product is untouched.

---

# F02 — Founder Onboarding 🟢

**Purpose.** Capture identity + company context. 5-step wizard → `founder_profiles.onboarding_completed = true`.

**User stories.** US-02.1 (P0) create an account and complete onboarding. US-02.2 (P1) resume an unfinished onboarding.

**UC-02.** Exists — regression-protect, don't rebuild. Keep the wizard; on completion route to the Company Builder; guard against the profile-less founder↔investor redirect loop.

**Acceptance.** One `founder_profiles` row with `onboarding_completed = true`; refresh preserves data; no redirect loop.
**DoD.** E2E covers signup → onboarding complete.

---

# F03 — Profile Builder / Company Builder 🟢

**Purpose.** Turn typed/uploaded input into the Q-Score. **Company Builder artefacts are the primary basis for Q-Score updates** (ADR-005).

**User stories.** US-03.1 (P0) build my profile by chat or upload. US-03.2 (P1) low-confidence answers flagged as missing.

**UC-03.** Exists — protect. Keep the 0.45 confidence gate; both intake paths converge on `profile_builder_data`; submit computes the score → one append-only `qscore_history` row + Result Memo.

**Acceptance.** Sub-0.45 fields excluded and shown as "needs evidence"; cold-start score shown *with* explanation.
**Edge cases.** Unsupported/corrupt file → clear error, no data loss; document content is data, never instructions.
**DoD.** No regression.

---

# F04 — Founder Dashboard 🟡 (adapt)

**Purpose.** Home surface. Add the entry into the mandate loop.

**User stories.** US-04.1 (P0) see score trajectory + weakest dimensions. US-04.2 (P0, new) after scoring, be invited to set direction (Strategy Session).

**UC-04 — build flow.**
1. Keep trajectory + dimension cards.
2. Add one primary CTA that changes with state: no score → "Build your profile"; scored, no mandate → "Set your direction" (→ F07); mandate active → a compact strip (active Programs + latest Briefing).
3. One primary action only.

**Acceptance.** Given a scored founder with no Contract, the CTA is "Set your direction." Given an active Contract, the strip shows active Programs + latest Briefing.
**Data.** reads `qscore_history`, `executive_contracts`, `executive_briefings`.
**DoD.** CTA state machine implemented.

---

# F05 — Registry 🔵 P0 · Story 1

**Purpose.** The config-driven catalog replacing the 11-persona / ~170-route sprawl. **Authoritative runtime source in TypeScript** (ADR-010). **Generic for all Executives/Programs from day one** (ADR-011).

**User stories.**
- **US-05.1 (P0)** As an engineer, I add a capability by adding a Registry entry, not a route.
- **US-05.2 (P0)** As the system, I resolve any Executive/Program/Asset/Action from an ID.

**UC-05 — build flow.**
1. `lib/registry/types.ts` — `Executive`, `ProgramTemplate`, `AssetDef`, `ActionDef` (PRD §7.1). Each carries its prompt ref: `systemPromptRef`, `programPromptRef`, `instructionsRef`.
2. `lib/registry/index.ts` — `getExecutive/getProgram/getAsset/getAction`; typed error on unknown IDs.
3. Seed generically; **P001 GTM complete**: owner `growth`, objective, `successMetric`, assets **`[AS001, AS002, AS003, AS004, AS005]`**, actions `[validate_icps, interview_customers, prioritize_channels, review_messaging, approve_gtm_plan]`.
4. Seed source: `docs/registry-source/Edge_Alpha_Agentic_OS_Template.xlsx`, reconciled against **PRD §10 (authoritative where they differ)**.
5. **No `runsWhen`** (ADR-008 — the rhythm runs all contract-active Programs).
6. Unit-test: every referenced asset/action resolves; unknown ID throws.

**Acceptance.**
- [ ] Given a Program ID, Then owner, assets, actions and prompt refs resolve; unknown ID → typed error.
- [ ] P001's assets are exactly AS001–AS005. *(AS013 belongs to P004 — not P001.)*
- [ ] Adding a second Program requires no new route.

**Edge cases.** A Program referencing a missing Asset → fail at load with a clear message, not at runtime.
**DoD.** Registry loads, resolves, seeded, unit-tested, generic.

---

# F06 — Prompt Composer 🔵 P0 · Story 1

**Purpose.** Assemble every execution package from the **fixed 4-layer nomenclature** (ADR-012):

```
Executive System Prompt       = executive knowledge and operating principles
+ Program Prompt              = program objective, scope and execution rules
+ Asset / Action Instructions = specific generation or execution instructions
+ Company Context             = Strategy, Contract, Q-Score, current Assets, new information
```

**User stories.**
- **US-06.1 (P0)** As the system, I assemble a deterministic, validated package from registered components.
- **US-06.2 (P0)** As the system, I reject a package requesting capabilities outside the Executive Contract.

**UC-06 — build flow.**
1. `lib/prompts/compose.ts` — assemble the 4 layers in a fixed deterministic order.
2. Resolve Registry entries from IDs; load latest approved prompt versions; load company context; **read the current Asset versions from F11**.
3. Remove duplicate context; exclude irrelevant Assets; prioritise current/authoritative info; respect model context limits; preserve source references.
4. **Validate before release:** hierarchy preserved · lower layers don't override higher · Program prompt compatible with its Executive · Asset/Action instructions match the requested execution · no unresolved contradictions · no capability outside the Contract.
5. Invalid → block + runtime error `{executionId, failedRule, conflictingComponent, affectedEntity, timestamp}`.
6. Growth knowledge lifted (read-only) from `features/agents/patel/prompts/system-prompt.ts` into `lib/prompts/knowledge/growth.ts`. **Do not edit the frozen source.**

**Acceptance.**
- [ ] Given P001 + Growth, Then one ordered package returns and validates.
- [ ] Given P001 executed with the CTO prompt (S004), Then composition fails with the exact runtime error.

**Edge cases.** Context over the model limit → trim by token count (not characters), keeping current/authoritative content.
**Note.** `lib/agents/compose-system-prompt.ts` is the **old** 3-part assembler; it is frozen and dies with the old model. Do not extend it.
**DoD.** Composer + validation + the S004 mismatch test pass.

---

# F07 — Strategy Session (S001) 🔵 P0 · Story 1

**Purpose.** Capture the founder's direction. The root of the mandate. Versioned.

**User stories.** US-07.1 (P0) complete a short Strategy Session. US-07.2 (P1) revise it later → new version.

**UC-07 — build flow.**
1. `strategy_sessions` table (versioned, one `is_current`) + RLS.
2. A short guided flow capturing mission, priorities, goals.
3. `POST /api/strategy` writes the current row; a revision marks the old `is_current=false` and inserts a new version.
4. Feeds F08.

**Acceptance.** One `is_current=true` row; a revision retains the previous version.
**Edge cases.** Abandoned mid-session → save partial, resumable; empty → block Contract generation until complete.
**DoD.** Persists, versions, feeds F08.

---

# F08 — Executive Contract / Mandate (S002) 🔵 P0 · Story 1

**Purpose.** The founder's mandate. Generated from the Strategy Session, **confirmed once**; confirming activates Programs. **Contracts are immutable** — a change creates a new version = a **new operating epoch** (ADR-003). No per-plan sign-off gate (ADR-002).

**User stories.**
- **US-08.1 (P0)** As a founder, I receive an Executive Contract from my strategy and confirm it.
- **US-08.2 (P0)** As a founder, I redirect by issuing a new mandate (priority, success metric, an executive's mandate, pause a Program) — no re-approval loop.

**UC-08 — build flow.**
1. `executive_contracts` (immutable; `epoch`, `version`, `is_current`, `status: draft|confirmed|superseded`, `previous_contract_id`, `active_programs`) + RLS.
2. `POST /api/contracts` — generate a draft from the current Strategy via F06 → founder reviews on F09 → confirm → `status='confirmed'` → create `programs` rows (`active`).
3. **`POST /api/contracts/new-epoch`** — any change creates a **new current version**; the previous is marked `superseded` and **retained**. The rhythm picks it up next cycle. *(There is no `PATCH` — contracts are never edited in place.)*
4. Enforce **mandate integrity**: only Programs in the current contract's `active_programs` may run (checked by F10).

**Acceptance.**
- [ ] Given a confirmed contract, Then the referenced Programs become `active`.
- [ ] Given a change, Then a new current version exists, the previous is `superseded` and retained, and no history is deleted.
- [ ] Given a paused Program, Then it does not run.

**Data & API.** `executive_contracts`, `programs`; `POST /api/contracts`, `POST /api/contracts/new-epoch`.
**Edge cases.** Concurrent changes → one current version wins; strategy too thin → block generation, prompt to complete F07.
**DoD.** Confirm activates Programs; epochs version cleanly; mandate integrity tested.

---

# F09 — Executive Command View 🔵 P0 · Story 1

**Purpose.** The founder's window: the mandate, active Programs, latest Briefings. **Visibility and command — not per-cycle approval.** `/founder/executive`.

**User stories.** US-09.1 (P0) see mandate + active Programs + latest Briefings. US-09.2 (P0) issue a new mandate from here. US-09.3 (P1) approve pending irreversible Actions (Story 3).

**UC-09 — build flow.**
1. Build `/founder/executive` reading `executive_contracts` (current), `programs`, `executive_briefings`.
2. Render: mandate summary, active Programs, latest Briefing, and (Story 3) a "needs your approval" area.
3. Wire change controls → `POST /api/contracts/new-epoch`.
4. Make clear this is command, not approval.

**Acceptance.** Given an active contract, the view shows mandate + Programs + latest Briefing. Given a change, it creates a new epoch.
**Edge cases.** No contract → route to F07; no Briefing yet → "first cycle runs [date]."
**DoD.** Renders; new-epoch works.

---

# F10 — Operating Rhythm Engine 🔵 P0 · Story 2

**Purpose.** The recurring cycle. It **does not decide what runs** — it executes **all contract-active Programs** every cycle. **There is no Asset Review** (ADR-006).

**User stories.**
- **US-10.1 (P0)** As the system, I run all contract-active Programs on a cadence using the latest company state.
- **US-10.2 (P0)** As the system, I never run the same cycle twice.

**UC-10 — build flow.**
1. `operating_rhythm_runs` (unique on `founder_id + cycle_key`, e.g. `COMP-001:2026-W28`) + RLS.
2. `lib/rhythm/run.ts` — on trigger, create one run row (fail fast if `cycle_key` exists → idempotent).
3. Load current Registry, Strategy, Contract, Q-Score, current Asset versions.
4. For **each contract-active Program**: run judgement via F06 → write new Asset versions via F11 → publish a Briefing via F12 → (Story 3) generate Actions via F14.
5. Record each stage's status; block dependents if a required stage fails; retry technical ops within limits; run independent executions in parallel where dependencies allow.
6. Vercel Cron (weekly) + `POST /api/rhythm/run` for manual testing.
7. **No `runsWhen` / event-skipping** — deferred (ADR-008).

**Acceptance.**
- [ ] Given the same company + week, When run twice, Then the second is rejected (no duplicate Programs/Assets/Briefings/Actions).
- [ ] Given a Program not in the current contract, Then it does not run.
- [ ] Given a failed stage, Then dependents block and the run is `failed` with stage status recorded.

**Edge cases.** Partial failure mid-cycle → stages record where; the next trigger doesn't duplicate. Provider outage → retry, then fail the stage, not the app.
**DoD.** One cycle runs P001 end-to-end; idempotency + mandate-integrity tests pass.

---

# F11 — Asset Persistence & Versioning 🔵 P0 · Story 2

**Purpose.** The company's permanent memory. Every Program execution — **and every founder edit** — stores a **new immutable version**. The Composer always reads `current`.

**User stories.**
- **US-11.1 (P0)** As the system, I store each Asset output as a new immutable version linked to its execution.
- **US-11.2 (P0)** As a founder, I can open, inspect and **directly edit** any Asset; my edit becomes current immediately (ADR-007).
- **US-11.3 (P1)** As a founder, I can view history and restore a previous version.

**UC-11 — build flow.**
1. `asset_versions` (PRD §8) with full provenance + `authored_by ('program'|'founder')`; exactly one `is_current` per `(founder_id, asset_id)`; RLS.
2. **Validate before persisting:** Asset ID exists in the Registry · belongs to the correct Program/Executive · output matches the required structure · complete · valid execution reference · sequential version · not already persisted for this execution.
3. Valid → insert the new version, set `is_current`, unset the previous. Invalid → block + runtime error.
4. `getCurrentAsset()` (for F06) and `getAssetHistory()`.
5. **Founder editing:** Asset pages + `PUT /api/assets/:id` → new version, `authored_by='founder'`, current immediately, **no approval, no gate**.
6. Restore = create a *new* current version from an old one (history never deleted).

**Acceptance.**
- [ ] Given a Program output, Then a new sequential version is current and the previous retained.
- [ ] Given a P003 output stored as AS001, Then persistence is blocked (AS001 belongs to P001).
- [ ] Given a founder edit, Then a new current version exists with `authored_by='founder'`, used by the next cycle, with no approval step.

**Data & API.** `asset_versions`; `GET /api/assets/:id`, `PUT /api/assets/:id`.
**Edge cases.** Duplicate persist for the same execution → rejected; cross-company access → blocked by RLS.
**DoD.** Versioning, provenance, validation, founder editing and restore all work; the invalid-persist test passes.

---

# F12 — Executive Briefings 🔵 P0 · Story 2

**Purpose.** The founder-facing output of each Program run — a five-minute read in the executive's voice. Briefings communicate; they never replace Asset access.

**User stories.** US-12.1 (P0) get a short briefing per cycle. US-12.2 (P1) read past briefings as an operating record.

**UC-12 — build flow.**
1. `executive_briefings` (per Program per execution: verdict + structured body) + RLS.
2. In F10, after a Program runs, generate the Briefing via F06 using the Program's briefing structure.
3. Surface the latest on F09 and F04; keep history; link to the underlying Assets.

**Acceptance.** One Briefing per Program run, with a verdict; retrievable in order.
**Edge cases.** No material change → a short "no change" briefing, not silence. Generation fails → the stage is `failed`; Assets still persisted.
**DoD.** Briefings generate per cycle, render, and persist.

---

# F13 — Connector Layer 🔵 P0 · Story 3

**Purpose.** Act in the founder's real tools. A shared adapter built once — never per-executive integrations.

> **Namespace:** use **`app/api/connectors/**`** and the table **`connector_connections`**. `app/api/connections` is already taken by founder→investor intro requests in the live product.

**User stories.** US-13.1 (P0) connect my email once. US-13.2 (P0) disconnect/revoke anytime.

**UC-13 — build flow.**
1. `connector_connections` (provider, status, scopes, `token_ref` → secrets manager, **never plaintext**) + RLS.
2. Gmail OAuth: `POST /api/connectors/gmail/oauth` → provider login → store scoped token by reference.
3. A connector adapter interface (`send`, `read`); Gmail first (prefer an MCP client).
4. Revoke → `status='revoked'`; dependent Actions blocked with a reconnect prompt.

**Acceptance.**
- [ ] Given OAuth completes, Then one `connector_connections` row is `active`; no plaintext token is stored.
- [ ] Given a revoked connection, Then a dependent Action fails safe with a reconnect prompt (no partial send).

**Edge cases.** OAuth denied → no row, clear state; token expired mid-action → mark `expired`, fail safe, log `failed`.
**DoD.** Gmail connect/revoke works; tokens by reference; adapter interface in place.
*Contingency:* if OAuth slips, reuse the existing outreach/Resend send path to keep Story 3 on time; do real OAuth after.

---

# F14 — Actions + just-in-time approval 🔵 P0 · Story 3

**Purpose.** Execute Program-generated work. Internal/reversible runs autonomously; **irreversible external Actions require just-in-time founder approval at the Connector boundary** (ADR-004).

**User stories.**
- **US-14.1 (P0)** As a founder, irreversible Actions (send/publish/spend/change-price) wait for my approval.
- **US-14.2 (P0)** As the system, I log every attempt and result immutably.
- **US-14.3 (P1)** As a founder, recurring cadences run on schedule and never while a Program is paused.

**UC-14 — build flow.**
1. `action_log` (`pending_approval|executed|failed|declined`, `approved_by`, request/result) + RLS.
2. Program creates an Action → **payload prepared** → if `irreversible`, create `pending_approval` and surface on F09; else run.
3. Approve → execute via F13 → `executed` + `approved_by`. Decline → `declined`. Failure → `failed` (idempotent — no double-send).
4. Founder sees: prepared Action · payload · target system · execution status · delivery result · failure/retry.
5. Recurring cadences extend `scheduled_actions` (`cadence`, `next_run_at`); skip while paused.
6. Re-check mandate/program-active **at execution time**, not just at generation.

**Acceptance.**
- [ ] Given an irreversible Action, Then nothing executes until approved; the attempt is logged.
- [ ] Given a retry after partial failure, Then no double execution.
- [ ] Given a paused Program, Then its cadence does not fire.

**Data & API.** `action_log`, `scheduled_actions`; `POST /api/programs/:id/actions/:actionId`.
**Edge cases.** Mass/expensive send → extra confirmation; Program paused after generation → block at execution.
**DoD.** Approval on irreversible works; audit complete; idempotent.

---

# F15 — Outcome Loop ⛔ DEFERRED (ADR-009)

**Do not build.** No `lib/outcomes/`, no `outcomes` table, no `POST /api/outcomes`, no outcome→score mapping.

**Why:** the Q-Score is a **separate diagnostic** updated from Company Builder artefacts (ADR-005). Outcomes are **evidence for later reassessment** — they must **never** automatically call `applyAgentScoreSignal()`. Execution results are already captured in `action_log`.
**Revisit:** after the pilot retention gate passes.

---

# F16 — Evidence Pack ⛔ DEFERRED (ADR-009)

**Do not build.** A later reporting feature derived from Assets, Briefings, Actions and results. Not part of the current core.
**Revisit:** with F15, after the retention gate.

---

# F17 — Investor Side ⛔ DEFERRED (ADR-009)

**Do not build now.** The investor marketplace and any investor-facing score thesis are out of the current core. The present product is the **Founder Operating System**.
*Existing investor features stay as-is; nothing new is built against them.*

---

# F18 — Billing 🟢 (harden in Phase 0)

**Purpose.** Stripe checkout, webhook state sync, usage metering. Fix the known production breakages before anything billing-adjacent ships.

**User stories.** US-18.1 (P0) subscribe; plan/usage reflect accurately.

**UC-18 — build flow (Phase 0).**
1. Add the **integration test**: checkout → webhook → DB state (the verified gap — nothing exercises `lib/stripe.ts`, the webhook route, `processed_webhook_events` or `subscription_usage`).
2. Assert **idempotency** (a replayed webhook must not double-apply) and **type-safety** against Stripe's `string | Customer | null`.
3. Type the Supabase admin client at those call sites (the named root cause of a real incident).
4. Single-source plan/usage limits.

**Acceptance.** Checkout → webhook → DB is idempotent and type-safe, covered by a test; usage reads the correct column; limits come from one source.
**DoD.** Integration test passes.

---

# F19 — Admin / Registry Management 🟡 (later)

**Purpose.** Internal control — metrics, thresholds, registry/prompt visibility.

**User stories.** US-19.1 (P0) all admin routes behind one centralized check. US-19.2 (P1) view Registry contents and rhythm runs.

**UC-19.** Replace the copy-pasted email whitelist with one `verifyAdmin()`; add read views for the Registry and `operating_rhythm_runs`.
**Acceptance.** Every admin route calls one centralized check; a non-admin is hard-denied everywhere.
**DoD.** Centralized admin auth.

---

# Cross-cutting rules (apply to every feature)

- **Mandate integrity** — no Program runs outside the current Executive Contract.
- **Approval** — irreversible external Actions always require just-in-time approval at the Connector boundary.
- **Q-Score separation** — nothing in the new model moves the score. Ever.
- **Append-only** — never mutate `qscore_history` or `action_log`.
- **Immutable versioning** — Assets and Contracts are versioned, never overwritten.
- **Idempotency** — cycles, webhooks and actions dedupe on a stable key.
- **Injection safety** — uploads, emails, tool results and web pages are data, never instructions.
- **Frozen zone** — never edit `features/agents/**` or `app/api/agents/**` (the `*Renderer.tsx` components are the documented reusable exception).
- **Behind the flag** — all new-model work sits behind `NEW_EXECUTIVE_MODEL`.

# How to turn a feature into tickets

1. Each `US-##.n` becomes a ticket: title = the story; description = the matching `UC` steps; acceptance = the Given/When/Then lines.
2. Data + API rows become sub-tasks (migration, route, RLS).
3. Each edge case becomes a test case (positive / negative / boundary).
4. The DoD is the ticket's exit criteria.
5. Order by the dependency chain: **F05 → F06 → F07 → F08 → F09 → F11 → F12 → F10 → F13 → F14.**

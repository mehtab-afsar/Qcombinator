# Edge Alpha — Decision Log

*The decisions we've settled, recorded so they stop being re-opened. Each entry: the decision, why, what it costs, what we rejected. Aligned to `EDGE_ALPHA_PRD.md` (the canonical spec). Update this only when a decision genuinely changes — not every time it's questioned.*

**Status:** 🔒 Locked (don't re-open without new evidence) · 🕒 Revisit at a named trigger

---

## ADR-001 — Edge Alpha is a Founder Operating System 🔒
**Decision:** the product is an autonomous operating system the founder runs their company on — persistent memory, a weekly executive rhythm, real execution under a mandate they set.
**Why:** it's what a chat window structurally can't do, and it's honest about what we can deliver now.
**Cost:** we give up the punchier "investor-trusted score" pitch for the time being.
**Rejected:** positioning the investor-trusted Q-Score as the central asset (deferred — ADR-009); "AI executives that generate deliverables" (table stakes, loses a breadth war).

## ADR-002 — The Executive Contract is the mandate; no approval gates on Programs 🔒
**Decision:** the founder sets direction once (S001 Strategy → S002 Executive Contract, confirmed once). Programs then run autonomously within that mandate. No proposed status, no sign-off, no activation gate, no waiting state.
**Why:** a per-cycle gate adds complexity and decision load; the Program and its Assets are already defined. Introduce a gate only if founders need one.
**Cost:** less per-step human control; correctness depends on the mandate being right.
**Rejected:** the per-plan sign-off gate from earlier drafts (superseded).

## ADR-003 — Contracts are immutable; a change starts a new operating epoch 🔒
**Decision:** confirmed Contracts are never edited in place. Any change (priority, success metric, an executive's mandate, pausing a Program, new direction) creates a **new current version = a new epoch**. All historical Assets, Briefings, Actions and execution records are preserved.
**Why:** immutability gives a clean audit trail and a coherent "what were we operating under, when."
**Cost:** slightly more machinery than an in-place edit.
**Rejected:** editable contracts; "reset the clock" (which implied destroying history).

## ADR-004 — Just-in-time approval on irreversible external Actions only 🔒
**Decision:** internal and reversible execution is autonomous. **Irreversible external side effects** (send, publish, spend, change price) require founder approval **at the Connector boundary** — after the payload is prepared, before it executes.
**Why:** current AI is reliable enough to reason, not to be handed irreversible actions unwatched (~74% of enterprises rolled back autonomous agents in 2026). This is the safety line, and it doesn't violate "no approval gates," which applies to Programs.
**Cost:** the founder is in the loop on sends.
**Rejected:** unattended irreversible actions; approval during Program execution.

## ADR-005 — The Q-Score is a separate diagnostic 🔒
**Decision:** the Q-Score is updated from **Company Builder artefacts** (uploaded evidence), not from the execution loop. Creating a Management Asset **never** raises the score. Outcomes are evidence for later reassessment — they never automatically call `applyAgentScoreSignal()`.
**Why:** Assets *describe and direct* the company; artefacts *prove* what's true. A score based on document production is gameable and meaningless.
**Direction of influence:** artefacts → Q-Score → Programs interpret → Assets updated → Actions → new artefacts → Q-Score again.
**Rejected:** Asset-creation score boosts (the gameable status quo); automatic outcome→score updates.

## ADR-006 — No Asset Review 🔒
**Decision:** there is no separate Asset Review cycle, prompt, route or runtime stage. Asset maintenance happens **inside** Program execution.
**Why:** a standalone review duplicates what Programs already do, adds prompts and complexity, and risks becoming an approval-like checkpoint.
**Rejected:** an Asset Review stage in the Operating Rhythm (removed everywhere).

## ADR-007 — Assets are founder-visible and directly editable 🔒
**Decision:** Management Assets are living pages. The founder can open, inspect and amend any Asset. A saved edit creates a **new immutable current version** (`authored_by='founder'`), used immediately by relevant Programs and Actions. No approval, no gate. Briefings point to material changes but never replace Asset access.
**Why:** Assets are the company's knowledge, not hidden system objects. Founder in command.
**Rejected:** hidden/system-only Assets; an approval workflow on edits.

## ADR-008 — The Operating Rhythm runs all contract-active Programs 🕒
**Decision:** every cycle, the rhythm executes **all Programs the current Executive Contract marks active**. No event-aware skipping (`runsWhen`) in v1.
**Why:** simplicity and predictability first; the Contract already decides what's active.
**Cost:** real LLM spend and possible briefing volume — mitigated by keeping the active set small in the pilot.
**Revisit trigger:** when cost or briefing fatigue shows up at scale → introduce `runsWhen` as an optimisation.
**Rejected:** "runs all *registered* Programs" (wrong — the Contract decides).

## ADR-009 — Investor features, Outcome Loop and Evidence Pack are deferred 🕒
**Decision:** the investor marketplace, the investor-trusted-score thesis, the dedicated Outcome Loop (`lib/outcomes/`, `POST /api/outcomes`, score mapping) and the Evidence Pack are **out of the current core**.
**Why:** none of them are needed to prove the Founder OS, and building them early is the named scope-creep risk.
**Revisit trigger:** after the retention gate passes and the founder loop is proven.
**Rejected:** making the investor-trusted score the current justification/moat.

## ADR-010 — The Registry lives in code; Excel is the design/seed source 🔒
**Decision:** the TypeScript Registry (`lib/registry/**`) is the **authoritative runtime source** for Executives, Programs, Assets and Actions. The Excel workbook is the **design and seeding source**, never a second live registry.
**Why:** one source of truth at runtime; versioned and auditable in git.
**Rejected:** a live Excel/DB registry (two sources of truth).

## ADR-011 — Build the runtime generically; P001 GTM is the first proof case 🔒
**Decision:** Products 1–3 support the **full Registry** from the beginning. P001 GTM is simply the first Program proven end-to-end.
**Why:** a GTM-specific architecture would have to be rewritten for every other Program.
**Cost:** slightly more up-front generality.
**Rejected:** building GTM-specific and generalising later.
**P001 scope (corrected):** AS001 ICP Profiles · AS002 Pains & Gains Matrix · AS003 Buyer Journey Map · AS004 Positioning & Messaging Framework · AS005 Channel Strategy.

## ADR-012 — Prompt nomenclature is fixed 🔒
**Decision:** every execution package = `Executive System Prompt + Program Prompt + Asset/Action Instructions + Company Context`, assembled by one Composer in a fixed deterministic order, validated before release.
**Why:** one vocabulary and one assembly path; prevents prompt sprawl and competing taxonomies.
**Rejected:** "Standard + Knowledge Base + Specific" (retired); inline/per-agent prompts.

## ADR-013 — The CEO is not a separate architectural layer 🔒
**Decision:** the CEO perspective may own the S001/S002 prompts, but mandate generation runs through the **same Prompt Composer and Execution Engine** as every other Program.
**Why:** a special-case CEO layer would fork the engine — exactly what we're removing.
**Rejected:** a bespoke CEO pipeline.

## ADR-014 — Keep the engine, scrap the personas (strangler, not big-bang) 🔒
**Decision:** reuse the Q-Score engine, task-graph, delegation, orchestrator, executors, scheduler and document store untouched. Replace the 11 personas and ~170 per-agent routes via the Registry. Build behind `NEW_EXECUTIVE_MODEL`; delete the old only after parity.
**Why:** ~two-thirds of the machinery works; a big-bang rewrite breaks the live app for months.
**Cost:** old and new coexist temporarily.
**Rejected:** deleting the old agents first.
**Salvage note:** `features/agents/{persona}/components/*Renderer.tsx` are reusable UI — keep them.

## ADR-022 — `epoch` counts confirmed mandates; `version` counts rows 🔒
**Decision:** on `executive_contracts` the two columns mean different things.
- **`version`** increments on **every row** — including drafts the founder redrafts or never confirms.
- **`epoch`** increments only when a **new mandate supersedes a confirmed one**. Drafting does not burn an epoch.

> draft `v1 e1` → redraft `v2 e1` → founder confirms `v2 e1` → later change → `v3 e2`.

**Why this needed deciding:** four documents state *"a new version **=** a new operating epoch"* as an identity (CLAUDE.md §0, ADR-003, PRD §4, Featureinventory F08) while PRD §8's schema gives **two columns**. Taken literally they are always equal — the same fact in two places, which CLAUDE.md §4 names a red flag ("no value defined in three places") and which *will* drift the first time someone updates one and not the other.
**Why this reading:** ADR-003's own rationale is *"a coherent 'what were we operating under, when'"* — that is the **epoch**, an operating period, not a row counter. Story 2's Assets and Briefings can be stamped with the epoch that governed them. And a founder redrafting before they commit should not consume an epoch — nothing was operating under a draft.
**Cost:** the two numbers diverge, so neither can be inferred from the other. That is the point.
**Rejected:** dropping `version` (loses redraft history); keeping both always-equal as the PRD literally reads (CLAUDE.md §4 — one fact, one column).
**Consequence:** `epoch` is what the founder and the audit trail care about; `version` is bookkeeping.

## ADR-023 — The mandate composes through the same Composer, but is not a Program 🔒
**Decision:** `lib/prompts/compose.ts` gains a second entry point, `composeMandatePrompt()`, for S001/S002. Same module, same discipline — fixed order, validation, source refs, Company Context fenced as data. It is **not** a second Composer (CLAUDE.md §0.2); it is the same one, which is what ADR-013 requires ("mandate generation runs through the same Prompt Composer and Execution Engine").
**Why not model the mandate as a Program** — the decisive argument: **ADR-008 makes the Rhythm run every contract-active Program, every cycle.** A Contract-generation Program would therefore **regenerate the founder's mandate weekly**, directly contradicting *"the founder confirms — once"* (ADR-002) and *"Contracts are immutable"* (ADR-003). Escaping that would need a `runsWhen`-style exception, which ADR-008 forbids. Modelling the mandate as a Program is not awkward — it is wrong.
**Shape:** the workbook's Executive Registry lists S001/S002 as the CEO's **System Prompt Refs**, one per function ("Strategy", "Executive Contract"). So a mandate package is *Executive System Prompt (S002) + Company Context* — layers 1 and 4. Layers 2 and 3 do not apply: S002 states outright *"This prompt does not create management assets or actions."*
**Cost:** two entry points into one module; a mandate package has two layers, not four.
**Rejected:** Programs for the CEO (above); making `programId` optional on `composePrompt` (pushes an "is this a mandate?" branch into every validation rule of the one function everything depends on).

## ADR-020 — Action is the genus; "cadence" is a frequency, not an entity 🔒
**Decision:** an **Action** is any operational work a Program generates. It is **one-off or recurring** — `ActionDef.kind: 'oneoff' | 'recurring'` (PRD §7.1, the authoritative runtime type). A **cadence** is **not a thing that executes**: it is the *frequency* of a recurring Action, a value such as `'weekly'` stored in `scheduled_actions.cadence` (PRD §8).

> One-off Action · recurring Action · a recurring Action **has** a cadence. There is no "Cadence" entity.

**Why (this settles the Roadmap's own question, and rejects its framing):** `Roadmap.md:47` and `PRD §12` pose the task as *settle "action" (one-off) vs "cadence" (recurring)* — which reads as two **sibling entities**. That framing is rejected, because:
1. **It contradicts the authoritative type.** `ActionDef.kind: 'oneoff'|'recurring'` already makes recurrence a *property* of an Action. Siblings would need a second `CadenceDef` shape and a second execution path — CLAUDE.md §0.2 ("one of each") and §0.1 ("config over code").
2. **Safety — the real argument.** ADR-004: *"every **irreversible Action** requires just-in-time approval."* If a cadence were a separate entity, that rule would not obviously bind it, and a recurring send could slip the gate on a technicality. One genus ⇒ ADR-004 covers recurring work **for free**, with no second rule to keep in sync. `PHASE0_AUDIT.md` §6 shows this is not hypothetical: the outreach path already schedules future sends via `schedule_followup` with **no approval**, because it sits in `EXEC_TOOLS` and not `APPROVAL_REQUIRED_TOOLS`.
3. **The data model already says so.** `cadence` is a `text` **column**, not a table (PRD §8). Entities get tables; values get columns.

**The word was doing three jobs** (Phase 0 audit): a recurring entity (`Roadmap:47`), a frequency column (`PRD:427`), and the rhythm's schedule (`PRD:537`, *"Rhythm cadence configuration"*). Senses 2 and 3 are the same idea — a frequency — and both survive. Sense 1 is retired.

**Consequences:** `Featureinventory.md` F14.3/UC-14.5 should read *"recurring **Actions** extend `scheduled_actions` (`cadence`, `next_run_at`)"*, not *"recurring cadences extend…"*. "Rhythm cadence configuration" (PRD §14.1) stays — it is sense 3, and correct.
**Cost:** one Roadmap line is now non-normative. Recorded here rather than silently overridden.
**Rejected:** action/cadence as siblings (above); dropping "cadence" entirely (clearer, but churns the data model and discards a word already in three docs for no safety gain).

## ADR-021 — The connector namespace is `connectors`, not `connections` 🕒
**Decision:** the connector vault table is **`connector_connections`** and its routes live at **`app/api/connectors/**`** — e.g. `POST /api/connectors/:provider/oauth`.
**Why:** the documented path (`/api/connections/:provider/oauth`, table `connections`) **collides with a live feature**. `app/api/connections/route.ts` already exists and serves founder→investor intro requests against the `connection_requests` table. Two different meanings of "connection" on one path is how outages get made. `connectors` also matches the `/connectors/gmail/send` nomenclature already used in the PRD's own connector section.
**Status:** 🕒 **adopted, pending Roman's confirmation** (`DOC_RECONCILIATION.md`). Applied across the PRD, Architecture, Featureinventory and Starthere on 15 Jul 2026. **Build to it**; if Roman rejects it, the change is a rename before Story 3 — no code depends on it yet.
**Cost:** the docs diverge from Roman's original naming until confirmed.
**Rejected:** reusing `/api/connections` (collides with live routes); renaming the existing founder→investor flow (churns working product to free up a word).

## ADR-017 — One freeze exception: security guards may be fixed in place 🔒
**Decision:** the freeze on `features/agents/**` and `app/api/agents/**` (ADR-014, CLAUDE.md §0.4) does **not** cover a fix that restores a security invariant CLAUDE.md §3 already mandates. Such a fix must be minimal, reviewed, and recorded here.
**First and only application:** `app/api/agents/atlas/weekly-scan/route.ts:210` — the cron auth guard read `if (cronSecret && authHeader !== …)`, which **fails open**: with `CRON_SECRET` unset the route was fully public and would spend paid Tavily budget across up to 500 founders. Changed to `if (!cronSecret || …)`. One word.
**Why:** "frozen" means *stop adding capability*, not *preserve a known security hole for months*. Five of the six `CRON_SECRET` consumers already fail closed — this was an oversight, not a design choice. See `PHASE0_AUDIT.md` §2, §7a.
**Cost:** a precedent that could be stretched. Bounded by: security invariants only, minimal diff, an ADR entry each time.
**Rejected:** leaving it until the old model is deleted (leaves an unauthenticated spend endpoint one config change away from live); deleting the cron from `vercel.json` (removes a live feature to avoid a one-word fix).
**Related:** `CRON_SECRET` is only *recommended* in `lib/env.ts:63-67` — the app boots without it. Consider promoting it to *critical*.

## ADR-018 — The strangler boundary is wider than the agents folder 🔒
**Decision:** artifact creation is **not** confined to `app/api/agents/**`. Two live paths sit outside the frozen tree and are **in scope** for the new model's parity checklist:
- `app/api/investor/startup/[id]/memo/route.ts:155` — writes `investment_memo`.
- `features/founder/services/metrics.service.ts:46` — a **client-side, browser-side** insert of `financial_summary`, stamped `agent_id: felix`, with no API route, no server-side validation and no Zod.
**Why:** every doc assumed freezing `app/api/agents/**` freezes artifact creation. The audit refuted this. Left unrecorded, Story 1+ would reach "parity" while two creation paths continued writing outside the model.
**The sharp edge:** `metrics.service.ts` writes founder-typed numbers attributed to Felix. `app/api/investor/startup/[id]/route.ts:137,178` then surfaces them to investors as agent output. `content.source: 'manual'` is written (`:43`) but **read by nothing**. This is the live instance of the "verified vs self-reported" problem, and the reason **ADR-007's `authored_by` must be a first-class column with real consumers** — not a JSONB field, which is exactly the shape that got ignored here.
**Cost:** a wider migration surface than planned.
**Rejected:** treating both as out of scope (leaves the provenance hole permanently, and lets "parity" be declared falsely).

## ADR-019 — "Reuse the engine" means *present*, not *proven* 🕒
**Decision:** ADR-014 stands — we still build on the existing engine. But the docs imply that engine is battle-tested, and **it is not**. Anything reused must be treated as **unverified until it has a passing test**, not as a working foundation.

**Verified state (Phase 0 audit, 15 Jul 2026):**

| Component | Docs say | Actually |
|---|---|---|
| `lib/agents/task-graph.ts` (389 lines) | CLAUDE.md §0.3 "reuse, don't fork" | **Zero callers.** `executeTaskGraph:253` has never executed in production |
| `lib/actions/executor.ts` (228 lines) | CLAUDE.md §0.3 "reuse, don't fork" | **Zero callers.** `executeAction:174` has never executed |
| `features/qscore/**` | "Keep, untouched" · "reuse" (Architecture.md §11) | Live and exercised. 6 failing tests — **triaged: all stale, the score is correct** (see below) |
| Jest suite (8 files) | CLAUDE.md §7 "Demand tests" | **Never runs in CI.** Failing invisibly for an unknown period |

**Q-Score triage outcome (15 Jul 2026): the engine is exonerated.** All six failures are stale tests, not defects — the formula moved v1→v2 (constant→dynamic denominator), the LLM layer migrated to `lib/llm/router`, and P6 gained SaaS-default estimation. In each case the code was improved and documented; the tests were left behind. `features/qscore` is therefore **genuinely reusable**, as the docs claim. Detail: `PHASE0_AUDIT.md` §8.

**Why this is an ADR and not just an audit note:** PRD §1 justifies the plan with *"~two-thirds of the machinery exists but is wired to the wrong shape."* That sentence is doing real work — it is why this is scoped as *mostly refactoring*. Two of the named modules have never run, and the third has failing tests. **Existing ≠ working.** Story 1+ must not assume otherwise.

**What this does NOT change:** the reuse decision itself. Unexecuted is not the same as broken, and rewriting from scratch is worse. `delegation.ts`, `orchestrator.ts`, `lib/tools/executor.ts` and `lib/llm/router.ts` **are** live and exercised.

**Consequences:**
1. Q-Score triage is timeboxed and happens **before Story 1** — it feeds the mandate and is what ADR-016 measures.
2. First reuse of `task-graph.ts` or `lib/actions/executor.ts` carries a test, and is estimated as new code.
3. Jest becomes blocking in CI (Phase 0 Step 6) so this cannot recur.

**Revisit trigger:** if triage shows the Q-Score calculator is genuinely miscomputing, that is a P0 on its own — it means live founder scores are wrong.
**Rejected:** re-opening ADR-014 on this evidence (unexecuted ≠ broken); leaving it in the audit only (the PRD's premise would stay uncorrected).

## ADR-015 — Engineering invariants (non-negotiable) 🔒
Generic routes (never per-agent) · immutable Asset versioning with provenance · idempotent rhythm cycles · a shared Connector abstraction · runtime validation on composition and persistence · RLS on every table · immutable audit logging (`action_log`) · secrets by reference only. See `CLAUDE.md`.

## ADR-016 — Success is week-4 retention, not documents shipped 🔒
**Decision:** the go/no-go for widening is whether the pilot cohort returns in week 4, plus one founder completing the full loop (mandate → cycles → improving Assets → Briefing → approved Action executed).
**Why:** AI-native products churn fast (~40% GRR); shipping features nobody returns to is failure dressed as progress.
**Cost:** we may pause expansion — by design.
**Rejected:** measuring success by Programs built or Assets generated.

---

## Open (non-blocking)

- Rhythm cadence configuration (weekly default — per-company override?). *Decide during Story 2.*
- Which Executive/Program follows P001. *Decide after the retention gate.*
- Whether Briefings aggregate into one digest when several Programs are active. *Decide during Story 2.*

**Operational (owner: Mo, outside this doc):** InnoSphere-owned accounts + migration off personal accounts · a quality-management/review agenda · a human security review of the Connector layer before Story 3 ships.

---

## How to use this log

- Before re-arguing a decision, check here. If it's 🔒 and there's no *new evidence*, don't re-open it.
- When something genuinely changes, add a new ADR that supersedes the old one (mark the old "Superseded by ADR-N") — never silently rewrite history.
- Any new permanent constraint — something the team would refuse to violate under deadline — belongs here, in this format.

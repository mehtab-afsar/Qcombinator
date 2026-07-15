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

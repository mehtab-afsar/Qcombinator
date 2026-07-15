# Build Prompts — the series

*Copy-paste prompts for Claude Code, in order. One feature per prompt. Never combine them — one shot at "build it all" is how you get a confident mess.*

**The pattern, every time:** name the feature → point at the docs → state what's forbidden → **ask for a plan first** → approve → build with tests → review the diff → explain in plain English.

**Dependency chain:** `Phase 0 → F05 → F06 → F07 → F08 → F09` (Story 1) → `F11 → F12 → F10` (Story 2) → `F13 → F14` (Story 3).

**Model:** Opus for planning + anything security-sensitive (Phase 0 audit, F13/F14). Sonnet for the mechanical builds (F05, F07, F09, F12).

---

## P1 — Orient ✅ done
## P2 — Phase 0 ✅ (already given — re-read docs + Steps 1–7 with the three amendments)

---

## P3 — F05 Registry (the first real build)

```
Phase 0 is complete. Build F05 — the Registry.
Read Featureinventory.md F05 and EDGE_ALPHA_PRD.md §7.1 first. Follow CLAUDE.md.

Scope: lib/registry/ ONLY. Behind NEW_EXECUTIVE_MODEL.
  - types.ts: Executive, ProgramTemplate, AssetDef, ActionDef. Each carries its prompt ref
    (systemPromptRef, programPromptRef, instructionsRef).
  - index.ts: getExecutive/getProgram/getAsset/getAction. Typed error on unknown IDs —
    never silent undefined.
  - Seed GENERICALLY (ADR-011 — this must work for all Executives/Programs, not just GTM).
    Seed P001 GTM complete:
      owner: growth · objective · successMetric
      assets:  [AS001 ICP Profiles, AS002 Pains & Gains Matrix, AS003 Buyer Journey Map,
                AS004 Positioning & Messaging Framework, AS005 Channel Strategy]
      actions: [validate_icps, interview_customers, prioritize_channels, review_messaging,
                approve_gtm_plan]
  - Seed source: docs/registry-source/Edge_Alpha_Agentic_OS_Template.xlsx.
    Where it disagrees with PRD §10, the PRD wins.

FORBIDDEN:
  - No runsWhen field (ADR-008).
  - AS013 is NOT in P001 (it belongs to P004).
  - Do not touch features/agents/** or app/api/agents/**.
  - No new routes. This is config only.

First: give me a plan and the file list. Don't write code until I approve.
Then: write it with unit tests — every referenced asset/action resolves; unknown ID throws;
a Program referencing a missing Asset fails at load with a clear message.
Explain the key decisions in plain English.
```

---

## P4 — F06 Prompt Composer

```
Build F06 — the Prompt Composer. Read Featureinventory.md F06 and EDGE_ALPHA_PRD.md §7.2.
Follow CLAUDE.md.

Scope: lib/prompts/ ONLY.
  - compose.ts assembles the FIXED 4-layer nomenclature, in this deterministic order
    (ADR-012 — do not invent competing terms):
        Executive System Prompt + Program Prompt + Asset/Action Instructions + Company Context
  - Resolve Registry entries from IDs (F05). Load company context. Read CURRENT Asset
    versions (stub the read until F11 exists).
  - Remove duplicate context; exclude irrelevant Assets; prioritise current/authoritative
    info; trim by TOKEN count (not characters); preserve source references.
  - VALIDATE before release: hierarchy preserved · lower layers never override higher ·
    Program prompt compatible with its Executive · no capability outside the Executive
    Contract · no unresolved contradictions.
  - Invalid → block + runtime error with {executionId, failedRule, conflictingComponent,
    affectedEntity, timestamp}.
  - knowledge/growth.ts: lift Patel's S003 content READ-ONLY from
    features/agents/patel/prompts/system-prompt.ts. Copy it out; do NOT edit the source.

FORBIDDEN:
  - Do not extend lib/agents/compose-system-prompt.ts — that's the old 3-part assembler,
    frozen, dies with the old model.
  - No inline prompts anywhere.

Plan first. Then build with tests — the required one: executing P001 with the CTO prompt
(S004) must FAIL with the exact runtime error (the Registry defines P001 under Growth/S003).
```

---

## P5 — F07 + F08: the Mandate

```
Build F07 (Strategy Session) and F08 (Executive Contract). Read Featureinventory.md F07+F08
and EDGE_ALPHA_PRD.md §7.4 + §8. Follow CLAUDE.md.

F07 — Strategy Session (S001):
  - strategy_sessions table: versioned, exactly one is_current, RLS.
  - POST /api/strategy — a revision marks the old is_current=false and inserts a new version.

F08 — Executive Contract (S002) — the mandate:
  - executive_contracts table: epoch, version, is_current, status(draft|confirmed|superseded),
    previous_contract_id, active_programs, RLS.
  - POST /api/contracts — generate a draft from the current Strategy via the Composer →
    founder confirms → status='confirmed' → create programs rows (active).
  - POST /api/contracts/new-epoch — ANY change creates a NEW current version; the previous
    is marked superseded and RETAINED.
  - Mandate integrity: only Programs in the current contract's active_programs may run.

CRITICAL (ADR-003): Contracts are IMMUTABLE. There is no PATCH. Never edit a confirmed
contract in place. Never delete history.
CRITICAL (ADR-002): No sign-off gate on Programs. Confirming the contract IS the mandate.

Plan first. Then build with tests: confirm activates Programs · a change creates a new epoch
with the previous retained · a paused Program does not run.
```

---

## P6 — F09 Command View (Story 1 finish)

```
Build F09 — the Executive Command View. Read Featureinventory.md F09. Follow CLAUDE.md.

Scope: app/founder/executive/ + features/executive/.
  - Read executive_contracts (current), programs, executive_briefings.
  - Render: mandate summary · active Programs · latest Briefing · (placeholder for the
    Story-3 approvals area).
  - Wire change controls → POST /api/contracts/new-epoch.

IMPORTANT: this is VISIBILITY AND COMMAND, not approval. The founder does not approve
cycles here — they redirect by issuing a new mandate. Make that legible in the UI.

Empty states: no contract → route to the Strategy Session. No Briefing yet → "first cycle
runs [date]."

Plan first. Then build. Show me the screen and explain what a founder sees.
```

---

## P7 — Story 1 exit check

```
Story 1 is claimed complete. Verify it against the docs — do not take my word or yours.

Check and report, honestly:
  1. Registry resolves generically; P001 has exactly AS001–AS005; unknown IDs throw.
  2. Composer assembles the 4 layers deterministically and rejects the P001+S004 mismatch.
  3. A founder can: complete a Strategy Session → receive a Contract → confirm it →
     Programs go active.
  4. A change creates a NEW epoch; the previous contract is superseded and retained;
     nothing is deleted.
  5. No Program can run outside the current contract (test it).
  6. Nothing in lib/registry|prompts|mandate calls applyAgentScoreSignal (the invariant test).
  7. Everything is behind NEW_EXECUTIVE_MODEL; the flag is still OFF; the live product is
     unchanged.
  8. Tests pass; CI is green on the production build.

Tell me anything that DOESN'T meet the bar. Do not paper over gaps.
```

---

## P8 — F11 Asset Versioning (Story 2 starts)

```
Build F11 — Asset Persistence & Versioning. Read Featureinventory.md F11 and
EDGE_ALPHA_PRD.md §7.3 + §8. Follow CLAUDE.md.

Scope: lib/assets/ + asset_versions table + the founder Asset page.
  - asset_versions: full provenance (execution, program, executive, source_refs,
    update_reason) + authored_by ('program'|'founder'). Exactly one is_current per
    (founder_id, asset_id). Sequential versions. RLS.
  - VALIDATE before persisting: Asset ID in the Registry · belongs to the correct
    Program/Executive · output matches the required structure · complete · valid execution
    ref · sequential version · not already persisted for this execution.
    Invalid → block + runtime error.
  - getCurrentAsset() (the Composer reads this) and getAssetHistory().
  - FOUNDER EDITING (ADR-007): Asset page + PUT /api/assets/:id → creates a NEW immutable
    current version, authored_by='founder', used immediately. NO approval, NO gate.
  - Restore = create a NEW current version from an old one. Never delete history.

CRITICAL: never overwrite. Ever.

Plan first. Then build with tests — the required one: storing a P003 output as AS001 must be
BLOCKED (AS001 belongs to P001). Plus: a founder edit creates a new current version.
```

---

## P9 — F12 Executive Briefings

```
Build F12 — Executive Briefings. Read Featureinventory.md F12. Follow CLAUDE.md.

  - executive_briefings table (per Program per execution: verdict + structured body), RLS.
  - Generate via the Composer using the Program's briefing structure, after a Program runs.
  - Surface the latest on the Command View and the Dashboard; keep history; link to the
    underlying Assets.

RULE: Briefings COMMUNICATE — they never replace Asset access. A founder must always be able
to open the underlying Asset.
Edge case: no material change this cycle → a short "no change" briefing, not silence.

Plan first. A founder must understand a Briefing in under five minutes — show me one.
```

---

## P10 — F10 Operating Rhythm (the hard one — use Opus)

```
Build F10 — the Operating Rhythm engine. Read Featureinventory.md F10 and
EDGE_ALPHA_PRD.md §7.4. Follow CLAUDE.md. This is the hardest feature — take it slowly.

Scope: lib/rhythm/ + operating_rhythm_runs table + the Cron trigger.
  - operating_rhythm_runs: UNIQUE on (founder_id, cycle_key) e.g. 'COMP-001:2026-W28'.
  - run.ts: create one run row; fail fast if the cycle_key exists → IDEMPOTENT.
  - Load: current Registry · Strategy · Contract · Q-Score · current Asset versions.
  - For EACH contract-active Program: judgement (Composer) → new Asset versions (F11) →
    Briefing (F12). Actions come in Story 3.
  - Record every stage's status. Block dependents if a required stage fails. Retry technical
    ops within limits. Parallelise where dependencies allow.
  - Vercel Cron (weekly) + POST /api/rhythm/run for manual testing.

FORBIDDEN:
  - NO Asset Review stage (ADR-006). Asset maintenance happens INSIDE Program execution.
  - NO runsWhen / event-skipping (ADR-008) — run ALL contract-active Programs.
  - No new job queue — Vercel Cron + the DB-row pattern.

Plan first, in detail — I want to see how you handle partial failure mid-cycle.
Then build with tests: same company+week twice → the second is REJECTED · a Program not in
the contract does NOT run · a failed stage blocks dependents.
```

---

## P11 — F13 Connector Layer (security-sensitive — Opus + human review)

```
Build F13 — the Connector Layer (Gmail first). Read Featureinventory.md F13 and
EDGE_ALPHA_PRD.md §7.5. Follow CLAUDE.md.

This is the highest-risk surface in the system — credentials and irreversible actions.
Be conservative. Flag anything you're unsure about rather than guessing.

Scope: lib/connectors/ + connector_connections table + OAuth route.
  - Table: connector_connections (provider, status, scopes, token_ref). RLS.
  - Route: POST /api/connectors/gmail/oauth
    NOT /api/connections — that namespace is TAKEN by founder→investor intro requests.
  - Adapter interface (send / read); Gmail first. Prefer an MCP client over hand-built.
  - Revoke → status='revoked'; dependent Actions blocked with a reconnect prompt.

NON-NEGOTIABLE:
  - OAuth only. Least-privilege scopes.
  - Tokens by REFERENCE (token_ref → secrets manager). NEVER plaintext. NEVER logged.
  - Token expired mid-action → fail SAFE (no partial send), mark expired, log failed.

Plan first. Then build with tests. When done, list exactly what a human security reviewer
should check before this ships.
```

---

## P12 — F14 Actions + just-in-time approval

```
Build F14 — Actions with just-in-time approval. Read Featureinventory.md F14 and
EDGE_ALPHA_PRD.md §7.5. Follow CLAUDE.md.

  - action_log table (pending_approval|executed|failed|declined, approved_by, request,
    result). Immutable. RLS.
  - Program creates an Action → payload prepared → if irreversible, create pending_approval
    and surface on the Command View; else run.
  - Approve → execute via the connector → executed + approved_by. Decline → declined.
    Failure → failed.
  - The founder sees: prepared Action · payload · target system · execution status ·
    delivery result · failure/retry.
  - Recurring cadences extend scheduled_actions (cadence, next_run_at); skip while paused.
  - Re-check mandate/program-active AT EXECUTION TIME, not just at generation.

NON-NEGOTIABLE (ADR-004): irreversible external actions (send/publish/spend/change-price)
NEVER execute without founder approval, at the Connector boundary. Retry must not
double-send — idempotency key.

First proof: P001's 'interview_customers' → prepares interview invitations → I approve →
sends via Gmail → logged.

Plan first. Then build with tests: nothing sends without approval · retry doesn't
double-execute · a paused Program's cadence doesn't fire.
```

---

## Reusable — use any time

**When you want a review:**
```
Review what you just built against CLAUDE.md and Featureinventory.md [F##].
Tell me honestly: what's missing, what's weak, what would a senior engineer flag?
Check specifically: tests on edge cases (not just the happy path) · RLS on new tables ·
no secrets in plaintext or logs · nothing touching features/agents/** or app/api/agents/** ·
behind the flag. Do not reassure me — find the problems.
```

**When you don't understand something:**
```
Explain what you just did like I'm smart but not an engineer. Use an analogy.
Then tell me: what could go wrong with this, and how would we know?
```

**When it starts sprawling:**
```
Stop. You're going beyond the scope of [F##]. Revert anything outside it.
CLAUDE.md §7: one feature at a time, smallest thing that meets the story.
Show me only the diff for [F##].
```

**When something breaks:**
```
Here's the error: [paste]
Explain in plain English: what broke, why, and the smallest fix.
Don't refactor anything else while you're in there.
```

---

## The rules that make this work

1. **Plan before code, every time.** Approve the plan, not the code.
2. **One feature per prompt.** Never combine.
3. **`/clear` between features** so old context doesn't bleed in.
4. **Never merge what you can't explain back in one sentence.**
5. **Tests are your seatbelt** — you're not reading the code, you're trusting the green check. So insist on the tests.

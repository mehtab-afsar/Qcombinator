# Claude Code prompt — Story 2, F12: Executive Briefings

> Paste this whole file as your next message. **Staged**: Stage A, stop and show me, wait for
> "go", then B, C, D. Do not run ahead.

---

## Context — read before writing anything

1. `CLAUDE.md` — the rules. §0 prime directives (~300 lines/file, no `any`, Zod at boundaries),
   §4 data rules.
2. `Featureinventory.md` → **F12** (the spec), **F06** (the Composer — Briefings are generated
   through it, never with an inline prompt), **F09/F04** (where Briefings surface).
3. `DecisionLog.md` — **ADR-006** (no Asset Review — a Briefing is *not* a review or an approval
   step), **ADR-007** (Briefings point to material changes but **never replace Asset access**),
   **ADR-002** (no approval gates), **ADR-005** (nothing here may call `applyAgentScoreSignal`).
4. **Your own F11 work** — `supabase/migrations/20260715000006_asset_versions.sql`,
   `lib/assets/versioning.ts`, `F11_STAGE_A_DESIGN.md`. F12 follows the same patterns.
5. `FOLLOWUPS.md` — FU-001/002/003 are **not** part of this task. Do not fold them in.

## Boundaries — do not cross

- **F12 only.** Do **not** build F10 (the Operating Rhythm engine), `operating_rhythm_runs`, or
  any cron. F12 builds the Briefing *store and generator*; F10 will call it later.
- **Do not touch the old model** — nothing under `features/agents/**` or `app/api/agents/**`.
- **No approval gate, no review status** on a Briefing. A Briefing is *read*, never *approved*.
  If you add `pending`/`approved` to it, you've rebuilt the gate the PRD removed.
- **No inline prompts.** Briefing text is generated via `lib/prompts/compose.ts` (F06) using the
  Program's briefing structure. A prompt string written into a route or service is a rule break.
- No module you write may import or call `applyAgentScoreSignal` — assert with a test.
- Behind `FF_NEW_EXECUTIVE_MODEL` (default off). New-model routes 404 when off, not 403.

---

## Stage A — DESIGN, NO CODE (show me, then wait)

A short design doc (`F12_STAGE_A_DESIGN.md`), covering:

1. **The `executive_briefings` schema.** One Briefing per Program per execution: a **verdict**
   plus a structured body. Include provenance (program, executive, execution ref) and links to
   the Asset versions it describes.
2. **The F11 problem again — the execution reference.** `operating_rhythm_runs` doesn't exist
   until F10. State how you handle it, and **be consistent with what F11 did** (caller-supplied
   UUID, no FK yet, real FK added in F10's migration). If you deviate, justify it.
3. **Database-enforced invariants.** Which rules are enforced by the database rather than hopeful
   code? At minimum: **one Briefing per (program, execution)** — a re-run must not produce two.
   State how. F11's dedupe index is the model.
4. **Immutability.** Is a Briefing immutable once written? Recommend and justify. It is a record
   of what was said at a point in time — argue the case either way, but decide, and enforce
   whatever you decide in the database (F11 used a trigger).
5. **RLS**, mirroring F11 exactly: founder-scoped, **no** permissive `using(true)`, no DELETE
   policy. Say so explicitly.
6. **If you add any `plpgsql` function: the grant model.** F11's `persist_asset_version` had to
   be `revoke execute … from anon, authenticated` because PostgREST exposes public functions as
   RPC endpoints by default. **Apply the same reasoning up front** — do not repeat that miss.
7. **How generation works without F10.** The signature F10 will call, and how you test it now.
8. **The two edge cases from the spec**, designed not bolted on:
   - *No material change* → a short "no change" briefing, **never silence**.
   - *Generation fails* → the stage is `failed`, **and the Assets from that run stay persisted**.
     A Briefing failure must never roll back or hide the work F11 stored.
9. **Where Briefings surface** on F09 (Command View) and F04 (Dashboard) — latest + history,
   each linking through to the underlying Assets (ADR-007: Briefings never replace Asset access).
10. **Any conflict** you find between PRD, Featureinventory and the code — surface it, recommend,
    do not silently resolve.

**Stop. Show me. Wait for "go".**

---

## Stage B — MIGRATION + GENERATION (after I approve Stage A)

- The `executive_briefings` migration: idempotent, additive, reversible, RLS founder-scoped,
  invariants in the database, correct grants on any function. Timestamped to apply **last**.
- `lib/briefings/**` — generation through the F06 Composer, persistence, retrieval. Split files
  before any reaches ~300 lines.
- Tests:
  - one Briefing per Program run, carrying a verdict;
  - **the same execution twice → no duplicate Briefing** (idempotency);
  - **no material change → a short "no change" Briefing, not silence**;
  - **generation fails → stage `failed`, and the run's Asset versions remain persisted**;
  - retrieval in order, newest first;
  - a Briefing links to the Asset versions it describes;
  - no module under `lib/briefings/**` calls `applyAgentScoreSignal`.

Show me: the migration diff, test output, and a **dry run against a local/shadow DB — not
production**. **Stop. Wait for "go" before anything touches the remote database.**

---

## Stage C — SURFACE IT

- Latest Briefing on `/founder/executive` (F09) and the Dashboard (F04); full history readable.
- Every Briefing links through to the Asset versions behind it.
- Pages stay **thin** — render state, call the API, no executive reasoning (CLAUDE.md §2).
- **No approve/dismiss/acknowledge control anywhere on a Briefing.**

---

## Stage D — VERIFY + REPORT

- **Runtime verification against a real database**, as you did for F11 — list each behaviour
  checked and its result. Say plainly which behaviours you could *not* verify from where you sit.
- Update `SCHEMA_DRIFT.md`: `executive_briefings` ABSENT → PRESENT.
- Append any new locked decision to `DecisionLog.md` as an ADR.
- Add any new follow-up to `FOLLOWUPS.md` — do not fix unrelated ones here.
- Short completion report: built · deliberately not built · contradictions found · unverified.

---

## Definition of done

- [ ] `executive_briefings` live; migration idempotent + reversible; RLS founder-scoped, no
      permissive policy, no DELETE policy; correct grants on any function.
- [ ] One Briefing per Program run with a verdict; **a re-run cannot duplicate it** (DB-enforced).
- [ ] "No change" produces a short Briefing, never silence.
- [ ] A generation failure marks the stage `failed` and **leaves Asset versions intact**.
- [ ] Briefings render on F09 and F04, link to their Assets, with **no approval control**.
- [ ] Generated through the F06 Composer — no inline prompt anywhere.
- [ ] No new-model module calls `applyAgentScoreSignal` (tested).
- [ ] Behind the flag; old model untouched; types + production build green; all tests pass.
- [ ] F10 **not** started. Diff small and reviewable.

## How to report

Two rules, both learned on this project:

1. **Say what you verified; name what you didn't.** In Phase 0 you called a build "clean" on an
   assumption you never tested. The pattern-tested-vs-behaviour-proven distinction matters —
   don't write "proven" where you mean "the code looks right."
2. **Surface the thing I'd want to know even if it's inconvenient.** F11's Stage A was strong
   because it flagged its own three judgement calls and one honest limitation. Do that again.

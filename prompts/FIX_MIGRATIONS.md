# Claude Code prompt — fix the migration integrity issue + reconcile schema drift

> Paste this whole file as your next message to the Claude Code agent working in the
> Qcombinator repo. It is **staged**: do Stage A, stop and show me, wait for my "go",
> then Stage B, then Stage C. Do not run ahead.

---

## Context you must load first

Read these before doing anything, in this order:

1. `CLAUDE.md` — the rules. Pay special attention to **§4 Data rules** (append-only
   history, immutable versioning, idempotency, migrations additive & reversible) and the
   **Red flags** section.
2. `EDGE_ALPHA_PRD.md` — the canonical spec (the tables the NEW model needs).
3. `DecisionLog.md` — especially **ADR-005** (Q-Score is a separate diagnostic; the boost
   is `applyAgentScoreSignal()` in `features/qscore/services/agent-signal.ts`) and
   **ADR-014** (strangler: **delete NOTHING** in the old model until parity — that is a
   later phase, NOT this task).
4. Every file in `supabase/migrations/`.

## The hard boundary — read this twice

**This task does NOT delete or rewrite the old codebase.** Retiring the old model
(the 173 `app/api/agents/**` routes, the 11 personas, old config) is **Phase 7**, after
the new model reaches parity. If you find yourself proposing to drop a table the old model
still uses, or to edit anything under `features/agents/**` or `app/api/agents/**`, **stop** —
that is out of scope. Your scope is migration *integrity* and a *read-only* drift report.

---

## The concrete problem

A migration fails on `db push` with:

```
ERROR: could not create unique index "qscore_history_user_artifact_unique" (SQLSTATE 23505)
Key (user_id, source_artifact_type)=(09d0a5d3-1ff3-4ec3-82b0-039e0b97904c, icp_document) is duplicated.
```

The migration wants each `(user_id, source_artifact_type)` to appear once in
`qscore_history`, but existing rows already violate that — the old model boosted the same
artifact type more than once for at least one user. Postgres refuses to build the index on
non-unique data. This is real residue of the exact bug the new model exists to prevent.

There is also a branch `fix-migration-idempotency` whose commit makes migrations
re-runnable; its files may carry timestamps *earlier* than what is already applied on the
remote DB, which triggers the "insert before the last remote migration" warning. Factor
that in.

---

## Stage A — DIAGNOSE ONLY (no changes; show me a report)

Do not edit or run any migration in this stage. Produce a short written report covering:

1. **The duplicate blast radius.** Give me the SQL you would run to measure it, and — if
   you can query the DB read-only — the result. I want to know: how many
   `(user_id, source_artifact_type)` groups have duplicates, how many rows in total, and
   whether it's one artifact type (`icp_document`) or several.
2. **Which migration** creates `qscore_history_user_artifact_unique`, and whether that
   migration also writes the duplicate rows or only indexes them.
3. **Append-only tension.** `CLAUDE.md §4` says `qscore_history` is append-only, never
   mutated. Deleting duplicate rows conflicts with that on its face. State the tension
   plainly and give me the options (e.g. keep the earliest row per group and delete the
   later erroneous double-counts, vs. a soft-dedup, vs. leaving history intact and instead
   making the index a partial/expression index). Recommend one, with the trade-off.
4. **The timestamp-ordering issue** from `fix-migration-idempotency`: is anything genuinely
   out of order, and does it need re-timestamping to apply cleanly at the end?
5. **Reversibility.** For whatever you'll propose, confirm there is a defined rollback.

**Stop here. Show me the report. Wait for my "go".**

---

## Stage B — FIX THE MIGRATION (only after I approve Stage A)

Implement the option I approved. Requirements:

- The **de-duplication step and the `CREATE UNIQUE INDEX` live in the same migration**, in
  order (dedup first, index second), so the DB can never be in a state where the index is
  expected but the data isn't clean.
- **Idempotent and re-runnable** — running it twice must not error or double-act (matches
  the `fix-migration-idempotency` intent). Guard with `IF EXISTS` / `IF NOT EXISTS` and a
  dedup that is safe to repeat.
- **Additive and reversible** — provide the down/rollback and test it.
- If dedup deletes rows from an append-only table, the migration must **record why**
  (a comment, and if practical an audit row elsewhere), so the deletion is auditable rather
  than silent. Preserve the earliest legitimate row per group unless I said otherwise.
- Re-timestamp any out-of-order migration so the set applies last, in clean order.
- **Do not touch** the old model's boost behaviour (`applyAgentScoreSignal`,
  `features/qscore/**`, `app/api/agents/**`). Those call sites are frozen (ADR-014). You are
  fixing *data* and an *index*, not the old code path.

Then show me:
- the migration diff,
- the output of a **dry run** (or the exact `db push` plan) against a shadow/local DB, not
  production,
- confirmation the six Story-1 test suites still pass and types/build are green.

**Stop. Show me. Wait for "go" before anything touches the remote DB.**

---

## Stage C — DRIFT REPORT (read-only; no deletions)

A short markdown report (append to `DOC_RECONCILIATION.md` or a new `SCHEMA_DRIFT.md`),
listing where the **migrations/DB** and the **new PRD/Architecture** disagree. For each item:
what it is, whether it belongs to the OLD model (leave frozen) or the NEW model (fix now or
flag for a Story), and a recommendation. Specifically check:

- New-model tables the PRD requires exist and match: `strategy_sessions`,
  `executive_contracts` (immutable/epoch), and — not yet built, so just confirm absent —
  `asset_versions`, `executive_briefings`, `operating_rhythm_runs`, `connector_connections`.
- RLS is enabled **and enforced** on every new-model table (there was a prior hole where RLS
  was enabled but not enforced on 4 tables — verify it stays closed).
- Any migration that assumes a table/column the new model renamed (e.g. the
  `connections` vs `connector_connections` namespace decision — still pending Roman's
  sign-off, so **flag, don't change**).
- Orphaned or superseded migrations tied to the old model — **list them, do not drop them.**

**Deliverable:** the report only. No schema changes in Stage C.

---

## Definition of done

- `db push` succeeds cleanly; the unique index exists; duplicates resolved with an audit trail.
- The dedup+index migration is idempotent, reversible, and re-run-safe.
- Story-1 tests green; types and production build green.
- A drift report exists telling me what's out of sync, tagged old-model (frozen) vs
  new-model (actionable).
- **Nothing in the old model deleted. No frozen files edited.** If parity-retirement work
  looks tempting, it is Phase 7 — note it and move on.

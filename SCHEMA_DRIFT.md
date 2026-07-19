# Schema Drift Report

*Read-only. Nothing here changes code or the database. It compares what the SQL migrations
actually build against what the PRD / Architecture / Feature inventory say the new Executive
model needs, and tags every gap **old-model (frozen, leave — Phase 7)** or **new-model
(actionable)**. First generated 19 Jul 2026 (Story 1 Stage C); updated after Story 2 / F11
added `asset_versions`.*

---

## 0. One-paragraph summary

The database matches the migration source, and every **new-model** table Story 1 (the Mandate)
and **all of Story 2** (F11 Assets + F12 Briefings + F10 the Operating Rhythm) require is
present, correctly secured, and enforced — not just enabled. The drift that exists is almost all
**absence**: tables for **Story 3** (the Connector boundary) simply aren't built yet, which is
expected — that isn't started. The one genuinely notable gap is the **Connector layer**
(`connector_connections`, `action_log`): the PRD's central safety mechanism — approval on
irreversible external actions — has no schema yet. That is future work (flagged, pending Roman),
not a defect in what's shipped. No old-model table needs touching; the strangler freeze holds.

---

## 1. What the migrations actually build

66 migration files create ~80 tables. The full set the migrations define:

`academy_mentors, academy_programs, academy_workshops, agent_actions, agent_activity,
agent_artifacts, agent_conversations, agent_goals, agent_memory, agent_messages,
agent_trigger_log, analytics_events, applications, artifact_embeddings, artifact_jobs,
connection_requests, content_calendar, customer_accounts, deals, delegation_tasks,
demo_investors, deployed_sites, document_embeddings, executive_contracts, feed_comments,
feed_posts, feed_reactions, founder_behavioural_signals, founder_metric_snapshots,
founder_profiles, growth_experiments, hiring_candidates, investor_configs, investor_contacts,
investor_parameter_weights, investor_pipeline, investor_portfolio_companies, investor_profiles,
investor_team_invites, investor_team_members, investor_updates, investor_watchlist,
knowledge_library, legal_documents, legal_risks, linear_tokens, messages,
notification_preferences, notifications, outreach_sends, patel_diagnostic_scores,
pending_actions, portfolio_views, processed_webhook_events, profile_builder_data,
profile_builder_uploads, programs, proposals, qscore_assessments, qscore_benchmarks,
qscore_history, qscore_history_dedup_audit, qscore_knowledge_chunks, qscore_reconciliation_log,
rag_execution_logs, rag_score_cache, scheduled_actions, score_evidence, sector_weight_profiles,
startup_members, startup_state, startups, strategy_sessions, subscription_usage,
tool_execution_logs, tracked_competitors, waitlist_signups`

The overwhelming majority are **old-model** (Q-Score, investor matching, the frozen agents,
profile builder, feed, academy). Six are the **new Executive model** (`strategy_sessions`,
`executive_contracts`, `programs`, `asset_versions`, `executive_briefings`,
`operating_rhythm_runs`); one is a migration-integrity artifact.

---

## 2. New-model tables — present vs absent

| Expected (PRD / Architecture / Featureinventory) | Status | Where / note |
|---|---|---|
| `strategy_sessions` (S001, F07) | ✅ **PRESENT** | `20260715000001` — versioned, one-current index, founder-scoped RLS |
| `executive_contracts` (S002, F08 — the Mandate) | ✅ **PRESENT** | `20260715000002` — immutable (trigger), epoch/version (ADR-022), atomic confirm |
| `programs` (Program instances a confirmed contract activates) | ✅ **PRESENT** | `20260715000002` — `template_id` → code Registry (ADR-010), not an FK |
| `executive_contracts.contract_document` (F08b — human-readable mandate) | ✅ **PRESENT** | `20260715000003` — nullable column; trigger extended to protect it |
| `qscore_history_dedup_audit` (integrity, not a product table) | ✅ **PRESENT** | `20260715000005` — audit trail for the dedup |
| **`asset_versions`** (versioned, founder-editable Assets) | ✅ **PRESENT** | `20260715000006` (Story 2 / F11) — versioned, one-current partial index, immutability trigger, execution-ref CHECK, atomic `persist_asset_version`; read-only for authenticated, writes server-side only. |
| **`operating_rhythm_runs`** (`cycle_key`) | ✅ **PRESENT** | `20260715000009` (Story 2 / F10) — one run per `(founder_id, cycle_key)`, idempotent; read-only for authenticated; **and lands the deferred `execution_id` FKs** on `asset_versions` + `executive_briefings`. |
| **`executive_briefings`** (Command View briefings) | ✅ **PRESENT** | `20260715000007` (Story 2 / F12) — append-only (one per Program per run), dedupe index, contract-stamped for the epoch (ADR-022), read-only for authenticated, append-only trigger. Written by the rhythm (F10). |
| **`action_log`** (every irreversible-action attempt) | ⛔ **ABSENT** | **New-model, future story.** CLAUDE.md §3 requires it at the Connector boundary. Closest existing tables (`agent_trigger_log`, `tool_execution_logs`) are old-model and not this. |
| **`connector_connections`** (Connector interface) | ⛔ **ABSENT** | **New-model, future story — see §4.** |
| `agent_artifacts` (reused by the engine per CLAUDE.md §3) | ✅ PRESENT (old-model) | `20260222000001` — reuse target, not new work. |
| `scheduled_actions` (reused by the engine) | ✅ PRESENT (old-model) | `20260417000003` — reuse target. Its RLS hole was closed — §3. |

**Reading:** every table Story 1 (the Mandate) and **all of Story 2** (F11 Assets, F12 Briefings,
F10 the Rhythm) needs exists and is correct. The only ABSENT rows are **Story 3**'s (Connector).
None is overdue; that isn't built yet. Expected forward drift, not a defect.

---

## 3. RLS on the new-model tables — enabled **and** enforced

The Phase 0 finding was that "RLS enabled" ≠ "RLS enforced": a permissive `for all
using(true)` policy with no `TO` clause applies to PUBLIC and, because permissive policies are
OR'd, overrides every founder-scoped rule. All five new-model tables were written to
**deliberately avoid** that pattern (the migrations say so in comments).

**`executive_briefings`** (`20260715000007`, F12) uses the same read-only-for-authenticated shape
as `asset_versions` (a single `SELECT`-own policy; no write policy — briefings are written by the
rhythm, not the founder), plus an **append-only trigger** rejecting all UPDATE and DELETE (a
briefing has no lifecycle — it just happened). No RPC, so nothing to revoke.

**`asset_versions`** (`20260715000006`, F11) goes one step further: it is **read-only for
authenticated** (a single `SELECT`-own policy, no insert/update/delete policy), because its
persistence must pass a TypeScript validation gate that the database cannot express (ADR-010).
All writes go through a service-role server route; the `persist_asset_version` function is
revoked from `authenticated`. This closes both the direct-table-write and the RPC bypass. See
the F11 migration header.

**`strategy_sessions`** (`20260715000001`):
```sql
alter table strategy_sessions enable row level security;
create policy "strategy_sessions_select_own"  ... using (auth.uid() = founder_id);
create policy "strategy_sessions_insert_own"  ... with check (auth.uid() = founder_id);
create policy "strategy_sessions_retire_own"  ... using (auth.uid() = founder_id)
                                                  with check (auth.uid() = founder_id and is_current = false);
-- No DELETE policy (append-only). No permissive using(true) policy.
```

**`executive_contracts`** (`20260715000002`):
```sql
alter table executive_contracts enable row level security;
create policy "executive_contracts_select_own"     ... using (auth.uid() = founder_id);
create policy "executive_contracts_insert_own"     ... with check (auth.uid() = founder_id);
create policy "executive_contracts_transition_own" ... using (auth.uid() = founder_id)
                                                       with check (auth.uid() = founder_id and status in ('confirmed','superseded'));
-- Immutability trigger executive_contracts_immutable rejects any content edit (ADR-003).
-- confirm_executive_contract() is SECURITY INVOKER, so RLS still applies.
```

**`programs`** (`20260715000002`):
```sql
alter table programs enable row level security;
create policy "programs_select_own" ... using (auth.uid() = founder_id);
create policy "programs_insert_own" ... with check (auth.uid() = founder_id);
create policy "programs_update_own" ... using (auth.uid() = founder_id) with check (auth.uid() = founder_id);
```

- ✅ RLS enabled on all three.
- ✅ Every policy founder-scoped via `auth.uid() = founder_id`.
- ✅ **No** permissive `for all using(true)` without `TO` on any of them.
- ✅ `executive_contracts` additionally enforces immutability in the database (trigger), not
  just by convention.
- ✅ Guarded by `__tests__/rls-policies.test.ts`, which replays all migrations in order and
  fails on any write-capable `using(true)` policy without a `TO` clause.

**The old permissive hole is closed** (`20260715000004_fix_permissive_rls.sql`): the four
`service role full access` / `using(true)` policies on `scheduled_actions`, `agent_goals`,
`delegation_tasks`, `founder_metric_snapshots` were dropped and RLS re-asserted. This is a
**new-model-era fix applied to old-model tables** — actionable and **done**. The migration
notes it must never be rolled back (doing so restores a cross-tenant breach).

---

## 4. The `connections` vs `connector_connections` namespace

**Neither table exists.** No migration creates `connections`, and none creates
`connector_connections`.

What exists today is **old-model investor matching**, not a connector layer:
- `connection_requests` (`20250101000001`, tightened `20260512000004`) — founder↔investor
  intro requests.
- `investor_contacts`, `messages`, `investor_pipeline` — the matching/messaging surface.

The PRD's **Connector interface** (one Connector interface; secrets by `token_ref`; approval
at the Connector boundary on send/publish/spend) has **no schema yet**. When it is built it
should not collide with the old `connection_requests` name — the intended name is
`connector_connections`, which is why this was flagged as pending (Roman's area).

**Action: flag, do not change.** This is future new-model work; there is nothing to fix in the
current schema. Recorded here so the naming decision is made deliberately when the Connector
story starts, not by accident.

---

## 5. Old-model migrations — list, don't drop (strangler freeze holds)

Per ADR-014, the old model is frozen and deleted only after the new model reaches parity
(Phase 7). Nothing in this report proposes dropping any of it. Two things worth noting for the
record, neither actionable now:

- **`pending_actions`, `agent_actions`, `agent_trigger_log`, `tool_execution_logs`,
  `rag_execution_logs`** — old-model action/observability tables. The new model will want its
  own `action_log` at the Connector boundary (§2); these are **not** it and should not be
  repurposed.
- **`startup_state`, `startup_state_*` columns** and the **`startups` / `startup_members`**
  team tables — old-model. The `team_management` backfill was made idempotent during the db
  push work but the tables themselves are untouched, frozen.

No orphaned migration needs removing. The history is intact and now re-runnable.

---

## 6. Net drift, in one table

| Area | Drift | Tag | Action |
|---|---|---|---|
| Strategy / Contract / Programs (Story 1) | none — present, secured, enforced | new-model | ✅ done |
| Permissive RLS hole (4 tables) | closed | new-model fix / old-model tables | ✅ done |
| Assets (`asset_versions`, Story 2 / F11) | none — present, secured, server-side writes | new-model | ✅ done |
| Briefings (`executive_briefings`, Story 2 / F12) | none — present, append-only, epoch-stamped | new-model | ✅ done |
| Operating Rhythm (`operating_rhythm_runs`, Story 2 / F10) | none — present, idempotent; `execution_id` FKs now real | new-model | ✅ done |
| Connector (`connector_connections`, `action_log`) | absent | new-model | future story — flagged (Roman) |
| Old-model tables (Q-Score, investors, agents, feed, academy) | present, frozen | old-model | leave (Phase 7) |

**Bottom line:** no schema change is required to close any gap that belongs to work already
done. All remaining drift is future-story absence, correctly deferred.

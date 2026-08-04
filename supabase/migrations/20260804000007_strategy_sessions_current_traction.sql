-- Strategy Sessions — add current_traction, an optional founder-supplied number.
--
-- Replaces the Weekly Check-in popup (components/onboarding/WeeklyCheckin.tsx),
-- deleted alongside this migration: that popup asked for a metric value on its own
-- recurring schedule, disconnected from everything else — a concept that appears
-- nowhere in the PRD. This captures the same kind of fact ONCE, as part of setting
-- direction, where it actually feeds something (S001's proposal, via Company
-- Context's "New Information This Cycle" field).
--
-- Nullable and free-text, like mission/priorities/goals on this same table — a
-- half-finished Strategy is still saveable (F07's existing rule), and this is no
-- different.

alter table strategy_sessions
  add column if not exists current_traction text;

comment on column strategy_sessions.current_traction is
  'Optional founder-supplied traction note (e.g. "11 pilots, 4 paying") — read by S001 as company context, not required to save.';

-- ─── Rollback ────────────────────────────────────────────────────────────────
-- CLAUDE.md §4: "Migrations additive and reversible; test the rollback."
--
--   alter table strategy_sessions drop column if exists current_traction;
--
-- Purely additive: one nullable column on an existing table. Nothing existing
-- reads or depends on it, so the rollback cannot affect the live product.

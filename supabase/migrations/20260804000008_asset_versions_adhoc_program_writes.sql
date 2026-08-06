-- F09 Stage 4 — "direct a rework" (PRD §4). A founder can ask an executive to rework one
-- Asset outside any weekly cycle. The write is still authored_by='program' (the executive held
-- the pen, steered by the founder — this is NOT the founder editing directly; ADR-007's
-- authored_by='founder' path is unchanged), but there is no operating_rhythm_runs row for it to
-- reference: it is a one-off, not a step in a weekly cycle.
--
-- Found live (2026-08-04): the original CHECK (asset_versions_execution_matches_author, added
-- in 20260715000006) required every program-authored version to carry an execution_id — written
-- before an ad-hoc, non-run program write was a real case, so a directed rework's synthesized id
-- failed with "invalid input syntax for type uuid" (it wasn't even a real UUID) and, had that
-- been fixed alone, would next have failed the FK to operating_rhythm_runs (no run exists for an
-- ad-hoc action). Inventing a fake run row was considered and rejected: operating_rhythm_runs
-- backs getLatestRun/getLastCompletedRun, which RhythmPanel, ActivationGate (F09 Stage 2) and
-- the ADR-028 regeneration-delta boundary all read as "the founder's real weekly cycle history"
-- — a synthetic row would corrupt all three.
--
-- Relaxed instead from a biconditional to a one-directional implication: a FOUNDER edit must
-- still have no execution_id (ADR-007, unchanged); a PROGRAM write may have one (the normal
-- weekly-cycle case, still FK-enforced below) or none (an ad-hoc directed rework, gated in code
-- by PersistAssetArgs.adHoc — lib/assets/validation.ts — so an accidental omission on the normal
-- rhythm-cycle path still throws; only the explicit ad-hoc path is exempt).
--
-- The FK to operating_rhythm_runs (added in 20260715000009) is untouched — when execution_id IS
-- present it must still reference a real run, and the FU-004 stale-run "on delete set null"
-- cleanup still applies to every real run's versions exactly as before.
--
-- Additive, reversible.

alter table asset_versions
  drop constraint if exists asset_versions_execution_matches_author;

alter table asset_versions
  add constraint asset_versions_execution_matches_author
  check (not (authored_by = 'founder' and execution_id is not null));

comment on constraint asset_versions_execution_matches_author on asset_versions is
  'A founder edit never carries an execution id (ADR-007). A program-authored write may (a weekly-cycle step, FK-enforced) or may not (an ad-hoc directed rework, F09 Stage 4).';

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
--   alter table asset_versions drop constraint if exists asset_versions_execution_matches_author;
--   alter table asset_versions add constraint asset_versions_execution_matches_author
--     check ((authored_by = 'founder') = (execution_id is null));

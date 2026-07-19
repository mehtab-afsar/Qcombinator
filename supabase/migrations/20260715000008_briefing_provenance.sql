-- F12 (generator) — add executive provenance to briefings.
--
-- The generator stamps which Executive authored the briefing (derived from the Program's
-- owner). PRD §8's briefing schema didn't carry it; added here so a briefing is
-- self-describing, exactly like asset_versions.executive_id (ADR-024/025).
--
-- Additive + idempotent + reversible. The append-only trigger from 20260715000007 already
-- protects this column too (it rejects every UPDATE, whatever the column).

alter table executive_briefings
  add column if not exists executive_id text;

comment on column executive_briefings.executive_id is
  'The owning ExecutiveId (derived from the Program), stamped by the generator. Provenance only.';

-- ─── Rollback ──────────────────────────────────────────────────────────────────────
--   alter table executive_briefings drop column if exists executive_id;

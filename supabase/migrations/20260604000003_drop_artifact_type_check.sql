-- Remove the CHECK constraint on agent_artifacts.artifact_type permanently.
--
-- Why: The constraint must match every artifact type defined in TypeScript
-- (lib/constants/artifact-types.ts). Keeping them in sync requires updating
-- both code and a migration every time a new agent or artifact is added.
-- That maintenance burden causes the Patel D2–D4 "ICP loop" bug: if the
-- constraint wasn't updated, D2/D3/D4 saves fail with code 23514 and the
-- system falls back to a §PATEL_BUILT memory marker, losing the artifact data.
--
-- Artifact type validation is enforced in application code via ALL_ARTIFACT_TYPES
-- from lib/constants/artifact-types.ts — no need for a DB-level constraint.

ALTER TABLE agent_artifacts
  DROP CONSTRAINT IF EXISTS agent_artifacts_artifact_type_check;

-- Expand agent_artifacts.artifact_type CHECK to all 14 supported types
ALTER TABLE public.agent_artifacts
  DROP CONSTRAINT IF EXISTS agent_artifacts_artifact_type_check;

ALTER TABLE public.agent_artifacts
  ADD CONSTRAINT agent_artifacts_artifact_type_check CHECK (artifact_type IN (
    'icp_document','outreach_sequence','battle_card','gtm_playbook',
    'financial_summary','competitive_matrix','hiring_plan','pmf_survey',
    'brand_messaging','sales_script','strategic_plan','interview_notes',
    'legal_checklist','legal_documents'
  ));

-- Expand qscore_history.data_source CHECK to all supported source values
ALTER TABLE public.qscore_history
  DROP CONSTRAINT IF EXISTS qscore_history_data_source_check;

ALTER TABLE public.qscore_history
  ADD CONSTRAINT qscore_history_data_source_check CHECK (data_source IN (
    'registration','profile_builder','agent_completion','agent_artifact',
    'manual','onboarding','assessment','combined'
  ));

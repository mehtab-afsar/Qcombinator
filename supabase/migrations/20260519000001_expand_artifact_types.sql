-- Expand agent_artifacts.artifact_type CHECK constraint to include all types
-- defined in lib/constants/artifact-types.ts.
-- The original constraint (20260222) only allowed 4 types; 20260326 added more
-- but still missed pains_gains_triggers, buyer_journey, positioning_messaging,
-- and all the newer agent types. 20260512 dropped the constraint but didn't
-- replace it. This migration replaces it with the full authoritative list.

ALTER TABLE agent_artifacts
  DROP CONSTRAINT IF EXISTS agent_artifacts_artifact_type_check;

ALTER TABLE agent_artifacts
  ADD CONSTRAINT agent_artifacts_artifact_type_check CHECK (artifact_type IN (
    -- Patel (CMO) deliverables
    'icp_document', 'pains_gains_triggers', 'buyer_journey',
    'positioning_messaging', 'outreach_sequence', 'gtm_playbook',
    'battle_card', 'lead_list', 'campaign_report', 'ab_test_result',
    -- Susi (CRO)
    'sales_script', 'call_playbook', 'pipeline_report', 'proposal',
    'win_loss_analysis',
    -- Maya (Brand Director)
    'brand_messaging', 'content_calendar', 'seo_audit', 'press_kit',
    'newsletter_issue', 'brand_health_report',
    -- Felix (CFO)
    'financial_summary', 'financial_model', 'investor_update', 'board_deck',
    'cap_table_summary', 'fundraising_narrative',
    -- Leo (General Counsel)
    'legal_checklist', 'legal_documents', 'nda', 'safe_note',
    'contractor_agreement', 'privacy_policy', 'ip_audit_report',
    'term_sheet_redline',
    -- Harper (CPO People)
    'hiring_plan', 'job_description', 'interview_scorecard', 'offer_letter',
    'onboarding_plan', 'comp_benchmark_report',
    -- Nova (CPO Product)
    'pmf_survey', 'retention_report', 'product_insight_report',
    'experiment_design', 'roadmap', 'user_persona',
    -- Atlas (CSO)
    'competitive_matrix', 'competitor_weekly', 'market_map',
    'review_intelligence_report',
    -- Sage (CEO Advisor)
    'strategic_plan', 'interview_notes', 'investor_readiness_report',
    'contradiction_report', 'okr_health_report', 'crisis_playbook',
    -- Carter (CCO)
    'customer_health_report', 'churn_analysis', 'qbr_deck',
    'expansion_playbook', 'cs_playbook',
    -- Riley (CGO)
    'growth_model', 'paid_campaign', 'referral_program', 'launch_playbook',
    'growth_report', 'experiment_results'
  ));

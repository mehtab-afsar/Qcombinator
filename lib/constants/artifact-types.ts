/**
 * Canonical artifact type string literals.
 * Use these everywhere instead of inline strings.
 * Values match what is stored in agent_artifacts.artifact_type in Supabase.
 */
export const ARTIFACT_TYPES = {
  ICP_DOCUMENT:       'icp_document',
  OUTREACH_SEQUENCE:  'outreach_sequence',
  BATTLE_CARD:        'battle_card',
  GTM_PLAYBOOK:       'gtm_playbook',
  SALES_SCRIPT:       'sales_script',
  BRAND_MESSAGING:    'brand_messaging',
  FINANCIAL_SUMMARY:  'financial_summary',
  LEGAL_CHECKLIST:    'legal_checklist',
  HIRING_PLAN:        'hiring_plan',
  PMF_SURVEY:         'pmf_survey',
  INTERVIEW_NOTES:    'interview_notes',
  COMPETITIVE_MATRIX: 'competitive_matrix',
  STRATEGIC_PLAN:     'strategic_plan',
} as const;

export type ArtifactType = typeof ARTIFACT_TYPES[keyof typeof ARTIFACT_TYPES];

/** All artifact type values as a tuple — useful for runtime validation */
export const ALL_ARTIFACT_TYPES = Object.values(ARTIFACT_TYPES) as ArtifactType[];

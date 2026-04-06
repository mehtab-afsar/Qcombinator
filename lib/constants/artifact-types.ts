/**
 * Canonical artifact type string literals.
 * Use these everywhere instead of inline strings.
 * Values match what is stored in agent_artifacts.artifact_type in Supabase.
 */
export const ARTIFACT_TYPES = {
  // ── Existing ─────────────────────────────────────────────────────────────
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

  // ── Patel (CMO) ───────────────────────────────────────────────────────────
  LEAD_LIST:          'lead_list',
  CAMPAIGN_REPORT:    'campaign_report',
  AB_TEST_RESULT:     'ab_test_result',

  // ── Susi (CRO) ────────────────────────────────────────────────────────────
  CALL_PLAYBOOK:      'call_playbook',
  PIPELINE_REPORT:    'pipeline_report',
  PROPOSAL:           'proposal',
  WIN_LOSS_ANALYSIS:  'win_loss_analysis',

  // ── Maya (Brand Director) ─────────────────────────────────────────────────
  CONTENT_CALENDAR:   'content_calendar',
  SEO_AUDIT:          'seo_audit',
  PRESS_KIT:          'press_kit',
  NEWSLETTER_ISSUE:   'newsletter_issue',
  BRAND_HEALTH_REPORT:'brand_health_report',

  // ── Felix (CFO) ───────────────────────────────────────────────────────────
  FINANCIAL_MODEL:    'financial_model',
  INVESTOR_UPDATE:    'investor_update',
  BOARD_DECK:         'board_deck',
  CAP_TABLE_SUMMARY:  'cap_table_summary',
  FUNDRAISING_NARRATIVE: 'fundraising_narrative',

  // ── Leo (General Counsel) ─────────────────────────────────────────────────
  NDA:                'nda',
  SAFE_NOTE:          'safe_note',
  CONTRACTOR_AGREEMENT: 'contractor_agreement',
  PRIVACY_POLICY:     'privacy_policy',
  IP_AUDIT_REPORT:    'ip_audit_report',
  TERM_SHEET_REDLINE: 'term_sheet_redline',

  // ── Harper (Chief People Officer) ────────────────────────────────────────
  JOB_DESCRIPTION:    'job_description',
  INTERVIEW_SCORECARD:'interview_scorecard',
  OFFER_LETTER:       'offer_letter',
  ONBOARDING_PLAN:    'onboarding_plan',
  COMP_BENCHMARK:     'comp_benchmark_report',

  // ── Nova (CPO Product) ────────────────────────────────────────────────────
  RETENTION_REPORT:   'retention_report',
  PRODUCT_INSIGHT:    'product_insight_report',
  EXPERIMENT_DESIGN:  'experiment_design',
  ROADMAP:            'roadmap',
  USER_PERSONA:       'user_persona',

  // ── Atlas (CSO) ───────────────────────────────────────────────────────────
  COMPETITOR_WEEKLY:  'competitor_weekly',
  MARKET_MAP:         'market_map',
  REVIEW_INTELLIGENCE:'review_intelligence_report',

  // ── Sage (CEO Advisor) ────────────────────────────────────────────────────
  INVESTOR_READINESS_REPORT: 'investor_readiness_report',
  CONTRADICTION_REPORT:      'contradiction_report',
  OKR_HEALTH_REPORT:         'okr_health_report',
  CRISIS_PLAYBOOK:           'crisis_playbook',

  // ── Carter (CCO) — NEW ───────────────────────────────────────────────────
  CUSTOMER_HEALTH_REPORT: 'customer_health_report',
  CHURN_ANALYSIS:         'churn_analysis',
  QBR_DECK:               'qbr_deck',
  EXPANSION_PLAYBOOK:     'expansion_playbook',
  CS_PLAYBOOK:            'cs_playbook',

  // ── Riley (CGO) — NEW ────────────────────────────────────────────────────
  GROWTH_MODEL:       'growth_model',
  PAID_CAMPAIGN:      'paid_campaign',
  REFERRAL_PROGRAM:   'referral_program',
  LAUNCH_PLAYBOOK:    'launch_playbook',
  GROWTH_REPORT:      'growth_report',
  EXPERIMENT_RESULTS: 'experiment_results',
} as const;

export type ArtifactType = typeof ARTIFACT_TYPES[keyof typeof ARTIFACT_TYPES];

/** All artifact type values as a tuple — useful for runtime validation */
export const ALL_ARTIFACT_TYPES = Object.values(ARTIFACT_TYPES) as ArtifactType[];

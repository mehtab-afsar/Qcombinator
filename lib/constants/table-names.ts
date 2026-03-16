/**
 * Canonical Supabase table name constants.
 * Use these everywhere instead of inline strings to prevent drift.
 *
 * Table disambiguation notes:
 * - agent_actions  ≠ agent_activity  (two separate tables)
 *   - agent_actions:  logged tool invocations (lead_enrich, web_research, etc.)
 *   - agent_activity: cross-agent event bus + notification feed
 * - applications:  Harper's job application submissions (NOT job_applications)
 */
export const TABLES = {
  // Agent system
  AGENT_ARTIFACTS:      'agent_artifacts',
  AGENT_CONVERSATIONS:  'agent_conversations',
  AGENT_MESSAGES:       'agent_messages',
  AGENT_ACTIONS:        'agent_actions',        // tool invocations log
  AGENT_ACTIVITY:       'agent_activity',        // cross-agent event bus

  // Q-Score
  QSCORE_HISTORY:       'qscore_history',
  SCORE_EVIDENCE:       'score_evidence',
  RAG_SCORE_CACHE:      'rag_score_cache',
  ARTIFACT_EMBEDDINGS:  'artifact_embeddings',

  // Observability
  RAG_EXECUTION_LOGS:   'rag_execution_logs',
  TOOL_EXECUTION_LOGS:  'tool_execution_logs',

  // Founder / User
  FOUNDER_PROFILES:     'founder_profiles',

  // Investor
  INVESTOR_PROFILES:    'investor_profiles',
  DEMO_INVESTORS:       'demo_investors',
  CONNECTION_REQUESTS:  'connection_requests',

  // Sales / Deals
  DEALS:                'deals',

  // Agent-specific
  APPLICATIONS:         'applications',          // Harper's job applications (not job_applications)
  SURVEY_RESPONSES:     'survey_responses',       // Nova's PMF survey responses
  DEPLOYED_SITES:       'deployed_sites',
  TRACKED_COMPETITORS:  'tracked_competitors',

  // Content
  INVESTOR_UPDATES:     'investor_updates',
} as const;

export type TableName = typeof TABLES[keyof typeof TABLES];

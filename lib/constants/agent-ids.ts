/**
 * Canonical agent ID string literals.
 * Values match what is stored in agent_artifacts.agent_id,
 * agent_conversations.agent_id, and agent_activity.agent_id in Supabase.
 */
export const AGENT_IDS = {
  PATEL:  'patel',
  SUSI:   'susi',
  MAYA:   'maya',
  FELIX:  'felix',
  LEO:    'leo',
  HARPER: 'harper',
  NOVA:   'nova',
  ATLAS:  'atlas',
  SAGE:   'sage',
  CARTER: 'carter',
  RILEY:  'riley',
} as const;

export type AgentId = typeof AGENT_IDS[keyof typeof AGENT_IDS];

/** All agent ID values */
export const ALL_AGENT_IDS = Object.values(AGENT_IDS) as AgentId[];

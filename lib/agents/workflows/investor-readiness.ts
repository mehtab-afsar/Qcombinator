/**
 * Investor Readiness Workflow Definition
 *
 * Pure configuration — no runtime logic.
 *
 * Execution order:
 *   Layer 0 (parallel, no deps):
 *     atlas_competitive_matrix  → competitive_matrix   (required)
 *     felix_financial_summary   → financial_summary    (required)
 *     nova_pmf_survey           → pmf_survey           (optional — can fail gracefully)
 *
 *   Layer 1 (sequential, deps on Layer 0):
 *     patel_gtm_playbook   dependsOn: ['atlas_competitive_matrix']  → gtm_playbook
 *     harper_hiring_plan   dependsOn: ['felix_financial_summary']   → hiring_plan
 *
 *   Synthesis (coordinator, runs last):
 *     sage_strategic_plan  agentId: sage  → strategic_plan
 */

import { AGENT_IDS } from '@/lib/constants/agent-ids';
import type { TaskGraph } from '../coordinator-types';

export const INVESTOR_READINESS_GRAPH: TaskGraph = {
  graphId:             'investor_readiness',
  coordinatorAgentId:  AGENT_IDS.SAGE,
  nodeTimeoutMs:       30_000,
  graphTimeoutMs:      120_000,

  nodes: [
    // ── Layer 0: parallel market + financial + product intelligence ───────────
    {
      nodeId:       'atlas_competitive_matrix',
      agentId:      AGENT_IDS.ATLAS,
      artifactType: 'competitive_matrix',
      dependsOn:    [],
      label:        'Competitive Matrix (Atlas)',
      optional:     false,
      seedContext:  {
        goal: 'Identify the competitive landscape, our whitespace, and positioning for investor review.',
      },
    },
    {
      nodeId:       'felix_financial_summary',
      agentId:      AGENT_IDS.FELIX,
      artifactType: 'financial_summary',
      dependsOn:    [],
      label:        'Financial Summary (Felix)',
      optional:     false,
      seedContext:  {
        goal: 'Summarise key financial metrics: MRR, burn, runway, unit economics — investor-ready format.',
      },
    },
    {
      nodeId:       'nova_pmf_survey',
      agentId:      AGENT_IDS.NOVA,
      artifactType: 'pmf_survey',
      dependsOn:    [],
      label:        'PMF Survey (Nova)',
      optional:     true,
      seedContext:  {
        goal: 'Design a PMF survey that surfaces unmet needs and retention signals for investor diligence.',
      },
    },

    // ── Layer 1: GTM + Hiring informed by Layer 0 handoffs ────────────────────
    {
      nodeId:       'patel_gtm_playbook',
      agentId:      AGENT_IDS.PATEL,
      artifactType: 'gtm_playbook',
      dependsOn:    ['atlas_competitive_matrix'],
      label:        'GTM Playbook (Patel)',
      optional:     false,
      seedContext:  {
        goal: 'Build a 90-day GTM playbook informed by the competitive landscape. Show investors a clear acquisition path.',
      },
    },
    {
      nodeId:       'harper_hiring_plan',
      agentId:      AGENT_IDS.HARPER,
      artifactType: 'hiring_plan',
      dependsOn:    ['felix_financial_summary'],
      label:        'Hiring Plan (Harper)',
      optional:     false,
      seedContext:  {
        goal: 'Create a hiring plan sized to the financial runway. Investors want to see disciplined team-building.',
      },
    },

    // ── Coordinator (Sage) — always last, separated by executeTaskGraph ───────
    {
      nodeId:       'sage_strategic_plan',
      agentId:      AGENT_IDS.SAGE,
      artifactType: 'strategic_plan',
      dependsOn:    [],  // deps ignored — coordinator always runs after all workers
      label:        'Strategic Plan (Sage)',
      optional:     false,
      seedContext:  {
        goal: 'Synthesise all advisor outputs into a unified investor readiness strategic plan. Identify the 3 highest-impact actions for the next 90 days.',
      },
    },
  ],
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const SUPPORTED_WORKFLOW_TYPES = ['investor_readiness'] as const;
export type WorkflowType = typeof SUPPORTED_WORKFLOW_TYPES[number];

export function getWorkflowGraph(workflowType: string): TaskGraph {
  if (workflowType === 'investor_readiness') return INVESTOR_READINESS_GRAPH;
  throw new Error(`Unknown workflow type: "${workflowType}". Supported: ${SUPPORTED_WORKFLOW_TYPES.join(', ')}`);
}

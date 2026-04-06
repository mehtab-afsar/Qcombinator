/**
 * Coordinator / Worker Pattern — Type Layer
 *
 * Pure types only — no runtime code.
 *
 * A TaskGraph is a directed acyclic graph (DAG) of TaskNodes.
 * Nodes with no dependsOn[] run in Layer 0 (parallel).
 * Nodes whose dependsOn[] are satisfied by prior layers run in subsequent layers.
 * The coordinatorAgentId (always Sage) is separated from the layer execution
 * and runs last as a synthesis step.
 *
 * Typed handoffs carry structured context from completed upstream nodes to
 * dependent downstream nodes — replacing free-text context injection.
 */

import type { AgentId } from '@/lib/constants/agent-ids';
import type { ArtifactType } from '@/features/agents/types/agent.types';

// ─── Graph ────────────────────────────────────────────────────────────────────

export interface TaskNode {
  /** Unique ID within the graph, e.g. 'atlas_competitive_matrix' */
  nodeId: string;
  agentId: AgentId;
  artifactType: ArtifactType;
  /** nodeIds that must complete before this node starts (empty = Layer 0) */
  dependsOn: string[];
  /** Human-readable label for logging / result display */
  label: string;
  /** Extra context merged into generationContext before artifact generation */
  seedContext?: Record<string, unknown>;
  /** If true, failure of this node does not block dependent nodes */
  optional?: boolean;
}

export interface TaskGraph {
  graphId: string;
  /** Synthesis agent — always runs last, receives full handoff context */
  coordinatorAgentId: AgentId;
  nodes: TaskNode[];
  /** Per-node timeout in ms */
  nodeTimeoutMs: number;
  /** Total graph execution timeout in ms */
  graphTimeoutMs: number;
}

// ─── Results ─────────────────────────────────────────────────────────────────

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface TaskResult {
  nodeId: string;
  agentId: AgentId;
  artifactType: ArtifactType;
  status: TaskStatus;
  content: Record<string, unknown> | null;
  artifactId: string | null;
  startedAt: string;
  completedAt: string;
  errorMessage?: string;
}

export interface GraphExecutionResult {
  graphId: string;
  userId: string;
  /** 'completed' = all required nodes succeeded; 'partial' = some optional nodes failed; 'failed' = required node(s) failed */
  status: 'completed' | 'partial' | 'failed';
  nodeResults: TaskResult[];
  synthesisResult: TaskResult | null;
  executionMs: number;
  layersCompleted: number;
}

// ─── Typed Handoffs ───────────────────────────────────────────────────────────
// One interface per upstream artifact type that has meaningful downstream consumers.
// Extracted from raw artifact JSON after each node completes.

export interface CompetitiveMatrixHandoff {
  _from: 'competitive_matrix';
  competitiveGaps: string[];
  topCompetitors: string[];
  ourPositioning: string;
  swotThreats: string[];
}

export interface FinancialSummaryHandoff {
  _from: 'financial_summary';
  mrr: string;
  runway: string;
  monthlyBurn: string;
  unitEconomicsVerdict: string;
  /** Derived from burn/runway — e.g. "< $10k/mo budget constraint" */
  budgetConstraintNote: string;
  fundraisingAmount: string;
  fundraisingRationale: string;
}

export interface PmfSurveyHandoff {
  _from: 'pmf_survey';
  pmfSignal: string;
  targetRespondents: string;
  topUnmetNeeds: string[];
}

export interface GtmPlaybookHandoff {
  _from: 'gtm_playbook';
  primaryChannel: string;
  icpSummary: string;
  ninetyDayPhase1: string;
}

export type AgentHandoff =
  | CompetitiveMatrixHandoff
  | FinancialSummaryHandoff
  | PmfSurveyHandoff
  | GtmPlaybookHandoff;

export interface NodeHandoffContext {
  /** Keyed by artifactType of the upstream node */
  upstreamContext: Record<string, AgentHandoff>;
  coordinatorGoal: string;
  founderProfile?: string;
}

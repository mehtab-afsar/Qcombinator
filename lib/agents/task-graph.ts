/**
 * Task Graph Execution Engine
 *
 * Implements the coordinator/worker pattern:
 *   1. buildExecutionLayers — Kahn's topological sort → groups nodes into layers
 *   2. extractHandoff       — pulls typed structs from raw artifact JSON
 *   3. executeTaskGraph     — runs layers in parallel, then Sage synthesis
 *
 * Design principles:
 *   - Layer 0 nodes (no deps) run fully concurrently via Promise.allSettled
 *   - Each layer waits for the previous layer to complete before starting
 *   - Optional nodes can fail without blocking dependent nodes
 *   - Typed handoffs carry structured context (not free-text) to dependents
 *   - routedText('generation', ...) + getArtifactPrompt — same path as generate route
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { routedText } from '@/lib/llm/router';
import { getArtifactPrompt } from '@/features/agents/patel/prompts/artifact-prompts';
import { extractKeyFields } from '@/lib/agents/context-compressor';
import { getFounderProfileContext } from '@/lib/agents/founder-context';
import type {
  TaskNode,
  TaskGraph,
  TaskResult,
  GraphExecutionResult,
  AgentHandoff,
  CompetitiveMatrixHandoff,
  FinancialSummaryHandoff,
  PmfSurveyHandoff,
  GtmPlaybookHandoff,
  NodeHandoffContext,
} from './coordinator-types';

// ─── Layer Builder ────────────────────────────────────────────────────────────

/**
 * Kahn's topological sort — groups nodes into executable layers.
 * Layer 0 = no deps. Layer N = all deps resolved by prior layers.
 * Throws if a cycle is detected.
 */
export function buildExecutionLayers(nodes: TaskNode[]): TaskNode[][] {
  const idToNode = new Map<string, TaskNode>(nodes.map(n => [n.nodeId, n]));
  const inDegree = new Map<string, number>(nodes.map(n => [n.nodeId, 0]));
  const adjReverse = new Map<string, string[]>(nodes.map(n => [n.nodeId, []]));

  // Build in-degree count and reverse adjacency for each node
  for (const node of nodes) {
    for (const dep of node.dependsOn) {
      if (!idToNode.has(dep)) {
        throw new Error(`Task graph error: node "${node.nodeId}" depends on unknown node "${dep}"`);
      }
      inDegree.set(node.nodeId, (inDegree.get(node.nodeId) ?? 0) + 1);
      adjReverse.get(dep)!.push(node.nodeId);
    }
  }

  const layers: TaskNode[][] = [];
  let ready = nodes.filter(n => (inDegree.get(n.nodeId) ?? 0) === 0);

  while (ready.length > 0) {
    layers.push(ready);
    const next: TaskNode[] = [];
    for (const node of ready) {
      for (const dependentId of adjReverse.get(node.nodeId) ?? []) {
        const remaining = (inDegree.get(dependentId) ?? 0) - 1;
        inDegree.set(dependentId, remaining);
        if (remaining === 0) {
          next.push(idToNode.get(dependentId)!);
        }
      }
    }
    ready = next;
  }

  const resolved = layers.flat().length;
  if (resolved !== nodes.length) {
    throw new Error(`Task graph error: cycle detected. ${nodes.length - resolved} node(s) unresolvable.`);
  }

  return layers;
}

// ─── Handoff Extractor ────────────────────────────────────────────────────────

/**
 * Extracts a typed handoff struct from raw artifact content.
 * Returns null if the artifact type has no registered handoff schema.
 */
export function extractHandoff(
  artifactType: string,
  content: Record<string, unknown>,
): AgentHandoff | null {
  switch (artifactType) {
    case 'competitive_matrix': {
      const h: CompetitiveMatrixHandoff = {
        _from: 'competitive_matrix',
        competitiveGaps: asStringArray(content.competitiveGaps ?? content.gaps),
        topCompetitors:  asStringArray(content.topCompetitors ?? content.competitors),
        ourPositioning:  asString(content.ourPositioning ?? content.positioning),
        swotThreats:     asStringArray(content.swotThreats ?? content.threats),
      };
      return h;
    }

    case 'financial_summary': {
      const mrr         = asString(content.mrr ?? content.monthlyRecurringRevenue);
      const monthlyBurn = asString(content.monthlyBurn ?? content.burn);
      const runway      = asString(content.runway ?? content.runwayMonths);
      const burnNum     = parseFloat(monthlyBurn.replace(/[^0-9.]/g, ''));
      const budgetNote  = !isNaN(burnNum) && burnNum > 0
        ? `~$${Math.round(burnNum / 1000)}k/mo burn — budget constraints apply`
        : 'Budget constraint data unavailable';
      const h: FinancialSummaryHandoff = {
        _from: 'financial_summary',
        mrr,
        runway,
        monthlyBurn,
        unitEconomicsVerdict: asString(content.unitEconomicsVerdict ?? content.unitEconomics),
        budgetConstraintNote: budgetNote,
        fundraisingAmount:    asString(content.fundraisingAmount ?? content.targetRaise),
        fundraisingRationale: asString(content.fundraisingRationale ?? content.raiseRationale),
      };
      return h;
    }

    case 'pmf_survey': {
      const h: PmfSurveyHandoff = {
        _from: 'pmf_survey',
        pmfSignal:          asString(content.pmfSignal ?? content.signal),
        targetRespondents:  asString(content.targetRespondents ?? content.respondents),
        topUnmetNeeds:      asStringArray(content.topUnmetNeeds ?? content.unmetNeeds),
      };
      return h;
    }

    case 'gtm_playbook': {
      const h: GtmPlaybookHandoff = {
        _from: 'gtm_playbook',
        primaryChannel: asString(content.primaryChannel ?? content.channel),
        icpSummary:     asString(content.icpSummary ?? content.icp),
        ninetyDayPhase1: asString(content.ninetyDayPhase1 ?? content.phase1 ?? content.firstNinetyDays),
      };
      return h;
    }

    default:
      return null;
  }
}

// ─── Node Executor ────────────────────────────────────────────────────────────

async function executeNode(
  node: TaskNode,
  userId: string,
  supabase: SupabaseClient,
  handoffCtx: NodeHandoffContext,
  deadlineMs: number,
): Promise<TaskResult> {
  const startedAt = new Date().toISOString();

  const makeResult = (
    status: TaskResult['status'],
    content: Record<string, unknown> | null,
    artifactId: string | null,
    errorMessage?: string,
  ): TaskResult => ({
    nodeId:       node.nodeId,
    agentId:      node.agentId,
    artifactType: node.artifactType,
    status,
    content,
    artifactId,
    startedAt,
    completedAt: new Date().toISOString(),
    errorMessage,
  });

  // Abort if graph deadline has already passed
  if (Date.now() >= deadlineMs) {
    return makeResult('skipped', null, null, 'Graph deadline exceeded before node started');
  }

  try {
    // Build generation context — seed context + typed handoff
    const generationContext: Record<string, unknown> = {
      ...(node.seedContext ?? {}),
      coordinatorHandoff: handoffCtx,
    };

    const artifactPrompt = getArtifactPrompt(node.artifactType, generationContext, null);

    const raw = await routedText('generation', [
      { role: 'system', content: artifactPrompt },
      {
        role: 'user',
        content: `Generate the ${node.artifactType.replace(/_/g, ' ')} artifact. Use the coordinator context provided. Return only valid JSON.`,
      },
    ]);

    // Parse — strip markdown fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    let parsedContent: Record<string, unknown>;
    try {
      parsedContent = JSON.parse(cleaned);
    } catch {
      return makeResult('failed', null, null, `JSON parse error: ${cleaned.slice(0, 200)}`);
    }

    // Extract title for artifact record
    const title =
      typeof parsedContent.title === 'string'
        ? parsedContent.title
        : `${node.label} — coordinator`;

    // Persist to agent_artifacts
    const keyFields = extractKeyFields(node.artifactType, parsedContent);
    const { data: insertedRow, error: insertError } = await supabase
      .from('agent_artifacts')
      .insert({
        user_id:       userId,
        agent_id:      node.agentId,
        artifact_type: node.artifactType,
        title,
        content:       parsedContent,
        key_fields:    keyFields,
      })
      .select('id')
      .single();

    if (insertError) {
      return makeResult('failed', parsedContent, null, `DB insert error: ${insertError.message}`);
    }

    return makeResult('completed', parsedContent, insertedRow?.id ?? null);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return makeResult('failed', null, null, msg);
  }
}

// ─── Graph Executor ───────────────────────────────────────────────────────────

/**
 * Executes a TaskGraph:
 *   1. Separates coordinator (Sage) node from worker nodes
 *   2. Groups workers into layers via Kahn's sort
 *   3. Runs each layer concurrently; accumulates typed handoffs
 *   4. Runs coordinator synthesis with full handoff context
 *   5. Returns GraphExecutionResult
 */
export async function executeTaskGraph(
  graph: TaskGraph,
  userId: string,
  supabase: SupabaseClient,
  coordinatorGoal: string,
): Promise<GraphExecutionResult> {
  const startMs      = Date.now();
  const deadlineMs   = startMs + graph.graphTimeoutMs;

  // Separate coordinator from worker nodes
  const coordinatorNode = graph.nodes.find(n => n.agentId === graph.coordinatorAgentId);
  const workerNodes     = graph.nodes.filter(n => n.agentId !== graph.coordinatorAgentId);

  // Fetch founder profile once (parallel with layer building)
  const founderProfile = await getFounderProfileContext(userId, supabase).catch(() => '');

  // Build execution layers
  const layers = buildExecutionLayers(workerNodes);

  const allNodeResults: TaskResult[] = [];
  const handoffMap: Record<string, AgentHandoff> = {};
  let layersCompleted = 0;
  let requiredFailure = false;

  // Execute layers
  for (const layer of layers) {
    if (Date.now() >= deadlineMs) break;

    const handoffCtx: NodeHandoffContext = {
      upstreamContext: { ...handoffMap },
      coordinatorGoal,
      founderProfile,
    };

    const layerPromises = layer.map(node =>
      executeNode(node, userId, supabase, handoffCtx, deadlineMs),
    );

    const settled = await Promise.allSettled(layerPromises);

    for (let i = 0; i < settled.length; i++) {
      const settlement = settled[i];
      const node = layer[i];
      let result: TaskResult;

      if (settlement.status === 'fulfilled') {
        result = settlement.value;
      } else {
        // Unexpected rejection (should be caught inside executeNode, but just in case)
        result = {
          nodeId:       node.nodeId,
          agentId:      node.agentId,
          artifactType: node.artifactType,
          status:       'failed',
          content:      null,
          artifactId:   null,
          startedAt:    new Date().toISOString(),
          completedAt:  new Date().toISOString(),
          errorMessage: `Unexpected error: ${settlement.reason}`,
        };
      }

      allNodeResults.push(result);

      if (result.status === 'completed' && result.content) {
        const handoff = extractHandoff(node.artifactType, result.content);
        if (handoff) handoffMap[node.artifactType] = handoff;
      }

      if (result.status === 'failed' && !node.optional) {
        requiredFailure = true;
      }
    }

    layersCompleted++;
  }

  // Run coordinator synthesis
  let synthesisResult: TaskResult | null = null;

  if (coordinatorNode && !requiredFailure && Date.now() < deadlineMs) {
    const synthesisHandoffCtx: NodeHandoffContext = {
      upstreamContext: { ...handoffMap },
      coordinatorGoal,
      founderProfile,
    };

    // Provide all worker outputs in seedContext for Sage to synthesise
    const workerOutputs: Record<string, unknown> = {};
    for (const r of allNodeResults) {
      if (r.status === 'completed' && r.content) {
        workerOutputs[r.artifactType] = r.content;
      }
    }

    synthesisResult = await executeNode(
      { ...coordinatorNode, seedContext: { ...(coordinatorNode.seedContext ?? {}), workerOutputs } },
      userId,
      supabase,
      synthesisHandoffCtx,
      deadlineMs,
    );
  }

  // Determine overall status
  const hasOptionalFailure = allNodeResults.some(
    r => r.status === 'failed' && workerNodes.find(n => n.nodeId === r.nodeId)?.optional,
  );
  const overallStatus: GraphExecutionResult['status'] =
    requiredFailure ? 'failed'
    : hasOptionalFailure ? 'partial'
    : 'completed';

  return {
    graphId:         graph.graphId,
    userId,
    status:          overallStatus,
    nodeResults:     allNodeResults,
    synthesisResult,
    executionMs:     Date.now() - startMs,
    layersCompleted,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function asString(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v == null) return '';
  return String(v);
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(asString).filter(Boolean);
  if (typeof v === 'string' && v.length > 0) return [v];
  return [];
}

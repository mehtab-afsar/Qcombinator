import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/auth/verify';
import { log } from '@/lib/logger'
import { STALE_AFTER_MS } from '@/lib/rhythm/runs'

interface RhythmRunRow {
  status: string
  started_at: string
  last_step_at: string
  step_count: number | null
}

/**
 * The Operating Rhythm's real run history — whether the executive team's weekly loop is actually
 * happening, not just whether the code that would run it exists. `stalledRunning` reuses
 * STALE_AFTER_MS (lib/rhythm/runs.ts) rather than a second guess at what "stalled" means, so this
 * dashboard and the founder-facing progress badge always agree.
 */
export function aggregateRhythmRuns(rows: RhythmRunRow[], nowMs: number) {
  const byStatus: Record<string, number> = {}
  let stalledRunning = 0
  let stepSum = 0
  let lastRunAt: string | null = null

  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1
    if (row.status === 'running' && nowMs - new Date(row.last_step_at).getTime() > STALE_AFTER_MS) {
      stalledRunning++
    }
    stepSum += row.step_count ?? 0
    if (!lastRunAt || row.started_at > lastRunAt) lastRunAt = row.started_at
  }

  return {
    totalRuns: rows.length,
    byStatus,
    stalledRunning,
    avgStepCount: rows.length > 0 ? Math.round((stepSum / rows.length) * 10) / 10 : 0,
    lastRunAt,
  }
}

interface ActionLogRow {
  status: string
  provider: string | null
  irreversible: boolean
}

/**
 * The real record of Action attempts — internal analyses and, more importantly, the connector
 * sends that reach outside the product. Counts ROWS (append-only, one per status transition —
 * see action_log's own design comment), same convention as every other section in this route
 * (e.g. tools.total counts tool_execution_logs rows, not distinct calls).
 */
export function aggregateActionLog(rows: ActionLogRow[]) {
  const byStatus: Record<string, number> = {}
  const byProvider: Record<string, number> = {}
  let irreversibleCount = 0

  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1
    const provider = row.provider ?? 'internal'
    byProvider[provider] = (byProvider[provider] ?? 0) + 1
    if (row.irreversible) irreversibleCount++
  }

  return {
    total: rows.length,
    byStatus,
    byProvider,
    irreversibleCount,
    internalCount: rows.length - irreversibleCount,
  }
}

interface DocumentOpenRow {
  document_type: 'asset_version' | 'briefing'
  document_id: string
  founder_id: string
  asset_id: string | null
  program_id: string | null
  opened_at: string
}

interface FollowUpAssetVersionRow {
  founder_id: string
  asset_id: string
  authored_by: string
  update_reason: string | null
  created_at: string
}

interface FollowUpActionLogRow {
  founder_id: string
  program_id: string | null
  status: string
  created_at: string
}

/**
 * Did anything happen after a founder opened a document — the follow-up half of "is this
 * landing," not just "was it opened." An asset open counts as followed-up if the SAME founder
 * edited that asset directly (authored_by='founder') or asked the AI to redo it ("Direct the AI"
 * sets update_reason to 'Directed: ...' while keeping authored_by='program' — see
 * lib/rhythm/direct.ts) within the window. A briefing open counts as followed-up if the founder
 * approved or declined an Action on that briefing's program within the window.
 */
export function aggregateDocumentOpens(
  opens: DocumentOpenRow[],
  followUpAssetVersions: FollowUpAssetVersionRow[],
  followUpActionLog: FollowUpActionLogRow[],
  followUpWindowMs: number,
) {
  const byType: Record<string, number> = {}
  const founders = new Set<string>()
  let followedUp = 0

  for (const open of opens) {
    byType[open.document_type] = (byType[open.document_type] ?? 0) + 1
    founders.add(open.founder_id)

    const openedAtMs = new Date(open.opened_at).getTime()
    const withinWindow = (createdAt: string) => {
      const t = new Date(createdAt).getTime()
      return t > openedAtMs && t - openedAtMs <= followUpWindowMs
    }

    const followed = open.document_type === 'asset_version'
      ? followUpAssetVersions.some(v =>
          v.founder_id === open.founder_id
          && v.asset_id === open.asset_id
          && (v.authored_by === 'founder' || (v.update_reason?.startsWith('Directed: ') ?? false))
          && withinWindow(v.created_at))
      // ⚠️ A null program_id correlates with NOTHING. Both columns are nullable
      // (executive_briefings.program_id and action_log.program_id), and `null === null` is true
      // in JS — so without this guard a briefing with no program would count as followed-up by
      // any approved Action that also had no program, silently inflating followUpRate. That is
      // the one number here that a retention decision would actually rest on.
      : open.program_id !== null && followUpActionLog.some(a =>
          a.founder_id === open.founder_id
          && a.program_id === open.program_id
          && (a.status === 'approved' || a.status === 'declined')
          && withinWindow(a.created_at))

    if (followed) followedUp++
  }

  return {
    total: opens.length,
    byType,
    distinctFounders: founders.size,
    followedByAction: followedUp,
    followUpRate: opens.length > 0 ? Math.round((followedUp / opens.length) * 100) : 0,
  }
}

export async function GET() {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const auth = await verifyAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // ── Fetch data ────────────────────────────────────────────────────────────
  try {
  const supabaseAdmin = createAdminClient();

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  // Document-open follow-up correlation looks back further than the other 7-day cards — an
  // open and its follow-up action can genuinely be days apart, and 7 days was judged too
  // narrow a window to call anything "unused" honestly.
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const DOCUMENT_OPEN_FOLLOW_UP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

  const [ragResult, toolResult, qscoreResult, cacheResult, activityResult,
         founderResult, qscoreAllResult, snapshotResult, aiUsageResult,
         rhythmRunResult, actionLogResult,
         documentOpenResult, followUpAssetVersionsResult, followUpActionLogResult] = await Promise.all([
    supabaseAdmin.from('rag_execution_logs').select('*').gte('created_at', since),
    supabaseAdmin.from('tool_execution_logs').select('*').gte('created_at', since),
    supabaseAdmin.from('qscore_history').select('overall_score, data_source, created_at').gte('created_at', since),
    supabaseAdmin.from('rag_score_cache').select('created_at, expires_at').limit(10000),
    supabaseAdmin.from('agent_activity').select('agent_id, action_type, created_at').gte('created_at', since),
    // Beta cohort health
    supabaseAdmin.from('founder_profiles').select(
      'user_id, onboarding_completed, assessment_completed, role, stripe_verified, ' +
      'signal_strength, integrity_index, momentum_score, behavioural_score, visibility_gated, updated_at'
    ).eq('role', 'founder').limit(5000),
    // All-time Q-Score history for percentile calculation (capped to prevent OOM)
    supabaseAdmin.from('qscore_history').select('user_id, overall_score, calculated_at')
      .order('calculated_at', { ascending: false }).limit(5000),
    // Metric snapshots for cohort scorer readiness
    supabaseAdmin.from('founder_metric_snapshots').select('user_id, sector, created_at'),
    // Phase 10 Part 1 — AI Usage/Cost Ledger
    supabaseAdmin.from('ai_usage_log')
      .select('program_id, action_id, asset_id, model, input_tokens, output_tokens, estimated_cost_usd, created_at')
      .gte('created_at', since).limit(20000),
    // The Operating Rhythm's real run history
    supabaseAdmin.from('operating_rhythm_runs')
      .select('status, started_at, completed_at, last_step_at, step_count')
      .gte('started_at', since),
    // The real record of Action attempts — internal analyses and connector sends alike
    supabaseAdmin.from('action_log').select('status, provider, irreversible, created_at').gte('created_at', since),
    // Document/briefing opens (Feature A) — real usage of what the Executive produces, and
    // whether anything followed. See the aggregateDocumentOpens doc comment above.
    supabaseAdmin.from('document_open_events')
      .select('document_type, document_id, founder_id, asset_id, program_id, opened_at')
      .gte('opened_at', since30),
    supabaseAdmin.from('asset_versions')
      .select('founder_id, asset_id, authored_by, update_reason, created_at')
      .gte('created_at', since30),
    supabaseAdmin.from('action_log')
      .select('founder_id, program_id, status, created_at')
      .in('status', ['approved', 'declined'])
      .gte('created_at', since30),
  ]);

  const ragLogs = ragResult.data ?? [];
  const toolLogs = toolResult.data ?? [];
  const qscoreLogs = qscoreResult.data ?? [];
  const cacheRows = cacheResult.data ?? [];
  const activityRows = activityResult.data ?? [];
  type AiUsageRow = {
    program_id: string | null; action_id: string | null; asset_id: string | null
    model: string; input_tokens: number; output_tokens: number; estimated_cost_usd: number | null
  };
  const aiUsageRows = (aiUsageResult.data ?? []) as unknown as AiUsageRow[];
  type FounderRow = { user_id: string; onboarding_completed: boolean; assessment_completed: boolean; stripe_verified: boolean; visibility_gated: boolean; signal_strength: number | null; integrity_index: number | null; momentum_score: number | null; behavioural_score: number | null; updated_at: string | null };
  const founderRows = (founderResult.data ?? []) as unknown as FounderRow[];
  type QScoreAllRow = { user_id: string; overall_score: number | null; calculated_at: string };
  const qscoreAllRows = (qscoreAllResult.data ?? []) as unknown as QScoreAllRow[];
  const snapshotRows = snapshotResult.data ?? [];

  // ── Aggregate RAG metrics ─────────────────────────────────────────────────
  const ragTotal = ragLogs.length;
  const ragByMethod: Record<string, number> = { rag: 0, heuristic: 0, blended: 0 };
  let ragConfidenceSum = 0;
  let ragLatencySum = 0;
  let ragLatencyCount = 0;
  let ragErrors = 0;
  let ragCorroborations = 0;
  let ragConflicts = 0;

  const byDimension: Record<string, { count: number; scoreSum: number }> = {};
  for (const row of ragLogs) {
    ragByMethod[row.scoring_method] = (ragByMethod[row.scoring_method] ?? 0) + 1;
    if (row.rag_confidence != null) ragConfidenceSum += Number(row.rag_confidence);
    if (row.latency_ms != null) { ragLatencySum += row.latency_ms; ragLatencyCount++; }
    if (row.error_msg) ragErrors++;
    if (row.evidence_corroborations > 0) ragCorroborations++;
    if (row.evidence_conflicts > 0) ragConflicts++;
    if (row.dimension && row.final_score != null) {
      if (!byDimension[row.dimension]) byDimension[row.dimension] = { count: 0, scoreSum: 0 };
      byDimension[row.dimension].count++;
      byDimension[row.dimension].scoreSum += Number(row.final_score);
    }
  }
  const avgScoreByDimension = Object.fromEntries(
    Object.entries(byDimension).map(([dim, d]) => [
      dim,
      d.count > 0 ? Math.round(d.scoreSum / d.count) : 0,
    ])
  );

  // ── Aggregate tool metrics ────────────────────────────────────────────────
  const toolTotal = toolLogs.length;
  const toolSuccesses = toolLogs.filter(r => r.status === 'success').length;
  const toolCacheHits = toolLogs.filter(r => r.cache_hit).length;
  let totalCostUsd = 0;
  const byTool: Record<string, { total: number; success: number; latencySum: number; latencyCount: number }> = {};
  const byAgent: Record<string, { total: number; success: number }> = {};

  for (const row of toolLogs) {
    if (!byTool[row.tool_name]) byTool[row.tool_name] = { total: 0, success: 0, latencySum: 0, latencyCount: 0 };
    byTool[row.tool_name].total++;
    if (row.status === 'success') byTool[row.tool_name].success++;
    if (row.latency_ms != null) { byTool[row.tool_name].latencySum += row.latency_ms; byTool[row.tool_name].latencyCount++; }

    if (row.cost_usd) totalCostUsd += Number(row.cost_usd);

    const agentKey = row.agent_id ?? 'unknown';
    if (!byAgent[agentKey]) byAgent[agentKey] = { total: 0, success: 0 };
    byAgent[agentKey].total++;
    if (row.status === 'success') byAgent[agentKey].success++;
  }

  // ── Aggregate Q-Score metrics ─────────────────────────────────────────────
  const scoreTotal = qscoreLogs.length;
  const scoreSum = qscoreLogs.reduce((acc, r) => acc + (r.overall_score ?? 0), 0);
  const bySource: Record<string, number> = {};
  for (const row of qscoreLogs) {
    bySource[row.data_source ?? 'unknown'] = (bySource[row.data_source ?? 'unknown'] ?? 0) + 1;
  }

  // ── Aggregate cache metrics ───────────────────────────────────────────────
  const now = new Date().toISOString();
  const activeEntries = cacheRows.filter(r => r.expires_at > now).length;

  // ── Aggregate activity metrics ────────────────────────────────────────────
  const activityByAgent: Record<string, number> = {};
  for (const row of activityRows) {
    activityByAgent[row.agent_id] = (activityByAgent[row.agent_id] ?? 0) + 1;
  }

  // ── Beta cohort aggregation ───────────────────────────────────────────────
  const totalFounders = founderRows.length;
  const onboardedFounders  = founderRows.filter(f => f.onboarding_completed).length;
  const assessedFounders   = founderRows.filter(f => f.assessment_completed).length;
  const stripeVerified     = founderRows.filter(f => f.stripe_verified).length;
  const visibilityGated    = founderRows.filter(f => f.visibility_gated).length;

  // Active in last 7 days — check updated_at
  const activeFounders = founderRows.filter(f =>
    f.updated_at && f.updated_at >= since
  ).length;

  // Signal strength distribution
  const ssValues  = founderRows.map(f => f.signal_strength).filter((v): v is number => v !== null && v !== undefined);
  const avgSignalStrength  = ssValues.length > 0 ? Math.round(ssValues.reduce((a, b) => a + b, 0) / ssValues.length) : 0;
  const ssHigh   = ssValues.filter(v => v >= 70).length;
  const ssMed    = ssValues.filter(v => v >= 40 && v < 70).length;
  const ssLow    = ssValues.filter(v => v < 40).length;

  // Integrity index distribution
  const iiValues  = founderRows.map(f => f.integrity_index).filter((v): v is number => v !== null && v !== undefined);
  const avgIntegrityIndex  = iiValues.length > 0 ? Math.round(iiValues.reduce((a, b) => a + b, 0) / iiValues.length) : 0;

  // Momentum score breakdown
  const momentumValues = founderRows.map(f => f.momentum_score).filter((v): v is number => v !== null && v !== undefined);
  const momentumHot    = momentumValues.filter(v => v >= 10).length;
  const momentumRising = momentumValues.filter(v => v >= 4 && v < 10).length;
  const momentumSteady = momentumValues.filter(v => v >= -3 && v < 4).length;
  const momentumFalling = momentumValues.filter(v => v < -3).length;
  const avgMomentum    = momentumValues.length > 0 ? Math.round(momentumValues.reduce((a, b) => a + b, 0) / momentumValues.length) : 0;

  // Behavioural score
  const bhValues = founderRows.map(f => f.behavioural_score).filter((v): v is number => v !== null && v !== undefined);
  const avgBehaviouralScore = bhValues.length > 0 ? Math.round(bhValues.reduce((a, b) => a + b, 0) / bhValues.length) : 0;

  // Cohort scorer readiness
  const uniqueSnapshotUsers = new Set(snapshotRows.map(r => r.user_id)).size;
  const snapshotsBySector: Record<string, number> = {};
  for (const row of snapshotRows) {
    snapshotsBySector[row.sector ?? 'unknown'] = (snapshotsBySector[row.sector ?? 'unknown'] ?? 0) + 1;
  }

  // All-time Q-Score distribution (latest per user)
  const latestScoreByUser = new Map<string, number>();
  for (const row of qscoreAllRows) {
    if (!latestScoreByUser.has(row.user_id)) {
      latestScoreByUser.set(row.user_id, row.overall_score ?? 0);
    }
  }
  const allScores = Array.from(latestScoreByUser.values());
  const avgAllTimeScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
  const scoreDistribution = {
    excellent: allScores.filter(s => s >= 80).length,
    good:      allScores.filter(s => s >= 65 && s < 80).length,
    fair:      allScores.filter(s => s >= 50 && s < 65).length,
    poor:      allScores.filter(s => s < 50).length,
  };

  // ── Aggregate AI usage/cost metrics (Phase 10 Part 1) ─────────────────────
  const aiUsageTotal = aiUsageRows.length;
  let aiInputTokens = 0, aiOutputTokens = 0, aiCostUsd = 0;
  const aiByProgram: Record<string, { calls: number; inputTokens: number; outputTokens: number; costUsd: number }> = {};
  const aiByAction: Record<string, { calls: number; inputTokens: number; outputTokens: number; costUsd: number }> = {};
  for (const row of aiUsageRows) {
    aiInputTokens += row.input_tokens;
    aiOutputTokens += row.output_tokens;
    aiCostUsd += Number(row.estimated_cost_usd ?? 0);

    const programKey = row.program_id ?? 'unattributed';
    if (!aiByProgram[programKey]) aiByProgram[programKey] = { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    aiByProgram[programKey].calls++;
    aiByProgram[programKey].inputTokens += row.input_tokens;
    aiByProgram[programKey].outputTokens += row.output_tokens;
    aiByProgram[programKey].costUsd += Number(row.estimated_cost_usd ?? 0);

    const actionKey = row.action_id ?? row.asset_id ?? 'unattributed';
    if (!aiByAction[actionKey]) aiByAction[actionKey] = { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    aiByAction[actionKey].calls++;
    aiByAction[actionKey].inputTokens += row.input_tokens;
    aiByAction[actionKey].outputTokens += row.output_tokens;
    aiByAction[actionKey].costUsd += Number(row.estimated_cost_usd ?? 0);
  }

  // ── Aggregate rhythm-run and action-log metrics ───────────────────────────
  const rhythmMetrics = aggregateRhythmRuns((rhythmRunResult.data ?? []) as RhythmRunRow[], Date.now())
  const actionMetrics = aggregateActionLog((actionLogResult.data ?? []) as ActionLogRow[])
  const documentOpenMetrics = aggregateDocumentOpens(
    (documentOpenResult.data ?? []) as DocumentOpenRow[],
    (followUpAssetVersionsResult.data ?? []) as FollowUpAssetVersionRow[],
    (followUpActionLogResult.data ?? []) as FollowUpActionLogRow[],
    DOCUMENT_OPEN_FOLLOW_UP_WINDOW_MS,
  )

  // ── Build response ────────────────────────────────────────────────────────
  return NextResponse.json({
    rag: {
      total: ragTotal,
      byMethod: ragByMethod,
      avgConfidence: ragTotal > 0 ? Math.round((ragConfidenceSum / ragTotal) * 1000) / 1000 : 0,
      avgLatencyMs: ragLatencyCount > 0 ? Math.round(ragLatencySum / ragLatencyCount) : 0,
      errorRate: ragTotal > 0 ? Math.round((ragErrors / ragTotal) * 100) : 0,
      corroborationRate: ragTotal > 0 ? Math.round((ragCorroborations / ragTotal) * 100) : 0,
      conflictRate: ragTotal > 0 ? Math.round((ragConflicts / ragTotal) * 100) : 0,
      avgScoreByDimension,
    },
    tools: {
      total: toolTotal,
      successRate: toolTotal > 0 ? Math.round((toolSuccesses / toolTotal) * 100) : 0,
      cacheHitRate: toolTotal > 0 ? Math.round((toolCacheHits / toolTotal) * 100) : 0,
      totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
      byTool: Object.fromEntries(
        Object.entries(byTool).map(([name, d]) => [name, {
          total: d.total,
          success: d.success,
          avgLatencyMs: d.latencyCount > 0 ? Math.round(d.latencySum / d.latencyCount) : 0,
        }])
      ),
      byAgent: Object.fromEntries(
        Object.entries(byAgent).map(([id, d]) => [id, {
          total: d.total,
          successRate: d.total > 0 ? Math.round((d.success / d.total) * 100) : 0,
        }])
      ),
    },
    scores: {
      total: scoreTotal,
      avgScore: scoreTotal > 0 ? Math.round(scoreSum / scoreTotal) : 0,
      bySource,
    },
    cache: {
      totalEntries: cacheRows.length,
      activeEntries,
    },
    activity: {
      totalEvents: activityRows.length,
      byAgent: activityByAgent,
    },
    rhythm: { windowDays: 7, ...rhythmMetrics },
    actions: { windowDays: 7, ...actionMetrics },
    documentOpens: { windowDays: 30, followUpWindowDays: 7, ...documentOpenMetrics },
    aiUsage: {
      windowDays: 7,
      totalCalls: aiUsageTotal,
      totalInputTokens: aiInputTokens,
      totalOutputTokens: aiOutputTokens,
      totalCostUsd: Math.round(aiCostUsd * 1_000_000) / 1_000_000,
      byProgram: aiByProgram,
      byAction: aiByAction,
    },
    beta: {
      // Founder funnel
      totalFounders,
      onboardedFounders,
      assessedFounders,
      activeFounders,
      stripeVerified,
      visibilityGated,
      // Signal health
      avgSignalStrength,
      signalDistribution: { high: ssHigh, medium: ssMed, low: ssLow },
      avgIntegrityIndex,
      // Momentum
      avgMomentum,
      momentumDistribution: { hot: momentumHot, rising: momentumRising, steady: momentumSteady, falling: momentumFalling },
      avgBehaviouralScore,
      // Cohort scorer readiness
      cohortSnapshots: uniqueSnapshotUsers,
      cohortActivationThreshold: 100,
      cohortReady: uniqueSnapshotUsers >= 100,
      snapshotsBySector,
      // Q-Score health (all-time)
      totalScoredFounders: latestScoreByUser.size,
      avgAllTimeScore,
      scoreDistribution,
    },
  });
  } catch (err) {
    log.error('[Admin metrics] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

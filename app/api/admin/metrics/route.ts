import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET() {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);

  if (!user || !adminEmails.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Fetch data ────────────────────────────────────────────────────────────
  try {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  );

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [ragResult, toolResult, qscoreResult, cacheResult, activityResult,
         founderResult, qscoreAllResult, snapshotResult] = await Promise.all([
    supabaseAdmin.from('rag_execution_logs').select('*').gte('created_at', since),
    supabaseAdmin.from('tool_execution_logs').select('*').gte('created_at', since),
    supabaseAdmin.from('qscore_history').select('overall_score, data_source, created_at').gte('created_at', since),
    supabaseAdmin.from('rag_score_cache').select('created_at, expires_at'),
    supabaseAdmin.from('agent_activity').select('agent_id, action_type, created_at').gte('created_at', since),
    // Beta cohort health
    supabaseAdmin.from('founder_profiles').select(
      'user_id, onboarding_completed, assessment_completed, role, stripe_verified, ' +
      'signal_strength, integrity_index, momentum_score, behavioural_score, visibility_gated, updated_at'
    ).eq('role', 'founder'),
    // All-time Q-Score history for percentile calculation
    supabaseAdmin.from('qscore_history').select('user_id, overall_score, calculated_at')
      .order('calculated_at', { ascending: false }),
    // Metric snapshots for cohort scorer readiness
    supabaseAdmin.from('founder_metric_snapshots').select('user_id, sector, created_at'),
  ]);

  const ragLogs = ragResult.data ?? [];
  const toolLogs = toolResult.data ?? [];
  const qscoreLogs = qscoreResult.data ?? [];
  const cacheRows = cacheResult.data ?? [];
  const activityRows = activityResult.data ?? [];
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
    console.error('[Admin metrics] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

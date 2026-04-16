'use client';

import { useEffect, useState } from 'react';
import { bg, surf, bdr, ink, muted, blue, green, amber, red } from '@/lib/constants/colors'

interface RagMetrics {
  total: number;
  byMethod: Record<string, number>;
  avgConfidence: number;
  avgLatencyMs: number;
  errorRate: number;
  corroborationRate: number;
  conflictRate: number;
  avgScoreByDimension?: Record<string, number>;
}

interface ToolMetrics {
  total: number;
  successRate: number;
  cacheHitRate?: number;
  totalCostUsd?: number;
  byTool: Record<string, { total: number; success: number; avgLatencyMs: number }>;
  byAgent: Record<string, { total: number; successRate: number }>;
}

interface ScoreMetrics {
  total: number;
  avgScore: number;
  bySource: Record<string, number>;
}

interface CacheMetrics {
  totalEntries: number;
  activeEntries: number;
}

interface ActivityMetrics {
  totalEvents: number;
  byAgent: Record<string, number>;
}

interface BetaMetrics {
  totalFounders: number;
  onboardedFounders: number;
  assessedFounders: number;
  activeFounders: number;
  stripeVerified: number;
  visibilityGated: number;
  avgSignalStrength: number;
  signalDistribution: { high: number; medium: number; low: number };
  avgIntegrityIndex: number;
  avgMomentum: number;
  momentumDistribution: { hot: number; rising: number; steady: number; falling: number };
  avgBehaviouralScore: number;
  cohortSnapshots: number;
  cohortActivationThreshold: number;
  cohortReady: boolean;
  snapshotsBySector: Record<string, number>;
  totalScoredFounders: number;
  avgAllTimeScore: number;
  scoreDistribution: { excellent: number; good: number; fair: number; poor: number };
}

interface AdminMetrics {
  rag: RagMetrics;
  tools: ToolMetrics;
  scores: ScoreMetrics;
  cache: CacheMetrics;
  activity: ActivityMetrics;
  beta: BetaMetrics;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: 24 }}>
      <h2 style={{ color: ink, fontSize: 15, fontWeight: 600, marginBottom: 16 }}>{title}</h2>
      {children}
    </div>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string | number; highlight?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${bdr}` }}>
      <span style={{ color: muted, fontSize: 13 }}>{label}</span>
      <span style={{ color: highlight ?? ink, fontSize: 13, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const color = value >= 0.6 ? green : value >= 0.3 ? amber : red;
  return (
    <span style={{ background: color + '20', color, border: `1px solid ${color}`, borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>
      {value.toFixed(3)}
    </span>
  );
}

function BarSegment({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: muted, fontSize: 12 }}>{label}</span>
        <span style={{ color: ink, fontSize: 12, fontWeight: 600 }}>{count} ({pct}%)</span>
      </div>
      <div style={{ height: 6, background: bdr, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}

export default function AdminMetricsPage() {
  const [data, setData] = useState<AdminMetrics | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/metrics')
      .then(r => {
        if (r.status === 403) { setForbidden(true); return null; }
        return r.json();
      })
      .then(d => { if (d) setData(d); })
      .finally(() => setLoading(false));
  }, []);

  if (forbidden) {
    return (
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <h1 style={{ color: ink, fontSize: 20, fontWeight: 700 }}>Admin access required</h1>
          <p style={{ color: muted, fontSize: 14, marginTop: 8 }}>Your email is not in the ADMIN_EMAILS allowlist.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: muted }}>Loading metrics…</p>
      </div>
    );
  }

  if (!data) return null;

  const { rag, tools, scores, cache, activity, beta } = data;
  const ragMethodTotal = Object.values(rag.byMethod).reduce((a, b) => a + b, 0);
  const toolsByTotalDesc = Object.entries(tools.byTool).sort((a, b) => b[1].total - a[1].total);
  const topAgent = Object.entries(activity.byAgent).sort((a, b) => b[1] - a[1])[0];
  const cacheHitRate = cache.totalEntries > 0 ? Math.round((cache.activeEntries / cache.totalEntries) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: '32px 24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: ink, fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Observability Dashboard</h1>
          <p style={{ color: muted, fontSize: 14 }}>Last 7 days · Admin only · <a href="/admin/qscore/thresholds" style={{ color: blue }}>Thresholds</a> · <a href="/admin/iq/config" style={{ color: blue }}>IQ Config</a></p>
        </div>

        {/* Beta health summary strip */}
        {beta && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
            {[
              { label: 'Founders', value: beta.totalFounders, color: ink },
              { label: 'Assessed', value: beta.assessedFounders, color: green },
              { label: 'Active 7d', value: beta.activeFounders, color: blue },
              { label: 'Stripe verified', value: beta.stripeVerified, color: '#059669' },
              { label: 'Gated', value: beta.visibilityGated, color: red },
              { label: 'Avg Q-Score', value: beta.avgAllTimeScore, color: beta.avgAllTimeScore >= 65 ? green : amber },
              { label: 'Avg Signal', value: beta.avgSignalStrength, color: beta.avgSignalStrength >= 70 ? green : amber },
              { label: 'Cohort', value: `${beta.cohortSnapshots}/${beta.cohortActivationThreshold}`, color: beta.cohortReady ? green : muted },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: '12px 18px', minWidth: 100 }}>
                <div style={{ color: muted, fontSize: 11, marginBottom: 4 }}>{label}</div>
                <div style={{ color, fontSize: 22, fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>

          {/* Card 1 — RAG Health */}
          <Card title="RAG Health">
            <div style={{ marginBottom: 16 }}>
              <BarSegment label="RAG" count={rag.byMethod.rag ?? 0} total={ragMethodTotal} color={blue} />
              <BarSegment label="Blended" count={rag.byMethod.blended ?? 0} total={ragMethodTotal} color={amber} />
              <BarSegment label="Heuristic" count={rag.byMethod.heuristic ?? 0} total={ragMethodTotal} color={muted} />
            </div>
            <StatRow label="Total runs" value={rag.total} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${bdr}` }}>
              <span style={{ color: muted, fontSize: 13 }}>Avg confidence</span>
              <ConfidenceBadge value={rag.avgConfidence} />
            </div>
            <StatRow label="Avg latency" value={`${rag.avgLatencyMs} ms`} />
            <StatRow label="Error rate" value={`${rag.errorRate}%`} highlight={rag.errorRate > 5 ? red : green} />
            <StatRow label="Corroboration rate" value={`${rag.corroborationRate}%`} highlight={green} />
            <StatRow label="Conflict rate" value={`${rag.conflictRate}%`} highlight={rag.conflictRate > 20 ? amber : undefined} />
            {rag.avgScoreByDimension && Object.keys(rag.avgScoreByDimension).length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8, fontWeight: 600 }}>Avg score by dimension</p>
                {Object.entries(rag.avgScoreByDimension).sort((a,b) => b[1]-a[1]).map(([dim, score]) => (
                  <div key={dim} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12 }}>
                    <span style={{ color: muted, textTransform: 'capitalize' }}>{dim}</span>
                    <span style={{ color: score >= 70 ? green : score >= 50 ? amber : red, fontWeight: 600 }}>{score}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Card 2 — Tool Success */}
          <Card title="Tool Success">
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: tools.successRate >= 90 ? green : tools.successRate >= 70 ? amber : red }}>
                {tools.successRate}%
              </span>
              <span style={{ color: muted, fontSize: 13 }}>success · {tools.total} total</span>
            </div>
            {tools.cacheHitRate !== undefined && (
              <StatRow label="Cache hit rate" value={`${tools.cacheHitRate}%`} highlight={tools.cacheHitRate >= 30 ? green : undefined} />
            )}
            {tools.totalCostUsd !== undefined && (
              <StatRow label="Est. total cost (7d)" value={`$${tools.totalCostUsd.toFixed(4)}`} />
            )}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Tool', 'Total', 'Success%', 'Avg ms'].map(h => (
                      <th key={h} style={{ textAlign: 'left', color: muted, padding: '4px 6px', borderBottom: `1px solid ${bdr}`, fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {toolsByTotalDesc.map(([name, d]) => {
                    const successPct = d.total > 0 ? Math.round((d.success / d.total) * 100) : 0;
                    return (
                      <tr key={name}>
                        <td style={{ padding: '4px 6px', color: ink }}>{name}</td>
                        <td style={{ padding: '4px 6px', color: ink }}>{d.total}</td>
                        <td style={{ padding: '4px 6px', color: successPct < 95 ? red : green, fontWeight: 600 }}>{successPct}%</td>
                        <td style={{ padding: '4px 6px', color: muted }}>{d.avgLatencyMs}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Card 3 — Agent Activity */}
          <Card title="Agent Activity (7d)">
            {topAgent && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: blue + '10', border: `1px solid ${blue}30`, borderRadius: 8 }}>
                <div style={{ color: muted, fontSize: 11, marginBottom: 2 }}>Most active</div>
                <div style={{ color: blue, fontWeight: 700, fontSize: 15 }}>{topAgent[0]}</div>
                <div style={{ color: muted, fontSize: 12 }}>{topAgent[1]} events</div>
              </div>
            )}
            <StatRow label="Total events" value={activity.totalEvents} />
            <div style={{ marginTop: 12 }}>
              {Object.entries(activity.byAgent)
                .sort((a, b) => b[1] - a[1])
                .map(([agentId, count]) => (
                  <BarSegment key={agentId} label={agentId} count={count} total={activity.totalEvents} color={blue} />
                ))}
            </div>
          </Card>

          {/* Card 4 — Q-Score Velocity */}
          <Card title="Q-Score Velocity">
            <div style={{ marginBottom: 16, display: 'flex', gap: 24 }}>
              <div>
                <div style={{ color: muted, fontSize: 11 }}>Assessments</div>
                <div style={{ color: ink, fontSize: 28, fontWeight: 700 }}>{scores.total}</div>
              </div>
              <div>
                <div style={{ color: muted, fontSize: 11 }}>Avg score</div>
                <div style={{ color: scores.avgScore >= 70 ? green : scores.avgScore >= 50 ? amber : red, fontSize: 28, fontWeight: 700 }}>{scores.avgScore}</div>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              {Object.entries(scores.bySource).map(([source, count]) => (
                <StatRow key={source} label={source} value={count} />
              ))}
            </div>
          </Card>

          {/* Card 5 — Cache Health */}
          <Card title="Cache Health">
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: cacheHitRate >= 50 ? green : amber }}>{cacheHitRate}%</span>
                <span style={{ color: muted, fontSize: 13 }}>active entries</span>
              </div>
              <div style={{ height: 8, background: bdr, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${cacheHitRate}%`, height: '100%', background: cacheHitRate >= 50 ? green : amber, borderRadius: 4 }} />
              </div>
            </div>
            <StatRow label="Total entries" value={cache.totalEntries} />
            <StatRow label="Active (not expired)" value={cache.activeEntries} highlight={green} />
            <StatRow label="Expired" value={cache.totalEntries - cache.activeEntries} highlight={muted} />
          </Card>

          {/* Card 6 — Beta Founder Funnel */}
          {beta && (
            <Card title="Beta Founder Funnel">
              <div style={{ marginBottom: 16 }}>
                {/* Funnel bar */}
                {[
                  { label: 'Registered', count: beta.totalFounders, color: muted },
                  { label: 'Onboarded', count: beta.onboardedFounders, color: blue },
                  { label: 'Assessed', count: beta.assessedFounders, color: green },
                  { label: 'Active (7d)', count: beta.activeFounders, color: '#9333EA' },
                  { label: 'Stripe verified', count: beta.stripeVerified, color: '#059669' },
                ].map(({ label, count, color }) => (
                  <BarSegment key={label} label={label} count={count} total={beta.totalFounders} color={color} />
                ))}
              </div>
              <StatRow
                label="Visibility gated"
                value={`${beta.visibilityGated} / ${beta.totalFounders}`}
                highlight={beta.visibilityGated > 0 ? red : green}
              />
              <StatRow
                label="Onboarding conversion"
                value={`${beta.totalFounders > 0 ? Math.round((beta.onboardedFounders / beta.totalFounders) * 100) : 0}%`}
                highlight={blue}
              />
              <StatRow
                label="Assessment completion"
                value={`${beta.onboardedFounders > 0 ? Math.round((beta.assessedFounders / beta.onboardedFounders) * 100) : 0}%`}
                highlight={green}
              />
            </Card>
          )}

          {/* Card 7 — Signal Health */}
          {beta && (
            <Card title="Signal & Integrity Health">
              <div style={{ marginBottom: 16, display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ color: muted, fontSize: 11 }}>Avg Signal</div>
                  <div style={{ color: beta.avgSignalStrength >= 70 ? green : beta.avgSignalStrength >= 40 ? amber : red, fontSize: 28, fontWeight: 700 }}>
                    {beta.avgSignalStrength}
                  </div>
                </div>
                <div>
                  <div style={{ color: muted, fontSize: 11 }}>Avg Integrity</div>
                  <div style={{ color: beta.avgIntegrityIndex >= 70 ? green : beta.avgIntegrityIndex >= 50 ? amber : red, fontSize: 28, fontWeight: 700 }}>
                    {beta.avgIntegrityIndex}
                  </div>
                </div>
                <div>
                  <div style={{ color: muted, fontSize: 11 }}>Avg Behaviour</div>
                  <div style={{ color: beta.avgBehaviouralScore >= 60 ? green : beta.avgBehaviouralScore >= 40 ? amber : red, fontSize: 28, fontWeight: 700 }}>
                    {beta.avgBehaviouralScore}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 8 }}>Signal Distribution</p>
              <BarSegment label="High (≥70)" count={beta.signalDistribution.high} total={beta.totalFounders} color={green} />
              <BarSegment label="Medium (40-70)" count={beta.signalDistribution.medium} total={beta.totalFounders} color={amber} />
              <BarSegment label="Low (<40)" count={beta.signalDistribution.low} total={beta.totalFounders} color={red} />
            </Card>
          )}

          {/* Card 8 — Momentum Distribution */}
          {beta && (
            <Card title="Momentum & Score Health">
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 8 }}>Momentum</p>
                <BarSegment label="🔥 Hot (≥10)" count={beta.momentumDistribution.hot} total={beta.totalFounders} color={red} />
                <BarSegment label="↑ Rising (4-10)" count={beta.momentumDistribution.rising} total={beta.totalFounders} color={green} />
                <BarSegment label="→ Steady (-3 to 4)" count={beta.momentumDistribution.steady} total={beta.totalFounders} color={blue} />
                <BarSegment label="↓ Falling (<-3)" count={beta.momentumDistribution.falling} total={beta.totalFounders} color={muted} />
              </div>
              <StatRow label="Avg momentum" value={`${beta.avgMomentum > 0 ? '+' : ''}${beta.avgMomentum}`} highlight={beta.avgMomentum >= 4 ? green : beta.avgMomentum <= -3 ? red : undefined} />
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 8 }}>All-time Q-Score</p>
                <StatRow label="Total scored founders" value={beta.totalScoredFounders} />
                <StatRow label="Avg score" value={beta.avgAllTimeScore} highlight={beta.avgAllTimeScore >= 65 ? green : beta.avgAllTimeScore >= 50 ? amber : red} />
                <BarSegment label="Excellent (≥80)" count={beta.scoreDistribution.excellent} total={beta.totalScoredFounders} color={green} />
                <BarSegment label="Good (65-80)" count={beta.scoreDistribution.good} total={beta.totalScoredFounders} color={blue} />
                <BarSegment label="Fair (50-65)" count={beta.scoreDistribution.fair} total={beta.totalScoredFounders} color={amber} />
                <BarSegment label="Needs work (<50)" count={beta.scoreDistribution.poor} total={beta.totalScoredFounders} color={red} />
              </div>
            </Card>
          )}

          {/* Card 9 — Cohort Scorer Readiness */}
          {beta && (
            <Card title="Cohort Scorer Readiness">
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 28, fontWeight: 700,
                    color: beta.cohortReady ? green : beta.cohortSnapshots >= 50 ? amber : red,
                  }}>
                    {beta.cohortSnapshots}
                  </span>
                  <span style={{ color: muted, fontSize: 13 }}>/ {beta.cohortActivationThreshold} to activate</span>
                </div>
                <div style={{ height: 10, background: bdr, borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, Math.round((beta.cohortSnapshots / beta.cohortActivationThreshold) * 100))}%`,
                    height: '100%',
                    background: beta.cohortReady ? green : beta.cohortSnapshots >= 50 ? amber : blue,
                    borderRadius: 5,
                    transition: 'width 0.3s',
                  }} />
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: beta.cohortReady ? green : muted, fontWeight: 600 }}>
                  {beta.cohortReady
                    ? '✓ Cohort percentile scoring is ACTIVE'
                    : `${beta.cohortActivationThreshold - beta.cohortSnapshots} more assessments needed`}
                </div>
              </div>
              <p style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 8 }}>Snapshots by Sector</p>
              {Object.entries(beta.snapshotsBySector)
                .sort((a, b) => b[1] - a[1])
                .map(([sector, count]) => (
                  <StatRow key={sector} label={sector} value={count} />
                ))}
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}

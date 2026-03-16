'use client';

import { useEffect, useState } from 'react';

const bg = '#F9F7F2';
const surf = '#F0EDE6';
const bdr = '#E2DDD5';
const ink = '#18160F';
const muted = '#8A867C';
const blue = '#2563EB';
const green = '#16A34A';
const amber = '#D97706';
const red = '#DC2626';

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

interface AdminMetrics {
  rag: RagMetrics;
  tools: ToolMetrics;
  scores: ScoreMetrics;
  cache: CacheMetrics;
  activity: ActivityMetrics;
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

  const { rag, tools, scores, cache, activity } = data;
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
          <p style={{ color: muted, fontSize: 14 }}>Last 7 days · Admin only</p>
        </div>

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

        </div>
      </div>
    </div>
  );
}

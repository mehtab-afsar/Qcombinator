import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = '#F9F7F2';
const surf  = '#F0EDE6';
const bdr   = '#E2DDD5';
const ink   = '#18160F';
const muted = '#8A867C';
const blue  = '#2563EB';
const _green = '#16A34A';
const amber = '#D97706';
const red   = '#DC2626';

function scoreColor(s: number) {
  if (s >= 70) return blue;
  if (s >= 50) return amber;
  return red;
}

const DIMENSION_LABELS: Record<string, string> = {
  market:    'Market',
  product:   'Product',
  gtm:       'GTM',
  financial: 'Financial',
  team:      'Team',
  traction:  'Traction',
};

// ─── page ─────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PublicPortfolioPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch founder profile
  const { data: profile } = await supabase
    .from('founder_profiles')
    .select('*')
    .eq('public_slug', slug)
    .eq('is_public', true)
    .single();

  if (!profile) notFound();

  // Fetch latest Q-Score
  const { data: qscoreRow } = await supabase
    .from('qscore_history')
    .select('overall_score, market_score, product_score, gtm_score, financial_score, team_score, traction_score, created_at')
    .eq('user_id', profile.user_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Fetch public artifacts (titles only — no content exposed)
  const { data: artifacts } = await supabase
    .from('agent_artifacts')
    .select('id, agent_id, artifact_type, title, created_at')
    .eq('user_id', profile.user_id)
    .order('created_at', { ascending: false });

  const overall = qscoreRow?.overall_score ?? 0;
  const dimensions = qscoreRow ? {
    market:    qscoreRow.market_score    ?? 0,
    product:   qscoreRow.product_score   ?? 0,
    gtm:       qscoreRow.gtm_score       ?? 0,
    financial: qscoreRow.financial_score ?? 0,
    team:      qscoreRow.team_score      ?? 0,
    traction:  qscoreRow.traction_score  ?? 0,
  } : null;

  const circumference = 2 * Math.PI * 52;
  const dash = circumference * (1 - overall / 100);

  const companyName = profile.startup_name as string | null ?? 'Stealth Startup';
  const oneLiner    = profile.description  as string | null ?? '';
  const industry    = profile.industry     as string | null ?? '';
  const stage       = profile.stage        as string | null ?? '';

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'system-ui, sans-serif', color: ink }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: `1px solid ${bdr}`, padding: '16px 32px', background: '#FFFFFF' }}>
        <p style={{ fontSize: 12, color: muted, margin: 0 }}>Edge Alpha · Founder Portfolio</p>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* ── Company header ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div style={{
              width: 64, height: 64, borderRadius: 16, flexShrink: 0,
              background: surf, border: `1px solid ${bdr}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 700, color: muted,
            }}>
              {companyName[0]?.toUpperCase() ?? 'S'}
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: ink, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                {companyName}
              </h1>
              {oneLiner && (
                <p style={{ fontSize: 14, color: muted, margin: '0 0 12px', lineHeight: 1.6 }}>
                  {oneLiner}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {industry && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: surf, color: muted, border: `1px solid ${bdr}` }}>
                    {industry}
                  </span>
                )}
                {stage && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: '#EFF6FF', color: blue, border: `1px solid ${blue}22` }}>
                    {stage}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Q-Score ring + dimensions ────────────────────────────────────── */}
        {qscoreRow && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 48,
          }}>
            {/* Ring */}
            <div style={{
              background: '#FFFFFF', border: `1px solid ${bdr}`, borderRadius: 20, padding: '32px 24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: muted, fontWeight: 600, marginBottom: 20 }}>
                Investment Readiness
              </p>
              <svg width={140} height={140} viewBox="0 0 140 140" style={{ display: 'block', marginBottom: 16 }}>
                <circle cx={70} cy={70} r={52} fill="none" stroke={bdr} strokeWidth={10} />
                <circle
                  cx={70} cy={70} r={52} fill="none"
                  stroke={scoreColor(overall)} strokeWidth={10}
                  strokeDasharray={circumference}
                  strokeDashoffset={dash}
                  strokeLinecap="round"
                  transform="rotate(-90 70 70)"
                />
                <text x={70} y={65} textAnchor="middle" fill={ink} fontSize={28} fontWeight={300} fontFamily="system-ui, sans-serif">
                  {overall}
                </text>
                <text x={70} y={84} textAnchor="middle" fill={muted} fontSize={11} fontFamily="system-ui, sans-serif">
                  Q-Score
                </text>
              </svg>
            </div>

            {/* Dimensions */}
            {dimensions && (
              <div style={{
                background: surf, border: `1px solid ${bdr}`, borderRadius: 20, padding: '24px',
              }}>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: muted, fontWeight: 600, marginBottom: 18 }}>
                  Dimensions
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {Object.entries(dimensions).map(([key, score]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 64, fontSize: 11, color: muted, textAlign: 'right', flexShrink: 0 }}>
                        {DIMENSION_LABELS[key] ?? key}
                      </span>
                      <div style={{ flex: 1, height: 5, background: bdr, borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${score}%`,
                          background: scoreColor(score), borderRadius: 999,
                        }} />
                      </div>
                      <span style={{ width: 24, fontSize: 12, fontWeight: 600, color: ink, fontFamily: 'monospace', textAlign: 'right', flexShrink: 0 }}>
                        {score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── What they've built ──────────────────────────────────────────── */}
        {artifacts && artifacts.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: muted, fontWeight: 600, marginBottom: 16 }}>
              Strategy Deliverables ({artifacts.length})
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {artifacts.map((a) => (
                <div key={a.id} style={{
                  background: '#FFFFFF', border: `1px solid ${bdr}`, borderRadius: 12, padding: '14px 16px',
                }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: '0 0 4px', lineHeight: 1.4 }}>
                    {a.title || (a.artifact_type as string).replace(/_/g, ' ')}
                  </p>
                  <p style={{ fontSize: 10, color: muted, margin: 0, textTransform: 'capitalize' }}>
                    {(a.artifact_type as string).replace(/_/g, ' ')} · {a.agent_id}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Connect CTA ─────────────────────────────────────────────────── */}
        <div style={{
          background: '#FFFFFF', border: `1px solid ${bdr}`, borderRadius: 20, padding: '32px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: ink, marginBottom: 8 }}>
            Interested in {companyName}?
          </p>
          <p style={{ fontSize: 13, color: muted, lineHeight: 1.6, maxWidth: 400, margin: '0 auto 24px' }}>
            Connect through Edge Alpha to reach out directly to this founder.
          </p>
          <a
            href="/login?role=investor"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 24px', background: ink, color: bg,
              borderRadius: 999, fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}
          >
            Connect as Investor →
          </a>
        </div>

      </div>
    </div>
  );
}

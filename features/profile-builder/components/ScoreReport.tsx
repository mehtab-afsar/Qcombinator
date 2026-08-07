"use client";

import { useRouter } from 'next/navigation';
import { FileText, Globe, Bot, RefreshCw } from 'lucide-react';
import { surf, bdr, ink, muted, blue, green, amber, red, white } from '@/lib/constants/colors';
import { greenTintBg, greenTintBorder, greenTintText, amberTintBg, amberTintBorder, amberTintHeading, amberTintText } from '@/features/profile-builder/lib/constants';
import { buildScoreNarrative } from '@/features/profile-builder/lib/scoreNarrative';
import { buildMemoHtml } from '@/features/profile-builder/lib/memoPdfTemplate';
import type { SubmitResult } from '@/features/profile-builder/types';

interface ScoreReportProps {
  submitResult: SubmitResult;
  companyName: string;
  rateLimitUntil: Date | null;
  retakeLoading: boolean;
  onRetake: () => void;
}

export function ScoreReport({ submitResult, companyName, rateLimitUntil, retakeLoading, onRetake }: ScoreReportProps) {
  const router = useRouter();

  if (submitResult.iqBreakdown.length === 0) return null;

  const narrative = buildScoreNarrative(
    submitResult.iqBreakdown, submitResult.score, submitResult.grade, submitResult.reconciliationFlags
  );
  const toS100 = (avg: number) => Math.round(avg * 20);
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const companyLabel = companyName || 'Your Startup';

  function downloadMemoPdf() {
    const html = buildMemoHtml(submitResult, narrative, companyLabel, dateStr);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');
    if (win) {
      win.addEventListener('afterprint', () => URL.revokeObjectURL(blobUrl));
    }
  }

  // Derive top strengths/risks from iqBreakdown with indicator detail
  const sortedParams = [...submitResult.iqBreakdown].sort((a, b) => b.averageScore - a.averageScore);
  const strengthParams = sortedParams.slice(0, 2);
  const riskParams = [...submitResult.iqBreakdown].sort((a, b) => a.averageScore - b.averageScore).slice(0, 2);
  const scoreColor = submitResult.score >= 70 ? green : submitResult.score >= 45 ? amber : red;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Single premium result header ── */}
      <div style={{ padding: '32px 0 28px', borderBottom: `1px solid ${bdr}`, marginBottom: 28 }}>

        {/* Brand + company + score row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>
              Edge Alpha · Q-Score Memo
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: ink, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 5 }}>
              {companyLabel}
            </div>
            <div style={{ fontSize: 12, color: muted }}>{dateStr}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 64, fontWeight: 800, color: scoreColor, lineHeight: 1, letterSpacing: '-0.04em' }}>
              {submitResult.score}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: ink, padding: '3px 10px', background: surf, border: `1px solid ${bdr}`, borderRadius: 20 }}>Grade {submitResult.grade}</span>
              {submitResult.track && <span style={{ fontSize: 11, color: muted }}>{submitResult.track} track</span>}
            </div>
          </div>
        </div>

        {/* Strengths + areas to improve side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>

          {/* Strengths */}
          <div style={{ padding: '18px', background: greenTintBg, border: `1px solid ${greenTintBorder}`, borderRadius: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
              Strengths
            </div>
            {strengthParams.map(p => {
              const ps = toS100(p.averageScore);
              const topIndicators = [...p.indicators]
                .filter(ind => !ind.excluded && ind.rawScore > 0)
                .sort((a, b) => b.rawScore - a.rawScore)
                .slice(0, 2);
              return (
                <div key={p.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: ink }}>{p.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: green }}>{ps}</span>
                  </div>
                  <div style={{ height: 3, background: greenTintBorder, borderRadius: 2, marginBottom: 7, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${ps}%`, background: green, borderRadius: 2 }} />
                  </div>
                  {topIndicators.map(ind => (
                    <div key={ind.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 3 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: green, flexShrink: 0, marginTop: 4 }} />
                      <span style={{ fontSize: 11, color: greenTintText, lineHeight: 1.45 }}>{ind.name} — {ind.rawScore.toFixed(1)}/5</span>
                    </div>
                  ))}
                  {topIndicators.length === 0 && (
                    <span style={{ fontSize: 11, color: muted, fontStyle: 'italic' }}>Broad coverage across indicators</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Areas to improve */}
          <div style={{ padding: '18px', background: amberTintBg, border: `1px solid ${amberTintBorder}`, borderRadius: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: amberTintHeading, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
              Areas to Improve
            </div>
            {riskParams.map(p => {
              const ps = toS100(p.averageScore);
              const weakIndicators = [...p.indicators]
                .filter(ind => !ind.excluded && ind.rawScore > 0)
                .sort((a, b) => a.rawScore - b.rawScore)
                .slice(0, 2);
              const missingIndicators = p.indicators.filter(ind => ind.excluded).slice(0, 1);
              return (
                <div key={p.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: ink }}>{p.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: amberTintHeading }}>{ps}</span>
                  </div>
                  <div style={{ height: 3, background: amberTintBorder, borderRadius: 2, marginBottom: 7, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${ps}%`, background: amber, borderRadius: 2 }} />
                  </div>
                  {weakIndicators.map(ind => (
                    <div key={ind.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 3 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: amber, flexShrink: 0, marginTop: 4 }} />
                      <span style={{ fontSize: 11, color: amberTintText, lineHeight: 1.45 }}>{ind.name} — {ind.rawScore.toFixed(1)}/5</span>
                    </div>
                  ))}
                  {missingIndicators.map(ind => (
                    <div key={ind.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 3 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: amber, flexShrink: 0, marginTop: 4 }} />
                      <span style={{ fontSize: 11, color: amberTintText, lineHeight: 1.45 }}>{ind.name} — not assessed</span>
                    </div>
                  ))}
                  {weakIndicators.length === 0 && missingIndicators.length === 0 && (
                    <span style={{ fontSize: 11, color: muted, fontStyle: 'italic' }}>Add more data to improve this dimension</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Single CTA row */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/founder/dashboard')} style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: blue, color: white, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 2px 10px ${blue}33` }}>
            Go to Dashboard →
          </button>
          <button onClick={() => router.push('/founder/improve-qscore')} style={{ padding: '10px 22px', borderRadius: 9, border: `1px solid ${bdr}`, background: 'transparent', color: ink, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Improve my score
          </button>
          <button
            onClick={onRetake}
            disabled={retakeLoading || !!rateLimitUntil}
            style={{ padding: '10px 18px', borderRadius: 9, border: `1px solid ${bdr}`, background: 'transparent', color: (retakeLoading || rateLimitUntil) ? muted : ink, fontSize: 13, fontWeight: 500, cursor: (retakeLoading || rateLimitUntil) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {retakeLoading ? 'Checking…' : rateLimitUntil ? `⏱ Locked until ${rateLimitUntil.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` : '↺ Retake Assessment'}
          </button>
          <button onClick={downloadMemoPdf} style={{ padding: '10px 18px', borderRadius: 9, border: `1px solid ${bdr}`, background: 'transparent', color: muted, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <FileText size={13} strokeWidth={1.75} /> Download PDF
          </button>
        </div>
      </div>

      {/* Parameter overview */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Parameter Overview</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {submitResult.iqBreakdown.map(p => {
            const ps = toS100(p.averageScore);
            const bc = ps >= 70 ? green : ps >= 45 ? amber : red;
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 160, fontSize: 12, fontWeight: 500, color: ink, flexShrink: 0 }}>{p.name}</div>
                <div style={{ flex: 1, height: 5, background: bdr, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${ps}%`, background: bc, borderRadius: 3, transition: 'width 0.6s ease' }} />
                </div>
                <div style={{ width: 44, textAlign: 'right', fontSize: 12, fontWeight: 700, color: ink }}>{ps}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ height: 1, background: bdr, marginBottom: 28 }} />

      {/* Assessment narrative */}
      <div style={{ marginBottom: 28, padding: '18px 20px', background: surf, borderLeft: `3px solid ${blue}`, borderRadius: '0 10px 10px 0', border: `1px solid ${bdr}`, borderLeftColor: blue }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Assessment Summary</div>
        <p style={{ margin: 0, fontSize: 13, color: ink, lineHeight: 1.7 }}>{narrative.overall}</p>
      </div>

      {/* Validation warnings */}
      {submitResult.validationWarnings.length > 0 && (
        <div style={{ marginBottom: 28, padding: '14px 18px', borderRadius: 10, background: surf, border: `1px solid ${bdr}`, borderLeft: `3px solid ${amber}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Consistency Notes</div>
          {submitResult.validationWarnings.map((w, i) => <div key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.55, marginBottom: 3 }}>· {w}</div>)}
        </div>
      )}

      {/* Top unlock cards */}
      {submitResult.unlockCards.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Top Score Unlocks</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {submitResult.unlockCards.map((card, ci) => (
              <div key={ci} style={{ display: 'flex', gap: 16, padding: '14px 16px', borderRadius: 10, border: `1px solid ${bdr}`, borderLeft: `3px solid ${bdr}`, background: surf }}>
                <div style={{ textAlign: 'center', minWidth: 40, flexShrink: 0, paddingTop: 2 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: ink, lineHeight: 1 }}>+{card.estimatedPointGain}</div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>pts</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 3 }}>{card.indicatorName}</div>
                  <div style={{ fontSize: 11, color: muted, marginBottom: 6 }}>{card.currentScore.toFixed(1)}/5 → target {card.targetScore}/5{card.agentId && <span style={{ marginLeft: 8, color: blue }}>· {card.agentId.charAt(0).toUpperCase() + card.agentId.slice(1)} can help</span>}</div>
                  <div style={{ fontSize: 12, color: ink, lineHeight: 1.55 }}>{card.action}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Readiness summary */}
      {submitResult.readinessSummary && (
        <div style={{ marginBottom: 28, padding: '16px 20px', borderRadius: 10, background: surf, border: `1px solid ${bdr}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Investor Readiness Summary</div>
          <p style={{ margin: 0, fontSize: 13, color: ink, lineHeight: 1.7, fontStyle: 'italic' }}>{submitResult.readinessSummary}</p>
        </div>
      )}

      {/* What's next */}
      <div style={{ padding: '18px 20px', borderRadius: 10, background: surf, border: `1px solid ${bdr}` }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>What&apos;s next</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { Icon: Globe, text: 'Your score is live on the Investor Portal — visible to matched investors' },
            { Icon: Bot, text: 'Use AI agents to build deliverables that boost your weakest dimensions' },
            { Icon: RefreshCw, text: 'Retake the assessment in 24 hours to improve your score' },
          ].map(({ Icon, text }, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Icon size={13} color={green} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12, color: ink, lineHeight: 1.55 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

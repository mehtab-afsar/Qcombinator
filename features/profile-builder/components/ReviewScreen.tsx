"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { bg, surf, bdr, ink, muted, blue, green, amber, red, white } from '@/lib/constants/colors';
import { SECTION_LABELS, surf2, greenBadgeBg, amberTintBg, amberTintText, redTintBg, redTintBorder, QSCORE_MESSAGES, QSCORE_DOODLES } from '@/features/profile-builder/lib/constants';
import { ScoreReport } from '@/features/profile-builder/components/ScoreReport';
import type { SectionState, SubmitResult, FlowMode, UploadedFile } from '@/features/profile-builder/types';
import type { FounderProfile } from '@/lib/profile-builder/question-engine';

interface ReviewScreenProps {
  flowMode: FlowMode;
  sections: Record<string, SectionState>;
  uploadedFiles: UploadedFile[];
  animatedScores: Record<string, number>;
  isSubmitting: boolean;
  submitResult: SubmitResult | null;
  submitError: string | null;
  rateLimitUntil: Date | null;
  retakeLoading: boolean;
  founderProfile: FounderProfile;
  onSubmit: () => void;
  onRetake: () => void;
  onSectionSelect: (step: number) => void;
  onUploadMore: () => void;
  onBack: () => void;
}

export function ReviewScreen({
  flowMode, sections, uploadedFiles, animatedScores, isSubmitting, submitResult, submitError,
  rateLimitUntil, retakeLoading, founderProfile, onSubmit, onRetake, onSectionSelect, onUploadMore, onBack,
}: ReviewScreenProps) {
  const router = useRouter();

  // Rotates every 2.2s while the final Q-Score calculation is in progress — same
  // pattern/timing as UploadStep's loading card.
  const [qScoreMsgIdx, setQScoreMsgIdx] = useState(0);
  useEffect(() => {
    if (!isSubmitting) { setQScoreMsgIdx(0); return; }
    const timer = setInterval(() => setQScoreMsgIdx(i => (i + 1) % QSCORE_MESSAGES.length), 2200);
    return () => clearInterval(timer);
  }, [isSubmitting]);
  const QScoreDoodle = QSCORE_DOODLES[qScoreMsgIdx];

  const completedCount = ['1', '2', '3', '4', '5'].filter(k => sections[k]?.isComplete).length;
  // Fast mode (doc upload): allow submit when any section has ≥30% data — matches API gate.
  // Deliberately only sections 1-5, not 'pitch': saveSection() never persists the pitch
  // practice section (it's a rehearsal, not scored data), so the server's own gate — at
  // least one section saved with completion_score >= 30 — can never see it. Including
  // pitch here let this button say "ready" while the server still rejected with a 400.
  const hasAnySectionData = ['1', '2', '3', '4', '5'].some(k => (sections[k]?.completionScore ?? 0) >= 30);
  const canSubmit = completedCount >= 3 || (flowMode === 'fast' && uploadedFiles.length > 0 && hasAnySectionData);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', width: '100%', padding: '48px 40px 60px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {submitResult ? (
        <ScoreReport
          submitResult={submitResult}
          companyName={founderProfile.companyName ?? ''}
          rateLimitUntil={rateLimitUntil}
          retakeLoading={retakeLoading}
          onRetake={onRetake}
        />
      ) : isSubmitting ? (
        <div style={{
          borderRadius: 20, padding: '56px 32px', background: surf,
          border: `1px solid ${bdr}`, textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
        }}>
          {/* Hand-drawn doodle — re-draws on each phase (keyed by message index) */}
          <div style={{ width: 96, height: 96 }}>
            <QScoreDoodle key={qScoreMsgIdx} color={blue} />
          </div>
          {/* Rotating message */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: ink, letterSpacing: '-0.01em', minHeight: 26 }}>
              {QSCORE_MESSAGES[qScoreMsgIdx]}
            </div>
            <div style={{ fontSize: 13, color: muted }}>
              Calculating your Q-Score — this takes a few seconds
            </div>
          </div>
          {/* Indicator dots */}
          <div style={{ display: 'flex', gap: 8 }}>
            {QSCORE_MESSAGES.map((_, i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: i === qScoreMsgIdx ? blue : bdr,
                transition: 'background 0.4s',
              }} />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              {flowMode === 'fast' ? 'Your partial Q-Score' : 'Review & Submit'}
            </h2>
            <p style={{ fontSize: 14, color: muted, margin: 0 }}>
              {flowMode === 'fast'
                ? `Based on ${['1', '2', '3', '4', '5'].filter(k => (sections[k]?.completionScore ?? 0) >= 30).length}/5 parameters answered. Add more sections to raise it.`
                : `${completedCount}/5 sections complete. ${canSubmit ? 'Ready to calculate your Q-Score.' : 'Complete at least 1 section to submit.'}`}
            </p>
          </div>

          {/* Section cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['1', '2', '3', '4', '5'].map(k => {
              const sec = sections[k];
              const pct = animatedScores[k] ?? sec?.completionScore ?? 0;
              const isStrong60 = pct >= 60;
              return (
                <div key={k} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 16px', borderRadius: 10,
                  background: surf, border: `1px solid ${isStrong60 ? green + '55' : bdr}`,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: isStrong60 ? greenBadgeBg : surf2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700,
                    color: isStrong60 ? green : muted,
                    flexShrink: 0,
                  }}>
                    {isStrong60 ? <Check size={13} strokeWidth={2.5} color={green} /> : k}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: ink }}>{SECTION_LABELS[k]}</div>
                    <div style={{ fontSize: 12, color: isStrong60 ? green : muted }}>
                      {pct}% · {isStrong60 ? 'score ≥ 3/5' : pct >= 30 ? 'score < 3/5 — add more detail' : 'no data yet'}
                    </div>
                  </div>
                  <button onClick={() => onSectionSelect(parseInt(k, 10))} style={{
                    padding: '5px 12px', borderRadius: 6, border: `1px solid ${bdr}`,
                    background: 'transparent', fontSize: 12, color: muted,
                    cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                  }}>
                    {isStrong60 ? 'Improve' : 'Add detail'}
                  </button>
                </div>
              );
            })}
          </div>

          {rateLimitUntil && (
            <div style={{ padding: '16px 20px', borderRadius: 10, background: amberTintBg, border: `1px solid ${amber}44` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: amber, marginBottom: 4 }}>Score recalculation locked for 24 hours</div>
              <div style={{ fontSize: 13, color: amberTintText, lineHeight: 1.5 }}>
                Next calculation available{' '}
                <strong>{rateLimitUntil.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</strong>
                {' '}at{' '}
                <strong>{rateLimitUntil.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</strong>.
                <br />
                <span style={{ fontSize: 12, opacity: 0.85 }}>You can still upload documents and add more detail to any section in the meantime.</span>
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={onUploadMore} style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: blue, color: white, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>Upload more documents →</button>
                <button onClick={() => router.push('/founder/improve-qscore')} style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  background: amber, color: white, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>Improve my score →</button>
                <button onClick={() => router.push('/founder/dashboard')} style={{
                  padding: '8px 16px', borderRadius: 8, border: `1px solid ${bdr}`,
                  background: bg, color: ink, fontSize: 12,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>Dashboard</button>
              </div>
            </div>
          )}
          {submitError && !rateLimitUntil && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: redTintBg, border: `1px solid ${redTintBorder}`, fontSize: 13, color: red }}>
              {submitError}
            </div>
          )}

          <button
            onClick={onSubmit}
            disabled={!canSubmit || isSubmitting}
            style={{
              padding: '14px 32px', borderRadius: 10, border: 'none',
              background: (!canSubmit || isSubmitting) ? bdr : blue,
              color: white, fontSize: 16, fontWeight: 700,
              cursor: (!canSubmit || isSubmitting) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: (!canSubmit || isSubmitting) ? 0.6 : 1,
            }}
          >
            {isSubmitting ? 'Calculating Q-Score…' : 'Calculate My Q-Score →'}
          </button>

          <button
            onClick={onBack}
            style={{
              padding: '8px 20px', borderRadius: 8, border: `1.5px solid ${bdr}`,
              background: 'transparent', fontSize: 13, color: ink,
              cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-start',
            }}
          >
            ← Back
          </button>
        </>
      )}
    </div>
  );
}

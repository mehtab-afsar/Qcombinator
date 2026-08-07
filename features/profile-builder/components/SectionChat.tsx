"use client";

import { useState, type RefObject, type Dispatch, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Zap, Paperclip, ArrowUp } from 'lucide-react';
import { bg, surf, ink, muted, bdr, blue, green, white } from '@/lib/constants/colors';
import { UPLOAD_IMPACT, SECTION_LABELS, SECTION_DESCRIPTIONS, YC_QUESTIONS, surf2, greenTintBg, greenBorderSoft, blueTintBg, blueTintText, blueBorderSoft, dotGray } from '@/features/profile-builder/lib/constants';
import { initSection } from '@/features/profile-builder/lib/section-state';
import type { SectionState, ProfileBuilderStep, RecalcResult } from '@/features/profile-builder/types';

interface SectionChatProps {
  currentStep: ProfileBuilderStep;
  sections: Record<string, SectionState>;
  setSections: Dispatch<SetStateAction<Record<string, SectionState>>>;
  animatedScores: Record<string, number>;
  ycPitchIdx: number;
  setYcPitchIdx: Dispatch<SetStateAction<number>>;
  isTyping: boolean;
  chatEndRef: RefObject<HTMLDivElement | null>;
  uploadTrigger: string | null;
  uploadLoading: boolean;
  onUploadClick: () => void;
  recalcResult: RecalcResult | null;
  recalcLoading: boolean;
  setRecalcResult: Dispatch<SetStateAction<RecalcResult | null>>;
  onRecalculate: () => void;
  onSend: (text: string) => void;
  prevStep: ProfileBuilderStep | null;
  nextStep: ProfileBuilderStep | null;
  setCurrentStep: (step: ProfileBuilderStep) => void;
}

export function SectionChat({
  currentStep, sections, setSections, animatedScores, ycPitchIdx, setYcPitchIdx,
  isTyping, chatEndRef, uploadTrigger, uploadLoading, onUploadClick,
  recalcResult, recalcLoading, setRecalcResult, onRecalculate,
  onSend, prevStep, nextStep, setCurrentStep,
}: SectionChatProps) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const key = String(currentStep);
  const sec = sections[key] ?? initSection();
  const impact = typeof currentStep === 'number' ? UPLOAD_IMPACT[currentStep] : undefined;
  const isSection5 = currentStep === 5;
  const mentionsRevenue = isSection5 && /\$[\d,]+|\d+k?\s*mrr|\d+\s*k\s*per\s*month/i.test(sec.conversation);
  const stripeVisible = isSection5 && mentionsRevenue && sec.uploadedDocuments.length === 0;

  return (
    <div style={{ maxWidth: 880, width: '100%', margin: '0 auto', padding: '48px 40px 0', display: 'flex', flexDirection: 'column', flex: 1 }}>

      {/* Section heading */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: ink, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          {SECTION_LABELS[key]}
        </h2>
        <p style={{ fontSize: 14, color: muted, margin: 0 }}>
          {SECTION_DESCRIPTIONS[key]}
        </p>
      </div>

      {/* Completion bar — subtle, sections 1-5 only */}
      {currentStep !== 'pitch' && sec.completionScore > 0 && (
        <div style={{ marginBottom: 20, maxWidth: 480, margin: '0 auto 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 12, color: muted }}>Section completion</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: sec.completionScore >= 70 ? green : muted }}>
              {Math.round(animatedScores[key] ?? sec.completionScore)}%{sec.completionScore >= 70 ? ' · Complete' : ''}
            </span>
          </div>
          <div style={{ height: 4, background: bdr, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${animatedScores[key] ?? sec.completionScore}%`,
              background: sec.completionScore >= 70 ? green : blue,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      {/* YC pitch progress */}
      {currentStep === 'pitch' && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {YC_QUESTIONS.map((_, qi) => (
              <div key={qi} style={{ width: qi <= ycPitchIdx ? 20 : 8, height: 4, borderRadius: 2, background: qi < ycPitchIdx ? green : qi === ycPitchIdx ? blue : bdr, transition: 'all 0.3s ease' }} />
            ))}
          </div>
          <span style={{ fontSize: 11, color: muted }}>
            {sec.isComplete ? 'Pitch complete' : `Question ${Math.min(ycPitchIdx + 1, YC_QUESTIONS.length)} of ${YC_QUESTIONS.length}`}
          </span>
        </div>
      )}

      {/* Chat messages */}
      <div style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        gap: 20, minHeight: 260, maxHeight: 520, padding: '12px 0',
      }}>
        {sec.messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: muted, fontSize: 14 }}>
            Loading question…
          </div>
        )}
        {sec.messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '82%', padding: '11px 15px',
              fontSize: 14, lineHeight: 1.65,
              background: msg.role === 'user' ? blue : surf2,
              color: msg.role === 'user' ? white : ink,
              borderRadius: msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
              boxShadow: msg.role === 'user' ? '0 2px 8px rgba(37,99,235,0.18)' : '0 1px 3px rgba(24,22,15,0.06)',
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div style={{ display: 'flex', gap: 5, padding: '12px 14px', width: 64,
            background: surf2, borderRadius: '4px 14px 14px 14px' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: '50%', background: dotGray,
                animation: `bounce 0.6s ${i * 0.15}s infinite`,
              }} />
            ))}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Upload trigger / loading banner — shows for keyword triggers AND manual attach */}
      {(uploadTrigger || uploadLoading) && (
        <div style={{
          margin: '12px 0', padding: '12px 16px', borderRadius: 10,
          background: blueTintBg,
          border: `1px solid ${blueBorderSoft}`,
          display: 'flex', alignItems: 'center', gap: 12,
          transition: 'all 0.2s',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: surf,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {uploadLoading
              ? <Loader2 size={15} color={blue} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
              : <Paperclip size={15} color={blue} strokeWidth={1.75} />}
          </div>
          <div style={{ flex: 1 }}>
            {uploadLoading ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: blueTintText }}>Extracting data from your document…</div>
                <div style={{ fontSize: 11, color: blue, marginTop: 2, opacity: 0.8 }}>This takes a few seconds — hang tight</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: blueTintText }}>{uploadTrigger}</div>
                {impact && (
                  <div style={{ fontSize: 11, color: blue, marginTop: 2, fontWeight: 600, opacity: 0.9 }}>
                    Upload to verify → boost {impact.dim} +{impact.pts} pts
                  </div>
                )}
              </>
            )}
          </div>
          {!uploadLoading && (
            <button
              onClick={onUploadClick}
              style={{
                padding: '6px 14px', borderRadius: 6, border: 'none',
                background: blue, color: white, fontSize: 12,
                fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
              }}
            >Upload</button>
          )}
        </div>
      )}

      {/* Recalculate after section doc upload — only show button, result is dismissable */}
      {sec.uploadedDocuments.length > 0 && !uploadLoading && (
        <div style={{ margin: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => { setRecalcResult(null); onRecalculate() }}
            disabled={recalcLoading}
            style={{
              padding: '6px 14px', borderRadius: 7, border: `1.5px solid ${bdr}`,
              background: bg, color: ink, fontSize: 12, fontWeight: 500,
              cursor: recalcLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            {recalcLoading
              ? <><Loader2 size={12} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> Calculating…</>
              : <><Zap size={12} strokeWidth={2} /> Preview score</>}
          </button>
          {recalcResult && (
            <span style={{
              padding: '4px 10px', borderRadius: 6,
              background: greenTintBg, border: `1px solid ${greenBorderSoft}`,
              fontSize: 12, fontWeight: 600, color: green,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              IQ {recalcResult.finalIQ} · {recalcResult.grade}
              <button
                onClick={() => setRecalcResult(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: green, opacity: 0.6, fontFamily: 'inherit' }}
              >×</button>
            </span>
          )}
        </div>
      )}

      {/* Stripe card */}
      {stripeVisible && (
        <div style={{
          margin: '8px 0', border: `1px solid ${bdr}`, borderRadius: 10, padding: '12px 16px',
          background: surf, display: 'flex', gap: 12, alignItems: 'center',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: ink }}>Connect Stripe for verified MRR</div>
            <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>Highest data credibility — +18 pts vs self-reported</div>
          </div>
          <button onClick={() => router.push('/founder/settings?tab=integrations')} style={{
            padding: '7px 12px', borderRadius: 6, border: `1px solid ${bdr}`,
            background: 'transparent', fontSize: 12, color: blue,
            cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}>Connect →</button>
        </div>
      )}

      {/* Input area */}
      <div style={{ paddingTop: 16, borderTop: `1px solid ${bdr}`, marginTop: 'auto' }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 0,
          border: `1.5px solid ${inputFocused ? blue : bdr}`,
          borderRadius: 14, background: isTyping ? surf : bg,
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: inputFocused ? '0 0 0 3px rgba(37,99,235,0.08)' : '0 1px 4px rgba(24,22,15,0.06)',
        }}>
          {/* Attach */}
          <button
            onClick={() => { if (!uploadLoading) onUploadClick() }}
            disabled={uploadLoading}
            title={
              currentStep === 1 ? 'Upload LOI, pilot agreement, or CRM export'
              : currentStep === 2 ? 'Upload pitch deck or market research'
              : currentStep === 3 ? 'Upload patent filing or technical spec'
              : currentStep === 4 ? 'Upload team CV or LinkedIn export'
              : currentStep === 5 ? 'Upload financial model or Stripe export'
              : 'Upload supporting document'
            }
            style={{
              width: 44, minHeight: 48, borderRadius: '14px 0 0 14px', border: 'none',
              background: 'transparent', cursor: uploadLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              paddingBottom: 12, flexShrink: 0, opacity: uploadLoading ? 0.35 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            <Paperclip size={17} color={muted} strokeWidth={1.75} />
          </button>
          {/* Divider */}
          <div style={{ width: 1, background: bdr, alignSelf: 'stretch', margin: '8px 0' }} />
          {/* Textarea */}
          <textarea
            value={input}
            onChange={e => {
              setInput(e.target.value);
              // auto-grow
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(input); setInput('') } }}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={currentStep === 'pitch' ? 'Describe your company in 2-3 sentences…' : 'Type your answer…'}
            rows={1}
            disabled={isTyping}
            style={{
              flex: 1, padding: '14px 10px', border: 'none', background: 'transparent',
              fontSize: 14, color: ink, resize: 'none', fontFamily: 'inherit',
              outline: 'none', lineHeight: 1.6, opacity: isTyping ? 0.5 : 1,
              minHeight: 48, maxHeight: 160, overflowY: 'auto',
            }}
          />
          {/* Send */}
          <div style={{ display: 'flex', alignItems: 'flex-end', padding: '8px 8px 8px 0', flexShrink: 0 }}>
            <button
              onClick={() => { onSend(input); setInput('') }}
              disabled={!input.trim() || isTyping}
              style={{
                width: 32, height: 32, borderRadius: 9, border: 'none',
                background: (input.trim() && !isTyping) ? blue : bdr,
                color: white,
                cursor: (input.trim() && !isTyping) ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background 0.15s',
              }}
            >
              {isTyping
                ? <Loader2 size={14} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
                : <ArrowUp size={15} strokeWidth={2.5} />}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '5px 0 0 6px' }}>
          <p style={{ fontSize: 11, color: muted, opacity: 0.6 }}>
            Enter to send · Shift+Enter for new line
          </p>
          {currentStep === 'pitch' && !sec.isComplete && (
            <button
              onClick={() => {
                const nextIdx = ycPitchIdx + 1;
                const isLast = ycPitchIdx >= YC_QUESTIONS.length - 1;
                const reply = isLast ? "Pitch practice complete. Skipped — you can answer these during investor meetings." : YC_QUESTIONS[nextIdx];
                setSections(prev => ({
                  ...prev,
                  pitch: {
                    ...prev['pitch'],
                    messages: [...(prev['pitch']?.messages ?? []), { role: 'user' as const, text: '(skipped)' }, { role: 'agent' as const, text: reply }],
                    completionScore: Math.round((nextIdx / YC_QUESTIONS.length) * 100),
                    isComplete: isLast,
                  },
                }));
                if (!isLast) setYcPitchIdx(nextIdx);
                else setYcPitchIdx(YC_QUESTIONS.length - 1);
              }}
              style={{ fontSize: 11, color: muted, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 4, fontFamily: 'inherit' }}
            >
              Skip →
            </button>
          )}
        </div>
      </div>

      {/* Back / Next */}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 40 }}>
        <button
          onClick={() => { if (prevStep !== null) setCurrentStep(prevStep) }}
          style={{
            padding: '10px 22px', borderRadius: 8, border: `1.5px solid ${bdr}`,
            background: 'transparent', fontSize: 13, color: ink,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >← Back</button>
        <button
          onClick={() => { if (nextStep !== null) setCurrentStep(nextStep) }}
          style={{
            padding: '10px 22px', borderRadius: 8, border: 'none',
            background: blue, color: white, fontSize: 13,
            fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >{currentStep === 5 ? 'Review & Submit →' : 'Next →'}</button>
      </div>
    </div>
  );
}

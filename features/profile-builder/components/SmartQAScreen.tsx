"use client";

import { useState, type Dispatch, type SetStateAction } from 'react';
import { Lightbulb, Loader2, Zap } from 'lucide-react';
import { bg, surf, bdr, ink, muted, blue, amber, white } from '@/lib/constants/colors';
import { buildStructuredSnippets } from '@/lib/profile-builder/question-engine';
import type { FounderProfile } from '@/lib/profile-builder/question-engine';
import type { SmartQuestion } from '@/lib/profile-builder/smart-questions';
import { streamExtract } from '@/features/profile-builder/lib/streamExtract';
import { initSection } from '@/features/profile-builder/lib/section-state';
import { MISSING_FIELD_LABELS, surf2, amberTintBg, blueTintBg, blueTintText, dotGray } from '@/features/profile-builder/lib/constants';
import type { Message, SectionState, SectionSummary, ProfileBuilderStep } from '@/features/profile-builder/types';

interface SmartQAScreenProps {
  smartQuestions: SmartQuestion[];
  smartQaIndex: number;
  setSmartQaIndex: Dispatch<SetStateAction<number>>;
  sections: Record<string, SectionState>;
  setSections: Dispatch<SetStateAction<Record<string, SectionState>>>;
  extractionSummary: SectionSummary[];
  setExtractionSummary: Dispatch<SetStateAction<SectionSummary[]>>;
  founderProfile: FounderProfile;
  token: string | null;
  saveSection: (secNum: string, state: SectionState, tok: string) => Promise<void>;
  saveFlowState: (state: object | null) => void;
  setCurrentStep: (step: ProfileBuilderStep) => void;
}

export function SmartQAScreen({
  smartQuestions, smartQaIndex, setSmartQaIndex, sections, setSections,
  extractionSummary, setExtractionSummary, founderProfile, token,
  saveSection, saveFlowState, setCurrentStep,
}: SmartQAScreenProps) {
  const [smartInput, setSmartInput] = useState('');
  const [smartInputFocused, setSmartInputFocused] = useState(false);
  const [smartProcessing, setSmartProcessing] = useState(false);

  const q = smartQuestions[smartQaIndex];
  // If no questions remain, redirect to review — done via useEffect, render null here
  if (!q) return null;
  const isLast = smartQaIndex === smartQuestions.length - 1;
  const progressPct = Math.round((smartQaIndex / smartQuestions.length) * 100);

  // @param answerOverride lets a tapped quick-reply chip answer directly —
  // one tap, no typing, matching the free-text path's "Enter to submit" speed.
  const handleSmartNext = async (answerOverride?: string) => {
    const answer = (answerOverride ?? smartInput).trim();
    if (!answer || !token) return;
    setSmartProcessing(true);
    try {
      // Streamed (SSE), same as the main chat (Stage B) — this used to call
      // .json() on a route that now always returns text/event-stream, which
      // silently failed every smart-QA answer via the catch block below.
      const { meta } = await streamExtract(token, {
        section: parseInt(q.sectionKey, 10),
        conversationText: (sections[q.sectionKey]?.conversation ?? '') + `\nAgent: ${q.text}\nFounder: ${answer}`,
        founderProfile,
        existingExtracted: sections[q.sectionKey]?.extractedFields ?? {},
        existingConfidenceMap: sections[q.sectionKey]?.confidenceMap ?? {},
        // smart-qa answers a fixed pre-computed question list — it never reads
        // the generated follow-up reply, so skip the extra LLM call for it.
        skipFollowUp: true,
      }, () => {});
      const secKey = q.sectionKey;
      const mergedFields = meta.mergedFields ?? sections[secKey]?.extractedFields ?? {};
      const newScore = meta.completionScore ?? sections[secKey]?.completionScore ?? 0;
      setSections(prev => {
        const sec = prev[secKey] ?? initSection();
        // Also append to messages so the section chatbot sees this Q&A
        // and doesn't re-ask the same question when user navigates to that section
        const newMessages: Message[] = [
          ...sec.messages,
          { role: 'agent' as const, text: q.text },
          { role: 'user' as const, text: answer },
        ];
        // If section is now complete, add a completion acknowledgement
        if (newScore >= 70 && sec.completionScore < 70) {
          newMessages.push({ role: 'agent' as const, text: `Got it — this section is looking good (${newScore}%). You can add more detail or move on.` });
        }
        const updated: SectionState = {
          ...sec,
          extractedFields: mergedFields,
          confidenceMap: { ...sec.confidenceMap, ...(meta.confidenceMap ?? {}) },
          completionScore: newScore,
          isComplete: newScore >= 70,
          messages: newMessages,
          conversation: (sec.conversation ?? '') + `\nAgent: ${q.text}\nFounder: ${answer}`,
        };
        if (token) saveSection(secKey, updated, token);
        return { ...prev, [secKey]: updated };
      });
      // Keep extractionSummary (what the snapshot screen renders) in sync with
      // this answer — previously only `sections` was updated here, so an answer given
      // during smart-qa never showed up as a new chip/narrative on either screen.
      setExtractionSummary(prev => prev.map(s => s.sectionKey !== secKey ? s : {
        ...s,
        completionPct: newScore,
        extractedSnippets: buildStructuredSnippets(mergedFields, Number(secKey)),
        missingLabels: (meta.missingFields ?? []).map(m => MISSING_FIELD_LABELS[m] ?? m),
      }));
    } catch (e) {
      console.warn('smart-qa extract failed:', e);
    } finally {
      setSmartProcessing(false);
      setSmartInput('');
      if (isLast) {
        setCurrentStep('extract-results');
        saveFlowState(null); // flow complete — clear persisted state
      } else {
        const nextIdx = smartQaIndex + 1;
        setSmartQaIndex(nextIdx);
        saveFlowState({ flowMode: 'fast', smartQuestions, smartQaIndex: nextIdx, extractionSummary });
      }
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 40px 60px' }}>
    <div style={{ maxWidth: 880, width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Progress */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: muted }}>
            Question {smartQaIndex + 1} of {smartQuestions.length}
            {isLast && <span style={{ marginLeft: 8, color: amber, fontWeight: 600 }}>· Last one — score calculates next</span>}
          </span>
          <span style={{ fontSize: 12, color: muted }}>{progressPct}%</span>
        </div>
        <div style={{ height: 4, background: bdr, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: isLast ? amber : blue, borderRadius: 2, transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {/* Section badge + weak param indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          display: 'inline-block', fontSize: 11, fontWeight: 600,
          padding: '3px 10px', borderRadius: 20,
          background: blueTintBg, color: blue,
        }}>{q.sectionLabel}</span>
        <span style={{
          display: 'inline-block', fontSize: 11, fontWeight: 600,
          padding: '3px 10px', borderRadius: 20,
          background: amberTintBg, color: amber,
        }}>Scored below 3/5 · high impact</span>
      </div>

      {/* Question */}
      <h2 style={{ fontSize: 20, fontWeight: 700, color: ink, margin: 0, lineHeight: 1.4, letterSpacing: '-0.01em' }}>
        {q.text}
      </h2>

      {/* Context hint */}
      {q.contextHint && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: blueTintBg, fontSize: 13, color: blueTintText,
        }}>
          {q.contextHint}
        </div>
      )}

      {/* Quick replies — per-founder, model-generated (not the same chips for
          everyone). One tap answers; typing below always still works. */}
      {q.quickReplies && q.quickReplies.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {q.quickReplies.map((reply, i) => (
            <button
              key={i}
              onClick={() => handleSmartNext(reply)}
              disabled={smartProcessing}
              style={{
                padding: '8px 14px', borderRadius: 20, border: `1.5px solid ${bdr}`,
                background: bg, color: ink, fontSize: 13, fontWeight: 500,
                cursor: smartProcessing ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                opacity: smartProcessing ? 0.5 : 1, transition: 'border-color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => { if (!smartProcessing) { e.currentTarget.style.borderColor = blue; e.currentTarget.style.background = blueTintBg } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.background = bg }}
            >{reply}</button>
          ))}
        </div>
      )}

      {/* Loading feedback — quick-reply taps have no other visual cue while the
          answer is being read, and previously read as broken with none at all. */}
      {smartProcessing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 5, padding: '12px 14px', width: 64,
            background: surf2, borderRadius: '4px 14px 14px 14px' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: '50%', background: dotGray,
                animation: `bounce 0.6s ${i * 0.15}s infinite`,
              }} />
            ))}
          </div>
          <span style={{ fontSize: 12, color: muted }}>Reading your answer…</span>
        </div>
      )}

      {/* Answer input */}
      <div style={{
        display: 'flex', alignItems: 'flex-end',
        border: `1.5px solid ${smartInputFocused ? blue : bdr}`,
        borderRadius: 16, background: bg,
        padding: '6px 6px 6px 12px', transition: 'border-color 0.15s',
        boxShadow: smartInputFocused ? '0 0 0 3px rgba(37,99,235,0.08)' : '0 1px 4px rgba(24,22,15,0.06)',
      }}>
        <textarea
          value={smartInput}
          onChange={e => setSmartInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSmartNext() } }}
          onFocus={() => setSmartInputFocused(true)}
          onBlur={() => setSmartInputFocused(false)}
          placeholder="Type your answer…"
          rows={3}
          style={{
            flex: 1, padding: '6px 0', border: 'none', background: 'transparent',
            fontSize: 14, color: ink, fontFamily: 'inherit',
            resize: 'none', outline: 'none', lineHeight: 1.6,
          }}
        />
        <button
          onClick={() => handleSmartNext()}
          disabled={!smartInput.trim() || smartProcessing}
          style={{
            width: 36, height: 36, borderRadius: 10, border: 'none',
            background: (smartInput.trim() && !smartProcessing) ? blue : bdr,
            color: white, fontSize: 16, fontWeight: 700,
            cursor: (smartInput.trim() && !smartProcessing) ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 0.15s', marginBottom: 1,
          }}
        >{smartProcessing ? <Loader2 size={14} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> : isLast ? <Zap size={14} strokeWidth={2} /> : '↑'}</button>
      </div>

      {/* Help text */}
      {q.helpText && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '8px 12px', borderRadius: 8, background: surf, border: `1px solid ${bdr}` }}>
          <Lightbulb size={13} color={amber} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: muted, margin: 0, lineHeight: 1.55 }}>{q.helpText}</p>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => {
            if (smartQaIndex === 0) setCurrentStep('extract-results');
            else setSmartQaIndex(i => i - 1);
          }}
          style={{
            padding: '8px 16px', borderRadius: 8, border: `1px solid ${bdr}`,
            background: 'transparent', fontSize: 12, color: muted,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >← Back</button>
        <span style={{ fontSize: 11, color: muted }}>Enter to submit</span>
      </div>
    </div>
    </div>
  );
}

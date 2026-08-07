"use client";

import { bdr, ink, muted, blue, green, amber, red, white } from '@/lib/constants/colors';
import { ProfileSnapshot, type SnapshotCard, type SnapshotSnippet } from '@/features/profile-builder/components/ProfileSnapshot';
import { MISSING_FIELD_LABELS } from '@/features/profile-builder/lib/constants';
import type { SectionState, SectionSummary, FlowMode, ProfileBuilderStep } from '@/features/profile-builder/types';
import type { SmartQuestion } from '@/lib/profile-builder/smart-questions';

interface ExtractResultsScreenProps {
  smartQuestions: SmartQuestion[];
  smartQaIndex: number;
  sections: Record<string, SectionState>;
  extractionSummary: SectionSummary[];
  docTruncationInfo: { truncatedAt: number; totalLength: number } | null;
  onDismissField: (secKey: string, fieldKey: string, label: string) => void;
  setCurrentStep: (step: ProfileBuilderStep) => void;
  setFlowMode: (mode: FlowMode) => void;
  saveAllExtractedSections: () => Promise<void>;
  handleSubmit: () => Promise<void>;
}

// ── Your Snapshot — ONE screen for the whole fast flow. Shown right after upload,
// and still shown (now with the fuller picture) after smart-qa — never a second,
// separately-named screen. Only the CTA and header copy adapt to whether the
// founder has answered the targeted questions yet.
export function ExtractResultsScreen({
  smartQuestions, smartQaIndex, sections, extractionSummary, docTruncationInfo,
  onDismissField, setCurrentStep, setFlowMode, saveAllExtractedSections, handleSubmit,
}: ExtractResultsScreenProps) {
  const hasAnsweredAll = smartQuestions.length === 0 || smartQaIndex >= smartQuestions.length;

  // Merge all section confidenceMaps into one flat map for field-level confidence dots
  const allConfidence: Record<string, number> = {};
  for (const sec of Object.values(sections)) {
    Object.assign(allConfidence, sec.confidenceMap);
  }
  const confidenceFor = (fieldKey: string, value: string): SnapshotSnippet['confidence'] => {
    const v = allConfidence[fieldKey.split('.').pop() ?? fieldKey];
    if (v === undefined) return null;
    const conf = v >= 0.8 ? { label: 'High' as const, color: green }
      : v >= 0.5 ? { label: 'Med' as const, color: amber }
      : { label: 'Low' as const, color: red };
    // Don't show a confidence badge that just repeats the field's own value
    // (e.g. a "High" commitment field next to a "High" confidence badge).
    return value.trim().toLowerCase() === conf.label.toLowerCase() ? null : conf;
  };

  const dimensionLabels = ['Market Validation', 'Market & Competition', 'IP & Technology', 'Team & Founders', 'Financials & Impact'];
  const cards: SnapshotCard[] = extractionSummary.map((s, i) => {
    const snippets: SnapshotSnippet[] = s.extractedSnippets.map(sn => ({
      ...sn, confidence: sn.fieldKey ? confidenceFor(sn.fieldKey, sn.value) : null,
    }));
    let missing = s.missingLabels.map(m => MISSING_FIELD_LABELS[m] ?? m);
    if (i === 4) {
      // Only override with chat-derived financials once smart-qa has actually
      // produced some — otherwise trust extractionSummary's own section-5 data
      // (from the document, or already kept in sync post-answer) rather than
      // risking a field showing as both "extracted" and "missing" at once.
      const fin = (sections['5']?.extractedFields?.financial ?? {}) as Record<string, unknown>;
      if (Object.keys(fin).length > 0) {
        const finFields = [
          { label: 'MRR', key: 'mrr' }, { label: 'ARR', key: 'arr' },
          { label: 'Monthly Burn', key: 'monthlyBurn' }, { label: 'Runway (mo)', key: 'runway' },
          { label: 'Gross Margin', key: 'grossMargin' },
        ];
        const extraMissing: string[] = [];
        for (const { label, key } of finFields) {
          const val = fin[key];
          if (val != null) {
            const value = String(val);
            snippets.push({ label, value, fieldKey: `financial.${key}`, confidence: confidenceFor(`financial.${key}`, value) });
          } else {
            extraMissing.push(label);
          }
        }
        missing = extraMissing;
      }
    }
    return {
      sectionKey: s.sectionKey,
      label: dimensionLabels[i] ?? s.label,
      completionPct: s.completionPct,
      snippets,
      missing,
      narrative: s.narrativeSummary ?? null,
      willAsk: smartQuestions.some(q => q.sectionKey === s.sectionKey),
    };
  });

  const overallPct = cards.length > 0
    ? Math.round(cards.reduce((sum, c) => sum + c.completionPct, 0) / cards.length)
    : 0;

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', width: '100%', padding: '48px 40px 60px', display: 'flex', flexDirection: 'column', gap: 28 }}>

      <ProfileSnapshot
        mode={hasAnsweredAll ? 'post-qa' : 'post-upload'}
        cards={cards}
        overallPct={overallPct}
        docTruncationInfo={docTruncationInfo}
        onDismissField={onDismissField}
      />

      {hasAnsweredAll ? (
        <div style={{ display: 'flex', gap: 12, justifyContent: smartQuestions.length > 0 ? 'space-between' : 'flex-end', alignItems: 'center' }}>
          {smartQuestions.length > 0 && (
            <button
              onClick={() => setCurrentStep('smart-qa')}
              style={{ padding: '10px 18px', borderRadius: 8, border: `1px solid ${bdr}`, background: 'transparent', fontSize: 13, color: muted, cursor: 'pointer', fontFamily: 'inherit' }}
            >← Back</button>
          )}
          <button onClick={async () => { setCurrentStep(6); await saveAllExtractedSections(); await handleSubmit() }} style={{
            padding: '13px 32px', borderRadius: 10, border: 'none',
            background: blue, color: white, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: `0 4px 14px ${blue}40`,
          }}>Calculate my Q-Score →</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 2 }}>
            What would you like to do?
          </div>

          <button onClick={() => setCurrentStep('smart-qa')} style={{
            padding: '14px 24px', borderRadius: 10, border: 'none',
            background: blue, color: white, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            boxShadow: `0 4px 14px ${blue}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div>Answer {smartQuestions.length} targeted questions</div>
              <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.8, marginTop: 2 }}>
                Fills gaps in your highest-impact indicators — takes ~{smartQuestions.length * 45}s
              </div>
            </div>
            <span style={{ fontSize: 18, marginLeft: 12 }}>→</span>
          </button>

          <button onClick={async () => { setCurrentStep(6); await saveAllExtractedSections(); await handleSubmit() }} style={{
            padding: '13px 24px', borderRadius: 10,
            border: `1.5px solid ${bdr}`,
            background: 'transparent', color: ink, fontSize: 14, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div>Calculate score from documents only</div>
              <div style={{ fontSize: 12, fontWeight: 400, color: muted, marginTop: 2 }}>
                Based on what we extracted — you can always re-answer questions later
              </div>
            </div>
            <span style={{ fontSize: 18, marginLeft: 12, color: muted }}>→</span>
          </button>

          <button onClick={() => { setFlowMode('full'); setCurrentStep('pitch') }} style={{
            padding: '8px 0', background: 'transparent', border: 'none',
            fontSize: 12, color: muted, cursor: 'pointer', fontFamily: 'inherit',
            textAlign: 'center',
          }}>Fill in manually section by section →</button>
        </div>
      )}
    </div>
  );
}

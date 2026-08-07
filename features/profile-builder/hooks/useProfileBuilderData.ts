'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getSectionCompletionPct } from '@/lib/profile-builder/question-engine'
import type { FounderProfile } from '@/lib/profile-builder/question-engine'
import type { SmartQuestion } from '@/lib/profile-builder/smart-questions'
import { initSection } from '@/features/profile-builder/lib/section-state'
import type {
  Message, SectionState, SectionSummary, SubmitResult, ProfileBuilderStep, FlowMode, UploadedFile,
} from '@/features/profile-builder/types'

/**
 * Owns everything the mount-load effect touches — session/founder-profile/draft
 * restore, the fast-flow persistence blob, and the section-save + field-dismiss
 * writers that read it back. Split out of page.tsx as its own hook so the mount
 * effect (163 lines) and its five call sites aren't buried in the orchestrator.
 */
export function useProfileBuilderData() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<ProfileBuilderStep>(0)

  const [sections, setSections] = useState<Record<string, SectionState>>({
    pitch: initSection(),
    '1': initSection(), '2': initSection(), '3': initSection(),
    '4': initSection(), '5': initSection(),
  })

  const [founderProfile, setFounderProfile] = useState<FounderProfile>({
    stage: 'pre-product', industry: 'general', revenueStatus: 'pre-revenue',
  })

  const [token, setToken] = useState<string | null>(null)
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null)

  // Smart upload flow
  const [flowMode, setFlowMode] = useState<FlowMode>('full')
  const [extractionSummary, setExtractionSummary] = useState<SectionSummary[]>([])
  const [smartQuestions, setSmartQuestions] = useState<SmartQuestion[]>([])
  const [smartQaIndex, setSmartQaIndex] = useState(0)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  // ── on mount: session + founder profile + draft ───────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/founder/onboarding'); return }
      const tok = data.session.access_token
      setToken(tok)

      const { data: fp } = await supabase
        .from('founder_profiles')
        .select('stage, industry, revenue_status, company_name, profile_builder_flow, profile_builder_completed')
        .eq('user_id', data.session.user.id)
        .single()
      if (fp) {
        setFounderProfile({
          stage: fp.stage ?? 'pre-product',
          industry: fp.industry ?? 'general',
          revenueStatus: fp.revenue_status ?? 'pre-revenue',
          companyName: fp.company_name ?? undefined,
        })
        // Restore flow state — fast mode: full restore including smart-qa position
        //                      full mode: restore extractionSummary only
        let scoreReportRestored = false
        if (fp.profile_builder_flow) {
          const flow = fp.profile_builder_flow as {
            flowMode?: 'fast' | 'full'
            smartQuestions?: SmartQuestion[]
            smartQaIndex?: number
            extractionSummary?: SectionSummary[]
            currentStep?: number
            submitResult?: SubmitResult
          }
          // Restore score report first — takes priority over resuming in-progress flow
          if (flow.submitResult) {
            setSubmitResult(flow.submitResult)
            setCurrentStep(6)
            scoreReportRestored = true
          } else if (flow.flowMode === 'fast') {
            setFlowMode('fast')
            if (flow.smartQuestions?.length)    setSmartQuestions(flow.smartQuestions)
            if (flow.smartQaIndex != null)      setSmartQaIndex(flow.smartQaIndex)
            if (flow.extractionSummary?.length) setExtractionSummary(flow.extractionSummary)
            const idx   = flow.smartQaIndex ?? 0
            const total = flow.smartQuestions?.length ?? 0
            if (total > 0 && idx < total) setCurrentStep('smart-qa')
            else if (flow.extractionSummary?.length) setCurrentStep('extract-results')
          } else if (flow.extractionSummary?.length) {
            // Full mode — restore extraction results so they survive page refresh
            setExtractionSummary(flow.extractionSummary)
          }
        }

        // Fallback: if the score report wasn't in flow state (e.g. submitted before persistence fix),
        // reconstruct it from the latest qscore_history row so the Score Report tab reappears.
        if (!scoreReportRestored && fp.profile_builder_completed) {
          try {
            const { data: latestScore } = await supabase
              .from('qscore_history')
              .select('overall_score, grade, available_iq, track, iq_breakdown, reconciliation_flags, validation_warnings, ai_actions')
              .eq('user_id', data.session.user.id)
              .order('calculated_at', { ascending: false })
              .limit(1)
              .single()

            if (latestScore) {
              const breakdown = latestScore.iq_breakdown as {
                parameters?: Array<{
                  id: string; name: string; averageScore: number; weight: number
                  indicators: Array<{ id: string; name: string; rawScore: number; excluded: boolean; exclusionReason?: string; vcAlert?: string }>
                }>
                percentiles?: Record<string, { percentile: number | null; label: string }>
              } | null
              const percentiles = breakdown?.percentiles ?? {}
              const iqBreakdown = (breakdown?.parameters ?? []).map(p => ({
                id: p.id,
                name: p.name,
                weight: Math.round((p.weight ?? 0) * 100),
                averageScore: Math.round((p.averageScore ?? 0) * 10) / 10,
                indicatorsActive: (p.indicators ?? []).filter((i) => !i.excluded).length,
                indicators: (p.indicators ?? []).map(ind => ({
                  id: ind.id,
                  name: ind.name,
                  rawScore: ind.rawScore,
                  excluded: ind.excluded,
                  exclusionReason: ind.exclusionReason,
                  vcAlert: ind.vcAlert,
                  percentile: percentiles[ind.id]?.percentile ?? null,
                  percentileLabel: percentiles[ind.id]?.label,
                })),
              }))
              const aiActions = latestScore.ai_actions as { unlockCards?: SubmitResult['unlockCards']; readinessSummary?: string } | null
              const reconFlags = (latestScore.reconciliation_flags as SubmitResult['reconciliationFlags'] | null) ?? []
              const restored: SubmitResult = {
                score: latestScore.overall_score,
                grade: latestScore.grade ?? 'F',
                availableIQ: (latestScore.available_iq as number | null) ?? latestScore.overall_score,
                track: (latestScore.track as string | null) ?? undefined,
                iqBreakdown,
                reconciliationFlags: reconFlags,
                validationWarnings: (latestScore.validation_warnings as string[] | null) ?? [],
                unlockCards: aiActions?.unlockCards ?? [],
                readinessSummary: aiActions?.readinessSummary ?? '',
              }
              setSubmitResult(restored)
              setCurrentStep(6)
            }
          } catch { /* non-blocking */ }
        }
      }

      // Load draft
      try {
        const draftRes = await fetch('/api/profile-builder/draft', {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (draftRes.ok) {
          const draft = await draftRes.json()
          if (draft.sections && Object.keys(draft.sections).length > 0) {
            setSections(prev => {
              const next = { ...prev }
              for (const [sec, rawData] of Object.entries(draft.sections)) {
                const d = rawData as {
                  extractedFields?: Record<string, unknown>
                  confidenceMap?: Record<string, number>
                  completionScore?: number
                  rawConversation?: string
                }
                // Restore chat messages + LLM conversation text from saved raw_conversation
                const msgs: Message[] = []
                let restoredConversation = ''
                const restoredAskedDepthFields: string[] = []
                if (d.rawConversation) {
                  for (const line of d.rawConversation.split('\n')) {
                    if (line.startsWith('Q: ')) msgs.push({ role: 'agent', text: line.slice(3) })
                    else if (line.startsWith('A: ')) {
                      const text = line.slice(3)
                      msgs.push({ role: 'user', text })
                      restoredConversation += `\nFounder: ${text}`
                    } else if (line.startsWith('D: ')) restoredAskedDepthFields.push(line.slice(3))
                  }
                }
                next[sec] = {
                  ...initSection(),
                  extractedFields: d.extractedFields ?? {},
                  confidenceMap: d.confidenceMap ?? {},
                  completionScore: d.completionScore ?? 0,
                  isComplete: (d.completionScore ?? 0) >= 70,
                  messages: msgs,
                  conversation: restoredConversation,
                  askedDepthFields: restoredAskedDepthFields,
                }
              }
              return next
            })
          }
          // Restore the uploaded files list so it survives refresh
          if (draft.uploadedFiles && draft.uploadedFiles.length > 0) {
            setUploadedFiles(draft.uploadedFiles)
          }
        }
      } catch { /* non-blocking */ }
    })
  }, [router])

  // ── save section to DB ────────────────────────────────────────────────────
  const saveSection = useCallback(async (secNum: string, state: SectionState, tok: string) => {
    if (secNum === 'pitch') return
    // Serialize messages as Q:/A: so draft loader can restore them exactly, plus one
    // D: line per depth field already asked, so the depth tier never repeats itself
    // after a refresh or a Retake.
    const rawConversation = [
      ...state.messages.map(m => m.role === 'agent' ? `Q: ${m.text}` : `A: ${m.text}`),
      ...state.askedDepthFields.map(f => `D: ${f}`),
    ].join('\n')
    await fetch('/api/profile-builder/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify({
        section: parseInt(secNum, 10),
        rawConversation,
        extractedFields: state.extractedFields,
        confidenceMap: state.confidenceMap,
        completionScore: state.completionScore,
        uploadedDocuments: state.uploadedDocuments,
      }),
    }).catch(() => {})
  }, [])

  // A section the document extracted cleanly (no gaps, so no smart-qa question was ever
  // generated for it) was never saved by anything — saveSection only ever fires from a
  // smart-qa answer or a manual visit to that section's chat. Without this, "Calculate score
  // from documents only" (and "Calculate my Q-Score" when some sections needed no questions)
  // submits against profile_builder_data rows that were never written, and the founder sees
  // "complete at least one section" after uploading a document that visibly extracted fine.
  const saveAllExtractedSections = useCallback(async () => {
    if (!token) return
    await Promise.all(
      ['1', '2', '3', '4', '5']
        .filter(secKey => Object.keys(sections[secKey]?.extractedFields ?? {}).length > 0)
        .map(secKey => saveSection(secKey, sections[secKey], token))
    )
  }, [sections, token, saveSection])

  // ── "here's what we pulled — right?" — confirm before it counts ──────────
  // A wrong extraction shouldn't silently feed the score. Deleting a field here
  // reverts it to "missing" — it's re-asked in the normal flow, never just dropped.
  function deleteNestedField(obj: Record<string, unknown>, path: string): Record<string, unknown> {
    const parts = path.split('.')
    const clone = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>
    let cur = clone
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i]
      if (typeof cur[p] !== 'object' || cur[p] === null) return clone
      cur = cur[p] as Record<string, unknown>
    }
    delete cur[parts[parts.length - 1]]
    return clone
  }

  function dismissExtractedField(secKey: string, fieldKey: string, label: string) {
    setSections(prev => {
      const sec = prev[secKey] ?? initSection()
      const nextFields = deleteNestedField(sec.extractedFields, fieldKey)
      const pct = getSectionCompletionPct(nextFields, Number(secKey), founderProfile.stage ?? 'pre-product', sec.confidenceMap)
      const updated: SectionState = { ...sec, extractedFields: nextFields, completionScore: pct, isComplete: pct >= 70 }
      if (token) void saveSection(secKey, updated, token)
      return { ...prev, [secKey]: updated }
    })
    setExtractionSummary(prev => prev.map(s => {
      if (s.sectionKey !== secKey) return s
      return {
        ...s,
        extractedSnippets: s.extractedSnippets.filter(sn => sn.fieldKey !== fieldKey),
        missingLabels: [...s.missingLabels, label],
        extractedCount: Math.max(0, s.extractedCount - 1),
      }
    }))
  }

  // ── persist fast-flow state to DB (fire-and-forget) ──────────────────────
  const saveFlowState = useCallback((state: object | null) => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return
      supabase
        .from('founder_profiles')
        .update({ profile_builder_flow: state })
        .eq('user_id', data.session.user.id)
        .then(() => {})
    })
  }, [])

  return {
    currentStep, setCurrentStep,
    sections, setSections,
    founderProfile, setFounderProfile,
    token, setToken,
    submitResult, setSubmitResult,
    flowMode, setFlowMode,
    extractionSummary, setExtractionSummary,
    smartQuestions, setSmartQuestions,
    smartQaIndex, setSmartQaIndex,
    uploadedFiles, setUploadedFiles,
    saveSection, saveAllExtractedSections, dismissExtractedField, saveFlowState,
  }
}

'use client'

import { useState, useEffect, type RefObject, type Dispatch, type SetStateAction } from 'react'
import { generateSmartQuestions } from '@/lib/profile-builder/smart-questions'
import type { SmartQuestion } from '@/lib/profile-builder/smart-questions'
import type { FounderProfile } from '@/lib/profile-builder/question-engine'
import { initSection } from '@/features/profile-builder/lib/section-state'
import { UPLOAD_MESSAGES, MAX_UPLOAD_FILES } from '@/features/profile-builder/lib/constants'
import type {
  Message, SectionState, SectionSummary, ProfileBuilderStep, FlowMode, UploadedFile, RecalcResult,
} from '@/features/profile-builder/types'

interface UseFileUploadParams {
  currentStep: ProfileBuilderStep
  setCurrentStep: (step: ProfileBuilderStep) => void
  setSections: Dispatch<SetStateAction<Record<string, SectionState>>>
  setIsTyping: Dispatch<SetStateAction<boolean>>
  token: string | null
  founderProfile: FounderProfile
  extractionSummary: SectionSummary[]
  setExtractionSummary: Dispatch<SetStateAction<SectionSummary[]>>
  flowMode: FlowMode
  setFlowMode: Dispatch<SetStateAction<FlowMode>>
  smartQuestions: SmartQuestion[]
  setSmartQuestions: Dispatch<SetStateAction<SmartQuestion[]>>
  smartQaIndex: number
  setSmartQaIndex: Dispatch<SetStateAction<number>>
  uploadedFiles: UploadedFile[]
  setUploadedFiles: Dispatch<SetStateAction<UploadedFile[]>>
  saveSection: (secNum: string, state: SectionState, tok: string) => Promise<void>
  saveFlowState: (state: object | null) => void
  fileInputRef: RefObject<HTMLInputElement | null>
}

/**
 * Owns everything upload touches — the doc-text pool shared with chat, the
 * upload-trigger banner, and the recalc-preview pill — plus uploadOneFile
 * (the largest function in the flow) and its three callers.
 */
export function useFileUpload({
  currentStep, setCurrentStep, setSections, setIsTyping, token, founderProfile,
  extractionSummary, setExtractionSummary, flowMode, setFlowMode,
  smartQuestions, setSmartQuestions, smartQaIndex, setSmartQaIndex,
  uploadedFiles, setUploadedFiles, saveSection, saveFlowState, fileInputRef,
}: UseFileUploadParams) {
  // Extracted text from step-0 doc upload — shared across all sections
  const [globalDocText, setGlobalDocText] = useState<string>('')

  const [uploadTrigger, setUploadTrigger] = useState<string | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadMsgIdx, setUploadMsgIdx] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadWarning, setUploadWarning] = useState<string | null>(null)
  const [identityMismatch, setIdentityMismatch] = useState<{ reason: string; file: File } | null>(null)
  const [docTruncationInfo, setDocTruncationInfo] = useState<{ truncatedAt: number; totalLength: number } | null>(null)
  const [recalcLoading, setRecalcLoading] = useState(false)
  const [recalcResult, setRecalcResult] = useState<RecalcResult | null>(null)

  // Rotates every 2.2s while upload is in progress — message text comes from
  // features/profile-builder/lib/constants.ts; UploadStep derives its own doodle. Caps at the
  // last message/doodle instead of wrapping back to the first: a slow upload that outlasts one
  // full pass used to loop back to "Reading your documents…" and repeat every doodle again,
  // which reads as having restarted, not as still working.
  useEffect(() => {
    if (!uploadLoading) { setUploadMsgIdx(0); return }
    const timer = setInterval(() => setUploadMsgIdx(i => Math.min(i + 1, UPLOAD_MESSAGES.length - 1)), 2200)
    return () => clearInterval(timer)
  }, [uploadLoading])

  async function fetchWithNetworkRetry(input: RequestInfo, init: RequestInit, retries = 2): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await fetch(input, init)
      } catch (e) {
        if (attempt >= retries) throw e
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      }
    }
  }

  // ── handle file upload (single file — called in a loop for multiple) ──────
  async function uploadOneFile(file: File): Promise<void> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('section', String(typeof currentStep === 'number' ? currentStep : 0))

    // Sections 1-5: immediately show a user bubble with the filename + typing dots
    if (typeof currentStep === 'number' && currentStep >= 1) {
      const sk = String(currentStep)
      setSections(prev => {
        const sec = prev[sk] ?? initSection()
        return {
          ...prev,
          [sk]: { ...sec, messages: [...sec.messages, { role: 'user' as const, text: `📎 ${file.name}` }] },
        }
      })
      setIsTyping(true)
    }

    const res = await fetchWithNetworkRetry('/api/profile-builder/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token!}` },
      body: formData,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? `Upload failed (${res.status})`)
    }

    const data = await res.json()
    const fieldsFound: number = data.extractedPreview?.length ?? 0
    const docText: string = data.parsedText ?? ''

    // Duplicate within 60s — the server already processed this exact file.
    // Return quietly instead of falling through to a false "no data" error.
    if (data.message === 'Already processed') {
      setIsTyping(false)
      setUploadTrigger(null)
      return
    }

    // ── Step 0: distribute doc text + trigger smart flow ──
    if (currentStep === 0) {
      if (docText) setGlobalDocText(prev => prev + '\n\n' + docText)

      // Hoist SECTION_PICKS + confMap so they're available in both setSections and smart-question blocks
      const SECTION_PICKS: Record<string, string[]> = {
        '1': ['customerCommitment','conversationCount','hasPayingCustomers','payingCustomerDetail','salesCycleLength','hasRetention','retentionDetail','largestContractUsd'],
        '2': ['p2','targetCustomers','lifetimeValue'],
        '3': ['p3'],
        '4': ['p4','problemStory','advantages','hardshipStory'],
        '5': ['financial','p5'],
      }
      const globalConf: Record<string, number> = data.confidenceMap ?? {}

      if (data.extractedFields && Object.keys(data.extractedFields).length > 0) {
        setSections(prev => {
          const next = { ...prev }
          for (const secKey of ['1', '2', '3', '4', '5']) {
            const sec = next[secKey] ?? initSection()
            const merged = { ...sec.extractedFields }
            for (const [k, v] of Object.entries(data.extractedFields)) {
              if (v !== null && v !== undefined) merged[k] = v
            }
            const summary = (data.sectionSummaries as SectionSummary[] ?? []).find(s => s.sectionKey === secKey)
            // Always keep the best score seen — a second doc shouldn't lower a score from the first
            const pct = Math.max(summary?.completionPct ?? 0, sec.completionScore)
            // Build section-scoped confidence map from the global one
            const sectionConf: Record<string, number> = { ...sec.confidenceMap }
            for (const [k, v] of Object.entries(globalConf)) {
              const pickedKeys = SECTION_PICKS[secKey] ?? []
              if (pickedKeys.some(pk => k === pk || k.startsWith(pk + '.'))) {
                sectionConf[k] = v
              }
            }
            next[secKey] = { ...sec, extractedFields: merged, confidenceMap: sectionConf, completionScore: pct, isComplete: pct >= 70 }
          }
          return next
        })
      }

      // Always add the file to the uploaded list, even if no fields were extracted.
      // The block below used to be inside the extractedFields guard, so files that
      // uploaded successfully but extracted 0 fields were silently dropped from the UI.
      const newFile = { name: file.name, fields: fieldsFound, fileUrl: data.fileUrl as string | undefined }

      if (data.sectionSummaries && data.sectionSummaries.length > 0) {
        // Merge with previous extraction results — keep best completionPct per section
        setExtractionSummary(prev => {
          const merged = [...prev]
          for (const incoming of data.sectionSummaries as SectionSummary[]) {
            const idx = merged.findIndex(s => s.sectionKey === incoming.sectionKey)
            if (idx === -1) {
              merged.push(incoming)
            } else if (incoming.completionPct > merged[idx].completionPct) {
              // New doc gave a better extraction — use it but keep snippets from both
              merged[idx] = {
                ...incoming,
                extractedSnippets: [...merged[idx].extractedSnippets, ...incoming.extractedSnippets],
              }
            } else {
              // Existing is better — just add any new snippets
              merged[idx] = {
                ...merged[idx],
                extractedSnippets: [...merged[idx].extractedSnippets, ...incoming.extractedSnippets],
              }
            }
          }
          // Persist for full-mode refresh survival
          saveFlowState({ extractionSummary: merged })
          return merged
        })

        // Build section-scoped, confidence-gated fields for smart question generation.
        // Each section only sees its own relevant top-level keys, and fields with
        // confidence < 0.45 are treated as missing so questions ARE generated for them.
        const allExtracted: Record<string, unknown> = data.extractedFields ?? {}
        const confMap: Record<string, number> = globalConf
        const hasConf = Object.keys(confMap).length > 0
        // Recursively drop leaf values whose confidence key is < 0.45
        function dropLowConf(obj: Record<string, unknown>): Record<string, unknown> {
          const out: Record<string, unknown> = {}
          for (const [k, v] of Object.entries(obj)) {
            if (v === null || v === undefined) continue
            if (typeof v === 'object' && !Array.isArray(v)) {
              const nested = dropLowConf(v as Record<string, unknown>)
              if (Object.keys(nested).length) out[k] = nested
            } else {
              const c = hasConf ? (confMap[k] ?? 0) : 1
              if (c >= 0.45) out[k] = v
            }
          }
          return out
        }
        const filteredExtracted = hasConf ? dropLowConf(allExtracted) : allExtracted
        const extractedBySections: Record<string, Record<string, unknown>> = {}
        for (const secKey of ['1','2','3','4','5']) {
          const slice: Record<string, unknown> = {}
          for (const pk of SECTION_PICKS[secKey] ?? []) {
            if (pk in filteredExtracted) slice[pk] = filteredExtracted[pk]
          }
          extractedBySections[secKey] = slice
        }

        // Use gap-ranked questions from server when available (sector+stage-aware, indicator-level)
        // Fall back to client-side generateSmartQuestions only if server returned nothing.
        const PARAM_IDX_TO_SECTION: Record<number, string> = { 0:'1', 1:'2', 2:'3', 3:'4', 4:'5', 5:'5' }
        const serverGaps = (data.gapQuestions ?? []) as Array<{
          field: string; question: string; contextHint: string; helpText: string
          impact: number; paramLabel: string; paramIdx: number; quickReplies?: string[]
        }>
        let qs: SmartQuestion[]
        if (serverGaps.length > 0) {
          qs = serverGaps.map((g, i) => ({
            id: `gap_${g.field.replace(/\./g, '_')}`,
            sectionKey: PARAM_IDX_TO_SECTION[g.paramIdx] ?? '1',
            sectionLabel: g.paramLabel,
            text: g.question,
            contextHint: g.contextHint,
            helpText: g.helpText,
            priority: Math.round(g.impact * 1000) - i,
            quickReplies: g.quickReplies,
          }))
        } else {
          const sectionCompletions: Record<string, number> = {}
          for (const [key, summary] of Object.entries(data.sectionSummaries ?? {})) {
            sectionCompletions[key] = (summary as { completionPct?: number }).completionPct ?? 0
          }
          qs = generateSmartQuestions(extractedBySections, founderProfile.stage ?? 'mid', sectionCompletions, founderProfile.industry ?? undefined)
        }
        setSmartQuestions(qs)
        setSmartQaIndex(0)
        setFlowMode('fast')
        // Surface truncation info so extract-results can show "We read X of Y chars"
        if (data.docTruncated) {
          setDocTruncationInfo({ truncatedAt: data.truncatedAt as number, totalLength: data.parsedTextLength as number })
        } else {
          setDocTruncationInfo(null)
        }
        // setUploadedFiles is now called unconditionally below — don't duplicate here
        setUploadedFiles(prev => {
          const next = [...prev, newFile]
          saveFlowState({ flowMode: 'fast', smartQuestions: qs, smartQaIndex: 0, extractionSummary: data.sectionSummaries, uploadedFiles: next })
          return next
        })
        setUploadTrigger(null)
        // Degraded = data came back via fallback, not a clean AI extraction. Warn (amber), don't block.
        if (data.degraded) {
          setUploadWarning(data.degradedReason ?? 'Some data was recovered, but AI extraction was limited — please review the extracted fields carefully.')
        } else {
          setUploadWarning(null)
        }
        // Auto-advance to extraction summary so the user can see what was found
        setCurrentStep('extract-results')
        return
      }

      // No sectionSummaries — extraction failed (image PDF, missing key, scanned doc, etc.)
      // Show the error to the user instead of silently falling through.
      if (data.identityMismatch && data.extractionError) {
        setIdentityMismatch({ reason: data.extractionError, file })
        console.warn('[profile-builder] identity mismatch surfaced to user:', data.extractionError)
      } else if (data.extractionError) {
        setUploadError(`Extraction failed: ${data.extractionError}`)
        console.warn('[profile-builder] extraction error surfaced to user:', data.extractionError)
      } else {
        setUploadError('No data could be extracted from this file. Try a text-based PDF or PPTX, or answer the questions below manually.')
        console.warn('[profile-builder] extraction produced 0 fields — falling through to manual Q&A')
      }
      const qs = generateSmartQuestions({}, founderProfile?.stage ?? 'pre-product')
      setSmartQuestions(qs)
      setSmartQaIndex(0)
      setFlowMode('fast')
      setUploadedFiles(prev => {
        const next = [...prev, { ...newFile, failed: true }]
        saveFlowState({
          flowMode: 'fast',
          smartQuestions: qs,
          smartQaIndex: 0,
          extractionSummary,
          uploadedFiles: next,
        })
        return next
      })
      setUploadTrigger(null)
      return
    }

    // ── Sections 1-5: merge into current section + add agent message ──
    const secKey = String(currentStep)
    // A file that extracted nothing AND came back with an error is a real failure,
    // not "context" — surface it instead of pretending it worked.
    const extractionFailed = fieldsFound === 0 && Boolean(data.extractionError)
    if (extractionFailed && data.identityMismatch) {
      setIdentityMismatch({ reason: data.extractionError, file })
    } else if (extractionFailed) {
      setUploadError(`Couldn't read "${file.name}": ${data.extractionError}`)
    } else if (data.degraded) {
      setUploadWarning(data.degradedReason ?? 'Some data was recovered, but AI extraction was limited — please review your answers.')
    }
    setSections(prev => {
      const sec = prev[secKey] ?? initSection()
      const merged = { ...sec.extractedFields }
      if (data.extractedFields) {
        const mergeDeep = (t: Record<string, unknown>, s: Record<string, unknown>) => {
          for (const [k, v] of Object.entries(s)) {
            if (v === null || v === undefined) continue
            if (typeof v === 'object' && !Array.isArray(v) && typeof t[k] === 'object' && t[k] !== null) {
              mergeDeep(t[k] as Record<string, unknown>, v as Record<string, unknown>)
            } else { t[k] = v }
          }
        }
        mergeDeep(merged, data.extractedFields)
      }

      const agentMsg: Message = {
        role: 'agent',
        text: fieldsFound > 0
          ? `I've reviewed "${file.name}" and extracted ${fieldsFound} data points. ${data.summary ?? ''} You can continue the conversation or move on.`
          : extractionFailed
          ? `I couldn't read "${file.name}" — ${data.extractionError} You can still answer the questions below and I'll use them instead.`
          : `I've received "${file.name}" — I couldn't automatically extract structured data from it, but I'll use it as context for your answers. Continue the conversation below.`,
      }

      const updated: SectionState = {
        ...sec,
        messages: [...sec.messages, agentMsg],
        extractedFields: merged,
        confidenceMap: { ...sec.confidenceMap, ...(data.confidenceMap ?? {}) },
        uploadedDocuments: [
          ...sec.uploadedDocuments,
          { uploadId: data.uploadId ?? '', filename: file.name, fields: fieldsFound },
        ],
      }
      saveSection(secKey, updated, token!)
      return { ...prev, [secKey]: updated }
    })
    // Stop typing dots now that agent reply is in messages
    setIsTyping(false)

    setUploadedFiles(prev => {
      const next = [...prev, { name: file.name, fields: fieldsFound, failed: extractionFailed }]
      saveFlowState({ flowMode, smartQuestions, smartQaIndex, extractionSummary, uploadedFiles: next })
      return next
    })
    setUploadTrigger(null)
  }

  // ── handle one or many files sequentially (up to MAX_UPLOAD_FILES total) ──
  async function handleFileUpload(files: FileList | File[]) {
    if (!token) {
      setUploadError('Still signing you in — please wait a moment and try the upload again.')
      return
    }
    const fileArr = Array.from(files)
    if (fileArr.length === 0) return

    // Enforce file cap — only process files that fit within the remaining slot budget
    const slotsLeft = MAX_UPLOAD_FILES - uploadedFiles.length
    if (slotsLeft <= 0) {
      setUploadError(`You've already uploaded ${MAX_UPLOAD_FILES} files — the maximum allowed. Your data is already merged.`)
      return
    }
    const toProcess = fileArr.slice(0, slotsLeft)
    if (toProcess.length < fileArr.length) {
      setUploadError(`Only ${slotsLeft} more file${slotsLeft === 1 ? '' : 's'} allowed (max ${MAX_UPLOAD_FILES}). Processing the first ${toProcess.length}.`)
    }

    // Client-side size check — saves a round-trip for oversized files
    const oversized = toProcess.filter(f => f.size > 20 * 1024 * 1024)
    if (oversized.length > 0) {
      setUploadError(`${oversized.map(f => f.name).join(', ')} exceed${oversized.length === 1 ? 's' : ''} the 20 MB limit. Please compress or split the file.`)
      if (oversized.length === toProcess.length) return
    }
    const validFiles = toProcess.filter(f => f.size <= 20 * 1024 * 1024)

    setUploadLoading(true)
    setUploadWarning(null)
    setIdentityMismatch(null)
    if (slotsLeft === fileArr.length && oversized.length === 0) setUploadError(null)
    const errors: string[] = []
    for (let i = 0; i < validFiles.length; i++) {
      try {
        await uploadOneFile(validFiles[i])
      } catch (e) {
        setIsTyping(false)
        errors.push(`${validFiles[i].name}: ${e instanceof Error ? e.message : 'failed'}`)
      }
      // Stagger uploads to spread Groq API load — avoids hitting TPM/RPM rate limits on concurrent uploads
      if (i < validFiles.length - 1) {
        await new Promise(r => setTimeout(r, 1200))
      }
    }
    if (errors.length > 0) setUploadError(errors.join(' · '))
    setUploadLoading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── re-run the identity check on the same file (the check is a single LLM
  // call, not deterministic — a borderline document can plausibly pass on a
  // second look, so this is a real retry, not just a dismiss-and-reselect) ──
  async function handleRetryIdentityCheck() {
    if (!identityMismatch) return
    const file = identityMismatch.file
    setIdentityMismatch(null)
    setUploadLoading(true)
    try {
      await uploadOneFile(file)
    } catch (e) {
      setIsTyping(false)
      setUploadError(e instanceof Error ? e.message : `Couldn't retry "${file.name}" — please try again.`)
    } finally {
      setUploadLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── remove an uploaded file by index ─────────────────────────────────────
  function handleRemoveFile(index: number) {
    setUploadedFiles(prev => {
      const next = prev.filter((_, i) => i !== index)
      // Persist so it stays deleted after refresh
      saveFlowState({ flowMode: flowMode === 'fast' ? 'fast' : undefined, smartQuestions, smartQaIndex, extractionSummary, uploadedFiles: next })
      return next
    })
  }

  // ── recalculate live score after upload ──────────────────────────────────
  async function handleRecalculate() {
    if (!token) return
    setRecalcLoading(true)
    setRecalcResult(null)
    try {
      const res = await fetch('/api/profile-builder/preview', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Preview failed')
      const data = await res.json()
      setRecalcResult({ finalIQ: data.finalIQ ?? data.projectedScore ?? 0, grade: data.grade ?? '–' })
    } catch {
      // silent — button just goes back to idle
    } finally {
      setRecalcLoading(false)
    }
  }

  return {
    globalDocText,
    uploadTrigger, setUploadTrigger,
    uploadLoading,
    uploadMsgIdx,
    uploadError,
    uploadWarning,
    identityMismatch, setIdentityMismatch,
    docTruncationInfo,
    recalcLoading, recalcResult, setRecalcResult,
    handleFileUpload,
    handleRetryIdentityCheck,
    handleRemoveFile,
    handleRecalculate,
  }
}

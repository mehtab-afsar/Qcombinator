'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { shouldTriggerUpload, getInitialQuestion, getMissingFields, PITCH_SECTION_QUESTION } from '@/lib/profile-builder/question-engine'
import type { FounderProfile } from '@/lib/profile-builder/question-engine'
import { generateSmartQuestions } from '@/lib/profile-builder/smart-questions'
import type { SmartQuestion } from '@/lib/profile-builder/smart-questions'

// ── palette ───────────────────────────────────────────────────────────────────
const bdr   = '#E2DDD5'
const ink   = '#18160F'
const muted = '#8A867C'
const blue  = '#2563EB'
const green = '#16A34A'
const amber = '#D97706'
const red   = '#DC2626'

const MISSING_FIELD_LABELS: Record<string, string> = {
  customerCommitment: 'customer commitments (LOIs, pilots)',
  conversationCount: 'number of customer conversations',
  hasPayingCustomers: 'whether you have paying customers',
  hasRetention: 'retention / renewal data',
  salesCycleLength: 'typical sales cycle length',
  'p2.tamDescription': 'market size estimate (TAM)',
  'p2.marketUrgency': '"why now" catalyst',
  'p2.competitorDensityContext': 'competitive differentiation',
  'p3.hasPatent': 'patent / trade secret status',
  'p3.buildComplexity': 'how long to replicate your tech',
  'p3.technicalDepth': 'technical complexity details',
  'p4.domainYears': 'years of domain experience',
  'p4.founderMarketFit': 'founder-market fit narrative',
  'p4.teamCoverage': 'team function coverage',
  'financial.mrr': 'monthly revenue (MRR)',
  'financial.monthlyBurn': 'monthly burn rate',
  'financial.runway': 'runway in months',
}

const UPLOAD_IMPACT: Record<number, { dim: string; pts: number }> = {
  1: { dim: 'Traction',  pts: 12 },
  2: { dim: 'Market',    pts: 8  },
  3: { dim: 'Product',   pts: 10 },
  4: { dim: 'Team',      pts: 6  },
  5: { dim: 'Financial', pts: 18 },
}

const STEP_ORDER_FULL: Array<number | 'pitch' | 'extract-results' | 'smart-qa'> = [0, 'pitch', 1, 2, 3, 4, 5, 6]
const STEP_ORDER_FAST: Array<number | 'pitch' | 'extract-results' | 'smart-qa'> = [0, 'extract-results', 'smart-qa', 6]

// ── types ─────────────────────────────────────────────────────────────────────
interface Message { role: 'agent' | 'user'; text: string }

interface SectionState {
  messages: Message[]
  extractedFields: Record<string, unknown>
  confidenceMap: Record<string, number>
  completionScore: number
  uploadedDocuments: Array<{ uploadId: string; filename: string; fields: number }>
  conversation: string
  isComplete: boolean
}

interface PreviewData {
  projectedScore: number
  finalIQ: number
  availableIQ: number
  grade: string
  iqBreakdown: Array<{ id: string; name: string; averageScore: number; weight: number; indicatorsActive: number }>
  boostActions: Array<{ parameter: string; action: string; currentScore: number }>
  validationWarnings: string[]
  marketplaceUnlocked: boolean
  sectionsComplete: number
  track?: string
  scoreVersion: string
}

interface SectionSummary {
  sectionKey: string
  label: string
  completionPct: number
  extractedCount: number
  extractedSnippets: Array<{ label: string; value: string }>
  missingLabels: string[]
}

const SECTION_LABELS: Record<string, string> = {
  '0': 'Documents',
  'pitch': 'The Pitch',
  '1': 'Market Validation',
  '2': 'Market & Competition',
  '3': 'IP & Technology',
  '4': 'Team',
  '5': 'Financials & Impact',
  '6': 'Review & Submit',
}

const SECTION_DESCRIPTIONS: Record<string, string> = {
  '0': 'Optional — upload pitch decks, financial models, and other documents',
  'pitch': "What does your company do, who is it for, and why now?",
  '1': 'Customers, pilots, and willingness to pay',
  '2': 'Market size, urgency, and competitive landscape',
  '3': 'Patents, technical depth, and build complexity',
  '4': 'Domain expertise, team composition, and experience',
  '5': 'Revenue, burn rate, runway, and impact signals',
  '6': 'Review your profile and calculate your Q-Score',
}

function initSection(): SectionState {
  return {
    messages: [], extractedFields: {}, confidenceMap: {},
    completionScore: 0, uploadedDocuments: [], conversation: '',
    isComplete: false,
  }
}

// ── main component ────────────────────────────────────────────────────────────
export default function ProfileBuilderPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<number | 'pitch' | 'extract-results' | 'smart-qa'>(0)

  const [sections, setSections] = useState<Record<string, SectionState>>({
    pitch: initSection(),
    '1': initSection(), '2': initSection(), '3': initSection(),
    '4': initSection(), '5': initSection(),
  })

  const [founderProfile, setFounderProfile] = useState<FounderProfile>({
    stage: 'pre-product', industry: 'general', revenueStatus: 'pre-revenue',
  })

  // Extracted text from step-0 doc upload — shared across all sections
  const [globalDocText, setGlobalDocText] = useState<string>('')

  const [token, setToken] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ score: number; grade: string } | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Smart upload flow
  const [flowMode, setFlowMode] = useState<'fast' | 'full'>('full')
  const [extractionSummary, setExtractionSummary] = useState<SectionSummary[]>([])
  const [smartQuestions, setSmartQuestions] = useState<SmartQuestion[]>([])
  const [smartQaIndex, setSmartQaIndex] = useState(0)
  const [smartInput, setSmartInput] = useState('')
  const [smartProcessing, setSmartProcessing] = useState(false)

  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [uploadTrigger, setUploadTrigger] = useState<string | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; fields: number }>>([])
  const [recalcLoading, setRecalcLoading] = useState(false)
  const [recalcResult, setRecalcResult] = useState<{ finalIQ: number; grade: string } | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── on mount: session + founder profile + draft ───────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/founder/onboarding'); return }
      const tok = data.session.access_token
      setToken(tok)

      const { data: fp } = await supabase
        .from('founder_profiles')
        .select('stage, industry, revenue_status, company_name')
        .eq('user_id', data.session.user.id)
        .single()
      if (fp) {
        setFounderProfile({
          stage: fp.stage ?? 'pre-product',
          industry: fp.industry ?? 'general',
          revenueStatus: fp.revenue_status ?? 'pre-revenue',
          companyName: fp.company_name ?? undefined,
        })
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
                }
                next[sec] = {
                  ...initSection(),
                  extractedFields: d.extractedFields ?? {},
                  confidenceMap: d.confidenceMap ?? {},
                  completionScore: d.completionScore ?? 0,
                  isComplete: (d.completionScore ?? 0) >= 70,
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

  // ── auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sections, isTyping, currentStep])

  // ── fire initial question when entering a section ─────────────────────────
  const sectionKey = String(currentStep)
  useEffect(() => {
    const isConvo = currentStep === 'pitch' ||
      (typeof currentStep === 'number' && currentStep >= 1 && currentStep <= 5)
    if (!isConvo) return
    const sec = sections[sectionKey]
    if (!sec || sec.messages.length > 0) return  // already has messages (draft or started)

    let initialQ: string
    if (currentStep === 'pitch') {
      initialQ = PITCH_SECTION_QUESTION
    } else {
      const hasExtracted = Object.keys(sec.extractedFields ?? {}).length > 0
      if (hasExtracted) {
        if (sec.completionScore >= 70) {
          initialQ = `I extracted this section from your documents and it looks complete (${sec.completionScore}%). Feel free to add more detail or move on.`
        } else {
          // Build context-aware question using what's already known vs what's missing
          const missing = getMissingFields(sec.extractedFields, currentStep, founderProfile.stage ?? 'pre-product')
          const missingLabels = missing
            .map(f => MISSING_FIELD_LABELS[f])
            .filter(Boolean)
            .slice(0, 3)
          if (missingLabels.length > 0) {
            initialQ = `I extracted some info from your documents, but still need a few things: ${missingLabels.join(', ')}. Can you fill in the gaps?`
          } else {
            initialQ = getInitialQuestion(currentStep, founderProfile)
          }
        }
      } else {
        initialQ = getInitialQuestion(currentStep, founderProfile)
      }
    }

    setSections(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], messages: [{ role: 'agent', text: initialQ }] },
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, sectionKey])

  // ── redirect from smart-qa if no questions remain ────────────────────────
  useEffect(() => {
    if (currentStep === 'smart-qa' && smartQuestions.length > 0 && smartQaIndex >= smartQuestions.length) {
      setCurrentStep(6)
    }
  }, [currentStep, smartQaIndex, smartQuestions.length])

  // ── preview data for step 6 ───────────────────────────────────────────────
  useEffect(() => {
    if (currentStep !== 6 || !token) return
    setPreviewLoading(true)
    fetch('/api/profile-builder/preview', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setPreviewData)
      .catch(() => {})
      .finally(() => setPreviewLoading(false))
  }, [currentStep, token])

  // ── save section to DB ────────────────────────────────────────────────────
  const saveSection = useCallback(async (secNum: string, state: SectionState, tok: string) => {
    if (secNum === 'pitch') return
    await fetch('/api/profile-builder/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify({
        section: parseInt(secNum, 10),
        rawConversation: state.conversation,
        extractedFields: state.extractedFields,
        confidenceMap: state.confidenceMap,
        completionScore: state.completionScore,
        uploadedDocuments: state.uploadedDocuments,
      }),
    }).catch(() => {})
  }, [])

  // ── handle user message ───────────────────────────────────────────────────
  async function handleSend() {
    if (!input.trim() || !token || isTyping) return
    const key = String(currentStep)
    const userText = input.trim()
    setInput('')
    setUploadTrigger(null)

    // Append user message immediately
    setSections(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        messages: [...(prev[key]?.messages ?? []), { role: 'user' as const, text: userText }],
        conversation: (prev[key]?.conversation ?? '') + `\nFounder: ${userText}`,
      },
    }))

    // Pitch: local clarity evaluation
    if (currentStep === 'pitch') {
      setIsTyping(true)
      await new Promise(r => setTimeout(r, 500))
      const words = userText.split(/\s+/).length
      const hasProblem = /problem|pain|issue|struggle|hard|broken|fail|challenge/i.test(userText)
      const hasWho = /we |our |company|startup|for |customer|user|team|built/i.test(userText) || words > 8
      const hasNow = /now|today|2020|2021|2022|2023|2024|2025|ai|llm|remote|cloud|pandemic|recent/i.test(userText)
      const clarity = Math.min(100,
        (words > 20 ? 40 : words > 10 ? 25 : 10) +
        (hasProblem ? 20 : 0) + (hasWho ? 20 : 0) + (hasNow ? 20 : 0)
      )
      const done = clarity >= 60 && hasNow
      const reply = done
        ? "Clear pitch — problem, customer, and timing are all present. Move on to Market Validation."
        : !hasNow
          ? "Good start. What changed in the world recently that makes this the right moment to build this?"
          : "Help me understand: who exactly has this problem, and what happens to them if they don't solve it?"

      setSections(prev => ({
        ...prev,
        pitch: {
          ...prev['pitch'],
          messages: [...(prev['pitch']?.messages ?? []), { role: 'agent' as const, text: reply }],
          completionScore: clarity,
          isComplete: done,
        },
      }))
      setIsTyping(false)
      return
    }

    // Check upload trigger
    const uploadPrompt = typeof currentStep === 'number' ? shouldTriggerUpload(userText, currentStep) : null
    if (uploadPrompt) setUploadTrigger(uploadPrompt)

    setIsTyping(true)

    try {
      // Build conversation from current state (includes the message we just added)
      const currentSec = sections[key] ?? initSection()
      const conversation = currentSec.conversation + `\nFounder: ${userText}`

      const res = await fetch('/api/profile-builder/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          section: parseInt(key, 10),
          conversationText: conversation,
          uploadedDocumentText: globalDocText || undefined,
          founderProfile,
          existingExtracted: currentSec.extractedFields,
        }),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        console.error('[extract 500 detail]', errBody)
        throw new Error(`Extract failed: ${res.status} — ${errBody.detail ?? errBody.error ?? ''}`)
      }
      const extracted = await res.json()

      const pct: number = extracted.completionScore ?? 0
      const agentReply: string =
        extracted.followUpQuestion ??
        (pct >= 70
          ? "I have what I need for this section. Feel free to add more detail or move to the next section."
          : "Tell me more — the more specific you are, the higher your score.")

      setSections(prev => {
        const sec = prev[key] ?? initSection()
        const updated: SectionState = {
          ...sec,
          extractedFields: extracted.mergedFields ?? sec.extractedFields,
          confidenceMap: { ...sec.confidenceMap, ...(extracted.confidenceMap ?? {}) },
          completionScore: pct,
          conversation,
          isComplete: pct >= 70,
          messages: [...sec.messages, { role: 'agent' as const, text: agentReply }],
        }
        saveSection(key, updated, token)
        return { ...prev, [key]: updated }
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong'
      setSections(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          messages: [
            ...(prev[key]?.messages ?? []),
            { role: 'agent' as const, text: `Sorry, I had trouble processing that (${msg}). Try again.` },
          ],
        },
      }))
    } finally {
      setIsTyping(false)
    }
  }

  // ── handle file upload (single file — called in a loop for multiple) ──────
  async function uploadOneFile(file: File): Promise<void> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('section', String(typeof currentStep === 'number' ? currentStep : 0))

    const res = await fetch('/api/profile-builder/upload', {
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

    // ── Step 0: distribute doc text + trigger smart flow ──
    if (currentStep === 0) {
      if (docText) setGlobalDocText(prev => prev + '\n\n' + docText)

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
            const pct = summary?.completionPct ?? sec.completionScore
            next[secKey] = { ...sec, extractedFields: merged, completionScore: pct, isComplete: pct >= 70 }
          }
          return next
        })
      }

      if (data.sectionSummaries && data.sectionSummaries.length > 0) {
        setExtractionSummary(data.sectionSummaries)
        const extractedBySections: Record<string, Record<string, unknown>> = {}
        for (const s of data.sectionSummaries as SectionSummary[]) {
          extractedBySections[s.sectionKey] = data.extractedFields ?? {}
        }
        const qs = generateSmartQuestions(extractedBySections, founderProfile.stage ?? 'mid')
        setSmartQuestions(qs)
        setSmartQaIndex(0)
        setFlowMode('fast')
      }

      setUploadedFiles(prev => [...prev, { name: file.name, fields: fieldsFound }])
      setUploadTrigger(null)
      return
    }

    // ── Sections 1-5: merge into current section + add agent message ──
    const secKey = String(currentStep)
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

    setUploadedFiles(prev => [...prev, { name: file.name, fields: fieldsFound }])
    setUploadTrigger(null)
  }

  // ── handle one or many files sequentially ────────────────────────────────
  async function handleFileUpload(files: FileList | File[]) {
    if (!token) return
    const fileArr = Array.from(files)
    if (fileArr.length === 0) return
    setUploadLoading(true)
    setUploadError(null)
    const errors: string[] = []
    for (const file of fileArr) {
      try {
        await uploadOneFile(file)
      } catch (e) {
        errors.push(`${file.name}: ${e instanceof Error ? e.message : 'failed'}`)
      }
    }
    if (errors.length > 0) setUploadError(errors.join(' · '))
    setUploadLoading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!token) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/profile-builder/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error ?? 'Submission failed')
        return
      }
      setSubmitResult({ score: data.score, grade: data.grade })
      setTimeout(() => router.push('/founder/dashboard'), 3000)
    } catch {
      setSubmitError('Network error — please try again')
    } finally {
      setIsSubmitting(false)
    }
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

  const completedCount = ['1','2','3','4','5'].filter(k => sections[k]?.isComplete).length
  const canSubmit = completedCount >= 3

  const STEP_ORDER = flowMode === 'fast' ? STEP_ORDER_FAST : STEP_ORDER_FULL
  const stepIdx = STEP_ORDER.indexOf(currentStep)
  const prevStep = stepIdx > 0 ? STEP_ORDER[stepIdx - 1] : null
  const nextStep = stepIdx < STEP_ORDER.length - 1 ? STEP_ORDER[stepIdx + 1] : null

  // Progress dots reflect active flow
  const PROGRESS_STEPS = STEP_ORDER
  const progressIdx = PROGRESS_STEPS.indexOf(currentStep)

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── Minimal fixed header ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        borderBottom: `1px solid ${bdr}`, background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(8px)', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: ink, letterSpacing: '-0.01em' }}>
          Edge Alpha
        </span>

        {/* Progress dots — centered */}
        {progressIdx >= 0 && (
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {PROGRESS_STEPS.map((step) => {
              const key = String(step)
              const isDone = (
                step === 'pitch' ? (sections['pitch']?.isComplete ?? false)
                : typeof step === 'number' && step >= 1 && step <= 5 ? (sections[key]?.isComplete ?? false)
                : step === 'extract-results' ? extractionSummary.length > 0
                : step === 'smart-qa' ? smartQaIndex >= smartQuestions.length && smartQuestions.length > 0
                : false
              )
              const isActive = step === currentStep
              return (
                <button
                  key={key}
                  onClick={() => setCurrentStep(step as number | 'pitch' | 'extract-results' | 'smart-qa')}
                  title={SECTION_LABELS[key] ?? key}
                  style={{
                    height: 6, borderRadius: 3, border: 'none', cursor: 'pointer', padding: 0,
                    transition: 'all 0.25s ease',
                    width: isActive ? 24 : 6,
                    background: isDone ? green : isActive ? blue : bdr,
                  }}
                />
              )
            })}
          </div>
        )}

        <button
          onClick={() => router.push('/founder/dashboard')}
          style={{
            fontSize: 13, color: muted, background: 'none', border: 'none',
            cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px',
          }}
        >
          Save & Exit
        </button>
      </header>

      {/* ── Main layout (offset by header) ── */}
      <div style={{ paddingTop: 52, minHeight: '100vh', display: 'flex' }}>

        {/* ── Collapsible left sidebar ── */}
        <div style={{
          width: sidebarOpen ? 220 : 0,
          minWidth: sidebarOpen ? 220 : 0,
          overflow: 'hidden',
          transition: 'width 0.25s ease, min-width 0.25s ease',
          borderRight: `1px solid ${bdr}`,
          background: '#fafafa',
          position: 'sticky',
          top: 52,
          height: 'calc(100vh - 52px)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '24px 16px 16px', opacity: sidebarOpen ? 1 : 0, transition: 'opacity 0.15s', whiteSpace: 'nowrap', overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Sections</div>
            {[
              { key: '0',               label: 'Documents',          icon: '📁' },
              ...(flowMode === 'fast' ? [
                { key: 'extract-results', label: 'Extraction Results', icon: '📊' },
                { key: 'smart-qa',        label: 'Quick Questions',   icon: '💬' },
              ] : [
                { key: 'pitch',           label: 'Your Pitch',         icon: '🎯' },
              ]),
              { key: '1',     label: 'Market & Customers', icon: '👥' },
              { key: '2',     label: 'Market Potential',   icon: '📈' },
              { key: '3',     label: 'IP & Defensibility', icon: '🔒' },
              { key: '4',     label: 'Founder & Team',     icon: '🧑‍💼' },
              { key: '5',     label: 'Financials',         icon: '💰' },
              { key: '6',     label: 'Review & Submit',    icon: '✅' },
            ].map(({ key, label, icon }) => {
              const isActive = String(currentStep) === key
              const sec = sections[key]
              const pct = (key === '0' || key === 'pitch' || key === '6' || key === 'extract-results' || key === 'smart-qa') ? null : (sec?.completionScore ?? 0)
              const isDone = pct !== null && pct >= 70
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (key === '0') setCurrentStep(0)
                    else if (key === 'pitch') setCurrentStep('pitch')
                    else if (key === 'extract-results') setCurrentStep('extract-results')
                    else if (key === 'smart-qa') setCurrentStep('smart-qa')
                    else if (key === '6') setCurrentStep(6)
                    else setCurrentStep(parseInt(key, 10))
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '8px 10px', borderRadius: 8,
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: isActive ? '#EFF6FF' : 'transparent',
                    marginBottom: 2, transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f0f0f0' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? blue : ink, lineHeight: 1.3 }}>{label}</div>
                    {pct !== null && (
                      <div style={{ marginTop: 4 }}>
                        <div style={{ height: 3, background: bdr, borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: isDone ? green : blue, borderRadius: 2, transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    )}
                  </div>
                  {isDone && <span style={{ fontSize: 11, color: green, fontWeight: 700 }}>✓</span>}
                </button>
              )
            })}

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${bdr}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Parameters</div>
              {[
                { label: 'P1 Market Readiness',  key: '1' },
                { label: 'P2 Market Potential',  key: '2' },
                { label: 'P3 IP & Moat',         key: '3' },
                { label: 'P4 Founder / Team',    key: '4' },
                { label: 'P5 Impact',            key: '5' },
                { label: 'P6 Financials',        key: '5' },
              ].map(({ label, key }, i) => {
                const pct = (sections[key]?.completionScore ?? 0)
                return (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: muted }}>{label}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: pct >= 70 ? green : ink }}>{pct}%</span>
                    </div>
                    <div style={{ height: 3, background: bdr, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: pct >= 70 ? green : amber, borderRadius: 2, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Toggle sidebar button ── */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{
            position: 'fixed', top: 62, left: sidebarOpen ? 208 : 8,
            zIndex: 40, width: 24, height: 24, borderRadius: '50%',
            border: `1px solid ${bdr}`, background: '#fff',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, color: muted, transition: 'left 0.25s ease',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
        >
          {sidebarOpen ? '‹' : '›'}
        </button>

        {/* ── Main content ── */}
        <main style={{ flex: 1, minHeight: 'calc(100vh - 52px)', display: 'flex', flexDirection: 'column' }}>
      <AnimatePresence mode="wait">
      <motion.div
        key={String(currentStep)}
        initial={{ opacity: 0, x: 16, filter: 'blur(3px)' }}
        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, x: -16, filter: 'blur(3px)' }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
      >

        {/* ── STEP 0: Document Upload ── */}
        {currentStep === 0 && (
          <div style={{ maxWidth: 560, margin: '0 auto', width: '100%', padding: '56px 24px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                Upload documents
              </h2>
              <p style={{ fontSize: 14, color: muted, margin: '0 0 16px', lineHeight: 1.6 }}>
                We&apos;ll extract data automatically and pre-fill your profile. The more specific your docs, the higher your score.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {[
                  { icon: '📊', label: 'Pitch deck', note: 'Best for market + team' },
                  { icon: '💰', label: 'Financial model', note: 'MRR, burn, runway' },
                  { icon: '📋', label: 'Business plan', note: 'Full coverage' },
                  { icon: '🤝', label: 'LOI / contracts', note: 'Customer traction' },
                  { icon: '👥', label: 'Team bios / CV', note: 'Team section' },
                  { icon: '🔬', label: 'Technical spec', note: 'IP + defensibility' },
                ].map(({ icon, label, note }) => (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
                    borderRadius: 20, border: `1px solid ${bdr}`, background: '#fafafa',
                    fontSize: 12, color: ink,
                  }}>
                    <span>{icon}</span>
                    <span style={{ fontWeight: 600 }}>{label}</span>
                    <span style={{ color: muted }}>— {note}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${bdr}`, borderRadius: 16, padding: '48px 32px',
                textAlign: 'center', background: '#fafafa', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = blue; e.currentTarget.style.background = '#EFF6FF' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.background = '#fafafa' }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>{uploadLoading ? '⏳' : '📁'}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: ink, marginBottom: 6 }}>
                {uploadLoading ? 'Uploading and extracting…' : 'Drop files or click to upload'}
              </div>
              <div style={{ fontSize: 13, color: muted }}>PDF, PPTX, XLSX, CSV, PNG, JPG — max 10 MB each · multiple files supported</div>
            </div>

            {uploadError && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: `1px solid #FECACA`, fontSize: 13, color: red }}>
                {uploadError}
              </div>
            )}

            {uploadedFiles.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Uploaded</div>
                {uploadedFiles.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 10, background: '#fafafa',
                    border: `1px solid ${bdr}`, marginBottom: 6,
                  }}>
                    <span style={{ fontSize: 18 }}>📄</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: ink }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: f.fields > 0 ? green : muted, marginTop: 2 }}>
                        {f.fields > 0 ? `${f.fields} fields extracted` : 'Stored as context'}
                      </div>
                    </div>
                    <span style={{ fontSize: 13, color: green }}>✓</span>
                  </div>
                ))}

                {/* Recalculate score after upload */}
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={handleRecalculate}
                    disabled={recalcLoading}
                    style={{
                      padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${bdr}`,
                      background: recalcLoading ? bdr : '#fff', color: ink,
                      fontSize: 13, fontWeight: 500, cursor: recalcLoading ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {recalcLoading ? '⏳ Calculating…' : '⚡ Preview score impact'}
                  </button>
                  {recalcResult && (
                    <div style={{
                      padding: '6px 12px', borderRadius: 8,
                      background: '#F0FDF4', border: `1px solid #A7F3D0`,
                      fontSize: 13, fontWeight: 600, color: green,
                    }}>
                      IQ {recalcResult.finalIQ} · {recalcResult.grade}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={() => setCurrentStep(flowMode === 'fast' && uploadedFiles.length > 0 ? 'extract-results' : 'pitch')}
                style={{
                  padding: '12px 28px', borderRadius: 10, border: 'none',
                  background: blue, color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {flowMode === 'fast' && uploadedFiles.length > 0
                  ? 'See what we found →'
                  : uploadedFiles.length > 0 ? 'Continue →' : 'Skip, answer questions →'
                }
              </button>
            </div>
          </div>
        )}

        {/* ── PITCH + SECTIONS 1-5: Chat ── */}
        {(currentStep === 'pitch' || (typeof currentStep === 'number' && currentStep >= 1 && currentStep <= 5)) && (() => {
          const key = String(currentStep)
          const sec = sections[key] ?? initSection()
          const impact = typeof currentStep === 'number' ? UPLOAD_IMPACT[currentStep] : undefined
          const isSection5 = currentStep === 5
          const mentionsRevenue = isSection5 && /\$[\d,]+|\d+k?\s*mrr|\d+\s*k\s*per\s*month/i.test(sec.conversation)
          const stripeVisible = isSection5 && mentionsRevenue && sec.uploadedDocuments.length === 0

          return (
            <div style={{ maxWidth: 640, margin: '0 auto', width: '100%', padding: '48px 24px 0', display: 'flex', flexDirection: 'column', flex: 1 }}>

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
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: muted }}>Section completion</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: sec.completionScore >= 70 ? green : muted }}>
                      {sec.completionScore}%{sec.completionScore >= 70 ? ' · Complete ✓' : ''}
                    </span>
                  </div>
                  <div style={{ height: 3, background: bdr, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 2, transition: 'width 0.5s ease',
                      width: `${sec.completionScore}%`,
                      background: sec.completionScore >= 70 ? green : blue,
                    }} />
                  </div>
                </div>
              )}

              {/* Pitch warning */}
              {currentStep === 'pitch' && sec.completionScore > 0 && sec.completionScore < 60 && (
                <div style={{
                  marginBottom: 16, padding: '10px 14px', borderRadius: 8,
                  background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: 13, color: '#92400E',
                }}>
                  Name the customer, the problem, and why now — investors need all three.
                </div>
              )}

              {/* Chat messages */}
              <div style={{
                flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
                gap: 12, minHeight: 260, maxHeight: 400, padding: '4px 0',
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
                      background: msg.role === 'user' ? blue : '#f5f5f5',
                      color: msg.role === 'user' ? '#fff' : ink,
                      borderRadius: msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                    }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div style={{ display: 'flex', gap: 5, padding: '12px 14px', width: 64,
                    background: '#f5f5f5', borderRadius: '4px 14px 14px 14px' }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{
                        width: 7, height: 7, borderRadius: '50%', background: '#ccc',
                        animation: `bounce 0.6s ${i * 0.15}s infinite`,
                      }} />
                    ))}
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Upload trigger */}
              {uploadTrigger && (
                <div style={{
                  margin: '12px 0', padding: '12px 16px', borderRadius: 10,
                  background: '#FFF7ED', border: '1px solid #FED7AA',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <span style={{ fontSize: 16 }}>📊</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#92400E' }}>{uploadTrigger}</div>
                    {impact && (
                      <div style={{ fontSize: 11, color: amber, marginTop: 2, fontWeight: 600 }}>
                        Upload to verify → boost {impact.dim} +{impact.pts} pts
                      </div>
                    )}
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} style={{
                    padding: '6px 14px', borderRadius: 6, border: 'none',
                    background: amber, color: '#fff', fontSize: 12,
                    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}>Upload</button>
                </div>
              )}

              {/* Recalculate after section doc upload */}
              {sec.uploadedDocuments.length > 0 && (
                <div style={{ margin: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={handleRecalculate}
                    disabled={recalcLoading}
                    style={{
                      padding: '6px 14px', borderRadius: 7, border: `1.5px solid ${bdr}`,
                      background: '#fff', color: ink, fontSize: 12, fontWeight: 500,
                      cursor: recalcLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    {recalcLoading ? '⏳' : '⚡'} {recalcLoading ? 'Calculating…' : 'Preview score impact'}
                  </button>
                  {recalcResult && (
                    <span style={{
                      padding: '4px 10px', borderRadius: 6,
                      background: '#F0FDF4', border: `1px solid #A7F3D0`,
                      fontSize: 12, fontWeight: 600, color: green,
                    }}>
                      IQ {recalcResult.finalIQ} · {recalcResult.grade}
                    </span>
                  )}
                </div>
              )}

              {/* Stripe card */}
              {stripeVisible && (
                <div style={{
                  margin: '8px 0', border: `1px solid ${bdr}`, borderRadius: 10, padding: '12px 16px',
                  background: '#fafafa', display: 'flex', gap: 12, alignItems: 'center',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: ink }}>Connect Stripe for verified MRR</div>
                    <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>Highest data credibility — +18 pts vs self-reported</div>
                  </div>
                  <button onClick={() => router.push('/founder/cxo?agent=felix')} style={{
                    padding: '7px 12px', borderRadius: 6, border: `1px solid ${bdr}`,
                    background: 'transparent', fontSize: 12, color: blue,
                    cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit', whiteSpace: 'nowrap',
                  }}>Connect →</button>
                </div>
              )}

              {/* Input area */}
              <div style={{ padding: '16px 0 20px', borderTop: `1px solid ${bdr}`, marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                    }}
                    placeholder={
                      currentStep === 'pitch'
                        ? "Describe your company in 2-3 sentences…"
                        : "Type your answer… (Enter to send, Shift+Enter for new line)"
                    }
                    rows={3}
                    disabled={isTyping}
                    style={{
                      flex: 1, padding: '11px 14px', borderRadius: 10,
                      border: `1.5px solid ${bdr}`, background: '#fff',
                      fontSize: 14, color: ink, resize: 'none', fontFamily: 'inherit',
                      outline: 'none', transition: 'border-color 0.15s',
                      opacity: isTyping ? 0.7 : 1,
                    }}
                    onFocus={e => (e.target.style.borderColor = blue)}
                    onBlur={e => (e.target.style.borderColor = bdr)}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isTyping}
                      style={{
                        padding: '11px 20px', borderRadius: 8, border: 'none',
                        background: (!input.trim() || isTyping) ? bdr : blue,
                        color: '#fff', fontWeight: 600,
                        cursor: (!input.trim() || isTyping) ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', fontSize: 14,
                      }}
                    >{isTyping ? '…' : 'Send'}</button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      title={
                        currentStep === 1 ? 'Upload CRM export, pilot agreement, or LOI'
                        : currentStep === 2 ? 'Upload market research or competitor analysis'
                        : currentStep === 3 ? 'Upload patent filings, technical spec, or architecture doc'
                        : currentStep === 4 ? 'Upload team CVs or org chart'
                        : currentStep === 5 ? 'Upload financial model, P&L, or Stripe export'
                        : 'Upload supporting document'
                      }
                      style={{
                        padding: '8px 14px', borderRadius: 8,
                        border: `1.5px solid ${bdr}`, background: '#fafafa',
                        cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: muted,
                      }}
                    >📎</button>
                  </div>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 12, color: muted }}>
                  Enter to send · Shift+Enter for new line
                </p>
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
                    background: blue, color: '#fff', fontSize: 13,
                    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >{currentStep === 5 ? 'Review & Submit →' : 'Next →'}</button>
              </div>
            </div>
          )
        })()}

        {/* ── EXTRACT RESULTS ── */}
        {currentStep === 'extract-results' && (
          <div style={{ maxWidth: 600, margin: '0 auto', width: '100%', padding: '48px 24px 60px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ textAlign: 'center', marginBottom: 4 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                Here&apos;s what we found
              </h2>
              <p style={{ fontSize: 14, color: muted, margin: 0, lineHeight: 1.6 }}>
                {extractionSummary.reduce((s, x) => s + x.extractedCount, 0)} fields auto-filled across {extractionSummary.filter(x => x.completionPct > 0).length} sections
              </p>
            </div>

            {extractionSummary.map(s => {
              const isDone = s.completionPct >= 70
              return (
                <div key={s.sectionKey} style={{
                  borderRadius: 12, border: `1px solid ${isDone ? green + '55' : bdr}`,
                  background: isDone ? '#F0FDF4' : '#fafafa', padding: '16px 20px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: ink }}>{s.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isDone ? green : muted }}>{s.completionPct}%</span>
                      {isDone && <span style={{ fontSize: 12, color: green, fontWeight: 700 }}>Complete ✓</span>}
                    </div>
                  </div>
                  <div style={{ height: 4, background: bdr, borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
                    <div style={{ height: '100%', width: `${s.completionPct}%`, background: isDone ? green : blue, borderRadius: 2, transition: 'width 0.5s ease' }} />
                  </div>
                  {s.extractedSnippets.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: s.missingLabels.length > 0 ? 8 : 0 }}>
                      {s.extractedSnippets.map((snip, i) => (
                        <span key={i} style={{
                          fontSize: 11, padding: '3px 8px', borderRadius: 20,
                          background: '#D1FAE5', color: '#065F46', fontWeight: 500,
                        }}>✓ {snip.label}: {snip.value}</span>
                      ))}
                    </div>
                  )}
                  {s.missingLabels.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {s.missingLabels.map((m, i) => (
                        <span key={i} style={{
                          fontSize: 11, padding: '3px 8px', borderRadius: 20,
                          background: '#FEF3C7', color: '#92400E', fontWeight: 500,
                        }}>⚠ {m}</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {smartQuestions.length > 0 && (
              <div style={{ padding: '16px 20px', borderRadius: 12, background: '#EFF6FF', border: `1px solid ${blue}22` }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: blue, marginBottom: 4 }}>
                  {smartQuestions.length} quick {smartQuestions.length === 1 ? 'question' : 'questions'} to fill the gaps
                </div>
                <div style={{ fontSize: 13, color: muted }}>Estimated time: 3–5 minutes</div>
              </div>
            )}
            {smartQuestions.length === 0 && (
              <div style={{ padding: '16px 20px', borderRadius: 12, background: '#F0FDF4', border: `1px solid ${green}44` }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: green }}>All critical fields covered from your documents!</div>
                <div style={{ fontSize: 13, color: muted, marginTop: 2 }}>You can go straight to review & submit.</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
              <button onClick={() => { setFlowMode('full'); setCurrentStep('pitch') }} style={{
                padding: '10px 20px', borderRadius: 8, border: `1px solid ${bdr}`,
                background: 'transparent', fontSize: 13, color: muted,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Explore sections manually</button>
              <button onClick={() => setCurrentStep(smartQuestions.length > 0 ? 'smart-qa' : 6)} style={{
                padding: '12px 28px', borderRadius: 10, border: 'none',
                background: blue, color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {smartQuestions.length > 0 ? `Answer ${smartQuestions.length} questions →` : 'Review & Submit →'}
              </button>
            </div>
          </div>
        )}

        {/* ── SMART Q&A ── */}
        {currentStep === 'smart-qa' && (() => {
          const q = smartQuestions[smartQaIndex]
          // If no questions remain, redirect to review — done via useEffect, render null here
          if (!q) return null
          const isLast = smartQaIndex === smartQuestions.length - 1
          const progressPct = Math.round(((smartQaIndex) / smartQuestions.length) * 100)

          const handleSmartNext = async () => {
            if (!smartInput.trim() || !token) return
            setSmartProcessing(true)
            try {
              const res = await fetch('/api/profile-builder/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  section: parseInt(q.sectionKey, 10),
                  conversationText: `${q.text}\n\nAnswer: ${smartInput}`,
                  founderProfile,
                  existingExtracted: sections[q.sectionKey]?.extractedFields ?? {},
                }),
              })
              if (res.ok) {
                const data = await res.json()
                const secKey = q.sectionKey
                setSections(prev => {
                  const sec = prev[secKey] ?? initSection()
                  const updated: SectionState = {
                    ...sec,
                    extractedFields: data.mergedFields ?? sec.extractedFields,
                    completionScore: data.completionScore ?? sec.completionScore,
                    isComplete: (data.completionScore ?? sec.completionScore) >= 70,
                    conversation: (sec.conversation ? sec.conversation + '\n' : '') + `Q: ${q.text}\nA: ${smartInput}`,
                  }
                  if (token) saveSection(secKey, updated, token)
                  return { ...prev, [secKey]: updated }
                })
              }
            } catch (e) {
              console.warn('smart-qa extract failed:', e)
            } finally {
              setSmartProcessing(false)
              setSmartInput('')
              if (isLast) setCurrentStep(6)
              else setSmartQaIndex(i => i + 1)
            }
          }

          return (
            <div style={{ maxWidth: 560, margin: '0 auto', width: '100%', padding: '48px 24px 60px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Progress */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: muted }}>Question {smartQaIndex + 1} of {smartQuestions.length}</span>
                  <span style={{ fontSize: 12, color: muted }}>{progressPct}%</span>
                </div>
                <div style={{ height: 4, background: bdr, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progressPct}%`, background: blue, borderRadius: 2, transition: 'width 0.3s ease' }} />
                </div>
              </div>

              {/* Section badge */}
              <div>
                <span style={{
                  display: 'inline-block', fontSize: 11, fontWeight: 600,
                  padding: '3px 10px', borderRadius: 20,
                  background: '#EFF6FF', color: blue,
                }}>{q.sectionLabel}</span>
              </div>

              {/* Question */}
              <h2 style={{ fontSize: 20, fontWeight: 700, color: ink, margin: 0, lineHeight: 1.4, letterSpacing: '-0.01em' }}>
                {q.text}
              </h2>

              {/* Context hint */}
              {q.contextHint && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: '#EFF6FF', fontSize: 13, color: '#1D4ED8',
                }}>
                  {q.contextHint}
                </div>
              )}

              {/* Answer textarea */}
              <textarea
                value={smartInput}
                onChange={e => setSmartInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSmartNext() } }}
                placeholder="Type your answer…"
                rows={4}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  border: `1.5px solid ${bdr}`, background: '#fafafa',
                  fontSize: 14, color: ink, fontFamily: 'inherit',
                  resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                  lineHeight: 1.6,
                }}
                onFocus={e => { e.target.style.borderColor = blue }}
                onBlur={e => { e.target.style.borderColor = bdr }}
              />

              {/* Help text */}
              {q.helpText && (
                <p style={{ fontSize: 12, color: muted, margin: 0, fontStyle: 'italic', lineHeight: 1.5 }}>
                  💡 {q.helpText}
                </p>
              )}

              {/* Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  onClick={() => {
                    if (smartQaIndex === 0) setCurrentStep('extract-results')
                    else setSmartQaIndex(i => i - 1)
                  }}
                  style={{
                    padding: '10px 20px', borderRadius: 8, border: `1px solid ${bdr}`,
                    background: 'transparent', fontSize: 13, color: muted,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >← Back</button>
                <button
                  onClick={handleSmartNext}
                  disabled={!smartInput.trim() || smartProcessing}
                  style={{
                    padding: '12px 28px', borderRadius: 10, border: 'none',
                    background: (!smartInput.trim() || smartProcessing) ? bdr : blue,
                    color: '#fff', fontSize: 14, fontWeight: 600,
                    cursor: (!smartInput.trim() || smartProcessing) ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', opacity: (!smartInput.trim() || smartProcessing) ? 0.6 : 1,
                  }}
                >
                  {smartProcessing ? 'Saving…' : isLast ? 'Finish →' : 'Next →'}
                </button>
              </div>
            </div>
          )
        })()}

        {/* ── STEP 6: Review & Submit ── */}
        {currentStep === 6 && (
          <div style={{ maxWidth: 560, margin: '0 auto', width: '100%', padding: '48px 24px 60px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {submitResult ? (
              <div style={{ textAlign: 'center', padding: 56 }}>
                <div style={{ fontSize: 80, fontWeight: 800, color: blue, lineHeight: 1, letterSpacing: '-0.04em' }}>
                  {submitResult.score}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: ink, marginTop: 8 }}>Grade {submitResult.grade}</div>
                <div style={{ fontSize: 14, color: muted, marginTop: 10 }}>
                  IQ Score calculated — redirecting to dashboard…
                </div>
              </div>
            ) : (
              <>
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ fontSize: 24, fontWeight: 700, color: ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                    Review & Submit
                  </h2>
                  <p style={{ fontSize: 14, color: muted, margin: 0 }}>
                    {completedCount}/5 sections complete.{' '}
                    {canSubmit ? 'Ready to calculate your IQ Score.' : 'Complete at least 3 sections (70%+) to submit.'}
                  </p>
                </div>
                {/* Live preview panel */}
                {previewLoading && (
                  <div style={{ padding: 24, borderRadius: 12, background: '#fafafa', border: `1px solid ${bdr}`, textAlign: 'center', fontSize: 13, color: muted }}>
                    Calculating projected score…
                  </div>
                )}
                {!previewLoading && previewData && (
                  <div style={{ borderRadius: 14, border: `1px solid ${bdr}`, background: '#fafafa', overflow: 'hidden' }}>
                    <div style={{ padding: '28px 28px 24px', display: 'flex', alignItems: 'center', gap: 24 }}>
                      <div style={{ textAlign: 'center', minWidth: 80 }}>
                        <div style={{
                          fontSize: 64, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.04em',
                          color: previewData.projectedScore >= 65 ? blue : previewData.projectedScore >= 45 ? amber : muted,
                        }}>
                          {previewData.projectedScore}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: ink, marginTop: 4 }}>Grade {previewData.grade}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 6 }}>Projected IQ Score</div>
                        <div style={{ fontSize: 13, color: previewData.marketplaceUnlocked ? green : muted, marginBottom: 4, lineHeight: 1.4 }}>
                          {previewData.marketplaceUnlocked
                            ? 'Investor Marketplace unlocks at submission'
                            : `Need ${45 - previewData.projectedScore} more pts to unlock Marketplace`}
                        </div>
                        <div style={{ fontSize: 12, color: muted }}>{previewData.sectionsComplete}/5 sections at 70%+</div>
                      </div>
                    </div>
                    {previewData.boostActions.length > 0 && (
                      <div style={{ padding: '0 28px 24px' }}>
                        <div style={{ height: 1, background: bdr, marginBottom: 16 }} />
                        <div style={{ fontSize: 11, fontWeight: 600, color: muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Weakest parameters</div>
                        {previewData.boostActions.slice(0, 3).map((a, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                            <div style={{ minWidth: 40, padding: '2px 6px', borderRadius: 4, background: '#EFF6FF', textAlign: 'center', fontSize: 11, fontWeight: 700, color: blue, flexShrink: 0 }}>
                              {Math.round(a.currentScore * 20)}/100
                            </div>
                            <span style={{ fontSize: 12, color: ink, lineHeight: 1.4 }}>{a.action}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Section cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['1','2','3','4','5'].map(k => {
                  const sec = sections[k]
                  const pct = sec?.completionScore ?? 0
                  return (
                    <div key={k} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 16px', borderRadius: 10,
                      background: '#fafafa', border: `1px solid ${pct >= 70 ? green + '55' : bdr}`,
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: pct >= 70 ? '#DCFCE7' : '#f0f0f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700,
                        color: pct >= 70 ? green : muted,
                        flexShrink: 0,
                      }}>
                        {pct >= 70 ? '✓' : k}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: ink }}>{SECTION_LABELS[k]}</div>
                        <div style={{ fontSize: 12, color: pct >= 70 ? green : muted }}>{pct}% complete</div>
                      </div>
                      <button onClick={() => setCurrentStep(parseInt(k, 10))} style={{
                        padding: '5px 12px', borderRadius: 6, border: `1px solid ${bdr}`,
                        background: 'transparent', fontSize: 12, color: muted,
                        cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                      }}>
                        {pct >= 70 ? 'Edit' : 'Complete'}
                      </button>
                    </div>
                  )
                })}
                </div>

                {submitError && (
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: `1px solid #FECACA`, fontSize: 13, color: red }}>
                    {submitError}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  style={{
                    padding: '14px 32px', borderRadius: 10, border: 'none',
                    background: (!canSubmit || isSubmitting) ? bdr : blue,
                    color: '#fff', fontSize: 16, fontWeight: 700,
                    cursor: (!canSubmit || isSubmitting) ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', opacity: (!canSubmit || isSubmitting) ? 0.6 : 1,
                  }}
                >
                  {isSubmitting ? 'Calculating IQ Score…' : 'Calculate My IQ Score →'}
                </button>

                <button
                  onClick={() => setCurrentStep(5)}
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
        )}

      </motion.div>
      </AnimatePresence>
        </main>
      </div>

      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        accept=".pdf,.pptx,.xlsx,.csv,.png,.jpg,.jpeg,.webp"
        onChange={e => {
          if (e.target.files && e.target.files.length > 0) handleFileUpload(e.target.files)
        }}
      />

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}

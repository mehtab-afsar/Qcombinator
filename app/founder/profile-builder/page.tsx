'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { shouldTriggerUpload, getInitialQuestion, getMissingFields, buildFoundSnippets, getTargetedQuestion, flattenForDisplay } from '@/lib/profile-builder/question-engine'
import type { FounderProfile } from '@/lib/profile-builder/question-engine'
import { generateSmartQuestions } from '@/lib/profile-builder/smart-questions'
import type { SmartQuestion } from '@/lib/profile-builder/smart-questions'
import {
  FolderOpen, BarChart2, MessageSquare, Target, Users, TrendingUp,
  Shield, User, DollarSign, CheckCircle2, Check, UploadCloud,
  FileText, Paperclip, ArrowUp, Loader2, Zap, BarChart,
  Lightbulb, AlertTriangle, Globe, Bot, RefreshCw, X as XIcon,
} from 'lucide-react'
import { bg, surf, bdr, ink, muted, blue, green, amber, red } from '@/lib/constants/colors'

const surf2 = '#EAE7E0'   // deeper sand — agent bubbles, hover

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
  'p3.replicationTimeMonths': 'how many months to replicate your tech',
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

const STEP_ORDER_FULL: Array<number | 'pitch' | 'extract-results' | 'smart-qa' | 'pre-score'> = [0, 'pitch', 1, 2, 3, 4, 5, 6]
const STEP_ORDER_FAST: Array<number | 'pitch' | 'extract-results' | 'smart-qa' | 'pre-score'> = [0, 'extract-results', 'smart-qa', 'pre-score', 6]

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
  extractedSnippets: Array<{ label: string; value: string; fieldKey?: string }>
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

const YC_QUESTIONS = [
  "What does your company do? Describe it in one sentence — like you're explaining to a smart friend.",
  "Who specifically has this problem, and how much does it cost them today — in time, money, or frustration?",
  "Why is now the right moment to build this? What changed in the last 2–3 years that creates this opening?",
  "Why are you and your team the right people to solve this? What gives you an unfair advantage?",
  "How do you make money, and what does the business look like at scale?",
]

// ── main component ────────────────────────────────────────────────────────────
export default function ProfileBuilderPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<number | 'pitch' | 'extract-results' | 'smart-qa' | 'pre-score'>(0)
  const [ycPitchIdx, setYcPitchIdx] = useState(0)

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
  const [submitResult, setSubmitResult] = useState<{
    score: number
    grade: string
    availableIQ: number
    track?: string
    iqBreakdown: Array<{
      id: string
      name: string
      averageScore: number
      weight: number
      indicatorsActive: number
      indicators: Array<{
        id: string
        name: string
        rawScore: number
        excluded: boolean
        exclusionReason?: string
        vcAlert?: string
        percentile: number | null
        percentileLabel?: string
      }>
    }>
    reconciliationFlags: Array<{ indicatorId: string; alert: string; severity: string }>
    validationWarnings: string[]
    unlockCards: Array<{
      indicatorId: string; indicatorName: string; parameterId: string
      currentScore: number; targetScore: number; estimatedPointGain: number
      action: string; agentId?: string
    }>
    readinessSummary: string
  } | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [rateLimitUntil, setRateLimitUntil] = useState<Date | null>(null)
  const [_previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [_previewLoading, setPreviewLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Smart upload flow
  const [flowMode, setFlowMode] = useState<'fast' | 'full'>('full')
  const [extractionSummary, setExtractionSummary] = useState<SectionSummary[]>([])
  const [smartQuestions, setSmartQuestions] = useState<SmartQuestion[]>([])
  const [smartQaIndex, setSmartQaIndex] = useState(0)
  const [smartInput, setSmartInput] = useState('')
  const [smartProcessing, setSmartProcessing] = useState(false)

  const [input, setInput] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const [smartInputFocused, setSmartInputFocused] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [uploadTrigger, setUploadTrigger] = useState<string | null>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadMsgIdx, setUploadMsgIdx] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; fields: number; fileUrl?: string }>>([])
  const [docTruncationInfo, setDocTruncationInfo] = useState<{ truncatedAt: number; totalLength: number } | null>(null)
  const [fieldSourceMap, setFieldSourceMap] = useState<Record<string, 'document' | 'conversation' | 'inferred'>>({})
  const [recalcLoading, setRecalcLoading] = useState(false)
  const [recalcResult, setRecalcResult] = useState<{ finalIQ: number; grade: string } | null>(null)

  // ── animated sidebar scores — smoothly tick toward actual completionScores ──
  const [animatedScores, setAnimatedScores] = useState<Record<string, number>>({})
  useEffect(() => {
    const targets: Record<string, number> = {}
    for (const [k, s] of Object.entries(sections)) targets[k] = s.completionScore
    const timer = setInterval(() => {
      setAnimatedScores(prev => {
        let changed = false
        const next = { ...prev }
        for (const [k, target] of Object.entries(targets)) {
          const cur = prev[k] ?? 0
          if (cur !== target) {
            next[k] = cur < target ? Math.min(cur + 3, target) : Math.max(cur - 3, target)
            changed = true
          }
        }
        if (!changed) clearInterval(timer)
        return next
      })
    }, 25)
    return () => clearInterval(timer)
  }, [sections])

  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── upload loading messages — rotate every 2.2s while upload is in progress ─
  const UPLOAD_MESSAGES = [
    'Reading your documents…',
    'Extracting market signals…',
    'Identifying customer traction…',
    'Mapping IP & defensibility…',
    'Analysing your team…',
    'Building financial picture…',
    'Scoring your indicators…',
    'Almost done…',
  ]
  useEffect(() => {
    if (!uploadLoading) { setUploadMsgIdx(0); return }
    const timer = setInterval(() => setUploadMsgIdx(i => (i + 1) % UPLOAD_MESSAGES.length), 2200)
    return () => clearInterval(timer)
  }, [uploadLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── auto-clear rateLimitUntil once its time passes ────────────────────────
  useEffect(() => {
    if (!rateLimitUntil) return
    const ms = rateLimitUntil.getTime() - Date.now()
    if (ms <= 0) { setRateLimitUntil(null); return }
    const timer = setTimeout(() => setRateLimitUntil(null), ms)
    return () => clearTimeout(timer)
  }, [rateLimitUntil])

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
            submitResult?: NonNullable<typeof submitResult>
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
            else if (flow.extractionSummary?.length) setCurrentStep('pre-score')
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
              const aiActions = latestScore.ai_actions as { unlockCards?: NonNullable<typeof submitResult>['unlockCards']; readinessSummary?: string } | null
              const reconFlags = (latestScore.reconciliation_flags as NonNullable<typeof submitResult>['reconciliationFlags'] | null) ?? []
              const restored: NonNullable<typeof submitResult> = {
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
                if (d.rawConversation) {
                  for (const line of d.rawConversation.split('\n')) {
                    if (line.startsWith('Q: ')) msgs.push({ role: 'agent', text: line.slice(3) })
                    else if (line.startsWith('A: ')) {
                      const text = line.slice(3)
                      msgs.push({ role: 'user', text })
                      restoredConversation += `\nFounder: ${text}`
                    }
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
      initialQ = YC_QUESTIONS[0]
    } else {
      const hasExtracted = Object.keys(sec.extractedFields ?? {}).length > 0
      if (hasExtracted) {
        if (sec.completionScore >= 70) {
          const SECTION_BOOST_HINTS: Record<number, string> = {
            1: `Good baseline captured. To push your Market Readiness score higher, add: exact number of paying customers, average contract value in dollars, net revenue retention %, average customer retention in months, and typical sales cycle length. Specific numbers always score higher than ranges.`,
            2: `Market data looks solid. To strengthen this section, add: your TAM/SAM/SOM breakdown with named sources (e.g. Gartner 2024), the specific SEC regulation or deadline driving urgency, your top 3 competitors with estimated market share, and 2–3 named adjacent verticals you plan to expand into with signed LOIs or pilot conversations.`,
            3: `IP coverage is strong. To maximise your Defensibility score, add: your patent number and grant date, the estimated cost in USD for a competitor to replicate your technology, how many months it would take with a 10-person team, and what specific dataset or know-how makes replication hardest.`,
            4: `Team profile is in good shape. To improve further, add: years of domain experience per founder, any prior exits with acquisition amounts, how long the founding team has worked together, and whether you have advisors or board members with relevant investor networks.`,
            5: `Financial data captured. To boost this section, add: current MRR and ARR as exact figures, monthly gross burn, net burn, runway in months, gross margin %, average deal size, and customer lifetime value if available. Benchmarking against sector peers (e.g. "top-quartile SaaS gross margin") also helps.`,
          }
          const hint = SECTION_BOOST_HINTS[currentStep as number]
          initialQ = hint ?? `Good coverage from your documents (${sec.completionScore}% complete). Add more specific data below to push your score higher.`
        } else {
          const missing = getMissingFields(sec.extractedFields, currentStep, founderProfile.stage ?? 'pre-product', sec.confidenceMap ?? {})
          const foundSnippets = buildFoundSnippets(sec.extractedFields, currentStep)
          const foundStr = foundSnippets.length > 0
            ? `From your documents I found: ${foundSnippets.slice(0, 3).join(' · ')}.\n\n`
            : ''
          // Ask about the first missing required field specifically, not a list
          const firstMissingKey = missing[0]
          const firstMissingLabel = (MISSING_FIELD_LABELS[firstMissingKey] ?? '').toLowerCase()
          const targetedSuffix = getTargetedQuestion(currentStep, firstMissingKey)
          const gapQ = firstMissingLabel && targetedSuffix
            ? `I still need your ${firstMissingLabel} — ${targetedSuffix}`
            : getInitialQuestion(currentStep, founderProfile)
          initialQ = foundStr + gapQ
        }
      } else {
        initialQ = getInitialQuestion(currentStep, founderProfile)
      }
    }

    setSections(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        messages: [{ role: 'agent', text: initialQ }],
        conversation: `Agent: ${initialQ}`,
      },
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, sectionKey])

  // ── redirect from smart-qa if no questions remain ────────────────────────
  useEffect(() => {
    if (currentStep === 'smart-qa' && smartQuestions.length > 0 && smartQaIndex >= smartQuestions.length) {
      setCurrentStep('pre-score')
    }
  }, [currentStep, smartQaIndex, smartQuestions.length])

  // ── preview data for step 6 ───────────────────────────────────────────────
  useEffect(() => {
    if (currentStep !== 6 || !token) return
    setPreviewLoading(true)
    fetch('/api/profile-builder/preview', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then(setPreviewData)
      .catch(() => {})
      .finally(() => setPreviewLoading(false))
  }, [currentStep, token])

  // ── save section to DB ────────────────────────────────────────────────────
  const saveSection = useCallback(async (secNum: string, state: SectionState, tok: string) => {
    if (secNum === 'pitch') return
    // Serialize messages as Q:/A: so draft loader can restore them exactly
    const rawConversation = state.messages
      .map(m => m.role === 'agent' ? `Q: ${m.text}` : `A: ${m.text}`)
      .join('\n')
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

    // Pitch: YC-style sequential questions
    if (currentStep === 'pitch') {
      setIsTyping(true)
      await new Promise(r => setTimeout(r, 400))
      const nextIdx = ycPitchIdx + 1
      const isLastQuestion = ycPitchIdx >= YC_QUESTIONS.length - 1
      const reply = isLastQuestion
        ? "Great answers — your pitch practice is complete. These responses give investors a clear picture of your opportunity."
        : YC_QUESTIONS[nextIdx]

      setSections(prev => ({
        ...prev,
        pitch: {
          ...prev['pitch'],
          messages: [...(prev['pitch']?.messages ?? []), { role: 'agent' as const, text: reply }],
          completionScore: Math.round(((nextIdx) / YC_QUESTIONS.length) * 100),
          isComplete: isLastQuestion,
        },
      }))
      if (!isLastQuestion) setYcPitchIdx(nextIdx)
      else setYcPitchIdx(YC_QUESTIONS.length - 1)
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
          existingConfidenceMap: currentSec.confidenceMap,
        }),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        console.error('[extract 500 detail]', errBody)
        throw new Error(`Extract failed: ${res.status} — ${errBody.detail ?? errBody.error ?? ''}`)
      }
      const extracted = await res.json()

      const pct: number = extracted.completionScore ?? 0
      // Show what was just extracted before asking the next question
      const newlyExtracted: string[] = Object.entries(extracted.extractedFields ?? {})
        .flatMap(([k, v]) => flattenForDisplay(k, v))
        .slice(0, 3)
      const extractPrefix = newlyExtracted.length > 0
        ? `Got it — noted: ${newlyExtracted.join(', ')}. `
        : ''
      const agentReply: string =
        extractPrefix + (extracted.followUpQuestion ??
        (pct >= 70
          ? `This section is at ${pct}% — solid. Is there anything else you'd like to add? Specific customer names, exact numbers, or key context you haven't mentioned?`
          : "Keep going — the more specific you are, the higher your score."))

      setSections(prev => {
        const sec = prev[key] ?? initSection()
        const updated: SectionState = {
          ...sec,
          extractedFields: extracted.mergedFields ?? sec.extractedFields,
          confidenceMap: { ...sec.confidenceMap, ...(extracted.confidenceMap ?? {}) },
          completionScore: pct,
          conversation: conversation + '\nAgent: ' + agentReply,
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
          impact: number; paramLabel: string; paramIdx: number
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
        // Merge source attribution (document / inferred) into global map
        if (data.fieldSource && typeof data.fieldSource === 'object') {
          setFieldSourceMap(prev => ({ ...prev, ...(data.fieldSource as Record<string, 'document' | 'conversation' | 'inferred'>) }))
        }
        // setUploadedFiles is now called unconditionally below — don't duplicate here
        setUploadedFiles(prev => {
          const next = [...prev, newFile]
          saveFlowState({ flowMode: 'fast', smartQuestions: qs, smartQaIndex: 0, extractionSummary: data.sectionSummaries, uploadedFiles: next })
          return next
        })
        setUploadTrigger(null)
        // Auto-advance to extraction summary so the user can see what was found
        setCurrentStep('extract-results')
        return
      }

      // No sectionSummaries — extraction failed (image PDF, missing key, scanned doc, etc.)
      // Show the error to the user instead of silently falling through.
      if (data.extractionError) {
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
        const next = [...prev, newFile]
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
    // Stop typing dots now that agent reply is in messages
    setIsTyping(false)

    setUploadedFiles(prev => {
      const next = [...prev, { name: file.name, fields: fieldsFound }]
      saveFlowState({ flowMode, smartQuestions, smartQaIndex, extractionSummary, uploadedFiles: next })
      return next
    })
    setUploadTrigger(null)
  }

  const MAX_UPLOAD_FILES = 10

  // ── handle one or many files sequentially (up to MAX_UPLOAD_FILES total) ──
  async function handleFileUpload(files: FileList | File[]) {
    if (!token) return
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

    setUploadLoading(true)
    if (slotsLeft === fileArr.length) setUploadError(null)
    const errors: string[] = []
    for (let i = 0; i < toProcess.length; i++) {
      try {
        await uploadOneFile(toProcess[i])
      } catch (e) {
        setIsTyping(false)
        errors.push(`${toProcess[i].name}: ${e instanceof Error ? e.message : 'failed'}`)
      }
      // Stagger uploads to spread Groq API load — avoids hitting TPM/RPM rate limits on concurrent uploads
      if (i < toProcess.length - 1) {
        await new Promise(r => setTimeout(r, 1200))
      }
    }
    if (errors.length > 0) setUploadError(errors.join(' · '))
    setUploadLoading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!token || isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/profile-builder/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429 && data.retakeAvailableAt) {
          setRateLimitUntil(new Date(data.retakeAvailableAt))
        } else {
          setSubmitError(data.error ?? 'Submission failed')
        }
        return
      }
      const result = {
        score: data.score,
        grade: data.grade,
        availableIQ: data.availableIQ ?? data.score,
        track: data.track,
        iqBreakdown: data.iqBreakdown ?? [],
        reconciliationFlags: data.reconciliationFlags ?? [],
        validationWarnings: data.validationWarnings ?? [],
        unlockCards: data.unlockCards ?? [],
        readinessSummary: data.readinessSummary ?? '',
      }
      setSubmitResult(result)
      setCurrentStep(6)
      // Persist so user can return to their score report after closing the page
      saveFlowState({ submitResult: result, currentStep: 6 })
    } catch {
      setSubmitError('Network error — please try again')
    } finally {
      setIsSubmitting(false)
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

  const completedCount = ['1','2','3','4','5'].filter(k => sections[k]?.isComplete).length
  // Fast mode (doc upload): allow submit when any section has ≥30% data — matches API gate
  const hasAnySectionData = Object.values(sections).some(s => s.completionScore >= 30)
  const canSubmit = completedCount >= 3 || (flowMode === 'fast' && uploadedFiles.length > 0 && hasAnySectionData)

  const STEP_ORDER = flowMode === 'fast' ? STEP_ORDER_FAST : STEP_ORDER_FULL
  const stepIdx = STEP_ORDER.indexOf(currentStep)
  const prevStep = stepIdx > 0 ? STEP_ORDER[stepIdx - 1] : null
  const nextStep = stepIdx < STEP_ORDER.length - 1 ? STEP_ORDER[stepIdx + 1] : null

  // ── score narrative (deterministic, no LLM) ──────────────────────────────
  function buildScoreNarrative(
    params: NonNullable<typeof submitResult>['iqBreakdown'],
    score: number,
    grade: string,
    flags: NonNullable<typeof submitResult>['reconciliationFlags']
  ): { overall: string; perParam: Record<string, string> } {
    const s100 = (avg: number) => Math.round(avg * 20)
    const sorted = [...params].sort((a, b) => b.averageScore - a.averageScore)
    const strongest = sorted[0]
    const weakest = sorted[sorted.length - 1]

    const overall = [
      'Your IQ Score of ' + score + ' (Grade ' + grade + ') reflects ' +
        (score >= 70 ? 'a well-evidenced startup with strong fundamentals.'
          : score >= 50 ? 'a startup with solid foundations but meaningful gaps to close before a Series A.'
          : score >= 35 ? 'an early-stage startup where key signals still need to be validated.'
          : 'a very early stage — most scoring dimensions need more evidence.'),
      strongest && s100(strongest.averageScore) >= 60
        ? 'Your strongest dimension is ' + strongest.name + ' (' + s100(strongest.averageScore) + '/100).'
        : null,
      weakest && s100(weakest.averageScore) < 50
        ? 'The biggest opportunity to improve is ' + weakest.name + ' (' + s100(weakest.averageScore) + '/100).'
        : null,
      flags.length > 0
        ? 'Note: ' + flags.length + ' indicator' + (flags.length > 1 ? 's' : '') + ' flagged a data quality concern that investors may scrutinise.'
        : null,
    ].filter(Boolean).join(' ')

    const perParam: Record<string, string> = {}
    for (const p of params) {
      const s = s100(p.averageScore)
      const activeInds = (p.indicators ?? []).filter(i => !i.excluded)
      const strongInds = activeInds.filter(i => i.rawScore >= 4.0).map(i => i.name)
      const weakInds = activeInds.filter(i => i.rawScore > 0 && i.rawScore < 2.5).map(i => i.name)
      const alerts = (p.indicators ?? []).filter(i => i.vcAlert)
      perParam[p.id] = [
        s >= 75 ? p.name + ' is a clear strength.'
          : s >= 50 ? p.name + ' shows promise but has room to grow.'
          : p.name + ' needs attention — this is a common investor ask.',
        strongInds.length > 0 ? 'Strong signals: ' + strongInds.slice(0, 2).join(', ') + '.' : null,
        weakInds.length > 0 ? 'Gaps to address: ' + weakInds.slice(0, 2).join(', ') + '.' : null,
        alerts.length > 0 ? 'Data flag on: ' + alerts.map(a => a.name).join(', ') + '.' : null,
      ].filter(Boolean).join(' ')
    }
    return { overall, perParam }
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* ── Floating Save & Exit ── */}
      <button
        onClick={() => router.push('/founder/dashboard')}
        style={{
          position: 'fixed', top: 20, right: 24, zIndex: 50,
          padding: '9px 18px', borderRadius: 10,
          border: `1px solid ${bdr}`, background: 'rgba(249,247,242,0.95)',
          backdropFilter: 'blur(10px)',
          fontSize: 13, fontWeight: 500, color: ink,
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 2px 12px rgba(24,22,15,0.10)',
          transition: 'box-shadow 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(24,22,15,0.16)' }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(24,22,15,0.10)' }}
      >
        Save &amp; Exit
      </button>

      {/* ── Main layout (full height, no header offset) ── */}
      <div style={{ minHeight: '100vh', display: 'flex' }}>

        {/* ── Collapsible left sidebar ── */}
        <div style={{
          width: sidebarOpen ? 224 : 0,
          minWidth: sidebarOpen ? 224 : 0,
          overflow: 'hidden',
          transition: 'width 0.25s ease, min-width 0.25s ease',
          borderRight: `1px solid ${bdr}`,
          background: surf,
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '20px 16px 16px', opacity: sidebarOpen ? 1 : 0, transition: 'opacity 0.15s', whiteSpace: 'nowrap', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

            {/* Brand */}
            <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${bdr}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: ink, letterSpacing: '-0.01em' }}>Edge Alpha</div>
            </div>

            {/* Setup items */}
            <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Setup</div>
            {([
              { key: '0', label: 'Documents', Icon: FolderOpen },
              ...(flowMode === 'fast' ? [
                { key: 'extract-results', label: 'Extraction Results', Icon: BarChart2 },
                { key: 'smart-qa',        label: 'Quick Questions',   Icon: MessageSquare },
                { key: 'pre-score',       label: 'Your Snapshot',     Icon: BarChart },
              ] : [
                { key: 'pitch', label: 'Your Pitch', Icon: Target },
              ]),
            ] as Array<{ key: string; label: string; Icon: React.ElementType }>).map(({ key, label, Icon }) => {
              const isActive = String(currentStep) === key
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (key === '0') setCurrentStep(0)
                    else if (key === 'pitch') setCurrentStep('pitch')
                    else if (key === 'extract-results') setCurrentStep('extract-results')
                    else if (key === 'smart-qa') setCurrentStep('smart-qa')
                    else if (key === 'pre-score') setCurrentStep('pre-score')
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '7px 10px', borderRadius: 8,
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: isActive ? surf2 : 'transparent',
                    marginBottom: 1, transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = bdr }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <Icon size={14} color={isActive ? blue : muted} strokeWidth={isActive ? 2.5 : 1.75} style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? blue : ink, lineHeight: 1.3 }}>{label}</div>
                </button>
              )
            })}

            {/* Parameters */}
            <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 16, marginBottom: 8 }}>Parameters</div>
            {([
              { key: '1', label: 'Market & Customers', Icon: Users },
              { key: '2', label: 'Market Potential',   Icon: TrendingUp },
              { key: '3', label: 'IP & Defensibility', Icon: Shield },
              { key: '4', label: 'Founder & Team',     Icon: User },
              { key: '5', label: 'Financials',         Icon: DollarSign },
            ] as Array<{ key: string; label: string; Icon: React.ElementType }>).map(({ key, label, Icon }) => {
              const isActive = String(currentStep) === key
              const sec = sections[key]
              const pct = animatedScores[key] ?? sec?.completionScore ?? 0
              const isDone = pct >= 70
              return (
                <button
                  key={key}
                  onClick={() => setCurrentStep(parseInt(key, 10))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '7px 10px', borderRadius: 8,
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: isActive ? surf2 : 'transparent',
                    marginBottom: 1, transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = bdr }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <Icon size={14} color={isActive ? blue : muted} strokeWidth={isActive ? 2.5 : 1.75} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? blue : ink, lineHeight: 1.3 }}>{label}</div>
                    <div style={{ marginTop: 3 }}>
                      <div style={{ height: 2, background: bdr, borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: isDone ? green : blue, borderRadius: 2, transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  </div>
                  {isDone && <Check size={12} color={green} strokeWidth={2.5} style={{ flexShrink: 0 }} />}
                </button>
              )
            })}

            {/* Review & Score Report */}
            <div style={{ marginTop: 16 }}>
              {(() => {
                const isActive = String(currentStep) === '6'
                return (
                  <button
                    onClick={() => setCurrentStep(6)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '7px 10px', borderRadius: 8,
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      background: isActive && !submitResult ? surf2 : 'transparent',
                      marginBottom: 1, transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!isActive || submitResult) e.currentTarget.style.background = bdr }}
                    onMouseLeave={e => { if (!isActive || submitResult) e.currentTarget.style.background = 'transparent' }}
                  >
                    <CheckCircle2 size={14} color={isActive && !submitResult ? blue : muted} strokeWidth={isActive && !submitResult ? 2.5 : 1.75} style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: 12, fontWeight: isActive && !submitResult ? 600 : 400, color: isActive && !submitResult ? blue : ink, lineHeight: 1.3 }}>Review & Submit</div>
                  </button>
                )
              })()}
              {submitResult && (() => {
                const isActive = String(currentStep) === '6'
                return (
                  <button
                    onClick={() => setCurrentStep(6)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '7px 10px', borderRadius: 8,
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      background: isActive ? surf2 : 'transparent',
                      marginBottom: 1, transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = bdr }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <FileText size={14} color={isActive ? blue : green} strokeWidth={isActive ? 2.5 : 1.75} style={{ flexShrink: 0 }} />
                    <div style={{ fontSize: 12, fontWeight: isActive ? 600 : 500, color: isActive ? blue : green, lineHeight: 1.3 }}>
                      Score Report · {submitResult.score}
                    </div>
                  </button>
                )
              })()}
            </div>

          </div>
        </div>

        {/* ── Toggle sidebar button ── */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{
            position: 'fixed', top: 20, left: sidebarOpen ? 212 : 8,
            zIndex: 40, width: 24, height: 24, borderRadius: '50%',
            border: `1px solid ${bdr}`, background: bg,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, color: muted, transition: 'left 0.25s ease',
            boxShadow: '0 1px 4px rgba(24,22,15,0.08)',
          }}
        >
          {sidebarOpen ? '‹' : '›'}
        </button>

        {/* ── Main content ── */}
        <main style={{ flex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
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
          <div style={{ maxWidth: 720, margin: '0 auto', width: '100%', padding: '56px 40px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                Upload your pitch deck
              </h2>
              <p style={{ fontSize: 14, color: muted, margin: '0 0 20px', lineHeight: 1.6 }}>
                We analyse it, identify your weakest parameters, and give you a partial IQ Score in under 5 minutes.
              </p>
              {/* Flow preview */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 20 }}>
                {[
                  { step: '1', label: 'Upload', sub: 'PDF, PPTX, DOCX' },
                  { step: '2', label: '3 questions', sub: 'Weakest params only' },
                  { step: '3', label: 'Instant score', sub: 'Partial IQ Score' },
                ].map(({ step, label, sub }, i) => (
                  <React.Fragment key={step}>
                    <div style={{ textAlign: 'center', minWidth: 96 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: blue, color: '#fff',
                        fontSize: 12, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 6px',
                      }}>{step}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: ink }}>{label}</div>
                      <div style={{ fontSize: 11, color: muted, marginTop: 1 }}>{sub}</div>
                    </div>
                    {i < 2 && (
                      <div style={{ flex: 1, height: 1, background: bdr, maxWidth: 40, margin: '0 4px', marginBottom: 20 }} />
                    )}
                  </React.Fragment>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {[
                  { label: 'Pitch deck', note: 'Market + team' },
                  { label: 'Financial model', note: 'MRR, burn, runway' },
                  { label: 'Business plan', note: 'Full coverage' },
                  { label: 'LOI / contracts', note: 'Customer traction' },
                  { label: 'Team bios', note: 'Team section' },
                  { label: 'Technical spec', note: 'IP + defensibility' },
                ].map(({ label, note }) => (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                    borderRadius: 20, border: `1px solid ${bdr}`, background: surf,
                    fontSize: 12, color: ink,
                  }}>
                    <FileText size={11} color={muted} strokeWidth={1.75} />
                    <span style={{ fontWeight: 500 }}>{label}</span>
                    <span style={{ color: muted, fontSize: 11 }}>· {note}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Animated loading screen (replaces upload zone during processing) ── */}
            {uploadLoading ? (
              <div style={{
                borderRadius: 20, padding: '56px 32px', background: surf,
                border: `1px solid ${bdr}`, textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
              }}>
                {/* Spinning ring */}
                <div style={{ position: 'relative', width: 64, height: 64 }}>
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    border: `3px solid ${bdr}`,
                  }} />
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    border: `3px solid transparent`,
                    borderTopColor: blue,
                    animation: 'spin 0.9s linear infinite',
                  }} />
                  <div style={{
                    position: 'absolute', inset: 8, borderRadius: '50%',
                    border: `2px solid transparent`,
                    borderTopColor: `${blue}60`,
                    animation: 'spin 1.6s linear infinite reverse',
                  }} />
                </div>
                {/* Rotating message */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: ink, letterSpacing: '-0.01em', minHeight: 26 }}>
                    {UPLOAD_MESSAGES[uploadMsgIdx]}
                  </div>
                  <div style={{ fontSize: 13, color: muted }}>
                    Extracting all 30 indicators across 6 parameters
                  </div>
                </div>
                {/* Indicator dots */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {UPLOAD_MESSAGES.map((_, i) => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: i === uploadMsgIdx ? blue : bdr,
                      transition: 'background 0.4s',
                    }} />
                  ))}
                </div>
              </div>
            ) : (
            <div
              onClick={() => { if (uploadedFiles.length < MAX_UPLOAD_FILES) fileInputRef.current?.click() }}
              style={{
                border: `2px dashed ${bdr}`, borderRadius: 16, padding: '48px 32px',
                textAlign: 'center', background: surf,
                cursor: uploadedFiles.length >= MAX_UPLOAD_FILES ? 'not-allowed' : 'pointer',
                opacity: uploadedFiles.length >= MAX_UPLOAD_FILES ? 0.55 : 1,
                transition: 'all 0.2s', boxShadow: 'inset 0 1px 3px rgba(24,22,15,0.04)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = amber; e.currentTarget.style.background = '#FFF7ED'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(217,119,6,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.background = surf; e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(24,22,15,0.04)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                <UploadCloud size={36} color={muted} strokeWidth={1.25} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: ink, marginBottom: 6 }}>
                {uploadedFiles.length >= MAX_UPLOAD_FILES ? `${MAX_UPLOAD_FILES}-file limit reached` : 'Drop files or click to upload'}
              </div>
              <div style={{ fontSize: 13, color: muted }}>PDF, PPTX, XLSX, CSV, PNG, JPG — max 10 MB each · up to 10 files, merged automatically</div>
            </div>
            )}

            {uploadError && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', border: `1px solid #FECACA`, fontSize: 13, color: red }}>
                {uploadError}
              </div>
            )}

            {uploadedFiles.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Uploaded
                  </div>
                  <div style={{ fontSize: 11, color: muted }}>
                    {uploadedFiles.length}/{MAX_UPLOAD_FILES} files · data merged
                  </div>
                </div>
                {uploadedFiles.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 10, background: bg,
                    border: `1px solid ${bdr}`, marginBottom: 6,
                    boxShadow: '0 1px 3px rgba(24,22,15,0.05)',
                  }}>
                    <div
                      onClick={() => f.fileUrl && window.open(f.fileUrl, '_blank', 'noopener')}
                      title={f.fileUrl ? 'Click to preview' : undefined}
                      style={{
                        width: 32, height: 32, borderRadius: 8, background: surf2,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        cursor: f.fileUrl ? 'pointer' : 'default',
                      }}
                    >
                      <FileText size={15} color={f.fileUrl ? blue : muted} strokeWidth={1.75} />
                    </div>
                    <div
                      style={{ flex: 1, minWidth: 0, cursor: f.fileUrl ? 'pointer' : 'default' }}
                      onClick={() => f.fileUrl && window.open(f.fileUrl, '_blank', 'noopener')}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: f.fileUrl ? blue : ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: f.fields > 0 ? green : muted, marginTop: 2 }}>
                        {f.fields > 0 ? `${f.fields} fields extracted` : 'Stored as context'}
                        {f.fileUrl && <span style={{ color: muted }}> · click to preview</span>}
                      </div>
                    </div>
                    <Check size={14} color={green} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                    <button
                      onClick={() => handleRemoveFile(i)}
                      title="Remove file"
                      style={{
                        width: 22, height: 22, borderRadius: '50%', border: `1px solid ${bdr}`,
                        background: bg, color: muted, fontSize: 13, lineHeight: 1,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 0, fontFamily: 'inherit', flexShrink: 0,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.borderColor = '#FECACA' }}
                      onMouseLeave={e => { e.currentTarget.style.background = bg; e.currentTarget.style.borderColor = bdr }}
                    ><XIcon size={11} color={muted} strokeWidth={2} /></button>
                  </div>
                ))}

                {/* Recalculate score after upload */}
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={handleRecalculate}
                    disabled={recalcLoading}
                    style={{
                      padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${bdr}`,
                      background: recalcLoading ? bdr : bg, color: ink,
                      fontSize: 13, fontWeight: 500, cursor: recalcLoading ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {recalcLoading
                      ? <><Loader2 size={13} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} /> Calculating…</>
                      : <><Zap size={13} strokeWidth={2} /> Preview score impact</>}
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
                      color: msg.role === 'user' ? '#fff' : ink,
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
                        width: 7, height: 7, borderRadius: '50%', background: '#B5AFA7',
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
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
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
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#1D4ED8' }}>Extracting data from your document…</div>
                        <div style={{ fontSize: 11, color: blue, marginTop: 2, opacity: 0.8 }}>This takes a few seconds — hang tight</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 13, color: '#1D4ED8' }}>{uploadTrigger}</div>
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
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: '6px 14px', borderRadius: 6, border: 'none',
                        background: blue, color: '#fff', fontSize: 12,
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
                    onClick={() => { setRecalcResult(null); handleRecalculate() }}
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
                      background: '#F0FDF4', border: `1px solid #A7F3D0`,
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
                  <button onClick={() => router.push('/founder/cxo?agent=felix')} style={{
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
                    onClick={() => { if (!uploadLoading) fileInputRef.current?.click() }}
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
                      setInput(e.target.value)
                      // auto-grow
                      e.target.style.height = 'auto'
                      e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
                    }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
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
                      onClick={handleSend}
                      disabled={!input.trim() || isTyping}
                      style={{
                        width: 32, height: 32, borderRadius: 9, border: 'none',
                        background: (input.trim() && !isTyping) ? blue : bdr,
                        color: '#fff',
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
                        const nextIdx = ycPitchIdx + 1
                        const isLast = ycPitchIdx >= YC_QUESTIONS.length - 1
                        const reply = isLast ? "Pitch practice complete. Skipped — you can answer these during investor meetings." : YC_QUESTIONS[nextIdx]
                        setSections(prev => ({
                          ...prev,
                          pitch: {
                            ...prev['pitch'],
                            messages: [...(prev['pitch']?.messages ?? []), { role: 'user' as const, text: '(skipped)' }, { role: 'agent' as const, text: reply }],
                            completionScore: Math.round(((nextIdx) / YC_QUESTIONS.length) * 100),
                            isComplete: isLast,
                          },
                        }))
                        if (!isLast) setYcPitchIdx(nextIdx)
                        else setYcPitchIdx(YC_QUESTIONS.length - 1)
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
          <div style={{ maxWidth: 880, margin: '0 auto', width: '100%', padding: '48px 40px 60px', display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* ── Hero summary ── */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', borderRadius: 20,
                background: '#EFF6FF', border: `1px solid ${blue}33`,
                fontSize: 11, fontWeight: 600, color: blue, letterSpacing: '0.04em',
                textTransform: 'uppercase', marginBottom: 16,
              }}>
                <BarChart size={11} strokeWidth={2.5} /> Document analysis complete
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: ink, margin: '0 0 10px', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                We pre-filled your profile
              </h2>
              <p style={{ fontSize: 14, color: muted, margin: '0 0 28px', lineHeight: 1.6, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
                Your documents gave us a head start. The fields we extracted directly raise your IQ Score — the more complete your profile, the higher your investor match rate.
              </p>

              {/* Stats row */}
              {(() => {
                const _tf = extractionSummary.reduce((s, x) => s + x.extractedCount, 0)
                // Sections "strong" = ≥60% (score ≥ 3/5) — no question asked for these
                const _strong = extractionSummary.filter(x => x.completionPct >= 60).length
                const _weak = extractionSummary.filter(x => x.completionPct < 60).length
                return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 480, margin: '0 auto' }}>
                {[
                  { value: String(_tf), label: 'Fields extracted', color: blue },
                  { value: `${_strong}/${extractionSummary.length}`, label: 'Strong (≥ 3/5)', color: _strong > 0 ? green : amber },
                  { value: String(_weak), label: _weak === 1 ? 'Weak param' : 'Weak params', color: _weak > 0 ? amber : green },
                ].map(({ value, label, color }) => (
                  <div key={label} style={{
                    padding: '14px 12px', borderRadius: 12,
                    background: surf, border: `1px solid ${bdr}`,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: 11, color: muted, marginTop: 4, fontWeight: 500 }}>{label}</div>
                  </div>
                ))}
              </div>
                )
              })()}
            </div>

            {/* ── Truncation warning banner ── */}
            {docTruncationInfo && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 16px', borderRadius: 10,
                background: '#FFFBEB', border: '1px solid #FCD34D',
              }}>
                <AlertTriangle size={15} strokeWidth={2} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>
                  We read the first <strong>{docTruncationInfo.truncatedAt.toLocaleString()}</strong> of <strong>{docTruncationInfo.totalLength.toLocaleString()}</strong> characters in your document.
                  {' '}Upload a shorter version or answer the follow-up questions to fill in any gaps.
                </p>
              </div>
            )}

            {/* ── Section-by-section breakdown ── */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                Parameter breakdown
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {extractionSummary.map(s => {
                  // ≥60% = score ≥ 3/5 = "strong" — no question asked
                  // <60% = score < 3/5 = "weak" — question will be asked (if in top 3 by impact)
                  const isStrong = s.completionPct >= 60
                  const isPartial = s.completionPct > 0 && s.completionPct < 60
                  const willAsk = smartQuestions.some(q => q.sectionKey === s.sectionKey)
                  const _sectionIcons: Record<string, React.ElementType> = { '1': Users, '2': TrendingUp, '3': Shield, '4': User, '5': DollarSign }
                  const SIcon = _sectionIcons[s.sectionKey] ?? BarChart2
                  const barColor = isStrong ? green : isPartial ? (willAsk ? amber : blue) : bdr
                  const statusLabel = isStrong ? 'Strong' : willAsk ? 'Will be asked' : isPartial ? 'Partial' : 'No data'
                  const statusBg = isStrong ? '#F0FDF4' : willAsk ? '#FFFBEB' : isPartial ? '#EFF6FF' : surf2
                  const statusColor = isStrong ? green : willAsk ? amber : isPartial ? blue : muted

                  return (
                    <div key={s.sectionKey} style={{
                      borderRadius: 14,
                      border: `1px solid ${isStrong ? green + '40' : willAsk ? amber + '44' : bdr}`,
                      background: isStrong ? '#FAFFFE' : willAsk ? '#FFFDF5' : bg,
                      overflow: 'hidden',
                    }}>
                      {/* Card header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px 10px' }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          background: isStrong ? '#DCFCE7' : willAsk ? '#FEF3C7' : surf2,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <SIcon size={15} color={isStrong ? green : willAsk ? amber : muted} strokeWidth={1.75} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>{s.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                                background: statusBg, color: statusColor, letterSpacing: '0.03em',
                              }}>{statusLabel}</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: statusColor, minWidth: 36, textAlign: 'right' }}>{s.completionPct}%</span>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div style={{ height: 3, background: bdr, borderRadius: 2, overflow: 'hidden', marginTop: 6 }}>
                            <div style={{ height: '100%', width: `${s.completionPct}%`, background: barColor, borderRadius: 2, transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                      </div>

                      {/* Extracted + missing chips */}
                      {(s.extractedSnippets.length > 0 || s.missingLabels.length > 0) && (
                        <div style={{ padding: '0 18px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {s.extractedSnippets.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                              {s.extractedSnippets.map((snip, i) => {
                                const src = snip.fieldKey ? fieldSourceMap[snip.fieldKey] : undefined
                                const srcLabel = src === 'conversation' ? 'chat' : src === 'inferred' ? 'derived' : src === 'document' ? 'doc' : null
                                return (
                                  <span key={i} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    fontSize: 11, padding: '3px 9px', borderRadius: 20,
                                    background: '#D1FAE5', color: '#065F46', fontWeight: 500,
                                  }}>
                                    <Check size={9} strokeWidth={3} style={{ flexShrink: 0 }} />
                                    {snip.label}: <span style={{ fontWeight: 700 }}>{snip.value}</span>
                                    {srcLabel && (
                                      <span style={{
                                        fontSize: 9, fontWeight: 700, padding: '1px 5px',
                                        borderRadius: 10, background: src === 'inferred' ? '#FEF3C7' : src === 'conversation' ? '#DBEAFE' : '#E0F2FE',
                                        color: src === 'inferred' ? '#92400E' : src === 'conversation' ? '#1E40AF' : '#0369A1',
                                        marginLeft: 2, letterSpacing: '0.03em',
                                      }}>
                                        {srcLabel}
                                      </span>
                                    )}
                                  </span>
                                )
                              })}
                            </div>
                          )}
                          {s.missingLabels.length > 0 && (
                            <div>
                              <div style={{ fontSize: 10, color: muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                                Still needed to improve score
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {s.missingLabels.map((m, i) => (
                                  <span key={i} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    fontSize: 11, padding: '3px 9px', borderRadius: 20,
                                    background: surf2, color: muted, fontWeight: 500,
                                    border: `1px dashed ${bdr}`,
                                  }}>
                                    <AlertTriangle size={9} strokeWidth={2} style={{ flexShrink: 0, color: amber }} />{m}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Next step callout ── */}
            {smartQuestions.length > 0 ? (
              <div style={{
                borderRadius: 14, border: `1px solid ${amber}44`,
                background: '#FFFDF5', padding: '20px 24px',
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: amber,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <MessageSquare size={18} color='#fff' strokeWidth={1.75} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: ink, marginBottom: 2 }}>
                    {smartQuestions.length} {smartQuestions.length === 1 ? 'question' : 'questions'} — your {smartQuestions.length} weakest parameter{smartQuestions.length !== 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: 12, color: muted, lineHeight: 1.5 }}>
                    Each scored below 3/5. Answering moves these the most. Your IQ Score calculates automatically after.
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: amber, flexShrink: 0 }}>~{smartQuestions.length * 45}s</div>
              </div>
            ) : (
              <div style={{
                borderRadius: 14, border: `1px solid ${green}44`,
                background: '#F0FDF4', padding: '20px 24px',
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: green,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <CheckCircle2 size={18} color='#fff' strokeWidth={1.75} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: ink, marginBottom: 2 }}>All parameters score ≥ 3/5</div>
                  <div style={{ fontSize: 12, color: muted }}>Your documents covered everything well. Calculating your IQ Score now.</div>
                </div>
              </div>
            )}

            {/* ── Binary CTA ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 2 }}>
                What would you like to do?
              </div>

              {smartQuestions.length > 0 && (
                <button onClick={() => setCurrentStep('smart-qa')} style={{
                  padding: '14px 24px', borderRadius: 10, border: 'none',
                  background: blue, color: '#fff', fontSize: 14, fontWeight: 600,
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
              )}

              <button onClick={() => { setCurrentStep(6); handleSubmit() }} style={{
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
                  conversationText: (sections[q.sectionKey]?.conversation ?? '') + `\nAgent: ${q.text}\nFounder: ${smartInput}`,
                  founderProfile,
                  existingExtracted: sections[q.sectionKey]?.extractedFields ?? {},
                  existingConfidenceMap: sections[q.sectionKey]?.confidenceMap ?? {},
                }),
              })
              if (res.ok) {
                const data = await res.json()
                const secKey = q.sectionKey
                setSections(prev => {
                  const sec = prev[secKey] ?? initSection()
                  // Also append to messages so the section chatbot sees this Q&A
                  // and doesn't re-ask the same question when user navigates to that section
                  const newMessages: Message[] = [
                    ...sec.messages,
                    { role: 'agent' as const, text: q.text },
                    { role: 'user' as const, text: smartInput },
                  ]
                  // If section is now complete, add a completion acknowledgement
                  const newScore = data.completionScore ?? sec.completionScore
                  if (newScore >= 70 && sec.completionScore < 70) {
                    newMessages.push({ role: 'agent' as const, text: `Got it — this section is looking good (${newScore}%). You can add more detail or move on.` })
                  }
                  const updated: SectionState = {
                    ...sec,
                    extractedFields: data.mergedFields ?? sec.extractedFields,
                    confidenceMap: { ...sec.confidenceMap, ...(data.confidenceMap ?? {}) },
                    completionScore: newScore,
                    isComplete: newScore >= 70,
                    messages: newMessages,
                    conversation: (sec.conversation ?? '') + `\nAgent: ${q.text}\nFounder: ${smartInput}`,
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
              if (isLast) {
                setCurrentStep('pre-score')
                saveFlowState(null)  // flow complete — clear persisted state
              } else {
                const nextIdx = smartQaIndex + 1
                setSmartQaIndex(nextIdx)
                saveFlowState({ flowMode: 'fast', smartQuestions, smartQaIndex: nextIdx, extractionSummary })
              }
            }
          }

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
                  background: '#EFF6FF', color: blue,
                }}>{q.sectionLabel}</span>
                <span style={{
                  display: 'inline-block', fontSize: 11, fontWeight: 600,
                  padding: '3px 10px', borderRadius: 20,
                  background: '#FFFBEB', color: amber,
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
                  background: '#EFF6FF', fontSize: 13, color: '#1D4ED8',
                }}>
                  {q.contextHint}
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
                  onClick={handleSmartNext}
                  disabled={!smartInput.trim() || smartProcessing}
                  style={{
                    width: 36, height: 36, borderRadius: 10, border: 'none',
                    background: (smartInput.trim() && !smartProcessing) ? blue : bdr,
                    color: '#fff', fontSize: 16, fontWeight: 700,
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
                    if (smartQaIndex === 0) setCurrentStep('extract-results')
                    else setSmartQaIndex(i => i - 1)
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
          )
        })()}

        {/* ── PRE-SCORE SNAPSHOT ── */}
        {currentStep === 'pre-score' && (() => {
          // Merge all section confidenceMaps into one flat map for field-level confidence chips
          const allConfidence: Record<string, number> = {}
          for (const sec of Object.values(sections)) {
            Object.assign(allConfidence, sec.confidenceMap)
          }

          // P6 financial fields from merged section-5 state
          const fin = (sections['5']?.extractedFields?.financial ?? {}) as Record<string, unknown>
          const financialSnippets = [
            { label: 'MRR', key: 'mrr' }, { label: 'ARR', key: 'arr' },
            { label: 'Monthly Burn', key: 'monthlyBurn' }, { label: 'Runway (mo)', key: 'runway' },
            { label: 'Gross Margin', key: 'grossMargin' },
          ].map(({ label, key }) => ({ label, value: fin[key] != null ? String(fin[key]) : null, fieldKey: `financial.${key}` }))

          const financialExtracted = financialSnippets.filter(s => s.value !== null)
          const financialMissing = financialSnippets.filter(s => s.value === null).map(s => s.label)

          // Build the 6 parameter cards
          const paramCards = [
            ...extractionSummary.map((s, i) => ({
              key: s.sectionKey,
              label: ['Market Validation', 'Market & Competition', 'IP & Technology', 'Team & Founders', 'Climate & Impact'][i] ?? s.label,
              completionPct: s.completionPct,
              snippets: s.extractedSnippets,
              missing: s.missingLabels,
            })),
            {
              key: 'fin',
              label: 'Financials',
              completionPct: financialExtracted.length === 0 ? 0 : Math.round((financialExtracted.length / financialSnippets.length) * 100),
              snippets: financialExtracted.map(s => ({ label: s.label, value: s.value ?? '', fieldKey: s.fieldKey })),
              missing: financialMissing,
            },
          ]

          const overallPct = paramCards.length > 0
            ? Math.round(paramCards.reduce((sum, c) => sum + c.completionPct, 0) / paramCards.length)
            : 0

          const barColor = (pct: number) => pct >= 60 ? green : pct >= 30 ? amber : red

          const confidenceLabel = (fieldKey: string) => {
            const v = allConfidence[fieldKey.split('.').pop() ?? fieldKey]
            if (v === undefined) return null
            if (v >= 0.8) return { label: 'High', color: green }
            if (v >= 0.5) return { label: 'Med', color: amber }
            return { label: 'Low', color: red }
          }

          return (
            <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '40px 40px 0' }}>
              <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 80 }}>

                {/* Header */}
                <div>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 11, fontWeight: 700, color: blue,
                    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
                    padding: '3px 10px', borderRadius: 20, background: '#EFF6FF',
                  }}>
                    <BarChart size={12} strokeWidth={2} /> Your startup snapshot
                  </div>
                  <h1 style={{ fontSize: 26, fontWeight: 800, color: ink, margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                    Here&apos;s everything we&apos;ve captured
                  </h1>
                  <p style={{ fontSize: 14, color: muted, margin: 0 }}>
                    Review what we extracted from your documents and answers before calculating your Q-Score.
                  </p>
                </div>

                {/* Overall coverage bar */}
                <div style={{ padding: '16px 20px', borderRadius: 12, background: surf, border: `1px solid ${bdr}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>Overall profile coverage</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: barColor(overallPct) }}>{overallPct}%</span>
                  </div>
                  <div style={{ height: 8, background: bdr, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${overallPct}%`, background: barColor(overallPct), borderRadius: 4, transition: 'width 0.6s ease' }} />
                  </div>
                  <p style={{ fontSize: 12, color: muted, margin: '8px 0 0' }}>
                    {overallPct >= 60 ? 'Strong coverage — your score will be well-supported by data.'
                     : overallPct >= 35 ? 'Moderate coverage — missing fields will default to 0 in your score.'
                     : 'Sparse coverage — consider adding more detail in the sections below.'}
                  </p>
                </div>

                {/* 6 Parameter cards in 2-col grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {paramCards.map((card) => (
                    <div key={card.key} style={{
                      padding: '16px 18px', borderRadius: 12,
                      border: `1px solid ${card.completionPct >= 60 ? '#BBF7D0' : card.completionPct >= 30 ? '#FDE68A' : bdr}`,
                      background: bg,
                    }}>
                      {/* Card header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: ink, lineHeight: 1.3 }}>{card.label}</div>
                        <div style={{
                          fontSize: 12, fontWeight: 800, color: barColor(card.completionPct),
                          background: card.completionPct >= 60 ? '#F0FDF4' : card.completionPct >= 30 ? '#FFFBEB' : '#FEF2F2',
                          padding: '2px 8px', borderRadius: 20, flexShrink: 0, marginLeft: 8,
                        }}>{card.completionPct}%</div>
                      </div>
                      {/* Progress bar */}
                      <div style={{ height: 4, background: bdr, borderRadius: 2, overflow: 'hidden', marginBottom: 12 }}>
                        <div style={{ height: '100%', width: `${card.completionPct}%`, background: barColor(card.completionPct), borderRadius: 2 }} />
                      </div>

                      {/* Extracted fields */}
                      {card.snippets.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: card.missing.length > 0 ? 10 : 0 }}>
                          {card.snippets.slice(0, 4).map((s, i) => {
                            const conf = s.fieldKey ? confidenceLabel(s.fieldKey) : null
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                <CheckCircle2 size={12} color={green} strokeWidth={2} style={{ flexShrink: 0 }} />
                                <span style={{ color: muted, flexShrink: 0 }}>{s.label}:</span>
                                <span style={{ color: ink, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.value}</span>
                                {conf && (
                                  <span style={{ fontSize: 10, fontWeight: 600, color: conf.color, background: `${conf.color}18`, padding: '1px 5px', borderRadius: 10, flexShrink: 0 }}>
                                    {conf.label}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Missing fields */}
                      {card.missing.slice(0, 3).map((m, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 4 }}>
                          <XIcon size={11} color={red} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                          <span style={{ color: '#9CA3AF' }}>{m}</span>
                        </div>
                      ))}
                      {card.snippets.length === 0 && card.missing.length === 0 && (
                        <div style={{ fontSize: 12, color: muted, fontStyle: 'italic' }}>No data found for this parameter.</div>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            </div>

            {/* Sticky CTA footer — always visible regardless of scroll position */}
            <div style={{
              position: 'sticky', bottom: 0, background: bg,
              borderTop: `1px solid ${bdr}`, padding: '14px 40px',
              display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center',
              zIndex: 10,
            }}>
              <button
                onClick={() => setCurrentStep(smartQuestions.length > 0 ? 'smart-qa' : 'extract-results')}
                style={{ padding: '10px 18px', borderRadius: 8, border: `1px solid ${bdr}`, background: 'transparent', fontSize: 13, color: muted, cursor: 'pointer', fontFamily: 'inherit' }}
              >← Back</button>
              <button
                onClick={() => { setCurrentStep(6); handleSubmit() }}
                style={{
                  padding: '13px 32px', borderRadius: 10, border: 'none',
                  background: blue, color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: `0 4px 14px ${blue}40`,
                }}
              >Calculate my Q-Score →</button>
            </div>
            </>
          )
        })()}

        {/* ── STEP 6: Review & Submit ── */}
        {currentStep === 6 && (
          <div style={{ maxWidth: 720, margin: '0 auto', width: '100%', padding: '48px 40px 60px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {submitResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {submitResult.iqBreakdown.length > 0 && (() => {
                  const narrative = buildScoreNarrative(
                    submitResult.iqBreakdown, submitResult.score, submitResult.grade, submitResult.reconciliationFlags
                  )
                  const toS100 = (avg: number) => Math.round(avg * 20)
                  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                  const companyLabel = founderProfile.companyName || 'Your Startup'

                  function generateMemoPDF() {
                    const rows = submitResult!.iqBreakdown.map(p => {
                      const ps = toS100(p.averageScore)
                      const inds = (p.indicators ?? []).map(ind => {
                        const sc = ind.excluded ? '—' : ind.rawScore === 0 ? '0.0' : ind.rawScore.toFixed(1)
                        const flag = ind.vcAlert && !ind.excluded ? ' ⚑' : ''
                        const ex = ind.excluded ? ` (${ind.exclusionReason ?? 'N/A'})` : ''
                        return `<tr style="border-bottom:1px solid #E8E3D8"><td style="padding:6px 12px;font-size:11px;color:#6B6760">${ind.name}${ex}</td><td style="padding:6px 12px;font-size:11px;font-weight:700;color:${ind.excluded ? '#aaa' : ind.rawScore >= 4 ? '#16A34A' : ind.rawScore >= 2.5 ? '#D97706' : '#DC2626'};text-align:center">${sc}${flag}</td></tr>`
                      }).join('')
                      return `<div style="margin-bottom:20px;border:1px solid #E8E3D8;border-radius:10px;overflow:hidden"><div style="background:#F5F1E8;padding:10px 16px;display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px;font-weight:700;color:#2A2826">${p.name}</span><span style="font-size:13px;font-weight:800;color:${ps >= 70 ? '#16A34A' : ps >= 45 ? '#D97706' : '#DC2626'}">${ps}/100</span></div><div style="padding:8px 0"><div style="height:4px;background:#E8E3D8;margin:0 16px 10px"><div style="height:100%;width:${ps}%;background:${ps >= 70 ? '#16A34A' : ps >= 45 ? '#D97706' : '#DC2626'}"></div></div><table style="width:100%;border-collapse:collapse">${inds}</table></div>${narrative.perParam[p.id] ? `<div style="padding:10px 16px;background:#FAF8F3;border-top:1px solid #E8E3D8;font-size:12px;color:#6B6760;line-height:1.6">${narrative.perParam[p.id]}</div>` : ''}</div>`
                    }).join('')

                    const unlocks = submitResult!.unlockCards.map(c => `<div style="display:flex;gap:14px;padding:12px 14px;border:1px solid #E8E3D8;border-radius:8px;margin-bottom:10px"><div style="min-width:44px;text-align:center;padding-top:4px"><div style="font-size:20px;font-weight:800;color:#2563EB">+${c.estimatedPointGain}</div><div style="font-size:9px;color:#6B6760;text-transform:uppercase;letter-spacing:0.06em">pts</div></div><div><div style="font-size:12px;font-weight:700;color:#2A2826;margin-bottom:3px">${c.indicatorName}</div><div style="font-size:11px;color:#6B6760;margin-bottom:5px">${c.currentScore.toFixed(1)}/5 → target ${c.targetScore}/5${c.agentId ? ` · ${c.agentId.charAt(0).toUpperCase() + c.agentId.slice(1)} can help` : ''}</div><div style="font-size:12px;color:#2A2826;line-height:1.55">${c.action}</div></div></div>`).join('')

                    const warnings = submitResult!.validationWarnings.length > 0
                      ? `<div style="margin:16px 0;padding:12px 16px;background:#FFFBEB;border:1px solid #D97706;border-radius:8px"><div style="font-size:11px;font-weight:700;color:#D97706;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Consistency Notes</div>${submitResult!.validationWarnings.map(w => `<div style="font-size:12px;color:#2A2826;line-height:1.5">· ${w}</div>`).join('')}</div>` : ''

                    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>IQ Score Memo — ${companyLabel}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FAFAF9;color:#2A2826}
  .page{max-width:720px;margin:0 auto;padding:0 0 80px}
  .print-footer{position:fixed;bottom:0;left:0;right:0;background:#FAFAF9;border-top:1px solid #E8E3D8;padding:10px 40px;display:flex;justify-content:space-between;align-items:center}
  @media print{
    body{background:white}
    .no-print{display:none!important}
    .print-footer{background:white}
    @page{size:A4;margin:0 0 18mm 0}
  }
</style>
</head>
<body>
<div class="page">

  <!-- Edge Alpha header bar -->
  <div style="background:#1A1815;color:#FAF8F3;padding:14px 40px;display:flex;justify-content:space-between;align-items:center;margin-bottom:0">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:22px;height:22px;background:#FAF8F3;border-radius:4px;display:flex;align-items:center;justify-content:center">
        <div style="width:10px;height:10px;border:2px solid #1A1815;border-radius:2px"></div>
      </div>
      <span style="font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase">Edge Alpha</span>
    </div>
    <span style="font-size:10px;color:rgba(250,248,243,0.5);letter-spacing:0.08em">IQ SCORE MEMO</span>
  </div>

  <!-- Document header -->
  <div style="padding:32px 40px 28px;border-bottom:1px solid #E8E3D8;background:white">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px">
      <div>
        <div style="font-size:10px;font-weight:700;color:#9B9691;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:8px">Investor Readiness Assessment</div>
        <div style="font-size:26px;font-weight:700;color:#2A2826;letter-spacing:-0.02em;line-height:1.1;margin-bottom:6px">${companyLabel}</div>
        <div style="font-size:12px;color:#9B9691">${dateStr}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:64px;font-weight:300;color:#2A2826;line-height:1;letter-spacing:-0.05em">${submitResult!.score}</div>
        <div style="display:inline-flex;align-items:center;gap:6px;margin-top:6px;padding:3px 10px;background:#F0F0EE;border-radius:20px">
          <span style="font-size:12px;font-weight:700;color:#2A2826">Grade ${submitResult!.grade}</span>
        </div>
        ${submitResult!.track ? `<div style="font-size:11px;color:#9B9691;margin-top:6px">${submitResult!.track} track</div>` : ''}
      </div>
    </div>
  </div>

  <div style="padding:32px 40px">

    <!-- Parameter overview -->
    <div style="margin-bottom:32px">
      <div style="font-size:9px;font-weight:700;color:#9B9691;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:16px">Parameter Overview</div>
      ${submitResult!.iqBreakdown.map(p => { const ps = toS100(p.averageScore); const bc = ps >= 70 ? '#16A34A' : ps >= 45 ? '#D97706' : '#DC2626'; return `<div style="display:flex;align-items:center;gap:14px;margin-bottom:11px"><div style="width:160px;font-size:12px;color:#2A2826;font-weight:500;flex-shrink:0">${p.name}</div><div style="flex:1;height:5px;background:#E8E3D8;border-radius:3px;overflow:hidden"><div style="height:100%;width:${ps}%;background:${bc}"></div></div><div style="width:40px;text-align:right;font-size:12px;font-weight:700;color:#2A2826">${ps}</div></div>` }).join('')}
    </div>

    <!-- Narrative -->
    <div style="margin-bottom:32px;padding:18px 22px;background:#F5F3EE;border-left:2px solid #2A2826;border-radius:0 8px 8px 0">
      <div style="font-size:9px;font-weight:700;color:#9B9691;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:8px">Assessment Summary</div>
      <p style="font-size:13px;color:#2A2826;line-height:1.75">${narrative.overall}</p>
    </div>

    <!-- Indicator detail -->
    <div style="margin-bottom:32px">
      <div style="font-size:9px;font-weight:700;color:#9B9691;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:16px">Indicator Detail</div>
      ${rows}
    </div>

    ${warnings}

    ${submitResult!.unlockCards.length > 0 ? `<div style="margin-bottom:32px"><div style="font-size:9px;font-weight:700;color:#9B9691;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:16px">Top Score Unlocks</div>${unlocks}</div>` : ''}

    ${submitResult!.readinessSummary ? `<div style="padding:18px 22px;background:#F5F3EE;border:1px solid #E8E3D8;border-radius:8px;margin-bottom:32px"><div style="font-size:9px;font-weight:700;color:#9B9691;text-transform:uppercase;letter-spacing:0.14em;margin-bottom:8px">Investor Readiness Summary</div><p style="font-size:13px;color:#2A2826;line-height:1.75;font-style:italic">${submitResult!.readinessSummary}</p></div>` : ''}

  </div>
</div>

<!-- Footer — fixed at bottom of every page -->
<div class="print-footer">
  <span style="font-size:10px;color:#9B9691">Confidential · Edge Alpha · ${dateStr}</span>
  <span style="font-size:10px;color:#9B9691;font-weight:500">www.edgealpha.vc</span>
</div>

<script>window.onload=function(){window.print()}<\/script>
</body></html>`

                    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
                    const blobUrl = URL.createObjectURL(blob)
                    const win = window.open(blobUrl, '_blank')
                    if (win) {
                      win.addEventListener('afterprint', () => URL.revokeObjectURL(blobUrl))
                    }
                  }

                  // Derive top strengths/risks from iqBreakdown
                  const sorted = [...submitResult.iqBreakdown].sort((a, b) => b.averageScore - a.averageScore)
                  const strengths = sorted.slice(0, 2).map(p => p.name)
                  const risks     = [...submitResult.iqBreakdown].sort((a, b) => a.averageScore - b.averageScore).slice(0, 2).map(p => p.name)

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                      {/* ── Q-Score Snapshot Hero ── */}
                      <div style={{ padding: '28px 0 24px', marginBottom: 28, borderBottom: `1px solid ${bdr}` }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                          {/* Score + grade */}
                          <div style={{ padding: '24px', background: surf, border: `1px solid ${bdr}`, borderRadius: 16, textAlign: 'center' }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Your Q-Score</div>
                            <div style={{ fontSize: 72, fontWeight: 800, color: submitResult.score >= 70 ? green : submitResult.score >= 45 ? amber : red, lineHeight: 1, letterSpacing: '-0.04em', marginBottom: 8 }}>
                              {submitResult.score}
                            </div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: bg, border: `1px solid ${bdr}`, borderRadius: 20, marginBottom: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: ink }}>Grade {submitResult.grade}</span>
                              {Boolean((submitResult.iqBreakdown[0] as Record<string, unknown>)?.percentileLabel) && (
                                <span style={{ fontSize: 11, color: muted }}>· {String((submitResult.iqBreakdown[0] as Record<string, unknown>).percentileLabel)}</span>
                              )}
                            </div>
                            {submitResult.track && <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>{submitResult.track} track</div>}
                          </div>

                          {/* Strengths + risks */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {strengths.length > 0 && (
                              <div style={{ padding: '16px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 12 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Strengths</div>
                                {strengths.map(s => (
                                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: green, flexShrink: 0 }} />
                                    <span style={{ fontSize: 12, color: ink }}>{s}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {risks.length > 0 && (
                              <div style={{ padding: '16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: amber, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Improve</div>
                                {risks.map(r => (
                                  <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: amber, flexShrink: 0 }} />
                                    <span style={{ fontSize: 12, color: ink }}>{r}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                          <button onClick={() => router.push('/founder/dashboard')} style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: blue, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                            View Dashboard →
                          </button>
                          <button onClick={() => router.push('/founder/improve-qscore')} style={{ padding: '10px 22px', borderRadius: 9, border: `1px solid ${bdr}`, background: 'transparent', color: ink, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Improve my score
                          </button>
                        </div>
                      </div>

                      {/* Memo Header */}
                      <div style={{ padding: '32px 0 28px', borderBottom: `1px solid ${bdr}`, marginBottom: 28 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
                              Edge Alpha · IQ Score Memo
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: ink, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 6 }}>
                              {companyLabel}
                            </div>
                            <div style={{ fontSize: 12, color: muted }}>{dateStr}</div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 56, fontWeight: 800, color: ink, lineHeight: 1, letterSpacing: '-0.03em' }}>{submitResult.score}</div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, padding: '3px 10px', background: surf2, borderRadius: 20 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: ink }}>Grade {submitResult.grade}</span>
                            </div>
                            {submitResult.track && <div style={{ marginTop: 6, fontSize: 11, fontWeight: 500, color: muted }}>{submitResult.track} track</div>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                          <button onClick={() => router.push('/founder/dashboard')} style={{ padding: '10px 22px', borderRadius: 9, border: 'none', background: blue, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 2px 10px ${blue}33` }}>Go to Dashboard →</button>
                          <button onClick={() => router.push('/founder/improve-qscore')} style={{ padding: '10px 22px', borderRadius: 9, border: `1px solid ${bdr}`, background: 'transparent', color: ink, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Improve my score</button>
                          <button onClick={generateMemoPDF} style={{ padding: '10px 18px', borderRadius: 9, border: `1px solid ${bdr}`, background: 'transparent', color: muted, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                            <FileText size={13} strokeWidth={1.75} /> Download PDF
                          </button>
                        </div>
                      </div>

                      {/* Parameter overview */}
                      <div style={{ marginBottom: 28 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Parameter Overview</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {submitResult.iqBreakdown.map(p => {
                            const ps = toS100(p.averageScore)
                            const bc = ps >= 70 ? green : ps >= 45 ? amber : red
                            return (
                              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{ width: 160, fontSize: 12, fontWeight: 500, color: ink, flexShrink: 0 }}>{p.name}</div>
                                <div style={{ flex: 1, height: 5, background: bdr, borderRadius: 3, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${ps}%`, background: bc, borderRadius: 3, transition: 'width 0.6s ease' }} />
                                </div>
                                <div style={{ width: 44, textAlign: 'right', fontSize: 12, fontWeight: 700, color: ink }}>{ps}</div>
                              </div>
                            )
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
                  )
                })()}

              </div>
            ) : (
              <>
                {/* Fast-mode: auto-submitting — show full loading state */}
                {flowMode === 'fast' && isSubmitting ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '80px 40px', textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Loader2 size={28} color={blue} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 22, fontWeight: 700, color: ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                        Calculating your IQ Score…
                      </h2>
                      <p style={{ fontSize: 14, color: muted, margin: 0, lineHeight: 1.6 }}>
                        Scoring all parameters, running benchmarks and AI reconciliation.
                      </p>
                    </div>
                  </div>
                ) : null}
                <div style={{ textAlign: 'center', display: flowMode === 'fast' && isSubmitting ? 'none' : undefined }}>
                  <h2 style={{ fontSize: 24, fontWeight: 700, color: ink, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                    {flowMode === 'fast' ? 'Your partial IQ Score' : 'Review & Submit'}
                  </h2>
                  <p style={{ fontSize: 14, color: muted, margin: 0 }}>
                    {flowMode === 'fast'
                      ? `Based on ${Object.values(sections).filter(s => s.completionScore >= 30).length}/5 parameters answered. Add more sections to raise it.`
                      : `${completedCount}/5 sections complete. ${canSubmit ? 'Ready to calculate your IQ Score.' : 'Complete at least 1 section to submit.'}`}
                  </p>
                </div>

                {/* Section cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['1','2','3','4','5'].map(k => {
                  const sec = sections[k]
                  const pct = animatedScores[k] ?? sec?.completionScore ?? 0
                  // ≥60% = score ≥ 3/5 = strong
                  const isStrong60 = pct >= 60
                  return (
                    <div key={k} style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 16px', borderRadius: 10,
                      background: surf, border: `1px solid ${isStrong60 ? green + '55' : bdr}`,
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: isStrong60 ? '#DCFCE7' : surf2,
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
                      <button onClick={() => setCurrentStep(parseInt(k, 10))} style={{
                        padding: '5px 12px', borderRadius: 6, border: `1px solid ${bdr}`,
                        background: 'transparent', fontSize: 12, color: muted,
                        cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                      }}>
                        {isStrong60 ? 'Improve' : 'Add detail'}
                      </button>
                    </div>
                  )
                })}
                </div>

                {rateLimitUntil && (
                  <div style={{ padding: '16px 20px', borderRadius: 10, background: '#FFFBEB', border: `1px solid ${amber}44` }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: amber, marginBottom: 4 }}>Score recalculation locked for 24 hours</div>
                    <div style={{ fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>
                      Next calculation available{' '}
                      <strong>{rateLimitUntil.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</strong>
                      {' '}at{' '}
                      <strong>{rateLimitUntil.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</strong>.
                      <br />
                      <span style={{ fontSize: 12, opacity: 0.85 }}>You can still upload documents and add more detail to any section in the meantime.</span>
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button onClick={() => setCurrentStep(0)} style={{
                        padding: '8px 16px', borderRadius: 8, border: 'none',
                        background: blue, color: '#fff', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}>Upload more documents →</button>
                      <button onClick={() => router.push('/founder/improve-qscore')} style={{
                        padding: '8px 16px', borderRadius: 8, border: 'none',
                        background: amber, color: '#fff', fontSize: 12, fontWeight: 600,
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
        @media print {
          body > * { display: none !important; }
          .result-memo { display: flex !important; flex-direction: column; gap: 16px; }
        }
      `}</style>
    </div>
  )
}

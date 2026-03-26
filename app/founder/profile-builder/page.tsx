'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { shouldTriggerUpload, getInitialQuestion, PITCH_SECTION_QUESTION } from '@/lib/profile-builder/question-engine'
import type { FounderProfile } from '@/lib/profile-builder/question-engine'

// ── palette ──────────────────────────────────────────────────────────────────
const bg    = '#F9F7F2'
const surf  = '#F0EDE6'
const bdr   = '#E2DDD5'
const ink   = '#18160F'
const muted = '#8A867C'
const blue  = '#2563EB'
const green = '#16A34A'
const amber = '#D97706'

// Score impact per section upload
const UPLOAD_IMPACT: Record<number, { dim: string; pts: number }> = {
  1: { dim: 'Traction',  pts: 12 },
  2: { dim: 'Market',    pts: 8  },
  3: { dim: 'Product',   pts: 10 },
  4: { dim: 'Team',      pts: 6  },
  5: { dim: 'Financial', pts: 18 },
}

// Step order — includes pitch section between documents and market validation
const STEP_ORDER: Array<number | 'pitch'> = [0, 'pitch', 1, 2, 3, 4, 5, 6]

// ── types ────────────────────────────────────────────────────────────────────
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

const SECTION_LABELS: Record<number | string, string> = {
  0: 'Documents',
  pitch: 'The Pitch',
  1: 'Market Validation',
  2: 'Market & Competition',
  3: 'IP & Technology',
  4: 'Team',
  5: 'Financials & Impact',
  6: 'Review & Submit',
}

const SECTION_DESCRIPTIONS: Record<number | string, string> = {
  0: 'Optional — upload pitch decks, financial models, and other documents',
  pitch: "YC's first question — explain what you do in 2-3 clear sentences",
  1: 'P1 — Market Readiness: customers, pilots, and willingness to pay',
  2: 'P2 — Market Potential: size, urgency, competition',
  3: 'P3 — IP & Defensibility: patents, technical depth, build complexity',
  4: 'P4 — Founder & Team: domain expertise, experience, cohesion',
  5: 'P5 — Financials & Structural Impact: revenue, burn, and ESG signals',
  6: 'Review your profile and calculate your Q-Score',
}

function initSection(): SectionState {
  return {
    messages: [], extractedFields: {}, confidenceMap: {},
    completionScore: 0, uploadedDocuments: [], conversation: '',
    isComplete: false,
  }
}

interface PreviewData {
  projectedScore: number
  grade: string
  dimensions: Record<string, number>
  boostActions: Array<{ action: string; impact: number }>
  marketplaceUnlocked: boolean
  sectionsComplete: number
}

// ── main component ────────────────────────────────────────────────────────────
export default function ProfileBuilderPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<number | 'pitch'>(0)
  const [sections, setSections] = useState<Record<number | string, SectionState>>({
    pitch: initSection(),
    1: initSection(), 2: initSection(), 3: initSection(),
    4: initSection(), 5: initSection(),
  })
  const [founderProfile, setFounderProfile] = useState<FounderProfile>({
    stage: 'pre-product', industry: 'general', revenueStatus: 'pre-revenue',
  })
  const [token, setToken] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ score: number; grade: string } | null>(null)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Section chat state
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [uploadTrigger, setUploadTrigger] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; section: number | string; fields: number }>>([])

  // On mount: get session + load draft
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/founder/onboarding'); return }
      const tok = data.session.access_token
      setToken(tok)

      // Load founder profile for adaptive questions
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

      // Load draft data
      const draftRes = await fetch('/api/profile-builder/draft', {
        headers: { Authorization: `Bearer ${tok}` }
      })
      if (draftRes.ok) {
        const draft = await draftRes.json()
        if (draft.sections && Object.keys(draft.sections).length > 0) {
          setSections(prev => {
            const next = { ...prev }
            for (const [sec, data] of Object.entries(draft.sections)) {
              const sNum = parseInt(sec, 10)
              const d = data as { extractedFields: Record<string, unknown>; confidenceMap: Record<string, number>; completionScore: number }
              next[sNum] = {
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
      }
    })
  }, [router])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sections, isTyping])

  // Start a section by sending the initial question
  const startSection = useCallback((sectionKey: number | 'pitch') => {
    if (!founderProfile) return
    const initialQ = sectionKey === 'pitch'
      ? PITCH_SECTION_QUESTION
      : getInitialQuestion(sectionKey, founderProfile)
    setSections(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        messages: [{ role: 'agent' as const, text: initialQ }],
      },
    }))
  }, [founderProfile])

  useEffect(() => {
    const isConversationalStep = currentStep === 'pitch' || (typeof currentStep === 'number' && currentStep >= 1 && currentStep <= 5)
    if (isConversationalStep) {
      const sec = sections[currentStep]
      if (sec && sec.messages.length === 0 && !sec.isComplete) {
        startSection(currentStep)
      }
    }
  }, [currentStep, startSection, sections])

  // Load preview data when reaching step 6
  useEffect(() => {
    if (currentStep !== 6 || !token) return
    setPreviewLoading(true)
    fetch('/api/profile-builder/preview', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setPreviewData(data))
      .catch(() => { /* non-blocking */ })
      .finally(() => setPreviewLoading(false))
  }, [currentStep, token])

  const saveSection = useCallback(async (sectionNum: number | 'pitch', state: SectionState, tok: string) => {
    // pitch section is UI-only — no DB save needed (not scored)
    if (sectionNum === 'pitch') return
    await fetch('/api/profile-builder/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      body: JSON.stringify({
        section: sectionNum,
        rawConversation: state.conversation,
        extractedFields: state.extractedFields,
        confidenceMap: state.confidenceMap,
        completionScore: state.completionScore,
        uploadedDocuments: state.uploadedDocuments,
      }),
    })
  }, [])

  async function handleSend() {
    if (!input.trim() || !token) return
    const sectionNum = currentStep
    const userText = input.trim()
    setInput('')
    setUploadTrigger(null)

    // Add user message
    setSections(prev => ({
      ...prev,
      [sectionNum]: {
        ...prev[sectionNum],
        messages: [...prev[sectionNum].messages, { role: 'user' as const, text: userText }],
        conversation: prev[sectionNum].conversation + `\nFounder: ${userText}`,
      },
    }))

    // Pitch section: evaluate clarity locally, no scored extraction needed
    if (sectionNum === 'pitch') {
      setIsTyping(true)
      await new Promise(r => setTimeout(r, 600))
      const words = userText.split(' ').length
      const hasProblem = /problem|issue|struggle|pain|hard|difficult|broken|fail/i.test(userText)
      const hasWho = /founder|startup|company|we |our |team/i.test(userText) || words > 10
      const hasNow = /now|today|recent|2020|2021|2022|2023|2024|2025|pandemic|ai|llm|remote|cloud/i.test(userText)
      const clarityScore = Math.min(100, (words > 20 ? 40 : words > 10 ? 25 : 10) + (hasProblem ? 20 : 0) + (hasWho ? 20 : 0) + (hasNow ? 20 : 0))
      const isGoodPitch = clarityScore >= 60

      const reply = isGoodPitch
        ? (hasNow ? "That's a clear pitch — problem, audience, and timing are all present. Move on to the next section." : "Good clarity on the problem and customer. What changed in the world recently that makes this the right time to build this?")
        : "Help me understand better — who specifically has this problem, and what happens to them if they don't solve it?"

      setSections(prev => ({
        ...prev,
        pitch: {
          ...prev['pitch'],
          messages: [...prev['pitch'].messages, { role: 'agent' as const, text: reply }],
          completionScore: clarityScore,
          isComplete: isGoodPitch && hasNow,
        },
      }))
      setIsTyping(false)
      return
    }

    // Check upload trigger for numeric sections
    const uploadPrompt = typeof sectionNum === 'number' ? shouldTriggerUpload(userText, sectionNum) : null
    if (uploadPrompt) setUploadTrigger(uploadPrompt)

    setIsTyping(true)

    try {
      const sec = sections[sectionNum]
      const newConversation = sec.conversation + `\nFounder: ${userText}`

      const res = await fetch('/api/profile-builder/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          section: sectionNum,
          conversationText: newConversation,
          founderProfile,
          existingExtracted: sec.extractedFields,
        }),
      })

      if (res.ok) {
        const extracted = await res.json()
        const newState: SectionState = {
          ...sec,
          messages: [...sec.messages, { role: 'user', text: userText }],
          extractedFields: extracted.mergedFields ?? sec.extractedFields,
          confidenceMap: { ...sec.confidenceMap, ...extracted.confidenceMap },
          completionScore: extracted.completionScore ?? sec.completionScore,
          conversation: newConversation,
          isComplete: (extracted.completionScore ?? 0) >= 70,
        }

        // Add follow-up question if any
        const agentReply = extracted.followUpQuestion ?? (extracted.completionScore >= 70 ? 'Great — I have enough information for this section. Feel free to add more or move on.' : null)
        if (agentReply) {
          newState.messages = [...newState.messages, { role: 'agent', text: agentReply }]
        }

        setSections(prev => ({ ...prev, [sectionNum]: newState }))
        await saveSection(sectionNum, newState, token)
      }
    } catch (e) {
      console.error('Extract error:', e)
    } finally {
      setIsTyping(false)
    }
  }

  async function handleFileUpload(file: File) {
    if (!token) return
    setUploadLoading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('section', String(currentStep))

    try {
      const res = await fetch('/api/profile-builder/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        const fieldsFound = data.extractedPreview?.length ?? 0

        // Merge extracted fields into section
        if (data.extractedFields && currentStep !== 0 && currentStep !== 'pitch') {
          setSections(prev => {
            const sec = prev[currentStep]
            const newUploadedDocs = [
              ...sec.uploadedDocuments,
              { uploadId: data.uploadId ?? '', filename: file.name, fields: fieldsFound },
            ]
            const mergedExtracted = { ...sec.extractedFields }
            const mergeDeep = (target: Record<string, unknown>, source: Record<string, unknown>) => {
              for (const [k, v] of Object.entries(source)) {
                if (v === null || v === undefined) continue
                if (typeof v === 'object' && !Array.isArray(v) && typeof target[k] === 'object') {
                  mergeDeep(target[k] as Record<string, unknown>, v as Record<string, unknown>)
                } else { target[k] = v }
              }
            }
            mergeDeep(mergedExtracted, data.extractedFields)

            const agentMsg: Message = {
              role: 'agent',
              text: `I've reviewed "${file.name}" and extracted ${fieldsFound} fields. ${data.summary ?? ''}`,
            }
            const newState: SectionState = {
              ...sec,
              messages: [...sec.messages, agentMsg],
              extractedFields: mergedExtracted,
              confidenceMap: { ...sec.confidenceMap, ...data.confidenceMap },
              uploadedDocuments: newUploadedDocs,
            }
            saveSection(currentStep, newState, token)
            return { ...prev, [currentStep]: newState }
          })
        }

        // Track in uploaded files list (once, regardless of step)
        setUploadedFiles(prev => [...prev, { name: file.name, section: currentStep, fields: fieldsFound }])
        setUploadTrigger(null)
      }
    } catch (e) {
      console.error('Upload error:', e)
    } finally {
      setUploadLoading(false)
    }
  }

  async function handleSubmit() {
    if (!token) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/profile-builder/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSubmitResult({ score: data.score, grade: data.grade })
        setTimeout(() => router.push('/founder/dashboard'), 3000)
      }
    } catch (e) {
      console.error('Submit error:', e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const completedSectionsCount = [1, 2, 3, 4, 5]
    .filter(n => sections[n]?.isComplete).length

  const canSubmit = completedSectionsCount >= 3

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex' }}>

      {/* Left sidebar — section nav */}
      <div style={{
        width: 220, flexShrink: 0, background: surf, borderRight: `1px solid ${bdr}`,
        padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 4,
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 12, paddingLeft: 4 }}>
          Profile Builder
        </div>
        {STEP_ORDER.map((step, idx) => {
          const isActive = step === currentStep
          const isConvo = step === 'pitch' || (typeof step === 'number' && step >= 1 && step <= 5)
          const isDone = isConvo ? (sections[step]?.isComplete ?? false) : false
          const dotLabel = isDone ? '✓' : step === 6 ? '★' : step === 0 ? '↑' : step === 'pitch' ? 'P' : String(step)
          return (
            <button
              key={String(step)}
              onClick={() => setCurrentStep(step)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: isActive ? '#EFF6FF' : 'transparent',
                color: isActive ? blue : ink, fontSize: 13,
                fontFamily: 'inherit', textAlign: 'left', width: '100%',
                transition: 'background 0.15s',
              }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: isDone ? green : isActive ? blue : bdr,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: isDone || isActive ? '#fff' : muted,
              }}>
                {dotLabel}
              </div>
              <span style={{ fontWeight: isActive ? 600 : 400 }}>{SECTION_LABELS[step]}</span>
              {isConvo && (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: muted }}>
                  {sections[step]?.completionScore ?? 0}%
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>

        {/* Section header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: ink, margin: 0 }}>
            {SECTION_LABELS[currentStep]}
          </h1>
          <p style={{ fontSize: 13, color: muted, margin: '6px 0 0' }}>
            {SECTION_DESCRIPTIONS[currentStep]}
          </p>
        </div>

        {/* ── STEP 0 — Document Upload ── */}
        {currentStep === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{
              border: `2px dashed ${bdr}`, borderRadius: 12, padding: 40,
              textAlign: 'center', background: surf, cursor: 'pointer',
            }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={{ fontSize: 32 }}>📁</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: ink, marginTop: 8 }}>
                Drop files or click to upload
              </div>
              <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                PDF, PPTX, XLSX, CSV, PNG, JPG — max 10 MB each
              </div>
              {uploadLoading && (
                <div style={{ fontSize: 13, color: blue, marginTop: 8 }}>Uploading…</div>
              )}
            </div>
            {uploadedFiles.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 8 }}>Uploaded documents</div>
                {uploadedFiles.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 8, background: '#fff',
                    border: `1px solid ${bdr}`, marginBottom: 6,
                  }}>
                    <span style={{ fontSize: 18 }}>📄</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: ink }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: muted }}>{f.fields} fields extracted</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => setCurrentStep(1)}
                style={{
                  padding: '12px 28px', borderRadius: 8, border: 'none',
                  background: blue, color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {uploadedFiles.length > 0 ? 'Continue with documents →' : 'Skip — answer questions instead →'}
              </button>
            </div>
          </div>
        )}

        {/* ── PITCH + STEPS 1-5 — Conversational Sections ── */}
        {(currentStep === 'pitch' || (typeof currentStep === 'number' && currentStep >= 1 && currentStep <= 5)) && (() => {
          const sec = sections[currentStep]
          const stepNum = typeof currentStep === 'number' ? currentStep : 0
          const impact = UPLOAD_IMPACT[stepNum]
          const prevScore = typeof currentStep === 'number' ? (previewData?.dimensions as Record<string, number> | undefined)?.[['market','product','gtm','financial','team','traction'][currentStep - 1] ?? ''] : undefined
          const projectedScore = prevScore != null && impact ? Math.min(100, prevScore + impact.pts) : null
          const stripeCardVisible = currentStep === 5 && !uploadLoading && sec.uploadedDocuments.length === 0 && /\$[\d,]+|\d+k\s*mrr|\d+\s*k\s*month/i.test(sec.conversation)
          return (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 16 }}>
              {/* Completion bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 6, background: bdr, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3, transition: 'width 0.5s ease',
                    width: `${sec.completionScore}%`,
                    background: sec.completionScore >= 70 ? green : blue,
                  }} />
                </div>
                <span style={{ fontSize: 12, color: muted, flexShrink: 0 }}>
                  {sec.completionScore}% complete {sec.completionScore >= 70 ? '✓' : ''}
                </span>
              </div>

              {/* Chat messages */}
              <div style={{
                flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
                gap: 12, minHeight: 300, maxHeight: 460, padding: '4px 0',
              }}>
                {sec.messages.map((msg, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}>
                    <div style={{
                      maxWidth: '80%', padding: '10px 14px', borderRadius: 12,
                      fontSize: 14, lineHeight: 1.5,
                      background: msg.role === 'user' ? blue : surf,
                      color: msg.role === 'user' ? '#fff' : ink,
                      border: msg.role === 'agent' ? `1px solid ${bdr}` : 'none',
                    }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div style={{ display: 'flex', gap: 4, padding: '10px 14px', width: 60 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: 6, height: 6, borderRadius: '50%', background: muted,
                        animation: `bounce 0.6s ${i * 0.1}s infinite`,
                      }} />
                    ))}
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Upload trigger with score impact */}
              {uploadTrigger && (
                <div style={{
                  padding: '12px 16px', borderRadius: 8, background: '#FFF7ED',
                  border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <span style={{ fontSize: 18 }}>📊</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#92400E' }}>{uploadTrigger}</div>
                    {impact && (
                      <div style={{ fontSize: 11, color: amber, marginTop: 2, fontWeight: 600 }}>
                        Verify this claim → boost {impact.dim}
                        {projectedScore != null && prevScore != null
                          ? ` ${prevScore} → ${projectedScore}`
                          : ` +${impact.pts} pts`}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '6px 14px', borderRadius: 6, border: 'none',
                      background: amber, color: '#fff', fontSize: 12,
                      fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Upload
                  </button>
                </div>
              )}

              {/* Stripe connect card — Section 5 when revenue mentioned but no doc uploaded */}
              {stripeCardVisible && (
                <div style={{
                  border: `1px solid ${bdr}`, borderRadius: 10, padding: 14,
                  background: surf, display: 'flex', gap: 12, alignItems: 'center',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: ink }}>Connect Stripe for 1.0× multiplier</div>
                    <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>
                      Verified MRR = highest data credibility (+18 pts vs self-reported)
                    </div>
                  </div>
                  <button
                    onClick={() => router.push('/founder/cxo?agent=felix')}
                    style={{
                      padding: '8px 12px', borderRadius: 6, border: `1px solid ${bdr}`,
                      background: 'transparent', fontSize: 12, color: blue,
                      cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit', whiteSpace: 'nowrap',
                    }}
                  >
                    Connect via Felix →
                  </button>
                </div>
              )}

              {/* Input area */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  placeholder="Type your answer… (Enter to send, Shift+Enter for new line)"
                  rows={3}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 10,
                    border: `1.5px solid ${bdr}`, background: '#fff', fontSize: 14,
                    color: ink, resize: 'none', fontFamily: 'inherit', outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    style={{
                      padding: '10px 18px', borderRadius: 8, border: 'none',
                      background: (!input.trim() || isTyping) ? bdr : blue,
                      color: '#fff', fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: 14,
                    }}
                  >
                    Send
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload document"
                    style={{
                      padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${bdr}`,
                      background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 13, color: muted,
                    }}
                  >
                    📎
                  </button>
                </div>
              </div>

              {/* Pitch clarity warning */}
              {currentStep === 'pitch' && sec.completionScore > 0 && sec.completionScore < 60 && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8, background: '#FFFBEB',
                  border: '1px solid #FDE68A', fontSize: 13, color: '#92400E',
                }}>
                  ⚠️ Investors need to understand you immediately. Your pitch needs to clearly name the customer, the problem, and why now. Refine before continuing.
                </div>
              )}

              {/* Section nav */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <button
                  onClick={() => {
                    const idx = STEP_ORDER.indexOf(currentStep)
                    if (idx > 0) setCurrentStep(STEP_ORDER[idx - 1])
                  }}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: `1.5px solid ${bdr}`,
                    background: 'transparent', fontSize: 13, color: ink, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={() => {
                    const idx = STEP_ORDER.indexOf(currentStep)
                    if (idx < STEP_ORDER.length - 1) setCurrentStep(STEP_ORDER[idx + 1])
                  }}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: 'none',
                    background: blue, color: '#fff', fontSize: 13,
                    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {currentStep === 5 ? 'Review & Submit →' : 'Next section →'}
                </button>
              </div>
            </div>
          )
        })()}

        {/* ── STEP 6 — Review & Submit ── */}
        {currentStep === 6 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {submitResult ? (
              <div style={{
                textAlign: 'center', padding: 40, borderRadius: 16,
                background: surf, border: `1px solid ${bdr}`,
              }}>
                <div style={{ fontSize: 64, fontWeight: 800, color: blue }}>{submitResult.score}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: ink }}>Grade {submitResult.grade}</div>
                <div style={{ fontSize: 14, color: muted, marginTop: 8 }}>
                  Your Q-Score is calculated. Redirecting to dashboard…
                </div>
              </div>
            ) : (
              <>
                {/* Live Score Preview Panel */}
                {previewLoading && (
                  <div style={{ padding: 24, borderRadius: 12, background: surf, border: `1px solid ${bdr}`, textAlign: 'center', fontSize: 13, color: muted }}>
                    Calculating projected score…
                  </div>
                )}
                {!previewLoading && previewData && (
                  <div style={{ borderRadius: 14, border: `1px solid ${bdr}`, background: surf, overflow: 'hidden' }}>
                    {/* Score header */}
                    <div style={{ padding: '24px 24px 16px', borderBottom: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', gap: 20 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 56, fontWeight: 800, color: previewData.projectedScore >= 65 ? blue : previewData.projectedScore >= 45 ? amber : muted, lineHeight: 1 }}>
                          {previewData.projectedScore}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: ink, marginTop: 2 }}>Grade {previewData.grade}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 4 }}>Projected Q-Score</div>
                        <div style={{ fontSize: 12, color: muted, marginBottom: 8 }}>
                          {previewData.marketplaceUnlocked
                            ? '✅ Investor Marketplace unlocked (≥65)'
                            : `🔒 ${65 - previewData.projectedScore} pts to unlock Investor Marketplace`}
                        </div>
                        <div style={{ fontSize: 11, color: muted }}>{previewData.sectionsComplete}/5 sections at 70%+</div>
                      </div>
                    </div>

                    {/* Dimension bars */}
                    <div style={{ padding: '16px 24px', borderBottom: `1px solid ${bdr}` }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dimension Breakdown</div>
                      {[
                        { key: 'market', label: 'Market' },
                        { key: 'product', label: 'Product' },
                        { key: 'gtm', label: 'Go-to-Market' },
                        { key: 'financial', label: 'Financial' },
                        { key: 'team', label: 'Team' },
                        { key: 'traction', label: 'Traction' },
                      ].map(({ key, label }) => {
                        const score = previewData.dimensions[key] ?? 0
                        const barColor = score >= 70 ? green : score >= 50 ? blue : amber
                        return (
                          <div key={key} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <span style={{ fontSize: 12, color: ink }}>{label}</span>
                              <span style={{ fontSize: 12, color: muted, fontWeight: 600 }}>{score}</span>
                            </div>
                            <div style={{ height: 5, background: bdr, borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${score}%`, background: barColor, borderRadius: 3, transition: 'width 0.6s ease' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Boost actions */}
                    {previewData.boostActions.length > 0 && (
                      <div style={{ padding: '16px 24px' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Score Boosts</div>
                        {previewData.boostActions.map((a, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <div style={{ width: 32, height: 20, borderRadius: 4, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: blue }}>
                              +{a.impact}
                            </div>
                            <span style={{ fontSize: 13, color: ink }}>{a.action}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ fontSize: 14, color: muted }}>
                  {completedSectionsCount}/5 sections complete.{' '}
                  {canSubmit ? 'Ready to calculate your final Q-Score.' : 'Complete at least 3 sections (70%+) to submit.'}
                </div>

                {/* Section summary cards */}
                {[1, 2, 3, 4, 5].map(sNum => {
                  const sec = sections[sNum]
                  const pct = sec?.completionScore ?? 0
                  return (
                    <div key={sNum} style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '14px 18px', borderRadius: 10,
                      background: '#fff', border: `1.5px solid ${pct >= 70 ? green : bdr}`,
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: pct >= 70 ? '#DCFCE7' : surf,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 700,
                        color: pct >= 70 ? green : muted,
                      }}>
                        {pct >= 70 ? '✓' : sNum}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: ink }}>{SECTION_LABELS[sNum]}</div>
                        <div style={{ fontSize: 12, color: muted }}>{pct}% complete</div>
                      </div>
                      <button
                        onClick={() => setCurrentStep(sNum)}
                        style={{
                          padding: '6px 14px', borderRadius: 6, border: `1px solid ${bdr}`,
                          background: 'transparent', fontSize: 12, color: muted,
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  )
                })}

                {uploadedFiles.length > 0 && (
                  <div style={{ fontSize: 13, color: muted }}>
                    {uploadedFiles.length} document{uploadedFiles.length !== 1 ? 's' : ''} attached
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
                    fontFamily: 'inherit', textAlign: 'center',
                    opacity: (!canSubmit || isSubmitting) ? 0.6 : 1,
                  }}
                >
                  {isSubmitting ? 'Calculating your Q-Score…' : 'Calculate My Q-Score →'}
                </button>
              </>
            )}

            <button
              onClick={() => setCurrentStep(5)}
              style={{
                padding: '8px 20px', borderRadius: 8, border: `1.5px solid ${bdr}`,
                background: 'transparent', fontSize: 13, color: ink, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ← Back
            </button>
          </div>
        )}

        <input
          ref={fileInputRef} type="file" style={{ display: 'none' }}
          accept=".pdf,.pptx,.xlsx,.csv,.png,.jpg,.jpeg,.webp"
          onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]) }}
        />
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}

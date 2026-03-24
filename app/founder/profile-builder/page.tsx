'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { shouldTriggerUpload, getInitialQuestion } from '@/lib/profile-builder/question-engine'
import type { FounderProfile } from '@/lib/profile-builder/question-engine'

// ── palette ──────────────────────────────────────────────────────────────────
const bg    = '#F9F7F2'
const surf  = '#F0EDE6'
const bdr   = '#E2DDD5'
const ink   = '#18160F'
const muted = '#8A867C'
const blue  = '#2563EB'
const green = '#16A34A'

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

const SECTION_LABELS: Record<number, string> = {
  0: 'Documents',
  1: 'Market Validation',
  2: 'Market & Competition',
  3: 'IP & Technology',
  4: 'Team',
  5: 'Financials & Impact',
  6: 'Review & Submit',
}

const SECTION_DESCRIPTIONS: Record<number, string> = {
  0: 'Optional — upload pitch decks, financial models, and other documents',
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

// ── main component ────────────────────────────────────────────────────────────
export default function ProfileBuilderPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)  // 0=docs, 1-5=sections, 6=review
  const [sections, setSections] = useState<Record<number, SectionState>>({
    1: initSection(), 2: initSection(), 3: initSection(),
    4: initSection(), 5: initSection(),
  })
  const [founderProfile, setFounderProfile] = useState<FounderProfile>({
    stage: 'pre-product', industry: 'general', revenueStatus: 'pre-revenue',
  })
  const [token, setToken] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ score: number; grade: string } | null>(null)

  // Section chat state
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [uploadTrigger, setUploadTrigger] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; section: number; fields: number }>>([])

  // On mount: get session + load draft
  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
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
  const startSection = useCallback((sectionNum: number) => {
    if (!founderProfile) return
    const initialQ = getInitialQuestion(sectionNum, founderProfile)
    setSections(prev => ({
      ...prev,
      [sectionNum]: {
        ...prev[sectionNum],
        messages: [{ role: 'agent', text: initialQ }],
      },
    }))
  }, [founderProfile])

  useEffect(() => {
    if (currentStep >= 1 && currentStep <= 5) {
      const sec = sections[currentStep]
      if (sec && sec.messages.length === 0 && !sec.isComplete) {
        startSection(currentStep)
      }
    }
  }, [currentStep, startSection, sections])

  const saveSection = useCallback(async (sectionNum: number, state: SectionState, tok: string) => {
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
        messages: [...prev[sectionNum].messages, { role: 'user', text: userText }],
        conversation: prev[sectionNum].conversation + `\nFounder: ${userText}`,
      },
    }))

    // Check upload trigger
    const uploadPrompt = shouldTriggerUpload(userText, sectionNum)
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

        setUploadedFiles(prev => [...prev, { name: file.name, section: currentStep, fields: fieldsFound }])

        // Merge extracted fields into section
        if (data.extractedFields && currentStep >= 1) {
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
        } else if (currentStep === 0) {
          // Doc upload step — just track
          setUploadedFiles(prev => [...prev, { name: file.name, section: 0, fields: fieldsFound }])
        }

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

  const completedSectionsCount = Object.entries(sections)
    .filter(([, s]) => s.isComplete).length

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
        {[0, 1, 2, 3, 4, 5, 6].map(step => {
          const isActive = step === currentStep
          const isDone = step >= 1 && step <= 5 ? sections[step]?.isComplete : false
          return (
            <button
              key={step}
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
                {isDone ? '✓' : step === 6 ? '★' : step === 0 ? '↑' : step}
              </div>
              <span style={{ fontWeight: isActive ? 600 : 400 }}>{SECTION_LABELS[step]}</span>
              {step >= 1 && step <= 5 && (
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
            <input
              ref={fileInputRef} type="file" style={{ display: 'none' }}
              accept=".pdf,.pptx,.xlsx,.csv,.png,.jpg,.jpeg,.webp"
              onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]) }}
            />

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

        {/* ── STEPS 1-5 — Conversational Sections ── */}
        {currentStep >= 1 && currentStep <= 5 && (() => {
          const sec = sections[currentStep]
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

              {/* Upload trigger */}
              {uploadTrigger && (
                <div style={{
                  padding: '12px 16px', borderRadius: 8, background: '#FFF7ED',
                  border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <span style={{ fontSize: 18 }}>📎</span>
                  <div style={{ flex: 1, fontSize: 13, color: '#92400E' }}>{uploadTrigger}</div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      padding: '6px 14px', borderRadius: 6, border: 'none',
                      background: '#D97706', color: '#fff', fontSize: 12,
                      fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Upload
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

              {/* Section nav */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <button
                  onClick={() => setCurrentStep(p => p - 1)}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: `1.5px solid ${bdr}`,
                    background: 'transparent', fontSize: 13, color: ink, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={() => {
                    if (currentStep < 5) setCurrentStep(p => p + 1)
                    else setCurrentStep(6)
                  }}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: 'none',
                    background: blue, color: '#fff', fontSize: 13,
                    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {currentStep < 5 ? 'Next section →' : 'Review & Submit →'}
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
                <div style={{ fontSize: 14, color: muted }}>
                  {completedSectionsCount}/5 sections complete.{' '}
                  {canSubmit ? 'You\'re ready to calculate your Q-Score.' : 'Complete at least 3 sections (70%+) to submit.'}
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

                {/* Uploads summary */}
                {uploadedFiles.length > 0 && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 8 }}>
                      {uploadedFiles.length} document{uploadedFiles.length !== 1 ? 's' : ''} attached
                    </div>
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

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { UpgradeModal } from '@/components/ui/UpgradeModal'
import type { PreviewData } from '@/features/profile-builder/types'
import { STEP_ORDER_FULL, STEP_ORDER_FAST } from '@/features/profile-builder/lib/stepOrder'
import { useAnimatedScores } from '@/features/profile-builder/hooks/useAnimatedScores'
import { useProfileBuilderData } from '@/features/profile-builder/hooks/useProfileBuilderData'
import { useFileUpload } from '@/features/profile-builder/hooks/useFileUpload'
import { useSectionChat } from '@/features/profile-builder/hooks/useSectionChat'
import { useInitialQuestion } from '@/features/profile-builder/hooks/useInitialQuestion'
import { ProfileBuilderShell } from '@/features/profile-builder/components/ProfileBuilderShell'
import { ReviewScreen } from '@/features/profile-builder/components/ReviewScreen'
import { SmartQAScreen } from '@/features/profile-builder/components/SmartQAScreen'
import { UploadStep } from '@/features/profile-builder/components/UploadStep'
import { SectionChat } from '@/features/profile-builder/components/SectionChat'
import { ExtractResultsScreen } from '@/features/profile-builder/components/ExtractResultsScreen'

// ── main component ────────────────────────────────────────────────────────────
export default function ProfileBuilderPage() {
  const router = useRouter()
  const {
    currentStep, setCurrentStep,
    sections, setSections,
    founderProfile,
    token,
    submitResult, setSubmitResult,
    flowMode, setFlowMode,
    extractionSummary, setExtractionSummary,
    smartQuestions, setSmartQuestions,
    smartQaIndex, setSmartQaIndex,
    uploadedFiles, setUploadedFiles,
    saveSection, saveAllExtractedSections, dismissExtractedField, saveFlowState,
  } = useProfileBuilderData()
  const [ycPitchIdx, setYcPitchIdx] = useState(0)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [rateLimitUntil, setRateLimitUntil] = useState<Date | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [isRetake, setIsRetake] = useState(false)
  const [retakeLoading, setRetakeLoading] = useState(false)
  const [_previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [_previewLoading, setPreviewLoading] = useState(false)

  const [isTyping, setIsTyping] = useState(false)

  // ── animated sidebar scores — smoothly tick toward actual completionScores ──
  const animatedScores = useAnimatedScores(sections)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
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
  } = useFileUpload({
    currentStep, setCurrentStep, setSections, setIsTyping, token, founderProfile,
    extractionSummary, setExtractionSummary, flowMode, setFlowMode,
    smartQuestions, setSmartQuestions, smartQaIndex, setSmartQaIndex,
    uploadedFiles, setUploadedFiles, saveSection, saveFlowState, fileInputRef,
  })

  const { handleSend } = useSectionChat({
    currentStep, sections, setSections, token, founderProfile, globalDocText,
    ycPitchIdx, setYcPitchIdx, isTyping, setIsTyping, setUploadTrigger, saveSection,
  })

  // ── auto-clear rateLimitUntil once its time passes ────────────────────────
  useEffect(() => {
    if (!rateLimitUntil) return
    const ms = rateLimitUntil.getTime() - Date.now()
    if (ms <= 0) { setRateLimitUntil(null); return }
    const timer = setTimeout(() => setRateLimitUntil(null), ms)
    return () => clearTimeout(timer)
  }, [rateLimitUntil])

  // ── auto-dismiss toast after 5 seconds ───────────────────────────────────
  useEffect(() => {
    if (!toastMsg) return
    const timer = setTimeout(() => setToastMsg(null), 5000)
    return () => clearTimeout(timer)
  }, [toastMsg])

  // ── proactive cooldown preload when score step is shown ──────────────────
  // Handles the case where user navigates fresh to the page with savedFlowState
  // showing step 6 — rateLimitUntil is in-memory only and resets on nav.
  useEffect(() => {
    if (currentStep !== 6 || rateLimitUntil) return
    fetch('/api/qscore/latest')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const calAt = data?.qScore?.calculatedAt
        if (!calAt) return
        const age = Date.now() - new Date(calAt).getTime()
        if (age < 86400000) {
          setRateLimitUntil(new Date(new Date(calAt).getTime() + 86400000))
        }
      })
      .catch(() => {})
  }, [currentStep]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sections, isTyping, currentStep])

  useInitialQuestion({ currentStep, sections, setSections, founderProfile, isRetake })

  // ── redirect from smart-qa if no questions remain ────────────────────────
  useEffect(() => {
    if (currentStep === 'smart-qa' && smartQuestions.length > 0 && smartQaIndex >= smartQuestions.length) {
      setCurrentStep('extract-results')
    }
  }, [currentStep, smartQaIndex, smartQuestions.length, setCurrentStep])

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
          const avail = new Date(data.retakeAvailableAt)
          setRateLimitUntil(avail)
          setToastMsg(`Next retake available ${avail.toLocaleDateString(undefined, { weekday: 'long' })} at ${avail.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`)
        } else if ((data as { limitReached?: boolean }).limitReached) {
          setUpgradeOpen(true)
        } else {
          // The consistency check (409-class "expected disagreement") names WHICH
          // claims contradict each other and why — showing only the generic label
          // ("Consistency check failed") left the founder with no way to act on it.
          const issues = (data as { issues?: Array<{ message: string }> }).issues
          setSubmitError(
            issues?.length
              ? issues.map(i => i.message).join(' ')
              : data.error ?? 'Submission failed'
          )
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

  // ── retake assessment — clears completion flag, goes back to section 1 ───
  async function handleRetake() {
    if (!token || retakeLoading) return
    setRetakeLoading(true)
    try {
      const res = await fetch('/api/profile-builder/reset', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429 && data.retakeAvailableAt) {
          const avail = new Date(data.retakeAvailableAt)
          setRateLimitUntil(avail)
          setToastMsg(`Next retake available ${avail.toLocaleDateString(undefined, { weekday: 'long' })} at ${avail.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`)
        } else {
          setSubmitError(data.error ?? 'Reset failed')
        }
        return
      }
      // Mark as retake so sections show context-aware opening messages
      setIsRetake(true)
      setSubmitResult(null)
      setCurrentStep(1)
    } catch {
      setSubmitError('Network error — please try again')
    } finally {
      setRetakeLoading(false)
    }
  }

  const STEP_ORDER = flowMode === 'fast' ? STEP_ORDER_FAST : STEP_ORDER_FULL
  const stepIdx = STEP_ORDER.indexOf(currentStep)
  const nextStep = stepIdx < STEP_ORDER.length - 1 ? STEP_ORDER[stepIdx + 1] : null

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <>
    <ProfileBuilderShell
      currentStep={currentStep}
      flowMode={flowMode}
      sections={sections}
      animatedScores={animatedScores}
      submitResult={submitResult}
      onNavigate={setCurrentStep}
      onExit={() => router.push('/founder/dashboard')}
    >
      <>
        {/* ── STEP 0: Document Upload ── */}
        {currentStep === 0 && (
          <UploadStep
            flowMode={flowMode}
            uploadedFiles={uploadedFiles}
            uploadLoading={uploadLoading}
            uploadMsgIdx={uploadMsgIdx}
            uploadError={uploadError}
            uploadWarning={uploadWarning}
            identityMismatch={identityMismatch}
            recalcResult={recalcResult}
            recalcLoading={recalcLoading}
            onUploadClick={() => fileInputRef.current?.click()}
            onRemoveFile={handleRemoveFile}
            onRecalculate={handleRecalculate}
            onRetryIdentityCheck={handleRetryIdentityCheck}
            onDismissIdentityMismatch={() => setIdentityMismatch(null)}
            setCurrentStep={setCurrentStep}
          />
        )}

        {/* ── PITCH + SECTIONS 1-5: Chat ── */}
        {(currentStep === 'pitch' || (typeof currentStep === 'number' && currentStep >= 1 && currentStep <= 5)) && (
          <SectionChat
            currentStep={currentStep}
            sections={sections}
            setSections={setSections}
            animatedScores={animatedScores}
            ycPitchIdx={ycPitchIdx}
            setYcPitchIdx={setYcPitchIdx}
            isTyping={isTyping}
            chatEndRef={chatEndRef}
            uploadTrigger={uploadTrigger}
            uploadLoading={uploadLoading}
            onUploadClick={() => fileInputRef.current?.click()}
            recalcResult={recalcResult}
            recalcLoading={recalcLoading}
            setRecalcResult={setRecalcResult}
            onRecalculate={handleRecalculate}
            onSend={handleSend}
            nextStep={nextStep}
            setCurrentStep={setCurrentStep}
          />
        )}

        {/* ── EXTRACT RESULTS ── */}
        {currentStep === 'extract-results' && (
          <ExtractResultsScreen
            smartQuestions={smartQuestions}
            smartQaIndex={smartQaIndex}
            sections={sections}
            extractionSummary={extractionSummary}
            docTruncationInfo={docTruncationInfo}
            onDismissField={dismissExtractedField}
            setCurrentStep={setCurrentStep}
            setFlowMode={setFlowMode}
            saveAllExtractedSections={saveAllExtractedSections}
            handleSubmit={handleSubmit}
          />
        )}

        {/* ── SMART Q&A ── */}
        {currentStep === 'smart-qa' && (
          <SmartQAScreen
            smartQuestions={smartQuestions}
            smartQaIndex={smartQaIndex}
            setSmartQaIndex={setSmartQaIndex}
            sections={sections}
            setSections={setSections}
            extractionSummary={extractionSummary}
            setExtractionSummary={setExtractionSummary}
            founderProfile={founderProfile}
            token={token}
            saveSection={saveSection}
            saveFlowState={saveFlowState}
            setCurrentStep={setCurrentStep}
          />
        )}

        {/* ── STEP 6: Review & Submit ── */}
        {currentStep === 6 && (
          <ReviewScreen
            flowMode={flowMode}
            sections={sections}
            uploadedFiles={uploadedFiles}
            animatedScores={animatedScores}
            isSubmitting={isSubmitting}
            submitResult={submitResult}
            submitError={submitError}
            rateLimitUntil={rateLimitUntil}
            retakeLoading={retakeLoading}
            founderProfile={founderProfile}
            onSubmit={handleSubmit}
            onRetake={handleRetake}
            onSectionSelect={setCurrentStep}
            onUploadMore={() => setCurrentStep(0)}
            onBack={() => setCurrentStep(5)}
          />
        )}
      </>
    </ProfileBuilderShell>

      {/* 429 rate-limit toast — fixed top-center, auto-dismisses after 5s */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            style={{
              position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
              zIndex: 9999, background: '#92400E', color: '#FEF3C7', borderRadius: 12,
              padding: '10px 22px', fontSize: 13, fontWeight: 600,
              boxShadow: '0 4px 24px rgba(0,0,0,0.2)', pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        accept=".pdf,.pptx,.docx,.xlsx,.csv,.txt,.rtf,.doc,.ppt,.odt,.png,.jpg,.jpeg,.webp"
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

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        feature="qscore_recalc"
      />
    </>
  )
}

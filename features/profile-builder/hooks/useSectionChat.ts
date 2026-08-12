'use client'

import { useRef, type Dispatch, type SetStateAction } from 'react'
import { shouldTriggerUpload } from '@/lib/profile-builder/question-engine'
import type { FounderProfile } from '@/lib/profile-builder/question-engine'
import { streamExtract } from '@/features/profile-builder/lib/streamExtract'
import { initSection } from '@/features/profile-builder/lib/section-state'
import { YC_QUESTIONS } from '@/features/profile-builder/lib/constants'
import type { SectionState, ProfileBuilderStep } from '@/features/profile-builder/types'

interface UseSectionChatParams {
  currentStep: ProfileBuilderStep
  sections: Record<string, SectionState>
  setSections: Dispatch<SetStateAction<Record<string, SectionState>>>
  token: string | null
  founderProfile: FounderProfile
  globalDocText: string
  ycPitchIdx: number
  setYcPitchIdx: Dispatch<SetStateAction<number>>
  isTyping: boolean
  setIsTyping: Dispatch<SetStateAction<boolean>>
  setUploadTrigger: Dispatch<SetStateAction<string | null>>
  saveSection: (secNum: string, state: SectionState, tok: string) => Promise<void>
}

/** Owns the pitch + section chat send flow — the pitch practice's adaptive
 *  follow-ups and the main section chat's extraction+reply, both streamed via
 *  the shared streamExtract SSE consumer. */
export function useSectionChat({
  currentStep, sections, setSections, token, founderProfile, globalDocText,
  ycPitchIdx, setYcPitchIdx, isTyping, setIsTyping, setUploadTrigger, saveSection,
}: UseSectionChatParams) {
  // isTyping (React state) isn't enough to block a double-submit on its own — it's
  // async/batched, so two Enter presses inside the same tick (key-repeat, a fast
  // double-tap) can both read it as still false and both go through, each firing
  // its own streamExtract call and appending its own reply. sendingRef is checked
  // and set synchronously, before anything async, so it can't lose that race.
  const sendingRef = useRef(false)

  // ── handle user message ───────────────────────────────────────────────────
  async function handleSend(text: string) {
    if (!text.trim() || !token || isTyping || sendingRef.current) return
    sendingRef.current = true
    const key = String(currentStep)
    const userText = text.trim()
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

    // Pitch: LLM-driven adaptive follow-up, streamed in as it's written
    if (currentStep === 'pitch') {
      setIsTyping(true)
      const pitchSec = sections['pitch'] ?? initSection()
      const pitchConversation = pitchSec.conversation + `\nFounder: ${userText}`
      let started = false
      try {
        const { meta, followUpQuestion } = await streamExtract(
          token,
          { section: 'pitch', conversationText: pitchConversation },
          full => {
            setIsTyping(false)
            setSections(prev => {
              const msgs = prev['pitch']?.messages ?? []
              const next = started
                ? msgs.map((m, i) => i === msgs.length - 1 ? { ...m, text: full } : m)
                : [...msgs, { role: 'agent' as const, text: full }]
              started = true
              return { ...prev, pitch: { ...prev['pitch'], messages: next } }
            })
          },
        )
        const reply: string = followUpQuestion
          ?? (ycPitchIdx < YC_QUESTIONS.length - 1
            ? YC_QUESTIONS[ycPitchIdx + 1]
            : "Pitch practice complete — strong answers across all dimensions.")
        const isComplete = (meta.completionScore ?? 0) >= 80

        setSections(prev => {
          const msgs = prev['pitch']?.messages ?? []
          const finalMsgs = started
            ? msgs.map((m, i) => i === msgs.length - 1 ? { ...m, text: reply } : m)
            : [...msgs, { role: 'agent' as const, text: reply }]
          return {
            ...prev,
            pitch: {
              ...prev['pitch'],
              messages: finalMsgs,
              conversation: pitchConversation + '\nAgent: ' + reply,
              completionScore: meta.completionScore ?? 0,
              isComplete,
              extractedFields: { ...(prev['pitch']?.extractedFields ?? {}), ...(meta.mergedFields ?? {}) },
            },
          }
        })
        if (!isComplete && ycPitchIdx < YC_QUESTIONS.length - 1) setYcPitchIdx(ycPitchIdx + 1)
      } catch {
        const fallbackReply = ycPitchIdx < YC_QUESTIONS.length - 1 ? YC_QUESTIONS[ycPitchIdx + 1] : "Pitch practice complete."
        setSections(prev => ({
          ...prev,
          pitch: { ...prev['pitch'], messages: [...(prev['pitch']?.messages ?? []), { role: 'agent' as const, text: fallbackReply }] },
        }))
      } finally {
        setIsTyping(false)
        sendingRef.current = false
      }
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
      let started = false

      const { meta, followUpQuestion } = await streamExtract(
        token,
        {
          section: parseInt(key, 10),
          conversationText: conversation,
          uploadedDocumentText: globalDocText || undefined,
          founderProfile,
          existingExtracted: currentSec.extractedFields,
          existingConfidenceMap: currentSec.confidenceMap,
          askedDepthFields: currentSec.askedDepthFields,
        },
        full => {
          setIsTyping(false)
          setSections(prev => {
            const sec = prev[key] ?? initSection()
            const next = started
              ? sec.messages.map((m, i) => i === sec.messages.length - 1 ? { ...m, text: full } : m)
              : [...sec.messages, { role: 'agent' as const, text: full }]
            started = true
            return { ...prev, [key]: { ...sec, messages: next } }
          })
        },
      )

      const pct: number = meta.completionScore ?? 0
      // The model's own reply already opens with a natural acknowledgement of what
      // the founder just said (FOLLOW_UP_PROMPT rule 1) — no client-side "Got it —
      // noted: X, Y, Z" template stacked in front of it. That doubled acknowledgement
      // was the whole "feels like a form wearing a chat skin" complaint.
      const agentReply: string = followUpQuestion
        ?? (pct >= 70
          ? `This section is at ${pct}% — solid. Is there anything else you'd like to add? Specific customer names, exact numbers, or key context you haven't mentioned?`
          : "Keep going — the more specific you are, the higher your score.")

      setSections(prev => {
        const sec = prev[key] ?? initSection()
        const finalMsgs = started
          ? sec.messages.map((m, i) => i === sec.messages.length - 1 ? { ...m, text: agentReply } : m)
          : [...sec.messages, { role: 'agent' as const, text: agentReply }]
        const updated: SectionState = {
          ...sec,
          extractedFields: meta.mergedFields ?? sec.extractedFields,
          confidenceMap: { ...sec.confidenceMap, ...(meta.confidenceMap ?? {}) },
          completionScore: pct,
          conversation: conversation + '\nAgent: ' + agentReply,
          isComplete: pct >= 70,
          messages: finalMsgs,
          askedDepthFields: meta.depthFieldAsked
            ? [...sec.askedDepthFields, meta.depthFieldAsked]
            : sec.askedDepthFields,
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
      sendingRef.current = false
    }
  }

  return { handleSend }
}

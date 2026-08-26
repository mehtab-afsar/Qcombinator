'use client'

import { useEffect, type Dispatch, type SetStateAction } from 'react'
import { getInitialQuestion, getMissingFields, buildFoundSnippets, getTargetedQuestion } from '@/lib/profile-builder/question-engine'
import type { FounderProfile } from '@/lib/profile-builder/question-engine'
import { MISSING_FIELD_LABELS, YC_QUESTIONS } from '@/features/profile-builder/lib/constants'
import type { SectionState, ProfileBuilderStep } from '@/features/profile-builder/types'

interface UseInitialQuestionParams {
  currentStep: ProfileBuilderStep
  sections: Record<string, SectionState>
  setSections: Dispatch<SetStateAction<Record<string, SectionState>>>
  founderProfile: FounderProfile
  isRetake: boolean
}

/** Fires the opening chat message the first time a section/pitch screen is
 *  entered — the copy adapts to whether the section is fresh, already has
 *  doc-extracted data, or is being redone on a retake. */
export function useInitialQuestion({ currentStep, sections, setSections, founderProfile, isRetake }: UseInitialQuestionParams) {
  const sectionKey = String(currentStep)
  useEffect(() => {
    const isConvo = currentStep === 'pitch' ||
      (typeof currentStep === 'number' && currentStep >= 1 && currentStep <= 5)
    if (!isConvo) return
    const sec = sections[sectionKey]
    if (!sec || sec.messages.length > 0) return  // already has messages (draft or started)

    let initialQ: string
    let openingMessages: string[] | undefined  // set only when the doc recap should be its own bubble, separate from the question
    if (currentStep === 'pitch') {
      initialQ = YC_QUESTIONS[0]
    } else if (isRetake && Object.keys(sec.extractedFields ?? {}).length > 0) {
      // Redo flow — acknowledge prior data and ask what's changed
      const RETAKE_OPENERS: Record<number, string> = {
        1: `Welcome back. I have your traction and market data from last time — things like your customer count, revenue, and sales cycle. What's changed or improved since then? Walk me through any new wins, numbers that have moved, or context you'd like to update.`,
        2: `I already have your market sizing and competitive context on file. Since your last assessment, has anything shifted — new competitors, market events, or a sharper view of your TAM/SAM? Tell me what's changed.`,
        3: `Your IP and defensibility data is still on file. Have you filed new patents, hit new milestones on your technical moat, or gathered evidence that makes replication harder? What's new here?`,
        4: `I have your team profile from before. Any changes — new hires, advisors, exits, or co-founder updates — that would strengthen this section? Even small additions matter.`,
        5: `Your financials from last time are still here. Walk me through what's changed: updated MRR, runway, burn rate, or any new metrics that paint a clearer picture of the business.`,
      }
      initialQ = RETAKE_OPENERS[currentStep as number] ?? `Your previous answers are on file. What's changed or improved in this area since your last assessment?`
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
            ? `From your documents I found: ${foundSnippets.slice(0, 3).join(' · ')}.`
            : ''
          // Ask about the first missing required field specifically, not a list
          const firstMissingKey = missing[0]
          const firstMissingLabel = (MISSING_FIELD_LABELS[firstMissingKey] ?? '').toLowerCase()
          const targetedSuffix = getTargetedQuestion(currentStep, firstMissingKey)
          const gapQ = firstMissingLabel && targetedSuffix
            ? `I still need your ${firstMissingLabel} — ${targetedSuffix}`
            : getInitialQuestion(currentStep, founderProfile)
          initialQ = foundStr ? `${foundStr}\n\n${gapQ}` : gapQ
          if (foundStr) openingMessages = [foundStr, gapQ]
        }
      } else {
        initialQ = getInitialQuestion(currentStep, founderProfile)
      }
    }

    setSections(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        messages: (openingMessages ?? [initialQ]).map(text => ({ role: 'agent' as const, text })),
        conversation: `Agent: ${initialQ}`,
      },
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, sectionKey])
}

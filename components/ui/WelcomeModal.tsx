'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { ComponentType } from 'react'
import { bg, bdr, ink, muted, blue } from '@/lib/constants/colors'

interface Slide {
  Doodle:   ComponentType<{ color?: string }>
  heading:  string
  body:     string
  cta?:     { label: string; href: string }
}

interface Props {
  storageKey: string   // localStorage key — shown once per key
  slides:     Slide[]
  onDone?:    () => void
  accent?:    string   // doodle + active-dot color — defaults to the founder blue
}

export function WelcomeModal({ storageKey, slides, onDone, accent = blue }: Props) {
  const [open,  setOpen]  = useState(false)
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem(storageKey)) {
      setOpen(true)
    }
  }, [storageKey])

  function dismiss() {
    localStorage.setItem(storageKey, '1')
    setOpen(false)
    onDone?.()
  }

  function next() {
    if (slide < slides.length - 1) {
      setSlide(s => s + 1)
    } else {
      dismiss()
    }
  }

  const current = slides[slide]
  const isLast  = slide === slides.length - 1

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
            onClick={dismiss}
          />

          {/* Fixed flex wrapper centers the card. We must NOT center the card itself
              with `transform: translate(-50%,-50%)` because framer-motion animates
              `scale`/`y` via transform and would overwrite it (card drifts bottom-right). */}
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, pointerEvents: 'none',
          }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'relative', width: '100%', maxWidth: 420,
              background: bg, borderRadius: 20,
              border: `1px solid ${bdr}`,
              boxShadow: '0 24px 64px rgba(0,0,0,0.16)',
              padding: '36px 32px 28px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              pointerEvents: 'auto',
            }}
          >
            {/* Close */}
            <button
              onClick={dismiss}
              style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: 4 }}
            >
              <X size={18} />
            </button>

            {/* Slide content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={slide}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.15 }}
              >
                <div style={{ width: 84, height: 84, margin: '0 auto 16px' }}>
                  <current.Doodle color={accent} />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: ink, textAlign: 'center', margin: '0 0 10px' }}>
                  {current.heading}
                </h2>
                <p style={{ fontSize: 14, color: muted, textAlign: 'center', lineHeight: 1.6, margin: 0 }}>
                  {current.body}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Slide dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '20px 0' }}>
              {slides.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setSlide(i)}
                  style={{
                    width: i === slide ? 20 : 6, height: 6, borderRadius: 999,
                    background: i === slide ? accent : bdr,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                />
              ))}
            </div>

            {/* CTA row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {isLast && current.cta ? (
                <Link
                  href={current.cta.href}
                  onClick={dismiss}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '12px', borderRadius: 10, background: ink, color: '#fff',
                    fontSize: 14, fontWeight: 700, textDecoration: 'none',
                    boxShadow: '0 2px 8px rgba(24,22,15,0.18)',
                  }}
                >
                  {current.cta.label} <ChevronRight size={14} />
                </Link>
              ) : (
                <button
                  onClick={next}
                  style={{
                    padding: '12px', borderRadius: 10, background: ink, color: '#fff',
                    border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    boxShadow: '0 2px 8px rgba(24,22,15,0.18)',
                  }}
                >
                  {isLast ? 'Get started' : 'Next'} <ChevronRight size={14} />
                </button>
              )}

              <button onClick={dismiss} style={{ padding: '8px', background: 'none', border: 'none', fontSize: 13, color: muted, cursor: 'pointer', textDecoration: 'underline' }}>
                Skip intro
              </button>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Pre-built slide sets ─────────────────────────────────────────────────────
// Doodles, not emoji — same hand-drawn set used throughout onboarding, mapped
// 1:1 onto the meaning the original emoji carried.

import { TargetDoodle } from '@/features/onboarding/components/doodles/TargetDoodle'
import { ScrollDoodle } from '@/features/onboarding/components/doodles/ScrollDoodle'
import { IdCardDoodle } from '@/features/onboarding/components/doodles/IdCardDoodle'
import { ChartDoodle } from '@/features/onboarding/components/doodles/ChartDoodle'
import { ScoutDoodle } from '@/features/onboarding/components/doodles/ScoutDoodle'
import { RocketDoodle } from '@/features/onboarding/components/doodles/RocketDoodle'

export const FOUNDER_WELCOME_SLIDES: Slide[] = [
  {
    Doodle:  TargetDoodle, // was 🎯 — aiming for investor visibility
    heading: 'Your Q-Score drives investor visibility',
    body:    'Investors browse founders by Q-Score. The higher your score, the more deal flow you appear in. Complete your profile to get scored.',
    cta:     undefined,
  },
  {
    Doodle:  ScrollDoodle, // was ✅ — the step-by-step checklist
    heading: 'Your getting-started checklist',
    body:    'We\'ve created a step-by-step guide to get you investor-ready. Start with the Q-Score profile — it takes about 8 minutes.',
    cta:     undefined,
  },
  {
    Doodle:  IdCardDoodle, // was 🤖 — your team of advisors
    heading: 'Your AI advisors are ready',
    body:    'CXO Agents are your always-on team. Ask Patel (CMO) for growth strategy, Felix (CFO) for financial models, or Maya (Brand) for positioning.',
    cta:     { label: 'Start profile builder', href: '/founder/profile-builder' },
  },
]

export const INVESTOR_WELCOME_SLIDES: Slide[] = [
  {
    Doodle:  ChartDoodle, // was 📊 — scored deal flow
    heading: 'Deal flow matched to your thesis',
    body:    'Every founder in your feed has been scored on 6 dimensions. Your Q-Score weights let you tune which dimensions matter most to your fund.',
    cta:     undefined,
  },
  {
    Doodle:  ScoutDoodle, // was 🔍 — criteria-driven matching
    heading: 'Your criteria drives the matching',
    body:    'We\'ve personalized your deal flow based on the sectors, stages, and check sizes you entered. Update them anytime in settings.',
    cta:     undefined,
  },
  {
    Doodle:  RocketDoodle, // was 🚀 — you're live
    heading: 'You\'re live — explore your matches',
    body:    'Founders with strong Q-Scores in your sectors are ready to connect. Send a connection request to start a conversation.',
    cta:     { label: 'View deal flow', href: '/investor/deal-flow' },
  },
]

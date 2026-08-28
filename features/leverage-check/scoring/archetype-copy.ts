/**
 * Static descriptive copy for archetypes and dimensions — used by report/fallback.ts (when the
 * LLM call fails or returns malformed output) and available to the UI for supporting text.
 * Presentation data, kept separate from questions.ts's scoring data.
 */

import type { Archetype } from './calculate'
import type { Dimension } from './questions'

export const ARCHETYPE_COPY: Record<Archetype, { headline: string; body: string }> = {
  'FOUNDER OPERATED': {
    headline: 'The founder is still the operating system.',
    body: 'Almost everything routes through you — decisions, execution, follow-up. AI is either unused or sitting on the sidelines of how the company actually runs.',
  },
  'AI ASSISTED': {
    headline: 'AI makes you faster, but the company still revolves around you.',
    body: "You've adopted AI as a personal productivity tool — faster writing, faster research — but the operating model underneath hasn't changed. Every meaningful decision and most execution still needs you in the loop.",
  },
  'AI LEVERAGED': {
    headline: 'AI is taking real thinking and work off your desk.',
    body: "You've moved past using AI as a faster typist — it's doing meaningful synthesis and prep before things reach you. The next gap is usually what happens after you decide.",
  },
  'AGENTIC OPERATOR': {
    headline: 'Information, decisions and execution are increasingly connected.',
    body: "You're commanding more of the company than you personally execute. The systems around you catch exceptions and surface only what actually needs your judgment.",
  },
  '10X FOUNDER': {
    headline: 'You command substantially more company than you personally execute.',
    body: 'Your attention is spent on judgment, not coordination. The organization moves without waiting on you for the day-to-day.',
  },
}

export const DIMENSION_LEAK_COPY: Record<Dimension, string> = {
  dependency: 'too much still waits on your own attention and approval before it can move.',
  decision: "AI isn't yet preparing the research, synthesis and options before you have to engage.",
  execution: "even after you decide, coordination and follow-up still come back to you.",
  growth: "your growth engine slows down the moment you stop personally driving it.",
  management: "staying on top of what's happening still costs you meetings and manual check-ins.",
}

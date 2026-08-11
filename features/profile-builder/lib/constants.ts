import { ScrollDoodle } from '@/features/onboarding/components/doodles/ScrollDoodle'
import { ChartDoodle } from '@/features/onboarding/components/doodles/ChartDoodle'
import { TargetDoodle } from '@/features/onboarding/components/doodles/TargetDoodle'
import { CompassDoodle } from '@/features/onboarding/components/doodles/CompassDoodle'
import { IdCardDoodle } from '@/features/onboarding/components/doodles/IdCardDoodle'
import { SunDoodle } from '@/features/onboarding/components/doodles/SunDoodle'
import { ScoutDoodle } from '@/features/onboarding/components/doodles/ScoutDoodle'

export const MISSING_FIELD_LABELS: Record<string, string> = {
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

export const UPLOAD_IMPACT: Record<number, { dim: string; pts: number }> = {
  1: { dim: 'Traction',  pts: 12 },
  2: { dim: 'Market',    pts: 8  },
  3: { dim: 'Product',   pts: 10 },
  4: { dim: 'Team',      pts: 6  },
  5: { dim: 'Financial', pts: 18 },
}

export const SECTION_LABELS: Record<string, string> = {
  '0': 'Documents',
  'pitch': 'The Pitch',
  '1': 'Market Validation',
  '2': 'Market & Competition',
  '3': 'IP & Technology',
  '4': 'Team',
  '5': 'Financials & Impact',
  '6': 'Review & Submit',
}

export const SECTION_DESCRIPTIONS: Record<string, string> = {
  '0': 'Optional — upload pitch decks, financial models, and other documents',
  'pitch': "What does your company do, who is it for, and why now?",
  '1': 'Customers, pilots, and willingness to pay',
  '2': 'Market size, urgency, and competitive landscape',
  '3': 'Patents, technical depth, and build complexity',
  '4': 'Domain expertise, team composition, and experience',
  '5': 'Revenue, burn rate, runway, and impact signals',
  '6': 'Review your profile and calculate your Q-Score',
}

export const YC_QUESTIONS = [
  "What does your company do? Describe it in one sentence — like you're explaining to a smart friend.",
  "Who specifically has this problem, and how much does it cost them today — in time, money, or frustration?",
  "Why is now the right moment to build this? What changed in the last 2–3 years that creates this opening?",
  "Why are you and your team the right people to solve this? What gives you an unfair advantage?",
  "How do you make money, and what does the business look like at scale?",
]

// ── upload loading messages — rotate every 2.2s while upload is in progress ─
export const UPLOAD_MESSAGES = [
  'Reading your documents…',
  'Extracting market signals…',
  'Identifying customer traction…',
  'Mapping IP & defensibility…',
  'Analysing your team…',
  'Building financial picture…',
  'Scoring your indicators…',
  'Almost done…',
]

// One hand-drawn doodle per phase — swaps with the message so the loader
// shows what's happening rather than a generic spinner.
export const UPLOAD_DOODLES = [
  ScrollDoodle,   // Reading your documents
  ChartDoodle,    // Extracting market signals
  TargetDoodle,   // Identifying customer traction
  CompassDoodle,  // Mapping IP & defensibility
  IdCardDoodle,   // Analysing your team
  ChartDoodle,    // Building financial picture
  TargetDoodle,   // Scoring your indicators
  SunDoodle,      // Almost done
]

// ── Q-Score calculation loading messages — rotate every 2.2s while final scoring is in
// progress (submit route: indicator scoring → percentile benchmarking → AI reconciliation
// → finalize). Mirrors UPLOAD_MESSAGES' pattern/timing so the two "big moment" loaders feel
// like the same system.
export const QSCORE_MESSAGES = [
  'Scoring your indicators…',
  'Running peer benchmarks…',
  'Reconciling with AI…',
  'Finalizing your Q-Score…',
]

export const QSCORE_DOODLES = [
  ChartDoodle,   // Scoring your indicators
  TargetDoodle,  // Running peer benchmarks
  ScoutDoodle,   // Reconciling with AI
  SunDoodle,     // Finalizing your Q-Score
]

export const MAX_UPLOAD_FILES = 10

// Deeper sand — agent bubbles, sidebar-nav hover. Not part of the general palette
// in lib/constants/colors.ts; specific to the profile-builder flow's chat/nav chrome.
export const surf2 = '#EAE7E0'

// Score-report status tints (strength/risk highlight cards, banners) — pale backgrounds and
// on-tint text that lib/constants/colors.ts doesn't carry variants for. Shared between
// ReviewScreen.tsx and ScoreReport.tsx so the pair is defined once, not duplicated.
export const greenTintBg = '#F0FDF4'
export const greenTintBorder = '#BBF7D0'
export const greenTintText = '#166534'
export const greenBadgeBg = '#DCFCE7'
export const amberTintBg = '#FFFBEB'
export const amberTintBorder = '#FDE68A'
export const amberTintHeading = '#B45309'
export const amberTintText = '#92400E'
export const redTintBg = '#FEF2F2'
export const redTintBorder = '#FECACA'
export const blueTintBg = '#EFF6FF'
export const blueTintText = '#1D4ED8'
// Typing-indicator dots (smart-QA "reading your answer…" bounce) — a step darker
// than `muted` for legibility at 7px; not a semantic status color.
export const dotGray = '#B5AFA7'

// Upload-step tints — identity-mismatch banner, upload-zone hover, recalc-result border.
export const redIconBg = '#FEE2E2'
export const redDeepText = '#7F1D1D'
export const amberSoftBg = '#FFF7ED'
export const amberSoftBorder = '#FED7AA'
export const greenBorderSoft = '#A7F3D0'
export const blueBorderSoft = '#BFDBFE'

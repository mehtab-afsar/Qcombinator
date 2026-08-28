/**
 * The 10x Founder Leverage Check — 8 fixed questions, single source of truth for both the quiz
 * UI and the scoring engine's raw-score lookup. Each answer A–D is worth a raw score 1–4 (low →
 * high leverage). 2 questions each for Dependency/Decision/Execution, 1 each for Growth/
 * Management — calculate.ts weights the 5 dimensions equally regardless of this imbalance.
 */

export type Dimension = 'dependency' | 'decision' | 'execution' | 'growth' | 'management'
export type AnswerLetter = 'A' | 'B' | 'C' | 'D'
export type QuestionId = 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6' | 'q7' | 'q8'

export interface QuizOption {
  letter: AnswerLetter
  text: string
  rawScore: 1 | 2 | 3 | 4
}

export interface QuizQuestion {
  id: QuestionId
  dimension: Dimension
  prompt: string
  options: readonly [QuizOption, QuizOption, QuizOption, QuizOption]
}

// Fixed order — also the tie-break order for strongest/weakest dimension in calculate.ts.
export const DIMENSION_ORDER: readonly Dimension[] =
  ['dependency', 'decision', 'execution', 'growth', 'management']

export const DIMENSION_LABELS: Record<Dimension, string> = {
  dependency: 'Founder Dependency',
  decision: 'Decision Leverage',
  execution: 'Execution Leverage',
  growth: 'Growth Leverage',
  management: 'Management Leverage',
}

export const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: 'q1',
    dimension: 'dependency',
    prompt: "When a customer or team member needs a decision only you can make, what typically happens?",
    options: [
      { letter: 'A', text: "They wait for me — I'm often the bottleneck", rawScore: 1 },
      { letter: 'B', text: 'They flag it and I get to it within a day or two', rawScore: 2 },
      { letter: 'C', text: 'AI or a teammate prepares the context so I can decide fast when I see it', rawScore: 3 },
      { letter: 'D', text: 'Most of these are pre-resolved by clear rules/playbooks before they ever reach me', rawScore: 4 },
    ],
  },
  {
    id: 'q2',
    dimension: 'dependency',
    prompt: "How much of your week is still 'only I can do this' work?",
    options: [
      { letter: 'A', text: 'Almost all of it', rawScore: 1 },
      { letter: 'B', text: 'More than half', rawScore: 2 },
      { letter: 'C', text: 'Less than half', rawScore: 3 },
      { letter: 'D', text: 'A small, deliberate slice — the rest runs without me', rawScore: 4 },
    ],
  },
  {
    id: 'q3',
    dimension: 'decision',
    prompt: 'Before you make a significant decision (pricing, a hire, a GTM move), how much groundwork is already done?',
    options: [
      { letter: 'A', text: 'I start from scratch — research, data-pulling, comparing options myself', rawScore: 1 },
      { letter: 'B', text: 'I ask someone (or ChatGPT) for help gathering info as I go', rawScore: 2 },
      { letter: 'C', text: 'AI/tools synthesize the relevant data and options before I sit down to decide', rawScore: 3 },
      { letter: 'D', text: 'A fully prepared recommendation with tradeoffs is waiting for my call', rawScore: 4 },
    ],
  },
  {
    id: 'q4',
    dimension: 'decision',
    prompt: 'How do you use AI in your decision-making today?',
    options: [
      { letter: 'A', text: "I don't really — I decide from experience/gut", rawScore: 1 },
      { letter: 'B', text: 'I use it to write faster or research a bit', rawScore: 2 },
      { letter: 'C', text: 'I use it to analyze data or model scenarios', rawScore: 3 },
      { letter: 'D', text: "It continuously monitors signals and flags decisions before I'd have noticed them", rawScore: 4 },
    ],
  },
  {
    id: 'q5',
    dimension: 'execution',
    prompt: 'Once you make a decision, what happens next?',
    options: [
      { letter: 'A', text: 'I have to personally kick off and track every next step', rawScore: 1 },
      { letter: 'B', text: 'I assign it and check in manually to make sure it’s moving', rawScore: 2 },
      { letter: 'C', text: 'Tasks, owners, and follow-ups get created automatically — I just spot-check', rawScore: 3 },
      { letter: 'D', text: 'Execution starts and reports back to me only if something needs my attention', rawScore: 4 },
    ],
  },
  {
    id: 'q6',
    dimension: 'execution',
    prompt: "When you delegate a task, what's the follow-up like?",
    options: [
      { letter: 'A', text: 'I have to remember to chase it myself', rawScore: 1 },
      { letter: 'B', text: 'I set a reminder and check in later', rawScore: 2 },
      { letter: 'C', text: 'Status updates come back to me without me asking', rawScore: 3 },
      { letter: 'D', text: "It resolves itself — I'm only looped in if something's off-track", rawScore: 4 },
    ],
  },
  {
    id: 'q7',
    dimension: 'growth',
    prompt: 'How independently does your growth/GTM engine run without you?',
    options: [
      { letter: 'A', text: "Growth basically stops if I'm not driving it", rawScore: 1 },
      { letter: 'B', text: "My team runs playbooks I've already defined", rawScore: 2 },
      { letter: 'C', text: 'AI handles a meaningful share of outreach, content, or lead qualification on its own', rawScore: 3 },
      { letter: 'D', text: 'Pipeline, experiments, and customer discovery keep moving and I just review results', rawScore: 4 },
    ],
  },
  {
    id: 'q8',
    dimension: 'management',
    prompt: 'If you doubled your team size tomorrow, what would happen to your management overhead?',
    options: [
      { letter: 'A', text: 'It would roughly double too — more people, more coordination for me', rawScore: 1 },
      { letter: 'B', text: 'It would grow, but slower than the team', rawScore: 2 },
      { letter: 'C', text: 'Most of the added coordination would be absorbed by our systems/processes', rawScore: 3 },
      { letter: 'D', text: 'Barely any more overhead — our operating model already scales this way', rawScore: 4 },
    ],
  },
] as const

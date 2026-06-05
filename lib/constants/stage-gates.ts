// YC-style stage gates: each startup stage has 3 sequential gates.
// Gate 1 = unlock (prove you have a real problem), 2 = validate (prove people want it),
// 3 = scale (prove you can grow). A founder must complete all three to advance to the next stage.

export type StartupStage = 'idea' | 'mvp' | 'pre-seed' | 'seed' | 'series-a'

export interface StageGate {
  id: string
  label: string
  /** Behavioral description — what the founder must actually DO, not deliver. */
  behavior: string
  /** Short evidence the platform can verify or the founder self-reports. */
  evidence: string
  /** Optional: which agent best helps with this gate. */
  agentId?: string
  agentName?: string
  /** If true this gate unlocks investor visibility or a platform milestone. */
  milestone?: boolean
}

export interface StageConfig {
  stage: StartupStage
  label: string
  subtitle: string
  gates: [StageGate, StageGate, StageGate]
}

export const STAGE_GATES: Record<StartupStage, StageConfig> = {
  idea: {
    stage: 'idea',
    label: 'Idea Stage',
    subtitle: 'Validate the problem before building anything',
    gates: [
      {
        id: 'idea-g1',
        label: 'Define the problem',
        behavior: 'Write one crisp sentence describing the problem you solve and who has it.',
        evidence: 'Problem statement saved in your profile',
        agentId: 'patel',
        agentName: 'Patel',
      },
      {
        id: 'idea-g2',
        label: '10 discovery calls',
        behavior: 'Talk to 10 real people who have this problem. No selling — just listening.',
        evidence: '10 customer calls logged',
        agentId: 'susi',
        agentName: 'Susi',
      },
      {
        id: 'idea-g3',
        label: 'First person who would pay',
        behavior: 'Find one person willing to pay for a solution, even informally.',
        evidence: 'First LOI or verbal commitment recorded',
        agentId: 'patel',
        agentName: 'Patel',
        milestone: true,
      },
    ],
  },

  mvp: {
    stage: 'mvp',
    label: 'MVP Stage',
    subtitle: 'Build the smallest thing that proves the value',
    gates: [
      {
        id: 'mvp-g1',
        label: 'Shipped to real users',
        behavior: 'Put your MVP in front of at least 5 real people who aren\'t your friends.',
        evidence: 'MVP shipped (self-reported)',
        agentId: 'nova',
        agentName: 'Nova',
      },
      {
        id: 'mvp-g2',
        label: 'D7 retention > 30%',
        behavior: 'At least 30% of your first users came back 7 days later.',
        evidence: 'Retention data from PostHog or self-report',
        agentId: 'nova',
        agentName: 'Nova',
      },
      {
        id: 'mvp-g3',
        label: 'First paying customer',
        behavior: 'Someone pays you real money — any amount.',
        evidence: 'Stripe MRR > $0 or payment proof',
        agentId: 'felix',
        agentName: 'Felix',
        milestone: true,
      },
    ],
  },

  'pre-seed': {
    stage: 'pre-seed',
    label: 'Pre-Seed',
    subtitle: 'Prove repeatable traction before raising',
    gates: [
      {
        id: 'preseed-g1',
        label: '$1k MRR or 50 active users',
        behavior: 'Hit $1k monthly recurring revenue or 50 active users using the core feature weekly.',
        evidence: 'Stripe MRR ≥ $1,000 or active user count',
        agentId: 'felix',
        agentName: 'Felix',
      },
      {
        id: 'preseed-g2',
        label: '3 signed LOIs or contracts',
        behavior: 'Three customers have committed in writing — letter of intent or paid contract.',
        evidence: '3 LOIs or contracts uploaded',
        agentId: 'patel',
        agentName: 'Patel',
      },
      {
        id: 'preseed-g3',
        label: 'Runway > 12 months',
        behavior: 'You have enough cash to survive 12 months without new revenue.',
        evidence: 'Felix runway model shows ≥ 12 months',
        agentId: 'felix',
        agentName: 'Felix',
        milestone: true,
      },
    ],
  },

  seed: {
    stage: 'seed',
    label: 'Seed',
    subtitle: 'Scale what\'s working, not what you wish worked',
    gates: [
      {
        id: 'seed-g1',
        label: '$10k MRR',
        behavior: 'Hit $10k in monthly recurring revenue from paying customers.',
        evidence: 'Stripe MRR ≥ $10,000',
        agentId: 'felix',
        agentName: 'Felix',
      },
      {
        id: 'seed-g2',
        label: 'MoM growth > 15%',
        behavior: 'Grow your primary metric by at least 15% every month for 2 consecutive months.',
        evidence: 'Growth rate from Stripe or self-report',
        agentId: 'nova',
        agentName: 'Nova',
      },
      {
        id: 'seed-g3',
        label: 'First institutional meeting',
        behavior: 'Have a first meeting with a VC or institutional angel — not warm intro required.',
        evidence: 'Meeting logged (self-reported)',
        agentId: 'harper',
        agentName: 'Harper',
        milestone: true,
      },
    ],
  },

  'series-a': {
    stage: 'series-a',
    label: 'Series A',
    subtitle: 'Build the machine, not just the product',
    gates: [
      {
        id: 'seriesa-g1',
        label: '$1M ARR run rate',
        behavior: 'Reach $83k+ MRR (annualizes to $1M ARR).',
        evidence: 'Stripe MRR ≥ $83,000',
        agentId: 'felix',
        agentName: 'Felix',
      },
      {
        id: 'seriesa-g2',
        label: 'Repeatable sales process',
        behavior: 'New AEs can close deals without you — document the playbook.',
        evidence: 'Sales playbook + 2 non-founder closes',
        agentId: 'patel',
        agentName: 'Patel',
      },
      {
        id: 'seriesa-g3',
        label: 'Term sheet in hand',
        behavior: 'Receive a term sheet from an institutional investor.',
        evidence: 'Term sheet (self-reported)',
        agentId: 'harper',
        agentName: 'Harper',
        milestone: true,
      },
    ],
  },
}

/** Normalize a raw stage string (from founder_profiles) to StartupStage. */
export function normalizeStage(raw: string | null | undefined): StartupStage {
  if (!raw) return 'idea'
  const s = raw.toLowerCase().replace(/\s+/g, '-')
  if (s.includes('series') || s.includes('series-a')) return 'series-a'
  if (s === 'seed') return 'seed'
  if (s.includes('pre-seed') || s.includes('preseed')) return 'pre-seed'
  if (s === 'mvp' || s.includes('beta') || s.includes('launch')) return 'mvp'
  return 'idea'
}

/**
 * Returns the index (0–2) of the first incomplete gate for the given stage,
 * or 3 if all gates are complete (stage fully cleared).
 */
export function currentGateIndex(
  stage: StartupStage,
  gateProgress: Record<string, boolean>,
): number {
  const config = STAGE_GATES[stage]
  for (let i = 0; i < 3; i++) {
    if (!gateProgress[config.gates[i].id]) return i
  }
  return 3
}

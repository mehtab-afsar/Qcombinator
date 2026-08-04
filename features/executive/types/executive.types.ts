/**
 * Shared types for the founder-facing Executive UI.
 *
 * Mirrors what the API returns. Kept here rather than importing from
 * lib/mandate/** so the client bundle never pulls in server code.
 */

export type ContractStatus = 'draft' | 'confirmed' | 'superseded'

export interface Contract {
  id: string
  epoch: number
  version: number
  status: ContractStatus
  priorities: string[]
  successMetrics: string[]
  responsibilities: Array<{ executive: string; mandate: string }>
  activePrograms: string[]
  confirmedAt: string | null
  createdAt: string
}

export interface ProgramInstance {
  id: string
  templateId: string
  owner: string
  objective: string
  successMetric: string
  status: 'active' | 'paused' | 'complete'
}

/** Mirrors GET /api/executives — the fixed 5-executive roster. */
export interface ExecutiveSummary {
  id: string
  name: string
  motto: string
  domains: string[]
  /** Registry ProgramIds this executive owns — e.g. ['P001'], or [] if idle. */
  programs: string[]
}

export interface Strategy {
  id: string
  version: number
  mission: string | null
  priorities: string[]
  goals: string[]
}

/**
 * The founder's position in the WHOLE journey — score, then direction, then mandate,
 * then the team operating to it. The Command View is a state machine over this, and
 * every state has exactly one thing to do next.
 *
 * `no_score` sits in front of the mandate states on purpose: the CEO drafts the
 * mandate FROM the Q-Score (PRD §4, "Score → Mandate → Operate"), so a founder who
 * hasn't been scored yet has nothing for the system to propose from. Before this
 * state existed, the door and the Command View both jumped straight to "set your
 * direction" regardless of Q-Score — the exact bug that made the flow feel random.
 */
export type JourneyState =
  | 'no_score'         // no Q-Score yet — nothing to draft a direction from
  | 'no_strategy'      // scored, nothing set — go and set a direction (F07)
  | 'no_contract'      // strategy exists, no mandate drafted yet
  | 'draft'            // a mandate is drafted, awaiting the one confirmation
  | 'confirmed'        // the team is operating; redirect by issuing a new epoch
  | 'disabled'         // the Executive model is not switched on for this deployment

export function resolveJourneyState(
  hasScore: boolean,
  strategy: Strategy | null,
  contract: Contract | null,
): JourneyState {
  if (contract?.status === 'draft') return 'draft'
  if (contract?.status === 'confirmed') return 'confirmed'
  if (strategy) return 'no_contract'
  if (!hasScore) return 'no_score'
  return 'no_strategy'
}

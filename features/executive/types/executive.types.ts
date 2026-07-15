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

export interface Strategy {
  id: string
  version: number
  mission: string | null
  priorities: string[]
  goals: string[]
}

/**
 * The founder's position in the mandate loop. The Command View is a state machine
 * over this, and every state has exactly one thing to do next.
 */
export type MandateState =
  | 'no_strategy'      // nothing set — go and set a direction (F07)
  | 'no_contract'      // strategy exists, no mandate drafted yet
  | 'draft'            // a mandate is drafted, awaiting the one confirmation
  | 'confirmed'        // the team is operating; redirect by issuing a new epoch
  | 'disabled'         // the Executive model is not switched on for this deployment

export function resolveMandateState(
  strategy: Strategy | null,
  contract: Contract | null,
): MandateState {
  if (contract?.status === 'draft') return 'draft'
  if (contract?.status === 'confirmed') return 'confirmed'
  if (!strategy) return 'no_strategy'
  return 'no_contract'
}

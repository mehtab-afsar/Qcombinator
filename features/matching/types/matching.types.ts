/**
 * Matching & Connection Type Definitions
 */

export interface ConnectionRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (message: string) => void
  investorName: string
  startupOneLiner: string
  keyMetrics: string[]
  matchReason: string
}

/** Delay (ms) to simulate sending before showing success state. */
export const SEND_ANIMATION_DELAY_MS = 900

/** Delay (ms) after success state before closing and calling onSubmit. */
export const SEND_CLOSE_DELAY_MS = 1400

export type ConnectionStatus = 'none' | 'pending' | 'viewed' | 'meeting-scheduled' | 'passed';

export interface MatchingInvestor {
  id: string
  type: 'demo' | 'real'
  name: string
  firm: string
  matchScore: number
  investmentFocus: string[]
  checkSize: string
  location: string
  portfolio: string[]
  responseRate: number
  thesis: string
  connectionStatus: ConnectionStatus
  matchRationale?: string
}

export interface DBInvestor {
  id: string
  type: 'demo' | 'real'
  name: string
  firm: string
  title: string
  location: string
  check_sizes: string[]
  stages: string[]
  sectors: string[]
  geography: string[]
  thesis: string | null
  portfolio: string[]
  response_rate: number
}

export interface ConnectionStatusBadgeProps {
  status: ConnectionStatus
}

export interface ConnectionRequest {
  id: string;
  founderId: string;
  founderName: string;
  startupName: string;
  investorId: string;
  investorName: string;
  status: ConnectionStatus;
  personalMessage?: string;
  createdAt: Date;
  viewedAt?: Date;
  respondedAt?: Date;
  meetingDate?: Date;
  feedback?: string;
}

export interface InvestorWithConnection {
  id: number;
  name: string;
  firm: string;
  location: string;
  matchScore: number;
  focus: string[];
  checkSize: string;
  stage: string[];
  responseRate: number;
  portfolio: string[];
  thesis: string;
  connectionStatus: ConnectionStatus;
  connectionRequestId?: string;
}

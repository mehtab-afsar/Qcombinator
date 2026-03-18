/**
 * Investor Type Definitions
 */

export interface ConnectionRequestCard {
  id: string
  founderName: string
  startupName: string
  oneLiner: string
  qScore: number
  qScorePercentile: number
  qScoreBreakdown: {
    market: number
    product: number
    goToMarket: number
    financial: number
    team: number
    traction: number
  }
  personalMessage?: string
  requestedDate: string
  stage: string
  industry: string
  fundingTarget: string
}

export interface ConnectionRequestCardProps {
  request: ConnectionRequestCard
  onAccept: (requestId: string) => void
  onDecline: (requestId: string) => void
}

export interface DeclineFeedbackFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (reasons: string[], feedback: string) => void
  founderName: string
  startupName: string
}

export interface MeetingSchedulerModalProps {
  isOpen: boolean
  onClose: () => void
  onSchedule: (date: string, time: string, notes: string) => void
  founderName: string
  startupName: string
}

export interface InvestorProfile {
  id: string;
  name: string;
  firm: string;
  title: string;
  location: string;
  focus: string[];
  checkSize: string;
  stage: string[];
  responseRate: number;
  portfolio: string[];
  thesis: string;
}

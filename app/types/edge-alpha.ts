/**
 * Edge Alpha Type Definitions
 * Centralized types for Q-Score, Agents, Academy, and Connection features
 */

// ============================================================================
// Q-SCORE TYPES (6 Dimensions)
// ============================================================================

export interface DimensionScore {
  score: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface QScore {
  overall: number;
  previousWeek: number | null;
  percentile: number | null;
  breakdown: {
    market: DimensionScore;
    product: DimensionScore;
    goToMarket: DimensionScore; // NEW - 6th dimension
    financial: DimensionScore;
    team: DimensionScore;
    traction: DimensionScore;
  };
}

export type QScoreDimension = keyof QScore['breakdown'];

// ============================================================================
// AI AGENTS TYPES
// ============================================================================

export type AgentPillar = 'sales-marketing' | 'operations-finance' | 'product-strategy';

export interface Agent {
  id: string;
  name: string;
  pillar: AgentPillar;
  specialty: string;
  avatar: string;
  description: string;
  suggestedPrompts: string[];
  improvesScore: QScoreDimension;
  color: string; // Tailwind color class
}

export interface AgentMessage {
  id: string;
  agentId: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

export interface AgentConversation {
  id: string;
  agentId: string;
  agentName: string;
  messages: AgentMessage[];
  createdAt: Date;
  updatedAt: Date;
  saved: boolean;
}

// ============================================================================
// ACADEMY & WORKSHOPS TYPES
// ============================================================================

export type WorkshopTopic = 'go-to-market' | 'product' | 'fundraising' | 'team' | 'operations' | 'sales';
export type WorkshopStatus = 'upcoming' | 'past' | 'live';

export interface Workshop {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: string;
  instructor: string;
  instructorTitle: string;
  topic: WorkshopTopic;
  status: WorkshopStatus;
  capacity: number;
  registered: number;
  spotsLeft: number;
  isPast: boolean;
  recordingUrl?: string;
}

export interface Mentor {
  id: string;
  name: string;
  title: string;
  company: string;
  expertise: string[];
  availability: string;
  sessionsCompleted: number;
  rating: number;
  bio: string;
  avatar: string;
  linkedin?: string;
}

export interface AcademyProgram {
  id: string;
  name: string;
  description: string;
  duration: string;
  startDate: string;
  cohortSize: number;
  spotsLeft: number;
  requirements: {
    minQScore: number;
    stage: string[];
  };
  curriculum: string[];
  status: 'open' | 'closed' | 'in-progress';
}

// ============================================================================
// CONNECTION REQUEST TYPES
// ============================================================================

export type ConnectionStatus = 'none' | 'pending' | 'viewed' | 'meeting-scheduled' | 'passed';

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

// ============================================================================
// RECOMMENDATION TYPES
// ============================================================================

export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  impact: string;
  priority: RecommendationPriority;
  dimension: QScoreDimension;
  ctaText: string;
  ctaLink: string;
  icon?: string;
  completed: boolean;
}

// ============================================================================
// DEMO MODE TYPES
// ============================================================================

export interface DemoStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string;
  action?: 'navigate' | 'highlight' | 'click' | 'message';
  actionParams?: Record<string, unknown>;
  nextRoute?: string;
}

export interface DemoJourney {
  id: string;
  name: string;
  description: string;
  steps: DemoStep[];
  currentStep: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface PitchSummary {
  oneLiner: string;
  keyMetrics: string[];
  matchReason: string;
}

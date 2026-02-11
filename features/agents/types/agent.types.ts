/**
 * AI Agent Type Definitions
 */

import { QScoreDimension } from '@/features/qscore/types/qscore.types';

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

/**
 * AI Agent Type Definitions
 */

import type { Dimension } from '@/lib/constants/dimensions';

export type AgentPillar = 'sales-marketing' | 'operations-finance' | 'product-strategy';

export interface Agent {
  id: string;
  name: string;
  pillar: AgentPillar;
  specialty: string;
  avatar: string;
  description: string;
  suggestedPrompts: string[];
  /** The Q-Score dimension this agent primarily improves. Uses canonical Dimension constants ('gtm' not 'goToMarket'). */
  improvesScore: Dimension;
  color: string; // Tailwind color class
  artifactType?: string; // default deliverable type this agent generates
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

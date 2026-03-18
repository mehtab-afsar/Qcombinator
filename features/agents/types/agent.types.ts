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

export type ArtifactType =
  | "icp_document"
  | "outreach_sequence"
  | "battle_card"
  | "gtm_playbook"
  | "sales_script"
  | "brand_messaging"
  | "financial_summary"
  | "legal_checklist"
  | "hiring_plan"
  | "pmf_survey"
  | "competitive_matrix"
  | "strategic_plan";

export interface ArtifactData {
  id: string | null;
  type: ArtifactType;
  title: string;
  content: Record<string, unknown>;
}

/** Deal record shared by Susi (SalesScriptRenderer) and Patel (PlaybookRenderer) */
export interface Deal {
  id: string
  company: string
  contact_name?: string
  contact_email?: string
  contact_title?: string
  stage: string
  value?: string
  notes?: string
  next_action?: string
  created_at?: string
  updated_at?: string
  win_reason?: string
  loss_reason?: string
}

export interface OutreachContact {
  name: string
  email: string
  company?: string
  title?: string
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

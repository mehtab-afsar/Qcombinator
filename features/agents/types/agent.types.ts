/**
 * AI Agent Type Definitions
 */

import type { Dimension } from '@/lib/constants/dimensions';

export type AgentPillar = 'sales-marketing' | 'operations-finance' | 'product-strategy';

export interface Agent {
  id: string;
  name: string;
  /** CXO-equivalent title shown to founders and investors */
  cxoTitle: string;
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
  // Existing
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
  | "interview_notes"
  | "competitive_matrix"
  | "strategic_plan"
  // Patel — AI-native GTM deliverables (D1→D2→D3→D4)
  | "pains_gains_triggers"
  | "buyer_journey"
  | "positioning_messaging"
  | "lead_list"
  | "campaign_report"
  | "ab_test_result"
  // Susi
  | "call_playbook"
  | "pipeline_report"
  | "proposal"
  | "win_loss_analysis"
  // Maya
  | "content_calendar"
  | "seo_audit"
  | "press_kit"
  | "newsletter_issue"
  | "brand_health_report"
  // Felix
  | "financial_model"
  | "investor_update"
  | "board_deck"
  | "cap_table_summary"
  | "fundraising_narrative"
  // Leo
  | "nda"
  | "safe_note"
  | "contractor_agreement"
  | "privacy_policy"
  | "ip_audit_report"
  | "term_sheet_redline"
  // Harper
  | "job_description"
  | "interview_scorecard"
  | "offer_letter"
  | "onboarding_plan"
  | "comp_benchmark_report"
  // Nova
  | "retention_report"
  | "product_insight_report"
  | "experiment_design"
  | "roadmap"
  | "user_persona"
  // Atlas
  | "competitor_weekly"
  | "market_map"
  | "review_intelligence_report"
  // Sage
  | "investor_readiness_report"
  | "contradiction_report"
  | "okr_health_report"
  | "crisis_playbook"
  // Carter (new)
  | "customer_health_report"
  | "churn_analysis"
  | "qbr_deck"
  | "expansion_playbook"
  | "cs_playbook"
  // Riley (new)
  | "growth_model"
  | "paid_campaign"
  | "referral_program"
  | "launch_playbook"
  | "growth_report"
  | "experiment_results";

export interface CritiqueSectionData {
  section: string
  rating: 'complete' | 'adequate' | 'weak' | 'missing'
  improvement?: string
}

export interface ArtifactCritiqueMetadata {
  sections: CritiqueSectionData[]
  overallRating: 'excellent' | 'good' | 'needs_improvement'
  needsPatch: boolean
  critiqueAt: string
}

export interface ArtifactData {
  id: string | null;
  type: ArtifactType;
  title: string;
  content: Record<string, unknown>;
  critiqueMetadata?: ArtifactCritiqueMetadata;
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

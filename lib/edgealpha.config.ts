/**
 * Edge Alpha Master Agent Registry
 *
 * Single source of truth for:
 *   - Which artifact types each agent owns (generates)
 *   - Which data tools each agent can call
 *   - Which actions each agent can trigger
 *   - Q-Score dimension boosts per agent
 *   - Cross-agent context relevance maps
 *   - Memory window sizes
 *
 * UI presentation data (name, avatar, suggestedPrompts, color) stays in
 * features/agents/data/agents.ts — that is display-only, not config.
 */

import {
  ARTIFACT_TYPES,
  type ArtifactType,
} from '@/lib/constants/artifact-types';
import {
  DIMENSIONS,
  type Dimension,
} from '@/lib/constants/dimensions';
import {
  AGENT_IDS,
  type AgentId,
} from '@/lib/constants/agent-ids';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AgentConfig {
  id: AgentId;
  name: string;
  pillar: 'sales-marketing' | 'operations-finance' | 'product-strategy';
  /** Artifact types this agent is the SOLE OWNER of (can generate). */
  tools: ArtifactType[];
  /** Data tool IDs this agent can call within chat. */
  dataTools: string[];
  /** Action IDs this agent can trigger from its UI. */
  actions: string[];
  /** Q-Score dimension boosts granted when this agent generates an artifact. Points are cumulative per dimension. */
  qscoreBoosts: Partial<Record<Dimension, number>>;
  /** Agents whose artifacts are ALWAYS injected into this agent's context. */
  highRelevanceAgents: AgentId[];
  /** Agents whose artifacts are injected when topic matches. */
  mediumRelevanceAgents: AgentId[];
  memory: {
    /** Max own previous artifacts to inject. */
    ownArtifacts: number;
    /** Max cross-agent artifacts to inject. */
    otherArtifacts: number;
    /** Max agent_activity events to inject. */
    activityEvents: number;
  };
}

// ─── Q-Score boost calculation ────────────────────────────────────────────────
// Each agent's boost = the sum of all its owned artifact boost points per dimension.
// Values sourced from features/qscore/services/agent-signal.ts ARTIFACT_BOOST.

const AGENTS: AgentConfig[] = [
  // ── Pillar 1: Sales & Marketing ─────────────────────────────────────────────
  {
    id: AGENT_IDS.PATEL,
    name: 'Patel',
    pillar: 'sales-marketing',
    tools: [
      ARTIFACT_TYPES.ICP_DOCUMENT,
      ARTIFACT_TYPES.OUTREACH_SEQUENCE,
      ARTIFACT_TYPES.GTM_PLAYBOOK,
    ],
    dataTools: ['lead_enrich'],
    actions: ['deploy_landing_page', 'gmail_compose', 'google_alert'],
    qscoreBoosts: {
      [DIMENSIONS.GTM]:      11, // icp_document(5) + gtm_playbook(6)
      [DIMENSIONS.TRACTION]:  4, // outreach_sequence(4)
    },
    highRelevanceAgents: [AGENT_IDS.ATLAS, AGENT_IDS.MAYA],
    mediumRelevanceAgents: [AGENT_IDS.FELIX, AGENT_IDS.SUSI],
    memory: { ownArtifacts: 3, otherArtifacts: 5, activityEvents: 10 },
  },
  {
    id: AGENT_IDS.SUSI,
    name: 'Susi',
    pillar: 'sales-marketing',
    tools: [ARTIFACT_TYPES.SALES_SCRIPT],
    dataTools: ['lead_enrich', 'create_deal'],
    actions: ['gmail_compose', 'create_deal'],
    qscoreBoosts: {
      [DIMENSIONS.TRACTION]: 4, // sales_script(4)
    },
    highRelevanceAgents: [AGENT_IDS.PATEL, AGENT_IDS.ATLAS],
    mediumRelevanceAgents: [AGENT_IDS.FELIX],
    memory: { ownArtifacts: 2, otherArtifacts: 4, activityEvents: 10 },
  },
  {
    id: AGENT_IDS.MAYA,
    name: 'Maya',
    pillar: 'sales-marketing',
    tools: [ARTIFACT_TYPES.BRAND_MESSAGING],
    dataTools: [],
    actions: ['deploy_landing_page', 'download_social_templates', 'blog_post'],
    qscoreBoosts: {
      [DIMENSIONS.GTM]: 4, // brand_messaging(4)
    },
    highRelevanceAgents: [AGENT_IDS.PATEL],
    mediumRelevanceAgents: [AGENT_IDS.ATLAS, AGENT_IDS.NOVA],
    memory: { ownArtifacts: 2, otherArtifacts: 3, activityEvents: 8 },
  },

  // ── Pillar 2: Operations & Finance ──────────────────────────────────────────
  {
    id: AGENT_IDS.FELIX,
    name: 'Felix',
    pillar: 'operations-finance',
    tools: [ARTIFACT_TYPES.FINANCIAL_SUMMARY],
    dataTools: ['fetch_stripe_metrics'],
    actions: ['send_investor_update', 'download_csv'],
    qscoreBoosts: {
      [DIMENSIONS.FINANCIAL]: 6, // financial_summary(6)
    },
    highRelevanceAgents: [AGENT_IDS.SAGE],
    mediumRelevanceAgents: [AGENT_IDS.PATEL, AGENT_IDS.NOVA, AGENT_IDS.SUSI],
    memory: { ownArtifacts: 2, otherArtifacts: 4, activityEvents: 8 },
  },
  {
    id: AGENT_IDS.LEO,
    name: 'Leo',
    pillar: 'operations-finance',
    tools: [ARTIFACT_TYPES.LEGAL_CHECKLIST],
    dataTools: [],
    actions: ['generate_nda', 'clerky_start', 'stripe_atlas'],
    qscoreBoosts: {
      [DIMENSIONS.FINANCIAL]: 3, // legal_checklist(3)
    },
    highRelevanceAgents: [],
    mediumRelevanceAgents: [AGENT_IDS.HARPER, AGENT_IDS.FELIX],
    memory: { ownArtifacts: 2, otherArtifacts: 2, activityEvents: 5 },
  },
  {
    id: AGENT_IDS.HARPER,
    name: 'Harper',
    pillar: 'operations-finance',
    tools: [ARTIFACT_TYPES.HIRING_PLAN],
    dataTools: [],
    actions: ['wellfound_post', 'screen_resume'],
    qscoreBoosts: {
      [DIMENSIONS.TEAM]: 5, // hiring_plan(5)
    },
    highRelevanceAgents: [AGENT_IDS.PATEL],
    mediumRelevanceAgents: [AGENT_IDS.ATLAS, AGENT_IDS.FELIX],
    memory: { ownArtifacts: 2, otherArtifacts: 3, activityEvents: 8 },
  },

  // ── Pillar 3: Product & Strategy ────────────────────────────────────────────
  {
    id: AGENT_IDS.NOVA,
    name: 'Nova',
    pillar: 'product-strategy',
    tools: [ARTIFACT_TYPES.PMF_SURVEY, ARTIFACT_TYPES.INTERVIEW_NOTES],
    dataTools: [],
    actions: ['host_survey', 'download_survey_html'],
    qscoreBoosts: {
      [DIMENSIONS.PRODUCT]: 8, // pmf_survey(5) + interview_notes(3)
    },
    highRelevanceAgents: [AGENT_IDS.PATEL, AGENT_IDS.ATLAS],
    mediumRelevanceAgents: [AGENT_IDS.SUSI, AGENT_IDS.SAGE],
    memory: { ownArtifacts: 3, otherArtifacts: 4, activityEvents: 10 },
  },
  {
    id: AGENT_IDS.ATLAS,
    name: 'Atlas',
    pillar: 'product-strategy',
    tools: [ARTIFACT_TYPES.COMPETITIVE_MATRIX, ARTIFACT_TYPES.BATTLE_CARD],
    dataTools: ['web_research'],
    actions: ['google_alert', 'track_competitor'],
    qscoreBoosts: {
      [DIMENSIONS.MARKET]: 9, // competitive_matrix(5) + battle_card(4)
    },
    highRelevanceAgents: [AGENT_IDS.PATEL, AGENT_IDS.NOVA],
    mediumRelevanceAgents: [AGENT_IDS.SAGE, AGENT_IDS.SUSI],
    memory: { ownArtifacts: 3, otherArtifacts: 4, activityEvents: 10 },
  },
  {
    id: AGENT_IDS.SAGE,
    name: 'Sage',
    pillar: 'product-strategy',
    tools: [ARTIFACT_TYPES.STRATEGIC_PLAN],
    dataTools: [],
    actions: ['send_investor_update', 'linear_export'],
    qscoreBoosts: {
      [DIMENSIONS.PRODUCT]: 4, // strategic_plan(4)
    },
    // Sage synthesises everything — always injects all other agents' context
    highRelevanceAgents: [
      AGENT_IDS.FELIX, AGENT_IDS.PATEL, AGENT_IDS.NOVA,
      AGENT_IDS.ATLAS, AGENT_IDS.SUSI, AGENT_IDS.MAYA,
      AGENT_IDS.HARPER, AGENT_IDS.LEO,
    ],
    mediumRelevanceAgents: [],
    memory: { ownArtifacts: 2, otherArtifacts: 8, activityEvents: 15 },
  },
];

// ─── Tool registry ────────────────────────────────────────────────────────────

export interface ToolConfig {
  id: string;
  type: 'data' | 'artifact';
  /** Handler function name (in lib/tools/executor.ts or lib/actions/handlers/) */
  executor: string;
  cache?: { ttl: number; key: string };
  /** Estimated cost per call in USD */
  costUsd?: number;
}

export const TOOLS: ToolConfig[] = [
  // Data tools
  { id: 'lead_enrich',         type: 'data',     executor: 'executeLeadEnrich',      cache: { ttl: 86400, key: 'hash(domain)' },  costUsd: 0.001 },
  { id: 'web_research',        type: 'data',     executor: 'executeTavilyResearch',  cache: { ttl: 3600,  key: 'hash(query)' },   costUsd: 0.005 },
  { id: 'create_deal',         type: 'data',     executor: 'executeCreateDeal',      costUsd: 0 },
  { id: 'fetch_stripe_metrics',type: 'data',     executor: 'executeStripeMetrics',   costUsd: 0 },

  // Artifact tools
  { id: 'icp_document',        type: 'artifact', executor: 'executeArtifactGenerate', costUsd: 0.02 },
  { id: 'outreach_sequence',   type: 'artifact', executor: 'executeArtifactGenerate', costUsd: 0.02 },
  { id: 'battle_card',         type: 'artifact', executor: 'executeArtifactGenerate', costUsd: 0.02 },
  { id: 'gtm_playbook',        type: 'artifact', executor: 'executeArtifactGenerate', costUsd: 0.03 },
  { id: 'sales_script',        type: 'artifact', executor: 'executeArtifactGenerate', costUsd: 0.02 },
  { id: 'brand_messaging',     type: 'artifact', executor: 'executeArtifactGenerate', costUsd: 0.02 },
  { id: 'financial_summary',   type: 'artifact', executor: 'executeArtifactGenerate', costUsd: 0.03 },
  { id: 'legal_checklist',     type: 'artifact', executor: 'executeArtifactGenerate', costUsd: 0.02 },
  { id: 'hiring_plan',         type: 'artifact', executor: 'executeArtifactGenerate', costUsd: 0.02 },
  { id: 'pmf_survey',          type: 'artifact', executor: 'executeArtifactGenerate', costUsd: 0.02 },
  { id: 'interview_notes',     type: 'artifact', executor: 'executeArtifactGenerate', costUsd: 0.02 },
  { id: 'competitive_matrix',  type: 'artifact', executor: 'executeArtifactGenerate', costUsd: 0.03 },
  { id: 'strategic_plan',      type: 'artifact', executor: 'executeArtifactGenerate', costUsd: 0.03 },
];

const TOOL_MAP = new Map(TOOLS.map(t => [t.id, t]));

export function getTool(id: string): ToolConfig | undefined {
  return TOOL_MAP.get(id);
}

// ─── Action registry ─────────────────────────────────────────────────────────

export type ActionType = 'platform' | 'enrichment' | 'handoff';

export interface ActionConfig {
  id: string;
  /**
   * platform  = Edge Alpha executes server-side (deploy, email, screen resume)
   * enrichment = brings external data in (lead_enrich, web_research, stripe)
   * handoff   = clipboard copy + window.open to external platform
   */
  type: ActionType;
  executor: string;
  /** Artifact types that must exist for this user before the action can run */
  requires?: ArtifactType[];
  /** Prompt the user to confirm before executing */
  confirmation: boolean;
}

export const ACTIONS: ActionConfig[] = [
  // Platform actions (server-side, logged to agent_activity)
  { id: 'deploy_landing_page',   type: 'platform',   executor: 'deployLandingPage',      requires: [ARTIFACT_TYPES.GTM_PLAYBOOK],       confirmation: true  },
  { id: 'send_investor_update',  type: 'platform',   executor: 'sendInvestorUpdate',      confirmation: true  },
  { id: 'screen_resume',         type: 'platform',   executor: 'screenResume',            requires: [ARTIFACT_TYPES.HIRING_PLAN],        confirmation: false },
  { id: 'generate_nda',          type: 'platform',   executor: 'generateNDA',             confirmation: false },
  { id: 'blog_post',             type: 'platform',   executor: 'generateBlogPost',        requires: [ARTIFACT_TYPES.BRAND_MESSAGING],    confirmation: false },
  { id: 'host_survey',           type: 'platform',   executor: 'hostSurvey',              requires: [ARTIFACT_TYPES.PMF_SURVEY],         confirmation: false },
  { id: 'track_competitor',      type: 'platform',   executor: 'trackCompetitor',         requires: [ARTIFACT_TYPES.COMPETITIVE_MATRIX], confirmation: false },

  // Enrichment actions (bring external data in, execute as tool call)
  { id: 'lead_enrich',           type: 'enrichment', executor: 'executeLeadEnrich',       confirmation: false },
  { id: 'web_research',          type: 'enrichment', executor: 'executeTavilyResearch',   confirmation: false },
  { id: 'fetch_stripe_metrics',  type: 'enrichment', executor: 'executeStripeMetrics',    confirmation: false },

  // Handoff actions (clipboard copy + window.open, no server call)
  { id: 'gmail_compose',         type: 'handoff',    executor: 'handoffGmail',            requires: [ARTIFACT_TYPES.OUTREACH_SEQUENCE],  confirmation: false },
  { id: 'wellfound_post',        type: 'handoff',    executor: 'handoffWellfound',        requires: [ARTIFACT_TYPES.HIRING_PLAN],        confirmation: false },
  { id: 'clerky_start',          type: 'handoff',    executor: 'handoffClerky',           requires: [ARTIFACT_TYPES.LEGAL_CHECKLIST],    confirmation: false },
  { id: 'stripe_atlas',          type: 'handoff',    executor: 'handoffStripeAtlas',      requires: [ARTIFACT_TYPES.LEGAL_CHECKLIST],    confirmation: false },
  { id: 'linear_export',         type: 'handoff',    executor: 'handoffLinear',           requires: [ARTIFACT_TYPES.STRATEGIC_PLAN],     confirmation: false },
  { id: 'google_alert',          type: 'handoff',    executor: 'handoffGoogleAlert',      confirmation: false },
  { id: 'download_social_templates', type: 'handoff', executor: 'handoffSocialTemplates', requires: [ARTIFACT_TYPES.BRAND_MESSAGING],   confirmation: false },
  { id: 'download_survey_html',  type: 'handoff',    executor: 'handoffSurveyHtml',       requires: [ARTIFACT_TYPES.PMF_SURVEY],         confirmation: false },
  { id: 'download_csv',          type: 'handoff',    executor: 'handoffFinancialCSV',     requires: [ARTIFACT_TYPES.FINANCIAL_SUMMARY],  confirmation: false },
];

const ACTION_MAP = new Map(ACTIONS.map(a => [a.id, a]));

export function getAction(id: string): ActionConfig | undefined {
  return ACTION_MAP.get(id);
}

// ─── Lookup helpers ───────────────────────────────────────────────────────────

const AGENT_MAP = new Map(AGENTS.map(a => [a.id, a]));

export function getAgent(id: string): AgentConfig {
  const agent = AGENT_MAP.get(id as AgentId);
  if (!agent) throw new Error(`Unknown agent ID: "${id}"`);
  return agent;
}

export function getAgentTools(id: string): ArtifactType[] {
  return getAgent(id).tools;
}

export function getAgentDataTools(id: string): string[] {
  return getAgent(id).dataTools;
}

export { AGENTS };

/**
 * Native tool definitions for all 15 agent tools.
 * These are passed to the LLM via the tools parameter — the model returns
 * structured tool_use objects instead of embedding XML in text.
 */

import type { ToolDefinition } from './types';
import { ARTIFACT_TYPES } from '@/lib/constants/artifact-types';
import { AGENT_IDS } from '@/lib/constants/agent-ids';
import { getAgent } from '@/lib/edgealpha.config';

// ─── Data tools (specific parameter schemas) ────────────────────────────────

const leadEnrich: ToolDefinition = {
  name: 'lead_enrich',
  description:
    'Find decision-maker contacts at a company domain via Hunter.io. Use when the founder mentions wanting to reach people at a specific company.',
  parameters: {
    type: 'object',
    properties: {
      domain: {
        type: 'string',
        description: 'Company website domain, e.g. acme.com',
      },
    },
    required: ['domain'],
  },
};

const webResearch: ToolDefinition = {
  name: 'web_research',
  description:
    'Search the web for current information about a topic, company, or market. Use when you need live competitive intelligence, market data, or recent news.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query — be specific (company names, product categories, etc.)',
      },
    },
    required: ['query'],
  },
};

const createDeal: ToolDefinition = {
  name: 'create_deal',
  description:
    'Create a new deal in the CRM pipeline. Use when the founder mentions a specific company they are selling to or negotiating with.',
  parameters: {
    type: 'object',
    properties: {
      company: {
        type: 'string',
        description: 'Company name',
      },
      contact_name: {
        type: 'string',
        description: 'Primary contact name',
      },
      contact_email: {
        type: 'string',
        description: 'Primary contact email',
      },
      contact_title: {
        type: 'string',
        description: 'Primary contact job title',
      },
      value: {
        type: 'number',
        description: 'Deal value in USD',
      },
      stage: {
        type: 'string',
        enum: ['lead', 'qualified', 'proposal', 'negotiating', 'won', 'lost'],
        description: 'Pipeline stage',
      },
      notes: {
        type: 'string',
        description: 'Additional context about the deal',
      },
    },
    required: ['company'],
  },
};

// ─── Artifact tools (loose context schema) ───────────────────────────────────

function artifactTool(name: string, description: string): ToolDefinition {
  return {
    name,
    description,
    parameters: {
      type: 'object',
      properties: {
        context: {
          type: 'object',
          description:
            'All relevant context gathered from the conversation — product, market, customers, competitors, financials, team, etc. Use descriptive keys.',
        },
        focus_note: {
          type: 'string',
          description: 'Optional note about what to emphasize in the deliverable',
        },
      },
      required: ['context'],
    },
  };
}

const icpDocument = artifactTool(
  ARTIFACT_TYPES.ICP_DOCUMENT,
  'Generate an Ideal Customer Profile document. Use when the founder has described their target market, product, current customers, and pain points.',
);

const outreachSequence = artifactTool(
  ARTIFACT_TYPES.OUTREACH_SEQUENCE,
  'Generate a 5-7 step outreach sequence (email/LinkedIn/call) with personalization tokens. Use when ICP is clear and value proposition is defined.',
);

const battleCard = artifactTool(
  ARTIFACT_TYPES.BATTLE_CARD,
  'Generate a competitive battle card with positioning matrix, objection handling, and win strategy. Use when at least one competitor is named with differentiators discussed.',
);

const gtmPlaybook = artifactTool(
  ARTIFACT_TYPES.GTM_PLAYBOOK,
  'Generate a comprehensive GTM playbook with ICP, positioning, channels, messaging, metrics, and 90-day plan. Use when ICP, channels, messaging, and timeline are covered.',
);

const salesScript = artifactTool(
  ARTIFACT_TYPES.SALES_SCRIPT,
  'Generate a sales script with discovery questions, pitch framework, objection handling, and closing lines. Use when the product, target persona, and pricing are discussed.',
);

const brandMessaging = artifactTool(
  ARTIFACT_TYPES.BRAND_MESSAGING,
  'Generate brand messaging with positioning statement, taglines, elevator pitches, and voice guide. Use when the founder has described their product, audience, and competitive landscape.',
);

const financialSummary = artifactTool(
  ARTIFACT_TYPES.FINANCIAL_SUMMARY,
  'Generate a financial summary with MRR/ARR/burn/runway snapshot, unit economics analysis, and fundraising recommendation. Use when the founder has shared financial metrics.',
);

const legalChecklist = artifactTool(
  ARTIFACT_TYPES.LEGAL_CHECKLIST,
  'Generate a legal checklist for incorporation, IP protection, and fundraising readiness. Use when the founder has described their company stage and legal needs.',
);

const hiringPlan = artifactTool(
  ARTIFACT_TYPES.HIRING_PLAN,
  'Generate a hiring plan with current gaps, next hires with requirements, org roadmap, and compensation bands. Use when the founder has discussed their team and growth plans.',
);

const pmfSurvey = artifactTool(
  ARTIFACT_TYPES.PMF_SURVEY,
  'Generate a PMF survey with interview script (5 phases), Ellis test questions, experiments, and segment analysis. Use when the founder wants to validate product-market fit.',
);

const competitiveMatrix = artifactTool(
  ARTIFACT_TYPES.COMPETITIVE_MATRIX,
  'Generate a competitive matrix with feature comparison, SWOT analysis, positioning map, and white space opportunities. Use when multiple competitors have been discussed.',
);

const strategicPlan = artifactTool(
  ARTIFACT_TYPES.STRATEGIC_PLAN,
  'Generate a strategic plan with vision, core bets, OKRs, now/next/later roadmap, risks, and fundraising milestones. Use when the founder has discussed their goals and challenges.',
);

// ─── Tool definition registry (JSON schemas) ─────────────────────────────────
// The agent→tool MAPPING lives in lib/edgealpha.config.ts (single source of truth).
// These ToolDefinition objects provide the JSON schema used by the LLM.

export const TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  lead_enrich:        leadEnrich,
  web_research:       webResearch,
  create_deal:        createDeal,
  icp_document:       icpDocument,
  outreach_sequence:  outreachSequence,
  battle_card:        battleCard,
  gtm_playbook:       gtmPlaybook,
  sales_script:       salesScript,
  brand_messaging:    brandMessaging,
  financial_summary:  financialSummary,
  legal_checklist:    legalChecklist,
  hiring_plan:        hiringPlan,
  pmf_survey:         pmfSurvey,
  competitive_matrix: competitiveMatrix,
  strategic_plan:     strategicPlan,
};

/**
 * Returns the tool definitions for a given agent, reading the agent→tool
 * mapping from the registry in lib/edgealpha.config.ts.
 *
 * Replaces the old hardcoded AGENT_TOOLS record.
 */
export function getToolsForAgent(agentId: string): ToolDefinition[] {
  try {
    const agent = getAgent(agentId);
    const allToolIds = [...agent.tools, ...agent.dataTools];
    return allToolIds
      .map(id => TOOL_DEFINITIONS[id])
      .filter((t): t is ToolDefinition => t !== undefined);
  } catch {
    return [];
  }
}

// ─── Backwards-compatible export (kept while callers migrate to getToolsForAgent) ───
/** @deprecated Use getToolsForAgent(agentId) instead */
export const AGENT_TOOLS: Record<string, ToolDefinition[]> = Object.fromEntries(
  Object.values(AGENT_IDS).map(id => [id, getToolsForAgent(id)])
);

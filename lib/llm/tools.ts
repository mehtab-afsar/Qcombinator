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

const fetchStripeMetrics: ToolDefinition = {
  name: 'fetch_stripe_metrics',
  description:
    'Fetch live financial metrics from the connected Stripe account (MRR, ARR, customer count, churn). Use when the founder wants up-to-date revenue data.',
  parameters: {
    type: 'object',
    properties: {
      metric: {
        type: 'string',
        enum: ['mrr', 'arr', 'customers', 'churn', 'all'],
        description: 'Which metric to fetch — use "all" for a full summary',
      },
    },
    required: [],
  },
};

const apolloSearch: ToolDefinition = {
  name: 'apollo_search',
  description:
    'Search Apollo.io for decision-maker contacts matching specific criteria. Returns verified emails, LinkedIn URLs, and company data. Use when the founder needs a lead list matching their ICP.',
  parameters: {
    type: 'object',
    properties: {
      job_titles: {
        type: 'array',
        items: { type: 'string' },
        description: 'Target job titles, e.g. ["Head of Sales", "VP of Marketing", "Founder"]',
      },
      industries: {
        type: 'array',
        items: { type: 'string' },
        description: 'Target industries, e.g. ["SaaS", "FinTech", "Healthcare"]',
      },
      employee_count_min: {
        type: 'number',
        description: 'Minimum company employee count',
      },
      employee_count_max: {
        type: 'number',
        description: 'Maximum company employee count',
      },
      locations: {
        type: 'array',
        items: { type: 'string' },
        description: 'Target locations, e.g. ["United States", "United Kingdom"]',
      },
      keywords: {
        type: 'array',
        items: { type: 'string' },
        description: 'Keywords in job title or company description, e.g. ["AI", "automation", "B2B"]',
      },
      per_page: {
        type: 'number',
        description: 'Number of results to return (max 100)',
      },
    },
    required: ['job_titles'],
  },
};

const posthogQuery: ToolDefinition = {
  name: 'posthog_query',
  description:
    'Query PostHog for real product analytics: retention rates, feature adoption, funnel conversion, active users, and event data. Use when you need actual user behavior data.',
  parameters: {
    type: 'object',
    properties: {
      query_type: {
        type: 'string',
        enum: ['retention', 'funnel', 'active_users', 'feature_usage', 'churn_signals', 'nps_scores'],
        description: 'Type of analytics query to run',
      },
      date_range: {
        type: 'string',
        enum: ['7d', '14d', '30d', '90d'],
        description: 'Date range for the query (default: 30d)',
      },
      segment: {
        type: 'string',
        description: 'Optional user segment to filter by (e.g. "paying", "churned", "power_users")',
      },
    },
    required: ['query_type'],
  },
};

const calendlyLink: ToolDefinition = {
  name: 'calendly_link',
  description:
    'Generate a Calendly booking link for a meeting. Use when a prospect, customer, or candidate needs to schedule time with the founder.',
  parameters: {
    type: 'object',
    properties: {
      meeting_type: {
        type: 'string',
        enum: ['demo', 'discovery', 'qbr', 'interview', 'onboarding_call', 'follow_up'],
        description: 'Type of meeting to schedule',
      },
      duration_minutes: {
        type: 'number',
        enum: [15, 30, 45, 60],
        description: 'Meeting duration in minutes (default: 30)',
      },
      context: {
        type: 'string',
        description: 'Optional context to pre-fill in the booking description',
      },
    },
    required: ['meeting_type'],
  },
};

const vapiCall: ToolDefinition = {
  name: 'vapi_call',
  description:
    'Initiate an AI voice call to a lead to qualify them and book a meeting. Use when the founder wants to auto-qualify a list of leads via phone. Requires phone number.',
  parameters: {
    type: 'object',
    properties: {
      phone_number: {
        type: 'string',
        description: 'Phone number to call in E.164 format, e.g. +14155551234',
      },
      contact_name: {
        type: 'string',
        description: 'First name of the contact to personalise the call',
      },
      company: {
        type: 'string',
        description: 'Company name for context',
      },
      objective: {
        type: 'string',
        enum: ['qualify_and_book', 'follow_up', 'reactivate'],
        description: 'Goal of the call — qualify_and_book for new leads, follow_up for warm leads',
      },
      calendar_link: {
        type: 'string',
        description: 'Calendly link to share if they want to book a meeting',
      },
    },
    required: ['phone_number', 'contact_name', 'objective'],
  },
};

const firefliesSync: ToolDefinition = {
  name: 'fireflies_sync',
  description:
    'Sync the latest sales call transcript from Fireflies.ai. Extracts objections, next steps, key signals, and deal intelligence from the transcript.',
  parameters: {
    type: 'object',
    properties: {
      transcript_id: {
        type: 'string',
        description: 'Specific Fireflies transcript ID, or omit to fetch the most recent call',
      },
      deal_id: {
        type: 'string',
        description: 'CRM deal ID to associate the call with',
      },
    },
    required: [],
  },
};

// ─── Execution tools (trigger real-world actions, not just data fetch) ────────

const sendOutreachSequence: ToolDefinition = {
  name: 'send_outreach_sequence',
  description:
    'Send a generated outreach email sequence to a list of contacts via Resend. Use AFTER apollo_search has returned leads AND an outreach_sequence artifact exists. Sends step 0 immediately and schedules follow-up steps.',
  parameters: {
    type: 'object',
    properties: {
      contacts: {
        type: 'array',
        description: 'List of contacts from apollo_search or lead_enrich results',
        items: {
          type: 'object',
          properties: {
            name:    { type: 'string' },
            email:   { type: 'string' },
            company: { type: 'string' },
            title:   { type: 'string' },
          },
          required: ['name', 'email'],
        },
      },
      sequence_steps: {
        type: 'array',
        description: 'Email steps from the outreach_sequence artifact — each step has subject + body',
        items: {
          type: 'object',
          properties: {
            subject: { type: 'string' },
            body:    { type: 'string' },
          },
          required: ['subject', 'body'],
        },
      },
      sequence_name: {
        type: 'string',
        description: 'Name of the outreach campaign (e.g. "Q2 B2B SaaS CTO Outreach")',
      },
      from_name: {
        type: 'string',
        description: 'Sender name (founder name)',
      },
      schedule_followups: {
        type: 'boolean',
        description: 'If true, automatically schedule follow-up steps (Day 3, Day 7, Day 14). Default true.',
      },
    },
    required: ['contacts', 'sequence_steps'],
  },
};

const bulkEnrichPipeline: ToolDefinition = {
  name: 'bulk_enrich_pipeline',
  description:
    'Run an Apollo search and immediately add all results to the CRM pipeline as deals. Combines lead search + deal creation in one action. Use when the founder wants to populate their pipeline from an ICP search.',
  parameters: {
    type: 'object',
    properties: {
      job_titles: {
        type: 'array',
        items: { type: 'string' },
        description: 'Target job titles to search',
      },
      industries: {
        type: 'array',
        items: { type: 'string' },
        description: 'Target industries',
      },
      employee_count_min: { type: 'number' },
      employee_count_max: { type: 'number' },
      locations: {
        type: 'array',
        items: { type: 'string' },
      },
      keywords: {
        type: 'array',
        items: { type: 'string' },
      },
      per_page: {
        type: 'number',
        description: 'Number of results (max 100, default 25)',
      },
    },
    required: ['job_titles'],
  },
};

const initiateVoiceCall: ToolDefinition = {
  name: 'initiate_voice_call',
  description:
    'Dial a lead via Vapi AI SDR (Susi\'s voice agent). Use when the founder wants to make an AI-powered sales call to a specific contact. Requires a phone number.',
  parameters: {
    type: 'object',
    properties: {
      phone_number: {
        type: 'string',
        description: 'E.164 formatted phone number of the lead (e.g. +14155552671)',
      },
      lead_name: { type: 'string', description: 'First name of the person being called' },
      company:   { type: 'string', description: 'Lead\'s company name' },
      context:   { type: 'string', description: 'Brief context for the call — product, pain points, goals' },
    },
    required: ['phone_number'],
  },
};

const scheduleFollowup: ToolDefinition = {
  name: 'schedule_followup',
  description:
    'Schedule a follow-up action to run automatically N days from now. Use to queue up Day 3 / Day 7 / Day 14 email steps, or a follow-up voice call, without requiring the founder to remember.',
  parameters: {
    type: 'object',
    properties: {
      action_type: {
        type: 'string',
        enum: ['send_email_step', 'vapi_call', 'followup_check'],
        description: 'What to do when the scheduled time arrives',
      },
      days_from_now: {
        type: 'number',
        description: 'Days until the action fires (e.g. 3 for a Day 3 follow-up)',
      },
      payload: {
        type: 'object',
        description: 'All data needed to execute the action: contacts, sequence steps, step_index, etc.',
      },
    },
    required: ['action_type', 'days_from_now', 'payload'],
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

// ─── New artifact tools ───────────────────────────────────────────────────────

const campaignReport     = artifactTool(ARTIFACT_TYPES.CAMPAIGN_REPORT,    'Generate a campaign performance report with emails sent/opened/replied, LinkedIn accepts, meetings booked, and CAC estimate.');
const abTestResult       = artifactTool(ARTIFACT_TYPES.AB_TEST_RESULT,     'Generate an A/B test result report with variant performance, statistical significance, and winning variant recommendation.');
const leadList           = artifactTool(ARTIFACT_TYPES.LEAD_LIST,           'Generate a targeted lead list from Apollo.io search results. Use when ICP is defined and the founder needs contacts to reach out to.');
const callPlaybook       = artifactTool(ARTIFACT_TYPES.CALL_PLAYBOOK,       'Generate a pre-call playbook for a specific deal. Use when a sales call is imminent and deal context is available.');
const pipelineReport     = artifactTool(ARTIFACT_TYPES.PIPELINE_REPORT,     'Generate a pipeline health report with deal stage analysis, velocity metrics, and recommended actions.');
const proposal           = artifactTool(ARTIFACT_TYPES.PROPOSAL,            'Generate a branded sales proposal with problem framing, solution overview, pricing, and ROI estimate.');
const winLossAnalysis    = artifactTool(ARTIFACT_TYPES.WIN_LOSS_ANALYSIS,   'Generate a win/loss analysis from deal history patterns, objection themes, and competitive signals.');
const contentCalendar    = artifactTool(ARTIFACT_TYPES.CONTENT_CALENDAR,    'Generate a 30-day content calendar with platform-specific posts, briefs, and publishing schedule.');
const seoAudit           = artifactTool(ARTIFACT_TYPES.SEO_AUDIT,           'Generate an SEO audit with target keywords, content gaps, competitor rankings, and priority action list.');
const pressKit           = artifactTool(ARTIFACT_TYPES.PRESS_KIT,           'Generate a press kit with company overview, founder bios, product screenshots, and media boilerplate.');
const newsletterIssue    = artifactTool(ARTIFACT_TYPES.NEWSLETTER_ISSUE,    'Generate a newsletter issue with hook, main story, product update, and CTA.');
const brandHealthReport  = artifactTool(ARTIFACT_TYPES.BRAND_HEALTH_REPORT, 'Generate a brand health report with mention volume, sentiment, reach, top content, and share of voice.');
const financialModel     = artifactTool(ARTIFACT_TYPES.FINANCIAL_MODEL,     'Generate an 18-month financial model with 3 scenarios (base/bull/bear) and key assumptions.');
const investorUpdate     = artifactTool(ARTIFACT_TYPES.INVESTOR_UPDATE,     'Generate a monthly investor update with metrics, milestones, asks, and narrative.');
const boardDeck          = artifactTool(ARTIFACT_TYPES.BOARD_DECK,          'Generate a board deck with key metrics, OKR progress, financial summary, and strategic priorities.');
const capTableSummary    = artifactTool(ARTIFACT_TYPES.CAP_TABLE_SUMMARY,   'Generate a cap table summary with ownership breakdown, option pool, and dilution scenarios for the next raise.');
const fundraisingNarrative = artifactTool(ARTIFACT_TYPES.FUNDRAISING_NARRATIVE, 'Generate a fundraising narrative with investment thesis, traction story, use of funds, and target investor criteria.');
const nda                = artifactTool(ARTIFACT_TYPES.NDA,                 'Generate a Non-Disclosure Agreement. Use when the founder needs a mutual or one-way NDA for a specific counterparty.');
const safeNote           = artifactTool(ARTIFACT_TYPES.SAFE_NOTE,           'Generate a YC-standard SAFE note with agreed terms, ready for e-signature.');
const contractorAgreement = artifactTool(ARTIFACT_TYPES.CONTRACTOR_AGREEMENT, 'Generate a contractor/consultant agreement with IP assignment clause.');
const privacyPolicy      = artifactTool(ARTIFACT_TYPES.PRIVACY_POLICY,     'Generate a GDPR/CCPA-compliant privacy policy tailored to the startup\'s data flows.');
const ipAuditReport      = artifactTool(ARTIFACT_TYPES.IP_AUDIT_REPORT,    'Generate an IP audit report covering open source license conflicts, IP ownership gaps, and filing recommendations.');
const termSheetRedline   = artifactTool(ARTIFACT_TYPES.TERM_SHEET_REDLINE, 'Analyse a term sheet, flag risky clauses, and generate recommended redlines.');
const jobDescription     = artifactTool(ARTIFACT_TYPES.JOB_DESCRIPTION,    'Generate a full job description with role overview, responsibilities, requirements, comp range, equity, and culture sell.');
const interviewScorecard = artifactTool(ARTIFACT_TYPES.INTERVIEW_SCORECARD, 'Generate a role-specific interview scorecard with structured questions per competency and pass/fail criteria.');
const offerLetter        = artifactTool(ARTIFACT_TYPES.OFFER_LETTER,       'Generate a personalized offer letter with salary, equity %, vesting schedule, start date, and benefits.');
const onboardingPlan     = artifactTool(ARTIFACT_TYPES.ONBOARDING_PLAN,    'Generate a 30/60/90 day onboarding plan with milestones, tool access checklist, and stakeholder intro schedule.');
const compBenchmark      = artifactTool(ARTIFACT_TYPES.COMP_BENCHMARK,     'Generate a compensation benchmark report with market data for a role, location, and stage.');
const retentionReport    = artifactTool(ARTIFACT_TYPES.RETENTION_REPORT,   'Generate a retention report with Day 1/7/30/90 curves, cohort analysis, benchmark comparison, and recommended actions.');
const productInsight     = artifactTool(ARTIFACT_TYPES.PRODUCT_INSIGHT,    'Generate a product insight report from user feedback themes, usage patterns, friction points, and recommended priorities.');
const experimentDesign   = artifactTool(ARTIFACT_TYPES.EXPERIMENT_DESIGN,  'Generate a product experiment design with hypothesis, variant spec, success metric, sample size, and timeline.');
const roadmap            = artifactTool(ARTIFACT_TYPES.ROADMAP,            'Generate a product roadmap (Now/Next/Later) with RICE scores, business cases, and dependency map.');
const userPersona        = artifactTool(ARTIFACT_TYPES.USER_PERSONA,       'Generate a data-driven user persona with usage patterns, feedback themes, job-to-be-done, and segment size.');
const competitorWeekly   = artifactTool(ARTIFACT_TYPES.COMPETITOR_WEEKLY,  'Generate a weekly competitive intelligence digest with pricing changes, funding, hiring signals, and product moves.');
const marketMap          = artifactTool(ARTIFACT_TYPES.MARKET_MAP,         'Generate a visual market map of all players by positioning axes with white space analysis.');
const reviewIntelligence = artifactTool(ARTIFACT_TYPES.REVIEW_INTELLIGENCE,'Generate a review intelligence report from G2/Capterra reviews mapping competitor weaknesses to startup strengths.');
const investorReadinessReport = artifactTool(ARTIFACT_TYPES.INVESTOR_READINESS_REPORT, 'Generate a cross-agent investor readiness report synthesising market, finance, product, team, and GTM signals.');
const contradictionReport = artifactTool(ARTIFACT_TYPES.CONTRADICTION_REPORT, 'Generate a contradiction report flagging conflicts between agent outputs with severity ratings and resolution paths.');
const okrHealthReport    = artifactTool(ARTIFACT_TYPES.OKR_HEALTH_REPORT, 'Generate an OKR health report with current progress, at-risk objectives, and recommended re-prioritisation.');
const crisisPlaybook     = artifactTool(ARTIFACT_TYPES.CRISIS_PLAYBOOK,   'Generate a crisis playbook with step-by-step response protocol for a specific scenario.');
const customerHealthReport = artifactTool(ARTIFACT_TYPES.CUSTOMER_HEALTH_REPORT, 'Generate a customer health report with health scores per account, at-risk list, and recommended interventions.');
const churnAnalysis      = artifactTool(ARTIFACT_TYPES.CHURN_ANALYSIS,    'Generate a churn analysis with rate by segment, cohort curves, top reasons, and prevention recommendations.');
const qbrDeck            = artifactTool(ARTIFACT_TYPES.QBR_DECK,          'Generate a QBR deck with goals vs outcomes, ROI delivered, usage highlights, and next quarter success plan.');
const expansionPlaybook  = artifactTool(ARTIFACT_TYPES.EXPANSION_PLAYBOOK,'Generate an expansion playbook for an account showing upsell signals, recommended upgrade, and talk track.');
const csPlaybook         = artifactTool(ARTIFACT_TYPES.CS_PLAYBOOK,       'Generate a customer success playbook with onboarding milestones, QBR cadence, churn prevention, and escalation protocol.');
const growthModel        = artifactTool(ARTIFACT_TYPES.GROWTH_MODEL,      'Generate a growth model with current channel analysis, bottleneck identification, 90-day experiment roadmap, and CAC by channel.');
const paidCampaign       = artifactTool(ARTIFACT_TYPES.PAID_CAMPAIGN,     'Generate a paid campaign structure with ad groups, copy variants, keyword list, budget allocation, and bidding strategy.');
const referralProgram    = artifactTool(ARTIFACT_TYPES.REFERRAL_PROGRAM,  'Generate a referral program with mechanics, reward structure, copy for all touchpoints, and tracking setup.');
const launchPlaybook     = artifactTool(ARTIFACT_TYPES.LAUNCH_PLAYBOOK,   'Generate a launch playbook (Product Hunt/AppSumo/feature) with timeline, asset checklist, and day-of execution plan.');
const growthReport       = artifactTool(ARTIFACT_TYPES.GROWTH_REPORT,     'Generate a growth report with CAC by channel, MoM growth rate, funnel conversion, ROAS, and viral coefficient.');
const experimentResults  = artifactTool(ARTIFACT_TYPES.EXPERIMENT_RESULTS,'Generate an experiment results analysis with hypothesis outcome, statistical significance, and next experiment recommendation.');

// ─── Tool definition registry (JSON schemas) ─────────────────────────────────
// The agent→tool MAPPING lives in lib/edgealpha.config.ts (single source of truth).
// These ToolDefinition objects provide the JSON schema used by the LLM.

export const TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  // Execution tools
  send_outreach_sequence:   sendOutreachSequence,
  initiate_voice_call:      initiateVoiceCall,
  bulk_enrich_pipeline:     bulkEnrichPipeline,
  schedule_followup:        scheduleFollowup,

  // Data tools
  lead_enrich:              leadEnrich,
  web_research:             webResearch,
  create_deal:              createDeal,
  fetch_stripe_metrics:     fetchStripeMetrics,
  apollo_search:            apolloSearch,
  posthog_query:            posthogQuery,
  calendly_link:            calendlyLink,
  vapi_call:                vapiCall,
  fireflies_sync:           firefliesSync,

  // Existing artifact tools
  icp_document:             icpDocument,
  outreach_sequence:        outreachSequence,
  battle_card:              battleCard,
  gtm_playbook:             gtmPlaybook,
  sales_script:             salesScript,
  brand_messaging:          brandMessaging,
  financial_summary:        financialSummary,
  legal_checklist:          legalChecklist,
  hiring_plan:              hiringPlan,
  pmf_survey:               pmfSurvey,
  competitive_matrix:       competitiveMatrix,
  strategic_plan:           strategicPlan,

  // New artifact tools — Patel
  lead_list:                leadList,
  campaign_report:          campaignReport,
  ab_test_result:           abTestResult,

  // New artifact tools — Susi
  call_playbook:            callPlaybook,
  pipeline_report:          pipelineReport,
  proposal:                 proposal,
  win_loss_analysis:        winLossAnalysis,

  // New artifact tools — Maya
  content_calendar:         contentCalendar,
  seo_audit:                seoAudit,
  press_kit:                pressKit,
  newsletter_issue:         newsletterIssue,
  brand_health_report:      brandHealthReport,

  // New artifact tools — Felix
  financial_model:          financialModel,
  investor_update:          investorUpdate,
  board_deck:               boardDeck,
  cap_table_summary:        capTableSummary,
  fundraising_narrative:    fundraisingNarrative,

  // New artifact tools — Leo
  nda:                      nda,
  safe_note:                safeNote,
  contractor_agreement:     contractorAgreement,
  privacy_policy:           privacyPolicy,
  ip_audit_report:          ipAuditReport,
  term_sheet_redline:       termSheetRedline,

  // New artifact tools — Harper
  job_description:          jobDescription,
  interview_scorecard:      interviewScorecard,
  offer_letter:             offerLetter,
  onboarding_plan:          onboardingPlan,
  comp_benchmark_report:    compBenchmark,

  // New artifact tools — Nova
  retention_report:         retentionReport,
  product_insight_report:   productInsight,
  experiment_design:        experimentDesign,
  roadmap:                  roadmap,
  user_persona:             userPersona,

  // New artifact tools — Atlas
  competitor_weekly:        competitorWeekly,
  market_map:               marketMap,
  review_intelligence_report: reviewIntelligence,

  // New artifact tools — Sage
  investor_readiness_report: investorReadinessReport,
  contradiction_report:     contradictionReport,
  okr_health_report:        okrHealthReport,
  crisis_playbook:          crisisPlaybook,

  // New artifact tools — Carter
  customer_health_report:   customerHealthReport,
  churn_analysis:           churnAnalysis,
  qbr_deck:                 qbrDeck,
  expansion_playbook:       expansionPlaybook,
  cs_playbook:              csPlaybook,

  // New artifact tools — Riley
  growth_model:             growthModel,
  paid_campaign:            paidCampaign,
  referral_program:         referralProgram,
  launch_playbook:          launchPlaybook,
  growth_report:            growthReport,
  experiment_results:       experimentResults,
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

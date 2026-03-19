import type { ArtifactType } from '../types/agent.types';
import { ARTIFACT_TYPES } from '@/lib/constants/artifact-types';

export interface AgentTemplate {
  artifactType: ArtifactType | null;
  title: string;
  description: string;
  starterPrompt: string;
}

export const AGENT_TEMPLATES: Record<string, AgentTemplate[]> = {
  patel: [
    { artifactType: ARTIFACT_TYPES.ICP_DOCUMENT,      title: "ICP Document",          description: "Define your ideal customer with firmographics, pain points, and buying triggers",        starterPrompt: "Let's build my Ideal Customer Profile — help me define who I'm targeting, their pain points, and what triggers them to buy." },
    { artifactType: ARTIFACT_TYPES.OUTREACH_SEQUENCE, title: "Cold Outreach Sequence", description: "5-email cold drip personalized for your ICP",                                           starterPrompt: "I need a cold outreach email sequence — let's create 5 emails for reaching out to my ideal customers." },
    { artifactType: ARTIFACT_TYPES.BATTLE_CARD,       title: "Competitor Battle Card", description: "One-pager for your top competitor — strengths, weaknesses, how to win",                starterPrompt: "Build me a battle card for my top competitor — I'll tell you who they are and we'll map their strengths, weaknesses, and how to position against them." },
    { artifactType: ARTIFACT_TYPES.GTM_PLAYBOOK,      title: "GTM Playbook",           description: "Full go-to-market plan with channels, 90-day timeline, and KPIs",                      starterPrompt: "Let's create a full GTM playbook — I need a comprehensive go-to-market plan with channels, timeline, and success metrics." },
  ],
  susi: [
    { artifactType: ARTIFACT_TYPES.SALES_SCRIPT, title: "Discovery Call Script",     description: "Call framework with questions, objection handling, and close",                          starterPrompt: "Write a discovery call script for me — I need a structured call framework with great questions and how to handle objections." },
    { artifactType: ARTIFACT_TYPES.SALES_SCRIPT, title: "Objection Handling Guide",   description: "Top 10 objections your prospects raise — with winning responses",                      starterPrompt: "Build an objection handling guide — let's map the top objections I face in sales calls and craft winning responses to each." },
    { artifactType: ARTIFACT_TYPES.SALES_SCRIPT, title: "Pricing Recommendation",     description: "Tiered pricing structure with anchoring strategy and what's at each level",             starterPrompt: "Help me build a pricing recommendation — I need a tiered pricing structure with the right positioning and what's included at each level." },
  ],
  maya: [
    { artifactType: ARTIFACT_TYPES.BRAND_MESSAGING, title: "Positioning Statement",   description: "Category, audience, differentiation, and proof in one crisp statement",               starterPrompt: "Let's craft my brand positioning statement — I need to nail my category, differentiation, and what makes us unique." },
    { artifactType: ARTIFACT_TYPES.BRAND_MESSAGING, title: "Messaging Framework",     description: "Elevator pitch, one-liner, value props, and boilerplate copy",                        starterPrompt: "Build my messaging framework — I need an elevator pitch, one-liner, and key value propositions I can use everywhere." },
    { artifactType: ARTIFACT_TYPES.BRAND_MESSAGING, title: "Investor Narrative",      description: "Story arc for your pitch — problem, insight, solution, traction",                     starterPrompt: "Help me craft my investor narrative — I need a compelling story arc for my pitch that covers the problem, my insight, and why we're winning." },
  ],
  felix: [
    { artifactType: ARTIFACT_TYPES.FINANCIAL_SUMMARY, title: "Investor Financial Summary", description: "1-pager with key metrics for investor conversations",                             starterPrompt: "Build me an investor-ready financial summary — I need a 1-pager with my key metrics, unit economics, and financial story." },
    { artifactType: ARTIFACT_TYPES.FINANCIAL_SUMMARY, title: "Fundraising Ask Calculator",  description: "How much to raise based on burn rate, milestones, and timeline",                 starterPrompt: "Help me calculate my fundraising ask — I need to figure out how much to raise based on my burn, milestones, and timeline." },
    { artifactType: ARTIFACT_TYPES.FINANCIAL_SUMMARY, title: "Unit Economics Breakdown",    description: "CAC, LTV, payback period, and gross margin — all in one place",                  starterPrompt: "Break down my unit economics — let's calculate and analyze my CAC, LTV, payback period, and gross margin." },
  ],
  leo: [
    { artifactType: ARTIFACT_TYPES.LEGAL_CHECKLIST, title: "Incorporation Checklist",     description: "Step-by-step for Delaware C-Corp — everything before raising",                    starterPrompt: "Walk me through the incorporation checklist — I need to make sure everything is set up correctly for my Delaware C-Corp." },
    { artifactType: ARTIFACT_TYPES.LEGAL_CHECKLIST, title: "Fundraising Legal Checklist", description: "What to review before signing a SAFE, note, or term sheet",                       starterPrompt: "Build a fundraising legal checklist — I need to know what legal items to review and prepare before my fundraise." },
    { artifactType: ARTIFACT_TYPES.LEGAL_CHECKLIST, title: "IP Assignment Guide",         description: "IP transfer from founders to company — before investors ask",                      starterPrompt: "Help me with IP assignment — I need to understand what intellectual property needs to be assigned from founders to the company." },
  ],
  harper: [
    { artifactType: ARTIFACT_TYPES.HIRING_PLAN, title: "First 5 Hires Plan",          description: "Who to hire first based on your stage and biggest team gaps",                         starterPrompt: "Build my first 5 hires plan — let's figure out who I should hire first given my current stage and team gaps." },
    { artifactType: ARTIFACT_TYPES.HIRING_PLAN, title: "Org Roadmap by Stage",         description: "Who to hire at $0, $500K, $1M, and $5M ARR",                                        starterPrompt: "Create an org roadmap for my company — I need to know who to hire at each revenue milestone." },
    { artifactType: ARTIFACT_TYPES.HIRING_PLAN, title: "Compensation Framework",       description: "Salary bands and equity ranges by role and stage",                                    starterPrompt: "Help me build a compensation framework — I need salary bands and equity ranges for the roles I'm hiring." },
  ],
  nova: [
    { artifactType: ARTIFACT_TYPES.PMF_SURVEY, title: "Customer Interview Script",    description: "20 sequenced questions to uncover real customer pain",                                 starterPrompt: "Write a customer interview script for me — I need 20 sequenced questions to uncover my customers' real pain points and needs." },
    { artifactType: ARTIFACT_TYPES.PMF_SURVEY, title: "PMF Survey Kit",               description: "Sean Ellis test + custom questions ready to deploy",                                   starterPrompt: "Build me a PMF survey kit — I want to run the Sean Ellis test plus additional questions to measure product-market fit." },
    { artifactType: ARTIFACT_TYPES.PMF_SURVEY, title: "Experiment Tracker",           description: "Hypothesis → test → metric → success criteria for your top bets",                    starterPrompt: "Create an experiment tracker — let's define hypotheses, tests, metrics, and success criteria for my top product bets." },
  ],
  atlas: [
    { artifactType: ARTIFACT_TYPES.COMPETITIVE_MATRIX, title: "Competitive Matrix",    description: "Feature-by-feature comparison across your top 3-5 competitors",                      starterPrompt: "Build a competitive matrix — let's map features across my top competitors and show where I win." },
    { artifactType: ARTIFACT_TYPES.COMPETITIVE_MATRIX, title: "Battle Cards",           description: "1-pager per competitor — strengths, weaknesses, how to sell against them",           starterPrompt: "Create battle cards for my competitors — I need a one-pager for each competitor showing their strengths, weaknesses, and how to win against them." },
    { artifactType: ARTIFACT_TYPES.COMPETITIVE_MATRIX, title: "SWOT Analysis",          description: "Your company's strengths, weaknesses, opportunities, and threats",                   starterPrompt: "Do a SWOT analysis for my company — let's identify our strengths, weaknesses, opportunities, and threats." },
  ],
  sage: [
    { artifactType: ARTIFACT_TYPES.STRATEGIC_PLAN, title: "1-Page Strategic Plan",    description: "Vision, 3 big bets, milestones, and risks on one page",                               starterPrompt: "Build my 1-page strategic plan — I need my vision, 3 biggest strategic bets, milestones, and key risks." },
    { artifactType: ARTIFACT_TYPES.STRATEGIC_PLAN, title: "Quarterly OKRs",            description: "3-5 objectives with measurable key results for this quarter",                         starterPrompt: "Generate my quarterly OKRs — I need 3-5 objectives with measurable key results for this quarter." },
    { artifactType: ARTIFACT_TYPES.STRATEGIC_PLAN, title: "Product Roadmap",           description: "Now / Next / Later — aligned with your fundraising milestones",                       starterPrompt: "Create a product roadmap — I need a Now/Next/Later roadmap that aligns with my business milestones." },
  ],
};

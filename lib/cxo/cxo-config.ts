/**
 * lib/cxo/cxo-config.ts
 *
 * Per-CXO UI configuration derived from the master agent registry.
 * Reads lib/edgealpha.config.ts and features/agents/data/agents.ts — never modifies them.
 */

import { AGENTS, ACTIONS } from '@/lib/edgealpha.config';
import type { ActionType } from '@/lib/edgealpha.config';
import type { AgentId } from '@/lib/constants/agent-ids';
import { agents as DISPLAY_AGENTS } from '@/features/agents/data/agents';
import { ARTIFACT_META } from '@/features/agents/shared/constants/artifact-meta';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CXODeliverable {
  artifactType: string;
  label: string;
  prerequisite?: string;
  dimensionBoost: number;
}

export interface CXOQuickAction {
  id: string;
  label: string;
  actionId: string;
  actionType: ActionType;
  requires?: string;
  needsConfirmation: boolean;
}

export interface CXOConnectedSource {
  agentId: string;
  label: string;
  relevance: 'high' | 'medium';
}

export interface CXOResource {
  title: string;
  source: string;
  url: string;
}

export interface CXOConfig {
  agentId: string;
  role: string;
  name: string;
  colour: string;
  primaryDimension: 'market' | 'product' | 'goToMarket' | 'financial' | 'team' | 'traction';
  deliverables: CXODeliverable[];
  quickActions: CXOQuickAction[];
  connectedSources: CXOConnectedSource[];
  resources: CXOResource[];
  maxScoreContribution: number;
}

// ─── Static lookups ───────────────────────────────────────────────────────────

/** Per-artifact Q-Score boost points (mirrors ARTIFACT_BOOST in agent-signal.ts). */
const ARTIFACT_BOOST_PTS: Record<string, number> = {
  icp_document:        5,
  outreach_sequence:   4,
  battle_card:         4,
  gtm_playbook:        6,
  sales_script:        4,
  brand_messaging:     4,
  financial_summary:   6,
  legal_checklist:     3,
  hiring_plan:         5,
  pmf_survey:          5,
  interview_notes:     3,
  competitive_matrix:  5,
  strategic_plan:      4,
};

/** Primary Q-Score dimension each agent most influences. */
const AGENT_PRIMARY_DIMENSION: Record<AgentId, CXOConfig['primaryDimension']> = {
  patel:  'goToMarket',
  susi:   'traction',
  maya:   'product',
  felix:  'financial',
  leo:    'team',
  harper: 'team',
  nova:   'product',
  atlas:  'market',
  sage:   'market',
  carter: 'traction',
  riley:  'goToMarket',
};

/** Hex accent colour per agent (matches existing cxo/page.tsx palette). */
const AGENT_COLOURS: Record<AgentId, string> = {
  patel:  '#2563EB',
  susi:   '#16A34A',
  maya:   '#9333EA',
  felix:  '#D97706',
  leo:    '#DC2626',
  harper: '#0891B2',
  nova:   '#DB2777',
  atlas:  '#059669',
  sage:   '#7C3AED',
  carter: '#EC4899',
  riley:  '#F59E0B',
};

/** Human-readable label per action ID. */
const ACTION_LABELS: Record<string, string> = {
  deploy_landing_page:        'Deploy Landing Page',
  send_investor_update:       'Send Investor Update',
  screen_resume:              'Screen Resumes',
  generate_nda:               'Generate NDA',
  blog_post:                  'Generate Blog Post',
  host_survey:                'Host PMF Survey',
  track_competitor:           'Track Competitors',
  lead_enrich:                'Enrich Leads',
  web_research:               'Run Web Research',
  fetch_stripe_metrics:       'Connect Stripe Metrics',
  gmail_compose:              'Send via Gmail',
  wellfound_post:             'Post on Wellfound',
  clerky_start:               'Start on Clerky',
  stripe_atlas:               'Start on Stripe Atlas',
  linear_export:              'Export OKRs to Linear',
  google_alert:               'Set Google Alerts',
  download_social_templates:  'Download Social Templates',
  download_survey_html:       'Download Survey HTML',
  download_csv:               'Export Financial CSV',
  create_deal:                'Create Deal',
};

/** Curated learning resources per agent (no existing data source; static). */
const AGENT_RESOURCES: Record<AgentId, CXOResource[]> = {
  patel: [
    { title: 'Bessemer ICP Model',         source: 'Bessemer Venture Partners', url: 'https://www.bvp.com/atlas/scaling-to-100m' },
    { title: 'Six GTM Strategies',          source: 'Boston Consulting Group',   url: 'https://www.bcg.com/publications/2021/go-to-market-strategies' },
    { title: 'The Focused Company',         source: 'Harvard Business Review',   url: 'https://hbr.org/2010/04/the-age-of-hyperspecialization' },
  ],
  susi: [
    { title: 'Sandler Selling System',      source: 'Sandler Training',          url: 'https://www.sandler.com/blog/the-sandler-selling-system' },
    { title: 'MEDDIC Qualification',        source: 'MEDDIC Academy',            url: 'https://meddic.com' },
    { title: 'Predictable Revenue',         source: 'Aaron Ross',                url: 'https://predictablerevenue.com' },
  ],
  maya: [
    { title: 'Building a StoryBrand',       source: 'Donald Miller',             url: 'https://storybrand.com' },
    { title: 'Obviously Awesome',           source: 'April Dunford',             url: 'https://www.aprildunford.com/obviously-awesome' },
    { title: 'Content Strategy Guide',      source: 'Harvard Business Review',   url: 'https://hbr.org/2021/07/content-marketing-strategy' },
  ],
  felix: [
    { title: 'SaaS Metrics That Matter',    source: 'Christoph Janz',            url: 'https://christophjanz.blogspot.com/2013/04/a-kpi-dashboard-for-early-stage-saas.html' },
    { title: 'State of the Cloud',          source: 'Bessemer Venture Partners', url: 'https://www.bvp.com/atlas/state-of-the-cloud' },
    { title: 'Default Alive Calculator',    source: 'Y Combinator',              url: 'https://www.ycombinator.com/library/Gv-is-your-startup-default-alive-or-default-dead' },
  ],
  leo: [
    { title: 'YC Legal Documents',          source: 'Y Combinator',              url: 'https://www.ycombinator.com/documents' },
    { title: 'SAFE Note Primer',            source: 'Y Combinator',              url: 'https://www.ycombinator.com/documents#safe' },
    { title: 'NVCA Model Documents',        source: 'NVCA',                      url: 'https://nvca.org/model-legal-documents' },
  ],
  harper: [
    { title: 'Stripe Hiring Playbook',      source: 'Stripe',                    url: 'https://stripe.com/jobs' },
    { title: 'Talent at Early Stage',       source: 'First Round Review',        url: 'https://review.firstround.com/talent' },
    { title: 'Compensation Data',           source: 'Levels.fyi',                url: 'https://www.levels.fyi' },
  ],
  nova: [
    { title: 'Sean Ellis PMF Test',         source: 'Sean Ellis',                url: 'https://www.seanellis.me/product-market-fit' },
    { title: 'Jobs-to-be-Done Framework',   source: 'JTBD Theory',               url: 'https://jtbd.info' },
    { title: 'Continuous Discovery Habits', source: 'Teresa Torres',             url: 'https://www.producttalk.org/2021/08/product-discovery' },
  ],
  atlas: [
    { title: "Porter's Five Forces",        source: 'Harvard Business Review',   url: 'https://hbr.org/2008/01/the-five-competitive-forces-that-shape-strategy' },
    { title: 'Blue Ocean Strategy',         source: 'Kim & Mauborgne',           url: 'https://www.blueoceanstrategy.com' },
    { title: 'Positioning',                 source: 'April Dunford',             url: 'https://www.aprildunford.com/obviously-awesome' },
  ],
  sage: [
    { title: 'Good Strategy Bad Strategy',  source: 'Richard Rumelt',            url: 'https://www.amazon.com/dp/0307886239' },
    { title: '7 Powers',                    source: 'Hamilton Helmer',           url: 'https://www.amazon.com/dp/0998116319' },
    { title: 'Zero to One',                 source: 'Peter Thiel',               url: 'https://www.amazon.com/dp/0804139296' },
  ],
  carter: [
    { title: 'The Customer Success Economy', source: 'Nick Mehta',              url: 'https://www.amazon.com/dp/1119572819' },
    { title: 'NPS Primer',                   source: 'Bain & Company',           url: 'https://www.netpromoter.com/know' },
    { title: 'Expansion Revenue Playbook',   source: 'OpenView Partners',        url: 'https://openviewpartners.com/blog/expansion-revenue' },
  ],
  riley: [
    { title: 'Hacking Growth',              source: 'Sean Ellis',                url: 'https://www.amazon.com/dp/0385347421' },
    { title: 'Reforge Growth Series',        source: 'Reforge',                  url: 'https://www.reforge.com/growth-series' },
    { title: 'Andrew Chen on Growth',        source: 'Andrew Chen',              url: 'https://andrewchen.com' },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getArtifactLabel(type: string): string {
  const meta = (ARTIFACT_META as Record<string, { label: string } | undefined>)[type];
  if (meta) return meta.label;
  return type
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const ACTION_MAP = new Map(ACTIONS.map(a => [a.id, a]));
const DISPLAY_MAP = new Map(DISPLAY_AGENTS.map(a => [a.id, a]));

// ─── Build CXO_CONFIGS ────────────────────────────────────────────────────────

function buildConfigs(): Record<string, CXOConfig> {
  const result: Record<string, CXOConfig> = {};

  for (const agent of AGENTS) {
    const display = DISPLAY_MAP.get(agent.id);
    const role    = display ? `${display.cxoTitle} — ${display.specialty}` : agent.name;
    const name    = display?.name ?? agent.name;
    const colour  = AGENT_COLOURS[agent.id as AgentId] ?? '#2563EB';

    // Deliverables: each artifact type this agent owns
    const deliverables: CXODeliverable[] = agent.tools.map(artifactType => ({
      artifactType,
      label:        getArtifactLabel(artifactType),
      dimensionBoost: ARTIFACT_BOOST_PTS[artifactType] ?? 0,
    }));

    // Quick actions: each action this agent can trigger
    const quickActions: CXOQuickAction[] = agent.actions.reduce<CXOQuickAction[]>((acc, actionId) => {
      const action = ACTION_MAP.get(actionId);
      if (!action) return acc;
      acc.push({
        id:               actionId,
        label:            ACTION_LABELS[actionId] ?? actionId.replace(/_/g, ' '),
        actionId,
        actionType:       action.type,
        requires:         action.requires?.[0],
        needsConfirmation: action.confirmation,
      });
      return acc;
    }, []);

    // Connected sources: other agents whose artifacts give this agent context
    const connectedSources: CXOConnectedSource[] = [
      ...agent.highRelevanceAgents.map(id => ({
        agentId:   id,
        label:     (() => { const d = DISPLAY_MAP.get(id); return d ? `${d.cxoTitle} — ${d.name}` : id; })(),
        relevance: 'high' as const,
      })),
      ...agent.mediumRelevanceAgents.map(id => ({
        agentId:   id,
        label:     (() => { const d = DISPLAY_MAP.get(id); return d ? `${d.cxoTitle} — ${d.name}` : id; })(),
        relevance: 'medium' as const,
      })),
    ];

    // Max score contribution: sum of all qscoreBoost values for this agent
    const maxScoreContribution = Object.values(agent.qscoreBoosts).reduce<number>(
      (sum, pts) => sum + (pts ?? 0), 0
    );

    result[agent.id] = {
      agentId: agent.id,
      role,
      name,
      colour,
      primaryDimension: AGENT_PRIMARY_DIMENSION[agent.id as AgentId] ?? 'market',
      deliverables,
      quickActions,
      connectedSources,
      resources: AGENT_RESOURCES[agent.id as AgentId] ?? [],
      maxScoreContribution,
    };
  }

  return result;
}

export const CXO_CONFIGS: Record<string, CXOConfig> = buildConfigs();

export function getCXOConfig(agentId: string): CXOConfig {
  const config = CXO_CONFIGS[agentId];
  if (!config) throw new Error(`Unknown CXO agent ID: "${agentId}"`);
  return config;
}

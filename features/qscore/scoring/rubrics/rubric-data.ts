/**
 * Structured Scoring Rubrics for Q-Score RAG Evaluation
 *
 * Each field has 4-tier criteria (poor/fair/good/excellent) that the LLM judge
 * uses as calibration benchmarks. Fields are grouped by dimension affinity for
 * batched scoring (2-3 LLM calls instead of cramming everything into one prompt).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RubricTier {
  label: 'poor' | 'fair' | 'good' | 'excellent';
  range: [number, number]; // e.g. [0, 30]
  criteria: string;        // What this tier looks like in a real answer
}

export interface FieldRubric {
  fieldName: string;
  dimension: string;       // Which Q-Score dimension this field feeds
  weight: number;          // Relative weight within the dimension (0-1)
  description: string;     // What this field measures
  tiers: RubricTier[];
}

export interface DimensionRubric {
  dimension: string;
  fields: FieldRubric[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch Assignments
// ─────────────────────────────────────────────────────────────────────────────

/** Batch A: Product-dimension fields */
export const BATCH_A_FIELDS = [
  'problemStory',
  'customerQuote',
  'customerSurprise',
  'failedBelief',
  'failedDiscovery',
] as const;

/** Batch B: GTM + Team fields */
export const BATCH_B_FIELDS = [
  'icpDescription',
  'messagingResults',
  'advantageExplanation',
] as const;

export type BatchAField = typeof BATCH_A_FIELDS[number];
export type BatchBField = typeof BATCH_B_FIELDS[number];

// ─────────────────────────────────────────────────────────────────────────────
// Rubric Data
// ─────────────────────────────────────────────────────────────────────────────

export const SCORING_RUBRICS: Record<string, DimensionRubric> = {
  product: {
    dimension: 'product',
    fields: [
      {
        fieldName: 'problemStory',
        dimension: 'product',
        weight: 0.25,
        description: 'Domain expertise and founder-market fit — how the founder discovered the problem',
        tiers: [
          {
            label: 'poor',
            range: [0, 30],
            criteria: 'Generic problem statement ("businesses need better tools"). No personal connection. Could describe any startup.',
          },
          {
            label: 'fair',
            range: [31, 60],
            criteria: 'Some personal context but vague ("I worked in healthcare and saw inefficiencies"). No specific incident or data point.',
          },
          {
            label: 'good',
            range: [61, 80],
            criteria: 'Clear personal experience with named industry/role. Describes a specific moment or pattern. Shows domain knowledge.',
          },
          {
            label: 'excellent',
            range: [81, 100],
            criteria: 'Vivid first-person narrative with named companies, dates, or metrics. Structural insight others would miss. Shows years of domain immersion.',
          },
        ],
      },
      {
        fieldName: 'customerQuote',
        dimension: 'product',
        weight: 0.2,
        description: 'Quality of customer evidence — direct quotes showing real pain',
        tiers: [
          {
            label: 'poor',
            range: [0, 30],
            criteria: 'No actual quote, or fabricated-sounding generic praise ("Great product!"). No attribution.',
          },
          {
            label: 'fair',
            range: [31, 60],
            criteria: 'Paraphrased feedback without direct quote marks. Some specificity but could be embellished.',
          },
          {
            label: 'good',
            range: [61, 80],
            criteria: 'Direct quote with role/title attribution. Describes a specific pain point or workflow.',
          },
          {
            label: 'excellent',
            range: [81, 100],
            criteria: 'Verbatim quote with named person, company, and context. Reveals emotional intensity or quantified pain ($X lost, Y hours wasted).',
          },
        ],
      },
      {
        fieldName: 'customerSurprise',
        dimension: 'product',
        weight: 0.2,
        description: 'Depth of customer learning — unexpected discoveries from customer conversations',
        tiers: [
          {
            label: 'poor',
            range: [0, 30],
            criteria: 'No surprise mentioned, or trivially obvious ("Customers want it faster"). Shows no real learning.',
          },
          {
            label: 'fair',
            range: [31, 60],
            criteria: 'Some learning but surface-level. Doesn\'t change product direction or strategy.',
          },
          {
            label: 'good',
            range: [61, 80],
            criteria: 'Genuine insight that shifted product thinking. Describes what changed as a result.',
          },
          {
            label: 'excellent',
            range: [81, 100],
            criteria: 'Counter-intuitive discovery with specific context. Led to measurable pivot or feature change. Shows intellectual humility.',
          },
        ],
      },
      {
        fieldName: 'failedBelief',
        dimension: 'product',
        weight: 0.2,
        description: 'Intellectual honesty — specific beliefs that were proven wrong',
        tiers: [
          {
            label: 'poor',
            range: [0, 30],
            criteria: 'No failed belief, or vague ("We thought it would be easier"). Defensive tone, no real admission.',
          },
          {
            label: 'fair',
            range: [31, 60],
            criteria: 'Acknowledges a mistake but keeps it abstract. No specifics on what they believed or why.',
          },
          {
            label: 'good',
            range: [61, 80],
            criteria: 'Specific belief stated clearly, with what proved it wrong. Shows reflection on the gap.',
          },
          {
            label: 'excellent',
            range: [81, 100],
            criteria: 'Precise original hypothesis, the evidence that disproved it, the reasoning error, and the corrected understanding. Shows growth.',
          },
        ],
      },
      {
        fieldName: 'failedDiscovery',
        dimension: 'product',
        weight: 0.15,
        description: 'What was learned from the failure — the actionable takeaway',
        tiers: [
          {
            label: 'poor',
            range: [0, 30],
            criteria: 'No real discovery. Platitudes ("We learned to listen to customers"). No concrete change.',
          },
          {
            label: 'fair',
            range: [31, 60],
            criteria: 'General lesson learned but not tied to specific product/strategy change.',
          },
          {
            label: 'good',
            range: [61, 80],
            criteria: 'Clear discovery tied to a specific change in product, pricing, or strategy.',
          },
          {
            label: 'excellent',
            range: [81, 100],
            criteria: 'Discovery led to measurable outcome (retention improved X%, churn dropped). Names the specific experiment that revealed it.',
          },
        ],
      },
    ],
  },

  gtm: {
    dimension: 'gtm',
    fields: [
      {
        fieldName: 'icpDescription',
        dimension: 'gtm',
        weight: 0.5,
        description: 'ICP clarity — how precisely the founder defines their ideal customer',
        tiers: [
          {
            label: 'poor',
            range: [0, 30],
            criteria: 'Vague demographics only ("SMBs in tech"). No role, pain trigger, or exclusion criteria.',
          },
          {
            label: 'fair',
            range: [31, 60],
            criteria: 'Names an industry and role but missing specifics like company size range, buying triggers, or disqualifiers.',
          },
          {
            label: 'good',
            range: [61, 80],
            criteria: 'Specific role + company size + industry + at least one buying trigger. Shows customer interview-derived specificity.',
          },
          {
            label: 'excellent',
            range: [81, 100],
            criteria: 'Full ICP: role, seniority, company size (e.g., 50-200 employees), industry vertical, specific pain trigger, budget range, exclusion criteria. Evidence it was validated through outreach.',
          },
        ],
      },
      {
        fieldName: 'messagingResults',
        dimension: 'gtm',
        weight: 0.5,
        description: 'Messaging test documentation — evidence of tested vs. untested messaging',
        tiers: [
          {
            label: 'poor',
            range: [0, 30],
            criteria: 'No testing mentioned. Single tagline with no data on performance.',
          },
          {
            label: 'fair',
            range: [31, 60],
            criteria: 'Mentions testing but no metrics. "We tried a few messages and one worked better."',
          },
          {
            label: 'good',
            range: [61, 80],
            criteria: 'Tested 2+ messages with comparative results. Names channels and approximate response rates.',
          },
          {
            label: 'excellent',
            range: [81, 100],
            criteria: 'A/B test data with sample sizes, open/reply rates, and winning variant specifics. Shows iterative improvement over multiple rounds.',
          },
        ],
      },
    ],
  },

  team: {
    dimension: 'team',
    fields: [
      {
        fieldName: 'advantageExplanation',
        dimension: 'team',
        weight: 1.0,
        description: 'Unfair advantage / moat articulation — why this team wins',
        tiers: [
          {
            label: 'poor',
            range: [0, 30],
            criteria: 'Generic claims ("We\'re passionate and hardworking"). No structural moat. Sounds like any team.',
          },
          {
            label: 'fair',
            range: [31, 60],
            criteria: 'Names a category of advantage (network, IP, domain) but doesn\'t substantiate it.',
          },
          {
            label: 'good',
            range: [61, 80],
            criteria: 'Specific advantage with evidence — named relationships, specific patent/tech, years of relevant experience with named companies.',
          },
          {
            label: 'excellent',
            range: [81, 100],
            criteria: 'Structural moat that\'s hard to replicate. Named key relationships/customers, proprietary data or tech with specifics, track record of execution with verifiable claims.',
          },
        ],
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Get all rubrics for a specific batch of field names */
export function getRubricsForFields(fieldNames: readonly string[]): FieldRubric[] {
  const allFields: FieldRubric[] = [];
  for (const dimRubric of Object.values(SCORING_RUBRICS)) {
    for (const field of dimRubric.fields) {
      if (fieldNames.includes(field.fieldName)) {
        allFields.push(field);
      }
    }
  }
  return allFields;
}

/** Format rubrics into a compact prompt string for the LLM */
export function formatRubricsForPrompt(rubrics: FieldRubric[]): string {
  return rubrics
    .map(r => {
      const tiers = r.tiers
        .map(t => `  ${t.range[0]}–${t.range[1]} (${t.label}): ${t.criteria}`)
        .join('\n');
      return `[${r.fieldName}] — ${r.description}\n${tiers}`;
    })
    .join('\n\n');
}

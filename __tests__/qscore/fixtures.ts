/**
 * Shared test fixtures for Q-Score tests.
 * Named clearly so it's obvious what scenario each fixture represents.
 */

import type { AssessmentData } from '@/features/qscore/types/qscore.types';
import type { SemanticEvaluation } from '@/features/qscore/rag/types';

// ─── Assessment Fixtures ─────────────────────────────────────────────────────

/** Completely empty — new user who hasn't filled anything in */
export const EMPTY_ASSESSMENT: AssessmentData = {
  problemStory: '',
  advantages: [],
  advantageExplanation: '',
  customerType: '',
  conversationDate: null,
  customerQuote: '',
  customerSurprise: '',
  customerCommitment: '',
  conversationCount: 0,
  customerList: [],
  failedBelief: '',
  failedReasoning: '',
  failedDiscovery: '',
  failedChange: '',
  tested: '',
  buildTime: 0,
  measurement: '',
  results: '',
  learned: '',
  changed: '',
  hardshipStory: '',
};

/** Partial — only problem story and a few conversations */
export const MINIMAL_ASSESSMENT: AssessmentData = {
  ...EMPTY_ASSESSMENT,
  problemStory: 'I worked at a logistics company and saw how much time was wasted on manual invoicing.',
  conversationCount: 5,
  customerQuote: 'It takes me 3 hours every week just to reconcile invoices.',
  buildTime: 14,
  failedBelief: 'We thought enterprise would buy quickly.',
};

/** Strong — well-filled with specific, credible data */
export const STRONG_ASSESSMENT: AssessmentData = {
  problemStory: 'As a logistics manager at DHL for 5 years, I spent 15+ hours per week manually reconciling carrier invoices across 6 portals. In Q3 2022, we missed a $200K billing error because of this fragmented process. I left DHL to solve this for the 50,000+ logistics managers facing the same problem.',
  advantages: ['industry_experience', 'network', 'technical'],
  advantageExplanation: 'I have a network of 200+ logistics managers from my time at DHL and FedEx. My co-founder built invoice automation at SAP for 8 years. We have 3 LOIs from former DHL colleagues and a pending patent on our reconciliation algorithm.',
  customerType: 'Logistics managers at mid-size freight companies (50–500 employees)',
  conversationDate: new Date('2024-01-15'),
  customerQuote: '"I was spending 20% of my week on this problem. Your tool cut it to 30 minutes." — VP Operations, Coyote Logistics',
  customerSurprise: 'We discovered customers cared more about the audit trail than the time savings. 8 out of 10 said compliance reporting was their #1 pain point, not efficiency.',
  customerCommitment: 'We have 3 paying customers at $12K ARR each, and 2 signed LOIs for enterprise contracts worth $180K combined. Paid us $500 each for early access last month.',
  conversationCount: 67,
  customerList: ['Coyote Logistics', 'Echo Global', 'Transplace'],
  failedBelief: 'We believed procurement managers were the right buyer. After 20 discovery calls, we learned that the VP of Operations owns the budget and feels the pain daily — procurement just blocks.',
  failedReasoning: 'We assumed the pain was universal across all company sizes. In reality, companies under 50 employees use QuickBooks and it works fine for them.',
  failedDiscovery: "We discovered that enterprises won't buy without SOC 2 compliance. We had to pause feature dev for 8 weeks to get certified — painful but necessary.",
  failedChange: 'We pivoted from targeting SMBs (<50 employees) to mid-market (50–500 employees). MRR grew 3x in the following quarter.',
  tested: 'Hypothesis: VP Operations will pay $12K/year to save 15 hours/week. Measured by willingness to pay at that price point.',
  buildTime: 7,
  measurement: 'Ran 5 trials with pilot customers over 30 days. Tracked hours saved per week and NPS score.',
  results: 'Average time saved: 12 hours/week. NPS: 67. All 5 pilots converted to paid.',
  learned: 'Customers want compliance reports as much as time savings. Added automated audit trail feature based on this.',
  changed: 'Repositioned from "save time" to "stay compliant" — this doubled our demo-to-close rate from 20% to 41%.',
  hardshipStory: 'Lost our first enterprise pilot (Geodis, $120K contract) because we didn\'t have SOC 2. Spent 8 weeks getting certified while payroll was tight. Rebuilt the sales pipeline from scratch afterward.',
  targetCustomers: 50000,
  conversionRate: 2.5,
  dailyActivity: 15000,
  lifetimeValue: 36000,
  costPerAcquisition: 8000,
  gtm: {
    icpDescription: 'VP of Operations at freight brokerage companies (50–500 employees, $10M–$200M revenue). Trigger: recently had a billing dispute or compliance audit. NOT a fit: companies with <20 employees or those already using enterprise TMS with built-in reconciliation.',
    channelsTried: ['cold-email', 'linkedin', 'warm-intro'],
    channelResults: [
      { channel: 'cold-email', spend: 0, conversions: 8, cac: 0 },
      { channel: 'linkedin', spend: 500, conversions: 12, cac: 42 },
      { channel: 'warm-intro', spend: 0, conversions: 3, cac: 0 },
    ],
    currentCAC: 4200,
    targetCAC: 5000,
    messagingTested: true,
    messagingResults: 'Tested "save 15 hours/week" vs "stay compliant automatically" on 200 cold emails each. Compliance angle had 6.2% reply rate vs 2.1% for time-saving angle. Switched all outreach to compliance framing.',
  },
  financial: {
    mrr: 3000,
    arr: 36000,
    monthlyBurn: 15000,
    runway: 18,
    cogs: 200,
    averageDealSize: 12000,
    projectedRevenue12mo: 180000,
    revenueAssumptions: 'Assuming 3 new customers/month at $12K ACV. Based on current 20% demo-to-close rate and 15 qualified demos/month. Burn stays flat until $50K MRR when we hire a second AE.',
  },
};

/** Bluff — inflated, AI-generated style, impossibly perfect metrics */
export const BLUFF_ASSESSMENT: AssessmentData = {
  problemStory: 'In today\'s fast-paced business environment, we are leveraging cutting-edge technology to deliver a paradigm shift in how enterprises holistically manage their workflow, creating a transformative solution that seamlessly integrates with existing systems.',
  advantages: ['first_mover'],
  advantageExplanation: 'Our world-class team is uniquely positioned to deliver a best-in-class, state-of-the-art, next-generation platform that unlocks the full potential of enterprise operations through disruptive innovation.',
  customerType: 'All businesses',
  conversationDate: null,
  customerQuote: 'This is the most revolutionary product we have ever seen. It will completely transform our operations.',
  customerSurprise: 'We were not surprised because we knew from the beginning that our solution was the ideal fit for this market.',
  customerCommitment: 'Thousands of companies are very interested in our product.',
  conversationCount: 200,
  customerList: [],
  failedBelief: 'Everything has gone perfectly according to plan.',
  failedReasoning: 'We have not needed to change direction.',
  failedDiscovery: 'Our initial hypotheses were all correct.',
  failedChange: 'No changes needed, we got it right from day one.',
  tested: 'We tested our approach and it worked perfectly.',
  buildTime: 7,
  measurement: 'Everything measured perfectly.',
  results: 'Perfect results across all metrics.',
  learned: 'We learned our product is exactly what the market needs.',
  changed: 'Nothing needed to change.',
  hardshipStory: 'We had no major hardships as our team is world-class.',
  // Suspiciously round numbers
  targetCustomers: 1000000,
  conversionRate: 15,    // Unrealistic (>10%)
  dailyActivity: 500000,
  lifetimeValue: 50000,
  costPerAcquisition: 100,  // LTV:CAC = 500:1 — impossible
};

/** Edge case — zero CAC (division protection) */
export const ZERO_CAC_ASSESSMENT: AssessmentData = {
  ...MINIMAL_ASSESSMENT,
  targetCustomers: 10000,
  lifetimeValue: 5000,
  conversionRate: 3,
  dailyActivity: 3000,
  costPerAcquisition: 0,  // CAC = 0 should not produce Infinity LTV:CAC
};

/** Edge case — negative financial values */
export const NEGATIVE_FINANCIALS: AssessmentData = {
  ...MINIMAL_ASSESSMENT,
  financial: {
    mrr: -100,         // Refunds > revenue
    monthlyBurn: -500, // Invalid (negative burn)
    runway: -2,        // Invalid
    cogs: -200,        // Invalid
    averageDealSize: 1000,
    projectedRevenue12mo: 50000,
    revenueAssumptions: 'Some assumptions here.',
  },
};

/** Edge case — extremely large numbers */
export const ASTRONOMICAL_NUMBERS: AssessmentData = {
  ...MINIMAL_ASSESSMENT,
  targetCustomers: 8_000_000_000, // entire world population
  lifetimeValue: 1_000_000,
  conversionRate: 50,
  costPerAcquisition: 1,
  financial: {
    mrr: 999_999_999,
    monthlyBurn: 1,
    runway: 9999,
    arr: 11_999_999_988,
    cogs: 0,
    averageDealSize: 1_000_000,
    projectedRevenue12mo: 999_999_999_999,
    revenueAssumptions: 'We will capture the entire global market.',
  },
};

/** Edge case — only GTM data, nothing else */
export const GTM_ONLY_ASSESSMENT: AssessmentData = {
  ...EMPTY_ASSESSMENT,
  gtm: {
    icpDescription: 'Series B+ B2B SaaS companies, Head of Revenue Operations, recently hired new CRO. NOT a fit: companies with <20 person sales teams.',
    channelsTried: ['cold-email', 'linkedin', 'content'],
    channelResults: [{ channel: 'cold-email', conversions: 5 }],
    currentCAC: 3000,
    targetCAC: 4000,
    messagingTested: true,
    messagingResults: 'Tested pain vs outcome framing. Pain had 5% CTR vs 2% for outcome.',
  },
};

// ─── Semantic Evaluation Fixtures ────────────────────────────────────────────

/** High quality semantic eval — all fields scored 90 */
export const HIGH_QUALITY_SEMANTIC: SemanticEvaluation = {
  answerQuality: {
    problemStory: 90,
    advantageExplanation: 88,
    customerQuote: 85,
    customerSurprise: 82,
    failedBelief: 87,
    failedDiscovery: 91,
    icpDescription: 89,
    messagingResults: 86,
  },
  marketValidation: {
    tamRealistic: 'realistic',
    conversionRateRealistic: 'realistic',
    ltvCacRealistic: 'realistic',
    benchmarkContext: 'Strong B2B SaaS metrics.',
  },
  retrievedChunkIds: ['mkt-001', 'team-001'],
  evaluatedAt: new Date(),
  success: true,
};

/** Low quality semantic eval — all fields scored 20 */
export const LOW_QUALITY_SEMANTIC: SemanticEvaluation = {
  answerQuality: {
    problemStory: 20,
    advantageExplanation: 15,
    customerQuote: 10,
    customerSurprise: 12,
    failedBelief: 8,
    failedDiscovery: 11,
    icpDescription: 18,
    messagingResults: 14,
  },
  marketValidation: {
    tamRealistic: 'unrealistic',
    conversionRateRealistic: 'unrealistic',
    ltvCacRealistic: 'unrealistic',
    benchmarkContext: 'AI-generated style answers detected.',
  },
  retrievedChunkIds: [],
  evaluatedAt: new Date(),
  success: true,
};

/** NaN-poisoned semantic eval — should not corrupt scores */
export const NAN_SEMANTIC: SemanticEvaluation = {
  answerQuality: {
    problemStory: NaN,
    advantageExplanation: Infinity,
    customerQuote: -50,   // Below 0
    customerSurprise: 150, // Above 100
    failedBelief: NaN,
    failedDiscovery: NaN,
    icpDescription: NaN,
    messagingResults: undefined as unknown as number,
  },
  marketValidation: {
    tamRealistic: 'realistic',
    conversionRateRealistic: 'realistic',
    ltvCacRealistic: 'realistic',
    benchmarkContext: '',
  },
  retrievedChunkIds: [],
  evaluatedAt: new Date(),
  success: false,
  errorMessage: 'Test fixture with invalid values',
};

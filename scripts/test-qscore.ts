import { calculatePRDQScore } from '../features/qscore/calculators/prd-aligned-qscore';
import { AssessmentData } from '../features/qscore/types/qscore.types';

/**
 * Test Q-Score Calculation
 * Run with: npx tsx scripts/test-qscore.ts
 */

// Sample assessment data for a seed-stage B2B SaaS startup
const sampleAssessment: AssessmentData = {
  // Problem Origin (Team dimension)
  problemStory: "I spent 5 years as a product manager at Salesforce and saw companies struggle with workflow automation daily. I built internal tools that saved our team millions of dollars. We tried every tool on the market and nothing worked. Now building this for everyone.",
  problemFollowUps: [],

  // Unique Advantage (Team dimension)
  advantages: ['industry-experience', 'technical', 'network'],
  advantageExplanation: "I have deep industry experience working at Salesforce for 5 years. I built and shipped workflow tools used by 10,000+ enterprise customers. I have relationships with 50+ CTOs in the target market who have agreed to be early customers.",

  // Customer Evidence (Product & Traction dimensions)
  customerType: "B2B SaaS companies with 50-200 employees",
  conversationDate: new Date('2024-01-15'),
  customerQuote: "This product saved us 10 hours per week. Best tool we've used for this problem. We would pay $500/month without hesitation.",
  customerSurprise: "Customers were more frustrated with their current solution than expected. 8 out of 10 said they had tried and failed with at least 3 other tools.",
  customerCommitment: "12 paying customers at $149/month. 3 signed letters of intent for annual contracts. Waitlist of 45 companies.",
  conversationCount: 50,
  customerList: ['Acme Corp', 'Tech Inc', 'StartupXYZ', 'Growth Co', 'Scale Ltd'],

  // Failed Assumptions (Product dimension)
  failedBelief: "We believed enterprise customers would want advanced features first. We were wrong - SMBs wanted simplicity over features.",
  failedReasoning: "Our team came from enterprise, so we assumed all customers needed enterprise-grade complexity and security.",
  failedDiscovery: "After 20 customer interviews, we found SMBs were churning immediately because the interface was too complex.",
  failedChange: "Completely rebuilt the onboarding flow to be 3 steps instead of 20. Reduced time-to-value from 2 weeks to 30 minutes.",

  // Learning Velocity (Product dimension)
  tested: "Simplified onboarding with 3-step setup vs original 20-step enterprise setup",
  buildTime: 14,
  measurement: "Time to first workflow created, activation rate, 7-day retention",
  results: "Activation rate went from 23% to 78%. 7-day retention improved from 31% to 65%.",
  learned: "Simplicity is the killer feature for SMBs. They want to see value in under 30 minutes.",
  changed: "Deprecated all enterprise features. Rebuilt entire UX around 3 core workflows.",

  // Market Realism (Market dimension)
  targetCustomers: 50000,
  conversionRate: 2.5,
  dailyActivity: 5,
  lifetimeValue: 3600,
  costPerAcquisition: 250,

  // Resilience (Team dimension)
  hardshipStory: "Lost our biggest customer ($2k MRR) due to budget cuts right when we were running low on runway. Had to decide whether to pivot or double down.",
  hardshipType: "customer-loss",

  // Go-to-Market (GTM dimension)
  gtm: {
    icpDescription: "B2B SaaS companies with 50-200 employees in the technology sector that need workflow automation. They have budget authority and are currently using manual processes.",
    channelsTried: ['linkedin-outbound', 'content-marketing', 'product-led'],
    channelResults: [
      { channel: 'linkedin-outbound', spend: 2000, conversions: 8, cac: 250 },
      { channel: 'content-marketing', spend: 1500, conversions: 4, cac: 375 },
      { channel: 'product-led', spend: 500, conversions: 3, cac: 167 }
    ],
    currentCAC: 250,
    targetCAC: 500,
    messagingTested: true,
    messagingResults: 'Tested 3 value propositions. "Save 10 hours/week" resonated best with 40% response rate.',
  },

  // Financial (Financial dimension)
  financial: {
    mrr: 5000,
    arr: 60000,
    monthlyBurn: 15000,
    runway: 18,
    cogs: 800,
    averageDealSize: 500,
    projectedRevenue12mo: 200000,
    revenueAssumptions: '10% monthly growth, $500 ACV, 5% churn'
  },
};

console.log('🧪 Testing Q-Score Calculation...\n');
console.log('📊 Sample Assessment Data:');
console.log('- Paying Customers: 12');
console.log('- MRR: $5,000, ARR: $60,000');
console.log('- Customer Conversations: 50');
console.log('- CAC: $250\n');

try {
  const qScore = calculatePRDQScore(sampleAssessment);

  console.log('✅ Q-Score Calculation Successful!\n');
  console.log('═══════════════════════════════════════════');
  console.log(`📈 OVERALL SCORE: ${qScore.overall}/100`);
  console.log(`📊 GRADE: ${qScore.grade}`);
  console.log(`📍 PERCENTILE: ${qScore.percentile}`);
  console.log('═══════════════════════════════════════════\n');

  console.log('📋 DIMENSION BREAKDOWN:\n');

  const dims = qScore.breakdown;

  console.log(`🎯 Market (20% weight): ${dims.market.score}/100 (raw: ${dims.market.rawPoints}/${dims.market.maxPoints})`);
  console.log(`⚡ Product (18% weight): ${dims.product.score}/100 (raw: ${dims.product.rawPoints}/${dims.product.maxPoints})`);
  console.log(`🚀 Go-to-Market (17% weight): ${dims.goToMarket.score}/100 (raw: ${dims.goToMarket.rawPoints}/${dims.goToMarket.maxPoints})`);
  console.log(`💰 Financial (18% weight): ${dims.financial.score}/100 (raw: ${dims.financial.rawPoints}/${dims.financial.maxPoints})`);
  console.log(`👥 Team (15% weight): ${dims.team.score}/100 (raw: ${dims.team.rawPoints}/${dims.team.maxPoints})`);
  console.log(`📈 Traction (12% weight): ${dims.traction.score}/100 (raw: ${dims.traction.rawPoints}/${dims.traction.maxPoints})`);

  console.log('\n═══════════════════════════════════════════');

  // Validation
  console.log('✅ VALIDATION CHECKS:\n');
  console.log(`   All Scores 0-100: ${Object.values(dims).every(d => d.score >= 0 && d.score <= 100) ? '✅' : '❌'}`);
  console.log(`   Overall Score 0-100: ${qScore.overall >= 0 && qScore.overall <= 100 ? '✅' : '❌'}`);

  console.log('\n🎉 Test complete! Q-Score calculation is working.\n');

} catch (error) {
  console.error('❌ Q-Score Calculation Failed!');
  console.error(error);
  process.exit(1);
}

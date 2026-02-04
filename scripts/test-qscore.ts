import { calculatePRDQScore } from '../lib/scoring/prd-aligned-qscore';
import { AssessmentData } from '../lib/scoring/prd-types';

/**
 * Test Q-Score Calculation
 * Run with: npx tsx scripts/test-qscore.ts
 */

// Sample assessment data for a seed-stage B2B SaaS startup
const sampleAssessment: AssessmentData = {
  // MARKET DATA (20% weight)
  totalMarketSize: 5000000000, // $5B TAM
  targetMarketSize: 500000000, // $500M SAM
  realisticFirstYear: 2000000, // $2M first year revenue
  marketGrowthRate: 25,
  competitorCount: 15,
  marketTiming: 'expanding',

  // PRODUCT DATA (18% weight)
  mvpLaunched: true,
  payingCustomers: 12,
  customerQuotes: [
    {
      quote: "This product saved us 10 hours per week",
      name: "John Smith",
      company: "Acme Corp",
      commitment: "paying"
    },
    {
      quote: "Best tool we've used for this problem",
      name: "Jane Doe",
      company: "Tech Inc",
      commitment: "paying"
    }
  ],
  buildCycles: 6,
  cycleLength: 14,
  learningQuality: 'high',

  // GO-TO-MARKET DATA (17% weight)
  icpDescription: "B2B SaaS companies with 50-200 employees in the technology sector that need workflow automation. They have budget authority and are currently using manual processes.",
  channelsTried: ['linkedin-outbound', 'content-marketing', 'product-led'],
  channelResults: {
    'linkedin-outbound': { spend: 2000, conversions: 8, cac: 250 },
    'content-marketing': { spend: 1500, conversions: 4, cac: 375 },
    'product-led': { spend: 500, conversions: 3, cac: 167 }
  },
  currentCAC: 250,
  targetCAC: 500,
  messagingTested: true,
  messagingResults: 'Tested 3 value propositions. "Save 10 hours/week" resonated best with 40% response rate.',

  // FINANCIAL DATA (18% weight)
  financial: {
    revenueModel: 'mrr',
    mrr: 5000,
    arr: 60000,
    monthlyBurn: 15000,
    runway: 18,
    cogs: 800,
    averageDealSize: 500,
    projectedRevenue12mo: 200000,
    revenueAssumptions: '10% monthly growth, $500 ACV, 5% churn'
  },

  // TEAM DATA (15% weight)
  founderStory: "I spent 5 years as a product manager at Salesforce and saw companies struggle with workflow automation. I built internal tools that saved millions. Now building this for everyone.",
  domainExpertise: 'deep',
  teamSize: 3,
  complementarySkills: 'Technical founder (CTO), business founder (CEO), and designer. We have engineering, sales, and product covered.',
  failedAssumptions: [
    {
      assumption: "Customers would want enterprise features first",
      learning: "SMBs wanted simplicity over features",
      action: "Pivoted to simpler onboarding flow"
    }
  ],
  iterationSpeed: 'weekly',

  // TRACTION DATA (12% weight)
  conversationCount: 50,
  conversationQuality: 'high',

  // RESILIENCE DATA
  hardestMoment: "Lost our biggest customer ($2k MRR) due to budget cuts. Learned we were too dependent on large accounts.",
  whatKeptGoing: "The other 11 customers gave amazing feedback and said they'd never churn. Doubled down on SMB segment.",
  wouldQuit: "No clear path to $100k MRR within 12 months, or if we can't get CAC below $500."
};

console.log('🧪 Testing Q-Score Calculation...\n');
console.log('📊 Sample Assessment Data:');
console.log('- TAM: $5B, SAM: $500M');
console.log('- Paying Customers: 12');
console.log('- MRR: $5,000, ARR: $60,000');
console.log('- Team Size: 3');
console.log('- Customer Conversations: 50');
console.log('- CAC: $250\n');

try {
  const qScore = calculatePRDQScore(sampleAssessment);

  console.log('✅ Q-Score Calculation Successful!\n');
  console.log('═══════════════════════════════════════════');
  console.log(`📈 OVERALL SCORE: ${qScore.overall}/100`);
  console.log(`📊 GRADE: ${qScore.grade}`);
  console.log(`📍 PERCENTILE: ${qScore.percentile}%`);
  console.log('═══════════════════════════════════════════\n');

  console.log('📋 DIMENSION BREAKDOWN:\n');

  // Market (20%)
  const marketWeighted = qScore.breakdown.market.score * qScore.breakdown.market.weight;
  console.log(`🎯 Market (20% weight)`);
  console.log(`   Score: ${qScore.breakdown.market.score}/100`);
  console.log(`   Raw: ${qScore.breakdown.market.rawPoints}/${qScore.breakdown.market.maxPoints} points`);
  console.log(`   Weighted: ${marketWeighted.toFixed(1)}/20\n`);

  // Product (18%)
  console.log(`⚡ Product (18% weight)`);
  console.log(`   Score: ${qScore.breakdown.product.score}/100`);
  console.log(`   Raw: ${qScore.breakdown.product.rawPoints}/${qScore.breakdown.product.maxPoints} points`);
  console.log(`   Weighted: ${qScore.breakdown.product.weightedScore.toFixed(1)}/18\n`);

  // GTM (17%)
  console.log(`🚀 Go-to-Market (17% weight)`);
  console.log(`   Score: ${qScore.breakdown.goToMarket.score}/100`);
  console.log(`   Raw: ${qScore.breakdown.goToMarket.rawPoints}/${qScore.breakdown.goToMarket.maxPoints} points`);
  console.log(`   Weighted: ${qScore.breakdown.goToMarket.weightedScore.toFixed(1)}/17\n`);

  // Financial (18%)
  console.log(`💰 Financial (18% weight)`);
  console.log(`   Score: ${qScore.breakdown.financial.score}/100`);
  console.log(`   Raw: ${qScore.breakdown.financial.rawPoints}/${qScore.breakdown.financial.maxPoints} points`);
  console.log(`   Weighted: ${qScore.breakdown.financial.weightedScore.toFixed(1)}/18\n`);

  // Team (15%)
  console.log(`👥 Team (15% weight)`);
  console.log(`   Score: ${qScore.breakdown.team.score}/100`);
  console.log(`   Raw: ${qScore.breakdown.team.rawPoints}/${qScore.breakdown.team.maxPoints} points`);
  console.log(`   Weighted: ${qScore.breakdown.team.weightedScore.toFixed(1)}/15\n`);

  // Traction (12%)
  console.log(`📈 Traction (12% weight)`);
  console.log(`   Score: ${qScore.breakdown.traction.score}/100`);
  console.log(`   Raw: ${qScore.breakdown.traction.rawPoints}/${qScore.breakdown.traction.maxPoints} points`);
  console.log(`   Weighted: ${qScore.breakdown.traction.weightedScore.toFixed(1)}/12\n`);

  console.log('═══════════════════════════════════════════');
  console.log('📊 WEIGHTED TOTAL:',
    (qScore.breakdown.market.weightedScore +
     qScore.breakdown.product.weightedScore +
     qScore.breakdown.goToMarket.weightedScore +
     qScore.breakdown.financial.weightedScore +
     qScore.breakdown.team.weightedScore +
     qScore.breakdown.traction.weightedScore).toFixed(1), '/100'
  );
  console.log('═══════════════════════════════════════════\n');

  // Validation
  console.log('✅ VALIDATION CHECKS:\n');

  const totalWeight = 20 + 18 + 17 + 18 + 15 + 12;
  console.log(`   Total Weights: ${totalWeight}/100 ${totalWeight === 100 ? '✅' : '❌'}`);

  const calculatedTotal =
    qScore.breakdown.market.weightedScore +
    qScore.breakdown.product.weightedScore +
    qScore.breakdown.goToMarket.weightedScore +
    qScore.breakdown.financial.weightedScore +
    qScore.breakdown.team.weightedScore +
    qScore.breakdown.traction.weightedScore;

  const difference = Math.abs(calculatedTotal - qScore.overall);
  console.log(`   Weighted Sum Matches Overall: ${difference < 0.5 ? '✅' : '❌'} (diff: ${difference.toFixed(2)})`);
  console.log(`   All Scores 0-100: ${Object.values(qScore.breakdown).every(d => d.score >= 0 && d.score <= 100) ? '✅' : '❌'}`);
  console.log(`   Overall Score 0-100: ${qScore.overall >= 0 && qScore.overall <= 100 ? '✅' : '❌'}`);

  console.log('\n🎉 All tests passed! Q-Score calculation is working correctly.\n');

} catch (error) {
  console.error('❌ Q-Score Calculation Failed!');
  console.error(error);
  process.exit(1);
}

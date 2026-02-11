/**
 * Setup Mock Company Data for Testing
 *
 * INSTRUCTIONS:
 * 1. Open your app in the browser (http://localhost:3000)
 * 2. Open browser console (F12 or Cmd+Option+J)
 * 3. Copy and paste this entire file into the console
 * 4. Run: setupMockCompany()
 * 5. Reload the page
 */

// Mock Company: "TaskFlow" - B2B Project Management SaaS
const mockCompany = {
  // Founder Profile
  profile: {
    fullName: "Sarah Martinez",
    email: "sarah@taskflow.io",
    stage: "mvp",
    funding: "bootstrapped",
    timeCommitment: "full-time",
    startupName: "TaskFlow",
    industry: "B2B SaaS - Project Management",
    description: "TaskFlow helps remote teams coordinate complex projects without the chaos of endless meetings. We've built a smart project management tool that uses AI to automatically update stakeholders, predict bottlenecks, and suggest resource allocation."
  },

  // Full Assessment Data
  assessment: {
    // Section A: Founder-Problem Fit
    problemStory: "I spent 6 years as a Senior Product Manager at Atlassian working on Jira and Confluence. During that time, I watched thousands of teams struggle with the same problem: project management tools create more work than they solve. Every day, PMs spend 2-3 hours just updating status, chasing team members for updates, and writing progress reports. The breaking point came when I was managing a 40-person product launch. Despite using Jira, Slack, and Notion, I still had no real-time visibility into project health. I built an internal Python script that scraped our tools, analyzed patterns, and auto-generated status updates. It saved me 15 hours per week and predicted 3 major delays before they became crises. When I showed this to other PMs at Atlassian, 12 of them asked for a copy within a week. That's when I realized this wasn't just my problem - it was a $10B+ market opportunity. I quit my $250k/year job to build TaskFlow full-time.",

    problemFollowUps: [
      "Project managers spend 40% of their time on status updates instead of actual planning",
      "Most PM tools are built for developers, not for cross-functional coordination",
      "Remote work made async updates critical, but tools haven't adapted"
    ],

    advantages: [
      "6 years at Atlassian building PM tools",
      "Built internal tool used by 50+ PMs",
      "Deep network of 200+ PM contacts at tech companies"
    ],

    advantageExplanation: "My time at Atlassian gave me two unfair advantages: First, I understand exactly how PMs at high-growth companies work because I was one of them. I know their workflows, pain points, and buying criteria. Second, I have direct access to 200+ product managers at companies like Shopify, Stripe, and Notion. When I launched TaskFlow's beta, I got 30 sign-ups in the first week just from my network. Additionally, I built the MVP using the same tech stack as Atlassian's tools, which means I can move fast and handle enterprise scale from day one.",

    // Section B: Customer Understanding
    customerType: "Mid-Market B2B (50-500 employees)",
    conversationDate: new Date('2026-01-15'),
    customerQuote: "Before TaskFlow, I spent 3 hours every Monday updating executives on project status across 8 different tools. Now TaskFlow's AI does it automatically in 30 seconds. This is the first PM tool that actually saves me time instead of creating more work. We went from 40% project delays to 12% in 2 months.",
    customerSurprise: "The biggest surprise was that they cared more about auto-generated status updates than our fancy AI predictions. I thought the predictive analytics would be the killer feature, but customers kept telling me the status automation alone was worth the price.",
    customerCommitment: "paying",
    conversationCount: 83,
    customerList: [
      "Head of Product at Stripe (paying)",
      "VP Engineering at Shopify (paying)",
      "CPO at Notion (pilot)",
      "Product Lead at Figma (pilot)",
      "12 PMs from various Series B+ startups (paying)"
    ],

    // Failed Assumptions
    failedBelief: "I initially believed that product managers would want a complete all-in-one tool that replaced Jira, Slack, and their docs tool. I thought they were tired of tool sprawl and wanted consolidation.",
    failedReasoning: "This seemed logical because every PM I talked to complained about having too many tools. Plus, consolidation is a huge trend in SaaS right now.",
    failedDiscovery: "After building a prototype all-in-one tool and showing it to 20 PMs, 18 of them said they'd never switch their existing stack. They said: 'I don't want another tool trying to do everything poorly. I want a tool that does ONE thing exceptionally well and integrates with my existing stack.'",
    failedChange: "I pivoted to building TaskFlow as a layer on top of their existing tools. It integrates with Jira, Linear, Asana, Notion, and Slack - pulling data from all of them to auto-generate updates and insights. This changed our product strategy, our positioning, and even our sales pitch.",

    // Section C: Execution (Learning Velocity)
    tested: "In November 2025, I tested whether PMs would pay for AI-generated status updates. I built a simple Chrome extension that scraped Jira and Linear, generated a weekly summary using GPT-4, and emailed it to stakeholders. I sold this for $49/month to validate demand.",
    buildTime: 12,
    measurement: "Tracked: 1) Conversion rate (target: 20%), 2) Time saved per week (target: 5+ hours), 3) 30-day retention (target: 80%), 4) NPS (target: 50+)",
    results: "23% conversion rate, users reported saving 8.2 hours/week, 87% retention, NPS of 67.",
    learned: "PMs don't just want summaries - they want real-time intelligence. They'll pay premium prices ($200+/month) for tools that make them look good to executives. Slack integration is table-stakes.",
    changed: "Rebuilt to focus on real-time Slack notifications and added premium tier at $199/month with custom branding. This increased ACV from $49 to $149.",

    // Section D: Market Realism
    targetCustomers: 125000,
    talkToCount: 83,
    conversionRate: 8.5,
    avgContractValue: 1788,
    customerLifetimeMonths: 36,
    validationChecks: [
      "Surveyed 50 PMs: 76% said they'd pay $100+/month",
      "12 paying customers with $0 marketing spend",
      "Competitors raised $50M+ proving market size",
      "2,000+ reviews on G2 for $100+ PM tools"
    ],

    // Section E: Go-to-Market
    icpDescription: "Product Managers and Engineering Managers at fast-growing tech companies (Series B+) with 50-500 employees. They manage cross-functional teams, report to executives weekly, and use multiple PM tools. They have $2,000+ annual budget and authority to purchase under $5,000 without procurement.",

    channelsTried: ['linkedin-outbound', 'content-marketing', 'product-led'],
    channelResults: {
      'linkedin-outbound': { spend: 1200, conversions: 7, cac: 171 },
      'content-marketing': { spend: 800, conversions: 3, cac: 267 },
      'product-led': { spend: 400, conversions: 6, cac: 67 }
    },
    currentCAC: 134,
    targetCAC: 500,
    messagingTested: true,
    messagingResults: "Tested 3 value props: 'AI insights' (18%), 'Save 10 hrs/week' (61% ✅), 'Never miss deadlines' (31%). Winner: Time savings.",

    // Section F: Financial Health
    revenueModel: "mrr",
    mrr: 6250,
    arr: 75000,
    monthlyBurn: 18500,
    runway: 14,
    cogs: 42,
    averageDealSize: 149,
    projectedRevenue12mo: 480000,
    revenueAssumptions: "5 new customers/month, 5% churn, 10% upgrade to Pro, no enterprise until month 8, CAC under $200",
    previousMrr: 5100,

    // Section G: Resilience
    hardestMoment: "December 2025: OpenAI costs spiked from $300 to $2,100 due to bug. Same week, 2nd biggest customer churned after acquisition. $3,500 unexpected costs + $3,600 lost ARR. Runway dropped from 18mo to 14mo. Seriously considered shutting down.",
    quitScale: 7,
    whatKeptGoing: "11 customers sent unsolicited messages saying TaskFlow was the best tool ever. One offered to pay double. I remembered: I've lived this problem for 6 years. 100,000+ PMs need this. Fixed the bug, optimized costs, doubled down on customer success."
  }
};

// Setup function - exposed on window for browser console usage
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function setupMockCompany() {
  console.log('🚀 Setting up TaskFlow mock company data...\n');

  // Save founder profile
  localStorage.setItem('founderProfile', JSON.stringify(mockCompany.profile));
  console.log('✅ Founder profile saved');

  // Save assessment data
  localStorage.setItem('assessmentData', JSON.stringify(mockCompany.assessment));
  console.log('✅ Assessment data saved');

  // Calculate metrics
  const ltv = mockCompany.assessment.avgContractValue * (mockCompany.assessment.customerLifetimeMonths / 12);
  const ltvCacRatio = ltv / mockCompany.assessment.currentCAC;
  const customers = Math.round(mockCompany.assessment.mrr / mockCompany.assessment.averageDealSize);
  const mrrGrowth = ((mockCompany.assessment.mrr - mockCompany.assessment.previousMrr) / mockCompany.assessment.previousMrr) * 100;

  console.log('\n📊 TASKFLOW METRICS:\n');
  console.log(`💰 Financial:`);
  console.log(`   MRR: $${mockCompany.assessment.mrr.toLocaleString()}`);
  console.log(`   ARR: $${mockCompany.assessment.arr.toLocaleString()}`);
  console.log(`   Customers: ${customers}`);
  console.log(`   MoM Growth: ${mrrGrowth.toFixed(1)}%`);
  console.log(`   Burn: $${mockCompany.assessment.monthlyBurn.toLocaleString()}/mo`);
  console.log(`   Runway: ${mockCompany.assessment.runway} months\n`);

  console.log(`📈 Unit Economics:`);
  console.log(`   LTV: $${ltv.toLocaleString()}`);
  console.log(`   CAC: $${mockCompany.assessment.currentCAC}`);
  console.log(`   LTV:CAC: ${ltvCacRatio.toFixed(1)}:1 (🔥 Excellent! Target is 3:1)`);
  console.log(`   Gross Margin: 72%\n`);

  console.log(`🎯 Market:`);
  console.log(`   TAM: $224M`);
  console.log(`   Target: 125K product managers globally\n`);

  console.log(`✨ MOCK DATA LOADED!\n`);
  console.log(`📍 Next Steps:`);
  console.log(`   1. Reload the page (Cmd+R or F5)`);
  console.log(`   2. Visit /founder/agents/patel`);
  console.log(`   3. Ask: "Help me improve my ICP targeting"`);
  console.log(`   4. See how Patel references YOUR specific metrics!\n`);
  console.log(`🧪 Test Other Features:`);
  console.log(`   • /founder/dashboard - See Q-Score breakdown`);
  console.log(`   • /founder/agents/felix - Ask about financial modeling`);
  console.log(`   • /founder/improve-qscore - See personalized recommendations\n`);
}

// Clear function - exposed on window for browser console usage
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function clearMockData() {
  localStorage.removeItem('founderProfile');
  localStorage.removeItem('assessmentData');
  console.log('🗑️  Mock data cleared. Reload page to see changes.');
}

// Auto-run message
console.log('╔════════════════════════════════════════════╗');
console.log('║   📦 MOCK COMPANY DATA LOADER             ║');
console.log('╚════════════════════════════════════════════╝');
console.log('');
console.log('🚀 Ready to test Edge Alpha with realistic data!');
console.log('');
console.log('Commands:');
console.log('  setupMockCompany()  - Load TaskFlow data');
console.log('  clearMockData()     - Clear all data');
console.log('');
console.log('Run setupMockCompany() to begin! 👇');
console.log('');

/**
 * Setup Mock Company Data for Testing
 * Creates a realistic B2B SaaS startup profile and assessment data
 * Run this in browser console to populate localStorage
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
    problemStory: `I spent 6 years as a Senior Product Manager at Atlassian working on Jira and Confluence. During that time, I watched thousands of teams struggle with the same problem: project management tools create more work than they solve. Every day, PMs spend 2-3 hours just updating status, chasing team members for updates, and writing progress reports.

The breaking point came when I was managing a 40-person product launch. Despite using Jira, Slack, and Notion, I still had no real-time visibility into project health. I built an internal Python script that scraped our tools, analyzed patterns, and auto-generated status updates. It saved me 15 hours per week and predicted 3 major delays before they became crises.

When I showed this to other PMs at Atlassian, 12 of them asked for a copy within a week. That's when I realized this wasn't just my problem - it was a $10B+ market opportunity. I quit my $250k/year job to build TaskFlow full-time.`,

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

    advantageExplanation: `My time at Atlassian gave me two unfair advantages: First, I understand exactly how PMs at high-growth companies work because I was one of them. I know their workflows, pain points, and buying criteria. Second, I have direct access to 200+ product managers at companies like Shopify, Stripe, and Notion. When I launched TaskFlow's beta, I got 30 sign-ups in the first week just from my network.

Additionally, I built the MVP using the same tech stack as Atlassian's tools, which means I can move fast and handle enterprise scale from day one. Most competitors are building from scratch and learning these lessons the hard way.`,

    // Section B: Customer Understanding
    customerType: "Mid-Market B2B (50-500 employees)",
    conversationDate: new Date('2026-01-15'),
    customerQuote: `"Before TaskFlow, I spent 3 hours every Monday updating executives on project status across 8 different tools. Now TaskFlow's AI does it automatically in 30 seconds. This is the first PM tool that actually saves me time instead of creating more work. We went from 40% project delays to 12% in 2 months."`,
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
    failedChange: "I pivoted to building TaskFlow as a layer on top of their existing tools. It integrates with Jira, Linear, Asana, Notion, and Slack - pulling data from all of them to auto-generate updates and insights. This changed our product strategy, our positioning, and even our sales pitch. Now we're 'the intelligence layer for your PM stack' instead of 'another PM tool.'",

    // Section C: Execution (Learning Velocity)
    tested: "In November 2025, I tested whether PMs would pay for AI-generated status updates. I built a simple Chrome extension that scraped Jira and Linear, generated a weekly summary using GPT-4, and emailed it to stakeholders. I sold this for $49/month to validate demand before building the full product.",
    buildTime: 12, // days
    measurement: "I tracked: 1) Conversion rate from demo to paid (target: 20%), 2) Time saved per user per week (target: 5+ hours), 3) Retention after 30 days (target: 80%), 4) NPS score (target: 50+)",
    results: "23% conversion rate, users reported saving 8.2 hours/week on average, 87% retention after 30 days, NPS of 67. The biggest surprise was that users wanted more frequent updates (daily, not weekly), and they wanted Slack integration from day 1.",
    learned: "The core insight was that PMs don't just want summaries - they want real-time intelligence. They'll pay premium prices ($200+/month) for tools that make them look good to executives. Also learned that Slack integration is table-stakes, not a nice-to-have.",
    changed: "Based on this, I rebuilt the product to focus on real-time Slack notifications (not just email summaries) and added a premium tier at $199/month with custom branding for executive reports. This increased our ACV from $49 to $149.",

    // Section D: Market Realism
    targetCustomers: 125000, // 125K product managers at tech companies globally
    talkToCount: 83,
    conversionRate: 8.5, // 8.5% of PMs who see a demo become paying customers
    avgContractValue: 1788, // $149/month * 12 months
    customerLifetimeMonths: 36, // Average PM stays at a company 3 years
    validationChecks: [
      "Surveyed 50 PMs: 76% said they'd pay $100+/month for this",
      "12 paying customers with $0 spent on marketing (all word-of-mouth)",
      "3 competitors raised $50M+ (Notion, Linear, Height) proving market size",
      "G2 has 2,000+ reviews for project management tools with $100+ price points"
    ],

    // Section E: Go-to-Market
    icpDescription: "Product Managers and Engineering Managers at fast-growing tech companies (Series B+) with 50-500 employees. They manage cross-functional teams, report to executives weekly, and use multiple PM tools (Jira/Linear + Notion/Confluence + Slack). They have $2,000+ annual budget for productivity tools and authority to purchase software under $5,000 without procurement approval. They value time savings over cost and want to look competent to their executives.",

    channelsTried: ['linkedin-outbound', 'content-marketing', 'product-led'],
    channelResults: {
      'linkedin-outbound': { spend: 1200, conversions: 7, cac: 171 },
      'content-marketing': { spend: 800, conversions: 3, cac: 267 },
      'product-led': { spend: 400, conversions: 6, cac: 67 }
    },
    currentCAC: 134, // Blended across channels
    targetCAC: 500, // Target: LTV/CAC ratio of 3:1 (LTV ~$6,400, so CAC can be ~$2,000)
    messagingTested: true,
    messagingResults: "Tested 3 value propositions with 60 PMs:\n1. 'AI-powered project insights' - 18% interested\n2. 'Save 10 hours per week on status updates' - 61% interested ✅\n3. 'Never miss a project deadline again' - 31% interested\n\nWinner: Time savings message. PMs care more about personal productivity than team outcomes.",

    // Section F: Financial Health
    revenueModel: "mrr",
    mrr: 6250, // $149/month × 42 paying customers = $6,258 (rounded to $6,250)
    arr: 75000,
    monthlyBurn: 18500, // Salary ($12k) + AWS ($1.5k) + Tools ($2k) + Marketing ($3k)
    runway: 14, // $260k in bank / $18.5k burn = 14 months
    cogs: 42, // $1.5k AWS + $300 OpenAI / 42 customers = ~$43 per customer per month
    averageDealSize: 149,
    projectedRevenue12mo: 480000, // Conservative: 60 new customers × $149/mo × 12 + expansion = $480k
    revenueAssumptions: "Assumptions: 1) Add 5 net new customers per month (currently at 3/month), 2) 5% monthly churn (currently at 4%), 3) 10% of customers upgrade to Pro plan at $299/month by month 6, 4) No enterprise sales until month 8, 5) CAC stays under $200 with product-led growth",
    previousMrr: 5100, // Last month's MRR

    // Section G: Resilience
    hardestMoment: "In December 2025, our OpenAI API costs suddenly spiked from $300/month to $2,100/month due to a bug that was calling GPT-4 in a loop. The same week, our 2nd biggest customer ($299/month) churned because they got acquired and the new parent company mandated a different tool. I had $3,500 in unexpected costs and lost $3,600 in annual revenue in the same week. My runway dropped from 18 months to 14 months, and I seriously considered shutting down.",
    quitScale: 7, // 7/10 - was very close to quitting
    whatKeptGoing: "Two things kept me going: First, the remaining 11 paying customers sent me unsolicited messages saying TaskFlow was the best tool they'd ever used. One PM said 'Please don't shut down - I'd pay double if needed.' Second, I remembered why I started this: I've lived this problem for 6 years. I KNOW there are 100,000+ PMs who need this. One bad week doesn't invalidate the mission. I fixed the API bug, optimized costs, and doubled down on customer success to prevent more churn."
  }
};

// Calculate derived metrics
const calculateMetrics = (data: typeof mockCompany) => {
  const { assessment } = data;

  return {
    // Unit Economics
    ltv: assessment.avgContractValue * (assessment.customerLifetimeMonths / 12), // $1,788 × 3 years = $5,364
    ltvCacRatio: (assessment.avgContractValue * (assessment.customerLifetimeMonths / 12)) / assessment.currentCAC, // $5,364 / $134 = 40:1 (excellent!)
    paybackMonths: assessment.currentCAC / (assessment.averageDealSize - assessment.cogs), // $134 / ($149 - $42) = 1.25 months
    grossMargin: ((assessment.averageDealSize - assessment.cogs) / assessment.averageDealSize) * 100, // 72%

    // Growth Metrics
    mrrGrowth: ((assessment.mrr - (assessment.previousMrr || 0)) / (assessment.previousMrr || 1)) * 100, // 22.5% MoM growth
    customersCount: Math.round(assessment.mrr / assessment.averageDealSize), // 42 customers
    burnMultiple: assessment.monthlyBurn / (assessment.mrr - (assessment.previousMrr || 0)), // 16.1 (burn $18.5k to add $1,150 MRR)

    // Market Metrics
    tam: assessment.targetCustomers * assessment.avgContractValue, // $224M TAM
    samPercent: 30, // Assume 30% of PMs are at companies 50-500 employees
    som: (assessment.targetCustomers * 0.30 * assessment.avgContractValue * assessment.conversionRate / 100), // $5.7M SOM
  };
};

// Export functions for browser console
const setupMockCompany = () => {
  console.log('🚀 Setting up TaskFlow mock company data...\n');

  // Save founder profile
  localStorage.setItem('founderProfile', JSON.stringify(mockCompany.profile));
  console.log('✅ Founder profile saved');

  // Save assessment data
  localStorage.setItem('assessmentData', JSON.stringify(mockCompany.assessment));
  console.log('✅ Assessment data saved');

  // Calculate and display metrics
  const metrics = calculateMetrics(mockCompany);
  console.log('\n📊 CALCULATED METRICS:\n');
  console.log(`💰 Financial:`);
  console.log(`   MRR: $${mockCompany.assessment.mrr.toLocaleString()}`);
  console.log(`   ARR: $${mockCompany.assessment.arr.toLocaleString()}`);
  console.log(`   MoM Growth: ${metrics.mrrGrowth.toFixed(1)}%`);
  console.log(`   Customers: ${metrics.customersCount}`);
  console.log(`   Burn: $${mockCompany.assessment.monthlyBurn.toLocaleString()}/month`);
  console.log(`   Runway: ${mockCompany.assessment.runway} months\n`);

  console.log(`📈 Unit Economics:`);
  console.log(`   LTV: $${metrics.ltv.toLocaleString()}`);
  console.log(`   CAC: $${mockCompany.assessment.currentCAC}`);
  console.log(`   LTV:CAC: ${metrics.ltvCacRatio.toFixed(1)}:1 (target 3:1)`);
  console.log(`   Payback: ${metrics.paybackMonths.toFixed(1)} months`);
  console.log(`   Gross Margin: ${metrics.grossMargin.toFixed(0)}%\n`);

  console.log(`🎯 Market:`);
  console.log(`   TAM: $${(metrics.tam / 1000000).toFixed(0)}M`);
  console.log(`   SAM: $${(metrics.tam * 0.30 / 1000000).toFixed(0)}M (30% addressable)`);
  console.log(`   SOM: $${(metrics.som / 1000000).toFixed(1)}M (realistic first year)\n`);

  console.log(`✨ Ready to test!\n`);
  console.log(`Next steps:`);
  console.log(`1. Reload the page to see data in dashboard`);
  console.log(`2. Go to /founder/agents/patel and ask about GTM strategy`);
  console.log(`3. Check /founder/dashboard for Q-Score breakdown`);
  console.log(`4. Visit /founder/improve-qscore to see recommendations\n`);

  return {
    profile: mockCompany.profile,
    assessment: mockCompany.assessment,
    metrics
  };
};

// Clear existing data
const clearMockData = () => {
  localStorage.removeItem('founderProfile');
  localStorage.removeItem('assessmentData');
  console.log('🗑️  Mock data cleared');
};

// Browser-friendly exports
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).setupMockCompany = setupMockCompany;
  (window as unknown as Record<string, unknown>).clearMockData = clearMockData;
  (window as unknown as Record<string, unknown>).mockCompanyData = mockCompany;
  console.log('📦 Mock company utilities loaded!');
  console.log('   Run: setupMockCompany() to populate data');
  console.log('   Run: clearMockData() to remove data');
}

// For Node.js testing
export { mockCompany, setupMockCompany, clearMockData, calculateMetrics };

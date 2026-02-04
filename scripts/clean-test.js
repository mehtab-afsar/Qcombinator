/**
 * Clean Test Script
 * Clears all data and provides fresh testing environment
 *
 * USAGE:
 * 1. Open http://localhost:3000 in browser
 * 2. Open Console (Cmd+Option+J or F12)
 * 3. Paste this entire file
 * 4. Run: runCleanTest()
 */

// Clear all localStorage
function clearAll() {
  console.log('🧹 Clearing all localStorage data...');
  localStorage.clear();
  console.log('✅ All data cleared!\n');
}

// Load mock company data
function loadMockData() {
  console.log('📦 Loading TaskFlow mock company data...\n');

  const mockProfile = {
    fullName: "Sarah Martinez",
    email: "sarah@taskflow.io",
    stage: "mvp",
    funding: "bootstrapped",
    timeCommitment: "full-time",
    startupName: "TaskFlow",
    industry: "B2B SaaS - Project Management",
    description: "AI-powered project management intelligence layer that auto-generates status updates for remote teams."
  };

  const mockAssessment = {
    problemStory: "I spent 6 years as a Senior Product Manager at Atlassian working on Jira. PMs spend 2-3 hours daily on status updates. I built an internal Python script that automated this, saving 15 hours/week. When 12 other PMs asked for it, I knew this was a $10B+ market opportunity.",

    problemFollowUps: [
      "PMs spend 40% of time on status updates",
      "Tools are built for developers, not coordination",
      "Remote work made async updates critical"
    ],

    advantages: [
      "6 years at Atlassian building PM tools",
      "Built internal tool used by 50+ PMs",
      "Network of 200+ PM contacts"
    ],

    advantageExplanation: "Deep PM expertise from Atlassian, direct access to 200+ PMs at tech companies, and technical capability to handle enterprise scale from day one.",

    customerType: "Mid-Market B2B (50-500 employees)",
    conversationDate: new Date('2026-01-15'),
    customerQuote: "Before TaskFlow, I spent 3 hours every Monday updating executives. Now it's automatic in 30 seconds. We went from 40% project delays to 12% in 2 months.",
    customerSurprise: "They cared more about auto-generated status updates than AI predictions.",
    customerCommitment: "paying",
    conversationCount: 83,
    customerList: [
      "Head of Product at Stripe (paying)",
      "VP Engineering at Shopify (paying)",
      "CPO at Notion (pilot)",
      "12 PMs from Series B+ startups (paying)"
    ],

    failedBelief: "I thought PMs wanted an all-in-one tool to replace their entire stack.",
    failedDiscovery: "18 of 20 PMs said they'd never switch. They want ONE thing done exceptionally well with integrations.",
    failedChange: "Pivoted to being an intelligence layer on top of existing tools instead of replacement.",

    tested: "Built Chrome extension for $49/month to validate demand before full product.",
    buildTime: 12,
    measurement: "Tracked conversion (target 20%), time saved (target 5+ hrs), retention (target 80%), NPS (target 50+)",
    results: "23% conversion, 8.2 hrs/week saved, 87% retention, NPS 67",
    learned: "PMs want real-time intelligence, not summaries. They'll pay $200+/month to look good to executives.",
    changed: "Added real-time Slack notifications and premium tier at $199/month. Increased ACV from $49 to $149.",

    targetCustomers: 125000,
    talkToCount: 83,
    conversionRate: 8.5,
    avgContractValue: 1788,
    customerLifetimeMonths: 36,
    validationChecks: [
      "76% of 50 PMs would pay $100+/month",
      "12 paying customers, $0 marketing",
      "Competitors raised $50M+ proving market",
      "2,000+ G2 reviews for $100+ PM tools"
    ],

    icpDescription: "Product Managers at Series B+ tech companies (50-500 employees) managing cross-functional teams. They report to executives weekly, use multiple PM tools, have $2,000+ budget, and can purchase under $5,000 without procurement.",

    channelsTried: ['linkedin-outbound', 'content-marketing', 'product-led'],
    channelResults: {
      'linkedin-outbound': { spend: 1200, conversions: 7, cac: 171 },
      'content-marketing': { spend: 800, conversions: 3, cac: 267 },
      'product-led': { spend: 400, conversions: 6, cac: 67 }
    },
    currentCAC: 134,
    targetCAC: 500,
    messagingTested: true,
    messagingResults: "3 value props tested: 'Save 10 hrs/week' won with 61% interest vs 18% for 'AI insights'.",

    revenueModel: "mrr",
    mrr: 6250,
    arr: 75000,
    monthlyBurn: 18500,
    runway: 14,
    cogs: 42,
    averageDealSize: 149,
    projectedRevenue12mo: 480000,
    revenueAssumptions: "5 new customers/month, 5% churn, 10% upgrade to Pro, CAC under $200",
    previousMrr: 5100,

    hardestMoment: "OpenAI costs spiked from $300 to $2,100 due to bug. Same week, 2nd biggest customer churned. $3,500 unexpected costs + $3,600 lost ARR. Runway dropped to 14 months.",
    quitScale: 7,
    whatKeptGoing: "11 customers sent messages saying TaskFlow was the best tool ever. One offered to pay double. I've lived this problem for 6 years - 100,000+ PMs need this."
  };

  localStorage.setItem('founderProfile', JSON.stringify(mockProfile));
  localStorage.setItem('assessmentData', JSON.stringify(mockAssessment));

  console.log('✅ Mock data loaded!\n');
}

// Display test instructions
function showTestPlan() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║        🧪 CLEAN TEST PLAN - TASKFLOW             ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  console.log('📊 MOCK COMPANY LOADED:');
  console.log('   Company: TaskFlow');
  console.log('   Founder: Sarah Martinez (ex-Atlassian PM)');
  console.log('   Stage: MVP with paying customers');
  console.log('   MRR: $6,250 | Customers: 42 | Burn: $18,500/mo');
  console.log('   LTV:CAC: 40:1 🔥 | Runway: 14 months\n');

  console.log('🎯 TEST SEQUENCE:\n');

  console.log('TEST 1: Context-Aware Agents 🤖');
  console.log('   ➜ Go to: /founder/agents/patel');
  console.log('   ➜ Ask: "Help me improve my ICP targeting"');
  console.log('   ✅ Should mention: $6,250 MRR, 42 customers, CAC $67');
  console.log('   ✅ Should reference: Series B+ PM target\n');

  console.log('TEST 2: Financial Agent 💰');
  console.log('   ➜ Go to: /founder/agents/felix');
  console.log('   ➜ Ask: "Is my burn rate healthy?"');
  console.log('   ✅ Should mention: $18,500 burn, 14mo runway, 72% margin\n');

  console.log('TEST 3: Product Agent ⚡');
  console.log('   ➜ Go to: /founder/agents/nova');
  console.log('   ➜ Ask: "Do I have product-market fit?"');
  console.log('   ✅ Should mention: 87% retention, NPS 67, 8.2hrs saved\n');

  console.log('TEST 4: Cross-Agent Memory 🧠');
  console.log('   ➜ Chat with multiple agents');
  console.log('   ✅ Each should know: TaskFlow, your metrics, context\n');

  console.log('TEST 5: Dashboard 📈');
  console.log('   ➜ Go to: /founder/dashboard');
  console.log('   ✅ Should show: Q-Score breakdown, 6 dimensions\n');

  console.log('TEST 6: Improve Q-Score 🎯');
  console.log('   ➜ Go to: /founder/improve-qscore');
  console.log('   ✅ Should show: Personalized recommendations\n');

  console.log('═══════════════════════════════════════════════════\n');
  console.log('🚀 RELOAD PAGE NOW TO BEGIN TESTING!\n');
  console.log('Run clearAll() anytime to reset.\n');
}

// Main test runner
function runCleanTest() {
  clearAll();
  loadMockData();
  showTestPlan();

  console.log('⏰ Next step: RELOAD this page (Cmd+R or F5)');
  console.log('Then start with TEST 1! 👆\n');
}

// Quick verification
function verifyData() {
  const profile = localStorage.getItem('founderProfile');
  const assessment = localStorage.getItem('assessmentData');

  if (profile && assessment) {
    const p = JSON.parse(profile);
    const a = JSON.parse(assessment);

    console.log('✅ Data Verified:\n');
    console.log(`   Startup: ${p.startupName}`);
    console.log(`   Industry: ${p.industry}`);
    console.log(`   MRR: $${a.mrr?.toLocaleString() || 'N/A'}`);
    console.log(`   Customers: ${Math.round(a.mrr / a.averageDealSize) || 'N/A'}`);
    console.log(`   Burn: $${a.monthlyBurn?.toLocaleString() || 'N/A'}/mo`);
    console.log(`   Runway: ${a.runway || 'N/A'} months\n`);
    return true;
  } else {
    console.log('❌ No data found. Run: runCleanTest()');
    return false;
  }
}

// Export functions
window.clearAll = clearAll;
window.loadMockData = loadMockData;
window.runCleanTest = runCleanTest;
window.verifyData = verifyData;

// Auto-display help
console.log('\n╔═══════════════════════════════════════════════════╗');
console.log('║       🧪 CLEAN TEST UTILITIES LOADED             ║');
console.log('╚═══════════════════════════════════════════════════╝\n');
console.log('Commands:');
console.log('  runCleanTest()  - Clear all data & load fresh mock');
console.log('  verifyData()    - Check what data is loaded');
console.log('  clearAll()      - Remove all data\n');
console.log('👉 Start with: runCleanTest()\n');

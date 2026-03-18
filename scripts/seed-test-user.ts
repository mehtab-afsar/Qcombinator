/**
 * Seed script — creates mehtab@gmail.com test user with full company data
 * Run: npx tsx scripts/seed-test-user.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Company Data ────────────────────────────────────────────────────────────
const COMPANY = {
  name: "Nuvora",
  industry: "B2B SaaS",
  stage: "mvp" as const,
  problem:
    "Mid-market manufacturers lose an average of $2.3M per year due to blind spots in their multi-tier supplier network. They rely on spreadsheets and weekly email check-ins to track inventory — by the time a shortage is flagged, production has already halted.",
  solution:
    "Nuvora is a real-time supply chain visibility platform that connects directly to suppliers' ERPs and gives procurement teams a live dashboard of inventory levels, lead times, and risk scores across all tiers of their supply chain.",
  founder: "Mehtab Afsar",
  email: "mehtab@gmail.com",
  password: "Moon@123",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function uuid() {
  return crypto.randomUUID();
}

function pastDate(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🌱  Seeding test user for Edge Alpha...\n");

  // ── 1. Create auth user ────────────────────────────────────────────────────
  console.log("1/9  Creating auth user...");
  const { data: authData, error: authErr } =
    await supabase.auth.admin.createUser({
      email: COMPANY.email,
      password: COMPANY.password,
      email_confirm: true,
      user_metadata: { full_name: COMPANY.founder },
    });

  if (authErr && !authErr.message.includes("already")) {
    throw new Error(`Auth user creation failed: ${authErr.message}`);
  }

  // If user already exists, fetch them
  let userId: string;
  if (authErr?.message.includes("already")) {
    console.log("   ↳ User already exists — fetching existing user...");
    const { data: list } = await supabase.auth.admin.listUsers();
    const existing = list?.users.find((u) => u.email === COMPANY.email);
    if (!existing) throw new Error("User exists but cannot be fetched");
    userId = existing.id;
  } else {
    userId = authData!.user!.id;
  }
  console.log(`   ↳ User ID: ${userId}`);

  // ── 2. Founder profile ─────────────────────────────────────────────────────
  console.log("2/9  Creating founder profile...");
  const { error: profileErr } = await supabase
    .from("founder_profiles")
    .upsert(
      {
        user_id: userId,
        full_name: COMPANY.founder,
        startup_name: COMPANY.name,
        industry: COMPANY.industry,
        stage: COMPANY.stage,
        subscription_tier: "premium",
        onboarding_completed: true,
        assessment_completed: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  if (profileErr) console.warn("   ⚠ Profile:", profileErr.message);
  else console.log("   ↳ Profile saved");

  // ── 3. Q-Score history (3 rows — chain) ───────────────────────────────────
  console.log("3/9  Creating Q-Score history...");

  const scoreId1 = uuid();
  const scoreId2 = uuid();
  const scoreId3 = uuid();

  const assessmentData = {
    problemStory:
      "I spent 6 years as a supply chain consultant at McKinsey working with auto manufacturers. I watched a Tier-1 supplier to BMW miss a shipment because their Tier-2 supplier ran out of a $0.03 capacitor — a part nobody tracked. That single miss cost BMW €14M in halted production. I knew there had to be a better way.",
    advantages: [
      "6 years at McKinsey in supply chain practice",
      "Deep relationships with procurement heads at 40+ manufacturers",
      "Built and sold a supply chain analytics tool at my previous startup (acquired 2021)",
    ],
    advantageExplanation:
      "I have the domain depth, the network, and the prior exit. No VC-backed competitor has a founder who has actually sat inside procurement departments and understands the daily workflow.",
    customerQuote:
      "\"We had a $4M production halt in Q3 because nobody flagged that our Indonesian capacitor supplier had 3 days of stock left. If Nuvora had been live, we would have caught that 6 weeks earlier.\" — Head of Procurement, Tier-1 Auto Supplier",
    conversationCount: 87,
    customerCommitment: "paid",
    customerSurprise:
      "Customers don't actually want more dashboards — they want automated alerts that push to Slack and email so they never have to log in.",
    failedBelief:
      "I thought procurement teams would pay for visibility. They actually pay for risk prevention. The reframe changed our entire pricing model from per-seat to per-risk-event prevented.",
    hardshipStory:
      "Our first enterprise pilot, a $180K contract, pulled out 3 days before go-live when their CIO was replaced. We had 11 days of runway. I had to call every advisor I had and personally guarantee a bridging loan to make payroll. We came back with 2 new pilots within 6 weeks.",
    targetCustomers: 8500,
    conversionRate: 2.1,
    lifetimeValue: 85000,
    costPerAcquisition: 12000,
    icpDescription:
      "VP of Procurement or Head of Supply Chain at mid-market manufacturers (200–2000 employees, $50M–$500M revenue) in automotive, electronics, and industrial equipment sectors in DACH and Benelux regions who have experienced at least one production halt in the past 18 months.",
    channelsTried: ["LinkedIn outbound", "industry events (Hannover Messe)", "warm intros via McKinsey alumni network", "content marketing (supply chain risk whitepaper)"],
    currentCAC: 12000,
    mrr: 38000,
    monthlyBurn: 52000,
    runway: 14,
    buildTime: 8,
    tested: "ERP integration connectors, real-time alert threshold engine, risk scoring model",
    results: "Customers reduced unplanned production stoppages by 67% in first 90 days of use",
    learned: "API integrations with SAP and Oracle take 3x longer than expected due to enterprise IT approval cycles",
    changed: "Built a lightweight CSV import fallback so customers can get value on day 1 without waiting for IT",
  };

  // Row 1 — onboarding score
  await supabase.from("qscore_history").upsert({
    id: scoreId1,
    user_id: userId,
    overall_score: 41,
    market_score: 35,
    product_score: 48,
    gtm_score: 28,
    financial_score: 22,
    team_score: 72,
    traction_score: 38,
    percentile: 32,
    grade: "D",
    data_source: "onboarding",
    previous_score_id: null,
    assessment_data: assessmentData,
    calculated_at: pastDate(18),
  });

  // Row 2 — full assessment
  await supabase.from("qscore_history").upsert({
    id: scoreId2,
    user_id: userId,
    overall_score: 68,
    market_score: 72,
    product_score: 74,
    gtm_score: 65,
    financial_score: 58,
    team_score: 81,
    traction_score: 62,
    percentile: 61,
    grade: "C+",
    data_source: "assessment",
    previous_score_id: scoreId1,
    assessment_data: assessmentData,
    ai_actions: {
      actions: [
        {
          title: "Nail your SAM with bottom-up research",
          description: "Your TAM is strong but investors will drill on your SAM. Build a bottom-up model from LinkedIn company counts in DACH + Benelux.",
          dimension: "market",
          impact: "+6 points",
          agentId: "atlas",
          agentName: "Atlas",
          timeframe: "1 week",
          starterPrompt: "Help me build a bottom-up SAM model for supply chain visibility software in DACH and Benelux targeting manufacturers with 200–2000 employees.",
        },
        {
          title: "Document your ICP with a named-customer matrix",
          description: "Your ICP description is good but needs quantified attributes. Map your 6 paying customers to firmographic criteria.",
          dimension: "goToMarket",
          impact: "+5 points",
          agentId: "patel",
          agentName: "Patel",
          timeframe: "3 days",
          starterPrompt: "Help me define and document my ICP for Nuvora — B2B supply chain visibility SaaS for mid-market manufacturers.",
        },
        {
          title: "Build a 24-month financial model",
          description: "Your current ARR and runway are solid but you haven't documented projections. Investors need a model, not just a number.",
          dimension: "financial",
          impact: "+8 points",
          agentId: "felix",
          agentName: "Felix",
          timeframe: "1 week",
          starterPrompt: "Build me a 24-month financial model for Nuvora: €38K MRR, €52K burn, B2B SaaS, enterprise sales cycle 60–90 days.",
        },
      ],
    },
    calculated_at: pastDate(10),
  });

  // Row 3 — after artifact boost (GTM playbook)
  await supabase.from("qscore_history").upsert({
    id: scoreId3,
    user_id: userId,
    overall_score: 74,
    market_score: 72,
    product_score: 74,
    gtm_score: 71,
    financial_score: 64,
    team_score: 81,
    traction_score: 62,
    percentile: 67,
    grade: "C+",
    data_source: "agent_artifact",
    source_artifact_type: "gtm_playbook",
    previous_score_id: scoreId2,
    assessment_data: assessmentData,
    calculated_at: pastDate(3),
  });

  console.log("   ↳ 3 Q-Score rows saved (41 → 68 → 74)");

  // ── 4. Agent conversations + messages + artifacts ─────────────────────────
  console.log("4/9  Creating agent conversations...");

  const agents = [
    {
      agentId: "patel",
      title: "GTM Strategy for Nuvora",
      daysAgo: 9,
    },
    {
      agentId: "felix",
      title: "Financial Model & Runway Analysis",
      daysAgo: 7,
    },
    {
      agentId: "atlas",
      title: "Competitive Landscape — Supply Chain Visibility",
      daysAgo: 5,
    },
    {
      agentId: "harper",
      title: "Hiring Plan — Engineering & Sales",
      daysAgo: 4,
    },
    {
      agentId: "sage",
      title: "12-Month Strategic Plan",
      daysAgo: 2,
    },
  ];

  const conversationIds: Record<string, string> = {};

  for (const agent of agents) {
    const convId = uuid();
    conversationIds[agent.agentId] = convId;

    await supabase.from("agent_conversations").upsert({
      id: convId,
      user_id: userId,
      agent_id: agent.agentId,
      title: agent.title,
      message_count: 8,
      last_message_at: pastDate(agent.daysAgo),
      created_at: pastDate(agent.daysAgo),
    });
  }

  console.log(`   ↳ ${agents.length} conversations created`);

  // ── 5. Agent messages ──────────────────────────────────────────────────────
  console.log("5/9  Creating agent messages...");

  const messageSeeds = [
    // Patel — GTM
    {
      agentId: "patel",
      messages: [
        { role: "user", content: "I need help building our GTM strategy. We're targeting VP Procurement at mid-market manufacturers in DACH. We have 6 paying customers at €5K–€8K MRR each." },
        { role: "assistant", content: "Great foundation. With 6 paying customers you have real signal to build from. Let me help you structure this properly. First — when you say DACH, are you seeing better conversion in Germany, Austria or Switzerland? And are your 6 customers coming from inbound or outbound?" },
        { role: "user", content: "5 out of 6 came from warm intros through my McKinsey network. 1 from LinkedIn. Germany is 4 out of 6." },
        { role: "assistant", content: "That's an important insight. Your initial traction is network-driven, which is great for validation but not a scalable channel. Here's how I'd think about your GTM:\n\n**Near-term (0–6 months): Systematise the warm intro engine**\n- Map your full McKinsey alumni network to procurement roles at target companies\n- Build a structured referral programme — existing customers introduce you to 2 peers in exchange for a discount or co-marketing\n\n**Medium-term (6–12 months): Content-led enterprise outbound**\n- Publish the supply chain risk data your platform generates (anonymised) as quarterly reports\n- Use these reports as door-openers for LinkedIn outbound to VP Procurement at targets\n\nShall I build the full GTM Playbook with ICP definition, channel strategy, and 90-day execution plan?" },
        { role: "user", content: "Yes please build the full playbook." },
        { role: "assistant", content: "Building your GTM Playbook now..." },
      ],
    },
    // Felix — Financial
    {
      agentId: "felix",
      messages: [
        { role: "user", content: "Felix, I need to model out our financials. Currently €38K MRR, €52K monthly burn. 14 months runway. Enterprise sales cycle 60-90 days." },
        { role: "assistant", content: "Good starting point. A few questions before I model this out:\n\n1. What's your average contract value? You mentioned €5K–€8K MRR per customer — is that monthly or annual contracts?\n2. What's driving the €52K burn — headcount?\n3. Are there any contracts in your pipeline close to closing?" },
        { role: "user", content: "Annual contracts paid upfront. €60K–€96K ACV. 4 of us full time. Yes, 3 pipeline deals worth ~€220K total ACV expected to close in next 45 days." },
        { role: "assistant", content: "This is actually a stronger position than the headline numbers suggest. Let me reframe:\n\n**Current state:**\n- ARR: €456K (€38K × 12)\n- Burn: €52K/month → €624K/year\n- Runway: 14 months\n\n**With pipeline closed:**\n- ARR jumps to ~€676K\n- Cash injection of €220K upfront\n- Runway extends to ~18–20 months\n\n**The real risk:** Enterprise sales cycle variability. Those 3 deals could slip by 30–60 days each. I'd build the model with a conservative scenario (2 of 3 close, 30-day slip) and an optimistic scenario.\n\nBuilding your 24-month financial model now..." },
        { role: "user", content: "Perfect, please include the model." },
      ],
    },
    // Atlas — Competitive
    {
      agentId: "atlas",
      messages: [
        { role: "user", content: "Atlas, who are our main competitors in supply chain visibility? We need a competitive matrix for investor decks." },
        { role: "assistant", content: "Pulling live competitive data on the supply chain visibility market..." },
        { role: "user", content: "What's our positioning vs Elementum and project44?" },
        { role: "assistant", content: "Based on my research, here's the positioning:\n\n**project44** — Enterprise-only ($500K+ ACV), focuses on logistics/transportation visibility, not supplier network depth. Publicly traded, $900M raised. Your wedge: they don't do multi-tier supplier inventory — only shipment tracking.\n\n**Elementum** — Acquired by Ericsson. Largely focused on telecom sector supply chains. Less relevant for auto/industrial.\n\n**Your actual competitors for this buyer:**\n- **Resilinc** — Closer to your ICP but $200K+ ACV, US-focused, complex onboarding\n- **Interos** — Risk monitoring, not inventory visibility. Different use case.\n- **SAP Integrated Business Planning** — Your customer's existing tool (not a competitor — you integrate with it)\n\n**The real positioning:** You're the only mid-market-native option in DACH with ERP integration and a 30-day time-to-value. Shall I build the full competitive matrix?" },
        { role: "user", content: "Yes build it." },
      ],
    },
  ];

  for (const seed of messageSeeds) {
    const convId = conversationIds[seed.agentId];
    const daysAgo = agents.find((a) => a.agentId === seed.agentId)!.daysAgo;

    for (let i = 0; i < seed.messages.length; i++) {
      await supabase.from("agent_messages").upsert({
        id: uuid(),
        conversation_id: convId,
        user_id: userId,
        role: seed.messages[i].role,
        content: seed.messages[i].content,
        created_at: new Date(
          new Date(pastDate(daysAgo)).getTime() + i * 3 * 60 * 1000
        ).toISOString(),
      });
    }
  }

  console.log("   ↳ Conversation messages saved");

  // ── 6. Agent artifacts ─────────────────────────────────────────────────────
  console.log("6/9  Creating agent artifacts...");

  const artifacts = [
    {
      agentId: "patel",
      artifactType: "gtm_playbook",
      title: "Nuvora GTM Playbook — DACH Enterprise",
      daysAgo: 9,
      content: {
        summary: "Go-to-market strategy for Nuvora targeting VP Procurement at mid-market manufacturers (200–2000 employees) in DACH.",
        icp: {
          title: "VP Procurement / Head of Supply Chain",
          company_size: "200–2000 employees",
          revenue: "€50M–€500M",
          sector: "Automotive, Electronics, Industrial Equipment",
          geography: "Germany, Austria, Switzerland",
          trigger: "Experienced at least one unplanned production halt in last 18 months",
          tech_stack: "SAP or Oracle ERP, uses Excel/email for supplier communication",
        },
        channels: [
          {
            name: "McKinsey Alumni Network",
            type: "warm_intro",
            status: "proven",
            cac: "€4,000",
            notes: "5 of 6 customers sourced here. Build systematic referral programme.",
          },
          {
            name: "LinkedIn Outbound",
            type: "outbound",
            status: "testing",
            cac: "€18,000",
            notes: "Lower conversion but scalable. Use supply chain risk reports as door-openers.",
          },
          {
            name: "Hannover Messe",
            type: "events",
            status: "planned",
            cac: "€8,000 est.",
            notes: "Premier industrial event. 3 qualified meetings booked for next edition.",
          },
        ],
        messaging: {
          headline: "Know before your production halts.",
          subheadline: "Nuvora gives procurement teams live visibility into every tier of their supplier network — so you catch shortages weeks before they become stoppages.",
          proof_point: "Nuvora customers reduced unplanned production halts by 67% in their first 90 days.",
        },
        execution_plan: [
          { week: "1–2", action: "Map McKinsey alumni network to target company procurement roles (Salesforce + LinkedIn)" },
          { week: "3–4", action: "Launch customer referral programme — 10% discount for each successful intro" },
          { week: "5–8", action: "Publish Q1 Supply Chain Risk Report (anonymised platform data), use as LinkedIn outbound opener" },
          { week: "9–12", action: "Close 3 pipeline deals, document case studies for Hannover Messe materials" },
        ],
      },
    },
    {
      agentId: "felix",
      artifactType: "financial_summary",
      title: "Nuvora 24-Month Financial Model",
      daysAgo: 7,
      content: {
        current_metrics: {
          mrr: 38000,
          arr: 456000,
          monthly_burn: 52000,
          runway_months: 14,
          gross_margin_pct: 82,
          acv: 78000,
          customers: 6,
        },
        pipeline: {
          deals: 3,
          total_acv: 220000,
          expected_close: "45 days",
          conservative_scenario: "2 of 3 close, 30-day slip",
          optimistic_scenario: "3 of 3 close on schedule",
        },
        projections: {
          month_6: { mrr: 68000, arr: 816000, customers: 12, burn: 58000 },
          month_12: { mrr: 112000, arr: 1344000, customers: 18, burn: 74000 },
          month_18: { mrr: 165000, arr: 1980000, customers: 26, burn: 95000 },
          month_24: { mrr: 230000, arr: 2760000, customers: 34, burn: 120000 },
        },
        unit_economics: {
          ltv: 312000,
          cac: 12000,
          ltv_cac_ratio: 26,
          payback_months: 4.8,
          nrr: 118,
        },
        raise: {
          target: 2500000,
          use_of_funds: [
            { category: "Sales & Marketing", pct: 45, amount: 1125000 },
            { category: "Engineering", pct: 35, amount: 875000 },
            { category: "Operations", pct: 20, amount: 500000 },
          ],
          runway_post_raise: 28,
        },
      },
    },
    {
      agentId: "atlas",
      artifactType: "competitive_matrix",
      title: "Supply Chain Visibility — Competitive Landscape",
      daysAgo: 5,
      content: {
        summary: "Nuvora operates in the supply chain visibility market. The mid-market DACH segment is underserved by current enterprise-focused players.",
        competitors: [
          {
            name: "project44",
            founded: 2014,
            funding: "$900M",
            focus: "Transportation & logistics visibility",
            acv: "$500K+",
            weakness: "No multi-tier supplier inventory; US-centric; complex onboarding",
            threat_level: "low",
          },
          {
            name: "Resilinc",
            founded: 2011,
            funding: "$60M",
            focus: "Supplier risk monitoring",
            acv: "$200K+",
            weakness: "Risk intelligence only — no live inventory data; US-focused",
            threat_level: "medium",
          },
          {
            name: "Interos",
            founded: 2000,
            funding: "$115M",
            focus: "Supply chain risk intelligence (financial/geopolitical)",
            acv: "$150K+",
            weakness: "No operational/inventory data; different buyer (risk team vs procurement)",
            threat_level: "low",
          },
        ],
        nuvora_advantages: [
          "Only mid-market-native product in DACH (sub-€100K ACV)",
          "ERP integration live in <30 days vs 6–12 months for enterprise tools",
          "Real-time inventory data, not just risk scores",
          "Founder network advantage in DACH manufacturing",
        ],
        market_size: {
          tam: "$12.4B global supply chain visibility software market (2025)",
          sam: "$1.8B DACH + Benelux mid-market manufacturing segment",
          som: "$180M addressable in next 3 years (10% of SAM)",
        },
      },
    },
    {
      agentId: "harper",
      artifactType: "hiring_plan",
      title: "Nuvora Hiring Plan — 18-Month Roadmap",
      daysAgo: 4,
      content: {
        current_team: [
          { role: "CEO / Co-founder", name: "Mehtab Afsar", background: "McKinsey supply chain, prior exit" },
          { role: "CTO / Co-founder", name: "Aarav Singh", background: "10 yrs enterprise integration, ex-SAP" },
          { role: "Head of Sales", name: "Lars Müller", background: "5 yrs B2B SaaS sales, DACH market" },
          { role: "Lead Engineer", name: "Priya Nair", background: "Full-stack, ERP integration specialist" },
        ],
        hiring_plan: [
          {
            role: "Enterprise Account Executive (DACH)",
            priority: "high",
            timeline: "Month 1–2",
            rationale: "CEO currently closing all deals — needs sales capacity to scale pipeline",
            comp: "€90K base + €60K OTE",
            requirements: ["5+ yrs B2B SaaS AE", "German native speaker", "Manufacturing/supply chain sector preferred"],
          },
          {
            role: "Senior Backend Engineer",
            priority: "high",
            timeline: "Month 2–3",
            rationale: "ERP integration backlog growing — current engineer at capacity",
            comp: "€100K–€120K",
            requirements: ["4+ yrs backend", "ERP integration experience (SAP/Oracle)", "Distributed systems"],
          },
          {
            role: "Customer Success Manager",
            priority: "medium",
            timeline: "Month 4–5",
            rationale: "6 customers managing onboarding manually; churn risk as we scale",
            comp: "€70K–€85K",
            requirements: ["3+ yrs CS in B2B SaaS", "Manufacturing industry background preferred"],
          },
          {
            role: "Data / ML Engineer",
            priority: "medium",
            timeline: "Month 6–8",
            rationale: "Build predictive risk scoring model on top of live inventory data",
            comp: "€110K–€130K",
            requirements: ["ML/data pipeline experience", "Time-series forecasting", "Python"],
          },
        ],
        total_headcount_target: 8,
        total_comp_budget_monthly: 78000,
      },
    },
    {
      agentId: "sage",
      artifactType: "strategic_plan",
      title: "Nuvora 12-Month Strategic Plan",
      daysAgo: 2,
      content: {
        mission: "Make supply chain disruptions a thing of the past for mid-market manufacturers.",
        north_star_metric: "ARR €2M by December 2026",
        okrs: [
          {
            objective: "Establish undeniable product-market fit in DACH automotive",
            quarter: "Q1 2026",
            key_results: [
              { kr: "Close 3 pipeline deals → ARR €676K", owner: "CEO", status: "in_progress" },
              { kr: "Achieve NRR >115% across existing 6 customers", owner: "CSM", status: "on_track" },
              { kr: "Publish 3 customer case studies with quantified ROI", owner: "Marketing", status: "planned" },
            ],
          },
          {
            objective: "Build a scalable, repeatable sales motion",
            quarter: "Q2 2026",
            key_results: [
              { kr: "Hire and onboard first Enterprise AE", owner: "CEO", status: "planned" },
              { kr: "AE ramp to first close within 90 days", owner: "Sales", status: "planned" },
              { kr: "Build SDR outbound playbook with 20% open rate", owner: "Marketing", status: "planned" },
            ],
          },
          {
            objective: "Close Seed round and extend runway to 28 months",
            quarter: "Q2 2026",
            key_results: [
              { kr: "Raise €2.5M Seed from 1–2 lead investors", owner: "CEO", status: "in_progress" },
              { kr: "Build pipeline of 15 qualified investor introductions", owner: "CEO", status: "in_progress" },
              { kr: "Achieve ARR €900K before term sheet", owner: "All", status: "in_progress" },
            ],
          },
          {
            objective: "Expand to electronics and industrial equipment verticals",
            quarter: "Q3–Q4 2026",
            key_results: [
              { kr: "Land 3 customers in electronics sector", owner: "Sales", status: "planned" },
              { kr: "Launch Benelux market with 2 pilot customers", owner: "CEO", status: "planned" },
              { kr: "ARR €2M by end of December 2026", owner: "All", status: "planned" },
            ],
          },
        ],
        risks: [
          { risk: "Pipeline deals slip beyond Q1", mitigation: "Weekly exec-level check-ins; parallel outbound to replace if needed" },
          { risk: "Seed round takes longer than 3 months", mitigation: "Build bridge facility from existing angels; cut burn to €42K if needed" },
          { risk: "SAP launches competing mid-market product", mitigation: "Speed and customer intimacy moat; integrate deeper, not compete on features" },
        ],
      },
    },
  ];

  for (const artifact of artifacts) {
    await supabase.from("agent_artifacts").upsert({
      id: uuid(),
      user_id: userId,
      agent_id: artifact.agentId,
      conversation_id: conversationIds[artifact.agentId],
      artifact_type: artifact.artifactType,
      title: artifact.title,
      content: artifact.content,
      version: 1,
      created_at: pastDate(artifact.daysAgo),
      updated_at: pastDate(artifact.daysAgo),
    });
  }

  console.log(`   ↳ ${artifacts.length} artifacts saved`);

  // ── 7. Score evidence ──────────────────────────────────────────────────────
  console.log("7/9  Creating score evidence...");

  const evidence = [
    {
      dimension: "traction",
      evidence_type: "agent_artifact",
      title: "6 Paying Enterprise Customers — €38K MRR",
      data_value: "38000",
      status: "verified",
      points_awarded: 15,
    },
    {
      dimension: "product",
      evidence_type: "agent_artifact",
      title: "87 Customer Discovery Conversations Documented",
      data_value: "87",
      status: "verified",
      points_awarded: 12,
    },
    {
      dimension: "team",
      evidence_type: "manual",
      title: "Prior Exit — Supply Chain Analytics Tool Acquired 2021",
      data_value: "1",
      status: "verified",
      points_awarded: 10,
    },
    {
      dimension: "financial",
      evidence_type: "agent_artifact",
      title: "82% Gross Margin — Felix Financial Summary",
      data_value: "82",
      status: "verified",
      points_awarded: 8,
    },
  ];

  for (const ev of evidence) {
    const { error } = await supabase.from("score_evidence").upsert({
      id: uuid(),
      user_id: userId,
      dimension: ev.dimension,
      evidence_type: ev.evidence_type,
      title: ev.title,
      data_value: ev.data_value,
      status: ev.status,
      points_awarded: ev.points_awarded,
      created_at: pastDate(8),
    });
    if (error) console.warn(`   ⚠ Evidence (${ev.dimension}): ${error.message}`);
  }

  console.log("   ↳ Score evidence saved");

  // ── 8. Agent activity log ──────────────────────────────────────────────────
  console.log("8/9  Creating agent activity log...");

  const activityItems = [
    { agent_id: "patel", action_type: "artifact_created", artifact_type: "gtm_playbook", description: "Generated GTM Playbook — DACH Enterprise", daysAgo: 9 },
    { agent_id: "felix", action_type: "artifact_created", artifact_type: "financial_summary", description: "Generated 24-Month Financial Model", daysAgo: 7 },
    { agent_id: "atlas", action_type: "artifact_created", artifact_type: "competitive_matrix", description: "Generated Competitive Landscape Matrix", daysAgo: 5 },
    { agent_id: "harper", action_type: "artifact_created", artifact_type: "hiring_plan", description: "Generated 18-Month Hiring Plan", daysAgo: 4 },
    { agent_id: "sage", action_type: "artifact_created", artifact_type: "strategic_plan", description: "Generated 12-Month Strategic OKR Plan", daysAgo: 2 },
    { agent_id: "patel", action_type: "score_boost", artifact_type: "gtm_playbook", description: "GTM score boosted +6 pts from GTM Playbook", daysAgo: 3 },
    { agent_id: "felix", action_type: "score_boost", artifact_type: "financial_summary", description: "Financial score boosted +6 pts from Financial Summary", daysAgo: 3 },
  ];

  for (const item of activityItems) {
    const { error } = await supabase.from("agent_activity").upsert({
      id: uuid(),
      user_id: userId,
      agent_id: item.agent_id,
      action_type: item.action_type,
      description: item.description,
      metadata: { artifact_type: item.artifact_type },
      created_at: pastDate(item.daysAgo),
    }).select();
    if (error && !error.message.includes("does not exist")) {
      console.warn(`   ⚠ Activity: ${error.message}`);
    }
  }

  console.log("   ↳ Activity log saved");

  // ── 9. Done ────────────────────────────────────────────────────────────────
  console.log("9/9  Done!\n");
  console.log("─".repeat(50));
  console.log("  Test user created");
  console.log("  Email:    mehtab@gmail.com");
  console.log("  Password: Moon@123");
  console.log("  Company:  Nuvora (B2B SaaS, supply chain visibility)");
  console.log("  Q-Score:  74 (C+ grade, 67th percentile)");
  console.log("  Agents:   5 conversations, 5 artifacts");
  console.log("  Login at: http://localhost:3000");
  console.log("─".repeat(50));
  console.log();
}

main().catch((err) => {
  console.error("\n❌ Seed failed:", err.message);
  process.exit(1);
});

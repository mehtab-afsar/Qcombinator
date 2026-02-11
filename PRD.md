# Edge Alpha - Product Requirements Document

## 1. Product Overview

### What is Edge Alpha?
Edge Alpha is an AI-powered operating system for early-stage founders that provides:
1. **Quantitative Assessment** - Q-Score framework measuring startup quality
2. **AI-Powered Guidance** - Specialized agents providing actionable advice
3. **Investor Matching** - Connecting founders with relevant investors
4. **Execution Tools** - Profile builder, metrics tracker, task management

### Core Philosophy
Transform unstructured founder knowledge into structured, actionable insights that improve with every interaction. The platform learns from onboarding data, assessment responses, and ongoing interactions to provide increasingly personalized guidance.

---

## 2. User Journeys

### 2.1 Founder Journey

#### **Stage 1: Discovery & Onboarding** (15 minutes)
```
Landing Page → Sign Up → Founder Profile → Q-Score Assessment → Dashboard
```

**Onboarding Flow:**
1. **Basic Info** (2 min)
   - Full name, email
   - Current stage (Idea, Pre-seed, Seed)
   - Funding status (Bootstrapped, Pre-seed, Seed)
   - Time commitment (Part-time, Full-time)

2. **Q-Score Assessment** (13 min)
   - 13 questions across 6 dimensions
   - Rich text responses (problem story, ICP description)
   - Quantitative inputs (MRR, burn, customers, conversations)
   - Multiple choice (channels tried, funding stage)

**Data Captured:**
```typescript
{
  profile: {
    fullName, email, stage, funding, timeCommitment,
    startupName, industry, description
  },
  assessment: {
    // Market Dimension
    problemStory: string,
    targetCustomers: number,
    icpDescription: string,

    // Product Dimension
    solutionDescription: string,
    conversationCount: number,

    // GTM Dimension
    channelsTried: string[],

    // Financial Dimension
    mrr: number,
    monthlyBurn: number,

    // Traction Dimension
    currentRevenue: number,
    growthRate: number
  }
}
```

#### **Stage 2: Understanding & Planning** (Week 1)
```
Dashboard → Profile Builder → Metrics Review → Identify Gaps → AI Agent Consultation
```

**Activities:**
1. **Review Q-Score** - Understand current score (0-100) and dimension breakdown
2. **Complete Profile** - Fill missing startup details (50-60% complete after onboarding)
3. **Set Baseline Metrics** - Confirm MRR, burn, runway, customers
4. **Identify Top 3 Priorities** - System recommends focus areas based on Q-Score
5. **First Agent Interaction** - Chat with recommended agent (GTM Strategist or Product Guru)

**Agent Recommendations Logic:**
```
IF Q-Score < 40:
  - Recommend Product Guru (build something people want)
  - Focus: Customer discovery, MVP definition

IF Q-Score 40-60:
  - Recommend GTM Strategist (find repeatable acquisition)
  - Focus: Channel testing, CAC optimization

IF Q-Score > 60:
  - Recommend Fundraising Coach (prepare for fundraising)
  - Focus: Pitch refinement, investor outreach
```

#### **Stage 3: Execution & Improvement** (Weeks 2-12)
```
Weekly: Agent Chats → Task Execution → Metrics Update → Q-Score Reassessment
```

**Weekly Workflow:**
1. **Monday: Planning**
   - Review last week's progress
   - Agent suggests 3-5 tasks for the week
   - Founder prioritizes and commits

2. **Mid-week: Execution**
   - Work on tasks
   - Chat with agents for guidance
   - Update metrics as things change

3. **Friday: Review**
   - Log completed tasks
   - Update key metrics (MRR, customers, conversations)
   - Q-Score recalculates automatically

**Q-Score Evolution:**
```
Week 1:  35 (baseline from assessment)
Week 4:  42 (+7 - ran customer discovery, updated ICP)
Week 8:  51 (+9 - validated channel, got first customers)
Week 12: 58 (+7 - reached $2K MRR, improved unit economics)
```

#### **Stage 4: Investor Matching** (Q-Score > 50)
```
Unlock Investors → Review Matches → Request Intros → Pitch → Fundraise
```

**Investor Matching Flow:**
1. System unlocks investor tab when Q-Score > 50
2. Shows 10-20 matched investors ranked by fit score
3. Founder reviews profiles and requests intros (3 per week limit)
4. System sends intro request to investor
5. If investor accepts, messaging unlocks
6. Founder and investor chat, share materials
7. Investor can schedule call or pass

---

### 2.2 Investor Journey

#### **Stage 1: Onboarding** (5 minutes)
```
Invite Link → Investor Profile → Investment Preferences → Dashboard
```

**Data Captured:**
```typescript
{
  investorProfile: {
    name: string,
    firm: string,
    checkSize: { min: number, max: number },
    stages: ['Pre-seed', 'Seed', 'Series A'],
    industries: string[],
    geography: string[],
    thesisFocus: string, // AI, climate, fintech, etc.
    dealflowCapacity: number // intros per month
  }
}
```

#### **Stage 2: Deal Flow Review** (Daily/Weekly)
```
Dashboard → Matched Founders → Review Profiles → Accept/Pass Intros
```

**Investor Dashboard:**
1. **Pending Intros** - Founders requesting introduction
2. **Active Conversations** - Ongoing chats with founders
3. **Saved Founders** - Bookmarked for later follow-up
4. **Analytics** - Response rate, meeting conversion, investment rate

**Matching Algorithm:**
```javascript
matchScore =
  (industryMatch ? 25 : 0) +
  (stageMatch ? 20 : 0) +
  (qScoreWeight * 0.3) + // 0-30 points
  (tractionWeight * 0.15) + // 0-15 points
  (geoMatch ? 10 : 0)

// Only show founders with matchScore > 60
```

#### **Stage 3: Evaluation** (1-4 weeks per founder)
```
Intro Request → Profile Review → Message → Share Deck → Call → Decision
```

**Investor Actions:**
1. **Accept Intro** - Opens messaging channel
2. **Request More Info** - Ask for deck, financials, demo
3. **Schedule Call** - Book 30-min intro call
4. **Pass with Feedback** - Decline but provide constructive feedback
5. **Move to Pipeline** - Add to deal pipeline, mark stage (Interest, Diligence, Term Sheet)

---

## 3. AI Agents Architecture

### 3.1 Agent Types & Capabilities

All agents are **chat-based** but have different **output modes**:

#### **Chat Mode** (Conversational)
- Back-and-forth dialogue
- Asks clarifying questions
- Provides advice and guidance
- **Example**: "What's my best customer acquisition channel?"

#### **Action Mode** (Generates Artifacts)
- Produces structured outputs
- Creates deliverables
- **Examples**:
  - GTM Strategist → Channel Test Plan (table with channels, budget, timeline)
  - Fundraising Coach → Pitch Deck Outline (slide-by-slide structure)
  - Product Guru → Feature Prioritization Matrix (table with features, effort, impact)
  - Operations Optimizer → Weekly Task List (checklist with priorities)

#### **Analysis Mode** (Data-Driven Insights)
- Analyzes metrics and trends
- Identifies problems and opportunities
- **Examples**:
  - Metrics Analyzer → "Your CAC payback is 18 months (industry avg: 12). Here's why..."
  - Growth Hacker → "Your landing page converts at 1.2% (bottom quartile). Test these 3 changes..."

### 3.2 Agent System Prompts (Context Injection)

Each agent receives the **full founder context**:

```javascript
const systemPrompt = `
You are the ${agent.name}, a specialized AI advisor for early-stage founders.

**FOUNDER CONTEXT:**
Company: ${profile.startupName}
Industry: ${profile.industry}
Stage: ${profile.stage}
Problem: ${assessment.problemStory}
ICP: ${assessment.icpDescription}
Current MRR: $${assessment.mrr}
Monthly Burn: $${assessment.monthlyBurn}
Customers: ${calculatedMetrics.customers}
Runway: ${calculatedMetrics.runway} months
Channels Tried: ${assessment.channelsTried.join(', ')}

**Q-SCORE BREAKDOWN:**
Overall: ${qScore.overall}/100
- Market: ${qScore.breakdown.market}/100 ${qScore.breakdown.market < 50 ? '⚠️ FOCUS AREA' : ''}
- Product: ${qScore.breakdown.product}/100
- GTM: ${qScore.breakdown.gtm}/100
- Financial: ${qScore.breakdown.financial}/100
- Team: ${qScore.breakdown.team}/100
- Traction: ${qScore.breakdown.traction}/100

**YOUR ROLE:**
${agent.systemPrompt}

**OUTPUT GUIDELINES:**
- Be specific and actionable
- Reference their actual data (don't give generic advice)
- If you recommend actions, make them concrete with timelines
- If creating artifacts (plans, outlines, etc.), use markdown tables or lists
- For complex deliverables, offer to generate them in Action Mode
`;
```

### 3.3 Agent Outputs & Integration

#### **GTM Strategist**
**Chat Output:**
- Channel recommendations based on ICP and budget
- CAC targets by channel
- Experiment design (hypothesis, metrics, timeline)

**Action Mode Output:**
```markdown
## 30-Day Channel Test Plan

| Week | Channel | Tactics | Budget | Goal |
|------|---------|---------|--------|------|
| 1 | LinkedIn | Outbound messages to CTOs | $0 | 50 conversations |
| 2 | Content | Publish 3 blog posts, share on Twitter | $500 (writer) | 500 website visits |
| 3 | Cold Email | 500 targeted emails via Apollo | $200 | 10 demos booked |
| 4 | Paid Ads | Google Search ads (high-intent keywords) | $1000 | 5 customers |

**Success Criteria:** Find 1 channel with <$500 CAC and >5% conversion
```

**Data Integration:**
- Reads: `assessment.channelsTried`, `metrics.cac`, `profile.industry`
- Writes: Updates `assessment.channelsTried` when founder tests new channels
- Triggers: If founder updates MRR, agent proactively asks "Which channel drove this growth?"

#### **Product Guru**
**Chat Output:**
- Feature prioritization advice
- MVP scope recommendations
- Product-market fit signals

**Action Mode Output:**
```markdown
## Feature Prioritization Matrix

| Feature | User Impact | Effort | Priority |
|---------|-------------|--------|----------|
| Slack integration | High | Medium | P0 |
| Advanced analytics | Medium | High | P2 |
| Mobile app | Low | High | P3 |
| Email notifications | High | Low | P0 |

**Next Sprint:** Focus on P0 features (Slack integration, email notifications)
**Expected Outcome:** 20% improvement in activation rate
```

**Data Integration:**
- Reads: `assessment.conversationCount`, `assessment.solutionDescription`
- Writes: None (conversational only)
- Triggers: If `conversationCount` increases but MRR doesn't, agent suggests "You're talking to users but not converting. Let's diagnose why."

#### **Fundraising Coach**
**Chat Output:**
- Pitch feedback and refinement
- Investor targeting advice
- Fundraising timeline planning

**Action Mode Output:**
```markdown
## Investor Target List

| Investor | Firm | Stage | Check Size | Why They're a Fit |
|----------|------|-------|------------|-------------------|
| Jane Smith | Acme Ventures | Seed | $500K-$2M | Invests in B2B SaaS, led 3 similar deals |
| John Doe | Beta Capital | Pre-seed | $250K-$500K | Focus on technical founders, active in your city |

## Pitch Deck Outline

1. Problem (1 slide) - Use your customer discovery data (${assessment.conversationCount} conversations)
2. Solution (1 slide) - Demo your MVP
3. Market (1 slide) - TAM: ${assessment.targetCustomers * averageDealSize}
4. Traction (1 slide) - $${assessment.mrr} MRR, ${customers} customers, ${growthRate}% MoM growth
5. Business Model (1 slide) - ${averageDealSize} ACV, ${metrics.ltvCacRatio}:1 LTV:CAC
6. Team (1 slide) - Your background + advisors
7. Ask (1 slide) - Raising $${recommendedRaise}, 18-month runway
```

**Data Integration:**
- Reads: All metrics, Q-Score, investor match scores
- Writes: None
- Triggers: When Q-Score > 55, agent proactively says "You're in the fundable zone. Let's start preparing your pitch."

#### **Metrics Analyzer**
**Chat Output:**
- Metric health analysis
- Benchmark comparisons
- Trend explanations

**Action Mode Output:**
```markdown
## Metrics Health Report (Week of Jan 1)

### 🟢 Healthy Metrics
- **MRR Growth:** +15% MoM (target: >10%)
- **Gross Margin:** 80% (target: >70%)
- **Net Revenue Retention:** 105% (target: >100%)

### 🟡 Warning Metrics
- **CAC Payback:** 18 months (target: <12 months)
  - **Issue:** Spending too much on paid ads
  - **Fix:** Shift to organic channels (content, community)
- **Burn Multiple:** 2.5x (target: <2x)
  - **Issue:** Growing costs faster than revenue
  - **Fix:** Freeze hiring for 2 months, renegotiate SaaS contracts

### 🔴 Critical Metrics
- **Runway:** 8 months (target: >12 months)
  - **Urgency:** Need to raise or cut burn by 30% within 60 days

**Recommendation:** Focus on improving CAC efficiency before fundraising.
```

**Data Integration:**
- Reads: All metrics, historical data (week-over-week, month-over-month)
- Writes: Saves analysis reports to database
- Triggers: Automatic weekly report generation, alerts when critical thresholds hit

---

## 4. Data Model & Flow

### 4.1 Core Entities

```typescript
// User/Founder Profile
interface Founder {
  id: string;
  email: string;
  fullName: string;
  createdAt: Date;

  // Onboarding Data
  stage: 'Idea' | 'Pre-seed' | 'Seed';
  funding: 'Bootstrapped' | 'Pre-seed' | 'Seed';
  timeCommitment: 'Part-time' | 'Full-time';

  // Company Data (from assessment)
  startupName: string;
  industry: string;
  description: string;
  foundedDate?: Date;
}

// Q-Score Assessment (immutable snapshots)
interface Assessment {
  id: string;
  founderId: string;
  createdAt: Date;
  version: number; // 1, 2, 3... (for tracking reassessments)

  // Raw Responses
  problemStory: string;
  targetCustomers: number;
  icpDescription: string;
  solutionDescription: string;
  conversationCount: number;
  channelsTried: string[];
  mrr: number;
  monthlyBurn: number;
  currentRevenue: number;
  growthRate: number;

  // Calculated Q-Score
  qScore: {
    overall: number;
    breakdown: {
      market: number;
      product: number;
      gtm: number;
      financial: number;
      team: number;
      traction: number;
    };
    calculatedAt: Date;
  };
}

// Metrics (derived from assessment + manual updates)
interface Metrics {
  id: string;
  founderId: string;
  weekOf: Date; // Metrics are tracked weekly

  // Core SaaS Metrics
  mrr: number;
  arr: number;
  burn: number;
  runway: number; // months
  customers: number;
  averageDealSize: number;
  cac: number;
  ltv: number;
  ltvCacRatio: number;
  grossMargin: number;
  burnMultiple: number;

  // Growth Metrics
  mrrGrowthRate: number; // month-over-month %
  customerGrowthRate: number;
  churnRate: number;

  // Derived Health Status
  healthStatus: 'healthy' | 'warning' | 'critical';
  issues: string[];
  strengths: string[];
}

// Agent Conversations
interface Conversation {
  id: string;
  founderId: string;
  agentId: string;
  createdAt: Date;
  updatedAt: Date;
  title: string; // Auto-generated from first message

  messages: Message[];

  // Context Snapshot (what the agent knew at conversation start)
  contextSnapshot: {
    profileData: Partial<Founder>;
    assessmentData: Partial<Assessment>;
    metricsData: Partial<Metrics>;
    qScore: number;
  };
}

interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;

  // For action mode outputs
  artifacts?: {
    type: 'plan' | 'outline' | 'matrix' | 'report';
    title: string;
    content: string; // Markdown format
  }[];
}

// Agent-Generated Tasks
interface Task {
  id: string;
  founderId: string;
  agentId: string;
  conversationId: string;
  title: string;
  description: string;
  dueDate: Date;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'todo' | 'in_progress' | 'completed';
  createdAt: Date;
  completedAt?: Date;
}

// Investor Profile
interface Investor {
  id: string;
  email: string;
  name: string;
  firm: string;
  title: string;

  // Investment Preferences
  checkSize: { min: number; max: number };
  stages: string[];
  industries: string[];
  geography: string[];
  thesisFocus: string;
  dealflowCapacity: number; // intros per month

  // Matching Settings
  minimumQScore: number; // Default: 50
  preferredMetrics: {
    minMRR?: number;
    minGrowthRate?: number;
    maxBurnMultiple?: number;
  };
}

// Investor Matching
interface Match {
  id: string;
  founderId: string;
  investorId: string;
  score: number; // 0-100
  createdAt: Date;

  // Match Reasoning
  reasons: {
    industryMatch: boolean;
    stageMatch: boolean;
    qScoreAboveThreshold: boolean;
    metricsAboveThreshold: boolean;
    geoMatch: boolean;
  };

  status: 'pending' | 'intro_requested' | 'intro_accepted' | 'intro_declined' | 'in_conversation' | 'passed';
}

// Messaging (Founder <-> Investor)
interface InvestorMessage {
  id: string;
  matchId: string;
  senderId: string; // founderId or investorId
  senderType: 'founder' | 'investor';
  content: string;
  createdAt: Date;
  readAt?: Date;

  attachments?: {
    type: 'pdf' | 'link';
    name: string;
    url: string;
  }[];
}
```

### 4.2 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     ONBOARDING PHASE                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                      [Founder Profile] ──────────┐
                              │                   │
                              ▼                   │
                    [Assessment Responses]        │
                              │                   │
                              ▼                   │
                    [Q-Score Calculation]         │
                              │                   │
                              ▼                   │
                        [Dashboard] ◄─────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
[Profile Builder]      [Metrics Tracker]    [Improve Q-Score]
        │                     │                     │
        │                     ▼                     │
        │           [Metrics Calculation] ─────────┤
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    EXECUTION PHASE                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    [AI Agent Selection] ◄─── Q-Score
                              │
                              ▼
                    [Agent Conversation]
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
              [Chat Mode]        [Action Mode]
                    │                   │
                    │                   ▼
                    │         [Generate Artifact]
                    │            (Plan, Matrix, etc.)
                    │                   │
                    └─────────┬─────────┘
                              │
                              ▼
                      [Extract Tasks] ────► [Task List]
                              │
                              ▼
                    [Founder Executes]
                              │
                              ▼
                    [Update Metrics] ────► [Metrics History]
                              │
                              ▼
                    [Reassess Q-Score] ──► [New Q-Score]
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  INVESTOR MATCHING PHASE                    │
└─────────────────────────────────────────────────────────────┘
                              │
                    [Q-Score > 50?] ───No──► [Keep Building]
                              │
                             Yes
                              │
                              ▼
                    [Run Matching Algorithm]
                              │
                    ┌─────────┴─────────┐
                    │                   │
              [Founder Data]    [Investor Preferences]
                    │                   │
                    └─────────┬─────────┘
                              │
                              ▼
                    [Calculate Match Scores]
                              │
                              ▼
                    [Top 20 Matches] ────► [Investor Tab]
                              │
                              ▼
                    [Founder Requests Intro]
                              │
                              ▼
                    [Investor Reviews]
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
                [Accept]            [Decline]
                    │                   │
                    ▼                   │
          [Unlock Messaging] ───────────┘
                    │
                    ▼
          [Founder <-> Investor Chat]
                    │
                    ▼
          [Share Materials (Deck, Financials)]
                    │
                    ▼
          [Schedule Call / Continue Diligence]
```

### 4.3 Context Propagation (How Data Flows to Agents)

**Scenario: Founder chats with GTM Strategist**

```javascript
// 1. User clicks on GTM Strategist agent
// 2. System loads full context

const founderContext = {
  // From Founder table
  profile: {
    fullName: "Sarah Chen",
    startupName: "TaskFlow",
    industry: "B2B SaaS",
    stage: "Pre-seed",
    description: "Project management for remote teams"
  },

  // From latest Assessment
  assessment: {
    problemStory: "Remote teams struggle to track tasks across Slack, email, and spreadsheets...",
    targetCustomers: 50000, // SMBs with 10-50 employees
    icpDescription: "Operations managers at 10-50 person remote companies",
    conversationCount: 25,
    channelsTried: ["LinkedIn", "Cold Email"],
    mrr: 1200,
    monthlyBurn: 5000
  },

  // From latest Metrics
  metrics: {
    mrr: 1200,
    arr: 14400,
    burn: 5000,
    runway: 8, // months
    customers: 6,
    averageDealSize: 200,
    cac: 350,
    ltv: 2400,
    ltvCacRatio: 6.9,
    mrrGrowthRate: 0.15 // 15% MoM
  },

  // From latest Q-Score
  qScore: {
    overall: 48,
    breakdown: {
      market: 55,
      product: 60,
      gtm: 35, // ⚠️ WEAK
      financial: 45,
      team: 50,
      traction: 40
    }
  },

  // From past Conversations with this agent
  conversationHistory: [
    { date: "2025-01-15", summary: "Discussed LinkedIn outbound strategy" },
    { date: "2025-01-22", summary: "Analyzed cold email results (2% reply rate)" }
  ]
};

// 3. System builds agent prompt
const systemPrompt = buildAgentPrompt("gtm-strategist", founderContext);

// 4. User sends message: "My cold emails aren't working. What should I try next?"

// 5. Agent receives:
const agentInput = {
  systemPrompt, // Full context above
  conversationHistory: [...], // Past messages in this conversation
  userMessage: "My cold emails aren't working. What should I try next?"
};

// 6. Agent generates response with context awareness:
const agentResponse = `
I see you've tried LinkedIn and Cold Email so far, with a 2% reply rate on cold emails.
Given your ICP (operations managers at 10-50 person remote companies) and your current
MRR of $1,200 with 6 customers, here's what I recommend:

**Why Cold Email Isn't Working:**
- Operations managers are overwhelmed with cold outreach
- Your GTM Q-Score is 35/100 (weak) - you need a better channel fit

**Next Channels to Test:**

1. **Content Marketing (High Priority)**
   - Your ICP hangs out on LinkedIn and reads ops blogs
   - Write 1 post/week about "remote team productivity hacks"
   - Goal: 500 profile views → 50 website visits → 5 demos
   - Budget: $0 (your time)
   - Timeline: 4 weeks

2. **Product-Led Growth (Medium Priority)**
   - Offer a free plan (up to 5 users)
   - Let users invite teammates → viral growth
   - Upgrade to paid when team > 5 users
   - Budget: $0
   - Timeline: 2 weeks to build

3. **Integration Partnerships (Medium Priority)**
   - Partner with Slack app directory
   - "TaskFlow for Slack" listing
   - Goal: 100 installs → 10 paying customers
   - Budget: $0
   - Timeline: 3 weeks

**My Recommendation:** Start with #1 (Content) because it's free and fits your ICP.
I can help you create a 30-day content plan. Want me to generate that?
`;

// 7. If founder says "Yes, create the plan", agent enters ACTION MODE
// 8. Agent generates artifact (30-day content plan table)
// 9. System saves artifact to Conversation.messages[].artifacts[]
// 10. Founder can export artifact or reference it later
```

---

## 5. Q-Score Algorithm (Detailed)

### 5.1 Calculation Formula

```javascript
function calculateQScore(assessment, metrics) {
  // Each dimension scored 0-100
  const market = calculateMarketScore(assessment);
  const product = calculateProductScore(assessment);
  const gtm = calculateGTMScore(assessment, metrics);
  const financial = calculateFinancialScore(metrics);
  const team = calculateTeamScore(assessment);
  const traction = calculateTractionScore(assessment, metrics);

  // Weighted average
  const overall = Math.round(
    market * 0.20 +      // 20% weight
    product * 0.18 +     // 18% weight
    gtm * 0.17 +         // 17% weight
    financial * 0.18 +   // 18% weight
    team * 0.15 +        // 15% weight
    traction * 0.12      // 12% weight
  );

  return {
    overall,
    breakdown: { market, product, gtm, financial, team, traction },
    tier: getTier(overall),
    nextTierPoints: getNextTierPoints(overall)
  };
}

function calculateMarketScore(assessment) {
  let score = 0;

  // Problem clarity (0-30 points)
  const problemLength = assessment.problemStory.length;
  if (problemLength > 500) score += 30;
  else if (problemLength > 300) score += 20;
  else if (problemLength > 100) score += 10;

  // TAM size (0-40 points)
  const tam = assessment.targetCustomers;
  if (tam > 100000) score += 40;
  else if (tam > 50000) score += 30;
  else if (tam > 10000) score += 20;
  else if (tam > 1000) score += 10;

  // ICP clarity (0-30 points)
  const icpLength = assessment.icpDescription.length;
  if (icpLength > 300) score += 30;
  else if (icpLength > 150) score += 20;
  else if (icpLength > 50) score += 10;

  return Math.min(score, 100);
}

function calculateProductScore(assessment) {
  let score = 0;

  // Solution articulation (0-40 points)
  const solutionLength = assessment.solutionDescription.length;
  if (solutionLength > 400) score += 40;
  else if (solutionLength > 200) score += 30;
  else if (solutionLength > 100) score += 20;

  // Customer conversations (0-60 points)
  const conversations = assessment.conversationCount;
  if (conversations > 100) score += 60;
  else if (conversations > 50) score += 50;
  else if (conversations > 25) score += 40;
  else if (conversations > 10) score += 30;
  else if (conversations > 5) score += 20;
  else if (conversations > 0) score += 10;

  return Math.min(score, 100);
}

function calculateGTMScore(assessment, metrics) {
  let score = 0;

  // Channels tested (0-30 points)
  const channelCount = assessment.channelsTried?.length || 0;
  if (channelCount >= 5) score += 30;
  else if (channelCount >= 3) score += 20;
  else if (channelCount >= 1) score += 10;

  // CAC efficiency (0-40 points)
  if (metrics.cac > 0) {
    if (metrics.ltvCacRatio > 5) score += 40;
    else if (metrics.ltvCacRatio > 3) score += 30;
    else if (metrics.ltvCacRatio > 1) score += 20;
    else score += 10;
  }

  // Repeatability (0-30 points)
  // If MRR growth is consistent (>10% MoM for 3 months), add points
  if (metrics.mrrGrowthRate > 0.15) score += 30;
  else if (metrics.mrrGrowthRate > 0.10) score += 20;
  else if (metrics.mrrGrowthRate > 0.05) score += 10;

  return Math.min(score, 100);
}

function calculateFinancialScore(metrics) {
  let score = 0;

  // Runway (0-30 points)
  if (metrics.runway > 18) score += 30;
  else if (metrics.runway > 12) score += 25;
  else if (metrics.runway > 6) score += 15;
  else score += 5;

  // Burn multiple (0-30 points)
  if (metrics.burnMultiple < 1) score += 30;
  else if (metrics.burnMultiple < 1.5) score += 25;
  else if (metrics.burnMultiple < 2) score += 20;
  else if (metrics.burnMultiple < 3) score += 10;

  // Unit economics (0-40 points)
  if (metrics.ltvCacRatio > 5) score += 40;
  else if (metrics.ltvCacRatio > 3) score += 30;
  else if (metrics.ltvCacRatio > 1) score += 20;
  else score += 10;

  return Math.min(score, 100);
}

function calculateTeamScore(assessment) {
  // For now, baseline score based on commitment
  let score = 50; // Base score

  if (assessment.timeCommitment === 'Full-time') score += 20;
  else if (assessment.timeCommitment === 'Part-time') score += 10;

  // TODO: Add more factors (co-founder count, experience, etc.)

  return Math.min(score, 100);
}

function calculateTractionScore(assessment, metrics) {
  let score = 0;

  // Revenue (0-50 points)
  const mrr = metrics.mrr || 0;
  if (mrr > 10000) score += 50;
  else if (mrr > 5000) score += 40;
  else if (mrr > 2000) score += 30;
  else if (mrr > 500) score += 20;
  else if (mrr > 0) score += 10;

  // Growth rate (0-30 points)
  if (metrics.mrrGrowthRate > 0.20) score += 30;
  else if (metrics.mrrGrowthRate > 0.15) score += 25;
  else if (metrics.mrrGrowthRate > 0.10) score += 20;
  else if (metrics.mrrGrowthRate > 0.05) score += 10;

  // Customer count (0-20 points)
  if (metrics.customers > 50) score += 20;
  else if (metrics.customers > 20) score += 15;
  else if (metrics.customers > 10) score += 10;
  else if (metrics.customers > 0) score += 5;

  return Math.min(score, 100);
}

function getTier(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 35) return 'Developing';
  return 'Early';
}

function getNextTierPoints(score) {
  if (score < 35) return 35 - score;
  if (score < 50) return 50 - score;
  if (score < 65) return 65 - score;
  if (score < 80) return 80 - score;
  return 0; // Already at top tier
}
```

### 5.2 Q-Score Tiers & Implications

| Tier | Score | Description | Investor Readiness | Recommended Focus |
|------|-------|-------------|-------------------|-------------------|
| **Excellent** | 80-100 | Strong traction, efficient growth, fundable | Ready to fundraise | Scale existing channels |
| **Good** | 65-79 | Product-market fit validated, growing sustainably | Nearly ready, polish pitch | Improve weakest dimension |
| **Fair** | 50-64 | Early traction, needs improvement | Not yet, focus on execution | Fix unit economics |
| **Developing** | 35-49 | Building MVP, early customer discovery | Too early | Validate problem/solution |
| **Early** | 0-34 | Idea stage, limited execution | Way too early | Talk to customers |

---

## 6. Technical Architecture

### 6.1 Frontend Architecture

```
app/
├── (auth)/
│   ├── login/
│   ├── signup/
│   └── forgot-password/
│
├── founder/
│   ├── onboarding/          # Stage 1: Profile collection
│   ├── assessment/          # Stage 1: Q-Score assessment
│   ├── dashboard/           # Stage 2: Overview
│   ├── profile/             # Stage 2: Profile builder
│   ├── metrics/             # Stage 2: Metrics tracker
│   ├── improve-qscore/      # Stage 2: Improvement guide
│   ├── agents/
│   │   └── [agentId]/       # Stage 3: Agent chat
│   ├── tasks/               # Stage 3: Task management
│   ├── investors/           # Stage 4: Investor matching
│   ├── messages/            # Stage 4: Investor messaging
│   └── settings/            # Account settings
│
├── investor/
│   ├── onboarding/          # Investor profile
│   ├── dashboard/           # Deal flow overview
│   ├── matches/             # Matched founders
│   ├── messages/            # Founder conversations
│   └── pipeline/            # Deal pipeline
│
└── api/
    ├── auth/                # Authentication
    ├── qscore/              # Q-Score calculation
    ├── agents/
    │   └── chat/            # Agent chat endpoint
    ├── metrics/             # Metrics CRUD
    ├── matches/             # Investor matching
    └── messages/            # Messaging endpoints

lib/
├── services/
│   ├── storage.service.ts   # Data persistence
│   ├── metrics.service.ts   # Metrics calculations
│   ├── qscore.service.ts    # Q-Score algorithm
│   └── matching.service.ts  # Investor matching
│
├── hooks/
│   ├── useFounderData.ts    # Founder profile + assessment
│   ├── useMetrics.ts        # Metrics data
│   ├── useQScore.ts         # Q-Score data
│   └── useMatches.ts        # Investor matches
│
├── types/
│   ├── founder.types.ts     # Founder-related types
│   ├── investor.types.ts    # Investor-related types
│   └── agent.types.ts       # Agent-related types
│
└── utils/
    ├── ai.ts                # Groq API client
    └── validation.ts        # Form validation
```

### 6.2 Database Schema (Supabase/PostgreSQL)

```sql
-- Founders
CREATE TABLE founders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Onboarding
  stage VARCHAR(50),
  funding VARCHAR(50),
  time_commitment VARCHAR(50),

  -- Company
  startup_name VARCHAR(255),
  industry VARCHAR(100),
  description TEXT,
  founded_date DATE
);

-- Assessments (immutable history)
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  founder_id UUID REFERENCES founders(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  version INT NOT NULL, -- 1, 2, 3...

  -- Raw responses
  problem_story TEXT,
  target_customers INT,
  icp_description TEXT,
  solution_description TEXT,
  conversation_count INT,
  channels_tried TEXT[], -- array of strings
  mrr DECIMAL(10,2),
  monthly_burn DECIMAL(10,2),
  current_revenue DECIMAL(10,2),
  growth_rate DECIMAL(5,2),

  -- Calculated Q-Score
  q_score_overall INT,
  q_score_market INT,
  q_score_product INT,
  q_score_gtm INT,
  q_score_financial INT,
  q_score_team INT,
  q_score_traction INT,

  UNIQUE(founder_id, version)
);

-- Metrics (weekly snapshots)
CREATE TABLE metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  founder_id UUID REFERENCES founders(id) ON DELETE CASCADE,
  week_of DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Core metrics
  mrr DECIMAL(10,2),
  arr DECIMAL(10,2),
  burn DECIMAL(10,2),
  runway INT, -- months
  customers INT,
  average_deal_size DECIMAL(10,2),
  cac DECIMAL(10,2),
  ltv DECIMAL(10,2),
  ltv_cac_ratio DECIMAL(5,2),
  gross_margin DECIMAL(5,2),
  burn_multiple DECIMAL(5,2),

  -- Growth metrics
  mrr_growth_rate DECIMAL(5,4),
  customer_growth_rate DECIMAL(5,4),
  churn_rate DECIMAL(5,4),

  -- Health
  health_status VARCHAR(20), -- 'healthy', 'warning', 'critical'

  UNIQUE(founder_id, week_of)
);

-- Agent Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  founder_id UUID REFERENCES founders(id) ON DELETE CASCADE,
  agent_id VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Context snapshot (JSON)
  context_snapshot JSONB
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Artifacts (JSON array)
  artifacts JSONB
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  founder_id UUID REFERENCES founders(id) ON DELETE CASCADE,
  agent_id VARCHAR(50),
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE,
  priority VARCHAR(10), -- 'P0', 'P1', 'P2', 'P3'
  status VARCHAR(20) DEFAULT 'todo', -- 'todo', 'in_progress', 'completed'
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Investors
CREATE TABLE investors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  firm VARCHAR(255),
  title VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),

  -- Investment preferences
  check_size_min INT,
  check_size_max INT,
  stages TEXT[],
  industries TEXT[],
  geography TEXT[],
  thesis_focus TEXT,
  dealflow_capacity INT, -- per month

  -- Matching settings
  minimum_q_score INT DEFAULT 50,
  preferred_metrics JSONB
);

-- Matches
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  founder_id UUID REFERENCES founders(id) ON DELETE CASCADE,
  investor_id UUID REFERENCES investors(id) ON DELETE CASCADE,
  score INT NOT NULL, -- 0-100
  created_at TIMESTAMP DEFAULT NOW(),

  -- Match reasoning
  reasons JSONB,

  status VARCHAR(50) DEFAULT 'pending',

  UNIQUE(founder_id, investor_id)
);

-- Investor Messages
CREATE TABLE investor_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type VARCHAR(20) NOT NULL, -- 'founder' or 'investor'
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP,

  -- Attachments
  attachments JSONB
);

-- Indexes
CREATE INDEX idx_assessments_founder ON assessments(founder_id, version DESC);
CREATE INDEX idx_metrics_founder_week ON metrics(founder_id, week_of DESC);
CREATE INDEX idx_conversations_founder ON conversations(founder_id, updated_at DESC);
CREATE INDEX idx_tasks_founder_status ON tasks(founder_id, status);
CREATE INDEX idx_matches_founder ON matches(founder_id, status);
CREATE INDEX idx_matches_investor ON matches(investor_id, status);
```

### 6.3 API Endpoints

```typescript
// Authentication
POST   /api/auth/signup          // Create account
POST   /api/auth/login           // Login
POST   /api/auth/logout          // Logout
GET    /api/auth/me              // Get current user

// Onboarding
POST   /api/onboarding/profile   // Save founder profile
POST   /api/onboarding/assessment // Submit Q-Score assessment

// Q-Score
GET    /api/qscore               // Get current Q-Score
POST   /api/qscore/calculate     // Recalculate Q-Score
GET    /api/qscore/history       // Get Q-Score history (all versions)

// Profile
GET    /api/profile              // Get founder profile
PATCH  /api/profile              // Update profile

// Metrics
GET    /api/metrics              // Get latest metrics
GET    /api/metrics/history      // Get metrics history (weekly)
POST   /api/metrics              // Create weekly metrics snapshot
PATCH  /api/metrics/:id          // Update metrics

// Agents
POST   /api/agents/chat          // Send message to agent
GET    /api/agents/:id/conversations // Get conversation history
POST   /api/agents/:id/action    // Trigger action mode

// Tasks
GET    /api/tasks                // Get all tasks
POST   /api/tasks                // Create task
PATCH  /api/tasks/:id            // Update task status
DELETE /api/tasks/:id            // Delete task

// Investor Matching
GET    /api/matches              // Get matched investors
POST   /api/matches/:id/request  // Request intro
GET    /api/matches/:id/status   // Check intro status

// Messaging
GET    /api/messages/:matchId    // Get messages with investor
POST   /api/messages/:matchId    // Send message
PATCH  /api/messages/:id/read    // Mark as read

// Investor (separate routes)
GET    /api/investor/matches     // Get matched founders
POST   /api/investor/matches/:id/accept // Accept intro
POST   /api/investor/matches/:id/decline // Decline intro
GET    /api/investor/pipeline    // Get deal pipeline
```

---

## 7. Key Product Decisions

### 7.1 Why Chat-Based Agents?

**Decision:** All agents are conversational (chat interface) rather than form-based wizards.

**Reasoning:**
- More natural for founders (like talking to an advisor)
- Allows for clarifying questions and iterative refinement
- Can handle diverse questions without rigid structure
- Easier to add new agent capabilities (just update system prompt)

**Trade-off:** Harder to enforce structured outputs, but we solve this with "Action Mode" where agents generate artifacts.

### 7.2 Why Action Mode for Deliverables?

**Decision:** Agents can switch to "Action Mode" to generate structured artifacts (plans, matrices, outlines).

**Example:**
```
Founder: "Can you create a 30-day GTM plan for me?"
Agent: [Enters Action Mode]
Agent: [Generates table with weeks, channels, tactics, budgets]
Agent: [Saves as artifact]
Agent: "Here's your 30-day plan. I can update it as you make progress."
```

**Benefits:**
- Best of both worlds: conversational + structured outputs
- Artifacts can be exported (PDF, Notion, etc.)
- Can be referenced in future conversations

### 7.3 Why Weekly Metrics Snapshots?

**Decision:** Metrics are stored as weekly snapshots (not just latest value).

**Reasoning:**
- Enables trend analysis (MRR growth over time)
- Historical context for agents ("Your CAC was $500 last month, now $350")
- Founder can see progress visually
- Supports "time travel" (what was my Q-Score 3 months ago?)

### 7.4 Why Q-Score > 50 for Investor Matching?

**Decision:** Founders need Q-Score > 50 to unlock investor matching.

**Reasoning:**
- Protects investors from wasting time on too-early founders
- Incentivizes founders to improve before fundraising
- 50 = "Fair" tier = minimum viable fundability
- Can be adjusted per investor (some may accept 45+)

### 7.5 Why Immutable Assessments?

**Decision:** Each Q-Score assessment is a new row (version 1, 2, 3...) rather than updating existing row.

**Reasoning:**
- Preserves history (can see how founder evolved)
- Supports A/B testing of Q-Score algorithm (recalculate past scores)
- Audit trail for compliance
- Enables "Q-Score timeline" feature

---

## 8. Success Metrics & KPIs

### 8.1 Product Metrics

| Metric | Definition | Target | Why It Matters |
|--------|-----------|--------|----------------|
| Q-Score Completion Rate | % of users who finish assessment | >80% | Measures onboarding friction |
| Average Q-Score | Mean Q-Score across all users | 45-50 | Too low = bad targeting, too high = not helping enough |
| Q-Score Improvement | Avg points gained in 90 days | +15 | Proves product value |
| Agent Engagement | Avg messages per user per week | >10 | Core product usage |
| Task Completion Rate | % of agent-generated tasks completed | >60% | Measures execution |
| Investor Match Acceptance | % of intro requests accepted | >40% | Match quality signal |
| Time to First Intro | Days from signup to first intro request | <14 | Activation metric |

### 8.2 Business Metrics

| Metric | Definition | Target | Why It Matters |
|--------|-----------|--------|----------------|
| User Acquisition | New founders per month | 1,000 (Month 6) | Growth rate |
| Activation Rate | % who complete assessment | >75% | Product-market fit signal |
| Weekly Active Users | % returning each week | >50% | Retention |
| Paid Conversion | % upgrading to premium | 15% | Revenue potential |
| NPS Score | Net Promoter Score | >50 | User satisfaction |
| MRR | Monthly recurring revenue | $50K (Month 12) | Business viability |
| CAC Payback | Months to recover CAC | <6 | Unit economics |

---

## 9. Open Questions & Future Exploration

### 9.1 Monetization Strategy

**Option 1: Freemium**
- Free: Q-Score + 1 agent + basic dashboard
- Premium ($49/mo): All agents + investor matching + priority support
- Pro ($199/mo): + Advanced analytics + cohort access + mentor office hours

**Option 2: Usage-Based**
- Free: Q-Score assessment
- Pay-per-agent: $10/month per agent
- Investor intros: $50 per intro request

**Option 3: Investor-Funded**
- Free for founders
- Investors pay $500/mo for deal flow access
- Revenue share on successful investments

**Decision Needed:** Test with early users to see willingness to pay.

### 9.2 Agent Collaboration

**Question:** Should multiple agents be able to work together?

**Example:**
```
Founder: "I need to improve my unit economics before fundraising."

System: [Assigns GTM Strategist + Metrics Analyzer]

GTM Strategist: "Let's lower your CAC by testing organic channels."
Metrics Analyzer: "If we get CAC from $350 to $200, your LTV:CAC goes from 6.9 to 12."
GTM Strategist: "Great, so we need to save $150 per customer. Here's a plan..."
```

**Benefits:** More comprehensive advice, faster problem-solving
**Challenges:** UI complexity, potential confusion, higher costs

### 9.3 Automated Data Sync

**Question:** Should we integrate with Stripe, Google Analytics, etc. to auto-update metrics?

**Pros:**
- No manual data entry
- Real-time metrics
- More accurate

**Cons:**
- Complex integrations
- Privacy concerns
- Founders may not use these tools yet

**Decision:** Start manual, add integrations later (v2).

### 9.4 Geographic Expansion

**Question:** Launch globally or US-only first?

**Considerations:**
- Investor networks are regional (US VCs prefer US startups)
- Language barriers for non-English founders
- Payment processing complexity (Stripe limited in some countries)

**Recommendation:** Start US-only, expand to UK/EU in 6 months.

---

## 10. Roadmap & Milestones

### Phase 1: MVP Foundation ✅ (Weeks 1-8) - COMPLETE
- [x] Onboarding flow
- [x] Q-Score assessment & calculation
- [x] Dashboard with Q-Score breakdown
- [x] 6 AI agents with context awareness
- [x] Profile builder & metrics tracker
- [x] Settings page
- [x] Mock data testing infrastructure

### Phase 2: Production Launch 🚧 (Weeks 9-16) - IN PROGRESS
- [ ] Database integration (Supabase)
- [ ] Authentication (email/password, Google OAuth)
- [ ] Q-Score API (server-side calculation)
- [ ] Metrics history tracking (weekly snapshots)
- [ ] Agent conversation persistence
- [ ] Task management system
- [ ] Deploy to production (Vercel)

### Phase 3: Investor Network (Weeks 17-24)
- [ ] Investor onboarding flow
- [ ] Matching algorithm implementation
- [ ] Investor dashboard
- [ ] Messaging system (founder <-> investor)
- [ ] Intro request workflow
- [ ] Email notifications
- [ ] Recruit 50 investors (manual outreach)

### Phase 4: Growth & Scale (Weeks 25-40)
- [ ] Advanced analytics (trends, benchmarks)
- [ ] Agent action mode (generate artifacts)
- [ ] Community features (cohorts, forums)
- [ ] Mobile app (React Native)
- [ ] Integrations (Stripe, Google Analytics)
- [ ] Premium tier launch

---

## 11. Current Status & Next Steps

### Current State (v0.5)
- ✅ MVP complete with all core features
- ✅ Clean architecture (service layer, hooks, types)
- ✅ 6 context-aware AI agents
- ✅ Q-Score calculation working locally
- ⚠️ Using localStorage (no database yet)
- ⚠️ No authentication (open access)
- ⚠️ No investor network (mocked data)

### Immediate Next Steps (This Week)
1. **Set up Supabase** - Create database, tables, RLS policies
2. **Implement authentication** - Sign up, login, protected routes
3. **Migrate to database** - Replace localStorage with Supabase queries
4. **Deploy to staging** - Vercel deployment, test end-to-end

### Critical Path to Launch (Next 6 Weeks)
```
Week 1-2: Database + Auth
Week 3-4: Metrics history + Q-Score API
Week 5-6: Polish UI, fix bugs, user testing
Week 7: Production launch
```

---

**Document Version:** 2.0
**Last Updated:** February 4, 2026
**Owner:** Product Team
**Status:** Active Development

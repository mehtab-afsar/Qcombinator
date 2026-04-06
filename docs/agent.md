# Edge Alpha — CXO Agent System v2
## State-of-the-Art Multi-Agent Architecture

> This is a complete redesign. The v1 system was a document generator with 9 system prompts. v2 is a true multi-agent system: agents that plan, gather real data, reason across sources, evaluate their own output, coordinate with each other, and act proactively without being asked.

---

## The Core Difference

| | v1 (Current) | v2 (This Spec) |
|---|---|---|
| What an "agent" is | A system prompt + one LLM call | A planning/gather/reason/generate/evaluate loop |
| Tool use | Regex XML detection on LLM text | Native SDK tool calls with typed schemas |
| Data | Hallucinated from context | Real: web search, Stripe, Hunter.io, DB |
| Output quality | One-shot, no evaluation | Evaluator pass + auto-regen if quality < threshold |
| Cross-agent | Text dump injection | Typed structured handoffs |
| Streaming | Non-streaming, 8-15s wait | Token-by-token streaming, <1s first token |
| Proactivity | Passive — waits to be asked | Active — monitors, alerts, suggests |
| Memory | All artifacts injected always | Semantic similarity retrieval, top 5 relevant |

---

## 1. System Architecture

### 1.1 The Agent Loop (Replaces Single LLM Call)

Every agent runs as an async generator loop. It does not make one call and return. It plans, gathers, reasons, generates, and evaluates — then either accepts the output or refines it.

```
┌─────────────────────────────────────────────────────────┐
│                    AGENT TURN                           │
│                                                         │
│  1. PLAN       What do I need to know first?            │
│       ↓        (tool calls to gather before generating) │
│  2. GATHER     Run tools concurrently where possible    │
│       ↓        web_research, stripe_sync, DB queries    │
│  3. REASON     Synthesize gathered data + founder ctx   │
│       ↓        Internal reasoning block (thinking mode) │
│  4. GENERATE   Produce structured artifact JSON         │
│       ↓        Native tool_use call → validated schema  │
│  5. EVALUATE   Score quality on dimensions (0–100)      │
│       ↓        reasoning model reads artifact           │
│  6. ACCEPT     qualityScore ≥ 75 → ship it             │
│     or REFINE  qualityScore < 75 → one more pass        │
│                with specific gap instructions           │
└─────────────────────────────────────────────────────────┘
```

```typescript
// lib/agents/agentLoop.ts
async function* runAgent(
  agentId: AgentId,
  messages: ChatMessage[],
  context: AgentContext,
): AsyncGenerator<StreamChunk> {

  const tools = AGENT_TOOL_REGISTRY[agentId]
  let attempt = 0

  while (true) {
    const toolUses: ToolUse[] = []

    // Stream tokens to UI as they arrive
    for await (const event of anthropic.messages.stream({
      model: ROUTING_TABLE[getTaskClass(agentId)].model,
      system: buildAgentSystemPrompt(agentId, context),
      messages: normalizeMessages(messages),
      tools,
      thinking: { type: 'enabled', budget_tokens: 5000 },
    })) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { type: 'text', delta: event.delta.text }
      }
      if (event.type === 'content_block_stop' && event.content_block.type === 'tool_use') {
        toolUses.push(event.content_block)
      }
    }

    // No tool calls = final response, exit loop
    if (toolUses.length === 0) break

    // Partition: read-only tools run concurrently, writes run serially
    const results = await executeTools(toolUses, context)
    messages = [...messages, ...toolResultsToMessages(results)]

    // If an artifact was just created, run evaluator
    const artifactResult = results.find(r => r.type === 'artifact_created')
    if (artifactResult && attempt < 2) {
      const evaluation = await evaluateArtifact(artifactResult.artifact, agentId, context)
      yield { type: 'evaluation', score: evaluation.qualityScore, gaps: evaluation.gaps }

      if (evaluation.qualityScore < 75) {
        attempt++
        messages = [...messages, buildRefinementMessage(evaluation)]
        continue // loop again with refinement instruction
      }
    }
    // qualityScore ≥ 75 or attempt limit reached → accept
  }
}
```

### 1.2 Tool Execution: Concurrent Reads, Serial Writes

Tools declare whether they are read-only (safe to run in parallel) or mutating (must run serially).

```typescript
// lib/tools/toolRegistry.ts

interface AgentTool<TInput, TOutput> {
  name: string
  description: string
  inputSchema: z.ZodType<TInput>
  isReadOnly: boolean           // true = can run in parallel batch
  isConcurrencySafe: boolean    // true = safe alongside other tools
  execute: (input: TInput, context: AgentContext) => Promise<TOutput>
  renderProgress?: (input: TInput) => string  // shown to user while running
}

// Execution partitioner (mirrors Claude Code's toolOrchestration.ts)
async function executeTools(toolUses: ToolUse[], context: AgentContext) {
  const batches = partitionIntoBatches(toolUses, context)
  const results = []

  for (const batch of batches) {
    if (batch.isReadOnly) {
      // Run all read-only tools in the batch concurrently
      const batchResults = await Promise.all(
        batch.tools.map(t => executeSingleTool(t, context))
      )
      results.push(...batchResults)
    } else {
      // Run mutating tools one at a time
      for (const tool of batch.tools) {
        results.push(await executeSingleTool(tool, context))
      }
    }
  }
  return results
}
```

### 1.3 LLM Routing Layer

Different tasks use different models. Extraction needs precision. Generation needs creativity. Evaluation needs analytical depth. Classification needs speed.

```typescript
// lib/llm/router.ts
const ROUTING_TABLE = {
  extraction:     { model: 'claude-sonnet-4-6', temperature: 0.1, maxTokens: 2048 },
  generation:     { model: 'claude-sonnet-4-6', temperature: 0.7, maxTokens: 8192 },
  reasoning:      { model: 'claude-opus-4-6',   temperature: 0.2, maxTokens: 4096 },
  classification: { model: 'claude-haiku-4-5',  temperature: 0.0, maxTokens: 512  },
  summarisation:  { model: 'claude-haiku-4-5',  temperature: 0.3, maxTokens: 1024 },
}
```

### 1.4 Semantic Memory (Replaces Text Dump Injection)

Artifacts are embedded on creation. Each agent call retrieves only the top 5 most relevant artifacts via cosine similarity — not everything, always.

```typescript
// lib/memory/agentMemory.ts

interface ArtifactMemoryRecord {
  id: string
  agentId: AgentId
  artifactType: ArtifactType
  summaryHeader: string          // AI-generated 3-sentence summary
  keyFields: Record<string, string>
  embeddingVector: number[]      // generated on artifact creation
  createdAt: Date
}

async function getRelevantContext(
  currentConversation: ChatMessage[],
  founderArtifacts: ArtifactMemoryRecord[],
): Promise<string> {
  const lastUserMessage = currentConversation.at(-1)?.content ?? ''
  const queryEmbedding = await embed(lastUserMessage)

  const topArtifacts = founderArtifacts
    .map(a => ({ a, score: cosineSimilarity(queryEmbedding, a.embeddingVector) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, 5)
    .map(s => s.a)

  return topArtifacts
    .map(a => `[${a.agentId.toUpperCase()} — ${a.artifactType}]\n${a.summaryHeader}\n${JSON.stringify(a.keyFields)}`)
    .join('\n\n')
}
// Max context from memory: ~1500 tokens, always relevant, bounded forever
```

### 1.5 Evaluator System

Every artifact is evaluated by a separate reasoning-model call before being shown to the founder. If quality is below threshold, the agent loop runs one more time with specific gap instructions.

```typescript
// lib/agents/evaluator.ts

const EVALUATOR_PROMPTS: Record<ArtifactType, string> = {
  icp_profile: `
    Evaluate this ICP document on these dimensions (score each 0–25):
    1. Specificity: Are firmographics concrete (named industries, exact company sizes, real tech stacks)?
    2. Evidence: Are pain points backed by real customer signals, not assumptions?
    3. Actionability: Can a sales rep use this to qualify a lead in 60 seconds?
    4. Differentiation: Does the ICP explain why THIS product, not a competitor?
    Return JSON: { qualityScore: number, dimensions: {...}, gaps: string[], shouldRegenerate: boolean }
  `,
  financial_summary: `
    Evaluate on: (1) Data completeness — are MRR/burn/runway all present?
    (2) Consistency — does burn × runway = cash balance implied?
    (3) VC-readiness — would an investor trust these numbers or ask clarifying questions?
    (4) Actionability — are recommendations specific (raise $X in Y months, not "consider fundraising")?
  `,
  // ... one evaluator prompt per artifact type
}

async function evaluateArtifact(
  artifact: ArtifactContent,
  agentId: AgentId,
  context: AgentContext,
): Promise<EvaluationResult> {
  const prompt = EVALUATOR_PROMPTS[artifact.type]
  const result = await routedCall('reasoning', [
    { role: 'system', content: prompt },
    { role: 'user', content: `ARTIFACT:\n${JSON.stringify(artifact, null, 2)}\n\nFOUNDER:\n${context.founderSummary}` },
  ])
  return JSON.parse(result)
}
```

---

## 2. The Tool Registry

Every tool is a typed, validated contract. The LLM calls tools by name with structured input. Input is Zod-validated before execution. Results are typed.

### 2.1 Research Tools (Read-Only — Run Concurrently)

```typescript
const webResearchTool: AgentTool<WebResearchInput, WebResearchOutput> = {
  name: 'web_research',
  description: 'Search the web for real-time information about companies, markets, competitors, or any topic. Use this BEFORE generating any market-dependent artifact.',
  isReadOnly: true,
  isConcurrencySafe: true,
  inputSchema: z.object({
    query: z.string().describe('Search query — be specific'),
    intent: z.enum(['competitor_intel', 'market_size', 'pricing', 'news', 'hiring', 'reviews']),
    maxResults: z.number().default(5),
  }),
  execute: async ({ query, intent, maxResults }) => {
    const results = await tavilySearch(query, { maxResults })
    return { results, intent, timestamp: new Date() }
  },
  renderProgress: ({ query }) => `Searching: "${query}"`,
}

const leadEnrichTool: AgentTool<LeadEnrichInput, LeadEnrichOutput> = {
  name: 'lead_enrich',
  description: 'Find real contact data for companies matching an ICP. Returns names, titles, emails, LinkedIn URLs.',
  isReadOnly: true,
  isConcurrencySafe: true,
  inputSchema: z.object({
    domain: z.string().optional(),
    companyCriteria: z.object({
      industry: z.string(),
      sizeMin: z.number().optional(),
      sizeMax: z.number().optional(),
      technologies: z.array(z.string()).optional(),
    }).optional(),
    targetTitles: z.array(z.string()),
    limit: z.number().default(20),
  }),
  execute: async (input) => hunterSearch(input),
}

const stripeSyncTool: AgentTool<StripeSyncInput, StripeSyncOutput> = {
  name: 'stripe_sync',
  description: 'Pull live MRR, ARR, customer count, churn rate directly from Stripe. Requires founder-provided restricted key.',
  isReadOnly: true,
  isConcurrencySafe: true,
  inputSchema: z.object({
    restrictedKey: z.string().regex(/^rk_/),
  }),
  execute: async ({ restrictedKey }) => {
    const data = await fetchStripeMetrics(restrictedKey)
    // key used once, never stored
    return data
  },
}

const dbQueryTool: AgentTool<DBQueryInput, DBQueryOutput> = {
  name: 'db_query',
  description: 'Query the founder database for artifacts, score history, survey responses, deals, or activity.',
  isReadOnly: true,
  isConcurrencySafe: true,
  inputSchema: z.object({
    table: z.enum(['agent_artifacts', 'qscore_history', 'survey_responses', 'deals', 'agent_activity']),
    filters: z.record(z.unknown()),
    limit: z.number().default(10),
    orderBy: z.string().optional(),
  }),
  execute: async ({ table, filters, limit, orderBy }, context) => {
    return supabase.from(table).select('*').match(filters).limit(limit).order(orderBy ?? 'created_at', { ascending: false })
  },
}

const benchmarkLookupTool: AgentTool<BenchmarkInput, BenchmarkOutput> = {
  name: 'benchmark_lookup',
  description: 'Look up industry benchmarks: median LTV:CAC by sector, P&L norms, burn multiples, NDR percentiles.',
  isReadOnly: true,
  isConcurrencySafe: true,
  inputSchema: z.object({
    metric: z.enum(['ltv_cac', 'burn_multiple', 'ndr', 'gross_margin', 'arr_growth', 'sales_cycle']),
    sector: z.string(),
    stage: z.enum(['early', 'mid', 'growth']),
  }),
  execute: async (input) => getBenchmarkData(input),
}
```

### 2.2 Computation Tools (Read-Only — Run Concurrently)

```typescript
const unitEconomicsCalculator: AgentTool<UnitEconInput, UnitEconOutput> = {
  name: 'calculate_unit_economics',
  description: 'Compute LTV, CAC, payback period, burn multiple, rule-of-40. Provide raw numbers, get derived metrics.',
  isReadOnly: true,
  isConcurrencySafe: true,
  inputSchema: z.object({
    mrr: z.number().optional(),
    customers: z.number().optional(),
    churnRate: z.number().optional(),  // monthly, 0–1
    cac: z.number().optional(),
    grossMargin: z.number().optional(),  // 0–1
    monthlyBurn: z.number().optional(),
    newMrrPerMonth: z.number().optional(),
  }),
  execute: async (input) => computeUnitEconomics(input),
}

const financialProjectionTool: AgentTool<ProjectionInput, ProjectionOutput> = {
  name: 'financial_projection',
  description: 'Build a 24-month revenue/expense/burn projection with Base/Bear/Bull scenarios.',
  isReadOnly: true,
  isConcurrencySafe: true,
  inputSchema: z.object({
    currentMrr: z.number(),
    monthlyGrowthRate: z.number(),  // 0–1
    monthlyBurn: z.number(),
    grossMargin: z.number(),
    scenarios: z.object({
      base: z.object({ growthMultiplier: z.number() }),
      bear: z.object({ growthMultiplier: z.number() }),
      bull: z.object({ growthMultiplier: z.number() }),
    }).optional(),
  }),
  execute: async (input) => buildFinancialModel(input),
}

const dealScorerTool: AgentTool<DealScorerInput, DealScorerOutput> = {
  name: 'score_deal',
  description: 'AI-score a sales deal 0–100 based on qualification signals, activity recency, stakeholder access, and budget confirmation.',
  isReadOnly: true,
  isConcurrencySafe: true,
  inputSchema: z.object({
    deal: z.object({
      company: z.string(),
      contactTitle: z.string(),
      dealSize: z.number().optional(),
      stage: z.string(),
      lastActivityDays: z.number(),
      hasBudgetConfirmed: z.boolean(),
      hasChampion: z.boolean(),
      competitorsInvolved: z.array(z.string()).optional(),
    }),
  }),
  execute: async ({ deal }) => scoreDeal(deal),
}
```

### 2.3 Artifact Creation Tools (Mutating — Run Serially)

One tool per artifact type. All validated against strict Zod schemas.

```typescript
// Each artifact tool follows this pattern:
const createIcpProfileTool: AgentTool<IcpProfileInput, ArtifactCreatedOutput> = {
  name: 'create_icp_profile',
  description: 'Create and save a structured ICP (Ideal Customer Profile) artifact. Call this ONLY after gathering real market data with web_research and lead_enrich.',
  isReadOnly: false,
  isConcurrencySafe: false,
  inputSchema: z.object({
    firmographics: z.object({
      companySize: z.string(),
      annualRevenue: z.string().optional(),
      industry: z.string(),
      subIndustry: z.string().optional(),
      geography: z.array(z.string()),
      techStack: z.array(z.string()),
      teamSize: z.string().optional(),
    }),
    buyerPersona: z.object({
      title: z.string(),
      seniorityLevel: z.enum(['C-level', 'VP', 'Director', 'Manager', 'IC']),
      dayInLife: z.string().min(100),  // enforces substance
      goals: z.array(z.string()).min(3),
      frustrations: z.array(z.string()).min(3),
      successMetrics: z.array(z.string()),
    }),
    painPoints: z.array(z.object({
      point: z.string(),
      severity: z.enum(['critical', 'high', 'medium']),
      currentWorkaround: z.string(),
      costOfProblem: z.string().optional(),
    })).min(3),
    buyingTriggers: z.array(z.object({
      trigger: z.string(),
      urgencyLevel: z.enum(['immediate', 'within_quarter', 'within_year']),
    })),
    channels: z.array(z.object({
      channel: z.string(),
      priority: z.enum(['primary', 'secondary', 'experimental']),
      rationale: z.string(),
    })),
    qualificationCriteria: z.object({
      mustHave: z.array(z.string()).min(3),
      niceToHave: z.array(z.string()),
      dealBreakers: z.array(z.string()),
    }),
    realLeadsFound: z.array(z.object({
      company: z.string(),
      contact: z.string().optional(),
      relevanceReason: z.string(),
    })).optional(),
    marketDataSources: z.array(z.string()),  // URLs of web research used
  }),
  execute: async (input, context) => {
    const artifact = await saveArtifact('icp_profile', input, context)
    await applyAgentScoreSignal(context.userId, 'patel', 'icp_profile')
    await createEmbedding(artifact)  // for semantic memory
    return { type: 'artifact_created', artifact }
  },
}
```

---

## 3. Agent Designs (v2)

### 3.1 Patel — CMO (Go-to-Market)

**What actually happens now:** Patel gathers real competitive and market data before writing anything. An ICP is not hallucinated — it is built from web research on real companies in the target market, enriched with real contacts from Hunter.io, and cross-referenced against Atlas's competitive matrix if available.

**Available tools:**
```
RESEARCH PHASE (concurrent):
  web_research(query, intent='competitor_intel')   → real competitor positioning
  web_research(query, intent='market_size')        → TAM evidence
  web_research(query, intent='pricing')            → competitor pricing
  lead_enrich(criteria, targetTitles)              → real contact list
  db_query(table='agent_artifacts', filters={agent_id:'atlas'})  → Atlas's competitive matrix
  benchmark_lookup(metric='sales_cycle', sector, stage)

ARTIFACT CREATION PHASE (serial):
  create_icp_profile(validated_data)
  create_outreach_sequence(validated_data)
  create_gtm_playbook(validated_data)
```

**Agent loop walkthrough — ICP generation:**

```
Turn 1 (founder): "Build me an ICP for my B2B HR tech product"

Patel's plan (thinking block, hidden):
  "I need real market data before I can build a credible ICP.
   I'll search for: (1) who buys HR tech, (2) what competitors target,
   (3) what HR leaders actually complain about publicly.
   I'll also check if Atlas already ran competitive research I can use."

Tool calls (CONCURRENT — all fire at once):
  → web_research("HR tech B2B buyer persona 2025 complaints G2 reviews", intent='competitor_intel')
  → web_research("Rippling Workday BambooHR target customer segment ICP", intent='competitor_intel')
  → web_research("HR Director VP People pain points hiring 2025", intent='reviews')
  → db_query(table='agent_artifacts', filters={user_id: X, agent_id: 'atlas'})
  → benchmark_lookup(metric='sales_cycle', sector='hr_tech', stage='mid')
  → lead_enrich(criteria={industry:'technology', size:'100-500'}, targetTitles=['VP People','CPO','CHRO'])

[All 6 calls resolve concurrently — ~3s total]

Patel receives:
  - 15 real G2 reviews of competitor HR tools with specific complaints
  - Atlas's competitive matrix (if exists) with positioning gaps
  - Median sales cycle for HR tech: 67 days
  - 23 real contacts: VP People at Stripe, Notion, Linear, etc.

Turn 2 (Patel reasons internally):
  "G2 reviews show the #1 complaint is 'takes 3 months to implement'.
   Sales cycle data confirms 67-day average. Atlas found no competitor
   targeting sub-200-person companies with <1-week setup. That's the gap.
   ICP: 50-200 person tech companies, CPO/VP People, buying trigger =
   headcount crossing 50 (usually triggers HRIS need). Differentiation =
   setup time, not features."

Tool call (SERIAL — mutating):
  → create_icp_profile({
      firmographics: { companySize: '50-200', industry: 'technology', ... },
      buyerPersona: { title: 'VP People', dayInLife: '...200 word description...', ... },
      painPoints: [
        { point: 'Current tool takes 3 months to implement', severity: 'critical',
          currentWorkaround: 'Google Sheets + manual onboarding', costOfProblem: '$12K/hire in HR time' },
        ...
      ],
      marketDataSources: ['g2.com/rippling-reviews', 'linkedin.com/...'],
      realLeadsFound: [{ company: 'Notion', contact: 'Sarah Chen, VP People', ... }],
    })

EVALUATOR runs:
  Score: 87/100 (Specificity: 22, Evidence: 23, Actionability: 21, Differentiation: 21)
  → Above threshold, artifact accepted

Response to founder: "Here's your ICP. I found it by reading 15 real competitor reviews 
and looking at what HR leaders actually complain about. The key insight: nobody targets 
50-200 person companies who need <1-week setup. I also found 23 real contacts..."
```

**Proactive behavior:**
- When Atlas creates a new Competitive Matrix → Patel auto-detects via event bus → "Atlas just found a new competitor targeting your ICP. Want me to update the outreach sequence with new positioning?"
- When Nova's PMF survey shows a new pain point cluster → "Nova's survey found founders care most about X. Your current ICP emphasises Y. Want me to update it?"

---

### 3.2 Atlas — Chief Strategy Officer (Competitive Intelligence)

**What actually happens now:** Atlas is the only agent with real-time web access as a default. Every competitive artifact is built from live data — actual competitor websites, live pricing pages, G2/Capterra reviews scraped at generation time, and job posting signals.

**Available tools:**
```
RESEARCH PHASE (concurrent):
  web_research(query, intent='competitor_intel')   → live competitor pages
  web_research(query, intent='pricing')            → actual pricing tiers
  web_research(query, intent='reviews')            → G2/Capterra complaints
  web_research(query, intent='hiring')             → job posting signals
  web_research(query, intent='news')               → recent press/announcements
  db_query(table='agent_activity', filters={action_type:'competitor_tracked'})

ARTIFACT CREATION PHASE (serial):
  create_competitive_matrix(validated_data)
  create_battle_card(competitor_data)
  track_competitor(name, url)                      → enables monitoring
```

**Agent loop walkthrough — Competitive Matrix:**

```
Turn 1 (founder): "Map my competitive landscape — we're building AI-powered contract analysis"

Atlas's plan (thinking):
  "I need to research every major player in AI contract analysis.
   I'll run web searches on each simultaneously — pricing, positioning,
   customer complaints, recent funding/news, and hiring signals
   (hiring = strategic expansion direction)."

Tool calls (CONCURRENT — all at once):
  → web_research("Ironclad pricing plans 2025", intent='pricing')
  → web_research("Ironclad reviews complaints G2 Capterra", intent='reviews')
  → web_research("SpotDraft Contractbook Juro alternatives comparison", intent='competitor_intel')
  → web_research("AI contract analysis startup funding 2024 2025", intent='news')
  → web_research("Ironclad jobs hiring 2025", intent='hiring')
  → web_research("contract analysis software pain points legal ops", intent='reviews')

[Concurrent — all resolve together]

Atlas reasons:
  "Ironclad: $500-2000/mo, targets enterprise 500+ employees.
   Reviews: 'too expensive for SMB', 'takes 6 months to implement'.
   Hiring: 6 new ML engineer roles → doubling down on AI features.
   Gap: nobody owns the 50-500 employee 'fast' segment.
   Ironclad's roadmap (based on job postings) is enterprise-first.
   That's a 12-month window before they come downstream."

Tool call (SERIAL):
  → create_competitive_matrix({
      marketOverview: "AI contract analysis is a $4.2B market growing 18% YoY...",
      competitors: [
        {
          name: 'Ironclad',
          positioning: 'Enterprise contract lifecycle management',
          pricing: { model: 'per_seat', range: '$500-2000/mo', freeTrialAvailable: false },
          targetCustomer: '500+ employee companies, legal ops teams',
          strengths: ['Deep Salesforce integration', 'Established brand', 'Enterprise security certs'],
          weaknesses: ['6-month implementation', 'Expensive for SMB', 'No real-time AI negotiation'],
          recentSignals: {
            funding: null,
            hiring: ['6 ML engineers', '3 enterprise AEs'],
            productLaunches: ['GPT-4 clause detection — announced Q1 2025'],
          },
          sources: ['ironclad.com/pricing', 'g2.com/ironclad-reviews (47 reviews)', 'linkedin.com/jobs/ironclad'],
        },
        // ... 3 more competitors
      ],
      featureMatrix: [
        { feature: 'AI clause detection', ironclad: true, spotdraft: true, us: true },
        { feature: 'Setup <1 week', ironclad: false, spotdraft: false, us: true },
        // ...
      ],
      whiteSpaceOpportunities: [
        'SMB segment (50-500 employees): no competitor owns this',
        'Non-legal users (founders, ops): all competitors target legal ops only',
      ],
    })

EVALUATOR: 91/100 — accepted
```

**Proactive behavior:**
- Every 7 days: re-runs web_research on all tracked competitors → if significant change detected → "Ironclad just dropped pricing 30%. Here's how your positioning needs to change."
- When a competitor raises funding → immediate alert with competitive response recommendation
- Atlas auto-triggers after Patel creates an ICP → runs competitive research on the specific segment Patel identified

---

### 3.3 Felix — CFO (Financial Intelligence)

**What actually happens now:** Felix doesn't ask what your MRR is — it pulls it from Stripe. Projections are computed, not written by a language model guessing numbers. Benchmarks come from real cohort data.

**Available tools:**
```
RESEARCH/DATA PHASE (concurrent):
  stripe_sync(restrictedKey)                             → live MRR, ARR, churn
  db_query(table='qscore_history', filters={user_id})    → score + embedded financials
  db_query(table='agent_artifacts', filters={agent_id:'felix'})  → prior summaries
  benchmark_lookup(metric='burn_multiple', sector, stage)
  benchmark_lookup(metric='ltv_cac', sector, stage)
  benchmark_lookup(metric='gross_margin', sector, stage)

COMPUTATION PHASE (concurrent after data):
  calculate_unit_economics(mrr, customers, churn, cac, grossMargin)
  financial_projection(currentMrr, growthRate, burn, grossMargin)

ARTIFACT CREATION PHASE (serial):
  create_financial_summary(validated_data)
```

**Agent loop walkthrough:**

```
Turn 1 (founder): "Give me a financial summary — here's my Stripe key: rk_live_..."

Felix's plan:
  "Pull live data from Stripe first. Then benchmark against sector.
   Compute unit economics from real numbers. Then generate the summary
   — NOT the other way around."

Tool calls (CONCURRENT):
  → stripe_sync(restrictedKey='rk_live_...')
  → benchmark_lookup(metric='burn_multiple', sector='b2b_saas', stage='mid')
  → benchmark_lookup(metric='ltv_cac', sector='b2b_saas', stage='mid')
  → db_query(table='agent_artifacts', filters={user_id, agent_id:'felix'})

Stripe returns:
  { mrr: 47200, arr: 566400, customers: 89, churnRate: 0.023, newMrr: 6100 }

Benchmark returns:
  { burn_multiple: { p25: 1.8, median: 2.9, p75: 4.2 }, sector: 'b2b_saas', stage: 'mid' }

Tool calls (CONCURRENT — computation):
  → calculate_unit_economics({ mrr: 47200, customers: 89, churnRate: 0.023, cac: 1200, grossMargin: 0.78 })
  → financial_projection({ currentMrr: 47200, monthlyGrowthRate: 0.129, monthlyBurn: 85000, grossMargin: 0.78 })

Unit economics returns:
  { ltv: 33913, ltvCacRatio: 28.3, paybackMonths: 1.5, burnMultiple: 2.1 }

Projection returns:
  { breakEvenMonth: 7, 24MonthArr: { base: 2.1M, bear: 1.4M, bull: 3.8M }, runway: 14.2 }

Felix reasons:
  "LTV:CAC of 28x is exceptional (sector median: 4.1x). Burn multiple 2.1x
   is in the 35th percentile — good. Runway 14 months is borderline (VCs
   want 18+). The ask: raise $2M now to extend runway to 26 months.
   VC alert: churn at 2.3%/month is slightly above SaaS median (1.8%).
   This will be questioned in due diligence."

Tool call (SERIAL):
  → create_financial_summary({
      snapshot: { mrr: 47200, arr: 566400, customers: 89, runway: 14.2, source: 'stripe_live' },
      unitEconomics: { ltv: 33913, cac: 1200, ratio: 28.3, verdict: 'exceptional' },
      vsMedian: { burnMultiple: { ours: 2.1, median: 2.9, percentile: 35 }, ltvCac: { ours: 28.3, median: 4.1, percentile: 92 } },
      vcAlerts: ['Monthly churn 2.3% vs sector median 1.8% — expect due diligence question'],
      fundraisingRecommendation: { amount: 2000000, rationale: 'Extends runway from 14 to 26 months...', timing: 'Start process in 2 months' },
      risks: [{ risk: 'Churn trending above median', severity: 'medium', mitigation: 'Implement CS playbook for accounts <6 months old' }],
    })

EVALUATOR: 94/100 — accepted

Response: "Pulled your live Stripe data. Your LTV:CAC of 28x is in the 92nd percentile 
for B2B SaaS — that's genuinely strong. One flag: monthly churn at 2.3% is above the 
1.8% sector median. Every VC will ask about this in due diligence. Here's how to answer it..."
```

**Proactive behavior:**
- When runway drops below 6 months (detected from Stripe sync or manual entry) → immediate alert to Sage + "Felix flagged: runway < 6 months. Want me to model emergency scenarios?"
- Monthly: re-sync Stripe (if key stored) → update financial summary → post `agent_activity` event
- When Felix's financials are updated → auto-triggers Sage to re-evaluate strategic plan

---

### 3.4 Sage — CEO Advisor (Strategic Synthesis)

**What actually happens now:** Sage is the coordinator. It reads every other agent's artifacts with typed access (not text dumps), detects contradictions automatically, and synthesises across all 8 agents. It is the only agent that can trigger other agents.

**Available tools:**
```
DATA PHASE (concurrent):
  db_query(table='agent_artifacts', filters={user_id})   → all artifacts
  db_query(table='qscore_history', filters={user_id})    → score trajectory
  db_query(table='agent_activity', filters={user_id})    → recent events
  benchmark_lookup(metric='arr_growth', sector, stage)

REASONING TOOLS:
  detect_contradictions(artifacts)                        → cross-artifact analysis
  calculate_pivot_score(signals)                          → pivot signal computation
  score_investor_readiness(allData)                       → readiness assessment

COORDINATION TOOLS (Sage only):
  trigger_agent(agentId, task, priority)                  → spawn sub-agent task
  request_handoff(fromAgent, toAgent, payload)            → typed data handoff

ARTIFACT CREATION PHASE (serial):
  create_strategic_plan(validated_data)
```

**Agent loop walkthrough — Strategic Synthesis:**

```
Turn 1 (founder): "Give me a strategic plan for the next 12 months"

Sage's plan:
  "I need to read all existing artifacts before I can synthesise.
   I'll load everything, run contradiction detection, benchmark
   our position, then reason about the 3 highest-leverage strategic bets."

Tool calls (CONCURRENT):
  → db_query(table='agent_artifacts', filters={user_id}, limit=50)
  → db_query(table='qscore_history', filters={user_id}, limit=10, orderBy='created_at')
  → db_query(table='agent_activity', filters={user_id}, limit=30)
  → benchmark_lookup(metric='arr_growth', sector='b2b_saas', stage='mid')

All artifacts loaded:
  - Patel's ICP: target = "VP People at 50-200 person tech companies"
  - Harper's Hiring Plan: "hire enterprise AE in Q1" (targets Fortune 500)
  - Felix's Financial Summary: LTV:CAC 28x, runway 14 months
  - Atlas's Competitive Matrix: whitespace in SMB segment
  - Nova's PMF Survey: 67% "very disappointed" (strong PMF signal)

Tool call (SERIAL — reasoning):
  → detect_contradictions(artifacts)
  Returns:
    CRITICAL: Harper's hiring plan targets enterprise AEs, but Patel's ICP is SMB.
    These are incompatible. An enterprise AE costs $180K+ OTE and won't work SMB deals.
    HIGH: Felix says raise $2M for runway extension. But runway is 14 months — no urgency.
    VCs will question the timing. Wait until runway is 10 months or have stronger growth signal.
    MEDIUM: Nova's PMF survey targets "developers", but Patel's ICP is "VP People". Segment mismatch.

Tool call (SERIAL — scoring):
  → score_investor_readiness({
      iqScore: 71, pmfScore: 67, ltvCac: 28.3, runway: 14,
      artifacts: [...], contradictions: [...]
    })
  Returns: { score: 64, readyInMonths: 3, blockers: ['Contradiction: ICP vs hiring plan'] }

Tool call (COORDINATION — triggers Harper):
  → trigger_agent('harper', {
      task: 'Revise hiring plan — current targets enterprise AEs but ICP is SMB. Need SMB-focused sales hire.',
      priority: 'high',
      contextPayload: { icpData: patelICP, currentHiringPlan: harperPlan }
    })

Sage then generates strategic plan with explicit contradiction resolutions embedded.

EVALUATOR: 89/100 — accepted
```

**Proactive behaviors:**
- Runs `detect_contradictions` automatically every time any agent creates a new artifact
- Monitors `qscore_history` — if score drops 5+ points → "Something changed. Want me to diagnose?"
- Every Monday: generates a "Focus Today" brief based on current state of all artifacts
- Before any investor meeting (detected from Felix's investor update sends) → triggers Board Meeting Prep automatically

---

### 3.5 Nova — CPO (Product-Market Fit)

**What actually happens now:** Nova doesn't write a survey from scratch — it hosts a real survey, collects real responses, and runs AI analysis on actual customer data. The PMF score is computed, not described.

**Available tools:**
```
RESEARCH PHASE (concurrent):
  db_query(table='survey_responses', filters={survey_id})  → real responses
  db_query(table='agent_artifacts', filters={agent_id:'patel'})  → ICP for segment context
  web_research(query, intent='reviews')                     → public product feedback

ANALYSIS PHASE (concurrent after data):
  cluster_feedback(responses)          → NLP clustering of themes
  calculate_pmf_score(responses)       → Sean Ellis score computation
  cohort_analysis(responses)           → segment breakdown

ARTIFACT CREATION PHASE (serial):
  create_pmf_survey(validated_data)
  create_interview_notes(validated_data)
  host_survey(survey_data)             → creates public /s/[surveyId] endpoint
```

**What changes:** When a founder says "analyze my PMF", Nova first checks if there are survey responses in the DB. If yes, it runs real analysis. If no, it designs a survey, hosts it, and provides the link. The PMF score (Sean Ellis %) is computed from real data — not LLM-estimated.

---

### 3.6 Harper — Chief People Officer

**What actually happens now:** Harper scores resumes against the ICP-derived hiring criteria using the LLM as a classifier. Hiring plans are built with real market salary data and reference Patel's ICP for role prioritisation logic.

**Available tools:**
```
RESEARCH PHASE (concurrent):
  web_research(query, intent='hiring')              → market salary benchmarks
  web_research(query='[role] hiring 2025 requirements', intent='news')
  db_query(table='agent_artifacts', filters={agent_id:'patel'})  → ICP for role alignment
  db_query(table='agent_artifacts', filters={agent_id:'felix'})  → financial headcount budget
  benchmark_lookup(metric='sales_cycle', sector, stage)          → AE hiring timing signal

SCORING TOOLS (concurrent):
  score_resume(resume, requirements)   → structured LLM scoring

ARTIFACT CREATION PHASE (serial):
  create_hiring_plan(validated_data)
  generate_jd(role, context)
```

**Key change:** When Harper builds a hiring plan, it first reads Felix's financial summary to understand headcount budget, then reads Patel's ICP to understand what sales/marketing roles to prioritise. The hiring plan is derived from real financial constraints and ICP-aligned sales motion — not generated in isolation.

---

### 3.7 Leo — General Counsel

**What actually happens now:** Leo uses the LLM to generate legally-structured documents, but first checks the founder's stage, sector, and jurisdiction to ensure the checklist is relevant. Document generation (NDA, SAFE, co-founder agreement) uses templated structured data fed into the LLM, not free-form generation — reducing legal hallucination risk.

**Available tools:**
```
RESEARCH PHASE (concurrent):
  db_query(table='founder_profiles', filters={user_id})   → stage, jurisdiction, sector
  db_query(table='agent_artifacts', filters={agent_id:'harper'})  → hiring plan (for employment law)
  db_query(table='agent_artifacts', filters={agent_id:'felix'})   → fundraising plan (for SAFE timing)
  web_research(query='[jurisdiction] startup incorporation requirements 2025')

DOCUMENT GENERATION PHASE (serial):
  generate_nda(params)             → structured → HTML document
  generate_safe(params)            → structured → HTML document
  generate_cofounder_agreement(params)
  create_legal_checklist(validated_data)
```

**Safety constraint:** Leo's artifact creation tools include a `legalDisclaimer` field that is injected automatically into every generated document: "This document was AI-generated and should be reviewed by a qualified attorney before signing." This is non-removable.

---

### 3.8 Maya — Brand Director

**What actually happens now:** Maya researches competitor brand positioning before writing anything. Landing page copy is grounded in actual competitive whitespace — not invented positioning.

**Available tools:**
```
RESEARCH PHASE (concurrent):
  web_research(query='[competitor] brand messaging positioning 2025')
  web_research(query='[sector] startup brand voice examples')
  db_query(table='agent_artifacts', filters={agent_id:'atlas'})  → competitive positioning gaps
  db_query(table='agent_artifacts', filters={agent_id:'nova'})   → PMF survey top phrases (customer language)

GENERATION PHASE (serial):
  create_brand_messaging(validated_data)
  generate_landing_page_html(brand_data)   → self-contained HTML
  deploy_to_netlify(html)                  → returns live URL
```

**Key change:** Maya reads Nova's PMF survey verbatims to use actual customer language in messaging. The voice guide is built from words real customers used to describe the problem — not the founder's preferred vocabulary.

---

### 3.9 Susi — CRO (Sales Operations)

**What actually happens now:** Susi's pipeline is a real database of deals. Deal scoring runs on actual pipeline data. Revenue forecasts are computed from real close rates and pipeline values — not described by an LLM.

**Available tools:**
```
DATA PHASE (concurrent):
  db_query(table='deals', filters={user_id})         → live pipeline
  db_query(table='agent_artifacts', filters={agent_id:'patel'})  → ICP for qualification check
  db_query(table='agent_artifacts', filters={agent_id:'atlas'})  → competitive intel for battle cards
  benchmark_lookup(metric='sales_cycle', sector, stage)

SCORING/COMPUTATION PHASE (concurrent):
  score_deal(deal_data)                → AI deal score 0–100
  forecast_revenue(pipeline, closeRates) → 30/60/90 projection

ARTIFACT CREATION PHASE (serial):
  create_sales_script(validated_data)
  update_deal(dealId, changes)         → pipeline mutation
```

**Proactive behavior:**
- Every 48 hours: checks all deals → if any deal has no activity for 7+ days → "You have 3 stale deals. Last contact with Acme was 9 days ago. Want me to generate a follow-up email?"
- When Felix updates financial projections → Susi re-runs revenue forecast and flags gap between pipeline value and Felix's model

---

## 4. Coordinator: Cross-Agent Workflows

### 4.1 The Investor Readiness Workflow

Triggered by founder: "Prepare me for a Series A conversation"

```
COORDINATOR (Sage)
      │
      ├── PHASE 1: CONCURRENT (no dependencies)
      │     ├── Atlas:  re-run competitive research (fresh data)
      │     ├── Felix:  sync Stripe + rebuild financial model
      │     └── Nova:   re-compute PMF score from latest survey data
      │
      ├── PHASE 2: SEQUENTIAL (depends on Phase 1)
      │     ├── Patel:  update ICP with Atlas's latest competitive whitespace
      │     └── Harper: update hiring plan with Felix's headcount budget
      │
      ├── PHASE 3: SEQUENTIAL (depends on Phase 2)
      │     └── Sage:   detect_contradictions(all updated artifacts)
      │                 → auto-resolve or flag for founder
      │
      ├── PHASE 4: SYNTHESIS
      │     └── Sage:   generate Investor Readiness Report
      │                 { executiveSummary, iqScore, keyStrengths,
      │                   openQuestions, 90DayReadinessPlan }
      │
      └── OUTPUT: Full investor readiness package
            + list of contradictions resolved
            + list of open questions investor will likely ask
            + recommended answer for each
```

### 4.2 The Typed Handoff Protocol

Agents don't pass text to each other. They pass typed structured payloads.

```typescript
// lib/agents/handoff.ts

type AgentHandoff =
  | {
      type: 'competitive_to_gtm'
      fromAgent: 'atlas'
      toAgent: 'patel'
      payload: {
        topCompetitors: string[]
        positioningGaps: string[]          // whitespace Patel can claim
        competitorWeaknesses: Record<string, string[]>
        winningChannels: string[]          // channels competitors under-invest in
        dataFreshness: Date
      }
    }
  | {
      type: 'financial_to_hiring'
      fromAgent: 'felix'
      toAgent: 'harper'
      payload: {
        monthlyHeadcountBudget: number
        runway: number
        nextFundingExpected: Date | null
        affordableRoles: Array<{ role: string; maxSalary: number; urgency: 'now' | 'q2' | 'post_raise' }>
      }
    }
  | {
      type: 'icp_to_sales'
      fromAgent: 'patel'
      toAgent: 'susi'
      payload: {
        buyerPersona: BuyerPersona
        topPainPoints: PainPoint[]
        qualificationCriteria: QualificationCriteria
        objectionMap: Record<string, string>  // objection → scripted response
      }
    }
  | {
      type: 'pmf_to_product_story'
      fromAgent: 'nova'
      toAgent: 'maya'
      payload: {
        topCustomerPhrases: string[]         // exact words customers used
        mainJobToBeDone: string
        beforeAfterStory: { before: string; after: string }
        pmfScore: number
        earlyAdopterSegment: string
      }
    }
```

### 4.3 The Event Bus

Agents subscribe to events from other agents. When an artifact is created, other agents are notified and can react.

```typescript
// lib/agents/eventBus.ts

type AgentEvent =
  | { type: 'ARTIFACT_CREATED'; agentId: AgentId; artifactType: ArtifactType; artifactId: string }
  | { type: 'CONTRADICTION_DETECTED'; severity: 'critical' | 'high' | 'medium'; description: string; agents: AgentId[] }
  | { type: 'SCORE_MILESTONE'; milestone: 'marketplace_unlock' | 'series_a_ready'; iqScore: number }
  | { type: 'FINANCIAL_ALERT'; alertType: 'runway_warning' | 'churn_spike' | 'burn_increase'; data: unknown }
  | { type: 'COMPETITIVE_SIGNAL'; competitor: string; signalType: 'pricing_change' | 'funding' | 'hiring_surge' }

// Subscription table — who reacts to what
const SUBSCRIPTIONS: Record<AgentId, AgentEvent['type'][]> = {
  sage:   ['ARTIFACT_CREATED', 'FINANCIAL_ALERT', 'CONTRADICTION_DETECTED'],
  patel:  ['ARTIFACT_CREATED'],   // reacts when Atlas creates competitive matrix
  susi:   ['ARTIFACT_CREATED'],   // reacts when Patel creates ICP
  maya:   ['ARTIFACT_CREATED'],   // reacts when Nova creates PMF survey
  harper: ['ARTIFACT_CREATED', 'FINANCIAL_ALERT'],  // reacts when Felix updates financials
}
```

---

## 5. Proactive Agent Engine

Agents don't wait to be asked. The Proactive Engine runs scheduled jobs that check conditions and trigger agent actions.

```typescript
// lib/agents/proactiveEngine.ts

const PROACTIVE_RULES: ProactiveRule[] = [
  {
    name: 'runway_warning',
    schedule: 'daily',
    condition: async (userId) => {
      const latest = await getLatestFinancials(userId)
      return latest?.runway < 6  // months
    },
    action: async (userId) => {
      await createAgentActivity(userId, 'felix', 'runway_warning',
        'Runway below 6 months. Felix recommends emergency scenario modeling.')
      await triggerAgent('felix', userId, 'Build emergency runway scenarios')
    },
  },
  {
    name: 'competitive_monitoring',
    schedule: 'weekly',
    condition: async (userId) => {
      const trackedCompetitors = await getTrackedCompetitors(userId)
      return trackedCompetitors.length > 0
    },
    action: async (userId) => {
      const competitors = await getTrackedCompetitors(userId)
      for (const competitor of competitors) {
        const signals = await detectCompetitorSignals(competitor)
        if (signals.significantChange) {
          await createAgentActivity(userId, 'atlas', 'competitor_signal',
            `${competitor.name}: ${signals.summary}`)
        }
      }
    },
  },
  {
    name: 'stale_deals',
    schedule: 'daily',
    condition: async (userId) => {
      const staleDeals = await getDealsWithNoActivity(userId, 7)  // 7 days
      return staleDeals.length > 0
    },
    action: async (userId) => {
      const staleDeals = await getDealsWithNoActivity(userId, 7)
      await createAgentActivity(userId, 'susi', 'stale_deals',
        `${staleDeals.length} deals with no activity in 7+ days`)
    },
  },
  {
    name: 'contradiction_scan',
    schedule: 'on_artifact_created',  // triggered by event bus
    condition: async (userId) => true,
    action: async (userId) => {
      const allArtifacts = await getAllArtifacts(userId)
      if (allArtifacts.length >= 3) {
        const contradictions = await detectContradictions(allArtifacts)
        if (contradictions.critical.length > 0) {
          await createAgentActivity(userId, 'sage', 'contradiction_detected',
            `Critical: ${contradictions.critical[0].description}`)
        }
      }
    },
  },
  {
    name: 'score_milestone',
    schedule: 'on_score_update',  // triggered by event bus
    condition: async (userId, data) => data.previousScore < 45 && data.newScore >= 45,
    action: async (userId) => {
      await sendEmail(userId, 'milestone_unlock', { milestone: 'Investor Marketplace' })
      await createAgentActivity(userId, 'sage', 'score_milestone',
        'IQ Score crossed 45 — now visible to investors in the marketplace')
    },
  },
]
```

---

## 6. Quality Bar: Evaluator Prompts Per Artifact

Every artifact type has a dedicated evaluator that scores on 4 dimensions (25 pts each = 100 max). Artifacts scoring below 75 are automatically refined once.

```typescript
const EVALUATOR_DIMENSIONS: Record<ArtifactType, EvaluatorDimension[]> = {
  icp_profile: [
    { name: 'Specificity', question: 'Are firmographics concrete with real industry names, exact sizes, named tech stacks? Or generic?', weight: 25 },
    { name: 'Evidence', question: 'Are pain points backed by real customer signals, reviews, or market data? Or assumptions?', weight: 25 },
    { name: 'Actionability', question: 'Can a sales rep qualify/disqualify a lead in 60 seconds using only this document?', weight: 25 },
    { name: 'Differentiation', question: 'Does the ICP explain why THIS product is uniquely suited, not just any solution?', weight: 25 },
  ],
  gtm_playbook: [
    { name: 'Channel specificity', question: 'Are channels named with budget, expected CAC, and why this channel for this ICP?', weight: 25 },
    { name: 'Execution readiness', question: 'Can a team member pick this up and execute Phase 1 tomorrow without clarification?', weight: 25 },
    { name: 'ICP alignment', question: 'Is every channel and message choice justified by the ICP persona?', weight: 25 },
    { name: 'Competitive positioning', question: 'Does the messaging differentiate from named competitors, not just generically?', weight: 25 },
  ],
  financial_summary: [
    { name: 'Data completeness', question: 'Are MRR, burn, runway, customers, and unit economics all present and internally consistent?', weight: 25 },
    { name: 'Mathematical accuracy', question: 'Does runway = cash / monthly burn? Does LTV:CAC formula check out?', weight: 25 },
    { name: 'VC-readiness', question: 'Would a Series A investor trust these numbers or immediately ask for supporting data?', weight: 25 },
    { name: 'Actionability', question: 'Are recommendations specific: exact raise amount, exact timing, specific risk mitigations?', weight: 25 },
  ],
  competitive_matrix: [
    { name: 'Recency', question: 'Is this based on actual web research from the past 30 days, not general knowledge?', weight: 25 },
    { name: 'Pricing accuracy', question: 'Are competitor prices real and sourced (not estimated)?', weight: 25 },
    { name: 'Positioning gaps', question: 'Are whitespace opportunities specific and actionable, not just "we are better"?', weight: 25 },
    { name: 'Sales utility', question: 'Can a salesperson use the battle cards to handle objections in a live call?', weight: 25 },
  ],
}
```

---

## 7. Shared Architecture (v2)

### Agent System Prompt Structure

Every agent system prompt follows this structure. The persona section is the only thing that changes.

```
[IDENTITY]
You are {name}, {role} at Edge Alpha. {persona description}

[OPERATING INSTRUCTIONS]
You are a true AI agent. You DO NOT generate artifacts from assumptions.
Follow this order on every turn:
1. PLAN: Identify what data you need to gather before writing anything.
2. GATHER: Call the appropriate read-only tools to collect real data.
3. REASON: Think through what the data tells you. Use your thinking budget.
4. GENERATE: Call the artifact creation tool with data-backed inputs.
You never skip step 2. You never generate before gathering.

[AVAILABLE CONTEXT]
{relevantArtifacts}  ← top 5 by semantic similarity, not all artifacts

[CONNECTED ADVISORS]
{handoffPayloads}    ← typed structured data from connected agents, not text

[FOUNDER PROFILE]
{founderProfile}     ← stage, sector, key metrics
```

### Artifact Versioning & Lineage

Every artifact records what data sources were used to build it.

```typescript
interface ArtifactProvenance {
  webSearchQueries: string[]        // every Tavily query fired
  webSourceUrls: string[]           // every URL referenced
  toolsUsed: string[]               // which tools ran
  evaluationScore: number           // final quality score
  refinementCount: number           // how many times it was regenerated
  connectedArtifactIds: string[]    // which sibling artifacts influenced this
  dataFreshness: Date               // oldest data source used
}
// Stored in agent_artifacts.provenance JSONB
// Shown to founder as "How this was built" expandable section in DeliverablePanel
```

### DeliverablePanel (v2)

New additions to the existing panel:

- **Data Sources** — expandable "How this was built": lists web URLs searched, Stripe sync status, tools used, evaluation score breakdown
- **Freshness indicator** — "Based on data from X days ago. Refresh?" → re-runs gather + generate
- **Contradiction badge** — if Sage detected a contradiction involving this artifact → amber badge with description
- **Confidence dimensions** — 4-dimension quality bars (from evaluator) instead of single quality bar

---

## 8. Migration Path (v1 → v2)

### Phase A — Tool Infrastructure (Week 1–2)
- Implement `AgentTool` interface + `executeTools()` partitioner
- Register all 15 tools (web_research, lead_enrich, stripe_sync, db_query, benchmark_lookup, calculate_unit_economics, financial_projection, score_deal, cluster_feedback, calculate_pmf_score + 5 artifact creation tools)
- Replace XML regex detection with native Anthropic SDK tool_use
- Add SSE streaming to chat route

### Phase B — Agent Loop (Week 3–4)
- Implement `runAgent()` async generator loop
- Wire evaluator system with per-artifact prompts
- Add `ArtifactProvenance` tracking
- Add semantic embedding on artifact creation

### Phase C — Coordination (Week 5–7)
- Implement `AgentHandoff` typed payloads
- Implement event bus + subscriptions
- Implement coordinator for Investor Readiness workflow
- Implement `detect_contradictions` tool for Sage

### Phase D — Proactive Engine (Week 8–9)
- Implement `ProactiveEngine` with scheduled rules
- Wire runway_warning, competitive_monitoring, stale_deals, contradiction_scan, score_milestone
- Add proactive notifications to activity feed + notification bell

### Phase E — DeliverablePanel v2 (Week 10)
- Add Data Sources panel
- Add Freshness indicator + re-run button
- Add Contradiction badge
- Replace single quality bar with 4-dimension evaluator breakdown

import { NextRequest, NextResponse } from 'next/server';
import { groqService } from '@/lib/groq';
import { getAgentById } from '@/lib/mock-data/agents';

export const runtime = 'edge';

/**
 * Agent Chat API Route
 * Uses Groq LLM to generate specialized responses based on agent expertise
 */
export async function POST(request: NextRequest) {
  try {
    const { agentId, message, conversationHistory } = await request.json();

    // Validate inputs
    if (!agentId || !message) {
      return NextResponse.json(
        { error: 'Agent ID and message are required' },
        { status: 400 }
      );
    }

    // Get agent details
    const agent = getAgentById(agentId);
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Build system prompt based on agent specialty
    const systemPrompt = buildAgentSystemPrompt(agent);

    // Build conversation context
    const messages = [
      {
        role: "system" as const,
        content: systemPrompt
      },
      // Include recent conversation history (last 10 messages)
      ...(conversationHistory || []).slice(-10).map((msg: any) => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      })),
      {
        role: "user" as const,
        content: message
      }
    ];

    // Get AI response from Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile', // Best balance of speed and quality
        messages,
        temperature: 0.7, // Creative but consistent
        max_tokens: 1500,
        top_p: 1,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    return NextResponse.json({
      response: aiResponse,
      agentId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Agent chat error:', error);

    // Return fallback response
    return NextResponse.json({
      response: "I apologize, but I'm having trouble connecting right now. Please try again in a moment. In the meantime, feel free to explore the suggested questions or try rephrasing your question.",
      agentId: '',
      timestamp: new Date().toISOString(),
      error: true
    }, { status: 500 });
  }
}

/**
 * Build specialized system prompt based on agent expertise
 */
function buildAgentSystemPrompt(agent: any): string {
  const basePrompt = `You are ${agent.name}, an expert AI advisor specializing in ${agent.specialty}.

Your personality:
- Direct and actionable - give specific, tactical advice
- Framework-driven - teach reusable mental models
- Data-informed - reference real metrics and benchmarks
- Empathetic but honest - supportive yet realistic about challenges

Your expertise focuses on helping early-stage startup founders with ${agent.specialty.toLowerCase()}.`;

  // Add agent-specific context
  const specialtyContext: Record<string, string> = {
    'patel': `
You help founders:
- Define their Ideal Customer Profile (ICP) with precision
- Build repeatable go-to-market playbooks
- Test and optimize acquisition channels
- Calculate and improve Customer Acquisition Cost (CAC)
- Design GTM experiments and measure results

Reference frameworks like:
- ICP Canvas (demographic, psychographic, behavioral)
- Channel Testing Matrix (cost, time, scalability)
- GTM Motion Selection (product-led vs sales-led)
- Bullseye Framework (19 traction channels)`,

    'susi': `
You help founders:
- Build repeatable sales processes from scratch
- Qualify leads effectively (BANT, MEDDIC)
- Design outbound sequences that convert
- Handle objections and close deals
- Scale from founder-led sales to a sales team

Reference frameworks like:
- MEDDIC qualification (Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion)
- 4-step sales process (Discovery, Demo, Proposal, Close)
- Cold outreach templates and best practices
- Sales playbook components`,

    'maya': `
You help founders:
- Craft compelling brand narratives and positioning
- Build content strategies that generate demand
- Develop thought leadership on LinkedIn/Twitter
- Create content calendars and distribution plans
- Measure content ROI and iterate

Reference frameworks like:
- StoryBrand framework (character, problem, guide, plan)
- Content pyramid (pillar content → supporting content)
- Distribution > Creation principle
- Thought leadership loop (learn, share, engage)`,

    'felix': `
You help founders:
- Build financial models (3-statement, unit economics)
- Track key SaaS metrics (MRR, ARR, churn, LTV:CAC)
- Forecast revenue growth and burn rate
- Make data-driven decisions about fundraising vs bootstrapping
- Present financials to investors

Reference metrics like:
- LTV:CAC ratio (target 3:1)
- Payback period (target <12 months)
- Rule of 40 (growth + profit margin)
- Burn multiple (cash burned / net new ARR)`,

    'leo': `
You help founders:
- Choose the right legal entity structure (C-Corp, LLC)
- Protect intellectual property (patents, trademarks, trade secrets)
- Draft founder agreements and equity splits
- Navigate compliance and regulations
- Review contracts (customer, vendor, employment)

Reference best practices like:
- 83(b) election for founders
- Standard founder vesting (4 years, 1 year cliff)
- IP assignment agreements
- Terms of Service and Privacy Policy templates`,

    'harper': `
You help founders:
- Hire the right people at the right time
- Structure compensation (salary, equity, benefits)
- Build strong company culture from day one
- Design hiring processes that attract A-players
- Manage performance and give feedback

Reference frameworks like:
- Who: The A Method for Hiring
- Topgrading interview techniques
- OKRs for goal-setting
- Radical Candor for feedback
- Equity benchmarks by role and stage`,

    'nova': `
You help founders:
- Find and validate product-market fit
- Prioritize features and build roadmaps
- Design customer validation experiments
- Measure PMF signals (retention, NPS, growth)
- Decide when to pivot vs persevere

Reference frameworks like:
- Sean Ellis PMF survey (40% "very disappointed")
- RICE prioritization (Reach, Impact, Confidence, Effort)
- Jobs to be Done theory
- Lean Startup build-measure-learn
- 10x better test (is your product 10x better than alternatives?)`,

    'atlas': `
You help founders:
- Map competitive landscape and identify gaps
- Develop unique positioning and differentiation
- Research market trends and opportunities
- Analyze competitor strategies (pricing, GTM, product)
- Find unfair advantages

Reference frameworks like:
- Porter's Five Forces
- Blue Ocean Strategy (value innovation)
- Competitive battle cards
- Market sizing (TAM/SAM/SOM)
- Positioning statement template`,

    'sage': `
You help founders:
- Build 12-month strategic roadmaps
- Set and track OKRs (Objectives and Key Results)
- Evaluate big decisions (build vs buy, expand, pivot)
- Think long-term (3-5 year vision)
- Prepare for fundraising milestones

Reference frameworks like:
- OKR framework (Google/Intel)
- Strategy canvas
- Decision matrix for build/buy/partner
- Series A readiness checklist
- North Star Metric framework`
  };

  return `${basePrompt}\n\n${specialtyContext[agent.id] || ''}

Important guidelines:
- Keep responses concise but actionable (200-400 words)
- Use bullet points and formatting for clarity
- Ask clarifying questions when needed
- Reference specific metrics, benchmarks, and examples
- End with a clear next step or question to continue the conversation

Remember: You're not just answering questions - you're teaching founders how to think about ${agent.specialty.toLowerCase()}.`;
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAgentById } from '@/features/agents/data/agents';
import type { Agent } from '@/features/agents/types/agent.types';
import {
  patelSystemPrompt,
  susiSystemPrompt,
  mayaSystemPrompt,
  felixSystemPrompt,
  leoSystemPrompt,
  harperSystemPrompt,
  novaSystemPrompt,
  atlasSystemPrompt,
  sageSystemPrompt,
} from '@/features/agents';

// ─── dedicated system prompt registry ────────────────────────────────────────

const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  patel:  patelSystemPrompt,
  susi:   susiSystemPrompt,
  maya:   mayaSystemPrompt,
  felix:  felixSystemPrompt,
  leo:    leoSystemPrompt,
  harper: harperSystemPrompt,
  nova:   novaSystemPrompt,
  atlas:  atlasSystemPrompt,
  sage:   sageSystemPrompt,
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Agent Chat API Route
 * Uses Groq LLM to generate specialized responses based on agent expertise
 */
export async function POST(request: NextRequest) {
  try {
    const { agentId, message, conversationHistory, userContext, conversationId: existingConversationId, userId } = await request.json();

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

    // Use dedicated system prompt if available, fall back to built one
    const systemPrompt = AGENT_SYSTEM_PROMPTS[agentId] ?? buildAgentSystemPrompt(agent, userContext);

    const CONVERSATION_RULES = `

CONVERSATION RULES:
- Ask ONE focused question at a time.
- Keep responses concise: 2–4 sentences for conversational replies; use structured formatting only when delivering a framework or plan the founder requested.
- When a founder gives a vague answer, push for specifics: numbers, examples, timelines.
- Be direct, warm, and occasionally sharp — never sycophantic.
- If you don't know their specific market or product, ask before advising.`;

    // Build conversation context
    const messages = [
      {
        role: "system" as const,
        content: systemPrompt + CONVERSATION_RULES,
      },
      // Include recent conversation history (last 10 messages)
      ...(conversationHistory || []).slice(-10).map((msg: { role: string; content: string }) => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      })),
      {
        role: "user" as const,
        content: message,
      },
    ];

    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Get AI response via OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://edgealpha.ai',
        'X-Title': 'Edge Alpha Agents',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter error:', errText);
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    // Persist to DB if userId is provided
    let conversationId = existingConversationId;
    if (userId) {
      // Create conversation on first message
      if (!conversationId) {
        const { data: conv } = await supabaseAdmin
          .from('agent_conversations')
          .insert({
            user_id: userId,
            agent_id: agentId,
            title: message.slice(0, 60),
            last_message_at: new Date().toISOString(),
            message_count: 1
          })
          .select('id')
          .single();
        conversationId = conv?.id;
      } else {
        // Update last_message_at and message_count
        await supabaseAdmin
          .from('agent_conversations')
          .update({
            last_message_at: new Date().toISOString(),
            message_count: (conversationHistory?.length ?? 0) + 2
          })
          .eq('id', conversationId);
      }

      if (conversationId) {
        // Persist user message
        await supabaseAdmin.from('agent_messages').insert({
          conversation_id: conversationId,
          role: 'user',
          content: message
        });
        // Persist assistant response
        await supabaseAdmin.from('agent_messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: aiResponse
        });
      }
    }

    return NextResponse.json({
      response: aiResponse,
      content: aiResponse,
      agentId,
      conversationId,
      timestamp: new Date().toISOString(),
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
 * Build specialized system prompt based on agent expertise and user context
 */
function buildAgentSystemPrompt(agent: Agent, userContext?: Record<string, unknown>): string {
  // Build context section if user data is available
  let contextSection = '';
  if (userContext) {
    contextSection = `\n\n**FOUNDER'S BUSINESS CONTEXT:**\n`;

    if (userContext.startupName) {
      contextSection += `Startup: ${userContext.startupName}\n`;
    }
    if (userContext.industry) {
      contextSection += `Industry: ${userContext.industry}\n`;
    }
    if (userContext.stage) {
      contextSection += `Stage: ${userContext.stage}\n`;
    }
    if (userContext.description) {
      contextSection += `Business Description: ${userContext.description}\n`;
    }

    // Add assessment data if available
    if (userContext.assessment) {
      const assessment = userContext.assessment as Record<string, unknown>;
      const financial = assessment.financial as Record<string, number> | undefined;

      if (assessment.totalMarketSize) {
        contextSection += `TAM: $${((assessment.totalMarketSize as number) / 1000000).toFixed(0)}M\n`;
      }
      if (assessment.payingCustomers !== undefined) {
        contextSection += `Paying Customers: ${assessment.payingCustomers}\n`;
      }
      if (assessment.icpDescription) {
        contextSection += `ICP: ${assessment.icpDescription}\n`;
      }
      if (financial?.mrr) {
        contextSection += `MRR: $${financial.mrr.toLocaleString()}\n`;
      }
      if (financial?.monthlyBurn) {
        contextSection += `Monthly Burn: $${financial.monthlyBurn.toLocaleString()}\n`;
      }
      if (assessment.teamSize) {
        contextSection += `Team Size: ${assessment.teamSize}\n`;
      }
      if (assessment.founderStory) {
        contextSection += `Founder Background: ${assessment.founderStory}\n`;
      }
    }

    contextSection += `\n**IMPORTANT:** Use this context to give highly specific, personalized advice. Reference their actual business details, numbers, and situation. Don't give generic advice - make it actionable for THEIR specific business.\n`;
  }

  const basePrompt = `You are ${agent.name}, an expert AI advisor specializing in ${agent.specialty}.

Your personality:
- Direct and actionable - give specific, tactical advice
- Framework-driven - teach reusable mental models
- Data-informed - reference real metrics and benchmarks
- Empathetic but honest - supportive yet realistic about challenges

Your expertise focuses on helping early-stage startup founders with ${agent.specialty.toLowerCase()}.${contextSection}`;

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

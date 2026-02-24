import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
import { getArtifactPrompt } from '@/features/agents/patel/prompts/artifact-prompts';

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

// ─── helpers ─────────────────────────────────────────────────────────────────

async function callOpenRouter(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number = 500,
  temperature: number = 0.7
): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY not configured');

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
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('OpenRouter error:', errText);
    throw new Error(`OpenRouter API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content ?? '';
}

// Streaming variant — forwards OpenRouter SSE tokens to the client while collecting
// the full text in parallel. Calls onComplete(fullText) after the stream ends.
function streamOpenRouter(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number,
  onComplete: (fullText: string) => Promise<void>
): ReadableStream<Uint8Array> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY not configured');

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const upstreamRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
            temperature,
            max_tokens: maxTokens,
            stream: true,
          }),
        });

        if (!upstreamRes.ok || !upstreamRes.body) {
          throw new Error(`OpenRouter streaming error: ${upstreamRes.statusText}`);
        }

        const reader = upstreamRes.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          controller.enqueue(encoder.encode(chunk));

          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') continue;
            try {
              const parsed = JSON.parse(payload);
              fullText += parsed.choices?.[0]?.delta?.content ?? '';
            } catch { /* malformed SSE line */ }
          }
        }

        // After stream ends: persist to DB, then send final metadata event
        await onComplete(fullText);

      } catch (err) {
        console.error('streamOpenRouter error:', err);
        controller.enqueue(encoder.encode('event: error\ndata: {"message":"Stream error"}\n\n'));
      } finally {
        controller.close();
      }
    },
  });
}

async function fetchTavilyResearch(query: string): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn('TAVILY_API_KEY not configured — skipping research');
    return null;
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'advanced',
        max_results: 8,
        include_answer: true,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      console.error('Tavily error:', response.statusText);
      return null;
    }

    const data = await response.json();
    return {
      answer: data.answer ?? null,
      results: (data.results || []).map((r: { title: string; url: string; content: string }) => ({
        title: r.title,
        url: r.url,
        snippet: r.content?.slice(0, 400),
      })),
    };
  } catch (err) {
    console.error('Tavily fetch error:', err);
    return null;
  }
}

// ─── usage limits ────────────────────────────────────────────────────────────

const AGENT_CHAT_MONTHLY_LIMIT = 50;

interface UsageRow {
  id: string;
  usage_count: number;
  limit_count: number | null;
  reset_at: string | null;
}

async function checkUsageAllowed(
  userId: string,
  supabaseAdmin: SupabaseClient
): Promise<{ allowed: boolean; remaining: number; usageId: string | null }> {
  const { data: row } = await supabaseAdmin
    .from('subscription_usage')
    .select('id, usage_count, limit_count, reset_at')
    .eq('user_id', userId)
    .eq('feature', 'agent_chat')
    .single() as { data: UsageRow | null };

  // No row yet — create one with default monthly limit
  if (!row) {
    const resetAt = new Date();
    resetAt.setMonth(resetAt.getMonth() + 1);
    resetAt.setDate(1);
    resetAt.setHours(0, 0, 0, 0);

    const { data: inserted } = await supabaseAdmin
      .from('subscription_usage')
      .insert({
        user_id: userId,
        feature: 'agent_chat',
        usage_count: 0,
        limit_count: AGENT_CHAT_MONTHLY_LIMIT,
        reset_at: resetAt.toISOString(),
      })
      .select('id')
      .single();

    return { allowed: true, remaining: AGENT_CHAT_MONTHLY_LIMIT, usageId: (inserted as { id: string } | null)?.id ?? null };
  }

  // Check if reset window has passed
  if (row.reset_at && new Date(row.reset_at) <= new Date()) {
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1);
    nextReset.setDate(1);
    nextReset.setHours(0, 0, 0, 0);

    await supabaseAdmin
      .from('subscription_usage')
      .update({ usage_count: 0, reset_at: nextReset.toISOString() })
      .eq('id', row.id);

    const limit = row.limit_count ?? AGENT_CHAT_MONTHLY_LIMIT;
    return { allowed: true, remaining: limit, usageId: row.id };
  }

  const limit = row.limit_count ?? AGENT_CHAT_MONTHLY_LIMIT;
  const remaining = Math.max(0, limit - row.usage_count);
  return { allowed: remaining > 0, remaining, usageId: row.id };
}

async function incrementUsage(usageId: string | null, supabaseAdmin: SupabaseClient) {
  if (!usageId) return;
  const { data } = await supabaseAdmin
    .from('subscription_usage')
    .select('usage_count')
    .eq('id', usageId)
    .single() as { data: { usage_count: number } | null };
  if (data) {
    await supabaseAdmin
      .from('subscription_usage')
      .update({ usage_count: data.usage_count + 1 })
      .eq('id', usageId);
  }
}

// ─── tool-call detection ─────────────────────────────────────────────────────

interface ToolCall {
  type: 'icp_document' | 'outreach_sequence' | 'battle_card' | 'gtm_playbook';
  context: Record<string, unknown>;
}

function extractToolCall(text: string): { chatReply: string; toolCall: ToolCall | null } {
  const match = text.match(/<tool_call>([\s\S]*?)<\/tool_call>/);
  if (!match) return { chatReply: text, toolCall: null };

  try {
    const toolCall = JSON.parse(match[1]) as ToolCall;
    const validTypes = ['icp_document', 'outreach_sequence', 'battle_card', 'gtm_playbook'];
    if (!validTypes.includes(toolCall.type)) return { chatReply: text, toolCall: null };

    const chatReply = text.replace(/<tool_call>[\s\S]*?<\/tool_call>/, '').trim();
    return { chatReply, toolCall };
  } catch {
    console.warn('Failed to parse tool_call JSON');
    return { chatReply: text, toolCall: null };
  }
}

// ─── main handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { agentId, message, conversationHistory, userContext, conversationId: existingConversationId, userId, stream: wantStream } = await request.json();

    if (!agentId || !message) {
      return NextResponse.json({ error: 'Agent ID and message are required' }, { status: 400 });
    }

    const agent = getAgentById(agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // ── Usage limit check ───────────────────────────────────────────────────
    let usageId: string | null = null;
    if (userId) {
      const usage = await checkUsageAllowed(userId, supabaseAdmin);
      if (!usage.allowed) {
        return NextResponse.json({
          error: 'Monthly message limit reached',
          limitReached: true,
          remaining: 0,
        }, { status: 429 });
      }
      usageId = usage.usageId;
    }

    const isPatel = agentId === 'patel';
    // Stream for non-Patel agents (Patel needs 2-pass artifact generation)
    const useStream = !!wantStream && !isPatel;

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
      ...(conversationHistory || []).slice(-10).map((msg: { role: string; content: string }) => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      })),
      {
        role: "user" as const,
        content: message,
      },
    ];

    // ── Streaming path (non-Patel agents) ─────────────────────────────────
    if (useStream) {
      const encoder = new TextEncoder();
      let conversationId = existingConversationId ?? null;

      const readableStream = streamOpenRouter(
        messages,
        500,
        0.7,
        async (fullText) => {
          // Increment usage after successful stream
          if (usageId) await incrementUsage(usageId, supabaseAdmin);

          // Persist to DB after stream completes
          if (userId && fullText) {
            if (!conversationId) {
              const { data: conv } = await supabaseAdmin
                .from('agent_conversations')
                .insert({
                  user_id: userId,
                  agent_id: agentId,
                  title: message.slice(0, 60),
                  last_message_at: new Date().toISOString(),
                  message_count: 1,
                })
                .select('id')
                .single();
              conversationId = conv?.id ?? null;
            } else {
              await supabaseAdmin
                .from('agent_conversations')
                .update({
                  last_message_at: new Date().toISOString(),
                  message_count: (conversationHistory?.length ?? 0) + 2,
                })
                .eq('id', conversationId);
            }

            if (conversationId) {
              await supabaseAdmin.from('agent_messages').insert([
                { conversation_id: conversationId, role: 'user', content: message },
                { conversation_id: conversationId, role: 'assistant', content: fullText },
              ]);
            }
          }
        }
      );

      // We need to intercept the stream to inject the final metadata event.
      // Use a TransformStream to append it after the upstream [DONE].
      const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
      const writer = writable.getWriter();

      // Pipe the upstream stream, then append metadata event
      ;(async () => {
        const reader = readableStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            await writer.write(value);
          }
          // After stream, send conversationId so client can persist it
          const meta = encoder.encode(
            `event: meta\ndata: ${JSON.stringify({ conversationId, agentId })}\n\n`
          );
          await writer.write(meta);
        } finally {
          await writer.close();
        }
      })();

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    // ── Pass 1: regular (non-streaming) chat call ──────────────────────────
    // Give Patel more tokens for potential tool_call JSON
    const aiResponse = await callOpenRouter(messages, isPatel ? 900 : 500, 0.7);

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    // ── Tool-call detection (Patel only) ───────────────────────────────────
    let chatReply = aiResponse;
    let artifact = null;

    if (isPatel) {
      const { chatReply: cleanReply, toolCall } = extractToolCall(aiResponse);

      if (toolCall) {
        chatReply = cleanReply;

        try {
          // If battle_card, do Tavily research first
          let researchData: Record<string, unknown> | null = null;
          if (toolCall.type === 'battle_card') {
            const competitor = (toolCall.context.competitor as string) || '';
            const product = (toolCall.context.ourProduct as string) || '';
            if (competitor) {
              researchData = await fetchTavilyResearch(
                `${competitor} company product pricing features reviews competitors vs ${product}`
              );
            }
          }

          // ── Pass 2: dedicated artifact generation ──────────────────────
          const artifactPrompt = getArtifactPrompt(toolCall.type, toolCall.context, researchData);
          const artifactRaw = await callOpenRouter(
            [
              { role: 'system', content: artifactPrompt },
              { role: 'user', content: 'Generate the deliverable now. Return ONLY valid JSON, no markdown fences, no explanation text.' },
            ],
            3000,  // higher token limit for structured output
            0.4    // lower temperature for consistency
          );

          // Clean potential markdown fences from response
          const cleanJson = artifactRaw
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

          const parsedContent = JSON.parse(cleanJson);
          const artifactTitle = parsedContent.title || toolCall.type.replace(/_/g, ' ');

          // Persist artifact to DB
          let artifactId = null;
          if (userId) {
            const convId = existingConversationId || null;
            const { data: saved } = await supabaseAdmin
              .from('agent_artifacts')
              .insert({
                conversation_id: convId,
                user_id: userId,
                agent_id: agentId,
                artifact_type: toolCall.type,
                title: artifactTitle,
                content: parsedContent,
              })
              .select('id')
              .single();
            artifactId = saved?.id ?? null;
          }

          artifact = {
            id: artifactId,
            type: toolCall.type,
            title: artifactTitle,
            content: parsedContent,
          };
        } catch (err) {
          // Artifact generation failed — return chat reply without artifact
          console.error('Artifact generation error:', err);
          // chatReply is already set to the clean reply
        }
      }
    }

    // ── Persist messages to DB ─────────────────────────────────────────────
    let conversationId = existingConversationId;
    if (userId) {
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

        // Update artifact with conversation_id if we just created it
        if (artifact?.id && conversationId) {
          await supabaseAdmin
            .from('agent_artifacts')
            .update({ conversation_id: conversationId })
            .eq('id', artifact.id);
        }
      } else {
        await supabaseAdmin
          .from('agent_conversations')
          .update({
            last_message_at: new Date().toISOString(),
            message_count: (conversationHistory?.length ?? 0) + 2
          })
          .eq('id', conversationId);
      }

      if (conversationId) {
        await supabaseAdmin.from('agent_messages').insert({
          conversation_id: conversationId,
          role: 'user',
          content: message
        });
        await supabaseAdmin.from('agent_messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: chatReply  // store the clean reply without tool_call tags
        });
      }
    }

    // Increment usage after successful non-streaming response
    if (usageId) await incrementUsage(usageId, supabaseAdmin);

    return NextResponse.json({
      response: chatReply,
      content: chatReply,
      agentId,
      conversationId,
      timestamp: new Date().toISOString(),
      ...(artifact ? { artifact } : {}),
    });

  } catch (error) {
    console.error('Agent chat error:', error);
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
  let contextSection = '';
  if (userContext) {
    contextSection = `\n\n**FOUNDER'S BUSINESS CONTEXT:**\n`;

    if (userContext.startupName) contextSection += `Startup: ${userContext.startupName}\n`;
    if (userContext.industry) contextSection += `Industry: ${userContext.industry}\n`;
    if (userContext.stage) contextSection += `Stage: ${userContext.stage}\n`;
    if (userContext.description) contextSection += `Business Description: ${userContext.description}\n`;

    if (userContext.assessment) {
      const assessment = userContext.assessment as Record<string, unknown>;
      const financial = assessment.financial as Record<string, number> | undefined;

      if (assessment.totalMarketSize) contextSection += `TAM: $${((assessment.totalMarketSize as number) / 1000000).toFixed(0)}M\n`;
      if (assessment.payingCustomers !== undefined) contextSection += `Paying Customers: ${assessment.payingCustomers}\n`;
      if (assessment.icpDescription) contextSection += `ICP: ${assessment.icpDescription}\n`;
      if (financial?.mrr) contextSection += `MRR: $${financial.mrr.toLocaleString()}\n`;
      if (financial?.monthlyBurn) contextSection += `Monthly Burn: $${financial.monthlyBurn.toLocaleString()}\n`;
      if (assessment.teamSize) contextSection += `Team Size: ${assessment.teamSize}\n`;
      if (assessment.founderStory) contextSection += `Founder Background: ${assessment.founderStory}\n`;
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

  const specialtyContext: Record<string, string> = {
    'patel': `
You help founders:
- Define their Ideal Customer Profile (ICP) with precision
- Build repeatable go-to-market playbooks
- Test and optimize acquisition channels
- Calculate and improve Customer Acquisition Cost (CAC)
- Design GTM experiments and measure results`,

    'susi': `
You help founders:
- Build repeatable sales processes from scratch
- Qualify leads effectively (BANT, MEDDIC)
- Design outbound sequences that convert
- Handle objections and close deals
- Scale from founder-led sales to a sales team`,

    'maya': `
You help founders:
- Craft compelling brand narratives and positioning
- Build content strategies that generate demand
- Develop thought leadership on LinkedIn/Twitter
- Create content calendars and distribution plans
- Measure content ROI and iterate`,

    'felix': `
You help founders:
- Build financial models (3-statement, unit economics)
- Track key SaaS metrics (MRR, ARR, churn, LTV:CAC)
- Forecast revenue growth and burn rate
- Make data-driven decisions about fundraising vs bootstrapping
- Present financials to investors`,

    'leo': `
You help founders:
- Choose the right legal entity structure (C-Corp, LLC)
- Protect intellectual property (patents, trademarks, trade secrets)
- Draft founder agreements and equity splits
- Navigate compliance and regulations
- Review contracts (customer, vendor, employment)`,

    'harper': `
You help founders:
- Hire the right people at the right time
- Structure compensation (salary, equity, benefits)
- Build strong company culture from day one
- Design hiring processes that attract A-players
- Manage performance and give feedback`,

    'nova': `
You help founders:
- Find and validate product-market fit
- Prioritize features and build roadmaps
- Design customer validation experiments
- Measure PMF signals (retention, NPS, growth)
- Decide when to pivot vs persevere`,

    'atlas': `
You help founders:
- Map competitive landscape and identify gaps
- Develop unique positioning and differentiation
- Research market trends and opportunities
- Analyze competitor strategies (pricing, GTM, product)
- Find unfair advantages`,

    'sage': `
You help founders:
- Build 12-month strategic roadmaps
- Set and track OKRs (Objectives and Key Results)
- Evaluate big decisions (build vs buy, expand, pivot)
- Think long-term (3-5 year vision)
- Prepare for fundraising milestones`
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

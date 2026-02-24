import { NextRequest, NextResponse } from 'next/server';

/**
 * Assessment Interview API
 *
 * AI evaluator "Q" conducts a conversational founder assessment.
 * Each response includes both a reply and structured data extraction.
 */

const TOPICS = [
  'your_story',        // Problem Origin + Unique Advantages → Team
  'customer_evidence', // Customer Evidence + Failed Assumptions → Product
  'learning_velocity', // Build-Measure-Learn → Product
  'market',            // Market Sizing & Competition → Market
  'gtm',              // Go-to-Market Strategy → GTM
  'financials',        // Financial Health → Financial
  'resilience',        // Hardest Moment → Team/Traction
] as const;

type Topic = typeof TOPICS[number];

const TOPIC_LABELS: Record<Topic, string> = {
  your_story:        'Your Story',
  customer_evidence: 'Customer Evidence',
  learning_velocity: 'What You\'ve Learned',
  market:            'Market & Competition',
  gtm:              'Go-to-Market',
  financials:        'The Numbers',
  resilience:        'Resilience',
};

// ─── termination logic ───────────────────────────────────────────────────────
const MAX_EXCHANGES_PER_TOPIC = 4;
const MAX_TOTAL_EXCHANGES = 25;

const TOPIC_FIELDS: Record<Topic, string[]> = {
  your_story:        ['problemStory', 'advantages', 'advantageExplanation'],
  customer_evidence: ['customerQuote', 'customerSurprise', 'customerCommitment', 'conversationCount', 'failedBelief'],
  learning_velocity: ['tested', 'buildTime', 'measurement', 'results', 'learned', 'changed'],
  market:            ['targetCustomers', 'conversionRate', 'lifetimeValue', 'costPerAcquisition'],
  gtm:              ['icpDescription', 'channelsTried', 'currentCAC'],
  financials:        ['mrr', 'monthlyBurn', 'runway'],
  resilience:        ['hardshipStory', 'motivation'],
};

function isTopicSufficient(topic: Topic, data: Record<string, unknown>): boolean {
  const fields = TOPIC_FIELDS[topic] || [];
  if (fields.length === 0) return false;
  const populated = fields.filter(f => data[f] != null && data[f] !== '' && data[f] !== 0).length;
  return populated / fields.length >= 0.7;
}

function buildSystemPrompt(currentTopic: Topic, coveredTopics: string[], extractedData: Record<string, unknown>) {
  const coveredStr = coveredTopics.length > 0
    ? `Topics already covered: ${coveredTopics.join(', ')}.`
    : 'No topics covered yet — this is the start of the interview.';

  const hasExistingData = Object.keys(extractedData).length > 0;
  const extractedStr = hasExistingData
    ? `\nData already extracted:\n${JSON.stringify(extractedData, null, 2)}\n\nIMPORTANT: Data has already been collected from a previous conversation. Do NOT re-ask about fields that are already populated. Focus on GAPS — fields that are missing or weak. Acknowledge what you know and move to what's missing.`
    : '';

  return `You are Q, a sharp VC evaluator at Edge Alpha conducting a founder assessment interview. You are direct, warm, and insightful — like a top-tier investor who genuinely wants founders to succeed.

CURRENT TOPIC: ${TOPIC_LABELS[currentTopic]}
${coveredStr}
${extractedStr}

YOUR ROLE:
- Ask ONE focused question at a time
- Probe vague answers — push for specific numbers, timelines, examples
- When you have enough data for the current topic, say so and suggest moving to the next topic
- Be conversational, not formulaic. Reference what the founder already told you.
- Keep replies to 2-4 sentences max.

TOPIC GUIDE (what data to extract for each):
1. YOUR STORY: problem they're solving, how they discovered it, personal connection, unique advantages, domain expertise
2. CUSTOMER EVIDENCE: number of customer conversations, direct quotes, commitment level (LOI/paid/interest), what surprised them, failed assumptions
3. LEARNING VELOCITY: what they tested, how long it took to build, what they measured, results, what changed
4. MARKET & COMPETITION: target customer count, TAM/SAM/SOM, conversion rates, competitive landscape, market timing
5. GO-TO-MARKET: ICP description, channels tried, spend per channel, CAC, messaging tested
6. FINANCIALS: MRR/ARR, monthly burn, runway, gross margin, unit economics (LTV, CAC, payback), 12-month projections
7. RESILIENCE: hardest moment, how close to quitting, what kept them going, motivation

EXTRACTION RULES:
After each founder message, extract any structured data you can identify. Return it as a JSON object in the "extraction" field. Only include fields where you have clear data — never guess. Use these field names:
- problemStory, advantages, advantageExplanation
- customerQuote, customerSurprise, customerCommitment, conversationCount, customerType, customerList
- failedBelief, failedDiscovery, failedChange
- tested, buildTime, measurement, results, learned, changed
- targetCustomers, conversionRate, lifetimeValue, costPerAcquisition, tam, sam, som
- icpDescription, channelsTried, currentCAC, targetCAC, messagingTested
- mrr, arr, monthlyBurn, runway, grossMargin, cogs, averageDealSize, projectedRevenue12mo
- hardshipStory, quitScale, motivation

For numbers, extract just the numeric value (e.g. "12400" not "$12,400").
For arrays, use JSON arrays (e.g. ["Content/SEO", "Paid Ads"]).

RESPONSE FORMAT:
You MUST respond with valid JSON only:
{
  "reply": "Your conversational response to the founder",
  "extraction": { ...any structured data extracted from their message... },
  "topicComplete": false,
  "suggestedNextTopic": null
}

Set topicComplete to true when you've gathered enough data for the current topic.
Set suggestedNextTopic to the next topic key (e.g. "customer_evidence") when moving on.
If no data can be extracted, use an empty object: {}`;
}

export async function POST(request: NextRequest) {
  try {
    const {
      message,
      conversationHistory = [],
      currentTopic = 'your_story',
      coveredTopics = [],
      extractedData = {},
    } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // ── termination checks ──────────────────────────────────────────────
    const userMessageCount = conversationHistory.filter(
      (m: { role: string }) => m.role === 'user'
    ).length + 1; // +1 for current message

    // Hard cap: force completion after max total exchanges
    if (userMessageCount >= MAX_TOTAL_EXCHANGES) {
      return NextResponse.json({
        reply: "We've covered a lot of ground — I have everything I need to calculate your Q-Score. Let me process your assessment now.",
        extraction: {},
        topicComplete: true,
        suggestedNextTopic: null,
        interviewComplete: true,
      });
    }

    // Check if current topic has enough data → auto-advance
    const topic = currentTopic as Topic;
    let forceTopicAdvance = false;
    if (isTopicSufficient(topic, extractedData)) {
      forceTopicAdvance = true;
    }

    // Per-topic exchange cap: count exchanges since last topic change
    // Approximate by counting recent user messages not in covered topics' context
    const recentUserMsgs = conversationHistory.filter(
      (m: { role: string }) => m.role === 'user'
    ).length;
    const topicStartIndex = coveredTopics.length > 0
      ? Math.max(0, recentUserMsgs - MAX_EXCHANGES_PER_TOPIC)
      : 0;
    const topicExchanges = recentUserMsgs - topicStartIndex;
    if (topicExchanges >= MAX_EXCHANGES_PER_TOPIC) {
      forceTopicAdvance = true;
    }

    // Build system prompt with optional advance nudge
    let promptAddendum = '';
    if (forceTopicAdvance) {
      const remainingTopics = TOPICS.filter(t => !coveredTopics.includes(t) && t !== topic);
      if (remainingTopics.length === 0) {
        // All topics covered
        return NextResponse.json({
          reply: "Excellent — we've covered all the key areas. I have a solid picture of your startup. Let me calculate your Q-Score now.",
          extraction: {},
          topicComplete: true,
          suggestedNextTopic: null,
          interviewComplete: true,
        });
      }
      promptAddendum = `\n\nIMPORTANT: You have enough data on "${TOPIC_LABELS[topic]}". Wrap up this topic NOW — set topicComplete to true and suggestedNextTopic to "${remainingTopics[0]}". Do NOT ask more questions on this topic.`;
    }

    const systemPrompt = buildSystemPrompt(
      topic,
      coveredTopics,
      extractedData,
    ) + promptAddendum;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-12).map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://edgealpha.ai',
        'X-Title': 'Edge Alpha Assessment',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        messages,
        temperature: 0.6,
        max_tokens: 600,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter error:', errText);
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    const rawContent = data.choices[0]?.message?.content;

    if (!rawContent) {
      throw new Error('No response from AI');
    }

    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      // AI didn't return valid JSON — extract reply text safely
      // Try to extract just the "reply" field from malformed JSON
      const replyMatch = rawContent.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (replyMatch) {
        parsed = {
          reply: replyMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
          extraction: {},
          topicComplete: false,
          suggestedNextTopic: null,
        };
      } else if (rawContent.trim().startsWith('{')) {
        // Looks like JSON but failed to parse — strip JSON artifacts
        const cleaned = rawContent
          .replace(/[{}"\\[\]]/g, '')
          .replace(/\b(reply|extraction|topicComplete|suggestedNextTopic)\b\s*:/gi, '')
          .replace(/,\s*/g, ' ')
          .trim();
        parsed = {
          reply: cleaned || "Let me rephrase that. Tell me more about what you're working on.",
          extraction: {},
          topicComplete: false,
          suggestedNextTopic: null,
        };
      } else {
        // Plain text response from AI
        parsed = {
          reply: rawContent,
          extraction: {},
          topicComplete: false,
          suggestedNextTopic: null,
        };
      }
    }

    // Check if interview should complete (all topics covered)
    const topicComplete = parsed.topicComplete || forceTopicAdvance || false;
    const updatedCovered = topicComplete && !coveredTopics.includes(topic)
      ? [...coveredTopics, topic]
      : coveredTopics;
    const allCovered = TOPICS.every(t => updatedCovered.includes(t));

    return NextResponse.json({
      reply: parsed.reply || rawContent,
      extraction: parsed.extraction || {},
      topicComplete,
      suggestedNextTopic: parsed.suggestedNextTopic || null,
      interviewComplete: allCovered,
    });

  } catch (error) {
    console.error('Assessment interview error:', error);
    return NextResponse.json({
      reply: "I'm having a moment — could you repeat that? Let's keep going.",
      extraction: {},
      topicComplete: false,
      suggestedNextTopic: null,
      error: true,
    }, { status: 500 });
  }
}

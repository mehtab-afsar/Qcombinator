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

function buildSystemPrompt(currentTopic: Topic, coveredTopics: string[], extractedData: Record<string, unknown>) {
  const coveredStr = coveredTopics.length > 0
    ? `Topics already covered: ${coveredTopics.join(', ')}.`
    : 'No topics covered yet — this is the start of the interview.';

  const extractedStr = Object.keys(extractedData).length > 0
    ? `\nData already extracted:\n${JSON.stringify(extractedData, null, 2)}`
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

    const systemPrompt = buildSystemPrompt(
      currentTopic as Topic,
      coveredTopics,
      extractedData,
    );

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
      // If AI didn't return valid JSON, wrap it
      parsed = {
        reply: rawContent,
        extraction: {},
        topicComplete: false,
        suggestedNextTopic: null,
      };
    }

    return NextResponse.json({
      reply: parsed.reply || rawContent,
      extraction: parsed.extraction || {},
      topicComplete: parsed.topicComplete || false,
      suggestedNextTopic: parsed.suggestedNextTopic || null,
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

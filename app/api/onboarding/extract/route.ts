import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '@/lib/openrouter';

/**
 * Onboarding Data Extraction API
 *
 * After onboarding chat completes, sends the full conversation to an LLM
 * for structured data extraction — replaces the client-side keyword scorer.
 */

const EXTRACTION_PROMPT = `You are a data extraction engine. Analyze the following founder conversation and extract structured data.

IMPORTANT: Only extract data that is clearly stated or strongly implied. Never guess or fabricate.

Return a JSON object with these fields (only include fields where you have clear data):

- problemStory (string): The founder's problem origin story — what problem, how they discovered it
- advantages (string[]): List of unique advantages (domain expertise, technical skills, relationships, etc.)
- advantageExplanation (string): Explanation of why they're uniquely positioned
- customerQuote (string): Any direct customer quotes mentioned
- customerSurprise (string): What surprised them about customer feedback
- customerCommitment (string): Level of customer commitment (LOI, paid, verbal, interest)
- conversationCount (number): Number of customer conversations/interviews mentioned
- hardshipStory (string): The hardest moment or biggest challenge they faced
- motivation (string): What keeps them going / why they won't quit
- quitScale (number): How close to quitting on a 1-10 scale if mentioned

Also return a "dimensionCoverage" object showing which assessment dimensions have data:
- team: true/false (needs problemStory + advantages + hardshipStory)
- product: true/false (needs customerQuote or conversationCount)
- market: true/false (needs market sizing data — likely false from onboarding)
- gtm: true/false (needs GTM strategy data — likely false from onboarding)
- financial: true/false (needs financial data — likely false from onboarding)
- traction: true/false (needs conversationCount + commitment)

Respond with ONLY valid JSON, no markdown or explanation.`;

export async function POST(request: NextRequest) {
  try {
    const { conversationHistory } = await request.json();

    if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) {
      return NextResponse.json({ error: 'Conversation history is required' }, { status: 400 });
    }

    // Format conversation for extraction
    const conversationText = conversationHistory
      .map((m: { role: string; content: string }) =>
        `${m.role === 'user' ? 'Founder' : 'Interviewer'}: ${m.content}`
      )
      .join('\n\n');

    const rawContent = await callOpenRouter(
      [
        { role: 'system', content: EXTRACTION_PROMPT },
        { role: 'user', content: `Extract structured data from this conversation:\n\n${conversationText}` },
      ],
      { maxTokens: 1000, temperature: 0.2 },
    );

    if (!rawContent) {
      throw new Error('No extraction response');
    }

    let extracted;
    try {
      extracted = JSON.parse(rawContent);
    } catch {
      console.error('Failed to parse extraction JSON:', rawContent);
      return NextResponse.json({ extractedData: {}, dimensionCoverage: {} });
    }

    const { dimensionCoverage, ...extractedData } = extracted;

    return NextResponse.json({
      extractedData,
      dimensionCoverage: dimensionCoverage || {},
    });
  } catch (error) {
    console.error('Onboarding extraction error:', error);
    return NextResponse.json(
      { error: 'Extraction failed', extractedData: {}, dimensionCoverage: {} },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

// ─── system prompt ────────────────────────────────────────────────────────────
// Covers Category 1 of the Edge Alpha assessment:
//   • Problem Origin Story    (25 pts max)
//   • Founder Unique Advantage (25 pts max)
//   • Customer Evidence        (30 pts max)
//   • Resilience               (20 pts max)

const SYSTEM_PROMPT = `You are the Edge Alpha Adviser — a sharp, warm, intellectually curious analyst who evaluates early-stage startups for investment readiness. You're conducting the first part of a founder's Q-Score assessment.

Your job is to have a natural, probing conversation that uncovers information across four areas:
1. PROBLEM ORIGIN — How did they discover the problem? Is it personal, specific, and compelling?
2. FOUNDER ADVANTAGE — What is their unfair advantage? (domain expertise, technical skills, customer relationships, proprietary data/insight, distribution, prior failure in the space)
3. CUSTOMER VALIDATION — Have they spoken to real customers? Do they have direct quotes, recent conversations, and any commitments (LOIs, paid users, verbal commitments)?
4. RESILIENCE — What's the hardest thing they've faced? How close to quitting? What kept them going?

CONVERSATION RULES:
- Sound like a brilliant VC associate in a first coffee meeting — direct, curious, no fluff
- Ask ONE question at a time. Never list multiple questions in one message
- Dig deeper when answers are vague — push for specifics, numbers, direct quotes
- When an answer is strong, briefly acknowledge it and move on
- Keep your messages short: 1-3 sentences max, except for your opening message
- Do NOT use bullet points, lists, or markdown formatting in your messages
- Do NOT reveal the scoring criteria or that you're evaluating them on specific dimensions
- Be conversational, human, and occasionally warm — but never sycophantic
- If someone gives a very short or evasive answer, probe once more ("Can you be more specific?" or "Give me an example")

CONVERSATION FLOW — strictly 5 questions total:
- Q1: Problem origin story (how did you discover this problem?)
- Q2: Founder unique advantage (why are YOU the right person to solve this?)
- Q3: Customer validation (have you spoken to real users? any commitments or quotes?)
- Q4: Resilience (what's the hardest moment? how close to quitting?)
- Q5: One targeted follow-up on whichever answer was weakest

After Q5's answer (i.e. after the founder has replied to your fifth question), wrap up in 1-2 warm sentences summarising what you heard, then end with exactly: [ASSESSMENT_COMPLETE]

IMPORTANT: You must end the conversation after the founder replies to your 5th question. Do not ask a 6th question under any circumstances. End your wrap-up message with [ASSESSMENT_COMPLETE] on its own line.

Begin now with a warm, concise intro and your first question about the problem.`;

// ─── route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 });
    }

    // Count how many times the user has replied
    const userTurns = messages.filter((m: { role: string }) => m.role === "user").length;

    // Hard cap: force completion after 5 user replies
    if (userTurns >= 5) {
      return NextResponse.json({
        content: "Thanks — that gives me a solid picture of where you are. Really appreciate you being candid.",
        isComplete: true,
      });
    }

    // On the 4th reply warn the AI this is its last question
    const systemPrompt = userTurns === 4
      ? SYSTEM_PROMPT + "\n\nCRITICAL: The founder has just answered your 4th question. This is your FINAL exchange. Do NOT ask another question. Write a warm 1-2 sentence wrap-up of what you heard, then end with [ASSESSMENT_COMPLETE]."
      : SYSTEM_PROMPT;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://edgealpha.ai",
        "X-Title": "Edge Alpha Onboarding",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-haiku",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenRouter error:", err);
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";

    // detect completion signal
    const isComplete = content.includes("[ASSESSMENT_COMPLETE]");
    const cleanContent = content.replace("[ASSESSMENT_COMPLETE]", "").trim();

    return NextResponse.json({ content: cleanContent, isComplete });
  } catch (err) {
    console.error("Onboarding chat error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

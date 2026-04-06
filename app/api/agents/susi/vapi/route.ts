/**
 * POST /api/agents/susi/vapi
 *
 * Initiates an AI voice call via Vapi.ai to qualify a lead and book a meeting.
 * Susi uses this to automatically call leads, qualify them against the ICP,
 * and offer a Calendly booking link if they're interested.
 *
 * Body: {
 *   phone_number: string      (E.164 format: +14155551234)
 *   contact_name: string
 *   company?: string
 *   objective: 'qualify_and_book' | 'follow_up' | 'reactivate'
 *   calendar_link?: string
 *   deal_id?: string          (to update in CRM after call)
 *   custom_context?: string   (extra info about this lead to personalise the call)
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const VAPI_API_BASE = 'https://api.vapi.ai';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await supabase.auth.getUser(token);
  return data.user?.id ?? null;
}

const CALL_SCRIPTS: Record<string, string> = {
  qualify_and_book: `You are a friendly, professional sales development representative calling on behalf of the founder. Your goal is to qualify this prospect and book a 30-minute demo call if they are a good fit.

Opening: "Hi {{contact_name}}, this is [Company] calling. Do you have 2 minutes? I'm reaching out because [Company] helps [ICP pain point]."

Qualification questions (ask 1-2 naturally, not all at once):
- "How are you currently handling [problem area]?"
- "What's the biggest challenge you're facing with [relevant area] right now?"
- "How many people in your team deal with this?"

If qualified: "It sounds like we could be a great fit. Would you be open to a 30-minute call this week to see how we can help? I can share a link to book a time that works for you."

If not a fit: Thank them genuinely and end politely. Do not push.

Calendar link to share if they agree: {{calendar_link}}`,

  follow_up: `You are following up with someone who previously showed interest but has gone quiet. Be warm and brief.

Opening: "Hi {{contact_name}}, this is [Company] following up from our recent conversation. I just wanted to check in — do you have 2 minutes?"

Goal: Re-engage, understand what changed, and re-book if possible.

Keep the call under 3 minutes. If they're not interested now, ask if there's a better time to reconnect in the future.

Calendar link: {{calendar_link}}`,

  reactivate: `You are reaching out to a former prospect or churned customer to re-engage them.

Opening: "Hi {{contact_name}}, this is [Company]. We've made some significant improvements since we last spoke — do you have 2 minutes?"

Goal: Share one specific improvement relevant to their previous objection, and offer to reconnect.

Calendar link: {{calendar_link}}`,
};

export async function POST(req: NextRequest) {
  const vapiKey = process.env.VAPI_API_KEY;
  if (!vapiKey) {
    return NextResponse.json(
      { error: 'Vapi.ai API key not configured. Add VAPI_API_KEY to your environment.' },
      { status: 503 },
    );
  }

  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    phone_number?: string;
    contact_name?: string;
    company?: string;
    objective?: 'qualify_and_book' | 'follow_up' | 'reactivate';
    calendar_link?: string;
    deal_id?: string;
    custom_context?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { phone_number, contact_name, company, objective = 'qualify_and_book', calendar_link, deal_id, custom_context } = body;

  if (!phone_number || !contact_name) {
    return NextResponse.json({ error: 'phone_number and contact_name are required' }, { status: 400 });
  }

  // Build call script
  let script = CALL_SCRIPTS[objective] ?? CALL_SCRIPTS.qualify_and_book;
  script = script
    .replace(/\{\{contact_name\}\}/g, contact_name)
    .replace(/\{\{calendar_link\}\}/g, calendar_link ?? 'I will text you the link after this call');

  if (custom_context) {
    script = `Additional context about this prospect: ${custom_context}\n\n${script}`;
  }

  // Vapi call payload
  const vapiPayload = {
    phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID, // provisioned Vapi number
    customer: {
      number: phone_number,
      name:   contact_name,
    },
    assistant: {
      model: {
        provider: 'groq',
        model:    'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: script }],
      },
      voice: {
        provider: '11labs',
        voiceId:  process.env.VAPI_VOICE_ID ?? 'rachel', // professional voice
      },
      transcriber: {
        provider: 'deepgram',
        model:    'nova-2',
        language: 'en',
      },
      endCallFunctionEnabled: true,
      maxDurationSeconds:     300, // 5 minute max
    },
    metadata: { userId, dealId: deal_id, company, objective },
  };

  try {
    const vapiRes = await fetch(`${VAPI_API_BASE}/call`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${vapiKey}`,
        'Content-Type':  'application/json',
      },
      body:   JSON.stringify(vapiPayload),
      signal: AbortSignal.timeout(10_000),
    });

    if (!vapiRes.ok) {
      const errText = await vapiRes.text();
      return NextResponse.json(
        { error: `Vapi API error: ${vapiRes.status}`, detail: errText.slice(0, 500) },
        { status: 502 },
      );
    }

    const callData = await vapiRes.json();

    // Log to agent_activity
    const supabase = getAdminClient();

    const activityInsert = supabase.from('agent_activity').insert({
      user_id:     userId,
      agent_id:    'susi',
      action_type: 'vapi_call_initiated',
      description: `AI call initiated to ${contact_name}${company ? ` at ${company}` : ''} (objective: ${objective})`,
      metadata:    { callId: callData.id, phone_number, contact_name, company, objective, deal_id },
    });

    // Update deal record if deal_id provided
    const dealUpdate = deal_id
      ? supabase.from('deals').update({
          notes:       `AI call initiated ${new Date().toISOString()} — ${objective}`,
          next_action: 'Check call outcome in 1 hour',
          updated_at:  new Date().toISOString(),
        }).eq('id', deal_id).eq('user_id', userId)
      : Promise.resolve();

    await Promise.all([activityInsert, dealUpdate]);

    return NextResponse.json({
      call_id:    callData.id,
      status:     callData.status ?? 'initiated',
      message:    `AI call to ${contact_name} initiated. You will receive a transcript when the call completes.`,
      contact:    { name: contact_name, phone: phone_number, company },
      objective,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Vapi API timeout' }, { status: 504 });
    }
    return NextResponse.json(
      { error: `Vapi call failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}

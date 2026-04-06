/**
 * POST /api/agents/calendly
 *
 * Generates a Calendly booking link for a meeting.
 * Used by Susi (demo/discovery), Harper (interviews), Carter (QBRs/onboarding).
 *
 * Requires CALENDLY_API_KEY and CALENDLY_USER_URI in environment.
 *
 * Body: {
 *   meeting_type: 'demo' | 'discovery' | 'qbr' | 'interview' | 'onboarding_call' | 'follow_up'
 *   duration_minutes?: 15 | 30 | 45 | 60
 *   context?: string
 * }
 *
 * Returns: { booking_url, event_type_name, duration_minutes }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const CALENDLY_API_BASE = 'https://api.calendly.com';

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

// Friendly names for each meeting type
const MEETING_TYPE_LABELS: Record<string, string> = {
  demo:           'Product Demo',
  discovery:      'Discovery Call',
  qbr:            'Quarterly Business Review',
  interview:      'Candidate Interview',
  onboarding_call:'Onboarding Call',
  follow_up:      '15-Min Follow-Up',
};

export async function POST(req: NextRequest) {
  const apiKey    = process.env.CALENDLY_API_KEY;
  const userUri   = process.env.CALENDLY_USER_URI;

  if (!apiKey || !userUri) {
    // Graceful fallback — return a generic scheduling note
    return NextResponse.json(
      { error: 'Calendly not configured. Add CALENDLY_API_KEY and CALENDLY_USER_URI to your environment.' },
      { status: 503 },
    );
  }

  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    meeting_type?: string;
    duration_minutes?: number;
    context?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { meeting_type = 'demo', duration_minutes = 30 } = body;

  try {
    // Fetch the user's event types to find the right one
    const etRes = await fetch(
      `${CALENDLY_API_BASE}/event_types?user=${encodeURIComponent(userUri)}&count=50`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type':  'application/json',
        },
        signal: AbortSignal.timeout(8_000),
      },
    );

    if (!etRes.ok) {
      const errText = await etRes.text();
      return NextResponse.json(
        { error: `Calendly API error: ${etRes.status}`, detail: errText.slice(0, 300) },
        { status: 502 },
      );
    }

    const etData = await etRes.json();
    const eventTypes: Array<{
      uri: string;
      name: string;
      duration: number;
      scheduling_url: string;
      active: boolean;
    }> = etData.collection ?? [];

    // Find the best matching event type by duration and name
    const targetLabel = MEETING_TYPE_LABELS[meeting_type] ?? meeting_type;
    let matched = eventTypes.find(
      et => et.active && et.duration === duration_minutes &&
        et.name.toLowerCase().includes(meeting_type.replace('_', ' '))
    );

    // Fallback: match by duration only
    if (!matched) {
      matched = eventTypes.find(et => et.active && et.duration === duration_minutes);
    }

    // Final fallback: first active event type
    if (!matched) {
      matched = eventTypes.find(et => et.active);
    }

    if (!matched) {
      return NextResponse.json(
        { error: 'No active Calendly event types found. Please create at least one event type in your Calendly account.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      booking_url:     matched.scheduling_url,
      event_type_name: matched.name,
      duration_minutes: matched.duration,
      meeting_type,
      label:           targetLabel,
      message:         `Share this link to book a ${matched.duration}-minute ${targetLabel}: ${matched.scheduling_url}`,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Calendly API timeout' }, { status: 504 });
    }
    return NextResponse.json(
      { error: `Calendly request failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}

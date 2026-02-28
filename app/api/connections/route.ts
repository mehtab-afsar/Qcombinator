import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET  /api/connections
 * Returns the current founder's connection request statuses,
 * keyed by demo_investor_id, so the matching page can restore UI state.
 *
 * POST /api/connections
 * Saves a connection request from the authenticated founder to a demo investor.
 * Body: { demo_investor_id: string, personal_message: string, founder_qscore: number }
 */

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('connection_requests')
      .select('demo_investor_id, status, created_at')
      .eq('founder_id', user.id)
      .not('demo_investor_id', 'is', null);

    if (error) {
      console.error('Connections GET error:', error);
      return NextResponse.json({ connections: [] });
    }

    // Return as a map: { [demo_investor_id]: status }
    // Normalize DB status values to the badge component's expected format
    const STATUS_MAP: Record<string, string> = {
      meeting_scheduled: 'meeting-scheduled',
      declined: 'passed',
    };
    const statusMap: Record<string, string> = {};
    for (const row of data ?? []) {
      if (row.demo_investor_id) {
        statusMap[row.demo_investor_id] = STATUS_MAP[row.status] ?? row.status;
      }
    }

    return NextResponse.json({ connections: statusMap });
  } catch (err) {
    console.error('Connections GET unexpected error:', err);
    return NextResponse.json({ connections: {} });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { demo_investor_id, personal_message, founder_qscore } = await request.json();

    if (!demo_investor_id) {
      return NextResponse.json({ error: 'demo_investor_id is required' }, { status: 400 });
    }

    // Upsert: if already exists, keep existing row (don't re-send)
    const { data: existing } = await supabase
      .from('connection_requests')
      .select('id, status')
      .eq('founder_id', user.id)
      .eq('demo_investor_id', demo_investor_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ status: existing.status, already_exists: true });
    }

    const { data, error } = await supabase
      .from('connection_requests')
      .insert({
        founder_id: user.id,
        demo_investor_id,
        personal_message: personal_message || '',
        founder_qscore: founder_qscore || null,
        status: 'pending',
      })
      .select('id, status')
      .single();

    if (error) {
      console.error('Connections POST error:', error);
      return NextResponse.json({ error: 'Failed to save connection request' }, { status: 500 });
    }

    return NextResponse.json({ status: data.status, id: data.id });
  } catch (err) {
    console.error('Connections POST unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

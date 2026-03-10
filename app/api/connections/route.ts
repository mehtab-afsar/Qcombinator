import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET  /api/connections
 * Returns the current founder's connection request statuses,
 * keyed by demo_investor_id (demo) or investor_id (real investors).
 *
 * POST /api/connections
 * Body: { demo_investor_id?, investor_id?, personal_message, founder_qscore }
 * Exactly one of demo_investor_id or investor_id must be present.
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
      .select('id, demo_investor_id, investor_id, status')
      .eq('founder_id', user.id);

    if (error) {
      console.error('Connections GET error:', error);
      return NextResponse.json({ connections: {}, connectionIds: {} });
    }

    const STATUS_MAP: Record<string, string> = {
      meeting_scheduled: 'meeting-scheduled',
      declined: 'passed',
    };
    const statusMap: Record<string, string> = {};
    const idMap: Record<string, string> = {};
    for (const row of data ?? []) {
      const key = row.demo_investor_id ?? row.investor_id;
      if (key) {
        statusMap[key] = STATUS_MAP[row.status] ?? row.status;
        idMap[key] = row.id;
      }
    }

    return NextResponse.json({ connections: statusMap, connectionIds: idMap });
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

    const { demo_investor_id, investor_id, personal_message, founder_qscore } = await request.json();

    if (!demo_investor_id && !investor_id) {
      return NextResponse.json({ error: 'demo_investor_id or investor_id is required' }, { status: 400 });
    }

    // Check for existing request to avoid duplicates
    const dupQuery = supabase
      .from('connection_requests')
      .select('id, status')
      .eq('founder_id', user.id);

    const { data: existing } = await (demo_investor_id
      ? dupQuery.eq('demo_investor_id', demo_investor_id)
      : dupQuery.eq('investor_id', investor_id)
    ).maybeSingle();

    if (existing) {
      return NextResponse.json({ status: existing.status, already_exists: true });
    }

    const insertRow: Record<string, unknown> = {
      founder_id: user.id,
      personal_message: personal_message || '',
      founder_qscore: founder_qscore || null,
      status: 'pending',
    };
    if (demo_investor_id) insertRow.demo_investor_id = demo_investor_id;
    if (investor_id)      insertRow.investor_id      = investor_id;

    const { data, error } = await supabase
      .from('connection_requests')
      .insert(insertRow)
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

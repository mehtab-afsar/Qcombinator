import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAuth } from '@/lib/auth/verify';
import { log } from '@/lib/logger';

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
    const auth = await verifyAuth();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { user } = auth;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('connection_requests')
      .select('id, demo_investor_id, investor_id, status')
      .eq('founder_id', user.id);

    if (error) {
      log.error('GET /api/connections db error', { error, userId: user.id });
      return NextResponse.json({ error: 'Failed to load connections' }, { status: 500 });
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
    log.error('GET /api/connections unexpected', { err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { user } = auth;
    const supabase = await createClient();
    const admin = createAdminClient();

    const { demo_investor_id, investor_id, personal_message, founder_qscore } = await request.json();

    if (!demo_investor_id && !investor_id) {
      return NextResponse.json({ error: 'demo_investor_id or investor_id is required' }, { status: 400 });
    }

    // ── Check investor_connection usage limit (atomic RPC) ──────────────────
    try {
      const { data: usageData, error: usageErr } = await admin.rpc('increment_usage_if_allowed', {
        p_user_id: user.id,
        p_feature: 'investor_connection',
      }) as { data: Array<{ allowed: boolean; remaining: number }> | null; error: unknown }

      if (!usageErr && usageData?.[0]?.allowed === false) {
        return NextResponse.json({
          error: 'Monthly investor connection limit reached',
          limitReached: true,
          remaining: 0,
        }, { status: 429 });
      }
    } catch {
      // Usage check failed — allow through (fail-open)
      log.warn('investor_connection usage check failed — allowing through', { userId: user.id });
    }

    const insertRow: Record<string, unknown> = {
      founder_id: user.id,
      personal_message: personal_message || '',
      founder_qscore: founder_qscore || null,
      status: 'pending',
    };
    if (demo_investor_id) insertRow.demo_investor_id = demo_investor_id;
    if (investor_id)      insertRow.investor_id      = investor_id;

    // Upsert — UNIQUE constraints on (founder_id, demo_investor_id) and (founder_id, investor_id)
    // prevent duplicates even under concurrent requests (see migration 20260512000004).
    const conflictCol = demo_investor_id ? 'founder_id,demo_investor_id' : 'founder_id,investor_id';
    const { data, error } = await supabase
      .from('connection_requests')
      .upsert(insertRow, { onConflict: conflictCol, ignoreDuplicates: true })
      .select('id, status')
      .single();

    if (error) {
      log.error('POST /api/connections upsert error', { error, userId: user.id });
      return NextResponse.json({ error: 'Failed to save connection request' }, { status: 500 });
    }

    // ignoreDuplicates: when a conflict is ignored Supabase returns no row
    if (!data) {
      return NextResponse.json({ status: 'pending', already_exists: true });
    }

    // Notify the real investor (demo investors have no user account to notify)
    if (investor_id) {
      try {
        const { data: fp } = await supabase
          .from('founder_profiles')
          .select('full_name, startup_name')
          .eq('user_id', user.id)
          .single()
        const founderName = (fp as { full_name?: string } | null)?.full_name   ?? 'A founder'
        const companyName = (fp as { startup_name?: string } | null)?.startup_name ?? 'their startup'
        await supabase.from('notifications').insert({
          user_id:  investor_id,
          type:     'connection_request',
          title:    `${founderName} from ${companyName} wants to connect`,
          read:     false,
          metadata: { connection_id: data.id, founder_id: user.id },
        })
      } catch (notifErr) {
        log.error('POST /api/connections notification insert failed', { notifErr, userId: user.id })
      }
    }

    return NextResponse.json({ status: data.status, id: data.id }, { status: 201 });
  } catch (err) {
    log.error('POST /api/connections unexpected', { err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

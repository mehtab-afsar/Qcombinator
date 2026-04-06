/**
 * POST /api/agents/nova/posthog
 *
 * Queries PostHog for real product analytics data.
 * Used by Nova (CPO) for retention/PMF analysis and Carter (CCO) for health scoring.
 *
 * Body: {
 *   query_type: 'retention' | 'funnel' | 'active_users' | 'feature_usage' | 'churn_signals' | 'nps_scores'
 *   date_range?: '7d' | '14d' | '30d' | '90d'  (default: '30d')
 *   segment?: string
 * }
 *
 * Requires POSTHOG_API_KEY and POSTHOG_PROJECT_ID in environment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const POSTHOG_API_BASE = 'https://app.posthog.com';

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

// Map query_type to PostHog API endpoint + payload
function buildPostHogQuery(
  queryType: string,
  dateRange: string,
  segment?: string,
): { endpoint: string; payload: Record<string, unknown> } {
  const dateFrom = `-${dateRange}`;

  const baseFilter = segment
    ? [{ key: '$segment', value: segment, operator: 'exact', type: 'person' }]
    : [];

  switch (queryType) {
    case 'retention':
      return {
        endpoint: `/api/projects/${process.env.POSTHOG_PROJECT_ID}/insights/retention/`,
        payload: {
          date_from:      dateFrom,
          period:         'Day',
          target_entity:  { id: '$pageview', name: '$pageview', type: 'events' },
          returning_entity: { id: '$pageview', name: '$pageview', type: 'events' },
          total_intervals: dateRange === '90d' ? 12 : dateRange === '30d' ? 8 : 4,
          properties:     baseFilter,
        },
      };

    case 'active_users':
      return {
        endpoint: `/api/projects/${process.env.POSTHOG_PROJECT_ID}/insights/trend/`,
        payload: {
          date_from:  dateFrom,
          events:     [{ id: '$pageview', name: 'Active Users', math: 'dau' }],
          display:    'ActionsLineGraph',
          properties: baseFilter,
        },
      };

    case 'funnel':
      return {
        endpoint: `/api/projects/${process.env.POSTHOG_PROJECT_ID}/insights/funnel/`,
        payload: {
          date_from:  dateFrom,
          events: [
            { id: 'signed_up',        order: 0 },
            { id: 'onboarding_complete', order: 1 },
            { id: 'first_key_action',  order: 2 },
            { id: 'returned_day_7',    order: 3 },
          ],
          properties: baseFilter,
        },
      };

    case 'feature_usage':
      return {
        endpoint: `/api/projects/${process.env.POSTHOG_PROJECT_ID}/insights/trend/`,
        payload: {
          date_from:  dateFrom,
          events:     [{ id: '$autocapture', name: 'Feature Usage', math: 'unique_session' }],
          breakdown:  '$current_url',
          display:    'ActionsTable',
          properties: baseFilter,
        },
      };

    case 'churn_signals':
      return {
        endpoint: `/api/projects/${process.env.POSTHOG_PROJECT_ID}/insights/trend/`,
        payload: {
          date_from:  `-${dateRange}`,
          events:     [{ id: '$pageview', name: 'Sessions', math: 'unique_session' }],
          // Churned = users who had sessions before but not in last 7 days
          properties: [
            ...baseFilter,
            { key: '$last_seen', value: '-7d', operator: 'is_before', type: 'person' },
          ],
        },
      };

    case 'nps_scores':
      return {
        endpoint: `/api/projects/${process.env.POSTHOG_PROJECT_ID}/insights/trend/`,
        payload: {
          date_from:  dateFrom,
          events:     [{ id: 'nps_submitted', name: 'NPS Responses' }],
          breakdown:  'score',
          display:    'ActionsTable',
          properties: baseFilter,
        },
      };

    default:
      return {
        endpoint: `/api/projects/${process.env.POSTHOG_PROJECT_ID}/insights/trend/`,
        payload:  { date_from: dateFrom, events: [{ id: '$pageview' }] },
      };
  }
}

export async function POST(req: NextRequest) {
  const apiKey     = process.env.POSTHOG_API_KEY;
  const projectId  = process.env.POSTHOG_PROJECT_ID;

  if (!apiKey || !projectId) {
    return NextResponse.json(
      { error: 'PostHog not configured. Add POSTHOG_API_KEY and POSTHOG_PROJECT_ID to your environment.' },
      { status: 503 },
    );
  }

  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    query_type?: string;
    date_range?: '7d' | '14d' | '30d' | '90d';
    segment?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { query_type = 'active_users', date_range = '30d', segment } = body;

  const { endpoint, payload } = buildPostHogQuery(query_type, date_range, segment);

  try {
    const phRes = await fetch(`${POSTHOG_API_BASE}${endpoint}`, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body:   JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });

    if (!phRes.ok) {
      const errText = await phRes.text();
      return NextResponse.json(
        { error: `PostHog API error: ${phRes.status}`, detail: errText.slice(0, 500) },
        { status: 502 },
      );
    }

    const data = await phRes.json();

    // Return a clean, LLM-friendly summary
    return NextResponse.json({
      query_type,
      date_range,
      segment: segment ?? 'all_users',
      results: data.result ?? data,
      next_url: data.next,
      summary: `PostHog ${query_type} query for ${date_range} returned ${Array.isArray(data.result) ? data.result.length : 'results'} data points.`,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return NextResponse.json({ error: 'PostHog API timeout' }, { status: 504 });
    }
    return NextResponse.json(
      { error: `PostHog query failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}

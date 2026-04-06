/**
 * POST /api/agents/patel/apollo
 *
 * Apollo.io people search — returns ICP-matched contacts with verified
 * emails and LinkedIn URLs. Used by Patel (CMO) and Riley (CGO).
 *
 * Replaces Hunter.io domain-only lookup with a full people-search API
 * capable of filtering by title, industry, company size, location, and keywords.
 *
 * Body: {
 *   job_titles: string[]
 *   industries?: string[]
 *   employee_count_min?: number
 *   employee_count_max?: number
 *   locations?: string[]
 *   keywords?: string[]
 *   per_page?: number   (max 100, default 25)
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const APOLLO_API_BASE = 'https://api.apollo.io/v1';

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

export async function POST(req: NextRequest) {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Apollo.io API key not configured. Add APOLLO_API_KEY to your environment.' },
      { status: 503 },
    );
  }

  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    job_titles?: string[];
    industries?: string[];
    employee_count_min?: number;
    employee_count_max?: number;
    locations?: string[];
    keywords?: string[];
    per_page?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { job_titles, industries, employee_count_min, employee_count_max, locations, keywords, per_page = 25 } = body;

  if (!job_titles || job_titles.length === 0) {
    return NextResponse.json({ error: 'job_titles is required' }, { status: 400 });
  }

  // Build Apollo people/search payload
  const apolloPayload: Record<string, unknown> = {
    api_key: apiKey,
    page: 1,
    per_page: Math.min(per_page, 100),
    person_titles: job_titles,
    contact_email_status: ['verified', 'likely to engage'],
  };

  if (industries?.length)          apolloPayload.organization_industry_tag_ids = industries;
  if (employee_count_min != null)  apolloPayload.organization_num_employees_ranges = [`${employee_count_min ?? 1},${employee_count_max ?? 100000}`];
  if (locations?.length)           apolloPayload.person_locations = locations;
  if (keywords?.length)            apolloPayload.q_keywords = keywords.join(' ');

  try {
    const apolloRes = await fetch(`${APOLLO_API_BASE}/mixed_people/search`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body:    JSON.stringify(apolloPayload),
      signal:  AbortSignal.timeout(15_000),
    });

    if (!apolloRes.ok) {
      const errText = await apolloRes.text();
      return NextResponse.json(
        { error: `Apollo API error: ${apolloRes.status}`, detail: errText.slice(0, 500) },
        { status: 502 },
      );
    }

    const data = await apolloRes.json();

    // Normalise response to a clean contact list
    const contacts = (data.people ?? []).map((p: Record<string, unknown>) => ({
      name:          `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
      title:         p.title,
      email:         p.email,
      linkedin_url:  p.linkedin_url,
      company:       (p.organization as Record<string, unknown> | null)?.name,
      company_size:  (p.organization as Record<string, unknown> | null)?.num_employees,
      location:      p.city ? `${p.city}, ${p.country}` : p.country,
      seniority:     p.seniority,
    }));

    // Log to agent_activity
    const supabase = getAdminClient();
    void supabase.from('agent_activity').insert({
      user_id:     userId,
      agent_id:    'patel',
      action_type: 'apollo_search',
      description: `Apollo search returned ${contacts.length} contacts for titles: ${job_titles.slice(0, 3).join(', ')}`,
      metadata:    { job_titles, industries, locations, count: contacts.length },
    });

    return NextResponse.json({
      contacts,
      total_results: data.pagination?.total_entries ?? contacts.length,
      page:          data.pagination?.page ?? 1,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Apollo API timeout' }, { status: 504 });
    }
    return NextResponse.json(
      { error: `Apollo search failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}

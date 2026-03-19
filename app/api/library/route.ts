import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getAllResources } from '@/features/knowledge/library';

// GET /api/library — public, no auth required
// Query params: function_owner, topic_cluster, stage, search, limit
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    );

    const resources = await getAllResources(supabase, {
      functionOwner: searchParams.get('function_owner') ?? undefined,
      topicCluster:  searchParams.get('topic_cluster') ?? undefined,
      stage:         searchParams.get('stage') ?? undefined,
      search:        searchParams.get('search') ?? undefined,
      limit:         searchParams.get('limit') ? Number(searchParams.get('limit')) : 100,
    });

    return NextResponse.json({ resources, total: resources.length });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

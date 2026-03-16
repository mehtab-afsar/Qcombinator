import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { runIQScoring } from '@/features/iq/calculators/iq-orchestrator';
import type { ArtifactBundle, StripeMetrics } from '@/features/iq/calculators/data-resolver';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { assessmentData, skipTavily } = body;

    if (!assessmentData) {
      return NextResponse.json({ error: 'assessmentData is required' }, { status: 400 });
    }

    // ── Load founder profile ──────────────────────────────────────────────────
    const { data: profile } = await supabase
      .from('founder_profiles')
      .select('sector, stage, company_name')
      .eq('user_id', user.id)
      .single();

    // ── Load latest agent artifacts ───────────────────────────────────────────
    const { data: artifacts } = await supabase
      .from('agent_artifacts')
      .select('agent_id, artifact_type, content')
      .eq('user_id', user.id)
      .in('artifact_type', ['financial_summary', 'hiring_plan', 'competitive_matrix'])
      .order('created_at', { ascending: false });

    const artifactBundle: ArtifactBundle = {};
    if (artifacts) {
      for (const art of artifacts as Array<{ agent_id: string; artifact_type: string; content: Record<string, unknown> }>) {
        if (art.artifact_type === 'financial_summary' && !artifactBundle.financial) {
          artifactBundle.financial = art.content;
        }
        if (art.artifact_type === 'hiring_plan' && !artifactBundle.hiring) {
          artifactBundle.hiring = art.content;
        }
        if (art.artifact_type === 'competitive_matrix' && !artifactBundle.competitive) {
          artifactBundle.competitive = art.content;
        }
      }
    }

    // ── Load Stripe metrics if connected ─────────────────────────────────────
    let stripeMetrics: StripeMetrics | null = null;
    try {
      const stripeRes = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/agents/felix/stripe`,
        {
          method: 'POST',
          headers: { Cookie: request.headers.get('cookie') ?? '' },
          body: JSON.stringify({ action: 'metrics' }),
        }
      );
      if (stripeRes.ok) {
        const stripeData = await stripeRes.json();
        if (stripeData.mrr != null) {
          stripeMetrics = {
            mrr: stripeData.mrr,
            arr: stripeData.arr ?? stripeData.mrr * 12,
            customerCount: stripeData.customerCount ?? 0,
          };
        }
      }
    } catch {
      // Stripe not connected — continue without it
    }

    // ── Run IQ scoring pipeline ───────────────────────────────────────────────
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    );

    const iqScore = await runIQScoring({
      userId: user.id,
      supabase: serviceClient,
      assessment: assessmentData,
      artifacts: artifactBundle,
      stripe: stripeMetrics,
      profile: profile
        ? {
            sector: profile.sector ?? undefined,
            stage: profile.stage ?? undefined,
          }
        : null,
      skipTavily: skipTavily === true,
    });

    return NextResponse.json({ iqScore });
  } catch (error) {
    console.error('[IQ Calculate] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

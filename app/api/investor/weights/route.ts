import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/investor/weights — return investor's custom dimension weights
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data } = await supabase
      .from('investor_parameter_weights')
      .select('weight_market, weight_product, weight_gtm, weight_financial, weight_team, weight_traction')
      .eq('investor_user_id', user.id)
      .single();

    // Return defaults when not yet configured
    return NextResponse.json({
      weights: data ?? {
        weight_market: 20, weight_product: 18, weight_gtm: 17,
        weight_financial: 18, weight_team: 15, weight_traction: 12,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/investor/weights — upsert investor's custom dimension weights
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const fields = ['weight_market', 'weight_product', 'weight_gtm', 'weight_financial', 'weight_team', 'weight_traction'];

    // Validate all weights are numbers 0-100
    for (const f of fields) {
      const v = body[f];
      if (typeof v !== 'number' || v < 0 || v > 100) {
        return NextResponse.json({ error: `${f} must be a number between 0 and 100` }, { status: 400 });
      }
    }

    const payload = {
      investor_user_id: user.id,
      ...Object.fromEntries(fields.map(f => [f, body[f]])),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('investor_parameter_weights')
      .upsert(payload, { onConflict: 'investor_user_id' });

    if (error) {
      console.error('[Investor weights] Upsert error:', error);
      return NextResponse.json({ error: 'Failed to save weights' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculatePRDQScore } from '@/features/qscore/calculators/prd-aligned-qscore';
import { AssessmentData } from '@/features/qscore/types/qscore.types';

/**
 * Onboarding Complete API
 *
 * Persists onboarding extracted data + chat history to the database,
 * calculates an initial Q-Score from partial data, and saves it.
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { extractedData, chatHistory } = await request.json();

    if (!extractedData) {
      return NextResponse.json({ error: 'Extracted data is required' }, { status: 400 });
    }

    // Transform extracted data to partial AssessmentData for scoring
    const assessmentData: Partial<AssessmentData> = {
      problemStory: extractedData.problemStory || '',
      advantages: Array.isArray(extractedData.advantages) ? extractedData.advantages : [],
      advantageExplanation: extractedData.advantageExplanation || '',
      customerQuote: extractedData.customerQuote || '',
      customerSurprise: extractedData.customerSurprise || '',
      customerCommitment: extractedData.customerCommitment || '',
      conversationCount: Number(extractedData.conversationCount) || 0,
      hardshipStory: extractedData.hardshipStory || '',
      // Fields not available from onboarding — leave undefined
      customerType: '',
      conversationDate: null,
      customerList: [],
      failedBelief: '',
      failedReasoning: '',
      failedDiscovery: '',
      failedChange: '',
      tested: '',
      buildTime: 0,
      measurement: '',
      results: '',
      learned: '',
      changed: '',
      // Market fields — undefined (not collected in onboarding)
      targetCustomers: undefined,
      conversionRate: undefined,
      dailyActivity: undefined,
      lifetimeValue: undefined,
      costPerAcquisition: undefined,
    };

    // Calculate Q-Score from partial data
    const qScore = calculatePRDQScore(assessmentData as AssessmentData);

    // Save extracted data + chat history to founder profile
    const { error: profileError } = await supabase
      .from('founder_profiles')
      .update({
        onboarding_extracted_data: extractedData,
        onboarding_chat_history: chatHistory || [],
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('Error saving onboarding data:', profileError);
      return NextResponse.json({ error: 'Failed to save onboarding data' }, { status: 500 });
    }

    // Save initial Q-Score to history with data_source = 'onboarding'
    const { error: scoreError } = await supabase
      .from('qscore_history')
      .insert({
        user_id: user.id,
        overall_score: qScore.overall,
        grade: qScore.grade,
        market_score: qScore.breakdown.market.score,
        product_score: qScore.breakdown.product.score,
        gtm_score: qScore.breakdown.goToMarket.score,
        financial_score: qScore.breakdown.financial.score,
        team_score: qScore.breakdown.team.score,
        traction_score: qScore.breakdown.traction.score,
        data_source: 'onboarding',
      });

    if (scoreError) {
      console.error('Error saving onboarding score:', scoreError);
      // Non-fatal — profile data was saved
    }

    // Fire investor alert if score is strong enough (non-fatal, best-effort)
    if (qScore.overall >= 50) {
      try {
        // Fetch founder profile for name + industry + stage
        const { data: fp } = await supabase
          .from('founder_profiles')
          .select('full_name, startup_name, industry, stage, tagline')
          .eq('user_id', user.id)
          .single();

        if (fp) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://edgealpha.ai';
          fetch(`${baseUrl}/api/investor/alerts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-secret': process.env.INTERNAL_API_SECRET ?? 'ea-internal',
            },
            body: JSON.stringify({
              founderId:   user.id,
              founderName: fp.full_name ?? 'Founder',
              startupName: fp.startup_name ?? 'New Startup',
              industry:    fp.industry ?? '',
              stage:       fp.stage ?? '',
              qScore:      qScore.overall,
              tagline:     fp.tagline ?? '',
              publicUrl:   `${baseUrl}/p/${user.id}`,
            }),
          }).catch(() => { /* fire and forget */ });
        }
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({
      success: true,
      qScore: {
        overall: qScore.overall,
        grade: qScore.grade,
        breakdown: qScore.breakdown,
      },
    });
  } catch (error) {
    console.error('Onboarding complete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

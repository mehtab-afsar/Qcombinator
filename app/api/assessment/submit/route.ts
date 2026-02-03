import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get assessment data from request
    const { assessmentData } = await request.json();

    if (!assessmentData) {
      return NextResponse.json(
        { error: 'Assessment data is required' },
        { status: 400 }
      );
    }

    // Check if there's a draft to update
    const { data: existingDraft } = await supabase
      .from('qscore_assessments')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let assessmentId: string;

    if (existingDraft) {
      // Update existing draft and mark as submitted
      const { data, error } = await supabase
        .from('qscore_assessments')
        .update({
          assessment_data: assessmentData,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingDraft.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating assessment:', error);
        return NextResponse.json(
          { error: 'Failed to submit assessment' },
          { status: 500 }
        );
      }

      assessmentId = data.id;
    } else {
      // Create new submitted assessment
      const { data, error } = await supabase
        .from('qscore_assessments')
        .insert({
          user_id: user.id,
          assessment_data: assessmentData,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating assessment:', error);
        return NextResponse.json(
          { error: 'Failed to submit assessment' },
          { status: 500 }
        );
      }

      assessmentId = data.id;
    }

    // Trigger Q-Score calculation
    // Note: In production, this could be done asynchronously via a queue
    // For now, we'll call the calculate endpoint internally
    const calculateResponse = await fetch(
      new URL('/api/qscore/calculate', request.url).toString(),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward auth cookies
          Cookie: request.headers.get('cookie') || '',
        },
        body: JSON.stringify({ assessmentData }),
      }
    );

    if (!calculateResponse.ok) {
      console.error('Error calculating Q-Score during submission');
      // Don't fail submission if calculation fails, can retry later
    }

    // Update assessment status to scored
    await supabase
      .from('qscore_assessments')
      .update({
        status: 'scored',
        updated_at: new Date().toISOString(),
      })
      .eq('id', assessmentId);

    // Get the calculated Q-Score
    const calculationResult = await calculateResponse.json();

    return NextResponse.json({
      message: 'Assessment submitted successfully',
      assessmentId,
      qScore: calculationResult.qScore || null,
    });
  } catch (error) {
    console.error('Error submitting assessment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    // Check if draft already exists
    const { data: existingDraft } = await supabase
      .from('qscore_assessments')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingDraft) {
      // Update existing draft
      const { data, error } = await supabase
        .from('qscore_assessments')
        .update({
          assessment_data: assessmentData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingDraft.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating assessment draft:', error);
        return NextResponse.json(
          { error: 'Failed to save assessment' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Draft updated successfully',
        assessment: data,
      });
    } else {
      // Create new draft
      const { data, error } = await supabase
        .from('qscore_assessments')
        .insert({
          user_id: user.id,
          assessment_data: assessmentData,
          status: 'draft',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating assessment draft:', error);
        return NextResponse.json(
          { error: 'Failed to save assessment' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Draft saved successfully',
        assessment: data,
      });
    }
  } catch (error) {
    console.error('Error saving assessment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve saved draft
export async function GET(_request: NextRequest) {
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

    // Get latest draft
    const { data: draft, error } = await supabase
      .from('qscore_assessments')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'draft')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned"
      console.error('Error fetching assessment draft:', error);
      return NextResponse.json(
        { error: 'Failed to fetch draft' },
        { status: 500 }
      );
    }

    return NextResponse.json({ draft: draft || null });
  } catch (error) {
    console.error('Error fetching assessment draft:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

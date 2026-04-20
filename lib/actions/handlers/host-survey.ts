import type { SupabaseClient } from '@supabase/supabase-js';

interface HostSurveyArgs {
  /** artifact id of a pmf_survey artifact, or pass the content directly */
  artifactId?: string;
  surveyContent?: Record<string, unknown>;
}

interface PmfSurveyContent {
  title?: string;
  questions?: Array<{ id?: string; text: string; type?: string; options?: string[] }>;
}

export async function handler(
  userId: string,
  args: unknown,
  supabase: SupabaseClient,
): Promise<{ embedHtml: string; surveyId: string }> {
  const { artifactId, surveyContent } = (args ?? {}) as HostSurveyArgs;

  let content: PmfSurveyContent = {};

  if (surveyContent) {
    content = surveyContent as PmfSurveyContent;
  } else if (artifactId) {
    const { data } = await supabase
      .from('agent_artifacts')
      .select('content')
      .eq('id', artifactId)
      .eq('user_id', userId)
      .maybeSingle();
    if (data) content = (data as { content: PmfSurveyContent }).content;
  } else {
    // Fall back to the most recent pmf_survey for this user
    const { data } = await supabase
      .from('agent_artifacts')
      .select('content')
      .eq('user_id', userId)
      .eq('artifact_type', 'pmf_survey')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) content = (data as { content: PmfSurveyContent }).content;
  }

  if (!content || !content.questions?.length) {
    throw new Error('No PMF survey content found. Generate a pmf_survey artifact first.');
  }

  // Build a Typeform-compatible embed snippet from the artifact JSON.
  // Each question becomes a <div data-tf-question> block the founder can paste into Typeform
  // or use with any headless form renderer.
  const surveyId = `pmf_${userId.slice(0, 8)}_${Date.now()}`;
  const title    = content.title ?? 'PMF Survey';

  const questionBlocks = content.questions
    .map((q, i) => {
      const opts = q.options?.length
        ? `<ul>${q.options.map(o => `<li>${o}</li>`).join('')}</ul>`
        : '';
      return `<div class="tf-question" data-index="${i + 1}">
  <p>${q.text}</p>
  ${opts}
</div>`;
    })
    .join('\n');

  const embedHtml = `<!-- Edge Alpha PMF Survey — ${title} -->
<div id="ea-survey-${surveyId}" class="ea-survey" data-survey-id="${surveyId}">
  <h2>${title}</h2>
${questionBlocks}
</div>`;

  // Persist the generated embed so the founder can retrieve it later
  await supabase.from('agent_activity').insert({
    user_id: userId,
    agent_id: 'nova',
    action_type: 'survey_hosted',
    description: `PMF survey embed generated (${content.questions.length} questions)`,
    metadata: { survey_id: surveyId, question_count: content.questions.length },
  });

  return { embedHtml, surveyId };
}

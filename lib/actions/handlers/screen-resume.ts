import type { SupabaseClient } from '@supabase/supabase-js';
import { routedText } from '@/lib/llm/router';

interface ScreenResumeArgs {
  resume_url: string;
  role_title?: string;
  /** hiring_plan artifact id to pull requirements from */
  hiringPlanArtifactId?: string;
}

interface HiringPlanContent {
  roles?: Array<{ title?: string; requirements?: string[]; nice_to_have?: string[] }>;
}

export async function handler(
  userId: string,
  args: unknown,
  supabase: SupabaseClient,
): Promise<{ fitScore: number; summary: string; strengths: string[]; gaps: string[] }> {
  const { resume_url, role_title, hiringPlanArtifactId } = (args ?? {}) as ScreenResumeArgs;
  if (!resume_url) throw new Error('resume_url is required');

  // Pull role requirements from hiring_plan artifact if available
  let roleRequirements = '';
  const artifactQuery = hiringPlanArtifactId
    ? supabase.from('agent_artifacts').select('content').eq('id', hiringPlanArtifactId).eq('user_id', userId).maybeSingle()
    : supabase.from('agent_artifacts').select('content').eq('user_id', userId).eq('artifact_type', 'hiring_plan').order('created_at', { ascending: false }).limit(1).maybeSingle();

  const { data: artifactRow } = await artifactQuery;
  if (artifactRow) {
    const plan = (artifactRow as { content: HiringPlanContent }).content;
    const role = role_title
      ? plan.roles?.find(r => r.title?.toLowerCase().includes(role_title.toLowerCase()))
      : plan.roles?.[0];
    if (role) {
      roleRequirements = [
        role.title ? `Role: ${role.title}` : '',
        role.requirements?.length ? `Requirements: ${role.requirements.join(', ')}` : '',
        role.nice_to_have?.length ? `Nice-to-have: ${role.nice_to_have.join(', ')}` : '',
      ].filter(Boolean).join('\n');
    }
  }

  const systemPrompt = `You are an expert recruiter screening a candidate resume.
${roleRequirements ? `\n${roleRequirements}\n` : ''}
The resume is at: ${resume_url}

Evaluate the candidate and return ONLY valid JSON:
{
  "fitScore": <0-100 integer>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "gaps": ["<gap 1>", "<gap 2>"]
}`;

  const raw = await routedText('reasoning', [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Screen this candidate now.' },
  ], { maxTokens: 600 });

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse screening result from LLM response.');

  const result = JSON.parse(match[0]) as {
    fitScore: number; summary: string; strengths: string[]; gaps: string[];
  };

  void supabase.from('agent_activity').insert({
    user_id: userId,
    agent_id: 'harper',
    action_type: 'resume_screened',
    description: `Resume screened — fit score: ${result.fitScore}/100`,
    metadata: { resume_url, fit_score: result.fitScore, role_title },
  });

  return result;
}

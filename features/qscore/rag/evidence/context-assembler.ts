/**
 * Evidence Context Assembler
 *
 * Cross-references founder assessment claims against their own agent artifacts
 * using an LLM (Groq) for semantic matching instead of pgvector embeddings.
 *
 * This replaces the previous OpenAI text-embedding-3-small approach so that
 * no OPENAI_API_KEY is required — only GROQ_API_KEY.
 *
 * Cold start: returns empty context with confidence=0 when user has no artifacts.
 */

import { createClient } from '@/lib/supabase/server';
import { AssessmentData } from '../../types/qscore.types';
import type { EvidenceContext, EvidenceItem } from '../types';
import { matchClaimsAgainstArtifacts, artifactToSnippet } from './llm-semantic-matcher';

// ─────────────────────────────────────────────────────────────────────────────
// Claim Extraction (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────

interface Claim {
  text: string;
  dimension: string;
  field: string;
}

function extractClaims(data: AssessmentData): Claim[] {
  const claims: Claim[] = [];

  if (data.financial?.mrr) {
    claims.push({ text: `Monthly recurring revenue (MRR) is $${data.financial.mrr}`, dimension: 'financial', field: 'mrr' });
  }
  if (data.financial?.arr) {
    claims.push({ text: `Annual recurring revenue (ARR) is $${data.financial.arr}`, dimension: 'financial', field: 'arr' });
  }
  if (data.financial?.monthlyBurn) {
    claims.push({ text: `Monthly burn rate is $${data.financial.monthlyBurn}`, dimension: 'financial', field: 'burn' });
  }
  if (data.financial?.runway) {
    claims.push({ text: `Runway is ${data.financial.runway} months`, dimension: 'financial', field: 'runway' });
  }
  if (data.conversionRate) {
    claims.push({ text: `Conversion rate is ${data.conversionRate}%`, dimension: 'market', field: 'conversionRate' });
  }
  if (data.lifetimeValue && data.costPerAcquisition) {
    const ratio = data.costPerAcquisition > 0
      ? (data.lifetimeValue / data.costPerAcquisition).toFixed(1)
      : 'N/A';
    claims.push({ text: `LTV:CAC ratio is ${ratio}:1 (LTV $${data.lifetimeValue}, CAC $${data.costPerAcquisition})`, dimension: 'market', field: 'ltvCac' });
  }
  if (data.conversationCount) {
    claims.push({ text: `Had ${data.conversationCount} customer conversations`, dimension: 'traction', field: 'conversations' });
  }
  if (data.customerCommitment) {
    claims.push({ text: `Customer commitment level: ${data.customerCommitment}`, dimension: 'traction', field: 'customerCommitment' });
  }

  return claims;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────────────────────────────

/** Max number of recent artifacts to fetch for cross-reference */
const MAX_ARTIFACTS = 6;

/**
 * Assemble evidence context by cross-referencing assessment claims against
 * the user's agent artifacts using LLM semantic matching.
 *
 * Cold start: returns { confidence: 0, unverified: 'all' } when no artifacts exist.
 */
export async function assembleEvidenceContext(
  userId: string,
  data: AssessmentData
): Promise<EvidenceContext> {
  const supabase = await createClient();

  // Fetch the founder's most recent agent artifacts
  const { data: artifacts, error } = await supabase
    .from('agent_artifacts')
    .select('artifact_type, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(MAX_ARTIFACTS);

  if (error || !artifacts || artifacts.length === 0) {
    return { corroborations: [], conflicts: [], unverified: 'all', confidence: 0 };
  }

  // Extract verifiable claims from the assessment
  const claims = extractClaims(data);
  if (claims.length === 0) {
    return { corroborations: [], conflicts: [], unverified: 'all', confidence: 0 };
  }

  // Convert each artifact to a compact text snippet for the LLM
  const snippets = artifacts
    .filter(a => a.content && typeof a.content === 'object')
    .map(a => ({
      artifactType: a.artifact_type as string,
      text: artifactToSnippet(a.content as Record<string, unknown>, a.artifact_type as string),
    }));

  if (snippets.length === 0) {
    return { corroborations: [], conflicts: [], unverified: 'all', confidence: 0 };
  }

  // Run LLM-based semantic matching
  const results = await matchClaimsAgainstArtifacts(claims, snippets);

  const corroborations: EvidenceItem[] = [];
  const conflicts: EvidenceItem[] = [];
  const unverifiedItems: EvidenceItem[] = [];

  for (const r of results) {
    const item: EvidenceItem = {
      claim:       r.claim,
      evidence:    r.evidence,
      artifactType: r.artifactType,
      similarity:  r.verdict === 'corroborated' ? 0.9 : r.verdict === 'conflicting' ? 0.8 : 0,
      verdict:     r.verdict,
      dimension:   r.dimension,
    };
    if (r.verdict === 'corroborated')  corroborations.push(item);
    else if (r.verdict === 'conflicting') conflicts.push(item);
    else                               unverifiedItems.push(item);
  }

  const evidenceFound = corroborations.length + conflicts.length;
  const confidence = claims.length > 0 ? evidenceFound / claims.length : 0;

  return {
    corroborations,
    conflicts,
    unverified: unverifiedItems.length > 0 ? unverifiedItems : 'none',
    confidence,
  };
}

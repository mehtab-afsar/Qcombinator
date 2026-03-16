'use client';

/**
 * Universal ArtifactRenderer
 *
 * Dispatches to the appropriate per-type renderer based on artifact_type.
 *
 * TODO: Extract each renderer from app/founder/agents/[agentId]/page.tsx into
 * components/artifacts/renderers/ and wire them here.
 * Currently returns a generic fallback for all types.
 */

import React from 'react';
import type { ArtifactType } from '@/lib/constants/artifact-types';

export interface ArtifactRendererProps {
  artifactType: ArtifactType | string;
  content: Record<string, unknown>;
  artifactId?: string;
  userId?: string;
  title?: string;
}

/**
 * Generic fallback renderer: displays artifact content as a formatted JSON view.
 * Replace each case below with the real renderer once extracted from page.tsx.
 */
function GenericArtifactRenderer({ content, title }: ArtifactRendererProps) {
  return (
    <div style={{ fontFamily: 'inherit' }}>
      {title && (
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{title}</h3>
      )}
      <pre style={{
        background: '#F0EDE6',
        border: '1px solid #E2DDD5',
        borderRadius: 8,
        padding: 16,
        fontSize: 12,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {JSON.stringify(content, null, 2)}
      </pre>
    </div>
  );
}

export function ArtifactRenderer(props: ArtifactRendererProps) {
  // Each case will be replaced with a real renderer extracted from page.tsx.
  // The switch gives TypeScript a type-safe dispatch point.
  switch (props.artifactType as ArtifactType) {
    case 'icp_document':
    case 'outreach_sequence':
    case 'battle_card':
    case 'gtm_playbook':
    case 'sales_script':
    case 'brand_messaging':
    case 'financial_summary':
    case 'legal_checklist':
    case 'hiring_plan':
    case 'pmf_survey':
    case 'interview_notes':
    case 'competitive_matrix':
    case 'strategic_plan':
    default:
      return <GenericArtifactRenderer {...props} />;
  }
}

export default ArtifactRenderer;

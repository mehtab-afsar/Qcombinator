'use client';

import React from 'react';

interface ArtifactMetaProps {
  agentId: string;
  agentName: string;
  artifactType: string;
  createdAt?: string;
}

export function ArtifactMeta({ agentName, artifactType, createdAt }: ArtifactMetaProps) {
  const label = artifactType.replace(/_/g, ' ');
  const dateStr = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <span style={{
        fontSize: 11, color: '#8A867C', fontWeight: 500,
        textTransform: 'capitalize',
      }}>
        {label}
      </span>
      <span style={{ color: '#E2DDD5' }}>·</span>
      <span style={{ fontSize: 11, color: '#8A867C' }}>
        by {agentName}
      </span>
      {dateStr && (
        <>
          <span style={{ color: '#E2DDD5' }}>·</span>
          <span style={{ fontSize: 11, color: '#8A867C' }}>{dateStr}</span>
        </>
      )}
    </div>
  );
}

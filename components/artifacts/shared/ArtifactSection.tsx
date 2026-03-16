'use client';

import React from 'react';

interface ArtifactSectionProps {
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function ArtifactSection({ title, children, style }: ArtifactSectionProps) {
  return (
    <div style={{ marginBottom: 20, ...style }}>
      <p style={{
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.18em',
        color: '#8A867C',
        fontWeight: 600,
        marginBottom: 8,
      }}>
        {title}
      </p>
      {children}
    </div>
  );
}

'use client';

import React from 'react';

interface ArtifactCardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function ArtifactCard({ children, style }: ArtifactCardProps) {
  return (
    <div style={{
      background: '#F0EDE6',
      border: '1px solid #E2DDD5',
      borderRadius: 12,
      padding: '20px 24px',
      ...style,
    }}>
      {children}
    </div>
  );
}

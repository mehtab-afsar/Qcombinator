'use client';

import React from 'react';
import { Copy, Download, Share2 } from 'lucide-react';

interface ArtifactActionsProps {
  onCopy?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  extra?: React.ReactNode;
}

const btnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  borderRadius: 6,
  border: '1px solid #E2DDD5',
  background: '#F0EDE6',
  color: '#18160F',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};

export function ArtifactActions({ onCopy, onDownload, onShare, extra }: ArtifactActionsProps) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
      {onCopy && (
        <button style={btnStyle} onClick={onCopy}>
          <Copy size={12} /> Copy
        </button>
      )}
      {onDownload && (
        <button style={btnStyle} onClick={onDownload}>
          <Download size={12} /> Download
        </button>
      )}
      {onShare && (
        <button style={btnStyle} onClick={onShare}>
          <Share2 size={12} /> Share
        </button>
      )}
      {extra}
    </div>
  );
}

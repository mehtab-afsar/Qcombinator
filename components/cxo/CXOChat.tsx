'use client';

interface CXOChatProps {
  agentId: string;
  artifactId?: string;
  challenge?: string;
  prompt?: string;
}

/**
 * Wraps the existing agent chat page in an iframe.
 * Uses ?_embed=1 so next.config.ts redirects are bypassed (no infinite loop).
 */
export function CXOChat({ agentId, artifactId, challenge, prompt }: CXOChatProps) {
  let src = `/founder/agents/${agentId}?_embed=1`;
  if (artifactId) src += `&artifact=${encodeURIComponent(artifactId)}`;
  if (challenge)  src += `&challenge=${encodeURIComponent(challenge)}`;
  if (prompt)     src += `&prompt=${encodeURIComponent(prompt)}`;

  return (
    <iframe
      key={`${agentId}-${artifactId ?? ''}`}
      src={src}
      title={`Chat with ${agentId}`}
      style={{
        flex:   1,
        width:  '100%',
        height: '100%',
        border: 'none',
        display: 'block',
      }}
    />
  );
}

'use client';

import { AgentChatPanel } from '@/features/agents/shared/components/AgentChatPanel';
import type { CXOConfig } from '@/lib/cxo/cxo-config';

interface CXOChatProps {
  config:                  CXOConfig;
  agentId:                 string;
  artifactId?:             string;
  challenge?:              string;
  prompt?:                 string;
  convId?:                 string;
  onConversationCreated?:  (id: string) => void;
}

export function CXOChat({ config, agentId, convId, onConversationCreated }: CXOChatProps) {
  return (
    <AgentChatPanel
      agentId={agentId}
      name={config.name}
      accent={config.colour}
      badge={config.role}
      suggestedPrompts={config.chatPrompts}
      convId={convId}
      onConversationCreated={onConversationCreated}
    />
  );
}

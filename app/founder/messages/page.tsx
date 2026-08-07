'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { bdr, muted, blue } from '@/lib/constants/colors';
import { Badge, BadgeVariant } from '@/features/shared/components/Badge';
import { EmptyState } from '@/features/shared/components/EmptyState';
import { PageSpinner } from '@/features/shared/components/Spinner';
import { MessagingShell } from '@/features/messaging/components/MessagingShell';
import { ConversationList, MessagingTab } from '@/features/messaging/components/ConversationList';
import { ThreadPanel } from '@/features/messaging/components/ThreadPanel';
import { useMessageThread } from '@/features/messaging/hooks/useMessageThread';
import { useConversationSearch } from '@/features/messaging/hooks/useConversationSearch';
import type { ConversationSummary } from '@/features/messaging/types';

interface AgentActivity {
  id: string;
  agent_id: string;
  action_type: string;
  description: string;
  created_at: string;
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  pending: 'amber',
  meeting_scheduled: 'green',
  accepted: 'green',
  declined: 'red',
};

function StatusBadge({ status }: { status: string }) {
  const label = status === 'meeting_scheduled' ? 'accepted' : status;
  return <Badge variant={STATUS_VARIANT[status] ?? 'neutral'} style={{ textTransform: 'capitalize' }}>{label}</Badge>;
}

function agentColor(id: string): string {
  const colors: Record<string, string> = {
    patel: '#2563EB', susi: '#16A34A', maya: '#9333EA', felix: '#D97706',
    leo: '#DC2626', harper: '#0891B2', nova: '#DB2777', atlas: '#059669', sage: '#7C3AED',
  };
  return colors[id] ?? muted;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

function CXOUpdates({ activity }: { activity: AgentActivity[] }) {
  if (activity.length === 0) return null;
  return (
    <div style={{ borderTop: `1px solid ${bdr}`, flexShrink: 0, maxHeight: 180, overflowY: 'auto' }}>
      <div style={{ padding: '10px 14px 6px' }}>
        <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: muted, fontWeight: 600, margin: 0 }}>CXO Updates</p>
      </div>
      {activity.slice(0, 5).map(a => (
        <Link key={a.id} href="/founder/executive" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', textDecoration: 'none' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: agentColor(a.agent_id), flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: agentColor(a.agent_id), textTransform: 'capitalize' }}>{a.agent_id}</span>
            <p style={{ fontSize: 11, color: muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description}</p>
          </div>
          <span style={{ fontSize: 10, color: muted, flexShrink: 0 }}>{timeAgo(a.created_at)}</span>
        </Link>
      ))}
    </div>
  );
}

function MessagesInner() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ConversationSummary[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [agentActivity, setAgentActivity] = useState<AgentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MessagingTab>('conversations');
  const [selected, setSelected] = useState<ConversationSummary | null>(null);
  const { search, setSearch } = useConversationSearch();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [msgRes, activityRes] = await Promise.all([
          fetch('/api/founder/messages'),
          createClient().from('agent_activity').select('id, agent_id, action_type, description, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
        ]);
        if (cancelled) return;
        if (msgRes.ok) {
          const d = await msgRes.json();
          setRequests(d.requests ?? []);
          setConversations(d.conversations ?? []);
          if ((d.conversations ?? []).length > 0) {
            setSelected(d.conversations[0]);
            setActiveTab('conversations');
          } else if ((d.requests ?? []).length > 0) {
            setSelected(d.requests[0]);
            setActiveTab('requests');
          }
        }
        setAgentActivity(activityRes.data ?? []);
      } catch { /* empty states */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const canMessage = selected?.status === 'meeting_scheduled' || selected?.status === 'accepted';
  const thread = useMessageThread(selected?.id ?? null, canMessage ?? false);

  return (
    <MessagingShell
      showingPanel={selected !== null}
      onBack={() => setSelected(null)}
      list={
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ConversationList
              eyebrow="Founder · Messages"
              title="Messages"
              loading={loading}
              requests={requests}
              conversations={conversations}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              selectedId={selected?.id ?? null}
              onSelect={item => setSelected(item)}
              search={search}
              onSearchChange={setSearch}
              myUserId={user?.id ?? null}
              renderSubtitleRight={item => <StatusBadge status={item.status} />}
              requestsEmptyBody="Requests you send to investors will show up here until they respond."
              conversationsEmptyBody="Once an investor accepts your request, you can message them here."
            />
          </div>
          <CXOUpdates activity={agentActivity} />
        </div>
      }
      panel={
        !selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
            {requests.length === 0 && conversations.length === 0 ? (
              <EmptyState
                title="No investor connections yet"
                body="Send a connection request to an investor to start a conversation."
                action={{ label: 'Find investors', href: '/founder/matching' }}
                style={{ border: 'none', background: 'transparent' }}
              />
            ) : (
              <>
                <p style={{ fontSize: 14, color: muted }}>Select a conversation to get started</p>
                <Link href="/founder/matching" style={{ fontSize: 13, color: blue, textDecoration: 'none' }}>Browse investors →</Link>
              </>
            )}
          </div>
        ) : (
          <ThreadPanel
            title={selected.displayName}
            subtitle={selected.subtitle}
            avatarSeed={selected.displayName}
            headerRight={<StatusBadge status={selected.status} />}
            personalMessage={selected.personalMessage}
            createdAt={selected.createdAt}
            myUserId={user?.id ?? null}
            canMessage={!!canMessage}
            messages={thread.messages}
            loading={thread.loading}
            input={thread.input}
            onInputChange={thread.setInput}
            onSend={thread.send}
            sending={thread.sending}
            composerPlaceholder={`Message ${selected.displayName}…`}
          />
        )
      }
    />
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<PageSpinner label="Loading messages…" />}>
      <MessagesInner />
    </Suspense>
  );
}

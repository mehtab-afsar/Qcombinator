'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { muted, blue } from '@/lib/constants/colors';
import { Badge, BadgeVariant } from '@/features/shared/components/Badge';
import { EmptyState } from '@/features/shared/components/EmptyState';
import { PageSpinner } from '@/features/shared/components/Spinner';
import { MessagingShell } from '@/features/messaging/components/MessagingShell';
import { ConversationList, MessagingTab } from '@/features/messaging/components/ConversationList';
import { ThreadPanel } from '@/features/messaging/components/ThreadPanel';
import { useMessageThread } from '@/features/messaging/hooks/useMessageThread';
import { useConversationSearch } from '@/features/messaging/hooks/useConversationSearch';
import type { ConversationSummary } from '@/features/messaging/types';

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

function MessagesInner() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ConversationSummary[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
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
        const msgRes = await fetch('/api/founder/messages');
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
            personalMessageFromMe={selected.personalMessageFromMe ?? false}
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

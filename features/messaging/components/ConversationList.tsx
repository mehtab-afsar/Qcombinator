"use client";

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { bdr, ink, muted, red, white } from '@/lib/constants/colors';
import { TabNav } from '@/features/shared/components/TabNav';
import { SearchInput } from '@/features/shared/components/SearchInput';
import { EmptyState } from '@/features/shared/components/EmptyState';
import { SectionSpinner } from '@/features/shared/components/Spinner';
import { ConversationListItem } from '@/features/messaging/components/ConversationListItem';
import { relDate } from '@/features/messaging/lib/format';
import { filterBySearch } from '@/features/messaging/lib/filter';
import type { ConversationSummary } from '@/features/messaging/types';

export type MessagingTab = 'requests' | 'conversations';

interface ConversationListProps {
  eyebrow: string;
  title: string;
  loading: boolean;
  requests: ConversationSummary[];
  conversations: ConversationSummary[];
  activeTab: MessagingTab;
  onTabChange: (tab: MessagingTab) => void;
  selectedId: string | null;
  onSelect: (item: ConversationSummary, tab: MessagingTab) => void;
  search: string;
  onSearchChange: (value: string) => void;
  myUserId: string | null;
  /** Per-row right-hand badge/pill — a Q-score for an investor's requests, a status
   *  Badge for a founder's, etc. The list has no opinion on what this renders. */
  renderSubtitleRight?: (item: ConversationSummary, tab: MessagingTab) => ReactNode;
  requestsEmptyIcon?: LucideIcon;
  requestsEmptyBody?: string;
  conversationsEmptyIcon?: LucideIcon;
  conversationsEmptyBody?: string;
}

function subtitleLeftFor(item: ConversationSummary, myUserId: string | null): string {
  if (!item.lastMessage) return item.subtitle ?? '';
  const prefix = item.lastMessage.senderId === myUserId ? 'You: ' : '';
  return `${prefix}${item.lastMessage.body}`;
}

export function ConversationList({
  eyebrow, title, loading, requests, conversations, activeTab, onTabChange,
  selectedId, onSelect, search, onSearchChange, myUserId, renderSubtitleRight,
  requestsEmptyIcon, requestsEmptyBody, conversationsEmptyIcon, conversationsEmptyBody,
}: ConversationListProps) {
  const filteredRequests = filterBySearch(requests, search);
  const filteredConversations = filterBySearch(conversations, search);
  const activeItems = activeTab === 'requests' ? filteredRequests : filteredConversations;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '20px 16px 12px', flexShrink: 0 }}>
        <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: muted, fontWeight: 600, marginBottom: 4 }}>{eyebrow}</p>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: ink, letterSpacing: '-0.02em', margin: '0 0 14px' }}>{title}</h1>
        <TabNav
          tabs={[
            { id: 'requests', label: 'Requests', indicator: requests.length > 0 ? <CountPill count={requests.length} urgent /> : null },
            { id: 'conversations', label: 'Conversations', indicator: conversations.length > 0 ? <CountPill count={conversations.length} /> : null },
          ]}
          active={activeTab}
          onChange={id => onTabChange(id as MessagingTab)}
          style={{ marginBottom: 10 }}
        />
        <SearchInput value={search} onChange={onSearchChange} placeholder="Search by name…" />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 20px' }}>
        {loading ? (
          <SectionSpinner minHeight={160} />
        ) : activeItems.length === 0 && search ? (
          <EmptyState title={`No matches for "${search}"`} style={{ border: 'none', background: 'transparent', padding: '40px 16px' }} />
        ) : activeTab === 'requests' && filteredRequests.length === 0 ? (
          <EmptyState icon={requestsEmptyIcon} title="No pending requests yet" body={requestsEmptyBody} style={{ border: 'none', background: 'transparent', padding: '40px 16px' }} />
        ) : activeTab === 'conversations' && filteredConversations.length === 0 ? (
          <EmptyState icon={conversationsEmptyIcon} title="No conversations yet" body={conversationsEmptyBody} style={{ border: 'none', background: 'transparent', padding: '40px 16px' }} />
        ) : (
          activeItems.map(item => (
            <ConversationListItem
              key={item.id}
              avatarSeed={item.displayName}
              title={item.displayName}
              timestamp={relDate(item.lastMessage?.createdAt ?? item.createdAt)}
              subtitleLeft={subtitleLeftFor(item, myUserId)}
              subtitleRight={renderSubtitleRight?.(item, activeTab)}
              unread={(item.unreadCount ?? 0) > 0}
              active={item.id === selectedId}
              onClick={() => onSelect(item, activeTab)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CountPill({ count, urgent = false }: { count: number; urgent?: boolean }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '1px 6px', marginLeft: 4,
      background: urgent ? red : bdr, color: urgent ? white : muted,
    }}>
      {count}
    </span>
  );
}

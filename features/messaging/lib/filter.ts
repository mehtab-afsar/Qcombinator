import type { ConversationSummary } from '@/features/messaging/types';

/** Filters conversation/request rows by name or subtitle (firm/industry) — the
 *  logic behind the messaging sidebar's search box. Case-insensitive substring
 *  match; both lists are already fully loaded client-side, no pagination. */
export function filterBySearch(items: ConversationSummary[], query: string): ConversationSummary[] {
  if (!query.trim()) return items;
  const q = query.trim().toLowerCase();
  return items.filter(i =>
    i.displayName.toLowerCase().includes(q) || (i.subtitle ?? '').toLowerCase().includes(q)
  );
}

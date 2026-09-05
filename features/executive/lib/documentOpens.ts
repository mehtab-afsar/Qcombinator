/**
 * Records a founder actually opening a generated document — a Supabase-backed write, kept
 * separate from lib/analytics-client.ts, which exists specifically for PostHog. Never throws
 * into a render: a dropped event is a gap in a chart, never a page break, same rule
 * lib/analytics.ts's capture() follows.
 */
export function recordDocumentOpened(documentType: 'asset_version' | 'briefing', documentId: string): void {
  fetch('/api/analytics/document-opened', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentType, documentId }),
  }).catch(() => { /* a dropped event is a gap in a chart, never a page break */ })
}

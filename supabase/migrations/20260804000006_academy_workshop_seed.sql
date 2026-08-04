-- Sample Academy workshops so the calendar has something to show. The seed file
-- features/academy/data/workshops.ts is empty, so without this the calendar renders
-- entirely blank. Six workshops spanning August + September 2026 (two per topic-week
-- spread, not clustered on one date) so the calendar's prev/next month navigation has
-- something real to demonstrate.
--
-- Deterministic literal timestamps, not NOW() + interval — demo data shouldn't silently
-- drift to "past" on every server restart. date/time (legacy display columns) and
-- starts_at/ends_at (calendar source of truth) are set consistently on every row.

INSERT INTO academy_workshops
  (id, title, description, date, time, duration, instructor, instructor_title, topic,
   status, capacity, registered, spots_left, is_past, sort_order, starts_at, ends_at)
VALUES
  (
    'wk-icp-masterclass',
    'ICP Definition Masterclass',
    'Define your Ideal Customer Profile with precision — the foundation of every great GTM strategy. We''ll work through a live framework you can apply to your own startup by the end of the session.',
    '2026-08-14', '4:00 PM UTC', '90 minutes',
    'Priya Patel', 'GTM Advisor, Edge Alpha',
    'go-to-market', 'upcoming', 40, 18, 22, false, 10,
    '2026-08-14T16:00:00Z', '2026-08-14T17:30:00Z'
  ),
  (
    'wk-pmf-sprint',
    'Product-Market Fit Validation Sprint',
    'Sean Ellis'' proven method for measuring and reaching product-market fit with real customer data — bring your own survey results if you have them.',
    '2026-08-21', '5:00 PM UTC', '90 minutes',
    'Nova Reyes', 'Product Advisor, Edge Alpha',
    'product', 'upcoming', 35, 14, 21, false, 20,
    '2026-08-21T17:00:00Z', '2026-08-21T18:30:00Z'
  ),
  (
    'wk-fundraising-narrative',
    'Fundraising Narrative Workshop',
    'Build a compelling story that resonates with investors at seed and Series A. We''ll workshop your actual deck narrative live, not just theory.',
    '2026-08-27', '3:00 PM UTC', '60 minutes',
    'Sage Whitfield', 'Fundraising Advisor, Edge Alpha',
    'fundraising', 'upcoming', 30, 27, 3, false, 30,
    '2026-08-27T15:00:00Z', '2026-08-27T16:00:00Z'
  ),
  (
    'wk-sales-playbook',
    'Building Your First Sales Playbook',
    'From first cold email to signed contract — the exact playbook early-stage founders use to close their first 10 customers without a sales team.',
    '2026-09-09', '4:00 PM UTC', '90 minutes',
    'Marcus Webb', 'Sales Advisor, Edge Alpha',
    'sales', 'upcoming', 40, 9, 31, false, 40,
    '2026-09-09T16:00:00Z', '2026-09-09T17:30:00Z'
  ),
  (
    'wk-operational-rhythms',
    'Operational Rhythms for Early-Stage Teams',
    'The weekly/monthly cadences that keep a 3-10 person team aligned without turning into meeting overload.',
    '2026-09-16', '5:00 PM UTC', '60 minutes',
    'Elena Cho', 'Operations Advisor, Edge Alpha',
    'operations', 'upcoming', 35, 6, 29, false, 50,
    '2026-09-16T17:00:00Z', '2026-09-16T18:00:00Z'
  ),
  (
    'wk-hiring-first-10',
    'Hiring Your First 10',
    'Sourcing, interviewing, and closing your first ten hires when you have no brand recognition and a small budget.',
    '2026-09-24', '4:00 PM UTC', '90 minutes',
    'Priya Patel', 'GTM Advisor, Edge Alpha',
    'team', 'upcoming', 25, 22, 3, false, 60,
    '2026-09-24T16:00:00Z', '2026-09-24T17:30:00Z'
  )
ON CONFLICT (id) DO NOTHING;

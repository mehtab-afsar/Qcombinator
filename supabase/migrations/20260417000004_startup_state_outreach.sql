-- Outreach feedback fields added to startup_state for Patel/Susi agents.
-- Also adds opened_at / clicked_at / bounced tracking to outreach_sends.

alter table startup_state
  add column if not exists outreach_sent_count  integer,
  add column if not exists outreach_open_rate   numeric,
  add column if not exists outreach_reply_rate  numeric,
  add column if not exists meetings_booked      integer;

-- Track per-email engagement (populated by Resend webhook)
alter table outreach_sends
  add column if not exists opened_at    timestamptz,
  add column if not exists clicked_at   timestamptz,
  add column if not exists bounced      boolean not null default false,
  add column if not exists delivered_at timestamptz;

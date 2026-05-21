-- Enable Supabase Realtime on the notifications table so the bell counter
-- updates live without a page refresh when a new notification is inserted.
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

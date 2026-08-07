-- ============================================================
-- Fix messages_insert: verify the recipient is actually the other
-- party on the named connection, not just "is the sender really you"
--
-- The old policy only checked auth.uid() = sender_id — it never checked that
-- recipient_id, or connection_request_id, had anything to do with the sender.
-- Any authenticated user could insert a message row addressed to anyone,
-- attached to any connection_request_id (including one they aren't part of).
--
-- A connection's investor side is resolved two ways because of how investor
-- identity works in this app: connection_requests.investor_id is set for a
-- real-auth investor account, but NULL for a "claimed demo" investor — those
-- are matched instead via investor_profiles.demo_investor_id. Both need to
-- resolve to the same real auth.uid() a message's sender/recipient carries.
-- ============================================================

DROP POLICY IF EXISTS "messages_insert" ON messages;

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1
      FROM connection_requests cr
      WHERE cr.id = messages.connection_request_id
        AND (
          (
            cr.founder_id = messages.sender_id
            AND (
              cr.investor_id = messages.recipient_id
              OR EXISTS (
                SELECT 1 FROM investor_profiles ip
                WHERE ip.demo_investor_id = cr.demo_investor_id
                  AND ip.user_id = messages.recipient_id
              )
            )
          )
          OR (
            cr.founder_id = messages.recipient_id
            AND (
              cr.investor_id = messages.sender_id
              OR EXISTS (
                SELECT 1 FROM investor_profiles ip
                WHERE ip.demo_investor_id = cr.demo_investor_id
                  AND ip.user_id = messages.sender_id
              )
            )
          )
        )
    )
  );

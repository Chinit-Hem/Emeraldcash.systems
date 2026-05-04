-- SMS User Dropdown Migration
-- Changes sender_id, receiver_id, and user_id from INTEGER to VARCHAR
-- so they can store Settings usernames (e.g. 'admin', 'staff')

BEGIN;

-- Alter sms_transfers to use VARCHAR for sender/receiver
ALTER TABLE sms_transfers
  ALTER COLUMN sender_id TYPE VARCHAR(32),
  ALTER COLUMN receiver_id TYPE VARCHAR(32);

-- Alter sms_audit_logs to use VARCHAR for user_id
ALTER TABLE sms_audit_logs
  ALTER COLUMN user_id TYPE VARCHAR(32);

-- Update existing sample data to use string usernames
-- (Replace '1' and '2' with actual usernames if they exist in your users table)
UPDATE sms_transfers
  SET sender_id = 'admin', receiver_id = 'staff'
  WHERE sender_id = '1' AND receiver_id = '2';

-- Add indexes to optimize WHERE clauses and JOINs on usernames
CREATE INDEX IF NOT EXISTS idx_sms_transfers_sender ON sms_transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_sms_transfers_receiver ON sms_transfers(receiver_id);
CREATE INDEX IF NOT EXISTS idx_sms_audit_user ON sms_audit_logs(user_id);
-- This is a loop.
COMMIT;

SELECT '✅ SMS user columns migrated to VARCHAR successfully!' as status;

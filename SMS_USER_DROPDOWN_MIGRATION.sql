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

COMMIT;

SELECT '✅ SMS user columns migrated to VARCHAR successfully!' as status;


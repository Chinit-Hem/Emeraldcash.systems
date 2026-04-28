# 🚀 SMS Tables Setup Guide (One-Time)

## Status: **READY TO EXECUTE** → SMS Dashboard will work!

## Step 1: Open Neon Dashboard
1. Go to [neon.tech](https://console.neon.tech)
2. Select your project → **SQL Editor**

## Step 2: Copy & Execute SQL
**Copy ALL content below** → Paste → Run:

```sql
-- SMS Tables Complete Setup Script for Neon Postgres
-- Creates tables + sample data for SMS Dashboard
BEGIN;

DROP TABLE IF EXISTS sms_audit_logs, sms_transfer_images, sms_transfers, sms_assets CASCADE;

CREATE TABLE sms_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  item_code VARCHAR(64),
  type VARCHAR(64) NOT NULL,
  category VARCHAR(64),
  quantity INTEGER DEFAULT 1,
  location VARCHAR(128),
  assigned_to VARCHAR(128),
  image_url TEXT,
  document_url TEXT,
  description TEXT,
  ref_id VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'Available',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE sms_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES sms_assets(id) ON DELETE CASCADE,
  sender_id VARCHAR(32) NOT NULL,
  receiver_id VARCHAR(32) NOT NULL,
  location VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  remark TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  accepted_at TIMESTAMP
);

CREATE TABLE sms_transfer_images (
  id SERIAL PRIMARY KEY,
  transfer_id UUID NOT NULL REFERENCES sms_transfers(id) ON DELETE CASCADE,
  image_url VARCHAR(512) NOT NULL
);

CREATE TABLE sms_audit_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  action VARCHAR(64) NOT NULL,
  metadata JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_sms_assets_item_code ON sms_assets(item_code);
CREATE INDEX idx_sms_assets_status ON sms_assets(status);
CREATE INDEX idx_sms_assets_assigned_to ON sms_assets(assigned_to);
CREATE INDEX idx_sms_assets_category ON sms_assets(category);

INSERT INTO sms_assets (name, type, category, status, quantity) VALUES
  ('Laptop Dell XPS', 'Electronics', 'Computers', 'Available', 5),
  ('Office Chair', 'Furniture', 'Seating', 'In Use', 1),
  ('Projector', 'Electronics', 'AV Equipment', 'Borrowed', 1),
  ('Whiteboard', 'Furniture', 'Office Supplies', 'Available', 2),
  ('Conference Table', 'Furniture', 'Furniture', 'In Use', 1)
ON CONFLICT DO NOTHING;

INSERT INTO sms_transfers (asset_id, sender_id, receiver_id, location, status) VALUES
  ((SELECT id FROM sms_assets WHERE name = 'Laptop Dell XPS' LIMIT 1), 'admin', 'staff', 'Warehouse A', 'pending')
ON CONFLICT DO NOTHING;

SELECT '✅ SMS Tables Created Successfully!' as status;
SELECT count(*) as total_assets FROM sms_assets;
SELECT count(*) as pending_transfers FROM sms_transfers WHERE status = 'pending';

COMMIT;
```

## Step 3: Verify Success
**Expected output**:
```
status                    | total_assets | pending_transfers
✅ SMS Tables Created!   | 5           | 1
```

## Step 4: Test Dashboard
```
http://localhost:3000/sms
```
**Should show**:
- Total Assets: **5**
- Available: **2**
- Pending: **1**

## Done! 🎉
No restart needed. SMS Dashboard fully functional.

**Error?** Check Neon connection string in `.env.local`.


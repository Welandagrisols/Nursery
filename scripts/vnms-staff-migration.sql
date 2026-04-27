-- ─────────────────────────────────────────────────────────
-- Grace Harvest Seedlings — Staff Accounts Migration
-- Run this in your Supabase SQL editor
-- ─────────────────────────────────────────────────────────

-- Staff table for PIN-based login (farm workers, sales staff, managers)
CREATE TABLE IF NOT EXISTS vnms_staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'sales', 'worker')),
  pin_hash    TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  notes       TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for active staff lookup
CREATE INDEX IF NOT EXISTS idx_vnms_staff_active ON vnms_staff(is_active);
CREATE INDEX IF NOT EXISTS idx_vnms_staff_role   ON vnms_staff(role);

-- Enable Row Level Security
ALTER TABLE vnms_staff ENABLE ROW LEVEL SECURITY;

-- Policy: all authenticated users can read active staff (for the login picker)
CREATE POLICY "Anyone can read active staff for login"
  ON vnms_staff FOR SELECT
  USING (is_active = true);

-- Policy: authenticated users (owners/managers) can insert/update/delete
CREATE POLICY "Authenticated users can manage staff"
  ON vnms_staff FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────
-- Sample staff data (optional — delete before production)
-- ─────────────────────────────────────────────────────────
-- INSERT INTO vnms_staff (name, role, pin, notes) VALUES
--   ('Jane Wanjiku', 'manager', '1234', 'Nursery supervisor'),
--   ('Peter Kamau',  'sales',   '5678', 'Sales counter'),
--   ('Mary Achieng', 'worker',  '9012', 'Section B worker');

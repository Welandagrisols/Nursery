-- ============================================================
-- Grace Harvest Seedlings — Full vnms_ Table Migration v2
-- Run this in Supabase SQL Editor
-- Safe to re-run (uses IF NOT EXISTS / IF NOT EXISTS guards)
-- Does NOT touch any existing LittleForest tables
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. BASE TABLES (no foreign-key dependencies)
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vnms_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  email TEXT,
  customer_type TEXT DEFAULT 'Walk-in',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vnms_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE,
  plant_name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER DEFAULT 0,
  price DECIMAL(10,2) DEFAULT 0,
  batch_cost DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'Current',
  section TEXT,
  source TEXT,
  item_type TEXT DEFAULT 'Plant',
  notes TEXT,
  -- lifecycle / seed-to-sale fields
  batch_code TEXT UNIQUE,
  crop_type TEXT,
  variety TEXT,
  planted_date DATE,
  expected_ready_date DATE,
  actual_ready_date DATE,
  lifecycle_status TEXT DEFAULT 'received'
    CHECK (lifecycle_status IN ('received','planted','germinating','selling','sold_out')),
  created_by TEXT,
  seeds_allocated INTEGER DEFAULT 0,
  available_stock INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS vnms_batch_seq START 1;

CREATE TABLE IF NOT EXISTS vnms_staff_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name TEXT NOT NULL,
  task_type TEXT DEFAULT 'General',
  description TEXT,
  task_date DATE DEFAULT CURRENT_DATE,
  batch_sku TEXT,
  labor_hours DECIMAL(5,2) DEFAULT 0,
  labor_rate DECIMAL(10,2) DEFAULT 0,
  labor_cost DECIMAL(10,2) DEFAULT 0,
  consumables_cost DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'Planned',
  assigned_to TEXT,
  -- clock in/out
  batch_id UUID,
  clock_in_at TIMESTAMPTZ,
  clock_out_at TIMESTAMPTZ,
  hours_worked DECIMAL(5,2),
  is_late BOOLEAN DEFAULT FALSE,
  is_absent BOOLEAN DEFAULT FALSE,
  labour_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vnms_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID,
  customer_id UUID,
  quantity INTEGER DEFAULT 0,
  unit_price DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'Cash',
  sale_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  -- POS / receipt fields
  batch_id UUID,
  batch_code TEXT,
  receipt_number TEXT UNIQUE,
  payment_reference TEXT,
  is_voided BOOLEAN DEFAULT FALSE,
  void_reason TEXT,
  customer_type TEXT DEFAULT 'Walk-in',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS vnms_receipt_seq START 1;

CREATE TABLE IF NOT EXISTS vnms_task_consumables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID,
  consumable_sku TEXT,
  consumable_name TEXT,
  quantity_used DECIMAL(10,2) DEFAULT 0,
  unit TEXT,
  unit_cost DECIMAL(10,2) DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- 2. NURSERY PHYSICAL LAYOUT
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vnms_nursery_beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bed_number INTEGER NOT NULL,
  bed_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vnms_nursery_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bed_id UUID NOT NULL REFERENCES vnms_nursery_beds(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  row_name TEXT NOT NULL,
  tray_count INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vnms_nursery_trays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id UUID NOT NULL REFERENCES vnms_nursery_rows(id) ON DELETE CASCADE,
  bed_id UUID NOT NULL REFERENCES vnms_nursery_beds(id) ON DELETE CASCADE,
  tray_number INTEGER NOT NULL,
  tray_name TEXT,
  capacity INTEGER DEFAULT 200,
  status TEXT DEFAULT 'empty' CHECK (status IN ('empty','planted','germinating','ready','harvested')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vnms_tray_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tray_id UUID NOT NULL REFERENCES vnms_nursery_trays(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES vnms_batches(id) ON DELETE SET NULL,
  assigned_date DATE DEFAULT CURRENT_DATE,
  seedling_count INTEGER DEFAULT 0,
  notes TEXT,
  assigned_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- 3. SEED SACHETS
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vnms_sachets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sachet_code TEXT UNIQUE NOT NULL,
  supplier_name TEXT NOT NULL,
  crop_type TEXT NOT NULL,
  variety TEXT,
  seed_count INTEGER DEFAULT 0,
  cost_paid DECIMAL(10,2) DEFAULT 0,
  label_germination_pct DECIMAL(5,2),
  actual_germination_pct DECIMAL(5,2),
  purchase_date DATE,
  expiry_date DATE,
  storage_location TEXT,
  invoice_number TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available','partially_used','fully_used')),
  seeds_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS vnms_sachet_seq START 1;

-- ──────────────────────────────────────────────────────────
-- 4. BATCH ↔ SACHET JUNCTION
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vnms_batch_sachets (
  batch_id UUID NOT NULL REFERENCES vnms_batches(id) ON DELETE CASCADE,
  sachet_id UUID NOT NULL REFERENCES vnms_sachets(id) ON DELETE CASCADE,
  seeds_allocated INTEGER DEFAULT 0,
  PRIMARY KEY (batch_id, sachet_id)
);

-- ──────────────────────────────────────────────────────────
-- 5. GERMINATION COUNTS
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vnms_germination_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES vnms_batches(id) ON DELETE CASCADE,
  counted_by TEXT,
  actual_count INTEGER DEFAULT 0,
  actual_pct DECIMAL(5,2),
  dead_count INTEGER DEFAULT 0,
  count_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- 6. PRICING ENGINE
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vnms_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type TEXT NOT NULL,
  customer_type TEXT NOT NULL,
  min_quantity INTEGER DEFAULT 1,
  max_quantity INTEGER DEFAULT 999999,
  price_per_seedling DECIMAL(10,2) NOT NULL,
  effective_from DATE DEFAULT CURRENT_DATE,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO vnms_prices (crop_type, customer_type, min_quantity, max_quantity, price_per_seedling) VALUES
  ('All', 'Walk-in',         1,    499,    10.00),
  ('All', 'Small Wholesale', 500,  1999,    9.00),
  ('All', 'Wholesale',       2000, 4999,    8.00),
  ('All', 'Large Farm',      5000, 999999,  7.00)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS vnms_price_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_id UUID REFERENCES vnms_prices(id) ON DELETE SET NULL,
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2),
  crop_type TEXT,
  customer_type TEXT,
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- 7. STOCK ALERTS
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vnms_stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES vnms_batches(id) ON DELETE SET NULL,
  batch_code TEXT,
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  message TEXT NOT NULL,
  expected_value DECIMAL(12,2),
  actual_value DECIMAL(12,2),
  gap_value DECIMAL(12,2),
  resolved BOOLEAN DEFAULT FALSE,
  resolution_notes TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- 8. COST RECORDS
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vnms_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES vnms_batches(id) ON DELETE SET NULL,
  cost_type TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(12,2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- 9. WHATSAPP BROADCASTS
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vnms_broadcast_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_text TEXT NOT NULL,
  template_type TEXT,
  crop_type TEXT,
  customer_type_filter TEXT,
  sent_to INTEGER DEFAULT 0,
  delivered INTEGER DEFAULT 0,
  failed INTEGER DEFAULT 0,
  sent_by TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- 10. INVENTORY INPUTS
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vnms_inventory_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_type TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(12,2) DEFAULT 0,
  unit TEXT,
  cost DECIMAL(12,2) DEFAULT 0,
  supplier TEXT,
  purchase_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- 11. ROW LEVEL SECURITY — open access for authenticated users
-- ──────────────────────────────────────────────────────────

ALTER TABLE vnms_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_staff_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_task_consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_nursery_beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_nursery_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_nursery_trays ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_tray_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_sachets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_batch_sachets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_germination_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_price_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_broadcast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE vnms_inventory_inputs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'vnms_customers','vnms_batches','vnms_staff_tasks','vnms_sales',
    'vnms_task_consumables','vnms_nursery_beds','vnms_nursery_rows',
    'vnms_nursery_trays','vnms_tray_assignments','vnms_sachets',
    'vnms_batch_sachets','vnms_germination_counts','vnms_prices',
    'vnms_price_changes','vnms_stock_alerts','vnms_costs',
    'vnms_broadcast_messages','vnms_inventory_inputs'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = tbl AND policyname = 'auth_full_access'
    ) THEN
      EXECUTE format(
        'CREATE POLICY "auth_full_access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
        tbl
      );
    END IF;
  END LOOP;
END $$;
